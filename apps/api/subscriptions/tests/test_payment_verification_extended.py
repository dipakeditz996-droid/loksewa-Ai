import base64
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch, MagicMock

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import User
from marketplace.models import PaymentMethod
from subscriptions.models import SubscriptionPlan, SubscriptionPayment
from subscriptions.payment_verification import (
    PaymentProofVerificationService,
    _extract_amounts,
    _extract_dates,
    _extract_times,
    _extract_transaction_ids,
    _extract_recipient,
    _detect_provider,
    _check_payment_status,
)

def _create_test_image_bytes(text="test") -> bytes:
    img = Image.new("RGB", (300, 500), color=(240, 240, 240))
    # Draw some variation so it is not blank
    for x in range(10, 50):
        for y in range(10, 50):
            img.putpixel((x, y), (20, 20, 20))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class PaymentVerificationExtendedTests(APITestCase):
    def setUp(self):
        self.drive_patch = patch("core.google_drive.upload_file", return_value={"id": "mock_id", "size": 100})
        self.drive_patch.start()
        self.read_patch = patch.object(
            PaymentProofVerificationService,
            "_read_screenshot",
            return_value=_create_test_image_bytes()
        )
        self.read_patch.start()
        self.student = User.objects.create_user(username="test_student", password="pw", role="student")
        self.plan = SubscriptionPlan.objects.create(
            name="Loksewa Test Package",
            duration=30,
            duration_unit="DAYS",
            price=Decimal("150.00"),
            status="ACTIVE",
        )
        self.esewa_method = PaymentMethod.objects.create(
            method_type="ESEWA",
            display_name="eSewa Wallet",
            account_name="Dipak Bhandari",
            account_number="9841234567",
            is_active=True,
        )
        self.khalti_method = PaymentMethod.objects.create(
            method_type="KHALTI",
            display_name="Khalti Wallet",
            account_name="Loksewa Nepal",
            account_number="9851234567",
            is_active=True,
        )
        self.bank_method = PaymentMethod.objects.create(
            method_type="BANK",
            display_name="Nabil Bank Transfer",
            bank_name="Nabil Bank",
            account_name="Loksewa Institute Pvt Ltd",
            account_number="01234567890123",
            is_active=True,
        )

    def tearDown(self):
        self.read_patch.stop()
        self.drive_patch.stop()

    def _create_payment(self, amount="150.00", txn="1SSZYH4", method=None):
        method = method or self.esewa_method
        img_bytes = _create_test_image_bytes()
        upload = SimpleUploadedFile("proof.png", img_bytes, content_type="image/png")
        return SubscriptionPayment.objects.create(
            student=self.student,
            plan=self.plan,
            payment_method=method,
            amount=Decimal(amount),
            transaction_id=txn,
            screenshot=upload,
            status="PENDING",
        )

    # -------------------------------------------------------------------------
    # Unit parsing extraction tests
    # -------------------------------------------------------------------------

    def test_amount_extraction_variations(self):
        cases = [
            ("NPR 150.00", Decimal("150.00")),
            ("Rs. 150", Decimal("150")),
            ("Rs 150.00", Decimal("150.00")),
            ("NPR150.00", Decimal("150.00")),
            ("Total: NPR 1,250.50 paid", Decimal("1250.50")),
        ]
        for text, expected in cases:
            amounts = _extract_amounts(text)
            self.assertTrue(any(abs(a - expected) <= Decimal("0.01") for a in amounts), f"Failed for {text}")

    def test_date_extraction_variations(self):
        cases = [
            ("06 OCT, 2026 02:32 PM", date(2026, 10, 6)),
            ("06 Oct 2026", date(2026, 10, 6)),
            ("06/10/2026", date(2026, 10, 6)),
            ("2026-10-06", date(2026, 10, 6)),
            ("6 October 2026", date(2026, 10, 6)),
            ("06-Oct-2026", date(2026, 10, 6)),
        ]
        for text, expected in cases:
            dates = _extract_dates(text)
            self.assertIn(expected, dates, f"Failed date extraction for {text}")

    def test_time_extraction_variations(self):
        cases = [
            ("06 OCT, 2026 02:32 PM", "02:32 PM"),
            ("Time: 14:32:00", "14:32"),
            ("Completed at 09:15 AM", "09:15 AM"),
        ]
        for text, expected in cases:
            times = _extract_times(text)
            self.assertTrue(any(expected.lower() in t.lower() for t in times), f"Failed time extraction for {text}")

    def test_recipient_extraction_variations(self):
        cases = [
            ("Fund Transferred to Dipak Bhandari\n06 OCT, 2026", "Dipak Bhandari"),
            ("Fund Transferred To : Dipak Bhandari\nView Details", "Dipak Bhandari"),
            ("Paid to Dipak Bhandari\nNPR 150.00", "Dipak Bhandari"),
            ("Receiver: Dipak Bhandari", "Dipak Bhandari"),
        ]
        for text, expected in cases:
            rec = _extract_recipient(text)
            self.assertEqual(rec, expected, f"Failed recipient extraction for {text}")

    def test_transaction_code_extraction_variations(self):
        cases = [
            ("Transaction Code\n1SSZYH4\nView Details", "1SSZYH4"),
            ("Transaction ID: 1SSZYH4", "1SSZYH4"),
            ("Reference ID 1SSZYH4", "1SSZYH4"),
            ("Txn ID: 1SSZYH4", "1SSZYH4"),
            ("Reference Number: 1SSZYH4", "1SSZYH4"),
            ("Transaction Number: 1SSZYH4", "1SSZYH4"),
        ]
        for text, expected in cases:
            txns = _extract_transaction_ids(text)
            self.assertIn(expected, txns, f"Failed txn extraction for {text}")

    # -------------------------------------------------------------------------
    # End-to-end Verification pipeline tests on New Layout
    # -------------------------------------------------------------------------

    def test_new_format_auto_verified(self):
        """The exact new format layout auto-verifies successfully when details match."""
        today = timezone.localtime(timezone.now()).date()
        today_str = today.strftime("%d %b, %Y").upper()

        ocr_sample = f"""
Payment Successful!

NPR 150.00

Fund Transferred to Dipak Bhandari

{today_str} 02:32 PM

View Details

Transaction Code
1SSZYH4
"""
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "AUTO_VERIFIED")
        self.assertTrue(res["amount_matches"])
        self.assertTrue(res["transaction_id_matches"])
        self.assertTrue(res["receiver_matches"])
        self.assertTrue(res["date_matches"])
        self.assertEqual(res["detected_amount"], "150.00")
        self.assertEqual(res["detected_transaction_id"], "1SSZYH4")
        self.assertEqual(res["detected_recipient"], "Dipak Bhandari")
        self.assertEqual(res["detected_time"], "02:32 PM")
        self.assertEqual(res["detected_provider"], "eSewa")

    def test_new_format_wrong_amount_fails_auto_verify(self):
        """If detected amount does not match package price, goes to admin review."""
        today_str = timezone.localtime(timezone.now()).date().strftime("%d %b, %Y").upper()
        ocr_sample = f"""
Payment Successful!

NPR 500.00

Fund Transferred to Dipak Bhandari

{today_str} 02:32 PM

Transaction Code
1SSZYH4
"""
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "NEEDS_ADMIN_REVIEW")
        self.assertFalse(res["amount_matches"])
        self.assertTrue(any("Amount mismatch" in r for r in res["failure_reasons"]))

    def test_new_format_wrong_date_future_fails_auto_verify(self):
        """If receipt date is in the future, goes to admin review."""
        future_date = (timezone.localtime(timezone.now()).date() + timedelta(days=10)).strftime("%d %b, %Y").upper()
        ocr_sample = f"""
Payment Successful!

NPR 150.00

Fund Transferred to Dipak Bhandari

{future_date} 02:32 PM

Transaction Code
1SSZYH4
"""
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "NEEDS_ADMIN_REVIEW")
        self.assertFalse(res["date_matches"])
        self.assertTrue(any("future date" in r for r in res["failure_reasons"]))

    def test_new_format_wrong_recipient_fails_auto_verify(self):
        """If recipient name does not match configured merchant, goes to admin review."""
        today_str = timezone.localtime(timezone.now()).date().strftime("%d %b, %Y").upper()
        ocr_sample = f"""
Payment Successful!

NPR 150.00

Fund Transferred to Ramesh Sharma

{today_str} 02:32 PM

Transaction Code
1SSZYH4
"""
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "NEEDS_ADMIN_REVIEW")
        self.assertFalse(res["receiver_matches"])
        self.assertTrue(any("Receiver merchant or account details mismatch" in r for r in res["failure_reasons"]))

    def test_duplicate_transaction_id_fails_auto_verify(self):
        """If transaction code was already used for an approved payment, it cannot auto-approve."""
        # Create an existing approved payment with same txn
        SubscriptionPayment.objects.create(
            student=self.student,
            plan=self.plan,
            payment_method=self.esewa_method,
            amount=Decimal("150.00"),
            transaction_id="1SSZYH4",
            screenshot=SimpleUploadedFile("old.png", _create_test_image_bytes(), content_type="image/png"),
            status="APPROVED",
        )

        today_str = timezone.localtime(timezone.now()).date().strftime("%d %b, %Y").upper()
        ocr_sample = f"""
Payment Successful!

NPR 150.00

Fund Transferred to Dipak Bhandari

{today_str} 02:32 PM

Transaction Code
1SSZYH4
"""
        # New payment with duplicate txn code
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertNotEqual(res["outcome"], "AUTO_VERIFIED")
        self.assertTrue(res["is_duplicate_transaction"])

    def test_failure_keyword_rejects_payment(self):
        """If receipt contains failure or declined keyword, marked REJECTED."""
        ocr_sample = """
Transaction Failed!
Payment Declined by Issuer.
NPR 150.00
Fund Transferred to Dipak Bhandari
Transaction Code: 1SSZYH4
"""
        payment = self._create_payment(amount="150.00", txn="1SSZYH4")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "REJECTED")

    # -------------------------------------------------------------------------
    # Backward compatibility with existing eSewa, Khalti, and Bank formats
    # -------------------------------------------------------------------------

    def test_existing_esewa_standard_format_still_works(self):
        today = timezone.localtime(timezone.now()).date().strftime("%Y-%m-%d")
        ocr_sample = f"""
eSewa
Payment Receipt
Amount: NPR 150.00
To: 9841234567
Name: Dipak Bhandari
Date: {today}
Ref ID: ESEWA-TXN-9988
Status: Success
Thank you for using eSewa
"""
        payment = self._create_payment(amount="150.00", txn="ESEWA-TXN-9988")

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "AUTO_VERIFIED")
        self.assertEqual(res["detected_provider"], "eSewa")
        self.assertTrue(res["amount_matches"])
        self.assertTrue(res["transaction_id_matches"])
        self.assertTrue(res["receiver_matches"])

    def test_existing_khalti_format_still_works(self):
        today = timezone.localtime(timezone.now()).date().strftime("%Y-%m-%d")
        ocr_sample = f"""
Khalti Digital Wallet
Transaction Successful
Amount: Rs. 150.00
Mobile: 9851234567
Receiver: Loksewa Nepal
Txn ID: KHALTI776655
Date: {today}
"""
        payment = self._create_payment(amount="150.00", txn="KHALTI776655", method=self.khalti_method)

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "AUTO_VERIFIED")
        self.assertEqual(res["detected_provider"], "Khalti")
        self.assertTrue(res["amount_matches"])
        self.assertTrue(res["transaction_id_matches"])
        self.assertTrue(res["receiver_matches"])

    def test_existing_bank_transfer_format_still_works(self):
        today = timezone.localtime(timezone.now()).date().strftime("%d-%m-%Y")
        ocr_sample = f"""
Nabil Bank Mobile Banking
Fund Transfer Successful
Debit Amount: NPR 150.00
Beneficiary Name: Loksewa Institute Pvt Ltd
Beneficiary A/C: 01234567890123
Reference Number: NABIL998877
Value Date: {today}
"""
        payment = self._create_payment(amount="150.00", txn="NABIL998877", method=self.bank_method)

        with patch("subscriptions.payment_verification._run_ocr", return_value=(ocr_sample, "mock_ocr")):
            res = PaymentProofVerificationService().verify(payment)

        self.assertEqual(res["outcome"], "AUTO_VERIFIED")
        self.assertEqual(res["detected_provider"], "Bank")
        self.assertTrue(res["amount_matches"])
        self.assertTrue(res["transaction_id_matches"])
        self.assertTrue(res["receiver_matches"])
