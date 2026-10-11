"""
LoksewaAI - Multi-Provider Payment Screenshot OCR Verification Pipeline
========================================================================
Common verification architecture for:
  1. eSewa
  2. Khalti
  3. Bank Transfer / Bank Deposit screenshots

Architecture Flow:
  Student -> Package / Subscription Plan -> Payment Submission ->
  Uploaded Payment Proof -> Provider Detection ->
  Provider-Specific OCR Parser (eSewa / Khalti / Bank / Generic) ->
  Normalized PaymentVerificationData ->
  Common Payment Verification Engine ->
  Verification Result (AUTO_VERIFIED / NEEDS_ADMIN_REVIEW / REJECTED) ->
  Existing Payment Approval / Subscription Activation
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
import hashlib
import logging
import os
import re
import unicodedata
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Optional, Tuple, List, Dict, Any

from PIL import Image, ImageOps, ImageEnhance
import numpy as np
from django.utils import timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Common Normalized Payment Data Structure
# ---------------------------------------------------------------------------

@dataclass
class PaymentVerificationData:
    provider: str  # "eSewa", "Khalti", "Bank", "UNKNOWN"
    status: str    # "PASS", "FAIL", "UNKNOWN"
    amount: Optional[Decimal] = None
    currency: Optional[str] = "NPR"
    merchant_name: Optional[str] = None
    merchant_account: Optional[str] = None
    merchant_phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    sender_name: Optional[str] = None
    sender_account: Optional[str] = None
    sender_bank: Optional[str] = None
    receiver_bank: Optional[str] = None
    transfer_mode: Optional[str] = None
    service_charge: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    transaction_id: Optional[str] = None
    reference_id: Optional[str] = None
    transaction_date: Optional[date] = None
    transaction_time: Optional[str] = None
    raw_ocr_text: str = ""
    ocr_confidence: float = 0.95
    image_quality: str = "GOOD"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "status": self.status,
            "amount": str(self.amount) if self.amount is not None else None,
            "currency": self.currency,
            "merchant_name": self.merchant_name,
            "merchant_account": self.merchant_account,
            "merchant_phone": self.merchant_phone,
            "bank_name": self.bank_name,
            "bank_account": self.bank_account,
            "sender_name": self.sender_name,
            "sender_account": self.sender_account,
            "sender_bank": self.sender_bank,
            "receiver_bank": self.receiver_bank,
            "transfer_mode": self.transfer_mode,
            "service_charge": str(self.service_charge) if self.service_charge is not None else None,
            "total_amount": str(self.total_amount) if self.total_amount is not None else None,
            "transaction_id": self.transaction_id,
            "reference_id": self.reference_id,
            "transaction_date": str(self.transaction_date) if self.transaction_date else None,
            "transaction_time": self.transaction_time,
            "raw_ocr_text": self.raw_ocr_text,
            "ocr_confidence": self.ocr_confidence,
            "image_quality": self.image_quality,
        }


# ---------------------------------------------------------------------------
# Provider & Layout Detection Patterns
# ---------------------------------------------------------------------------

_SWIFT_BANK_CODES = {
    "KMBL": "Kumari Bank Limited",
    "KMBLNPKA": "Kumari Bank Limited",
    "SBL": "Siddhartha Bank Limited",
    "SBLNPKA": "Siddhartha Bank Limited",
    "NABIL": "Nabil Bank Limited",
    "NABILNPKA": "Nabil Bank Limited",
    "GBIME": "Global IME Bank Limited",
    "GBIMENPKA": "Global IME Bank Limited",
    "NICA": "NIC ASIA Bank Limited",
    "NICANPKA": "NIC ASIA Bank Limited",
    "HBL": "Himalayan Bank Limited",
    "HBLNPKA": "Himalayan Bank Limited",
    "NBL": "Nepal Bank Limited",
    "NBLNPKA": "Nepal Bank Limited",
    "RBB": "Rastriya Banijya Bank",
    "RBBLNPKA": "Rastriya Banijya Bank",
    "PRVU": "Prabhu Bank Limited",
    "PRBUNPKA": "Prabhu Bank Limited",
    "SANIMA": "Sanima Bank Limited",
    "MBL": "Machhapuchchhre Bank Limited",
    "NIMB": "Nepal Investment Mega Bank Limited",
    "EBL": "Everest Bank Limited",
    "NSBI": "Nepal SBI Bank Limited",
    "NSBINPKA": "Nepal SBI Bank Limited",
    "SCB": "Standard Chartered Bank Nepal",
    "CZBIL": "Citizens Bank International",
    "LBL": "Laxmi Sunrise Bank",
    "SRBL": "Laxmi Sunrise Bank",
    "ADBL": "Agricultural Development Bank",
    "PCBL": "Prime Commercial Bank",
}

_PROVIDER_PATTERNS = [
    ("eSewa", [r"\besewa\b", r"\be-sewa\b"]),
    ("Khalti", [r"\bkhalti\b"]),
    ("Bank", [
        r"\bbank\b", r"\bbranch\b", r"\bibanking\b", r"\bm-banking\b",
        r"\bnabil\b", r"\bnic\s*asia\b", r"\bglobal\s*ime\b",
        r"\bprabhu\b", r"\bsanima\b", r"\bsiddhartha\b", r"\bkumari\b",
        r"\beverest\b", r"\bhimalayan\b", r"\blaxmi\b", r"\bsunrise\b",
        r"\bcitizens\b", r"\bmachhapuchchhre\b", r"\brastriya\s*banijya\b",
        r"\brbb\b", r"\bkrishi\s*bikas\b", r"\badbl\b", r"\bnepal\s*sbi\b",
        r"\bstandard\s*chartered\b", r"\bprime\s*(?:commercial)?\s*bank\b",
        r"\bconnect\s*ips\b", r"\bconnectips\b", r"\bnchl\b", r"\bfonepay\b",
        r"\binterbank\b", r"\bips\s*transfer\b", r"\bfund\s*transfer\b",
        r"\bkmbl(?:npka)?\b", r"\bsbl(?:npka)?\b"
    ]),
]

_NEPALESE_BANKS = [
    ("Kumari Bank", [r"\bkumari\s*(?:bank)?\b", r"\bkmbl(?:npka)?\b"]),
    ("Siddhartha Bank", [r"\bsiddhartha\s*(?:bank)?\b", r"\bsbl(?:npka)?\b"]),
    ("Nabil Bank", [r"\bnabil\s*(?:bank)?\b", r"\bnabilnpka\b"]),
    ("Global IME Bank", [r"\bglobal\s*ime\s*(?:bank)?\b", r"\bglobal\s*bank\b", r"\bgbime\b"]),
    ("NIC ASIA Bank", [r"\bnic\s*asia\s*(?:bank)?\b", r"\bnica\b"]),
    ("Nepal Bank", [r"\bnepal\s*bank\s*(?:ltd|limited)?\b", r"\bnbl\b"]),
    ("Rastriya Banijya Bank", [r"\brastriya\s*banijya\s*(?:bank)?\b", r"\brbb\b"]),
    ("Himalayan Bank", [r"\bhimalayan\s*(?:bank)?\b", r"\bhbl\b"]),
    ("Sanima Bank", [r"\bsanima\s*(?:bank)?\b"]),
    ("Prabhu Bank", [r"\bprabhu\s*(?:bank)?\b", r"\bprvu\b"]),
    ("Everest Bank", [r"\beverest\s*(?:bank)?\b", r"\bebl\b"]),
    ("Machhapuchchhre Bank", [r"\bmachhapuchchhre\s*(?:bank)?\b", r"\bmbl\b"]),
    ("Nepal Investment Mega Bank", [r"\bnepal\s*investment\s*(?:mega)?\s*bank\b", r"\bnimb\b", r"\bmega\s*bank\b"]),
    ("Laxmi Sunrise Bank", [r"\blaxmi\s*sunrise\s*(?:bank)?\b", r"\blaxmi\s*(?:bank)?\b", r"\bsunrise\s*(?:bank)?\b"]),
    ("Citizens Bank", [r"\bcitizens\s*(?:bank)?\b", r"\bczbil\b"]),
    ("Agricultural Development Bank", [r"\bagricultural\s*development\s*bank\b", r"\badbl\b", r"\bkrishi\s*bikas\s*bank\b"]),
    ("Nepal SBI Bank", [r"\bnepal\s*sbi\s*(?:bank)?\b", r"\bsbi\s*bank\b"]),
    ("Standard Chartered Bank", [r"\bstandard\s*chartered\s*(?:bank)?\b", r"\bscb\b"]),
    ("Prime Commercial Bank", [r"\bprime\s*(?:commercial)?\s*bank\b"]),
    ("ConnectIPS", [r"\bconnect\s*ips\b", r"\bconnectips\b", r"\bnchl\b"]),
    ("Fonepay", [r"\bfonepay\b", r"\bfone\s*pay\b"]),
]

_ESEWA_LAYOUT_SIGNATURES = [
    r"\bfund\s+transferred\b",
    r"\bfund\s+transfer\b",
    r"\btransaction\s+code\b",
    r"\bview\s+details\b",
]

_KHALTI_LAYOUT_SIGNATURES = [
    r"\bkhalti\b",
    r"\bkhalti\s+id\b",
    r"\bkhalti\s+wallet\b",
]

# ---------------------------------------------------------------------------
# Extraction Patterns
# ---------------------------------------------------------------------------

_AMOUNT_PATTERNS = [
    r"(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)\s*[:\-]?\s*[\s,]*(\d[\d,]*(?:\.\d{1,2})?)",
    r"(\d[\d,]*(?:\.\d{1,2})?)\s*(?:NPR|NRS|Rs\.?|\u20a8|\u0930\u0941)",
    r"(?:amount|total(?:\s+amount)?|paid|payment|transferred|transfer\s+amount|debit\s+amount)\s*[:\-.]?\s*(?:NPR|NRS|Rs\.?)?\s*(\d[\d,]*(?:\.\d{1,2})?)",
    r"\b(\d{1,7}\.\d{2})\b",
]

_TXN_PATTERNS = [
    # Explicit labeled formats
    r"(?:transaction\s+(?:code|id|no|#|num|number)|reference\s+(?:code|id|no|#|num|number)|txn\s*(?:code|id|no|#|num)?|ref\s*(?:code|id|no|#|num)?|order\s*(?:id|no|#)?|receipt\s*(?:id|no|#)?|voucher\s*(?:no|num|number)?|journal\s*(?:no|num|number)?|trace\s*(?:no|num|number)?|rrn)\s*[:\-#.]?\s*([A-Za-z0-9\-_]{5,35})",
    r"(?:txn|transaction|ref(?:erence)?|order|receipt|tnx|payment)\s*[:\-#.]\s*([A-Za-z0-9\-_]{5,35})",
    r"\b([A-Z0-9]{10,35})\b",
    r"\b([A-Za-z0-9]{6,16})\b",
]

_TXN_BLACKLIST = {
    'SUCCESSFUL', 'PAYMENT', 'DETAILS', 'TRANSFERRED', 'COMPLETED',
    'PENDING', 'TRANSACTION', 'REFERENCE', 'DOWNLOAD', 'STATEMENT',
    'APPROVED', 'CONFIRMED', 'RECEIPT', 'CANCELLED', 'REJECTED',
    'BENEFICIARY', 'RECIPIENT', 'AMOUNT', 'ACCOUNT', 'TRANSACTIONSUCCESS',
    'DOWNLOADRECEIPT', 'ONLINE', 'DONE', 'REMARKS', 'CHANNEL',
    'ATTRLBUTE', 'ATTRIBUTE', 'INITLATOR', 'INITIATOR', 'SERVICE',
    'INTERBANK', 'FONEPAY', 'CONNECTIPS', 'TOTAL', 'CHARGE',
    'TXNAMOUNT', 'TOTALAMOUNT', 'SENDER', 'RECEIVER', 'SUCCESS',
    'EXAM', 'DATE/TIME', 'DATETIME', 'FONEPAYINTERBANK', 'FONEPAYINTER'
}

_RECIPIENT_PATTERNS = [
    r"(?:fund\s+transferred\s+to|transferred\s+to|paid\s+to|sent\s+to|credited\s+to)\s*[:\-]?\s*([A-Za-z\s.]+?)(?=\r?\n|$|\d{2}\s+[A-Za-z]{3}|\b\d{2}[/-]|npr|rs\.?|view\s+details)",
    r"(?:receiver(?:\s+name)?|recipient(?:\s+name)?|beneficiary(?:\s+name)?|merchant(?:\s+name)?|payee(?:\s+name)?)\s*[:\-]?\s*([A-Za-z\s.]+?)(?=\r?\n|$|\d{2}\s+[A-Za-z]{3}|\b\d{2}[/-]|npr|rs\.?|view\s+details)",
    r"(?:to)\s*[:\-]\s*([A-Za-z\s.]+?)(?=\r?\n|$|\d{2}\s+[A-Za-z]{3}|\b\d{2}[/-]|npr|rs\.?|view\s+details)",
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
    "fund transfer successful", "fund transferred successful", "paid successfully",
    "successful", "success", "completed", "complete", "approved", "confirmed",
    "payment done", "payment received", "thank you", "fund transferred", "payment success",
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


def _extract_document_or_image_content(
    content_bytes: bytes, filename: str = ""
) -> Tuple[bool, str, Optional[Image.Image], str, str]:
    """
    Universal payment document and screenshot extractor.
    Supports:
      - Digital text PDFs (extracts embedded text directly)
      - Scanned / Image PDFs (renders page 0 to high-res image for OCR)
      - Images (JPEG, PNG, WebP)
    Returns: (is_valid, error_message, pil_image_or_none, digital_text, doc_type)
    """
    is_pdf = content_bytes.startswith(b"%PDF") or filename.lower().endswith(".pdf")

    if is_pdf:
        if len(content_bytes) < 64:
            return False, "PDF receipt file is corrupted or empty.", None, "", "pdf"

        # 1. Try PyMuPDF (pymupdf / fitz)
        try:
            import pymupdf  # type: ignore
            doc = pymupdf.open(stream=content_bytes, filetype="pdf")
            if len(doc) == 0:
                return False, "PDF receipt contains no pages.", None, "", "pdf"

            extracted_text = ""
            for page_num in range(min(len(doc), 3)):
                p_text = doc[page_num].get_text()
                if p_text:
                    extracted_text += "\n" + p_text.strip()

            extracted_text = extracted_text.strip()
            # If PDF has rich selectable text (digital bank transfer PDF)
            if len(extracted_text) >= 40:
                return True, "", None, extracted_text, "pdf_digital"

            # Scanned or image-only PDF: render first page
            page0 = doc[0]
            pix = page0.get_pixmap(dpi=150)
            rendered_image = Image.open(BytesIO(pix.tobytes("png"))).convert("RGB")
            return True, "", rendered_image, extracted_text, "pdf_scanned"
        except Exception as pdf_exc:
            logger.warning("PyMuPDF PDF extraction failed: %s", pdf_exc)

        # 2. Fallback to pypdf for digital text
        try:
            import pypdf
            reader = pypdf.PdfReader(BytesIO(content_bytes))
            pypdf_text = ""
            for p in reader.pages[:3]:
                t = p.extract_text()
                if t:
                    pypdf_text += "\n" + t
            pypdf_text = pypdf_text.strip()
            if len(pypdf_text) >= 40:
                return True, "", None, pypdf_text, "pdf_digital"
        except Exception as pypdf_exc:
            logger.warning("pypdf extraction failed: %s", pypdf_exc)

        return False, "Unable to extract text or render scanned PDF receipt.", None, "", "pdf"

    # Image handling (JPEG, PNG, WebP, etc.)
    valid_img, img_err, image = _validate_image_content(content_bytes)
    if not valid_img or image is None:
        return False, img_err, None, "", "image"

    return True, "", image, "", "image"


def _preprocess_image_variants(image: Image.Image) -> List[Tuple[str, Image.Image]]:
    """Generates alternative OCR-ready variants (original, contrast-enhanced, inverted for dark-mode)."""
    variants = [("original", image)]
    try:
        gray = image.convert("L")
        mean_lum = float(np.mean(np.array(gray)))
        # Dark mode screenshot detection: invert colors
        if mean_lum < 110:
            inverted = ImageOps.invert(image)
            variants.append(("inverted_dark_mode", inverted))

        # Contrast-enhanced variant
        enhanced = ImageEnhance.Contrast(image).enhance(1.7)
        variants.append(("contrast_boost", enhanced))
    except Exception as exc:
        logger.debug("Image preprocessing variant generation skipped: %s", exc)
    return variants


def _run_ocr(image: Image.Image) -> Tuple[str, str]:
    """Runs OCR across available engines and preprocessing variants."""
    engine = _get_rapid_ocr()
    if engine is not None:
        for variant_name, img_variant in _preprocess_image_variants(image):
            try:
                img_np = np.array(img_variant)
                ocr_results, _ = engine(img_np)
                if ocr_results:
                    raw_text = "\n".join([res[1] for res in ocr_results])
                    if len(raw_text.strip()) >= 15:
                        return raw_text, f"rapidocr_{variant_name}"
            except Exception as exc:
                logger.warning("RapidOCR execution failed on variant %s: %s", variant_name, exc)

    if _configure_tesseract():
        try:
            import pytesseract
            raw_text = pytesseract.image_to_string(image, lang="eng", config="--psm 6")
            if len(raw_text.strip()) >= 15:
                return raw_text, "pytesseract"
        except Exception as exc:
            logger.warning("Pytesseract execution failed: %s", exc)

    return "", "none"


def _scan_consecutive_key_values(text: str) -> Dict[str, str]:
    """
    Parses consecutive label/value pairs from mobile banking screens and digital receipts,
    e.g.:
      Reference Code
      232992986
      Txn Amount (NPR)
      150.00
      Receiver's Account
      269###19000001
    """
    kv: Dict[str, str] = {}
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    label_patterns = [
        ("reference_code", r"^(?:reference\s*(?:code|id|no|number)|ref\s*(?:code|id|no)|transaction\s*(?:id|code|no)|txn\s*(?:id|code|no)|voucher\s*(?:no|number)|trace\s*(?:id|no))$"),
        ("txn_amount", r"^(?:txn\s*amount(?:\s*\([a-z]+\))?|transfer\s*amount(?:\s*\([a-z]+\))?|amount(?:\s*\([a-z]+\))?)$"),
        ("charge", r"^(?:charge(?:\s*\([a-z]+\))?|service\s*charge(?:\s*\([a-z]+\))?|fee(?:\s*\([a-z]+\))?)$"),
        ("total_amount", r"^(?:total\s*amount(?:\s*\([a-z]+\))?|total(?:\s*\([a-z]+\))?)$"),
        ("sender_name", r"^(?:sender(?:'s)?\s*name|from\s*name|remitter(?:'s)?\s*name|payer(?:'s)?\s*name)$"),
        ("sender_account", r"^(?:sender(?:'s)?\s*account|from\s*a/?c|debit\s*a/?c|debited\s*from\s*a/?c)$"),
        ("receiver_name", r"^(?:receiver(?:'s)?\s*name|recipient(?:'s)?\s*name|beneficiary(?:'s)?\s*name|payee(?:'s)?\s*name|to\s*name)$"),
        ("receiver_account", r"^(?:receiver(?:'s)?\s*account|beneficiary\s*a/?c|credit\s*a/?c|credited\s*to\s*a/?c|to\s*a/?c|destination\s*a/?c)$"),
        ("date_time", r"^(?:date\s*/\s*time|txn\s*date|date|transaction\s*date)$"),
        ("payment_attribute", r"^(?:payment\s*attribute|attribute)$"),
        ("service_name", r"^(?:service\s*name|payment\s*service|transfer\s*channel)$"),
        ("initiator", r"^(?:initiator|initiated\s*by)$"),
        ("remarks", r"^(?:remarks|purpose|description)$"),
    ]

    for i, line in enumerate(lines):
        clean_line = line.strip().lower()
        clean_line = re.sub(r"[:\-#.]+$", "", clean_line).strip()
        for key, pat in label_patterns:
            if re.match(pat, clean_line, re.IGNORECASE):
                if i + 1 < len(lines):
                    next_val = lines[i + 1].strip()
                    is_another_label = any(re.match(p, next_val.lower().rstrip(":-#.")) for _, p in label_patterns)
                    if not is_another_label and key not in kv:
                        kv[key] = next_val
                break

    return kv


def _accounts_match(detected: Optional[str], expected: Optional[str]) -> bool:
    """Matches detected bank accounts against expected accounts, supporting mask symbols (*, #, X)."""
    if not detected or not expected:
        return False
    det_clean = detected.strip()
    exp_clean = re.sub(r"[^0-9A-Za-z]", "", expected)
    if not exp_clean:
        return False

    # 1. Masked accounts with prefix and suffix: e.g. 269###19000001, 269***19000001, 269XXX19000001
    mask_match = re.match(r"^([0-9A-Za-z]+?)[#*Xx\-]+([0-9A-Za-z]+)$", det_clean)
    if mask_match:
        prefix = mask_match.group(1)
        suffix = mask_match.group(2)
        if len(prefix) >= 2 and len(suffix) >= 3 and exp_clean.startswith(prefix) and exp_clean.endswith(suffix):
            return True

    # 2. Suffix-only mask: e.g. ***19000001, ###19000001, XXX19000001
    suffix_match = re.match(r"^[#*Xx\-]+([0-9A-Za-z]{4,12})$", det_clean)
    if suffix_match:
        suffix = suffix_match.group(1)
        if exp_clean.endswith(suffix):
            return True

    # 3. Exact or substring without punctuation
    det_alphanumeric = re.sub(r"[^0-9A-Za-z]", "", det_clean)
    if det_alphanumeric and (det_alphanumeric in exp_clean or exp_clean in det_alphanumeric):
        return True

    return False


def _names_match(detected: Optional[str], expected: Optional[str]) -> bool:
    """Matches detected receiver/merchant name against expected name, supporting partial masking (*, #)."""
    if not detected or not expected:
        return False
    det_clean = _normalise(detected)
    exp_clean = _normalise(expected)
    if not exp_clean:
        return False

    if det_clean in exp_clean or exp_clean in det_clean:
        return True

    # Match unmasked words of length >= 3 (e.g. "***** PANDEY" matching "SUJAN PANDEY")
    det_tokens = re.findall(r"[A-Za-z]{3,}", det_clean)
    exp_tokens = set(re.findall(r"[A-Za-z]{3,}", exp_clean))
    if det_tokens:
        for t in det_tokens:
            if t in exp_tokens:
                return True
    return False


# ---------------------------------------------------------------------------
# Common Parsing Helpers
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

    # Prioritize amount from structured consecutive key-values if detected
    kv = _scan_consecutive_key_values(text)
    for amt_key in ["txn_amount", "amount", "total_amount"]:
        if amt_key in kv:
            clean_str = re.sub(r"[^\d.]", "", kv[amt_key].replace(",", ""))
            try:
                v = Decimal(clean_str)
                if v > 0 and v not in seen:
                    seen.add(v)
                    amounts.append(v)
            except InvalidOperation:
                pass

    for pattern in _AMOUNT_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).replace(",", "").strip()
            try:
                val = Decimal(raw)
                # Ignore standalone years (e.g. 2024..2030) and phone numbers (98/97 followed by 8 digits)
                if val in {Decimal(y) for y in range(2020, 2035)}:
                    continue
                if Decimal("9700000000") <= val <= Decimal("9899999999"):
                    continue
                if val > 0 and val not in seen:
                    seen.add(val)
                    amounts.append(val)
            except InvalidOperation:
                pass
    return amounts

def _extract_transaction_ids(text: str) -> List[str]:
    ids = []
    seen = set()

    # 1. Prioritize reference codes identified from label-value pairs
    kv = _scan_consecutive_key_values(text)
    for ref_k in ["reference_code", "reference_id", "transaction_id", "txn_id", "voucher_no", "trace_id"]:
        if ref_k in kv:
            cand = re.sub(r"[^A-Za-z0-9\-_]", "", kv[ref_k]).strip()
            cand_u = cand.upper()
            if cand and cand_u not in seen and cand_u not in _TXN_BLACKLIST and len(cand) >= 5:
                seen.add(cand_u)
                ids.append(cand)

    for pattern in _TXN_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            candidate = match.group(1).strip()
            key = candidate.upper()
            if key not in seen and key not in _TXN_BLACKLIST and len(key) >= 5:
                seen.add(key)
                ids.append(candidate)
    return ids

def _extract_dates(text: str) -> List[date]:
    dates = []
    seen = set()

    def _add_date(d: Optional[date]):
        if d and d not in seen:
            seen.add(d)
            dates.append(d)

    # OCR engines (such as RapidOCR/Tesseract) frequently concatenate words and digits
    # without whitespace (e.g. "Friday,9Oct2026at10:20AM" or "Transferof Rs150.0toDipakBhandari").
    # We construct a boundary-separated text stream in addition to raw text.
    spaced_text = re.sub(r"([a-zA-Z])(\d)", r"\1 \2", text)
    spaced_text = re.sub(r"(\d)([a-zA-Z])", r"\1 \2", spaced_text)
    spaced_text = re.sub(r"([,;:])([^\s\d])", r"\1 \2", spaced_text)
    combined_texts = [text, spaced_text] if spaced_text != text else [text]

    for src in combined_texts:
        # 1. Day Month Year: e.g. "06 OCT, 2026", "06 Oct 2026", "6 October 2026", "9Oct2026", "Friday,9Oct2026at10:20AM"
        for m in re.finditer(
            r"(?:^|\D)(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s,.-]*([A-Za-z]{3,9})[\s,.-]*(20\d{2})(?:\D|$)",
            src, re.IGNORECASE
        ):
            day_str, mon_str, year_str = m.group(1), m.group(2).lower(), m.group(3)
            month = _MONTH_MAP.get(mon_str) or _MONTH_MAP.get(mon_str[:3])
            if month:
                try:
                    _add_date(date(int(year_str), month, int(day_str)))
                except ValueError:
                    pass

        # 2. Month Day Year: e.g. "October 06, 2026", "Oct 6 2026", "Oct92026", "October 9th, 2026"
        for m in re.finditer(
            r"(?:^|\D)([A-Za-z]{3,9})[\s,.-]*(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s,.-]*(20\d{2})(?:\D|$)",
            src, re.IGNORECASE
        ):
            mon_str, day_str, year_str = m.group(1).lower(), m.group(2), m.group(3)
            month = _MONTH_MAP.get(mon_str) or _MONTH_MAP.get(mon_str[:3])
            if month:
                try:
                    _add_date(date(int(year_str), month, int(day_str)))
                except ValueError:
                    pass

        # 3. YYYY-Month-DD: e.g. "2026-Oct-06", "2026-October-6", "2026Oct9"
        for m in re.finditer(
            r"(?:^|\D)(20\d{2})[\s,.-]*([A-Za-z]{3,9})[\s,.-]*(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:\D|$)",
            src, re.IGNORECASE
        ):
            year_str, mon_str, day_str = m.group(1), m.group(2).lower(), m.group(3)
            month = _MONTH_MAP.get(mon_str) or _MONTH_MAP.get(mon_str[:3])
            if month:
                try:
                    _add_date(date(int(year_str), month, int(day_str)))
                except ValueError:
                    pass

        # 4. YYYY-MM-DD: e.g. "2026-10-06", "2026-10-6", "2026/10/06", "2026.10.06", "2026-10-09T13:04:41"
        for m in re.finditer(
            r"(?:^|\D)(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])(?:\D|$)",
            src
        ):
            try:
                _add_date(date(int(m.group(1)), int(m.group(2)), int(m.group(3))))
            except ValueError:
                pass

        # 5. DD-MM-YYYY: e.g. "06-10-2026", "6-10-2026", "06/10/2026", "6/10/2026", "06.10.2026"
        for m in re.finditer(
            r"(?:^|\D)(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})(?:\D|$)",
            src
        ):
            try:
                _add_date(date(int(m.group(3)), int(m.group(2)), int(m.group(1))))
            except ValueError:
                pass

        # 6. MM-DD-YYYY fallback for ambiguous digital slips
        for m in re.finditer(
            r"(?:^|\D)(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2})(?:\D|$)",
            src
        ):
            try:
                _add_date(date(int(m.group(3)), int(m.group(1)), int(m.group(2))))
            except ValueError:
                pass

    return dates

def _extract_times(text: str) -> List[str]:
    times = []
    seen = set()
    # 12-hour with AM/PM: e.g. "02:32 PM", "2:32 pm", "02:32:15 PM"
    for m in re.finditer(r"\b(0?[1-9]|1[0-2]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b", text):
        raw = m.group(0).strip()
        val = raw.upper()
        if val not in seen:
            seen.add(val)
            times.append(raw)

    # 24-hour: e.g. "14:32", "14:32:00"
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
            candidate = re.sub(r"[:\-.,]+$", "", candidate).strip()
            if len(candidate) >= 3 and not any(kw == candidate.lower() for kw in _SUCCESS_KEYWORDS):
                return candidate
    return None

def _extract_bank_name(text: str) -> Optional[str]:
    text_lower = text.lower()
    for bank_name, patterns in _NEPALESE_BANKS:
        for pat in patterns:
            if re.search(pat, text_lower):
                return bank_name
    return None

def _extract_sender_name(text: str) -> Optional[str]:
    patterns = [
        r"(?:sender(?:\s+name)?|from(?:\s+name)?|debited\s+from(?:\s+name)?|account\s+holder|payer(?:\s+name)?|remitter(?:\s+name)?)\s*[:\-]?\s*([A-Za-z\s.]+?)(?=\r?\n|$|\b\d{2}[/-]|\d{4})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"[:\-.,]+$", "", val).strip()
            if len(val) >= 3 and not any(kw == val.lower() for kw in _SUCCESS_KEYWORDS):
                return val
    return None

def _extract_account_numbers(text: str, label_patterns: List[str]) -> Optional[str]:
    for pat in label_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            account = m.group(1).strip()
            return account
    return None

def _detect_provider(text: str, payment_method=None) -> str:
    text_lower = text.lower()

    # 1. Exact textual markers
    if re.search(r"\bkhalti\b", text_lower):
        return "Khalti"
    if re.search(r"\besewa\b|\be-sewa\b", text_lower):
        return "eSewa"

    # Check for known Nepalese banks or ConnectIPS
    for bank_name, patterns in _NEPALESE_BANKS:
        if any(re.search(p, text_lower) for p in patterns):
            return "Bank"

    # 2. Layout signatures
    has_esewa_layout = any(re.search(sig, text_lower) for sig in _ESEWA_LAYOUT_SIGNATURES)
    if has_esewa_layout:
        return "eSewa"

    # 3. Contextual fallback using configured payment method
    if payment_method:
        method_type = getattr(payment_method, "method_type", "")
        if method_type == "ESEWA" and (has_esewa_layout or "payment successful" in text_lower):
            return "eSewa"
        elif method_type == "KHALTI":
            return "Khalti"
        elif method_type == "BANK":
            return "Bank"

    # Generic check for bank terminology
    if any(re.search(p, text_lower) for p in [r"\bbank\b", r"\bibanking\b", r"\bm-banking\b", r"\bbeneficiary\b", r"\bremitter\b"]):
        return "Bank"

    return "UNKNOWN"


# ---------------------------------------------------------------------------
# Provider-Specific Parsers
# ---------------------------------------------------------------------------

class BaseReceiptParser:
    """Base parser providing core text extraction utilities."""

    def parse(self, text: str, payment_method=None) -> PaymentVerificationData:
        status_code, _ = _check_payment_status(text)
        amounts = _extract_amounts(text)
        txns = _extract_transaction_ids(text)
        dates = _extract_dates(text)
        times = _extract_times(text)
        recipient = _extract_recipient(text)

        return PaymentVerificationData(
            provider="UNKNOWN",
            status=status_code,
            amount=amounts[0] if amounts else None,
            currency="NPR",
            merchant_name=recipient,
            transaction_id=txns[0] if txns else None,
            transaction_date=dates[0] if dates else None,
            transaction_time=times[0] if times else None,
            raw_ocr_text=text,
        )


class EsewaReceiptParser(BaseReceiptParser):
    """
    Parser for eSewa receipts (traditional slips and modern mobile app layout).
    Preserves full compatibility with working eSewa verifications.
    """

    def parse(self, text: str, payment_method=None) -> PaymentVerificationData:
        status_code, _ = _check_payment_status(text)
        amounts = _extract_amounts(text)
        txns = _extract_transaction_ids(text)
        dates = _extract_dates(text)
        times = _extract_times(text)
        recipient = _extract_recipient(text)

        # Phone extraction for eSewa receiver
        phone_match = re.search(r"(?:to|receiving\s+esewa\s+id|mobile)\s*[:\-]?\s*(98\d{8}|97\d{8})", text, re.IGNORECASE)
        merchant_phone = phone_match.group(1) if phone_match else None

        return PaymentVerificationData(
            provider="eSewa",
            status=status_code,
            amount=amounts[0] if amounts else None,
            currency="NPR",
            merchant_name=recipient,
            merchant_phone=merchant_phone,
            merchant_account=merchant_phone,
            transaction_id=txns[0] if txns else None,
            transaction_date=dates[0] if dates else None,
            transaction_time=times[0] if times else None,
            raw_ocr_text=text,
            ocr_confidence=0.98 if (amounts and txns) else 0.85,
        )


class KhaltiReceiptParser(BaseReceiptParser):
    """
    Parser for Khalti digital wallet screenshots.
    Robust against different Android/iOS layouts, font variations, and crops.
    """

    def parse(self, text: str, payment_method=None) -> PaymentVerificationData:
        status_code, _ = _check_payment_status(text)
        amounts = _extract_amounts(text)
        txns = _extract_transaction_ids(text)
        dates = _extract_dates(text)
        times = _extract_times(text)
        recipient = _extract_recipient(text)

        # Khalti receiver mobile / ID
        phone_match = re.search(
            r"(?:mobile|khalti\s+id|phone|receiver\s+mobile|receiver\s+phone)\s*[:\-]?\s*(98\d{8}|97\d{8})",
            text, re.IGNORECASE
        )
        receiver_phone = phone_match.group(1) if phone_match else None

        return PaymentVerificationData(
            provider="Khalti",
            status=status_code,
            amount=amounts[0] if amounts else None,
            currency="NPR",
            merchant_name=recipient,
            merchant_phone=receiver_phone,
            merchant_account=receiver_phone,
            transaction_id=txns[0] if txns else None,
            transaction_date=dates[0] if dates else None,
            transaction_time=times[0] if times else None,
            raw_ocr_text=text,
            ocr_confidence=0.97 if (amounts and txns) else 0.85,
        )


class BankReceiptParser(BaseReceiptParser):
    """
    Provider-agnostic Nepalese Bank & Interbank Transfer parser.
    Supports Nabil, Global IME, NIC Asia, Nepal Bank, Himalayan, Siddhartha, Sanima,
    Prabhu, Kumari, Everest, Machhapuchchhre, Laxmi Sunrise, Citizens, ADBL, RBB,
    Nepal SBI, Standard Chartered, ConnectIPS, Fonepay Interbank, and generic bank transfer slips.
    """

    def parse(self, text: str, payment_method=None) -> PaymentVerificationData:
        status_code, _ = _check_payment_status(text)
        amounts = _extract_amounts(text)
        txns = _extract_transaction_ids(text)
        dates = _extract_dates(text)
        times = _extract_times(text)
        kv = _scan_consecutive_key_values(text)

        # 1. Structured Amounts & Charges
        amount = None
        service_charge = None
        total_amount = None

        if kv.get("txn_amount"):
            try:
                amount = Decimal(re.sub(r"[^\d.]", "", kv["txn_amount"].replace(",", "")))
            except InvalidOperation:
                pass
        if kv.get("charge"):
            try:
                service_charge = Decimal(re.sub(r"[^\d.]", "", kv["charge"].replace(",", "")))
            except InvalidOperation:
                pass
        if kv.get("total_amount"):
            try:
                total_amount = Decimal(re.sub(r"[^\d.]", "", kv["total_amount"].replace(",", "")))
            except InvalidOperation:
                pass

        # Fallback to general amount extraction
        if amount is None and amounts:
            amount = amounts[0]

        # 2. Transaction / Reference Code
        ref_id = kv.get("reference_code") or (txns[0] if txns else None)

        # 3. Interbank & Attribute Parsing (e.g. KMBLNPKA:2690351219000001)
        receiver_bank = None
        sender_bank = None
        transfer_mode = kv.get("service_name") or ("Fonepay Interbank" if "fonepay" in text.lower() else None)

        attribute = kv.get("payment_attribute")
        if not attribute:
            attr_match = re.search(r"\b([A-Za-z0-9]{4,12}:[0-9A-Za-z#*]{6,30})\b", text)
            if attr_match:
                attribute = attr_match.group(1).strip()

        if attribute and ":" in attribute:
            swift_prefix, attr_account = attribute.split(":", 1)
            swift_clean = swift_prefix.upper().strip()
            if swift_clean in _SWIFT_BANK_CODES:
                receiver_bank = _SWIFT_BANK_CODES[swift_clean]

        # 4. Paragraph Pattern Parsing (e.g. "payment of NPR 150.00 with Charge 10.00 from A/C 009###392 for KMBLNPKA:...")
        para_match = re.search(
            r"payment\s+of\s+(?:npr|rs\.?)?\s*([\d,.]+)\s+with\s+charge\s+([\d,.]+)\s+from\s+a/?c\s+([0-9#*A-Za-z]+)\s+for\s+([A-Za-z0-9:]+)",
            text, re.IGNORECASE
        )
        if para_match:
            try:
                if amount is None:
                    amount = Decimal(para_match.group(1).replace(",", ""))
                if service_charge is None:
                    service_charge = Decimal(para_match.group(2).replace(",", ""))
            except InvalidOperation:
                pass
            para_sender_acct = para_match.group(3)
            para_for = para_match.group(4)
            if ":" in para_for and not receiver_bank:
                sw = para_for.split(":", 1)[0].upper()
                if sw in _SWIFT_BANK_CODES:
                    receiver_bank = _SWIFT_BANK_CODES[sw]

        # 5. Bank Identification (Sender vs Receiver)
        detected_bank = _extract_bank_name(text)
        if not receiver_bank:
            receiver_bank = detected_bank

        # Check for Siddhartha Bank (account prefix 009 or explicit text)
        sender_acct_raw = kv.get("sender_account") or _extract_account_numbers(text, [
            r"(?:sender\s+a/?c|debit\s+a/?c|debited\s+from\s+a/?c|from\s+a/?c|from\s+account)\s*[:\-]?\s*([A-Za-z0-9\*#X\-]{4,30})",
        ])
        if (sender_acct_raw and sender_acct_raw.startswith("009")) or ("siddhartha" in text.lower()):
            sender_bank = "Siddhartha Bank Limited"

        # If receiver bank is still not found and payment method has bank name, adopt it
        if not receiver_bank and payment_method and getattr(payment_method, "bank_name", ""):
            receiver_bank = getattr(payment_method, "bank_name", "")

        # 6. Sender & Receiver Names/Accounts
        sender_name = kv.get("sender_name") or _extract_sender_name(text)
        sender_acct = sender_acct_raw

        recipient_name = kv.get("receiver_name") or _extract_recipient(text)
        receiver_acct = kv.get("receiver_account") or _extract_account_numbers(text, [
            r"(?:beneficiary\s+a/?c|credit\s+a/?c|credited\s+to\s+a/?c|to\s+a/?c|to\s+account|a/?c\s+no|account\s+number)\s*[:\-]?\s*([A-Za-z0-9\*#X\-]{4,30})",
        ])

        # If attribute provides full account while receiver_acct is masked, keep full account
        if attribute and ":" in attribute:
            attr_acct = attribute.split(":", 1)[1]
            if attr_acct and not any(ch in attr_acct for ch in ["#", "*", "X"]):
                receiver_acct = attr_acct

        return PaymentVerificationData(
            provider="Bank",
            status=status_code,
            amount=amount,
            currency="NPR",
            merchant_name=recipient_name,
            merchant_account=receiver_acct,
            bank_name=receiver_bank or detected_bank,
            bank_account=receiver_acct,
            sender_name=sender_name,
            sender_account=sender_acct,
            sender_bank=sender_bank,
            receiver_bank=receiver_bank,
            transfer_mode=transfer_mode,
            service_charge=service_charge,
            total_amount=total_amount,
            transaction_id=ref_id,
            reference_id=txns[1] if len(txns) > 1 else ref_id,
            transaction_date=dates[0] if dates else None,
            transaction_time=times[0] if times else None,
            raw_ocr_text=text,
            ocr_confidence=0.96 if (amount and ref_id and (receiver_bank or detected_bank)) else 0.80,
        )


class GenericReceiptParser(BaseReceiptParser):
    """
    Fallback parser for generic or unrecognized Nepalese bank receipts and vouchers.
    Extracts transaction reference, amounts, dates, and receiver information
    without requiring a predetermined bank template.
    """

    def parse(self, text: str, payment_method=None) -> PaymentVerificationData:
        status_code, _ = _check_payment_status(text)
        amounts = _extract_amounts(text)
        txns = _extract_transaction_ids(text)
        dates = _extract_dates(text)
        times = _extract_times(text)
        recipient = _extract_recipient(text)
        bank_name = _extract_bank_name(text)
        kv = _scan_consecutive_key_values(text)

        ref_id = kv.get("reference_code") or (txns[0] if txns else None)
        amt = None
        if kv.get("txn_amount"):
            try:
                amt = Decimal(re.sub(r"[^\d.]", "", kv["txn_amount"].replace(",", "")))
            except InvalidOperation:
                pass
        if amt is None and amounts:
            amt = amounts[0]

        return PaymentVerificationData(
            provider="Generic",
            status=status_code,
            amount=amt,
            currency="NPR",
            merchant_name=recipient or kv.get("receiver_name"),
            merchant_account=kv.get("receiver_account"),
            bank_name=bank_name,
            bank_account=kv.get("receiver_account"),
            sender_name=kv.get("sender_name") or _extract_sender_name(text),
            sender_account=kv.get("sender_account"),
            transaction_id=ref_id,
            reference_id=txns[1] if len(txns) > 1 else ref_id,
            transaction_date=dates[0] if dates else None,
            transaction_time=times[0] if times else None,
            raw_ocr_text=text,
            ocr_confidence=0.75 if (amt and ref_id) else 0.50,
        )


def _get_parser_for_provider(provider: str) -> BaseReceiptParser:
    if provider == "eSewa":
        return EsewaReceiptParser()
    elif provider == "Khalti":
        return KhaltiReceiptParser()
    elif provider == "Bank":
        return BankReceiptParser()
    return GenericReceiptParser()


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

def get_canonical_business_timezone():
    """
    Returns the canonical business timezone for LoksewaAI (Asia/Kathmandu).
    Respects Django settings.TIME_ZONE and settings.BUSINESS_TIME_ZONE.
    """
    from django.conf import settings
    try:
        from zoneinfo import ZoneInfo
    except ImportError:
        from backports.zoneinfo import ZoneInfo  # type: ignore

    tz_name = getattr(settings, 'BUSINESS_TIME_ZONE', None) or getattr(settings, 'TIME_ZONE', 'Asia/Kathmandu')
    if not tz_name or tz_name == 'UTC':
        tz_name = 'Asia/Kathmandu'

    try:
        return ZoneInfo(tz_name)
    except Exception:
        import pytz
        return pytz.timezone(tz_name)


def get_expected_payment_date(payment) -> date:
    """
    Returns the expected calendar date for payment verification using the platform's
    configured business timezone (Asia/Kathmandu, UTC+5:45).
    Avoids timezone-related off-by-one-day errors between UTC and Nepal around midnight.
    """
    from django.utils import timezone
    biz_tz = get_canonical_business_timezone()

    submitted_dt = getattr(payment, 'submitted_at', None) or getattr(payment, 'created_at', None)
    if not submitted_dt:
        submitted_dt = timezone.now()

    if timezone.is_naive(submitted_dt):
        submitted_dt = timezone.make_aware(submitted_dt, biz_tz)

    return timezone.localtime(submitted_dt, biz_tz).date()


def _check_date(detected_dates: List[date], expected_date: date) -> Tuple[str, Optional[str]]:
    """
    Compares the receipt transaction date with the expected payment submission date.
    Rules:
    - Compares calendar dates in the canonical business timezone (Asia/Kathmandu).
    - Receipt time does NOT have to match submission time.
    - If expected_date is in detected_dates, returns ('PASS', str(expected_date)).
    - If detected_dates contains future dates relative to expected_date, returns ('FAIL', ...).
    - If detected_dates contains only different calendar dates, returns ('FAIL', ...).
    - If no dates detected or unreadable, returns ('UNKNOWN', None).
    """
    if not detected_dates:
        return "UNKNOWN", None

    # Check for same-day calendar date match
    if expected_date in detected_dates:
        return "PASS", str(expected_date)

    future_dates = [d for d in detected_dates if d > expected_date]
    if future_dates:
        return "FAIL", f"{future_dates[0]} (future date)"

    too_old_dates = [d for d in detected_dates if (d - expected_date).days < -60]
    if too_old_dates:
        return "FAIL", f"{too_old_dates[0]} (older than 60 days)"

    # Different calendar dates (past dates or other mismatched days)
    closest = min(detected_dates, key=lambda x: abs((x - expected_date).days))
    return "FAIL", f"{closest} (expected {expected_date})"

def _check_receiver_match(
    full_text: str,
    detected_recipient: Optional[str],
    provider: str,
    payment_method,
    detected_bank_name: Optional[str] = None,
    detected_receiver_account: Optional[str] = None,
    detected_receiver_bank: Optional[str] = None,
) -> Tuple[str, Optional[str]]:
    if not payment_method:
        return "UNKNOWN", None

    text_norm = _normalise(full_text)
    merchant_name = getattr(payment_method, "account_name", "")
    merchant_phone = getattr(payment_method, "account_number", "")
    cfg_bank_name = getattr(payment_method, "bank_name", "")

    # 1. Phone / Full Account number match
    if merchant_phone:
        phone_clean = re.sub(r"[^0-9]", "", merchant_phone)
        if len(phone_clean) >= 6 and phone_clean in re.sub(r"[^0-9]", "", full_text):
            return "PASS", merchant_phone

        # Robust account match (handles prefix, suffix, and mask characters like 269###19000001)
        if detected_receiver_account:
            if _accounts_match(detected_receiver_account, merchant_phone):
                return "PASS", merchant_phone

    # 2. Receiving Bank Match (cross-bank transfer verification)
    target_bank = detected_receiver_bank or detected_bank_name
    if target_bank and cfg_bank_name:
        det_bank_clean = _normalise(target_bank)
        cfg_bank_clean = _normalise(cfg_bank_name)
        if det_bank_clean in cfg_bank_clean or cfg_bank_clean in det_bank_clean:
            pass  # Positive confirmation of destination bank

    # 3. Account / Merchant name match
    if merchant_name:
        name_clean = _normalise(merchant_name)
        # Direct substring in full OCR text
        if len(name_clean) >= 3 and name_clean in text_norm:
            return "PASS", merchant_name

        # Match against extracted recipient (supporting masked names like ***** PANDEY)
        if detected_recipient:
            if _names_match(detected_recipient, merchant_name):
                return "PASS", detected_recipient

    # If recipient was explicitly extracted without masks but contradicts configured receiver
    if detected_recipient and merchant_name:
        if not _names_match(detected_recipient, merchant_name):
            # Only fail if it's clearly a different name without mask symbols
            if not any(ch in detected_recipient for ch in ["*", "#", "X"]):
                return "FAIL", detected_recipient

    return "UNKNOWN", None

# ---------------------------------------------------------------------------
# Duplicate Checks
# ---------------------------------------------------------------------------

def _is_resubmission_match(payment, other_payment) -> bool:
    """
    Determines if `other_payment` is a prior unapproved attempt for the same student
    and plan, meaning `payment` is a legitimate resubmission of that attempt.

    Rules:
    - Never allow cross-student reuse (prevent fraudulent reuse of another user's receipt).
    - Never allow cross-plan reuse (prevent purchasing package B using receipt from package A).
    - Never allow reuse if prior payment was already APPROVED or subscription is active
      (prevent claiming duplicate course access or double credit).
    - Allow ONLY when the prior payment is for the SAME student, SAME plan, and was NOT approved
      (e.g., REJECTED, PENDING superseded, or VERIFICATION_FAILED).
    """
    if not payment or not other_payment:
        return False

    # 1. Must be exact same student
    if getattr(other_payment, "student_id", None) != getattr(payment, "student_id", None):
        return False

    # 2. Must be exact same plan
    if getattr(other_payment, "plan_id", None) != getattr(payment, "plan_id", None):
        return False

    # 3. If prior payment was already approved or has an active subscription, duplicate reuse is forbidden!
    if other_payment.status == "APPROVED" or getattr(other_payment, "subscription_id", None) is not None:
        return False

    # 4. Same student, same plan, and prior payment was NOT approved -> legitimate resubmission!
    return True


def _check_duplicates(payment, image_hash: str, transaction_ids: List[str]) -> Tuple[str, List[str], bool]:
    from .models import SubscriptionPayment

    warnings = []
    duplicate = "PASS"
    resubmission_detected = False

    for txn_id in transaction_ids:
        if txn_id and txn_id.strip():
            matching_txns = SubscriptionPayment.objects.exclude(id=payment.id).filter(
                transaction_id__iexact=txn_id.strip(),
            )
            for dup_txn in matching_txns:
                if _is_resubmission_match(payment, dup_txn):
                    resubmission_detected = True
                    logger.info(
                        "Transaction ID '%s' in Payment #%s matches unapproved Payment #%s for the same student and plan — allowed as resubmission.",
                        txn_id, payment.id, dup_txn.id,
                    )
                else:
                    duplicate = "FAIL"
                    warnings.append(f"Transaction ID '{txn_id}' already used in Payment #{dup_txn.id}.")

    if image_hash:
        matching_imgs = SubscriptionPayment.objects.exclude(id=payment.id).filter(
            verification_result__image_hash=image_hash,
        )
        for dup_img in matching_imgs:
            if _is_resubmission_match(payment, dup_img):
                resubmission_detected = True
                logger.info(
                    "Receipt image in Payment #%s matches unapproved Payment #%s for the same student and plan — allowed as resubmission.",
                    payment.id, dup_img.id,
                )
            else:
                duplicate = "FAIL"
                warnings.append(f"Receipt image identical to Payment #{dup_img.id}.")

    return duplicate, warnings, resubmission_detected


# ---------------------------------------------------------------------------
# Common Payment Verification Engine
# ---------------------------------------------------------------------------

class CommonPaymentVerificationEngine:
    """
    Common Verification Engine across all providers (eSewa, Khalti, Bank).
    Validates normalized PaymentVerificationData against authoritative package price,
    backend payment method configuration, and global duplicate rules.
    """

    def verify(
        self,
        payment,
        vdata: PaymentVerificationData,
        image_hash: str,
        ocr_engine_name: str,
        detected_amounts: List[Decimal],
        detected_txns: List[str],
        detected_dates: List[date],
        detected_times: List[str],
    ) -> Dict[str, Any]:
        # 1. Payment Completion Status
        status_result = vdata.status
        if status_result == "FAIL":
            return self._build_result(
                outcome="REJECTED",
                vdata=vdata,
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                status_result="FAIL",
                amount_status="FAIL",
                txn_status="FAIL",
                receiver_status="FAIL",
                date_status="FAIL",
                failure_reasons=["Receipt indicates payment failed or was declined."],
                notes="Payment sent for Admin approval: Receipt indicates payment failed or was declined.",
            )

        # 2. Authoritative Amount Check
        # Authoritative amount comes from plan price
        expected_amount = Decimal(str(payment.plan.price)) if getattr(payment, "plan", None) else Decimal(str(payment.amount))
        amount_status, det_amount = _check_amount(detected_amounts, expected_amount)

        # 3. Transaction ID Check
        txn_status, det_txn = _check_txn(vdata.raw_ocr_text, detected_txns, payment.transaction_id)

        # 4. Transaction Date Check (Calendar date in Asia/Kathmandu)
        expected_date = get_expected_payment_date(payment)
        date_status, det_date = _check_date(detected_dates, expected_date)

        # 5. Receiver / Beneficiary Check
        payment_method = getattr(payment, "payment_method", None)
        receiver_status, det_receiver = _check_receiver_match(
            vdata.raw_ocr_text,
            vdata.merchant_name,
            vdata.provider,
            payment_method,
            detected_bank_name=vdata.bank_name,
            detected_receiver_account=vdata.bank_account,
            detected_receiver_bank=vdata.receiver_bank,
        )

        # 6. Global Duplicate Check
        all_candidate_txns = list({payment.transaction_id} | set(detected_txns))
        duplicate_status, dup_warnings, is_resubmission = _check_duplicates(payment, image_hash, all_candidate_txns)

        provider_status = "PASS" if vdata.provider != "UNKNOWN" else "UNKNOWN"

        # 7. Verification Decision Rules
        # Auto-verification is allowed when all configured required checks pass:
        # - Status is PASS
        # - Exact amount matches authoritative package price
        # - Transaction ID verified
        # - Date is valid and current
        # - Receiver/merchant matches configured payment method
        # - Provider identified
        # - Duplicate check passed
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
                failure_reasons.append(f"Amount mismatch: expected NPR {expected_amount}, detected NPR {det_amount} on receipt.")
            elif amount_status == "UNKNOWN":
                failure_reasons.append(f"Expected amount NPR {expected_amount} not detected on receipt.")
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

        det_date_str = str(det_date).split()[0] if det_date else (str(detected_dates[0]) if detected_dates else None)
        det_time_str = detected_times[0] if detected_times else None

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
            "detected_recipient": vdata.merchant_name or det_receiver,
            "detected_status": "Successful" if status_result == "PASS" else ("Failed" if status_result == "FAIL" else None),
            "detected_provider": vdata.provider if vdata.provider != "UNKNOWN" else None,
            "detected_bank_name": vdata.bank_name,
            "detected_sender_name": vdata.sender_name,
            "detected_sender_account": vdata.sender_account,
            "detected_recipient_account": vdata.bank_account or vdata.merchant_account,
            "detected_sender_bank": vdata.sender_bank,
            "detected_receiver_bank": vdata.receiver_bank,
            "detected_transfer_mode": vdata.transfer_mode,
            "detected_service_charge": str(vdata.service_charge) if vdata.service_charge is not None else None,
            "detected_total_amount": str(vdata.total_amount) if vdata.total_amount is not None else None,
            "is_duplicate_transaction": duplicate_status == "FAIL",
            "is_duplicate_image": duplicate_status == "FAIL",
            "is_resubmission": is_resubmission or bool((getattr(payment, "verification_result", None) or {}).get("is_resubmission")),
            "failure_reasons": failure_reasons,
            "notes": notes,
            "extracted_text_preview": vdata.raw_ocr_text[:800],
            "verification_data": vdata.to_dict(),
        }

    def _build_result(self, outcome, vdata, image_hash, ocr_engine, status_result, amount_status, txn_status, receiver_status, date_status, failure_reasons, notes):
        return {
            "outcome": outcome,
            "ocr_engine": ocr_engine,
            "image_hash": image_hash,
            "receipt_legible": True,
            "payment_completed": status_result == "PASS",
            "amount_matches": amount_status == "PASS",
            "transaction_id_matches": txn_status == "PASS",
            "receiver_matches": receiver_status == "PASS",
            "date_matches": date_status == "PASS",
            "detected_amount": str(vdata.amount) if vdata.amount else None,
            "detected_transaction_id": vdata.transaction_id,
            "detected_date": str(vdata.transaction_date) if vdata.transaction_date else None,
            "detected_time": vdata.transaction_time,
            "detected_recipient": vdata.merchant_name,
            "detected_status": "Failed" if status_result == "FAIL" else None,
            "detected_provider": vdata.provider if vdata.provider != "UNKNOWN" else None,
            "detected_bank_name": vdata.bank_name,
            "detected_sender_name": vdata.sender_name,
            "detected_sender_account": vdata.sender_account,
            "detected_recipient_account": vdata.bank_account or vdata.merchant_account,
            "detected_sender_bank": vdata.sender_bank,
            "detected_receiver_bank": vdata.receiver_bank,
            "detected_transfer_mode": vdata.transfer_mode,
            "detected_service_charge": str(vdata.service_charge) if vdata.service_charge is not None else None,
            "detected_total_amount": str(vdata.total_amount) if vdata.total_amount is not None else None,
            "is_duplicate_transaction": False,
            "is_duplicate_image": False,
            "is_resubmission": False,
            "failure_reasons": failure_reasons,
            "notes": notes,
            "extracted_text_preview": vdata.raw_ocr_text[:800],
            "verification_data": vdata.to_dict(),
        }


# ---------------------------------------------------------------------------
# Main Verification Service
# ---------------------------------------------------------------------------

class PaymentProofVerificationService:
    """
    Main verification entrypoint:
    Reads screenshot -> Validates image quality -> Runs OCR ->
    Detects Provider -> Parses through Provider-specific Parser ->
    Verifies with Common Verification Engine.
    """

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
        duplicate_status, dup_warnings, is_init_resub = _check_duplicates(
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

        # Document / Screenshot validation & extraction (PDF or Image)
        file_name = getattr(payment.screenshot, "name", "")
        valid_doc, doc_err, image, digital_text, doc_type = _extract_document_or_image_content(
            image_bytes, filename=file_name
        )
        if not valid_doc:
            return self._fallback_result(
                doc_err,
                outcome="NEEDS_ADMIN_REVIEW",
                image_hash=image_hash,
                ocr_engine="format_error",
                failure_reasons=[doc_err]
            )

        if digital_text and len(digital_text.strip()) >= 30:
            raw_text = digital_text
            ocr_engine_name = "digital_pdf"
        elif image is not None:
            raw_text, ocr_engine_name = _run_ocr(image)
        else:
            raw_text = ""
            ocr_engine_name = "none"

        if ocr_engine_name == "none" or len(raw_text.strip()) < 15:
            return self._fallback_result(
                "OCR could not extract legible text from receipt screenshot.",
                outcome="NEEDS_ADMIN_REVIEW",
                image_hash=image_hash,
                ocr_engine=ocr_engine_name,
                failure_reasons=["Receipt proof is blurry or contains illegible text."]
            )

        # Provider detection
        payment_method = getattr(payment, "payment_method", None)
        provider = _detect_provider(raw_text, payment_method)

        # Provider-specific parsing into normalized PaymentVerificationData
        parser = _get_parser_for_provider(provider)
        vdata = parser.parse(raw_text, payment_method)

        # Field collections for verification engine
        detected_amounts = _extract_amounts(raw_text)
        detected_txns = _extract_transaction_ids(raw_text)
        detected_dates = _extract_dates(raw_text)
        detected_times = _extract_times(raw_text)

        # Run through Common Payment Verification Engine
        engine = CommonPaymentVerificationEngine()
        return engine.verify(
            payment=payment,
            vdata=vdata,
            image_hash=image_hash,
            ocr_engine_name=ocr_engine_name,
            detected_amounts=detected_amounts,
            detected_txns=detected_txns,
            detected_dates=detected_dates,
            detected_times=detected_times,
        )

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
            "detected_bank_name": None,
            "detected_sender_name": None,
            "detected_sender_account": None,
            "detected_recipient_account": None,
            "is_duplicate_transaction": is_duplicate_transaction,
            "is_duplicate_image": is_duplicate_image,
            "failure_reasons": reasons,
            "notes": notes if "Payment sent for Admin approval" in notes else f"Payment sent for Admin approval: {notes}",
            "extracted_text_preview": "",
            "verification_data": None,
        }
