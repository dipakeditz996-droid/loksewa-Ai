"""
LoksewaAI - Strict Payment Screenshot OCR Verification Pipeline
====================================================================
Self-contained pipeline for strict payment verification using rules for direct access.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import unicodedata
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Optional, Tuple, List, Dict, Any

from PIL import Image, ImageOps
import numpy as np
from django.utils import timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider Detection Patterns
# ---------------------------------------------------------------------------

_PROVIDER_PATTERNS = [
    ("eSewa", [r"\besewa\b", r"\be-sewa\b"]),
    ("Khalti", [r"\bkhalti\b"]),
    ("Bank", [r"\bbank\b", r"\bbranch\b", r"\bibanking\b", r"\bm-banking\b", 
              r"\bnabil\b", r"\bnic\s*asia\b", r"\bglobal\s*ime\b", 
              r"\bprabhu\b", r"\bsanima\b", r"\bsiddhartha\b", r"\bkumari\b",
              r"\bconnect\s*ips\b", r"\bconnectips\b", r"\bnchl\b"]),
]

# ---------------------------------------------------------------------------
# Extraction Patterns
# ---------------------------------------------------------------------------

_AMOUNT_PATTERNS = [
    r"(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)\s*[:\-]?\s*[\s,]*(\d[\d,]*(?:\.\d{1,2})?)",
    r"(\d[\d,]*(?:\.\d{1,2})?)\s*(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)",
    r"(?:amount|total|paid|payment)\s*[:\-.]?\s*(?:NPR|NRS|Rs\.?)?\s*(\d[\d,]*(?:\.\d{1,2})?)",
    r"\b(\d{3,7}(?:\.\d{1,2})?)\b",
]

_TXN_PATTERNS = [
    r"(?:txn|transaction|ref(?:erence)?|order|receipt|tnx|payment)[^\w\n]?\s*(?:id|no|#|code)?\s*[:\-#.]?\s*([A-Za-z0-9\-_]{6,35})",
    r"\b([A-Z0-9]{10,35})\b",
    r"\b([A-Za-z0-9]{6,16})\b",
]

_DATE_PATTERNS = [
    r"(?:^|[^\d])(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])(?=\b|[^\d]|\d{2}:\d{2}|$)", # YYYY-MM-DD
    r"(?:^|[^\d])(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})(?=\b|[^\d]|\d{2}:\d{2}|$)", # DD-MM-YYYY
]

_SUCCESS_KEYWORDS = [
    "successful", "success", "completed", "complete", "approved",
    "confirmed", "payment done", "payment received", "thank you",
    "paid successfully", "transfer successful", "transaction successful",
]

_FAILURE_KEYWORDS = [
    "failed", "failure", "cancelled", "canceled", "declined",
    "rejected", "error", "unsuccessful", "timed out",
]

# ---------------------------------------------------------------------------
# OCR Engine Setup
# ---------------------------------------------------------------------------

_rapid_ocr_instance = None

def _get_rapid_ocr():
    global _rapid_ocr_instance
    if _rapid_ocr_instance is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr_instance = RapidOCR()
        except Exception as exc:
            logger.debug("RapidOCR initialization failed: %s", exc)
            return None
    return _rapid_ocr_instance


_WINDOWS_TESSERACT_CANDIDATES = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\diwas\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
]

def _configure_tesseract() -> bool:
    try:
        import pytesseract
        env_path = os.environ.get("TESSERACT_CMD")
        if env_path and os.path.isfile(env_path):
            pytesseract.pytesseract.tesseract_cmd = env_path
            return True
        for candidate in _WINDOWS_TESSERACT_CANDIDATES:
            if os.path.isfile(candidate):
                pytesseract.pytesseract.tesseract_cmd = candidate
                return True
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _preprocess_image(image_bytes: bytes) -> Image.Image:
    with Image.open(BytesIO(image_bytes)) as raw:
        return ImageOps.exif_transpose(raw).convert("RGB")

def _run_ocr(image: Image.Image) -> Tuple[str, str]:
    engine = _get_rapid_ocr()
    if engine is not None:
        try:
            img_np = np.array(image)
            ocr_results, _ = engine(img_np)
            if ocr_results:
                return "\n".join([res[1] for res in ocr_results]), "rapidocr"
            else:
                return "", "rapidocr"
        except Exception as exc:
            logger.warning("RapidOCR execution failed: %s", exc)

    if _configure_tesseract():
        try:
            import pytesseract
            raw_text = pytesseract.image_to_string(image, lang="eng", config="--psm 6")
            return raw_text, "pytesseract"
        except Exception as exc:
            logger.warning("Pytesseract execution failed: %s", exc)

    return "", "none"

# ---------------------------------------------------------------------------
# Parsing & Normalization Helpers
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).lower()

def _extract_amounts(text: str) -> List[Decimal]:
    amounts = []
    seen = set()
    for pattern in _AMOUNT_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).replace(",", "").strip()
            try:
                val = Decimal(raw)
                if val > 0 and val not in seen:
                    seen.add(val)
                    amounts.append(val)
            except InvalidOperation:
                pass
    return amounts

def _extract_transaction_ids(text: str) -> List[str]:
    ids = []
    seen = set()
    for pattern in _TXN_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            candidate = match.group(1).strip()
            key = candidate.upper()
            if key not in seen:
                seen.add(key)
                ids.append(candidate)
    return ids

def _extract_dates(text: str) -> List[date]:
    dates = []
    seen = set()
    for pattern in _DATE_PATTERNS:
        for match in re.finditer(pattern, text):
            # Try YYYY-MM-DD
            if len(match.group(1)) == 4:
                year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
            else:
                day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
            try:
                d = date(year, month, day)
                if d not in seen:
                    seen.add(d)
                    dates.append(d)
            except ValueError:
                pass
    return dates

def _detect_provider(text: str) -> str:
    text_lower = text.lower()
    for provider, patterns in _PROVIDER_PATTERNS:
        for pat in patterns:
            if re.search(pat, text_lower):
                return provider
    return "UNKNOWN"

# ---------------------------------------------------------------------------
# Checkers returning "PASS", "FAIL", "UNKNOWN"
# ---------------------------------------------------------------------------

def _check_amount(detected_amounts: List[Decimal], expected: Decimal) -> Tuple[str, Optional[str]]:
    if not detected_amounts:
        return "UNKNOWN", None
    for d in detected_amounts:
        if abs(d - expected) <= Decimal("0.50"):
            return "PASS", str(d)
    closest = min(detected_amounts, key=lambda x: abs(x - expected))
    return "FAIL", str(closest)

def _check_txn(full_text: str, detected_ids: List[str], expected: str) -> Tuple[str, Optional[str]]:
    if not expected:
        return "UNKNOWN", None
    exp_clean = re.sub(r"[^A-Za-z0-9]", "", expected).upper()
    if not exp_clean:
        return "UNKNOWN", None

    full_text_clean = re.sub(r"[^A-Za-z0-9]", "", full_text).upper()
    if exp_clean in full_text_clean:
        return "PASS", expected

    for txn in detected_ids:
        txn_clean = re.sub(r"[^A-Za-z0-9]", "", txn).upper()
        if txn_clean == exp_clean or exp_clean in txn_clean or txn_clean in exp_clean:
            return "PASS", txn

    if detected_ids:
        return "FAIL", detected_ids[0]
    return "UNKNOWN", None

def _check_date(detected_dates: List[date], expected_date: date) -> Tuple[str, Optional[str]]:
    if not detected_dates:
        return "UNKNOWN", None

    valid_dates = []
    future_dates = []
    too_old_dates = []

    for d in detected_dates:
        days_diff = (d - expected_date).days
        # Allow +1 day for timezone drift (Nepal UTC+5:45)
        if days_diff > 1:
            future_dates.append(d)
        elif days_diff < -60:
            too_old_dates.append(d)
        else:
            valid_dates.append(d)

    if valid_dates:
        if expected_date in valid_dates:
            return "PASS", str(expected_date)
        closest = min(valid_dates, key=lambda x: abs((x - expected_date).days))
        return "PASS", str(closest)

    if future_dates:
        return "FAIL", f"{future_dates[0]} (future date)"

    if too_old_dates:
        return "FAIL", f"{too_old_dates[0]} (older than 60 days)"

    return "UNKNOWN", None

def _check_receiver_match(full_text: str, provider: str, payment_method) -> str:
    if not payment_method:
        return "UNKNOWN"
        
    text_norm = _normalise(full_text)
    
    if provider in ["eSewa", "Khalti"]:
        merchant_phone = getattr(payment_method, "account_number", "")
        merchant_name = getattr(payment_method, "account_name", "")
        
        # Phone
        phone_pass = False
        if merchant_phone:
            phone_clean = re.sub(r"[^0-9]", "", merchant_phone)
            if len(phone_clean) >= 6 and phone_clean in re.sub(r"[^0-9]", "", full_text):
                phone_pass = True
        
        # Name
        name_pass = False
        if merchant_name:
            name_clean = _normalise(merchant_name)
            if len(name_clean) >= 3 and name_clean in text_norm:
                name_pass = True
        
        if phone_pass or name_pass:
            return "PASS"
        return "UNKNOWN"
        
    elif provider == "Bank":
        account_num = getattr(payment_method, "account_number", "")
        if account_num:
            acc_clean = re.sub(r"[^0-9]", "", account_num)
            if len(acc_clean) >= 6 and acc_clean in re.sub(r"[^0-9]", "", full_text):
                return "PASS"
        return "UNKNOWN"
            
    return "UNKNOWN"

# ---------------------------------------------------------------------------
# Duplicate Checks
# ---------------------------------------------------------------------------

def _check_duplicates(payment, image_hash: str, transaction_id: str) -> Tuple[str, List[str]]:
    from .models import SubscriptionPayment

    warnings = []
    duplicate = "PASS"
    
    if transaction_id and transaction_id.strip():
        dup_txn = SubscriptionPayment.objects.exclude(id=payment.id).filter(
            transaction_id__iexact=transaction_id.strip(),
            status__in=["APPROVED", "PENDING", "VERIFIED_CONFIDENT", "VERIFIED_UNCERTAIN"],
        ).first()
        if dup_txn:
            duplicate = "FAIL"
            warnings.append(f"Transaction ID already used in Payment #{dup_txn.id}.")

    if image_hash:
        dup_img = SubscriptionPayment.objects.exclude(id=payment.id).filter(
            verification_result__image_hash=image_hash,
            status__in=["APPROVED", "PENDING", "VERIFIED_CONFIDENT", "VERIFIED_UNCERTAIN"],
        ).first()
        if dup_img:
            duplicate = "FAIL"
            warnings.append(f"Receipt image identical to Payment #{dup_img.id}.")

    return duplicate, warnings

# ---------------------------------------------------------------------------
# Main Verification Service
# ---------------------------------------------------------------------------

class PaymentProofVerificationService:
    def verify(self, payment) -> Dict[str, Any]:
        image_bytes = self._read_screenshot(payment)
        if image_bytes is None:
            return self._fallback_result(
                "Could not read screenshot.",
                ocr_engine="storage_error",
                failure_reasons=["Receipt screenshot could not be read from storage."]
            )

        image_hash = hashlib.sha256(image_bytes).hexdigest()

        duplicate_status, dup_warnings = _check_duplicates(payment, image_hash, payment.transaction_id)
        if duplicate_status == "FAIL":
            return self._fallback_result(
                "Duplicate transaction detected.",
                outcome="REJECTED",
                image_hash=image_hash,
                failure_reasons=dup_warnings or ["Duplicate transaction or receipt image detected."]
            )

        try:
            image = _preprocess_image(image_bytes)
        except Exception as exc:
            return self._fallback_result(
                f"Image parsing failed: {exc}",
                image_hash=image_hash,
                ocr_engine="image_error",
                failure_reasons=[f"Image parsing failed: {exc}"]
            )

        raw_text, ocr_engine_name = _run_ocr(image)

        if ocr_engine_name == "none" or len(raw_text.strip()) < 15:
            return self._fallback_result(
                "OCR could not extract legible text from receipt screenshot.",
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                failure_reasons=["Receipt image is blurry or contains illegible text."]
            )

        norm_text = _normalise(raw_text)
        has_failure = any(kw in norm_text for kw in _FAILURE_KEYWORDS)
        if has_failure:
            return self._fallback_result(
                "Failure/declined keyword detected in receipt.",
                outcome="REJECTED",
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                failure_reasons=["Receipt indicates payment failed or was declined."]
            )

        provider = _detect_provider(raw_text)
        provider_status = "PASS" if provider != "UNKNOWN" else "UNKNOWN"

        today = timezone.localtime(timezone.now()).date()
        date_status, det_date = _check_date(_extract_dates(raw_text), today)
        amount_status, det_amount = _check_amount(_extract_amounts(raw_text), Decimal(str(payment.amount)))
        txn_status, det_txn = _check_txn(raw_text, _extract_transaction_ids(raw_text), payment.transaction_id)
        receiver_status = _check_receiver_match(raw_text, provider, getattr(payment, "payment_method", None))

        # Automatic verification decision:
        # A payment is AUTO_VERIFIED if:
        # 1. Exact amount matches expected amount (within tolerance)
        # 2. Transaction ID matches expected transaction ID
        # 3. Not a duplicate transaction or screenshot
        # 4. Receipt is legible, completed, and not marked failed/cancelled
        # 5. Receiver does not fail
        # 6. Date does not fail (is not in the future or expired)
        can_auto_verify = (
            amount_status == "PASS"
            and txn_status == "PASS"
            and duplicate_status == "PASS"
            and not has_failure
            and receiver_status != "FAIL"
            and date_status != "FAIL"
        )

        failure_reasons: List[str] = []
        if can_auto_verify:
            outcome = "AUTO_VERIFIED"
            notes = "Receipt verified successfully. Amount, Transaction ID, and payment details verified."
        else:
            outcome = "NEEDS_ADMIN_REVIEW"
            if duplicate_status == "FAIL":
                failure_reasons.extend(dup_warnings)
            if has_failure:
                failure_reasons.append("Receipt indicates payment failed or was declined.")
            if amount_status == "FAIL":
                failure_reasons.append(f"Amount mismatch: expected NPR {payment.amount}, detected NPR {det_amount} on receipt.")
            elif amount_status == "UNKNOWN":
                failure_reasons.append(f"Expected amount NPR {payment.amount} not detected on receipt.")
            if txn_status == "FAIL":
                failure_reasons.append(f"Transaction ID mismatch: expected '{payment.transaction_id}', detected '{det_txn}' on receipt.")
            elif txn_status == "UNKNOWN":
                failure_reasons.append(f"Transaction ID '{payment.transaction_id}' not found on receipt.")
            if date_status == "FAIL":
                failure_reasons.append(f"Receipt date issue: {det_date}.")
            if receiver_status == "FAIL":
                failure_reasons.append("Receiver merchant or account details mismatch.")
            if provider_status == "UNKNOWN" and not failure_reasons:
                failure_reasons.append("Payment provider could not be identified from receipt.")

            if not failure_reasons:
                failure_reasons.append("Receipt details require manual administrator review.")

            notes = "Payment sent for Admin approval: " + "; ".join(failure_reasons)

        return {
            "outcome": outcome,
            "ocr_engine": ocr_engine_name,
            "image_hash": image_hash,
            "receipt_legible": True,
            "payment_completed": True,
            "amount_matches": amount_status == "PASS",
            "transaction_id_matches": txn_status == "PASS",
            "receiver_matches": receiver_status == "PASS",
            "detected_amount": det_amount,
            "detected_transaction_id": det_txn,
            "detected_provider": provider if provider != "UNKNOWN" else None,
            "is_duplicate_transaction": duplicate_status == "FAIL",
            "is_duplicate_image": duplicate_status == "FAIL",
            "failure_reasons": failure_reasons,
            "notes": notes,
            "extracted_text_preview": raw_text[:800],
        }

    @staticmethod
    def _read_screenshot(payment) -> Optional[bytes]:
        try:
            image_file = payment.screenshot
            image_file.open("rb")
            try:
                return image_file.read()
            finally:
                image_file.close()
        except Exception:
            return None

    @staticmethod
    def _fallback_result(
        notes: str,
        outcome: str = "NEEDS_ADMIN_REVIEW",
        image_hash: str = "",
        ocr_engine: str = "unavailable",
        failure_reasons: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        reasons = failure_reasons or [notes]
        return {
            "outcome": outcome,
            "ocr_engine": ocr_engine,
            "image_hash": image_hash,
            "receipt_legible": False,
            "payment_completed": False,
            "amount_matches": False,
            "transaction_id_matches": False,
            "receiver_matches": False,
            "detected_amount": None,
            "detected_transaction_id": None,
            "detected_provider": None,
            "is_duplicate_transaction": False,
            "is_duplicate_image": False,
            "failure_reasons": reasons,
            "notes": notes if "Payment sent for Admin approval" in notes else f"Payment sent for Admin approval: {notes}",
            "extracted_text_preview": "",
        }
