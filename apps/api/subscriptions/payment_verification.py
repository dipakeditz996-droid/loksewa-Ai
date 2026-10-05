import json
import logging
import os
from decimal import Decimal, InvalidOperation
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


class PaymentProofVerificationService:
    """Extract payment receipt details and conservatively compare them to a payment."""

    MODEL_NAME = 'gemini-2.5-flash'
    MIN_CONFIDENCE_SCORE = 0.95

    def verify(self, payment):
        api_key = os.environ.get('GEMINI_API_KEY', '').strip()
        if not api_key:
            raise RuntimeError('GEMINI_API_KEY is not configured.')

        image_file = payment.screenshot
        image_file.open('rb')
        try:
            image_bytes = image_file.read()
        finally:
            image_file.close()
        with Image.open(BytesIO(image_bytes)) as image:
            normalized_image = ImageOps.exif_transpose(image).convert('RGB')
            normalized_bytes = BytesIO()
            normalized_image.save(normalized_bytes, format='JPEG')

        client = genai.Client(api_key=api_key)
        prompt = (
            "Inspect this payment screenshot and extract only what is visibly present. "
            "Do not infer that money was received from a receipt-like appearance. "
            "Return JSON with: receipt_legible (boolean), payment_completed (boolean), "
            "detected_amount (string or null), detected_transaction_id (string or null), "
            "confidence_score (number from 0 to 1 or null reflecting confidence in all extracted "
            "fields), and notes (short string). "
            "payment_completed is true only when the screenshot explicitly shows a successful "
            "or completed payment. Use null for unreadable or absent values."
        )
        response = client.models.generate_content(
            model=self.MODEL_NAME,
            contents=[
                types.Content(
                    role='user',
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(data=normalized_bytes.getvalue(), mime_type='image/jpeg'),
                    ],
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
                temperature=0,
            ),
        )
        if not response.text:
            raise ValueError('The verification provider returned an empty response.')

        try:
            extracted = json.loads(response.text)
        except json.JSONDecodeError as exc:
            raise ValueError('The verification provider returned invalid JSON.') from exc
        if not isinstance(extracted, dict):
            raise ValueError('The verification provider returned an unexpected result.')

        result = {
            'receipt_legible': extracted.get('receipt_legible') is True,
            'payment_completed': extracted.get('payment_completed') is True,
            'detected_amount': self._string_value(extracted.get('detected_amount')),
            'detected_transaction_id': self._string_value(extracted.get('detected_transaction_id')),
            'confidence_score': self._confidence_value(extracted.get('confidence_score')),
            'notes': self._string_value(extracted.get('notes')),
        }
        result['amount_matches'] = self._amount_matches(result['detected_amount'], payment.amount)
        result['transaction_id_matches'] = self._transaction_matches(
            result['detected_transaction_id'],
            payment.transaction_id,
        )
        result['outcome'] = (
            'confident_match'
            if (
                result['receipt_legible']
                and result['payment_completed']
                and result['amount_matches']
                and result['transaction_id_matches']
                and result['confidence_score'] is not None
                and result['confidence_score'] >= self.MIN_CONFIDENCE_SCORE
            )
            else 'manual_review'
        )
        return result

    @staticmethod
    def _string_value(value):
        return value.strip()[:500] if isinstance(value, str) and value.strip() else None

    @staticmethod
    def _confidence_value(value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        confidence = float(value)
        return confidence if 0 <= confidence <= 1 else None

    @staticmethod
    def _amount_matches(detected_amount, expected_amount):
        if not detected_amount:
            return False
        try:
            return Decimal(detected_amount.replace(',', '').strip()) == Decimal(expected_amount)
        except (InvalidOperation, ValueError):
            return False

    @staticmethod
    def _transaction_matches(detected_transaction_id, expected_transaction_id):
        if not detected_transaction_id:
            return False
        return ''.join(detected_transaction_id.split()).casefold() == ''.join(
            expected_transaction_id.split()
        ).casefold()
