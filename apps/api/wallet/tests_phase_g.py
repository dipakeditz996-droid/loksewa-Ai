from decimal import Decimal
from datetime import timedelta
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from rest_framework.test import APIClient
from rest_framework import status

from wallet.models import (
    StudentWallet,
    WalletTransaction,
    ContentCoinPricing,
    ContentEntitlement
)
from wallet.services import (
    WalletService,
    InsufficientCoinsError,
    WalletLockedError
)
from wallet.access_service import ContentAccessService
from notes.models import StudyMaterial
from exams.models import Examination, ExamCategory, Exam, Paper, Subject
from courses.models import Course, Enrollment
from subscriptions.models import SubscriptionPlan, Subscription
from core.models import AdminSettings

User = get_user_model()


@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
class ContentCoinMonetizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username='admin1',
            email='admin1@example.com',
            password='password123'
        )

        # Student user
        self.student = User.objects.create_user(
            username='student_g',
            email='student_g@example.com',
            password='password123',
            role='student'
        )
        self.wallet = WalletService.get_or_create_wallet(self.student)

        # Academic hierarchy
        self.category = ExamCategory.objects.create(name='Civil Service')
        self.exam = Exam.objects.create(name='Section Officer', category=self.category)
        self.paper = Paper.objects.create(exam=self.exam, name='General Studies')
        self.subject = Subject.objects.create(paper=self.paper, name='Governance')

        # Course
        self.course = Course.objects.create(
            title='Section Officer Complete Course',
            slug='section-officer-course',
            status='published'
        )

        # Note / Study Material
        self.note = StudyMaterial.objects.create(
            title='Governance Notes',
            exam=self.exam,
            subject=self.subject,
            course=self.course,
            status='published',
            access_type='premium',
            is_downloadable=True
        )

        # Examination
        self.mock_exam = Examination.objects.create(
            title='Section Officer Mock Exam 1',
            category=self.category,
            exam=self.exam,
            course=self.course,
            exam_type='mock',
            status='published',
            total_marks=100
        )

    def test_01_public_free_content_access(self):
        """1. Public/free content is accessible without coins or package."""
        free_note = StudyMaterial.objects.create(
            title='Free Public Notes',
            exam=self.exam,
            subject=self.subject,
            status='published',
            access_type='free',
            course=None
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', free_note.id)
        self.assertTrue(eval_result['has_access'])
        self.assertEqual(eval_result['access_type'], 'FREE')
        self.assertFalse(eval_result['can_purchase_with_coins'])

    def test_02_active_free_trial_grants_access(self):
        """2. Active free trial grants access to covered content."""
        trial_plan = SubscriptionPlan.objects.create(
            name='7-Day Trial',
            slug='7-day-trial',
            package_type='ALL_ACCESS',
            price=Decimal('0.00'),
            is_default_free=True
        )
        sub = Subscription.objects.create(
            student=self.student,
            plan=trial_plan,
            source='FREE_PLAN',
            status='ACTIVE',
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=7)
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(eval_result['has_access'])
        self.assertEqual(eval_result['access_type'], 'TRIAL')

    def test_03_expired_free_trial_blocks_access(self):
        """3. Expired free trial blocks access and prompts coin purchase / package."""
        trial_plan = SubscriptionPlan.objects.create(
            name='Expired Trial',
            slug='expired-trial',
            package_type='ALL_ACCESS',
            price=Decimal('0.00'),
            is_default_free=True
        )
        Subscription.objects.create(
            student=self.student,
            plan=trial_plan,
            source='FREE_PLAN',
            status='ACTIVE',
            start_date=timezone.now() - timedelta(days=10),
            expiry_date=timezone.now() - timedelta(days=3)  # Expired 3 days ago
        )
        # Configure coin pricing
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=50,
            access_duration_days=30,
            monetization_mode='PACKAGE_OR_COINS',
            is_enabled=True
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(eval_result['has_access'])
        self.assertTrue(eval_result['can_purchase_with_coins'])
        self.assertEqual(eval_result['pricing']['coin_price'], 50)

    def test_04_active_package_grants_access_without_coins(self):
        """4. Active paid package grants access without requiring or deducting coins."""
        paid_plan = SubscriptionPlan.objects.create(
            name='Full Officer Package',
            slug='full-officer',
            package_type='ALL_ACCESS',
            price=Decimal('1500.00')
        )
        Subscription.objects.create(
            student=self.student,
            plan=paid_plan,
            source='CUSTOMER_PAYMENT',
            status='ACTIVE',
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=30)
        )
        # Set coin pricing
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=100,
            monetization_mode='PACKAGE_OR_COINS',
            is_enabled=True
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(eval_result['has_access'])
        self.assertEqual(eval_result['access_type'], 'PACKAGE')
        self.assertFalse(eval_result['can_purchase_with_coins'])

    def test_05_content_not_in_package_requires_coin_purchase(self):
        """5. Content outside an active package requires coin unlock."""
        other_course = Course.objects.create(title='Banking Course', slug='banking-course', status='published')
        single_plan = SubscriptionPlan.objects.create(
            name='Banking Only Plan',
            slug='banking-only',
            package_type='SINGLE',
            course=other_course,
            price=Decimal('500.00')
        )
        Subscription.objects.create(
            student=self.student,
            plan=single_plan,
            source='CUSTOMER_PAYMENT',
            status='ACTIVE',
            expiry_date=timezone.now() + timedelta(days=30)
        )
        # Note belongs to Section Officer course, not Banking
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=60,
            monetization_mode='PACKAGE_OR_COINS',
            is_enabled=True
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(eval_result['has_access'])
        self.assertTrue(eval_result['can_purchase_with_coins'])
        self.assertEqual(eval_result['pricing']['coin_price'], 60)

    def test_06_valid_unexpired_coin_entitlement_grants_access(self):
        """6. Valid unexpired coin entitlement grants access."""
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=50,
            expires_at=timezone.now() + timedelta(days=7),
            status='ACTIVE'
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(eval_result['has_access'])
        self.assertEqual(eval_result['access_type'], 'ENTITLEMENT')
        self.assertIsNotNone(eval_result['entitlement'])

    def test_07_expired_coin_entitlement_blocks_access(self):
        """7. Expired coin entitlement blocks access and permits repurchase."""
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=50,
            expires_at=timezone.now() - timedelta(hours=1),
            status='ACTIVE'
        )
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=50,
            access_duration_days=7,
            monetization_mode='PACKAGE_OR_COINS',
            is_enabled=True
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(eval_result['has_access'])
        self.assertTrue(eval_result['can_purchase_with_coins'])

    def test_08_non_purchasable_content_shows_package_requirement(self):
        """8. Non-purchasable content shows package requirement only."""
        # No ContentCoinPricing configured or is_enabled=False
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=100,
            is_enabled=False,
            monetization_mode='PACKAGE_ONLY'
        )
        eval_result = ContentAccessService.evaluate_access(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(eval_result['has_access'])
        self.assertFalse(eval_result['can_purchase_with_coins'])
        self.assertTrue(eval_result['package_purchase_required'])

    def test_09_purchase_with_sufficient_balance_succeeds(self):
        """9. Coin purchase with sufficient balance succeeds and debits exactly configured coins."""
        WalletService.credit_wallet(self.student, 200, 'TEST_CREDIT', 'ref_1')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=75,
            access_duration_days=14,
            monetization_mode='COIN_PURCHASE',
            is_enabled=True
        )
        res = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['coins_spent'], 75)
        self.assertEqual(res['wallet_balance'], 125)
        # Entitlement check
        ent = ContentEntitlement.objects.get(user=self.student, content_type='STUDY_MATERIAL', content_id=self.note.id)
        self.assertEqual(ent.status, 'ACTIVE')
        self.assertEqual(ent.coins_spent, 75)
        self.assertIsNotNone(ent.expires_at)

    def test_10_purchase_with_insufficient_balance_fails(self):
        """10. Coin purchase with insufficient balance fails with shortage and zero debit."""
        WalletService.credit_wallet(self.student, 30, 'TEST_CREDIT', 'ref_2')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=100,
            is_enabled=True
        )
        with self.assertRaises(InsufficientCoinsError):
            ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, 30)  # Untouched
        self.assertFalse(ContentEntitlement.objects.filter(user=self.student, content_id=self.note.id).exists())

    def test_11_locked_wallet_cannot_purchase(self):
        """11. Locked wallet cannot purchase content."""
        WalletService.credit_wallet(self.student, 200, 'TEST_CREDIT', 'ref_3')
        self.wallet.is_locked = True
        self.wallet.lock_reason = 'Suspicious activity'
        self.wallet.save()

        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=50,
            is_enabled=True
        )
        with self.assertRaises(WalletLockedError):
            ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)

    def test_12_purchase_already_owned_content_rejected(self):
        """12. Attempting to purchase already-owned content fails without double-charging."""
        WalletService.credit_wallet(self.student, 300, 'TEST_CREDIT', 'ref_4')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=50,
            is_enabled=True
        )
        res1 = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(res1['success'])
        self.assertEqual(res1['wallet_balance'], 250)

        # Attempt second purchase
        res2 = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(res2['success'])
        self.assertTrue(res2['already_owned'])
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, 250)  # No extra charge

    def test_13_purchase_creates_immutable_debit_ledger_record(self):
        """13. Content purchase creates an immutable DEBIT transaction with reference CONTENT_PURCHASE."""
        WalletService.credit_wallet(self.student, 150, 'TEST_CREDIT', 'ref_5')
        ContentCoinPricing.objects.create(
            content_type='EXAMINATION',
            content_id=self.mock_exam.id,
            coin_price=80,
            is_enabled=True
        )
        res = ContentAccessService.purchase_content(self.student, 'EXAMINATION', self.mock_exam.id)
        self.assertTrue(res['success'])

        tx = WalletTransaction.objects.get(id=res['transaction_id'])
        self.assertEqual(tx.transaction_type, 'DEBIT')
        self.assertEqual(tx.amount, 80)
        self.assertEqual(tx.reference_type, 'CONTENT_PURCHASE')
        self.assertEqual(tx.reference_id, f"EXAMINATION_{self.mock_exam.id}")
        self.assertEqual(tx.metadata['content_type'], 'EXAMINATION')
        self.assertEqual(tx.metadata['content_id'], self.mock_exam.id)

    def test_14_purchase_creates_exact_entitlement_record(self):
        """14. Content purchase creates exactly one ContentEntitlement with correct expiry."""
        WalletService.credit_wallet(self.student, 100, 'TEST_CREDIT', 'ref_6')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=40,
            access_duration_days=0,  # Permanent lifetime access
            is_enabled=True
        )
        res = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(res['success'])
        self.assertTrue(res['is_permanent'])
        self.assertIsNone(res['expires_at'])

        ent = ContentEntitlement.objects.get(id=res['entitlement_id'])
        self.assertIsNone(ent.expires_at)
        self.assertEqual(ent.coins_spent, 40)
        self.assertEqual(ent.status, 'ACTIVE')

    def test_15_idempotent_purchase_prevents_duplicate_charge(self):
        """15. Idempotent purchase requests with the same key do not double charge."""
        WalletService.credit_wallet(self.student, 200, 'TEST_CREDIT', 'ref_7')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=50,
            is_enabled=True
        )
        key = "idem_key_note_purchase_12345"
        res1 = ContentAccessService.purchase_content(
            self.student, 'STUDY_MATERIAL', self.note.id, idempotency_key=key
        )
        self.assertTrue(res1['success'])
        self.assertEqual(res1['wallet_balance'], 150)

        # Re-submit with same idempotency key
        res2 = ContentAccessService.purchase_content(
            self.student, 'STUDY_MATERIAL', self.note.id, idempotency_key=key
        )
        self.assertTrue(res2['success'])
        self.assertTrue(res2.get('idempotent_replay'))
        self.assertEqual(res2['wallet_balance'], 150)
        self.assertEqual(WalletTransaction.objects.filter(reference_type='CONTENT_PURCHASE').count(), 1)

    def test_16_concurrent_purchase_safety(self):
        """16. Concurrent or repeated attempts under lock cannot double-debit."""
        WalletService.credit_wallet(self.student, 100, 'TEST_CREDIT', 'ref_8')
        ContentCoinPricing.objects.create(
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coin_price=60,
            is_enabled=True
        )
        res1 = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertTrue(res1['success'])
        # A second immediate call returns already_owned
        res2 = ContentAccessService.purchase_content(self.student, 'STUDY_MATERIAL', self.note.id)
        self.assertFalse(res2['success'])
        self.assertTrue(res2['already_owned'])
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, 40)

    def test_17_note_detail_endpoint_access_control(self):
        """17. Note detail endpoint blocks unauthorized access and allows entitled access."""
        # Note belongs to self.course. Student is not enrolled.
        self.client.force_authenticate(user=self.student)
        url = f"/api/notes/materials/{self.note.id}/"

        # Initially 403
        resp1 = self.client.get(url)
        self.assertEqual(resp1.status_code, status.HTTP_403_FORBIDDEN)

        # Grant coin entitlement
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=50,
            status='ACTIVE'
        )
        resp2 = self.client.get(url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data['id'], self.note.id)

    def test_18_note_download_endpoint_access_control(self):
        """18. Note PDF download action blocks unauthorized access and allows entitled access."""
        self.note.file = ContentFile(b"%PDF-1.4 Mock PDF Data For Download Test", name="governance.pdf")
        self.note.save()

        self.client.force_authenticate(user=self.student)
        url = f"/api/notes/materials/{self.note.id}/download/"

        # Unentitled download blocked
        resp1 = self.client.get(url)
        self.assertEqual(resp1.status_code, status.HTTP_403_FORBIDDEN)

        # Entitle student
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=50,
            status='ACTIVE'
        )
        resp2 = self.client.get(url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertIn('application/pdf', resp2['Content-Type'])

    def test_19_student_purchased_content_endpoint(self):
        """19. Student purchased content endpoint returns active and expired entitlements."""
        self.client.force_authenticate(user=self.student)

        # Active entitlement
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=50,
            status='ACTIVE',
            expires_at=timezone.now() + timedelta(days=10)
        )
        # Expired entitlement
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='EXAMINATION',
            content_id=self.mock_exam.id,
            coins_spent=80,
            status='EXPIRED',
            expires_at=timezone.now() - timedelta(days=2)
        )

        resp = self.client.get('/api/wallet/content/purchased/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['content_title'], self.mock_exam.title)
        self.assertEqual(data[1]['content_title'], self.note.title)

    def test_20_admin_monetization_analytics_endpoint(self):
        """20. Admin monetization analytics endpoint aggregates total purchases and coins earned."""
        self.client.force_authenticate(user=self.admin)

        ContentEntitlement.objects.create(
            user=self.student,
            content_type='STUDY_MATERIAL',
            content_id=self.note.id,
            coins_spent=60,
            status='ACTIVE'
        )
        ContentEntitlement.objects.create(
            user=self.student,
            content_type='EXAMINATION',
            content_id=self.mock_exam.id,
            coins_spent=100,
            status='ACTIVE'
        )

        resp = self.client.get('/api/wallet/admin/monetization-analytics/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total_purchases'], 2)
        self.assertEqual(resp.data['total_coins_earned'], 160)
        self.assertEqual(resp.data['active_entitlements'], 2)
        self.assertTrue(len(resp.data['top_purchased']) >= 2)
