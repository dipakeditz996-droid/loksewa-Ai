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
    r"\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b", # YYYY-MM-DD
    r"\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b", # DD-MM-YYYY
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
    if expected_date in detected_dates:
        return "PASS", str(expected_date)
    # Check if any detected date is in the future
    for d in detected_dates:
        if d > expected_date:
            return "FAIL", str(d) # Future date is a hard fail
    # Otherwise just mismatch
    closest = min(detected_dates, key=lambda x: abs((x - expected_date).days))
    return "FAIL", str(closest)

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
        
        if phone_pass and name_pass:
            return "PASS"
        if not phone_pass and not name_pass:
            return "UNKNOWN" # might just be unreadable
        return "FAIL" # partial match but missing the other, strict fail
        
    elif provider == "Bank":
        account_num = getattr(payment_method, "account_number", "")
        if account_num:
            acc_clean = re.sub(r"[^0-9]", "", account_num)
            if len(acc_clean) >= 6 and acc_clean in re.sub(r"[^0-9]", "", full_text):
                return "PASS"
            # Since bank receipts vary greatly, if not found, it's UNKNOWN rather than strict FAIL unless clear mismatch.
            # But let's follow the rule: if we can't verify the account, it's UNKNOWN.
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
            return self._fallback_result("Could not read screenshot.", ocr_engine="storage_error")

        image_hash = hashlib.sha256(image_bytes).hexdigest()

        duplicate_status, dup_warnings = _check_duplicates(payment, image_hash, payment.transaction_id)
        if duplicate_status == "FAIL":
            # Fast fail if duplicated
            return self._fallback_result("Duplicate transaction detected.", outcome="REJECTED", image_hash=image_hash)

        try:
            image = _preprocess_image(image_bytes)
        except Exception as exc:
            return self._fallback_result(f"Image parsing failed: {exc}", image_hash=image_hash, ocr_engine="image_error")

        raw_text, ocr_engine_name = _run_ocr(image)

        if ocr_engine_name == "none" or len(raw_text.strip()) < 15:
            return self._fallback_result(
                "OCR could not extract legible text.",
                image_hash=image_hash, ocr_engine=ocr_engine_name
            )

        norm_text = _normalise(raw_text)
        has_failure = any(kw in norm_text for kw in _FAILURE_KEYWORDS)
        if has_failure:
            return self._fallback_result("Failure/declined keyword detected in receipt.", outcome="REJECTED", image_hash=image_hash, ocr_engine=ocr_engine_name)

        provider = _detect_provider(raw_text)
        if provider == "UNKNOWN":
            provider_status = "UNKNOWN"
        else:
            provider_status = "PASS"

        today = timezone.localtime(timezone.now()).date()
        date_status, det_date = _check_date(_extract_dates(raw_text), today)
        amount_status, det_amount = _check_amount(_extract_amounts(raw_text), Decimal(str(payment.amount)))
        txn_status, det_txn = _check_txn(raw_text, _extract_transaction_ids(raw_text), payment.transaction_id)
        receiver_status = _check_receiver_match(raw_text, provider, getattr(payment, "payment_method", None))

        all_checks = [provider_status, date_status, amount_status, txn_status, receiver_status]
        
        # Decision Engine
        if "FAIL" in all_checks:
            outcome = "NEEDS_ADMIN_REVIEW"
        elif all(s == "PASS" for s in all_checks):
            outcome = "AUTO_VERIFIED"
        else:
            outcome = "NEEDS_ADMIN_REVIEW"

        notes_parts = []
        if provider_status != "PASS": notes_parts.append("Provider unknown.")
        if amount_status == "FAIL": notes_parts.append(f"Amount mismatch (detected {det_amount}).")
        if txn_status == "FAIL": notes_parts.append("Transaction ID mismatch.")
        if date_status == "FAIL": notes_parts.append(f"Date mismatch or future date (detected {det_date}).")
        if receiver_status == "FAIL": notes_parts.append("Receiver merchant/account mismatch.")
        
        notes = "Receipt verified successfully." if outcome == "AUTO_VERIFIED" else "Payment sent for Admin approval. " + " ".join(notes_parts)

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
    ) -> Dict[str, Any]:
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
            "notes": notes,
            "extracted_text_preview": "",
        }
