"""
Subjective Examination OCR / Handwriting Extraction Service.

Provides on-demand AI transcription of student-submitted handwritten answer sheets.
Uses Google Gemini multimodal models (gemini-2.5-flash) to extract handwritten
Nepali and English text. Falls back gracefully to mock extraction when no API key
is configured.
"""

import os
import logging
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')


class SubjectiveOCRService:
    def __init__(self):
        self.is_mock = not bool(GEMINI_API_KEY)
        if not self.is_mock:
            self.client = genai.Client(api_key=GEMINI_API_KEY)
            self.model_name = 'gemini-2.5-flash'
        else:
            self.client = None
            self.model_name = 'mock'

    @classmethod
    def extract_and_transcribe_submission(cls, submission) -> str:
        """Convenience classmethod to extract and transcribe answers from a submission."""
        return cls().extract_answers_from_submission(submission)

    def extract_answers_from_submission(self, submission) -> str:
        """
        Extracts handwritten answers from a SubjectiveSubmission.
        Saves raw_ocr_text and sets extracted_text.
        """
        submission.ocr_status = 'processing'
        submission.ocr_error = ''
        submission.save(update_fields=['ocr_status', 'ocr_error'])

        try:
            if self.is_mock:
                extracted_text = self._mock_extraction(submission)
            else:
                extracted_text = self._gemini_multimodal_extraction(submission)

            submission.raw_ocr_text = extracted_text
            # Only set extracted_text if not already customized by admin
            if not submission.extracted_text:
                submission.extracted_text = extracted_text
            submission.ocr_status = 'completed'
            submission.ocr_error = ''
            submission.save(update_fields=['raw_ocr_text', 'extracted_text', 'ocr_status', 'ocr_error'])
            return extracted_text

        except Exception as e:
            logger.exception(f"OCR extraction failed for Submission #{submission.id}: {e}")
            submission.ocr_status = 'failed'
            submission.ocr_error = str(e)
            submission.save(update_fields=['ocr_status', 'ocr_error'])
            raise e

    def _gemini_multimodal_extraction(self, submission) -> str:
        """Calls Gemini API with the submitted answer PDF or page images."""
        prompt = (
            "You are an expert handwriting transcription assistant for Loksewa (Public Service Commission) "
            "subjective examinations. Carefully transcribe all handwritten answers from the provided "
            "answer sheet pages into clean, readable text.\n\n"
            "Requirements:\n"
            "1. Accurately preserve question numbers (e.g., Question 1, Q.No. 2).\n"
            "2. Maintain the student's original wording, paragraph structures, headings, bullet points, "
            "and Nepali (Devanagari) or English script.\n"
            "3. Do not grade, critique, or correct grammatical errors; only transcribe what the student wrote.\n"
            "4. Organize the text with clear headings for each page and question."
        )

        parts = [types.Part.from_text(text=prompt)]

        # Read answer PDF bytes
        if submission.answer_pdf:
            submission.answer_pdf.open('rb')
            try:
                pdf_bytes = submission.answer_pdf.read()
                parts.append(types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf'))
            finally:
                submission.answer_pdf.close()
        elif submission.pages.exists():
            for page in submission.pages.all().order_by('page_number'):
                page.image_file.open('rb')
                try:
                    img_bytes = page.image_file.read()
                    parts.append(types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg'))
                finally:
                    page.image_file.close()
        else:
            raise ValueError("No answer PDF or pages found on this submission.")

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[types.Content(role='user', parts=parts)],
        )

        return response.text or ""

    def _mock_extraction(self, submission) -> str:
        """Returns mock transcription for development/testing environments."""
        exam_title = getattr(submission.attempt.examination, 'title', 'Subjective Examination')
        return (
            f"### Transcribed Handwritten Answer Sheet\n\n"
            f"**Examination:** {exam_title}\n"
            f"**Pages Scanned:** {submission.page_count or 1}\n\n"
            f"#### Question 1\n"
            f"The principles of public administration in Nepal are governed by the Constitution and "
            f"the Good Governance (Management and Operation) Act. The key tenets include rule of law, "
            f"accountability to the public, transparency in decision-making, and non-discrimination.\n\n"
            f"#### Question 2\n"
            f"To calculate bending moment and shear force in simply supported beams, internal equilibrium "
            f"equations (sum of vertical forces = 0, sum of moments = 0) must be applied. For a uniform "
            f"distributed load (w), the maximum bending moment occurs at mid-span: M_max = (w * L^2) / 8."
        )
