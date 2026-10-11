"""
Comprehensive Test Suite for Universal Nepal Bank Receipt OCR & Payment Verification
LoksewaAI Payment System
"""

import io
from datetime import date
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.utils import timezone
from PIL import Image

from subscriptions.models import SubscriptionPlan, SubscriptionPayment, PaymentMethod
from subscriptions.payment_verification import (
    PaymentProofVerificationService,
    CommonPaymentVerificationEngine,
    BankReceiptParser,
    GenericReceiptParser,
    _get_parser_for_provider,
    _extract_document_or_image_content,
    _accounts_match,
    _names_match,
    _extract_amounts,
    _extract_transaction_ids,
    _extract_dates,
    _scan_consecutive_key_values,
    _SWIFT_BANK_CODES,
)
from subscriptions.tasks import enqueue_payment_verification


class UniversalNepalBankReceiptOCRTests(TestCase):
    def setUp(self):
        self.plan, _ = SubscriptionPlan.objects.update_or_create(
            slug="loksewa-officer-pack-test",
            defaults={
                "name": "Loksewa Officer Pack",
                "price": Decimal("150.00"),
                "duration": 3,
                "duration_unit": "MONTHS",
            }
        )
        self.bank_method, _ = PaymentMethod.objects.update_or_create(
            method_type="BANK",
            defaults={
                "display_name": "Kumari Bank Limited",
                "bank_name": "Kumari Bank Limited",
                "account_name": "SUJAN PANDEY",
                "account_number": "2690351219000001",
                "is_active": True,
            }
        )

    def test_siddhartha_to_kumari_bank_transfer_fixture(self):
        """
        Tests parsing the exact interbank receipt structure from Siddhartha Bank to Kumari Bank
        via Fonepay Interbank (reproducing customer's payment proof).
        """
        receipt_text = (
            "Download Receipt\n"
            "Transaction Success\n"
            "Dear HEM, your payment of NPR 150.00 with Charge 10.00 from A/C 009###392 "
            "for KMBLNPKA:2690351219000001 was successful.\n"
            "Reference Code\n"
            "232992986\n"
            "Txn Amount (NPR)\n"
            "150.00\n"
            "Charge (NPR)\n"
            "10.00\n"
            "Total Amount (NPR)\n"
            "160.00\n"
            "Sender's Name\n"
            "*** *** K.C\n"
            "Sender's Account\n"
            "009###392\n"
            "Receiver's Name\n"
            "***** PANDEY\n"
            "Receiver's Account\n"
            "269###19000001\n"
            "Date/Time\n"
            "11 Oct 2026,04:15 PM\n"
            "Payment Attribute\n"
            "KMBLNPKA:2690351219000001\n"
            "Service Name\n"
            "Fonepay Interbank\n"
            "Initiator\n"
            "9868947998\n"
            "Remarks\n"
            "Exam\n"
            "Channel\n"
            "Online\n"
            "Done\n"
        )

        parser = BankReceiptParser()
        vdata = parser.parse(receipt_text, self.bank_method)

        self.assertEqual(vdata.status, "PASS")
        self.assertEqual(vdata.amount, Decimal("150.00"))
        self.assertEqual(vdata.service_charge, Decimal("10.00"))
        self.assertEqual(vdata.total_amount, Decimal("160.00"))
        self.assertEqual(vdata.transaction_id, "232992986")
        self.assertEqual(vdata.transaction_date, date(2026, 10, 11))
        self.assertEqual(vdata.sender_bank, "Siddhartha Bank Limited")
        self.assertEqual(vdata.sender_account, "009###392")
        self.assertEqual(vdata.receiver_bank, "Kumari Bank Limited")
        # Masked receiver account resolved via attribute
        self.assertEqual(vdata.merchant_account, "2690351219000001")
        self.assertEqual(vdata.merchant_name, "***** PANDEY")
        self.assertEqual(vdata.transfer_mode, "Fonepay Interbank")

    def test_masked_account_matching(self):
        """Verifies masked bank account numbers match authoritative accounts."""
        expected = "2690351219000001"
        self.assertTrue(_accounts_match("269###19000001", expected))
        self.assertTrue(_accounts_match("269***19000001", expected))
        self.assertTrue(_accounts_match("269XXX19000001", expected))
        self.assertTrue(_accounts_match("###19000001", expected))
        self.assertTrue(_accounts_match("2690351219000001", expected))
        # Non-matching accounts
        self.assertFalse(_accounts_match("269###99999999", expected))
        self.assertFalse(_accounts_match("009###19000001", expected))

    def test_masked_name_matching(self):
        """Verifies masked receiver names match authoritative names without false rejections."""
        expected = "SUJAN PANDEY"
        self.assertTrue(_names_match("***** PANDEY", expected))
        self.assertTrue(_names_match("SUJAN PANDEY", expected))
        self.assertTrue(_names_match("SUJAN *****", expected))
        self.assertTrue(_names_match("S. PANDEY", expected))
        # Completely different name
        self.assertFalse(_names_match("RAM BAHADUR", expected))

    def test_year_filtering_in_amount_extraction(self):
        """Verifies that calendar years (e.g. 2026) are not picked up as payment amounts."""
        text = "Date: 11 Oct 2026, 04:15 PM\nTxn Amount: NPR 150.00\nTotal: 150.00"
        amounts = _extract_amounts(text)
        self.assertIn(Decimal("150.00"), amounts)
        self.assertNotIn(Decimal("2026"), amounts)

    def test_transaction_id_blacklist(self):
        """Verifies non-transaction keywords are blacklisted from being captured as Txn IDs."""
        text = "Transaction Success\nDownload Receipt\nDone"
        txns = _extract_transaction_ids(text)
        self.assertNotIn("TRANSACTIONSUCCESS", [t.upper() for t in txns])
        self.assertNotIn("DOWNLOADRECEIPT", [t.upper() for t in txns])
        self.assertNotIn("DONE", [t.upper() for t in txns])

    def test_pdf_digital_text_extraction(self):
        """Tests extraction from selectable digital PDF documents."""
        import pymupdf
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text(
            (50, 72),
            "Kumari Bank Limited Transfer Receipt\n"
            "Txn Amount (NPR): 150.00\n"
            "Reference Code: REF987654321\n"
            "Paid to: SUJAN PANDEY\n"
            "Account: 2690351219000001\n"
            "Transaction Success\n"
        )
        pdf_bytes = doc.tobytes()

        valid, err, img, text, doc_type = _extract_document_or_image_content(pdf_bytes, "receipt.pdf")
        self.assertTrue(valid)
        self.assertEqual(doc_type, "pdf_digital")
        self.assertIn("REF987654321", text)
        self.assertIn("150.00", text)

    def test_pdf_scanned_page_rasterization(self):
        """Tests rasterization fallback for image-only or scanned PDF documents."""
        import pymupdf
        # Create an image and embed it into a blank PDF
        img = Image.new("RGB", (300, 300), color=(255, 255, 255))
        img_buf = io.BytesIO()
        img.save(img_buf, format="PNG")
        img_bytes = img_buf.getvalue()

        doc = pymupdf.open()
        page = doc.new_page(width=300, height=300)
        page.insert_image(page.rect, stream=img_bytes)
        pdf_bytes = doc.tobytes()

        valid, err, rendered_img, text, doc_type = _extract_document_or_image_content(pdf_bytes, "scan.pdf")
        self.assertTrue(valid)
        self.assertEqual(doc_type, "pdf_scanned")
        self.assertIsNotNone(rendered_img)
        self.assertIsInstance(rendered_img, Image.Image)

    def test_generic_receipt_parser_fallback(self):
        """Verifies unknown bank layout routes through GenericReceiptParser gracefully."""
        parser = _get_parser_for_provider("UNKNOWN")
        self.assertIsInstance(parser, GenericReceiptParser)

        text = (
            "Payment Voucher\n"
            "Reference Number\n"
            "VOUCHER-998877\n"
            "Txn Amount\n"
            "150.00\n"
            "Date\n"
            "11-10-2026\n"
            "Payment Successful\n"
        )
        vdata = parser.parse(text)
        self.assertEqual(vdata.provider, "Generic")
        self.assertEqual(vdata.status, "PASS")
        self.assertEqual(vdata.amount, Decimal("150.00"))
        self.assertEqual(vdata.transaction_id, "VOUCHER-998877")

    def test_cross_bank_transfer_matching_destination(self):
        """
        Verifies that an interbank transfer with differing sender and receiver banks
        matches destination without being rejected for bank mismatch.
        """
        engine = CommonPaymentVerificationEngine()

        class MockPayment:
            id = 1001
            student_id = 99
            plan = self.plan
            plan_id = self.plan.id
            payment_method = self.bank_method
            transaction_id = "232992986"
            submitted_at = timezone.now()
            amount = Decimal("150.00")
            verification_status = "PENDING"

        parser = BankReceiptParser()
        receipt_text = (
            "Transaction Success\n"
            "Dear HEM, payment of NPR 150.00 from Siddhartha Bank was successful.\n"
            "Reference Code\n232992986\n"
            "Txn Amount (NPR)\n150.00\n"
            "Receiver's Name\n***** PANDEY\n"
            "Payment Attribute\nKMBLNPKA:2690351219000001\n"
            "Service Name\nFonepay Interbank\n"
            "Date/Time\n" + timezone.now().strftime("%d %b %Y, 10:00 AM") + "\n"
        )
        vdata = parser.parse(receipt_text, self.bank_method)

        with patch("subscriptions.payment_verification._check_duplicates", return_value=("PASS", [], False)):
            result = engine.verify(
                payment=MockPayment(),
                vdata=vdata,
                image_hash="dummy_hash",
                ocr_engine_name="rapidocr_test",
                detected_amounts=[Decimal("150.00")],
                detected_txns=["232992986"],
                detected_dates=[timezone.now().date()],
                detected_times=["10:00 AM"],
            )

        self.assertEqual(result["outcome"], "AUTO_VERIFIED")
        self.assertTrue(result["amount_matches"])
        self.assertTrue(result["transaction_id_matches"])
        self.assertTrue(result["receiver_matches"])
        self.assertTrue(result["date_matches"])
        self.assertEqual(result["detected_receiver_bank"], "Kumari Bank Limited")
        self.assertEqual(result["detected_sender_bank"], "Siddhartha Bank Limited")

    def test_dual_mode_task_dispatch_fallback(self):
        """
        Verifies that enqueue_payment_verification falls back to thread dispatch
        when Celery broker is unavailable or no worker is listening.
        """
        import sys
        with patch.object(sys, 'argv', ['runserver']):
            with patch("threading.Thread") as mock_thread:
                mock_t_instance = MagicMock()
                mock_thread.return_value = mock_t_instance

                res = enqueue_payment_verification(1234)

                self.assertTrue(mock_thread.called)
                self.assertTrue(mock_t_instance.start.called)
                self.assertEqual(res, "thread-1234")
