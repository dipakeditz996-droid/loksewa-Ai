"""
LoksewaAI - Strict Payment Screenshot OCR Verification Pipeline
====================================================================
Self-contained pipeline for strict payment verification with multi-format support
for eSewa, Khalti, Bank, and modern mobile app transfer receipts.
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
# Provider & Layout Detection Patterns
# ---------------------------------------------------------------------------

_PROVIDER_PATTERNS = [
    ("eSewa", [r"\besewa\b", r"\be-sewa\b"]),
    ("Khalti", [r"\bkhalti\b"]),
    ("Bank", [r"\bbank\b", r"\bbranch\b", r"\bibanking\b", r"\bm-banking\b", 
              r"\bnabil\b", r"\bnic\s*asia\b", r"\bglobal\s*ime\b", 
              r"\bprabhu\b", r"\bsanima\b", r"\bsiddhartha\b", r"\bkumari\b",
              r"\bconnect\s*ips\b", r"\bconnectips\b", r"\bnchl\b"]),
]

# Signatures for eSewa's modern mobile transfer format
_ESEWA_LAYOUT_SIGNATURES = [
    r"\bfund\s+transferred\b",
    r"\bfund\s+transfer\b",
    r"\btransaction\s+code\b",
    r"\bview\s+details\b",
]

# ---------------------------------------------------------------------------
# Extraction Patterns
# ---------------------------------------------------------------------------

_AMOUNT_PATTERNS = [
    r"(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)\s*[:\-]?\s*[\s,]*(\d[\d,]*(?:\.\d{1,2})?)",
    r"(\d[\d,]*(?:\.\d{1,2})?)\s*(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)",
    r"(?:amount|total|paid|payment|transferred)\s*[:\-.]?\s*(?:NPR|NRS|Rs\.?)?\s*(\d[\d,]*(?:\.\d{1,2})?)",
    r"\b(\d{1,7}\.\d{2})\b",
    r"\b(\d{2,7})\b",
]

_TXN_PATTERNS = [
    # Explicit labeled formats (including newline-separated labels)
    r"(?:transaction\s+(?:code|id|no|#|num|number)|reference\s+(?:code|id|no|#|num|number)|txn\s*(?:code|id|no|#|num)?|ref\s*(?:code|id|no|#|num)?|order\s*(?:id|no|#)?|receipt\s*(?:id|no|#)?)\s*[:\-#.]?\s*([A-Za-z0-9\-_]{6,35})",
    r"(?:txn|transaction|ref(?:erence)?|order|receipt|tnx|payment)[^\w\n]?\s*(?:id|no|#|code)?\s*[:\-#.]?\s*([A-Za-z0-9\-_]{6,35})",
    r"\b([A-Z0-9]{10,35})\b",
    r"\b([A-Za-z0-9]{6,16})\b",
]

_TXN_BLACKLIST = {
    'SUCCESSFUL', 'PAYMENT', 'DETAILS', 'TRANSFERRED', 'COMPLETED',
    'PENDING', 'TRANSACTION', 'REFERENCE', 'DOWNLOAD', 'STATEMENT',
    'APPROVED', 'CONFIRMED', 'RECEIPT', 'CANCELLED', 'REJECTED'
}

_RECIPIENT_PATTERNS = [
    r"(?:fund\s+transferred\s+to|transferred\s+to|paid\s+to|sent\s+to|credited\s+to)\s*[:\-]?\s*([A-Za-z\s.]+?)(?=\r?\n|$|\d{2}\s+[A-Za-z]{3}|\b\d{2}[/-]|npr|rs\.?|view\s+details)",
    r"(?:receiver|recipient|beneficiary(?:\s+name)?|merchant(?:\s+name)?)\s*[:\-]?\s*([A-Za-z\s.]+?)(?=\r?\n|$|\d{2}\s+[A-Za-z]{3}|\b\d{2}[/-]|npr|rs\.?|view\s+details)",
]

_MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9, 'sept': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
}

_SUCCESS_KEYWORDS = [
    "payment successful", "transaction successful", "transfer successful",
    "paid successfully", "successful", "success", "completed", "complete",
    "approved", "confirmed", "payment done", "payment received", "thank you",
    "fund transferred", "payment success",
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


def _validate_image_content(image_bytes: bytes) -> Tuple[bool, str, Optional[Image.Image]]:
    try:
        with Image.open(BytesIO(image_bytes)) as raw:
            image = ImageOps.exif_transpose(raw).convert("RGB")
    except Exception as exc:
        return False, f"Receipt image corrupted or invalid: {exc}", None

    w, h = image.size
    if w < 50 or h < 50:
        return False, "Receipt image resolution is too low.", None

    try:
        arr = np.array(image.convert("L"))
        if np.std(arr) < 1.0:
            return False, "Receipt image appears blank or monochrome.", None
    except Exception:
        pass

    return True, "", image


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
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).lower().strip()

def _check_payment_status(text: str) -> Tuple[str, Optional[str]]:
    text_norm = _normalise(text)
    for kw in _FAILURE_KEYWORDS:
        if kw in text_norm:
            return "FAIL", kw
    for kw in _SUCCESS_KEYWORDS:
        if kw in text_norm:
            return "PASS", kw
    return "UNKNOWN", None

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
            if key not in seen and key not in _TXN_BLACKLIST and len(key) >= 6:
                seen.add(key)
                ids.append(candidate)
    return ids

def _extract_dates(text: str) -> List[date]:
    dates = []
    seen = set()

    # 1. Textual month formats: e.g. "06 OCT, 2026", "06 Oct 2026", "6 October 2026"
    for m in re.finditer(r"\b(0?[1-9]|[12]\d|3[01])\s+([A-Za-z]{3,9}),?\s+(20\d{2})\b", text, re.IGNORECASE):
        day_str, mon_str, year_str = m.group(1), m.group(2).lower(), m.group(3)
        month = _MONTH_MAP.get(mon_str)
        if month:
            try:
                d = date(int(year_str), month, int(day_str))
                if d not in seen:
                    seen.add(d)
                    dates.append(d)
            except ValueError:
                pass

    # 2. Textual month inverted: e.g. "October 06, 2026", "Oct 6 2026"
    for m in re.finditer(r"\b([A-Za-z]{3,9})\s+(0?[1-9]|[12]\d|3[01]),?\s+(20\d{2})\b", text, re.IGNORECASE):
        mon_str, day_str, year_str = m.group(1).lower(), m.group(2), m.group(3)
        month = _MONTH_MAP.get(mon_str)
        if month:
            try:
                d = date(int(year_str), month, int(day_str))
                if d not in seen:
                    seen.add(d)
                    dates.append(d)
            except ValueError:
                pass

    # 3. Hyphenated textual: e.g. "06-Oct-2026"
    for m in re.finditer(r"\b(0?[1-9]|[12]\d|3[01])[-/]([A-Za-z]{3,9})[-/](20\d{2})\b", text, re.IGNORECASE):
        day_str, mon_str, year_str = m.group(1), m.group(2).lower(), m.group(3)
        month = _MONTH_MAP.get(mon_str)
        if month:
            try:
                d = date(int(year_str), month, int(day_str))
                if d not in seen:
                    seen.add(d)
                    dates.append(d)
            except ValueError:
                pass

    # 4. YYYY-MM-DD
    for m in re.finditer(r"\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b", text):
        try:
            d = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            if d not in seen:
                seen.add(d)
                dates.append(d)
        except ValueError:
            pass

    # 5. DD-MM-YYYY
    for m in re.finditer(r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b", text):
        try:
            d = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            if d not in seen:
                seen.add(d)
                dates.append(d)
        except ValueError:
            pass

    return dates

def _extract_times(text: str) -> List[str]:
    times = []
    seen = set()
    # 12-hour with AM/PM: e.g. "02:32 PM", "2:32 pm"
    for m in re.finditer(r"\b(0?[1-9]|1[0-2]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b", text):
        raw = m.group(0).strip()
        val = raw.upper()
        if val not in seen:
            seen.add(val)
            times.append(raw)

    # 24-hour: e.g. "14:32"
    for m in re.finditer(r"\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b", text):
        raw = m.group(0).strip()
        if raw not in seen and not any(raw in t for t in times):
            seen.add(raw)
            times.append(raw)

    return times

def _extract_recipient(text: str) -> Optional[str]:
    for pattern in _RECIPIENT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Clean trailing punctuation
            candidate = re.sub(r"[:\-.,]+$", "", candidate).strip()
            if len(candidate) >= 3 and not any(kw == candidate.lower() for kw in _SUCCESS_KEYWORDS):
                return candidate
    return None

def _detect_provider(text: str, payment_method=None) -> str:
    text_lower = text.lower()
    for provider, patterns in _PROVIDER_PATTERNS:
        for pat in patterns:
            if re.search(pat, text_lower):
                return provider

    # Check for eSewa layout signatures
    has_esewa_layout = any(re.search(sig, text_lower) for sig in _ESEWA_LAYOUT_SIGNATURES)
    if has_esewa_layout:
        return "eSewa"

    # Contextual check using configured payment method
    if payment_method:
        method_type = getattr(payment_method, "method_type", "")
        if method_type == "ESEWA" and (has_esewa_layout or "payment successful" in text_lower):
            return "eSewa"
        elif method_type == "KHALTI" and "khalti" in text_lower:
            return "Khalti"
        elif method_type == "BANK":
            return "Bank"

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

def _check_receiver_match(
    full_text: str,
    detected_recipient: Optional[str],
    provider: str,
    payment_method,
) -> Tuple[str, Optional[str]]:
    if not payment_method:
        return "UNKNOWN", None

    text_norm = _normalise(full_text)
    merchant_name = getattr(payment_method, "account_name", "")
    merchant_phone = getattr(payment_method, "account_number", "")

    # 1. Phone number match (eSewa / Khalti / Bank account number)
    if merchant_phone:
        phone_clean = re.sub(r"[^0-9]", "", merchant_phone)
        if len(phone_clean) >= 6 and phone_clean in re.sub(r"[^0-9]", "", full_text):
            return "PASS", merchant_phone

    # 2. Account / Merchant name match
    if merchant_name:
        name_clean = _normalise(merchant_name)
        # Direct substring in full OCR text
        if len(name_clean) >= 3 and name_clean in text_norm:
            return "PASS", merchant_name

        # Match against extracted recipient
        if detected_recipient:
            det_clean = _normalise(detected_recipient)
            if det_clean in name_clean or name_clean in det_clean:
                return "PASS", detected_recipient

            # Word-set overlap (e.g. "Dipak Bhandari" vs "Dipak Bhandari - LoksewaAI")
            cfg_words = [w for w in name_clean.split() if len(w) >= 3]
            det_words = [w for w in det_clean.split() if len(w) >= 3]
            if cfg_words and all(w in det_words for w in cfg_words):
                return "PASS", detected_recipient
            if det_words and all(w in cfg_words for w in det_words):
                return "PASS", detected_recipient

    # If recipient was explicitly extracted but differs completely from configured receiver
    if detected_recipient and merchant_name:
        det_clean = _normalise(detected_recipient)
        name_clean = _normalise(merchant_name)
        if len(det_clean) >= 3 and not (det_clean in name_clean or name_clean in det_clean):
            return "FAIL", detected_recipient

    return "UNKNOWN", None

# ---------------------------------------------------------------------------
# Duplicate Checks
# ---------------------------------------------------------------------------

def _check_duplicates(payment, image_hash: str, transaction_ids: List[str]) -> Tuple[str, List[str]]:
    from .models import SubscriptionPayment

    warnings = []
    duplicate = "PASS"

    for txn_id in transaction_ids:
        if txn_id and txn_id.strip():
            dup_txn = SubscriptionPayment.objects.exclude(id=payment.id).filter(
                transaction_id__iexact=txn_id.strip(),
                status__in=["APPROVED", "PENDING", "VERIFIED_CONFIDENT", "VERIFIED_UNCERTAIN"],
            ).first()
            if dup_txn:
                duplicate = "FAIL"
                warnings.append(f"Transaction ID '{txn_id}' already used in Payment #{dup_txn.id}.")

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

        # Initial duplicate check on student's submitted transaction ID
        duplicate_status, dup_warnings = _check_duplicates(
            payment, image_hash, [payment.transaction_id]
        )
        if duplicate_status == "FAIL":
            is_dup_txn = any("Transaction ID" in w for w in dup_warnings)
            is_dup_img = any("Receipt image" in w for w in dup_warnings)
            return self._fallback_result(
                "Duplicate transaction detected.",
                outcome="REJECTED",
                image_hash=image_hash,
                is_duplicate_transaction=is_dup_txn,
                is_duplicate_image=is_dup_img,
                failure_reasons=dup_warnings or ["Duplicate transaction or receipt image detected."]
            )

        # Image validation
        valid_img, img_err, image = _validate_image_content(image_bytes)
        if not valid_img or image is None:
            return self._fallback_result(
                img_err,
                outcome="NEEDS_ADMIN_REVIEW",
                image_hash=image_hash,
                ocr_engine="image_error",
                failure_reasons=[img_err]
            )

        raw_text, ocr_engine_name = _run_ocr(image)

        if ocr_engine_name == "none" or len(raw_text.strip()) < 15:
            return self._fallback_result(
                "OCR could not extract legible text from receipt screenshot.",
                outcome="NEEDS_ADMIN_REVIEW",
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                failure_reasons=["Receipt image is blurry or contains illegible text."]
            )

        status_result, matched_status_kw = _check_payment_status(raw_text)
        if status_result == "FAIL":
            return self._fallback_result(
                f"Failure keyword detected in receipt: '{matched_status_kw}'.",
                outcome="REJECTED",
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                failure_reasons=["Receipt indicates payment failed or was declined."]
            )

        # Provider and format detection
        provider = _detect_provider(raw_text, getattr(payment, "payment_method", None))
        provider_status = "PASS" if provider != "UNKNOWN" else "UNKNOWN"

        # Field extractions
        detected_amounts = _extract_amounts(raw_text)
        detected_txns = _extract_transaction_ids(raw_text)
        detected_dates = _extract_dates(raw_text)
        detected_times = _extract_times(raw_text)
        detected_recipient = _extract_recipient(raw_text)

        today = timezone.localtime(timezone.now()).date()
        date_status, det_date = _check_date(detected_dates, today)
        amount_status, det_amount = _check_amount(detected_amounts, Decimal(str(payment.amount)))
        txn_status, det_txn = _check_txn(raw_text, detected_txns, payment.transaction_id)
        receiver_status, det_receiver = _check_receiver_match(
            raw_text, detected_recipient, provider, getattr(payment, "payment_method", None)
        )

        # Re-check duplicates with all detected transaction IDs from OCR
        all_candidate_txns = list({payment.transaction_id} | set(detected_txns))
        dup_status_all, dup_warnings_all = _check_duplicates(payment, image_hash, all_candidate_txns)
        if dup_status_all == "FAIL":
            duplicate_status = "FAIL"
            dup_warnings = dup_warnings_all

        # Formatting extracted fields for metadata
        det_date_str = str(det_date) if det_date else (str(detected_dates[0]) if detected_dates else None)
        det_time_str = detected_times[0] if detected_times else None

        # Automatic verification decision:
        # A payment is AUTO_VERIFIED if:
        # 1. Payment status indicates success
        # 2. Exact amount matches backend package price (within tolerance)
        # 3. Transaction ID matches
        # 4. Transaction date is valid and current (not future / expired)
        # 5. Receiver/merchant matches configured payment method
        # 6. Provider/layout format confidently identified
        # 7. No duplicates detected
        can_auto_verify = (
            status_result == "PASS"
            and amount_status == "PASS"
            and txn_status == "PASS"
            and date_status == "PASS"
            and receiver_status == "PASS"
            and provider_status == "PASS"
            and duplicate_status == "PASS"
        )

        failure_reasons: List[str] = []
        if can_auto_verify:
            outcome = "AUTO_VERIFIED"
            notes = "Receipt verified successfully. Amount, Transaction ID, and payment details verified."
        else:
            outcome = "NEEDS_ADMIN_REVIEW"
            if duplicate_status == "FAIL":
                failure_reasons.extend(dup_warnings)
            if status_result == "UNKNOWN":
                failure_reasons.append("Payment completion status not clearly recognized on receipt.")
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
            elif date_status == "UNKNOWN":
                failure_reasons.append("Valid transaction date not detected on receipt.")
            if receiver_status == "FAIL":
                failure_reasons.append("Receiver merchant or account details mismatch.")
            elif receiver_status == "UNKNOWN":
                failure_reasons.append("Receiver details could not be verified against configured payment method.")
            if provider_status == "UNKNOWN" and not failure_reasons:
                failure_reasons.append("Payment provider or receipt format could not be identified.")

            if not failure_reasons:
                failure_reasons.append("Receipt details require manual administrator review.")

            notes = "Payment sent for Admin approval: " + "; ".join(failure_reasons)

        return {
            "outcome": outcome,
            "ocr_engine": ocr_engine_name,
            "image_hash": image_hash,
            "receipt_legible": True,
            "payment_completed": status_result == "PASS",
            "amount_matches": amount_status == "PASS",
            "transaction_id_matches": txn_status == "PASS",
            "receiver_matches": receiver_status == "PASS",
            "date_matches": date_status == "PASS",
            "detected_amount": det_amount,
            "detected_transaction_id": det_txn,
            "detected_date": det_date_str,
            "detected_time": det_time_str,
            "detected_recipient": detected_recipient,
            "detected_status": "Successful" if status_result == "PASS" else ("Failed" if status_result == "FAIL" else None),
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
        is_duplicate_transaction: bool = False,
        is_duplicate_image: bool = False,
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
            "date_matches": False,
            "detected_amount": None,
            "detected_transaction_id": None,
            "detected_date": None,
            "detected_time": None,
            "detected_recipient": None,
            "detected_status": None,
            "detected_provider": None,
            "is_duplicate_transaction": is_duplicate_transaction,
            "is_duplicate_image": is_duplicate_image,
            "failure_reasons": reasons,
            "notes": notes if "Payment sent for Admin approval" in notes else f"Payment sent for Admin approval: {notes}",
            "extracted_text_preview": "",
        }
