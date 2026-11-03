from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core.files.storage import InMemoryStorage
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from wallet.models import (
    StudentWallet,
    WalletTransaction,
    CoinTopUpSetting,
    CoinTopUp,
    XPConversionSetting,
    XPConversionLog,
    CoinRewardRule,
    CoinRewardClaim,
    ContentCoinPricing,
    ContentEntitlement
)
from wallet.services import (
    WalletService,
    InsufficientCoinsError,
    WalletLockedError,
    DuplicateTransactionError
)
from gamification.models import GamificationProfile
from gamification.services import award_xp, award_coins
from marketplace.models import PaymentMethod

User = get_user_model()


class WalletModelAndServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            password='password123'
        )
        self.profile, _ = GamificationProfile.objects.get_or_create(user=self.user)

    def test_wallet_creation(self):
        wallet = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.balance, 0)
        self.assertEqual(wallet.total_credited, 0)
        self.assertEqual(wallet.total_debited, 0)
        self.assertFalse(wallet.is_locked)

    def test_credit_wallet_and_ledger(self):
        tx = WalletService.credit_wallet(
            user=self.user,
            amount=100,
            reference_type='TOPUP',
            reference_id='topup_1',
            description='Test credit top-up'
        )
        self.assertEqual(tx.amount, 100)
        self.assertEqual(tx.balance_before, 0)
        self.assertEqual(tx.balance_after, 100)
        self.assertEqual(tx.transaction_type, 'CREDIT')

        wallet = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.balance, 100)
        self.assertEqual(wallet.total_credited, 100)

        # Legacy GamificationProfile sync
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 100)

        # Immutability check on instance save and delete
        with self.assertRaises(ValidationError):
            tx.amount = 200
            tx.save()

        with self.assertRaises(ValidationError):
            tx.delete()

    def test_ledger_bulk_immutability(self):
        WalletService.credit_wallet(self.user, 100, 'TOPUP')
        with self.assertRaises(ValidationError):
            WalletTransaction.objects.filter(wallet__user=self.user).update(amount=999)

        with self.assertRaises(ValidationError):
            WalletTransaction.objects.filter(wallet__user=self.user).delete()

    def test_idempotency_cross_user_collision_prevented(self):
        user2 = User.objects.create_user(username='student2', email='student2@example.com')
        key = 'unique_order_key_777'

        WalletService.credit_wallet(self.user, 50, 'TOPUP', idempotency_key=key)

        # User 2 attempting to reuse the same key must be rejected
        with self.assertRaises(DuplicateTransactionError):
            WalletService.credit_wallet(user2, 50, 'TOPUP', idempotency_key=key)

    def test_debit_wallet_success(self):
        WalletService.credit_wallet(
            user=self.user,
            amount=200,
            reference_type='TOPUP',
            reference_id='initial'
        )
        debit_tx = WalletService.debit_wallet(
            user=self.user,
            amount=75,
            reference_type='CONTENT_PURCHASE',
            reference_id='exam_12',
            description='Unlock mock exam #12'
        )
        self.assertEqual(debit_tx.amount, 75)
        self.assertEqual(debit_tx.balance_before, 200)
        self.assertEqual(debit_tx.balance_after, 125)
        self.assertEqual(debit_tx.transaction_type, 'DEBIT')

        wallet = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.balance, 125)
        self.assertEqual(wallet.total_debited, 75)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 125)

    def test_debit_insufficient_funds_rejected(self):
        WalletService.credit_wallet(
            user=self.user,
            amount=50,
            reference_type='TOPUP'
        )
        with self.assertRaises(InsufficientCoinsError) as ctx:
            WalletService.debit_wallet(
                user=self.user,
                amount=100,
                reference_type='CONTENT_PURCHASE'
            )
        self.assertEqual(ctx.exception.available, 50)
        self.assertEqual(ctx.exception.requested, 100)

        wallet = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.balance, 50)
        self.assertEqual(wallet.total_debited, 0)

    def test_locked_wallet_blocks_transactions(self):
        wallet = WalletService.get_or_create_wallet(self.user)
        wallet.is_locked = True
        wallet.lock_reason = "Suspicious activity detected"
        wallet.save()

        with self.assertRaises(WalletLockedError):
            WalletService.credit_wallet(self.user, 100, 'TOPUP')

        with self.assertRaises(WalletLockedError):
            WalletService.debit_wallet(self.user, 50, 'CONTENT_PURCHASE')

    def test_duplicate_refunds_and_reversals_prevented(self):
        WalletService.credit_wallet(self.user, 200, 'TOPUP')
        debit_tx = WalletService.debit_wallet(self.user, 80, 'CONTENT_PURCHASE')

        refund_tx = WalletService.refund_wallet(debit_tx.id, reason="Course cancelled")
        self.assertEqual(refund_tx.transaction_type, 'REFUND')
        self.assertEqual(refund_tx.amount, 80)

        # Second refund must fail
        with self.assertRaises(ValidationError):
            WalletService.refund_wallet(debit_tx.id, reason="Duplicate refund")

    def test_gamification_award_coins_routes_to_wallet(self):
        award_coins(self.user, 30, reason="Milestone unlocked")
        wallet = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.balance, 30)
        self.assertEqual(wallet.transactions.count(), 1)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 30)

    def test_content_entitlement_repurchase_after_expiry(self):
        # Initial active entitlement
        ent = ContentEntitlement.objects.create(
            user=self.user,
            content_type='STUDY_MATERIAL',
            content_id=10,
            status='ACTIVE'
        )

        # Duplicate active entitlement must raise IntegrityError
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                ContentEntitlement.objects.create(
                    user=self.user,
                    content_type='STUDY_MATERIAL',
                    content_id=10,
                    status='ACTIVE'
                )

        # Once expired, student can legitimately repurchase
        ent.status = 'EXPIRED'
        ent.save()

        new_ent = ContentEntitlement.objects.create(
            user=self.user,
            content_type='STUDY_MATERIAL',
            content_id=10,
            status='ACTIVE'
        )
        self.assertEqual(new_ent.status, 'ACTIVE')


class WalletAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='student_api', email='student_api@example.com', password='password123')
        self.other_student = User.objects.create_user(username='student_other', email='other@example.com', password='password123')
        self.admin = User.objects.create_superuser(username='admin_api', email='admin_api@example.com', password='password123')

        WalletService.credit_wallet(self.student, 150, 'TOPUP', description='Welcome coins')
        WalletService.credit_wallet(self.other_student, 500, 'TOPUP', description='Other student coins')

    def test_student_get_wallet_balance_and_summary(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/wallet/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['balance'], 150)
        self.assertEqual(res.data['username'], 'student_api')

        res_sum = self.client.get('/api/wallet/summary/')
        self.assertEqual(res_sum.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sum.data['wallet']['balance'], 150)
        self.assertEqual(len(res_sum.data['recent_transactions']), 1)

    def test_student_wallet_privacy_protection(self):
        self.client.force_authenticate(user=self.student)
        other_wallet = WalletService.get_or_create_wallet(self.other_student)
        other_tx = other_wallet.transactions.first()

        # Attempting to fetch another student's transaction must return 404
        res = self.client.get(f'/api/wallet/transactions/{other_tx.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class CoinTopUpAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='topup_student', email='topup@example.com', password='password123')
        self.admin = User.objects.create_superuser(username='topup_admin', email='topup_admin@example.com', password='password123')

        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Digital Wallet',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='9800000000'
        )

        self.settings = CoinTopUpSetting.get_settings()
        self.settings.enabled = True
        self.settings.npr_to_coin_rate = Decimal('1.00')
        self.settings.min_topup_npr = Decimal('50.00')
        self.settings.max_topup_npr = Decimal('10000.00')
        self.settings.bonus_percentage = 10  # 10% bonus
        self.settings.save()

    def test_topup_request_and_invalid_amounts(self):
        self.client.force_authenticate(user=self.student)

        # Below min amount (NPR 20 < 50)
        res_low = self.client.post('/api/wallet/topup/request/', {'amount_npr': '20.00'})
        self.assertEqual(res_low.status_code, status.HTTP_400_BAD_REQUEST)

        # Above max amount (NPR 20000 > 10000)
        res_high = self.client.post('/api/wallet/topup/request/', {'amount_npr': '20000.00'})
        self.assertEqual(res_high.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid amount: NPR 500 -> 500 coins + 50 bonus coins = 550 coins
        res_ok = self.client.post('/api/wallet/topup/request/', {
            'amount_npr': '500.00',
            'payment_method_id': self.payment_method.id
        })
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_ok.data['coins_expected'], 500)
        self.assertEqual(res_ok.data['bonus_coins'], 50)
        self.assertEqual(res_ok.data['status'], 'PENDING')
        topup_id = res_ok.data['id']

        # Submit payment reference
        res_sub = self.client.post(f'/api/wallet/topup/{topup_id}/submit/', {
            'payment_method_id': self.payment_method.id,
            'payment_reference': 'ESEWA_TX_998877'
        })
        self.assertEqual(res_sub.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sub.data['status'], 'SUBMITTED')

    def test_admin_approve_and_duplicate_approval_rejected(self):
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('200.00'),
            coins_expected=200,
            bonus_coins=20,
            payment_method=self.payment_method,
            payment_reference='REF_APPROVED_1',
            status='SUBMITTED'
        )

        # Student unauthorized attempt to approve top-up -> 403 Forbidden
        self.client.force_authenticate(user=self.student)
        res_forbidden = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {'action': 'APPROVE'})
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Admin approve top-up
        self.client.force_authenticate(user=self.admin)
        res_approve = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'APPROVE',
            'notes': 'Bank statement verified'
        })
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)

        # Wallet credited exactly once: 220 coins
        self.assertEqual(WalletService.get_wallet_balance(self.student), 220)
        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verified_by, self.admin)

        # Second approval attempt must be rejected
        res_dup = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {'action': 'APPROVE'})
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 220)

    def test_admin_reject_topup_never_credits_coins(self):
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('100.00'),
            coins_expected=100,
            status='SUBMITTED',
            payment_reference='FAKE_TX_000'
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'REJECT',
            'reason': 'Voucher reference not found in bank statement'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        topup.refresh_from_db()
        self.assertEqual(topup.status, 'REJECTED')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)


class XPConversionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='xp_student', email='xp@example.com', password='password123')
        self.profile = GamificationProfile.objects.create(
            user=self.student,
            xp=1000,
            redeemable_xp=500,
            converted_xp=0,
            level=2
        )

        self.settings = XPConversionSetting.get_settings()
        self.settings.enabled = True
        self.settings.xp_required = 100
        self.settings.coins_awarded = 10
        self.settings.conversion_mode = 'MANUAL'
        self.settings.minimum_xp = 100
        self.settings.daily_conversion_limit = 300
        self.settings.save()

    def test_xp_conversion_eligibility_and_preview(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/wallet/xp-conversion/eligibility/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_eligible'])
        self.assertEqual(res.data['redeemable_xp'], 500)
        self.assertEqual(res.data['lifetime_xp'], 1000)

        res_prev = self.client.post('/api/wallet/xp-conversion/preview/', {'xp_amount': 200})
        self.assertEqual(res_prev.status_code, status.HTTP_200_OK)
        self.assertEqual(res_prev.data['coins_awarded'], 20)

    def test_xp_conversion_success_preserves_lifetime_xp(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post('/api/wallet/xp-conversion/submit/', {
            'xp_amount': 200,
            'idempotency_key': 'conv_key_101'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['wallet_balance'], 20)

        self.profile.refresh_from_db()
        # Lifetime XP and Level must be completely untouched!
        self.assertEqual(self.profile.xp, 1000)
        self.assertEqual(self.profile.level, 2)
        # Redeemable XP reduced, Converted XP increased
        self.assertEqual(self.profile.redeemable_xp, 300)
        self.assertEqual(self.profile.converted_xp, 200)

    def test_daily_conversion_limit_enforced(self):
        self.client.force_authenticate(user=self.student)
        # Convert 200 XP (Daily limit is 300)
        self.client.post('/api/wallet/xp-conversion/submit/', {'xp_amount': 200})

        # Attempt to convert another 200 XP (Total 400 > 300 daily limit) -> Rejection
        res_limit = self.client.post('/api/wallet/xp-conversion/submit/', {'xp_amount': 200})
        self.assertEqual(res_limit.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Daily conversion limit exceeded", res_limit.data['detail'])

    def test_insufficient_redeemable_xp_rejected(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post('/api/wallet/xp-conversion/submit/', {'xp_amount': 600})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient redeemable XP", res.data['detail'])


class AdminWalletManagementAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='lock_student', email='lock@example.com', password='password123')
        self.admin = User.objects.create_superuser(username='mgmt_admin', email='mgmt_admin@example.com', password='password123')

    def test_admin_lock_wallet_and_manual_adjustment(self):
        self.client.force_authenticate(user=self.admin)
        wallet = WalletService.get_or_create_wallet(self.student)

        # Lock wallet with mandatory reason
        res_lock = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/lock/', {
            'is_locked': True,
            'reason': 'Investigating fraudulent transaction reports'
        })
        self.assertEqual(res_lock.status_code, status.HTTP_200_OK)
        wallet.refresh_from_db()
        self.assertTrue(wallet.is_locked)
        self.assertEqual(wallet.lock_reason, 'Investigating fraudulent transaction reports')

        # Unlock wallet
        res_unlock = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/lock/', {
            'is_locked': False
        })
        self.assertEqual(res_unlock.status_code, status.HTTP_200_OK)
        wallet.refresh_from_db()
        self.assertFalse(wallet.is_locked)

        # Admin manual credit adjustment with mandatory reason
        res_adj = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 75,
            'adjustment_type': 'CREDIT',
            'reason': 'Compensation for platform maintenance downtime'
        })
        self.assertEqual(res_adj.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 75)


def _make_dummy_receipt(filename="receipt.png"):
    import io
    import numpy as np
    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile
    # Create non-monochrome image with gradient / pixel variation so std >= 1.0
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[50:150, 50:150] = [100, 150, 200]
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile(filename, buf.read(), content_type="image/png")


@override_settings(
    STORAGES={
        'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
)
class CoinTopUpOCRVerificationTests(TestCase):
    """
    Phase C Addendum Test Suite:
    Validates end-to-end payment verification OCR reuse for Coin Top-ups:
    - Successful OCR and authoritative verification -> automatic credit
    - OCR extraction failure -> manual review
    - Low OCR confidence -> manual review
    - Amount mismatch -> manual review
    - Duplicate reference across top-up, subscription, and marketplace -> blocked
    - Provider verification failure -> manual review (no auto credit)
    - Manual approval -> exactly one credit
    - Repeated approval -> no duplicate credit
    - Rejected top-up -> no credit
    - Admin request clearer receipt and student resubmission
    - Existing subscription payment verification remains unaffected
    """

    def setUp(self):
        from subscriptions.payment_verification import PaymentProofVerificationService
        self.client = APIClient()
        self.student = User.objects.create_user(username='ocr_student', email='ocr_student@example.com', password='password123')
        self.other_student = User.objects.create_user(username='other_student', email='other_student@example.com', password='password123')
        self.admin = User.objects.create_superuser(username='ocr_admin', email='ocr_admin@example.com', password='password123')

        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Digital Wallet',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='9800000000'
        )

        self.khalti_method = PaymentMethod.objects.create(
            method_type='KHALTI',
            display_name='Khalti Digital Wallet',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='9811111111'
        )

        self.settings = CoinTopUpSetting.get_settings()
        self.settings.enabled = True
        self.settings.npr_to_coin_rate = Decimal('1.00')
        self.settings.min_topup_npr = Decimal('50.00')
        self.settings.max_topup_npr = Decimal('10000.00')
        self.settings.bonus_percentage = 10
        self.settings.save()

    def test_auto_verification_success_credits_wallet_and_notifies(self):
        from wallet.tasks import process_topup_payment_verification
        from subscriptions.payment_verification import PaymentProofVerificationService
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.payment_method,
            payment_reference='ESEWA_SUCCESS_101',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        valid_ocr_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 500.00\n"
            "Transaction Code: ESEWA_SUCCESS_101\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        auth_success = {
            'confirmed': True,
            'provider': 'eSewa',
            'status': 'CONFIRMED',
            'reference': 'ESEWA_SUCCESS_101',
            'verified_amount': '500.00',
            'message': 'Authoritative eSewa settlement confirmed'
        }
        with patch('subscriptions.payment_verification._run_ocr', return_value=(valid_ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=auth_success):
                res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'verified')
        self.assertEqual(res['outcome'], 'AUTO_VERIFIED')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verification_status, 'VERIFIED_CONFIDENT')
        self.assertIsNotNone(topup.verified_at)
        self.assertIsNotNone(topup.wallet_transaction)

        # Wallet credited exactly once: 500 + 50 = 550 coins
        self.assertEqual(WalletService.get_wallet_balance(self.student), 550)
        self.assertEqual(WalletTransaction.objects.filter(wallet__user=self.student).count(), 1)
        tx = topup.wallet_transaction
        self.assertEqual(tx.amount, 550)
        self.assertEqual(tx.reference_type, 'TOPUP')
        self.assertEqual(tx.idempotency_key, "topup_ref_ESEWA_SUCCESS_101")

    def test_ocr_extraction_failure_routes_to_manual_review(self):
        from wallet.tasks import process_topup_payment_verification
        from subscriptions.payment_verification import PaymentProofVerificationService

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.payment_method,
            payment_reference='ILLEGIBLE_TX_001',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        # OCR returns unreadable / empty text
        with patch('subscriptions.payment_verification._run_ocr', return_value=("", "none")):
            res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertIsNone(topup.wallet_transaction)

        # Failure reasons recorded in verification_result
        self.assertTrue(len(topup.verification_result.get('failure_reasons', [])) > 0)
        self.assertIn("blurry or contains illegible text", topup.verification_result['failure_reasons'][0])

    def test_low_ocr_confidence_routes_to_manual_review(self):
        from wallet.tasks import process_topup_payment_verification
        from subscriptions.payment_verification import PaymentProofVerificationService, GenericReceiptParser, PaymentVerificationData

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.payment_method,
            payment_reference='LOW_CONF_123',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        # Parser returns confidence below 0.85 safe threshold (e.g. 0.70)
        low_conf_data = PaymentVerificationData(
            provider="eSewa",
            status="PASS",
            amount=Decimal('500.00'),
            transaction_id="LOW_CONF_123",
            merchant_name="Loksewa AI Pvt Ltd",
            merchant_phone="9800000000",
            transaction_date=timezone.now().date(),
            ocr_confidence=0.70,
            raw_ocr_text="Payment successful 500 NPR LOW_CONF_123"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=("Payment successful 500 NPR LOW_CONF_123", "pytesseract")):
            with patch('subscriptions.payment_verification.BaseReceiptParser.parse', return_value=low_conf_data):
                with patch('subscriptions.payment_verification.EsewaReceiptParser.parse', return_value=low_conf_data):
                    res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertTrue(any("safe threshold" in r for r in topup.verification_result.get('failure_reasons', [])))

    def test_amount_mismatch_routes_to_manual_review(self):
        from wallet.tasks import process_topup_payment_verification
        from subscriptions.payment_verification import PaymentProofVerificationService

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.payment_method,
            payment_reference='MISMATCH_AMT_99',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        # Receipt displays NPR 200 instead of expected NPR 500
        mismatch_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 200.00\n"
            "Transaction Code: MISMATCH_AMT_99\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(mismatch_text, 'rapidocr_original')):
            res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertTrue(any("Amount mismatch" in r for r in topup.verification_result.get('failure_reasons', [])))

    def test_duplicate_reference_across_topups_blocked(self):
        # 1. First top-up verified
        topup1 = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('200.00'),
            coins_expected=200,
            payment_method=self.payment_method,
            payment_reference='DUP_TOPUP_TX_555',
            status='VERIFIED'
        )

        # 2. Other student attempts to submit same reference code
        self.client.force_authenticate(user=self.other_student)
        topup2 = CoinTopUp.objects.create(
            user=self.other_student,
            amount_npr=Decimal('200.00'),
            coins_expected=200,
            status='PENDING'
        )
        res = self.client.post(f'/api/wallet/topup/{topup2.id}/submit/', {
            'payment_method_id': self.payment_method.id,
            'payment_reference': 'DUP_TOPUP_TX_555'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been credited", res.data['detail'])

    def test_duplicate_reference_across_subscriptions_and_marketplace_blocked(self):
        from subscriptions.models import SubscriptionPayment, SubscriptionPlan
        from marketplace.models import PaymentSubmission

        plan = SubscriptionPlan.objects.create(name='Test Plan', price=Decimal('300.00'), duration=1)

        # Approved subscription payment
        SubscriptionPayment.objects.create(
            student=self.student,
            plan=plan,
            payment_method=self.payment_method,
            amount=Decimal('300.00'),
            transaction_id='SUBSCRIPTION_TXN_888',
            status='APPROVED'
        )

        # Approved marketplace payment
        PaymentSubmission.objects.create(
            student=self.student,
            payment_method=self.payment_method,
            expected_amount=Decimal('450.00'),
            submitted_amount=Decimal('450.00'),
            transaction_id='MARKETPLACE_TXN_999',
            status='APPROVED'
        )

        self.client.force_authenticate(user=self.student)
        t_sub = CoinTopUp.objects.create(user=self.student, amount_npr=Decimal('300.00'), coins_expected=300, status='PENDING')
        res_sub = self.client.post(f'/api/wallet/topup/{t_sub.id}/submit/', {
            'payment_method_id': self.payment_method.id,
            'payment_reference': 'SUBSCRIPTION_TXN_888'
        })
        self.assertEqual(res_sub.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("course subscription", res_sub.data['detail'])

        t_mkt = CoinTopUp.objects.create(user=self.student, amount_npr=Decimal('450.00'), coins_expected=450, status='PENDING')
        res_mkt = self.client.post(f'/api/wallet/topup/{t_mkt.id}/submit/', {
            'payment_method_id': self.payment_method.id,
            'payment_reference': 'MARKETPLACE_TXN_999'
        })
        self.assertEqual(res_mkt.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("marketplace order", res_mkt.data['detail'])

    def test_provider_verification_mismatch_routes_to_manual_review(self):
        from wallet.tasks import process_topup_payment_verification
        from subscriptions.payment_verification import PaymentProofVerificationService

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.payment_method,  # Expects eSewa
            payment_reference='KHALTI_ON_ESEWA_METHOD',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        # Receipt clearly has Khalti branding and layout
        khalti_receipt_text = (
            "Payment Successful\n"
            "Khalti Wallet\n"
            "Receiver: Loksewa AI Pvt Ltd\n"
            "Khalti ID: 9800000000\n"
            "Amount: NPR 500.00\n"
            "Transaction Code: KHALTI_ON_ESEWA_METHOD\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(khalti_receipt_text, 'rapidocr_original')):
            res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertTrue(any("Provider mismatch" in r for r in topup.verification_result.get('failure_reasons', [])))

    def test_manual_admin_approval_credits_wallet_once(self):
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('300.00'),
            coins_expected=300,
            bonus_coins=30,
            payment_method=self.payment_method,
            payment_reference='MANUAL_APPROVE_101',
            status='SUBMITTED',
            verification_status='VERIFIED_UNCERTAIN'
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'APPROVE',
            'notes': 'Verified on merchant bank portal'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verification_status, 'VERIFIED_CONFIDENT')
        self.assertEqual(topup.verified_by, self.admin)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 330)
        self.assertEqual(topup.verification_result['admin_decision']['action'], 'approved')

        # Repeated approval attempt is blocked idempotently
        res_dup = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {'action': 'APPROVE'})
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 330)

    def test_manual_admin_rejection_never_credits_coins(self):
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('250.00'),
            coins_expected=250,
            status='SUBMITTED',
            payment_reference='FAKE_TX_REJECT'
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'REJECT',
            'reason': 'Reference number could not be found in eSewa merchant records.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'REJECTED')
        self.assertEqual(topup.verification_status, 'VERIFICATION_FAILED')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertEqual(topup.verification_result['admin_decision']['action'], 'rejected')

    def test_admin_request_clearer_receipt_and_student_resubmission(self):
        from subscriptions.payment_verification import PaymentProofVerificationService

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('400.00'),
            coins_expected=400,
            bonus_coins=40,
            payment_method=self.payment_method,
            payment_reference='BLURRY_INITIAL',
            status='SUBMITTED',
            verification_status='VERIFIED_UNCERTAIN'
        )

        # Admin requests clearer receipt
        self.client.force_authenticate(user=self.admin)
        res_req = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'REQUEST_CLEARER_RECEIPT',
            'reason': 'Screenshot was blurry and transaction code was clipped.'
        })
        self.assertEqual(res_req.status_code, status.HTTP_200_OK)

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertIn("Clearer receipt requested", topup.rejection_reason)

        # Student uploads clearer receipt
        self.client.force_authenticate(user=self.student)
        clearer_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 400.00\n"
            "Transaction Code: CLEAR_TX_999\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        dummy_file = _make_dummy_receipt("clear_receipt.png")
        auth_success = {
            'confirmed': True,
            'provider': 'eSewa',
            'status': 'CONFIRMED',
            'reference': 'CLEAR_TX_999',
            'verified_amount': '400.00',
            'message': 'Authoritative eSewa settlement confirmed'
        }
        with patch('subscriptions.payment_verification._run_ocr', return_value=(clearer_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=auth_success):
                res_sub = self.client.post(f'/api/wallet/topup/{topup.id}/submit/', {
                    'payment_method_id': self.payment_method.id,
                    'payment_reference': 'CLEAR_TX_999',
                    'receipt_image': dummy_file
                })

        self.assertEqual(res_sub.status_code, status.HTTP_200_OK)
        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verification_status, 'VERIFIED_CONFIDENT')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 440)

    def test_existing_subscription_payment_verification_unaffected(self):
        from subscriptions.models import SubscriptionPayment, SubscriptionPlan
        from subscriptions.payment_verification import PaymentProofVerificationService

        plan = SubscriptionPlan.objects.create(name='Preserved Plan', price=Decimal('150.00'), duration=1)
        sub_payment = SubscriptionPayment.objects.create(
            student=self.student,
            plan=plan,
            payment_method=self.payment_method,
            amount=Decimal('150.00'),
            transaction_id='SUB_UNAFFECTED_101',
            screenshot=_make_dummy_receipt(),
            status='PENDING'
        )

        valid_sub_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 150.00\n"
            "Transaction Code: SUB_UNAFFECTED_101\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(valid_sub_text, 'rapidocr_original')):
            res = PaymentProofVerificationService().verify(sub_payment)

        self.assertEqual(res['outcome'], 'AUTO_VERIFIED')
        self.assertTrue(res['amount_matches'])
        self.assertTrue(res['transaction_id_matches'])
        self.assertTrue(res['receiver_matches'])

    def test_admin_review_serializer_details(self):
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('600.00'),
            coins_expected=600,
            bonus_coins=60,
            payment_method=self.payment_method,
            payment_reference='SERIALIZER_CHECK_TX',
            status='SUBMITTED',
            verification_status='VERIFIED_UNCERTAIN',
            verification_result={
                'outcome': 'NEEDS_ADMIN_REVIEW',
                'detected_amount': '600.00',
                'detected_transaction_id': 'SERIALIZER_CHECK_TX',
                'detected_provider': 'eSewa',
                'receiver_matches': True,
                'failure_reasons': ['Valid transaction date not detected on receipt.'],
                'verification_data': {
                    'ocr_confidence': 0.90,
                    'provider': 'eSewa'
                }
            }
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/wallet/admin/topups/{topup.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        self.assertEqual(data['student_details']['username'], 'ocr_student')
        self.assertEqual(data['amount_npr'], '600.00')
        self.assertEqual(data['extracted_amount'], '600.00')
        self.assertEqual(data['extracted_transaction_id'], 'SERIALIZER_CHECK_TX')
        self.assertEqual(data['detected_provider'], 'eSewa')
        self.assertEqual(data['ocr_confidence'], 0.90)
        self.assertEqual(data['failure_reasons'], ['Valid transaction date not detected on receipt.'])
        self.assertTrue(data['provider_verification_result']['receiver_matches'])


@override_settings(
    STORAGES={
        'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
)
class AuthoritativePaymentVerificationCorrectionTests(TestCase):
    """
    Phase C.1 Security Correction Test Suite:
    Authoritative Payment Confirmation & Concurrency Defense
    1. OCR success without provider confirmation does not automatically credit coins.
    2. Valid authoritative eSewa confirmation credits coins exactly once.
    3. Valid authoritative Khalti confirmation credits coins exactly once.
    4. Provider verification unavailable routes to admin review.
    5. Bank receipt OCR alone never automatically credits coins.
    6. Duplicate references cannot pass through concurrent submissions.
    7. Repeated background task execution cannot double-credit.
    8. Admin approval racing with automatic verification cannot double-credit.
    9. Failed background tasks can recover safely.
    10. Existing subscription and marketplace payment workflows remain unaffected.
    11. Receipt upload security: magic byte inspection, 10MB size limit.
    """

    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='auth_student', email='auth_student@example.com', password='password123')
        self.other_student = User.objects.create_user(username='auth_other', email='auth_other@example.com', password='password123')
        self.admin = User.objects.create_superuser(username='auth_admin', email='auth_admin@example.com', password='password123')

        self.esewa_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Digital Wallet',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='9800000000'
        )

        self.khalti_method = PaymentMethod.objects.create(
            method_type='KHALTI',
            display_name='Khalti Digital Wallet',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='9811111111'
        )

        self.bank_method = PaymentMethod.objects.create(
            method_type='BANK',
            display_name='NIC Asia Bank',
            is_active=True,
            account_name='Loksewa AI Pvt Ltd',
            account_number='0123456789012345'
        )

        self.settings = CoinTopUpSetting.get_settings()
        self.settings.enabled = True
        self.settings.npr_to_coin_rate = Decimal('1.00')
        self.settings.min_topup_npr = Decimal('50.00')
        self.settings.max_topup_npr = Decimal('10000.00')
        self.settings.bonus_percentage = 10
        self.settings.save()

    def test_1_ocr_success_without_provider_confirmation_routes_to_admin_review(self):
        """1. OCR extraction succeeds, but external provider settlement is unconfirmed -> routes to manual review with 0 coins credited."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.esewa_method,
            payment_reference='ESEWA_NO_CONFIRM_01',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        ocr_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 500.00\n"
            "Transaction Code: ESEWA_NO_CONFIRM_01\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        # Provider API lookup returns unconfirmed settlement
        mock_unconfirmed = {
            "confirmed": False,
            "provider": "eSewa",
            "status": "NOT_FOUND",
            "reference": "ESEWA_NO_CONFIRM_01",
            "verified_amount": None,
            "message": "eSewa settlement could not be confirmed via provider API (transaction not found).",
            "raw_response": None
        }

        with patch('subscriptions.payment_verification._run_ocr', return_value=(ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=mock_unconfirmed):
                res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertIsNone(topup.wallet_transaction)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertTrue(any("settlement could not be confirmed" in r for r in topup.verification_result.get('failure_reasons', [])))

    def test_2_valid_authoritative_esewa_confirmation_credits_coins_once(self):
        """2. Valid authoritative eSewa confirmation credits coins exactly once."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.esewa_method,
            payment_reference='ESEWA_AUTH_OK_101',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        ocr_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 500.00\n"
            "Transaction Code: ESEWA_AUTH_OK_101\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        mock_confirmed = {
            "confirmed": True,
            "provider": "eSewa",
            "status": "CONFIRMED",
            "reference": "ESEWA_AUTH_OK_101",
            "verified_amount": "500.00",
            "message": "eSewa settlement confirmed authoritatively by provider API (Ref: ESEWA_AUTH_OK_101).",
            "raw_response": {"status": "COMPLETE", "total_amount": "500.0"}
        }

        with patch('subscriptions.payment_verification._run_ocr', return_value=(ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=mock_confirmed):
                res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'verified')
        self.assertEqual(res['outcome'], 'AUTO_VERIFIED')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verification_status, 'VERIFIED_CONFIDENT')
        self.assertIsNotNone(topup.wallet_transaction)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 550)
        self.assertEqual(WalletTransaction.objects.filter(wallet__user=self.student).count(), 1)
        self.assertEqual(topup.wallet_transaction.idempotency_key, "topup_ref_ESEWA_AUTH_OK_101")

    def test_3_valid_authoritative_khalti_confirmation_credits_coins_once(self):
        """3. Valid authoritative Khalti confirmation credits coins exactly once."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('600.00'),
            coins_expected=600,
            bonus_coins=60,
            payment_method=self.khalti_method,
            payment_reference='KHALTI_AUTH_OK_202',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        ocr_text = (
            "Payment Successful\n"
            "Khalti Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving Mobile: 9811111111\n"
            "Amount: NPR 600.00\n"
            "Transaction Code: KHALTI_AUTH_OK_202\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        mock_khalti_confirmed = {
            "confirmed": True,
            "provider": "Khalti",
            "status": "CONFIRMED",
            "reference": "KHALTI_AUTH_OK_202",
            "verified_amount": "600.00",
            "message": "Khalti settlement confirmed authoritatively by provider API.",
            "raw_response": {"status": "Completed", "total_amount": 60000}
        }

        with patch('subscriptions.payment_verification._run_ocr', return_value=(ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=mock_khalti_confirmed):
                res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'verified')
        self.assertEqual(res['outcome'], 'AUTO_VERIFIED')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'VERIFIED')
        self.assertEqual(topup.verification_status, 'VERIFIED_CONFIDENT')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 660)
        self.assertEqual(WalletTransaction.objects.filter(wallet__user=self.student).count(), 1)
        self.assertEqual(topup.wallet_transaction.idempotency_key, "topup_ref_KHALTI_AUTH_OK_202")

    def test_4_provider_verification_unavailable_routes_to_admin_review(self):
        """4. When external provider verification is unavailable or credentials missing, routes to admin review."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('500.00'),
            coins_expected=500,
            bonus_coins=50,
            payment_method=self.khalti_method,
            payment_reference='KHALTI_UNAVAIL_303',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        ocr_text = (
            "Payment Successful\n"
            "Khalti Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving Mobile: 9811111111\n"
            "Amount: NPR 500.00\n"
            "Transaction Code: KHALTI_UNAVAIL_303\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        mock_unavail = {
            "confirmed": False,
            "provider": "Khalti",
            "status": "CREDENTIALS_UNAVAILABLE",
            "reference": "KHALTI_UNAVAIL_303",
            "verified_amount": None,
            "message": "Khalti merchant secret key is not configured; authoritative lookup unavailable.",
            "raw_response": None
        }

        with patch('subscriptions.payment_verification._run_ocr', return_value=(ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=mock_unavail):
                res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertIsNone(topup.wallet_transaction)

    def test_5_bank_receipt_ocr_alone_never_automatically_credits_coins(self):
        """5. Bank receipt OCR alone (even with 100% confidence) never automatically credits coins."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('1000.00'),
            coins_expected=1000,
            bonus_coins=100,
            payment_method=self.bank_method,
            payment_reference='BANK_SLIP_404',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        # Flawless bank receipt OCR text
        bank_ocr_text = (
            "Interbank Fund Transfer Successful\n"
            "NIC Asia Bank\n"
            "Beneficiary Name: Loksewa AI Pvt Ltd\n"
            "Beneficiary Account: 0123456789012345\n"
            "Amount: NPR 1,000.00\n"
            "Transaction ID: BANK_SLIP_404\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(bank_ocr_text, 'rapidocr_original')):
            res = process_topup_payment_verification(topup.id)

        self.assertEqual(res['status'], 'manual_review')
        self.assertEqual(res['outcome'], 'NEEDS_ADMIN_REVIEW')

        topup.refresh_from_db()
        self.assertEqual(topup.status, 'SUBMITTED')
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertEqual(WalletService.get_wallet_balance(self.student), 0)
        self.assertIsNone(topup.wallet_transaction)

        failure_reasons = topup.verification_result.get('failure_reasons', [])
        self.assertTrue(any("bank statement review is required" in r for r in failure_reasons))

    def test_6_duplicate_references_cannot_pass_through_concurrent_submissions(self):
        """6. Concurrent submissions with identical payment reference are blocked at both application and database level."""
        from django.db import IntegrityError

        # Student 1 submits reference
        self.client.force_authenticate(user=self.student)
        t1 = CoinTopUp.objects.create(user=self.student, amount_npr=Decimal('300.00'), coins_expected=300, status='PENDING')
        res1 = self.client.post(f'/api/wallet/topup/{t1.id}/submit/', {
            'payment_method_id': self.esewa_method.id,
            'payment_reference': 'CONCURRENT_TXN_505'
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Student 2 tries to submit the same reference code concurrently
        self.client.force_authenticate(user=self.other_student)
        t2 = CoinTopUp.objects.create(user=self.other_student, amount_npr=Decimal('300.00'), coins_expected=300, status='PENDING')
        res2 = self.client.post(f'/api/wallet/topup/{t2.id}/submit/', {
            'payment_method_id': self.esewa_method.id,
            'payment_reference': 'CONCURRENT_TXN_505'
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been submitted", res2.data['detail'])

        # Database constraint enforcement: direct insert raises IntegrityError
        with self.assertRaises(IntegrityError):
            CoinTopUp.objects.create(
                user=self.other_student,
                amount_npr=Decimal('300.00'),
                coins_expected=300,
                payment_reference='CONCURRENT_TXN_505',
                status='SUBMITTED'
            )

    def test_7_repeated_background_task_execution_cannot_double_credit(self):
        """7. Executing the verification task repeatedly never creates duplicate wallet transactions or credits."""
        from wallet.tasks import process_topup_payment_verification
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('200.00'),
            coins_expected=200,
            bonus_coins=20,
            payment_method=self.esewa_method,
            payment_reference='REPEAT_EXEC_606',
            receipt_image=_make_dummy_receipt(),
            status='SUBMITTED'
        )

        mock_confirmed = {
            "confirmed": True,
            "provider": "eSewa",
            "status": "CONFIRMED",
            "reference": "REPEAT_EXEC_606",
            "verified_amount": "200.00",
            "message": "Settlement confirmed",
            "raw_response": {"status": "COMPLETE"}
        }

        ocr_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 200.00\n"
            "Transaction Code: REPEAT_EXEC_606\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(ocr_text, 'rapidocr_original')):
            with patch('subscriptions.payment_verification.AuthoritativePaymentVerifier.verify_settlement', return_value=mock_confirmed):
                # 1st run
                res1 = process_topup_payment_verification(topup.id)
                self.assertEqual(res1['status'], 'verified')

                # 2nd run (duplicate execution)
                res2 = process_topup_payment_verification(topup.id)
                self.assertEqual(res2['status'], 'already_verified')

                # 3rd run (duplicate execution)
                res3 = process_topup_payment_verification(topup.id)
                self.assertEqual(res3['status'], 'already_verified')

        self.assertEqual(WalletService.get_wallet_balance(self.student), 220)
        self.assertEqual(WalletTransaction.objects.filter(wallet__user=self.student).count(), 1)

    def test_8_admin_approval_racing_with_automatic_verification_cannot_double_credit(self):
        """8. Admin approval and automated verification racing together cannot double-credit."""
        from wallet.tasks import process_topup_payment_verification

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('350.00'),
            coins_expected=350,
            bonus_coins=35,
            payment_method=self.esewa_method,
            payment_reference='RACE_DEFENSE_707',
            status='SUBMITTED',
            verification_status='VERIFIED_UNCERTAIN'
        )

        # Admin approves
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'APPROVE',
            'notes': 'Admin confirmed on portal'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(WalletService.get_wallet_balance(self.student), 385)

        # Automatic verification task triggers simultaneously / afterwards
        res_task = process_topup_payment_verification(topup.id)
        self.assertEqual(res_task['status'], 'already_verified')

        # Balance remains exactly 385, transaction count is 1
        self.assertEqual(WalletService.get_wallet_balance(self.student), 385)
        self.assertEqual(WalletTransaction.objects.filter(wallet__user=self.student).count(), 1)

    def test_9_failed_background_tasks_can_recover_safely(self):
        """9. Stuck tasks in VERIFICATION_IN_PROGRESS safely recover to VERIFIED_UNCERTAIN."""
        from wallet.tasks import recover_stuck_topup_verifications
        from django.utils import timezone

        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('400.00'),
            coins_expected=400,
            payment_reference='STUCK_TASK_808',
            status='SUBMITTED',
            verification_status='VERIFICATION_IN_PROGRESS'
        )

        # Simulate stuck task with updated_at in past
        CoinTopUp.objects.filter(pk=topup.pk).update(
            updated_at=timezone.now() - timezone.timedelta(minutes=25)
        )

        recovered = recover_stuck_topup_verifications(max_age_minutes=15)
        self.assertEqual(recovered, 1)

        topup.refresh_from_db()
        self.assertEqual(topup.verification_status, 'VERIFIED_UNCERTAIN')
        self.assertIn("safely recovered", topup.verification_notes)

    def test_10_existing_subscription_and_marketplace_workflows_unaffected(self):
        """10. Existing subscription and marketplace payment verification remains fully functional."""
        from subscriptions.models import SubscriptionPayment, SubscriptionPlan
        from subscriptions.payment_verification import PaymentProofVerificationService
        from django.utils import timezone

        plan = SubscriptionPlan.objects.create(name='Preserved Subscription', price=Decimal('150.00'), duration=1)
        sub = SubscriptionPayment.objects.create(
            student=self.student,
            plan=plan,
            payment_method=self.esewa_method,
            amount=Decimal('150.00'),
            transaction_id='SUB_SECURE_909',
            screenshot=_make_dummy_receipt(),
            status='PENDING'
        )

        valid_sub_text = (
            "Payment Successful\n"
            "eSewa Mobile Wallet\n"
            "Fund Transferred to Loksewa AI Pvt Ltd\n"
            "Receiving eSewa ID: 9800000000\n"
            "Amount: NPR 150.00\n"
            "Transaction Code: SUB_SECURE_909\n"
            f"Date: {timezone.localdate().strftime('%d %b %Y')}\n"
        )

        with patch('subscriptions.payment_verification._run_ocr', return_value=(valid_sub_text, 'rapidocr_original')):
            res = PaymentProofVerificationService().verify(sub)

        self.assertEqual(res['outcome'], 'AUTO_VERIFIED')
        self.assertTrue(res['amount_matches'])
        self.assertTrue(res['transaction_id_matches'])

    def test_11_receipt_upload_security_magic_bytes_and_file_size(self):
        """11. File uploads must validate true magic bytes and enforce 10MB limit."""
        from core.upload_validators import validate_receipt_file, validate_receipt_size_10mb
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.core.exceptions import ValidationError

        # Malicious text file renamed as .jpg
        fake_jpg = SimpleUploadedFile("exploit.jpg", b"<?php echo 'malicious'; ?>", content_type="image/jpeg")
        with self.assertRaises(ValidationError) as ctx:
            validate_receipt_file(fake_jpg)
        self.assertIn("Invalid JPEG file signature", str(ctx.exception))

        # Oversized file (> 10MB)
        large_file = SimpleUploadedFile("large.png", b"\x89PNG\r\n\x1a\n" + b"0" * (11 * 1024 * 1024), content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_receipt_size_10mb(large_file)
        self.assertIn("maximum receipt size is 10MB", str(ctx.exception))

        # Valid image file passes
        valid_img_file = _make_dummy_receipt("valid.png")
        validate_receipt_file(valid_img_file)


class PhaseFWalletUITests(TestCase):
    """
    Dedicated test suite for LoksewaAI Coin Wallet Phase F:
    Complete Student Wallet UI + Admin Wallet Management.
    """
    def setUp(self):
        self.student = User.objects.create_user(
            username='student_phase_f',
            email='student_f@example.com',
            password='password123'
        )
        self.other_student = User.objects.create_user(
            username='student_other',
            email='other_f@example.com',
            password='password123'
        )
        self.admin = User.objects.create_superuser(
            username='admin_phase_f',
            email='admin_f@example.com',
            password='password123'
        )
        self.client = APIClient()

        # Seed settings
        self.topup_setting = CoinTopUpSetting.objects.create(
            pk=1,
            enabled=True,
            npr_to_coin_rate=Decimal('1.00'),
            min_topup_npr=Decimal('50.00'),
            max_topup_npr=Decimal('10000.00'),
            bonus_percentage=10
        )
        self.xp_setting = XPConversionSetting.objects.create(
            pk=1,
            enabled=True,
            xp_required=100,
            coins_awarded=10,
            conversion_mode='MANUAL',
            minimum_xp=100,
            maximum_xp=5000,
            daily_conversion_limit=2000
        )
        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Loksewa AI',
            account_name='Loksewa AI Pvt Ltd',
            account_number='9800000000',
            is_active=True
        )

    def test_01_student_can_view_own_wallet_only(self):
        """1. Student can view their own wallet only."""
        WalletService.credit_wallet(self.student, 150, 'TOPUP')
        WalletService.credit_wallet(self.other_student, 800, 'TOPUP')

        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/wallet/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['wallet']['balance'], 150)
        self.assertEqual(res.data['wallet']['username'], 'student_phase_f')

        # Direct wallet endpoint
        res_direct = self.client.get('/api/wallet/')
        self.assertEqual(res_direct.status_code, status.HTTP_200_OK)
        self.assertEqual(res_direct.data['balance'], 150)

    def test_02_and_03_student_submit_topup_and_status_updates(self):
        """2 & 3. Student can submit top-up and status updates are displayed correctly."""
        self.client.force_authenticate(user=self.student)

        # Step 1: Create request
        req_res = self.client.post('/api/wallet/topup/request/', {
            'amount_npr': '500.00',
            'payment_method_id': self.payment_method.id
        })
        self.assertEqual(req_res.status_code, status.HTTP_201_CREATED)
        topup_id = req_res.data['id']
        self.assertEqual(req_res.data['status'], 'PENDING')
        self.assertEqual(req_res.data['coins_expected'], 500)
        self.assertEqual(req_res.data['bonus_coins'], 50)  # 10% bonus

        # Step 2: Submit payment voucher
        receipt = _make_dummy_receipt('voucher.png')
        with patch('wallet.tasks.enqueue_topup_verification'):
            sub_res = self.client.post(f'/api/wallet/topup/{topup_id}/submit/', {
                'payment_method_id': self.payment_method.id,
                'payment_reference': 'TXN_PHASE_F_001',
                'receipt_image': receipt
            }, format='multipart')
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data['status'], 'SUBMITTED')
        self.assertEqual(sub_res.data['verification_status'], 'VERIFICATION_IN_PROGRESS')

        # Step 3: Check status endpoint
        stat_res = self.client.get(f'/api/wallet/topup/{topup_id}/status/')
        self.assertEqual(stat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stat_res.data['status'], 'SUBMITTED')

    def test_04_and_05_auto_verified_topup_in_admin_monitoring_and_evidence(self):
        """4 & 5. Automatically verified top-up appears in admin monitoring with evidence."""
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('200.00'),
            coins_expected=200,
            bonus_coins=20,
            payment_method=self.payment_method,
            payment_reference='REF_AUTO_123',
            status='VERIFIED',
            verification_status='VERIFIED_CONFIDENT',
            receipt_image=_make_dummy_receipt('auto.png'),
            verification_result={
                'outcome': 'AUTO_VERIFIED',
                'detected_amount': '200.00',
                'detected_transaction_id': 'REF_AUTO_123',
                'detected_provider': 'eSewa',
                'amount_matches': True,
                'transaction_id_matches': True,
                'receiver_matches': True,
                'verification_data': {'ocr_confidence': 0.98}
            }
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/wallet/admin/topups/?auto_verified=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data['results']
        self.assertTrue(any(t['id'] == topup.id for t in items))

        # Inspect evidence
        detail_res = self.client.get(f'/api/wallet/admin/topups/{topup.id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['extracted_amount'], '200.00')
        self.assertEqual(detail_res.data['extracted_transaction_id'], 'REF_AUTO_123')
        self.assertEqual(detail_res.data['detected_provider'], 'eSewa')
        self.assertEqual(detail_res.data['ocr_confidence'], 0.98)
        self.assertIsNotNone(detail_res.data['receipt_image'])

    def test_06_and_10_admin_manual_credit_exactly_once_and_ledger(self):
        """6 & 10. Admin can manually credit coins exactly once with immutable ledger record."""
        self.client.force_authenticate(user=self.admin)
        wallet = WalletService.get_or_create_wallet(self.student)
        self.assertEqual(wallet.balance, 0)

        payload = {
            'amount': 250,
            'adjustment_type': 'CREDIT',
            'reason': 'Customer satisfaction bonus granted for downtime',
            'idempotency_key': 'adj_credit_test_001'
        }

        # First execution
        res1 = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', payload)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['wallet']['balance'], 250)
        self.assertEqual(res1.data['transaction']['transaction_type'], 'CREDIT')
        self.assertEqual(res1.data['transaction']['reference_type'], 'ADMIN_ADJUSTMENT')

        # Second execution with same idempotency key returns existing transaction
        res2 = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', payload)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 250)  # NOT credited twice

        # Ledger record immutability
        tx_id = res1.data['transaction']['id']
        tx = WalletTransaction.objects.get(pk=tx_id)
        with self.assertRaises(ValidationError):
            tx.amount = 500
            tx.save()

    def test_07_and_08_admin_manual_debit_and_insufficient_balance(self):
        """7 & 8. Admin manual debit exactly once, and insufficient balance prevention."""
        WalletService.credit_wallet(self.student, 300, 'TOPUP')
        wallet = WalletService.get_or_create_wallet(self.student)

        self.client.force_authenticate(user=self.admin)

        # Attempt to debit more than balance
        res_fail = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 500,
            'adjustment_type': 'DEBIT',
            'reason': 'Penalty adjustment for rule breach',
            'idempotency_key': 'adj_debit_excess'
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient", res_fail.data['detail'])

        # Valid debit
        res_ok = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 100,
            'adjustment_type': 'DEBIT',
            'reason': 'Chargeback settlement manual debit',
            'idempotency_key': 'adj_debit_ok_001'
        })
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_ok.data['wallet']['balance'], 200)

        # Idempotent retry does not double debit
        res_retry = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 100,
            'adjustment_type': 'DEBIT',
            'reason': 'Chargeback settlement manual debit',
            'idempotency_key': 'adj_debit_ok_001'
        })
        self.assertEqual(res_retry.status_code, status.HTTP_201_CREATED)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 200)

    def test_09_unauthorized_users_cannot_perform_adjustments(self):
        """9. Unauthorized students cannot access admin adjustment or lock endpoints."""
        wallet = WalletService.get_or_create_wallet(self.student)

        self.client.force_authenticate(user=self.student)
        res_adj = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 100,
            'adjustment_type': 'CREDIT',
            'reason': 'Self credit attempt'
        })
        self.assertEqual(res_adj.status_code, status.HTTP_403_FORBIDDEN)

        res_lock = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/lock/', {
            'is_locked': True,
            'reason': 'Malicious lock'
        })
        self.assertEqual(res_lock.status_code, status.HTTP_403_FORBIDDEN)

    def test_11_existing_auto_credits_not_duplicated_by_admin_review(self):
        """11. Top-up that is already VERIFIED cannot be approved or credited again by admin."""
        WalletService.credit_wallet(self.student, 100, 'TOPUP')
        topup = CoinTopUp.objects.create(
            user=self.student,
            amount_npr=Decimal('100.00'),
            coins_expected=100,
            bonus_coins=0,
            payment_reference='REF_ALREADY_VERIFIED',
            status='VERIFIED',
            verification_status='VERIFIED_CONFIDENT'
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/wallet/admin/topups/{topup.id}/action/', {
            'action': 'APPROVE',
            'notes': 'Accidental duplicate approval attempt'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already verified", res.data['detail'])

        wallet = WalletService.get_or_create_wallet(self.student)
        self.assertEqual(wallet.balance, 100)  # Unchanged

    def test_12_wallet_history_pagination_and_filtering(self):
        """12. Wallet transaction history pagination and filtering work."""
        for i in range(25):
            WalletService.credit_wallet(self.student, 10, 'TOPUP', description=f"TopUp #{i}")
        WalletService.debit_wallet(self.student, 20, 'CONTENT_PURCHASE', description="Course purchase")

        self.client.force_authenticate(user=self.student)
        # Default page size is 20
        res = self.client.get('/api/wallet/transactions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 20)
        self.assertEqual(res.data['count'], 26)

        # Filter by DEBIT
        res_debit = self.client.get('/api/wallet/transactions/?type=DEBIT')
        self.assertEqual(res_debit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_debit.data['count'], 1)
        self.assertEqual(res_debit.data['results'][0]['transaction_type'], 'DEBIT')

    def test_13_xp_conversion_updates_displayed_balance_correctly(self):
        """13. XP conversion updates redeemable XP and credits wallet without touching lifetime XP."""
        profile, _ = GamificationProfile.objects.get_or_create(user=self.student)
        profile.xp = 500
        profile.redeemable_xp = 500
        profile.save()

        self.client.force_authenticate(user=self.student)
        res = self.client.post('/api/wallet/xp-conversion/submit/', {
            'xp_amount': 200,
            'idempotency_key': 'xp_conv_f_001'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['wallet_balance'], 20)  # 200 XP -> 20 Coins
        self.assertEqual(res.data['remaining_redeemable_xp'], 300)
        self.assertEqual(res.data['lifetime_xp'], 500)  # Lifetime XP unchanged

        profile.refresh_from_db()
        self.assertEqual(profile.xp, 500)
        self.assertEqual(profile.redeemable_xp, 300)
        self.assertEqual(profile.converted_xp, 200)

    def test_14_locked_wallet_follows_backend_restrictions(self):
        """14. Locked wallet rejects credit, debit, and adjustments."""
        wallet = WalletService.get_or_create_wallet(self.student)
        wallet.balance = 200
        wallet.is_locked = True
        wallet.lock_reason = "Under fraud audit"
        wallet.save()

        with self.assertRaises(WalletLockedError):
            WalletService.credit_wallet(self.student, 50, 'TOPUP')

        with self.assertRaises(WalletLockedError):
            WalletService.debit_wallet(self.student, 50, 'CONTENT_PURCHASE')

        self.client.force_authenticate(user=self.admin)
        res_adj = self.client.post(f'/api/wallet/admin/wallets/{wallet.id}/adjust/', {
            'amount': 50,
            'adjustment_type': 'CREDIT',
            'reason': 'Adjustment while locked'
        })
        self.assertEqual(res_adj.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("locked", res_adj.data['detail'])

    def test_15_admin_wallet_stats_aggregate(self):
        """15. Admin wallet stats aggregates match database sums."""
        WalletService.credit_wallet(self.student, 500, 'TOPUP')
        WalletService.credit_wallet(self.other_student, 300, 'TOPUP')
        WalletService.debit_wallet(self.student, 100, 'CONTENT_PURCHASE')

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/wallet/admin/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['total_wallets'], 2)
        self.assertGreaterEqual(res.data['total_coins_held'], 700)
        self.assertGreaterEqual(res.data['total_coins_credited'], 800)
        self.assertGreaterEqual(res.data['total_coins_debited'], 100)
