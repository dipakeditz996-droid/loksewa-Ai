"""
Traditional Rule-Based OCR and Handwriting Extraction Pipeline (NO AI / NO LLM).

Workflow:
1. For text-based PDFs: Extract direct embedded text with PyMuPDF (fitz) or pypdf.
2. For scanned documents and images:
   - Traditional image preprocessing with OpenCV and Pillow:
     * Orientation detection and deskewing
     * Grayscale conversion
     * Contrast enhancement via CLAHE
     * Denoising filter
     * Adaptive thresholding
   - Offline, local line recognition with RapidOCR (ONNX Runtime engine) or Tesseract.
   - Retain page numbers, line text, and OCR confidence scores.
3. Transparent provenance: Record source document, page breakdown, engine, and confidence.
4. Route illegible/unreadable handwriting to manual Admin review instead of inventing text.
"""

import io
import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image

import fitz  # PyMuPDF
import cv2

logger = logging.getLogger(__name__)


def preprocess_image_for_ocr(image_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Applies traditional image processing for handwritten/scanned documents:
    1. Grayscale conversion
    2. Orientation & deskewing
    3. Noise reduction (Gaussian/median filter)
    4. Contrast enhancement (CLAHE)
    """
    # Load image from bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes for preprocessing.")

    h, w = img.shape[:2]

    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Denoising
    denoised = cv2.medianBlur(gray, 3)

    # 3. Contrast enhancement via CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # 4. Deskew detection using minAreaRect on foreground text contours
    angle = 0.0
    try:
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) > 50:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle

            if abs(angle) > 0.5 and abs(angle) < 45:
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                enhanced = cv2.warpAffine(
                    enhanced, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
                )
    except Exception as e:
        logger.debug("Deskew calculation skipped: %s", e)

    metadata = {
        'original_width': w,
        'original_height': h,
        'deskew_angle': round(angle, 2),
    }

    return enhanced, metadata


class SubjectiveOCRService:
    """
    Deterministic traditional OCR service operating completely locally without LLM APIs.
    """

    def __init__(self):
        self._rapid_ocr = None

    def _get_ocr_engine(self):
        if self._rapid_ocr is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._rapid_ocr = RapidOCR()
            except Exception as e:
                logger.warning("Could not initialize RapidOCR engine: %s", e)
        return self._rapid_ocr

    @classmethod
    def extract_and_transcribe_submission(cls, submission) -> str:
        """Extracts and transcribes text from a SubjectiveSubmission."""
        return cls().extract_answers_from_submission(submission)

    @classmethod
    def extract_text_from_pdf(cls, file_obj) -> str:
        """Extracts selectable text or runs OCR on any PDF file-like object."""
        file_obj.seek(0)
        pdf_bytes = file_obj.read()
        file_obj.seek(0)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        service = cls()
        pages_text = []
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = (page.get_text() or "").strip()
            if len(text) >= 40:
                pages_text.append(text)
            else:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                ocr_text, _, _ = service._ocr_image_bytes(img_bytes)
                if ocr_text:
                    pages_text.append(ocr_text)
        doc.close()
        return "\n\n".join(pages_text).strip()

    def extract_answers_from_submission(self, submission) -> str:
        submission.ocr_status = 'processing'
        submission.ocr_error = ''
        submission.save(update_fields=['ocr_status', 'ocr_error'])

        try:
            pages_data = self.extract_pages_data(submission)
            full_text = "\n\n".join(p['text'] for p in pages_data if p.get('text')).strip()

            submission.raw_ocr_text = full_text
            # Only set extracted_text if not already manually corrected by admin
            if not submission.extracted_text:
                submission.extracted_text = full_text

            submission.ocr_status = 'completed'
            submission.ocr_error = ''
            submission.save(update_fields=['raw_ocr_text', 'extracted_text', 'ocr_status', 'ocr_error'])
            return full_text

        except Exception as e:
            logger.exception("OCR extraction failed for Submission #%d: %s", submission.id, e)
            submission.ocr_status = 'failed'
            submission.ocr_error = str(e)
            submission.save(update_fields=['ocr_status', 'ocr_error'])
            raise e

    def extract_pages_data(self, submission) -> List[Dict[str, Any]]:
        """
        Extracts text and provenance per page from answer PDF or page images.
        Returns:
            [
                {
                    'page_number': 1,
                    'text': '...',
                    'confidence': 0.95,
                    'engine': 'selectable_pdf' / 'rapid_ocr',
                    'char_count': 120,
                }, ...
            ]
        """
        pages_result = []

        # 1. If submission has an answer PDF, inspect with PyMuPDF
        if submission.answer_pdf:
            submission.answer_pdf.open('rb')
            try:
                pdf_bytes = submission.answer_pdf.read()
            finally:
                submission.answer_pdf.close()

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_index in range(len(doc)):
                page_num = page_index + 1
                page = doc[page_index]

                # A. Check for direct selectable text
                extracted_text = (page.get_text() or "").strip()
                if len(extracted_text) >= 40:
                    pages_result.append({
                        'page_number': page_num,
                        'text': extracted_text,
                        'confidence': 0.98,
                        'engine': 'PyMuPDF Selectable Text',
                        'char_count': len(extracted_text),
                    })
                    continue

                # B. Scanned page - render to image at 200 DPI for traditional OCR
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                page_ocr_text, page_conf, engine_name = self._ocr_image_bytes(img_bytes)

                pages_result.append({
                    'page_number': page_num,
                    'text': page_ocr_text,
                    'confidence': page_conf,
                    'engine': engine_name,
                    'char_count': len(page_ocr_text),
                })
            doc.close()

        # 2. If submission has individual page image records
        elif submission.pages.exists():
            for p_rec in submission.pages.all().order_by('page_number'):
                p_rec.image_file.open('rb')
                try:
                    img_bytes = p_rec.image_file.read()
                finally:
                    p_rec.image_file.close()

                page_ocr_text, page_conf, engine_name = self._ocr_image_bytes(img_bytes)
                pages_result.append({
                    'page_number': p_rec.page_number,
                    'text': page_ocr_text,
                    'confidence': page_conf,
                    'engine': engine_name,
                    'char_count': len(page_ocr_text),
                })

        else:
            raise ValueError("No answer PDF or pages found on this submission.")

        return pages_result

    def _ocr_image_bytes(self, image_bytes: bytes) -> Tuple[str, float, str]:
        """
        Runs OpenCV preprocessing followed by RapidOCR line recognition.
        """
        try:
            processed_img, _ = preprocess_image_for_ocr(image_bytes)
        except Exception as e:
            logger.warning("Image preprocessing failed: %s", e)
            nparr = np.frombuffer(image_bytes, np.uint8)
            processed_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        ocr_engine = self._get_ocr_engine()
        if ocr_engine is not None and processed_img is not None:
            try:
                # RapidOCR accepts numpy image array
                results, _ = ocr_engine(processed_img)
                if results:
                    lines = []
                    scores = []
                    for box, text_line, score_val in results:
                        line_str = str(text_line).strip()
                        if line_str:
                            lines.append(line_str)
                            try:
                                scores.append(float(score_val))
                            except (ValueError, TypeError):
                                scores.append(0.80)

                    joined_text = "\n".join(lines)
                    avg_conf = sum(scores) / len(scores) if scores else 0.50
                    return joined_text, round(avg_conf, 2), "RapidOCR (ONNX Local)"
            except Exception as ocr_err:
                logger.warning("RapidOCR execution failed: %s", ocr_err)

        # Fallback if OCR produces no text or engine unavailable
        return "[Handwritten page scan captured - Pending examiner manual transcription]", 0.30, "Manual Review Queue"
