"""
Expert Solution PDF Extraction & Rubric Generation Service.

Handles:
1. Validating and inspecting Expert Solution PDFs (text-based vs scanned).
2. Extracting solution content per question (preserving page & structural order).
3. Mapping solutions to canonical ExaminationQuestions.
4. Generating structured question-specific marking rubrics with AI (Gemini) or rule-based fallback.
5. Strict validation: Criterion maximum marks MUST sum to question maximum marks.
6. Admin review, manual rubric editing, and version snapshotting.
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from django.utils import timezone
from django.conf import settings
import pypdf

logger = logging.getLogger(__name__)


def extract_pdf_pages_text(file_obj) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page using pypdf.
    Returns list of dicts: [{'page_number': 1, 'text': '...', 'has_selectable_text': True/False}]
    """
    pages_data = []
    file_obj.seek(0)
    try:
        reader = pypdf.PdfReader(file_obj)
        for idx, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            # If text is substantial (> 30 characters), consider it selectable text
            has_text = len(text) >= 30
            pages_data.append({
                'page_number': idx + 1,
                'text': text,
                'has_selectable_text': has_text,
                'char_count': len(text),
            })
    except Exception as e:
        logger.warning(f"pypdf extraction error: {e}")
        file_obj.seek(0)
    return pages_data


def split_text_into_question_blocks(full_text: str) -> Dict[str, str]:
    """
    Splits document text into question-keyed sections:
    e.g. {'Q1': '...', 'Q2': '...', ...}
    Supports: Q1, Q.1, Q.No. 1, Question 1, 1., प्रश्न १, प्रश्न नं. १
    """
    # Regex to find question headers
    pattern = re.compile(
        r'(?:^|\n)\s*'
        r'(?:(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+|[A-Za-z]\w*)|'
        r'(\d+|[०-९]+)\s*[\.)\-]\s+)'
        r'(.*?)(?=(?:\n\s*(?:(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+|[A-Za-z]\w*)|(?:\d+|[०-९]+)\s*[\.)\-]\s+))|\Z)',
        re.IGNORECASE | re.DOTALL
    )

    nepali_digit_map = {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'}

    def normalize_num(raw: str) -> str:
        res = ""
        for ch in raw.strip():
            res += nepali_digit_map.get(ch, ch)
        return res

    matches = pattern.findall(full_text)
    blocks: Dict[str, str] = {}

    if matches:
        for m in matches:
            q_num_raw = m[0] or m[1] or ""
            content = m[2] or ""
            normalized = normalize_num(q_num_raw)
            if normalized:
                key = f"Q{normalized}" if normalized.isdigit() else normalized.upper()
                blocks[key] = content.strip()
    else:
        # Fallback: if no question header matched, return the whole text under Q1
        if full_text.strip():
            blocks['Q1'] = full_text.strip()

    return blocks



class SubjectiveExpertSolutionService:
    def __init__(self):
        # Strictly rule-based, deterministic evaluation - No external AI/LLMs
        pass

    def process_expert_solution_pdf(self, examination) -> Dict[str, Any]:
        """
        Extracts solution text from examination.expert_solution_pdf, maps to questions,
        and generates proposed question-specific rubrics.
        """
        if not examination.expert_solution_pdf:
            raise ValueError("No Expert Solution PDF uploaded for this examination.")

        examination.expert_solution_pdf.open('rb')
        try:
            pages = extract_pdf_pages_text(examination.expert_solution_pdf)
        finally:
            examination.expert_solution_pdf.close()

        has_selectable = any(p['has_selectable_text'] for p in pages)
        all_text = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages if p['text'])

        # If selectable text is missing or very sparse (< 100 characters total), call multimodal OCR
        if not has_selectable or len(all_text.strip()) < 100:
            all_text = self._extract_via_multimodal_vision(examination)

        examination.expert_solution_extracted_text = all_text
        examination.save(update_fields=['expert_solution_extracted_text', 'updated_at'])

        # Detect question-wise blocks
        question_blocks = split_text_into_question_blocks(all_text)

        # Map to ExaminationQuestion objects
        exam_questions = list(examination.examination_questions.select_related('question').order_by('order', 'id'))
        if not exam_questions:
            # If no examination questions exist yet, create default questions from detected blocks
            from exams.models import Question, ExaminationQuestion
            for idx, (q_key, sol_text) in enumerate(question_blocks.items(), start=1):
                canonical_q = Question.objects.create(
                    question_type='subjective',
                    text=f"Question {idx}",
                    marks=10,
                    status='approved',
                    created_by=examination.created_by,
                )
                eq = ExaminationQuestion.objects.create(
                    examination=examination,
                    question=canonical_q,
                    order=idx,
                    marks=10,
                    question_number=q_key,
                    model_solution=sol_text[:2000],
                )
                exam_questions.append(eq)

            examination.total_questions = len(exam_questions)
            examination.total_marks = sum(q.marks for q in exam_questions)
            examination.save(update_fields=['total_questions', 'total_marks', 'updated_at'])

        # Associate solutions and generate rubrics
        results = []
        for eq in exam_questions:
            q_label = eq.question_number or f"Q{eq.order}"
            q_num_clean = re.sub(r'[^0-9]', '', q_label) or str(eq.order)
            lookup_key = f"Q{q_num_clean}"

            sol_text = question_blocks.get(lookup_key) or question_blocks.get(q_label) or ""
            if not sol_text and question_blocks:
                # Fallback to order index if key not found directly
                keys = list(question_blocks.keys())
                if eq.order - 1 < len(keys):
                    sol_text = question_blocks[keys[eq.order - 1]]

            if sol_text:
                eq.model_solution = sol_text

            # Generate or update proposed rubric
            proposed_rubric = self.generate_rubric_for_question(
                question_text=eq.question.text,
                solution_text=eq.model_solution or eq.question.model_answer or "Comprehensive standard solution.",
                max_marks=float(eq.marks),
                evaluation_type=eq.evaluation_type or 'descriptive'
            )

            eq.rubric = proposed_rubric
            eq.rubric_approved = False  # Requires Admin confirmation
            eq.rubric_version = (eq.rubric_version or 0) + 1
            eq.save(update_fields=['model_solution', 'rubric', 'rubric_approved', 'rubric_version'])

            results.append({
                'examination_question_id': eq.id,
                'question_number': q_label,
                'max_marks': eq.marks,
                'evaluation_type': eq.evaluation_type,
                'has_solution': bool(eq.model_solution),
                'rubric_criteria_count': len(proposed_rubric),
                'rubric': proposed_rubric,
            })

        examination.expert_solution_rubric_generated = True
        examination.expert_solution_version = (examination.expert_solution_version or 0) + 1
        examination.save(update_fields=['expert_solution_rubric_generated', 'expert_solution_version', 'updated_at'])

        return {
            'total_questions_processed': len(results),
            'questions_detected': len(results),
            'rubrics_generated': True,
            'has_selectable_text': has_selectable,
            'questions': results,
            'rubrics': results,
        }

    def _extract_via_multimodal_vision(self, examination) -> str:
        """Extracts text using traditional OCR (PyMuPDF + OpenCV + RapidOCR) without external AI."""
        from .ocr_service import SubjectiveOCRService
        if not examination.expert_solution_pdf:
            return ""
        examination.expert_solution_pdf.open('rb')
        try:
            return SubjectiveOCRService.extract_text_from_pdf(examination.expert_solution_pdf)
        except Exception as e:
            logger.warning(f"Traditional OCR extraction on Expert Solution failed: {e}")
            return ""
        finally:
            examination.expert_solution_pdf.close()

    def generate_rubric_for_question(
        self, question_text: str, solution_text: str, max_marks: float, evaluation_type: str = 'descriptive'
    ) -> List[Dict[str, Any]]:
        """
        Deterministically generates a structured marking rubric criteria list where sum(criterion.max_marks) == max_marks.
        Extracts key expected concepts from the approved Expert Solution text.
        """
        return self._generate_fallback_rubric(question_text, solution_text, max_marks, evaluation_type)

    @staticmethod
    def _normalize_rubric_totals(criteria: List[Dict[str, Any]], target_total: float) -> List[Dict[str, Any]]:
        """Guarantees the sum of criteria maximum marks equals target_total exactly."""
        cleaned = []
        current_sum = 0.0

        for idx, c in enumerate(criteria):
            try:
                mm = float(c.get('max_marks', 1.0))
            except (ValueError, TypeError):
                mm = 1.0
            mm = max(0.25, mm)
            current_sum += mm
            crit_desc = str(c.get('criterion') or c.get('description') or f"Criterion {idx + 1}").strip()
            cleaned.append({
                'id': str(c.get('id') or f"c{idx + 1}"),
                'criterion': crit_desc,
                'description': crit_desc,
                'max_marks': round(mm, 2),
                'expected_concepts': c.get('expected_concepts') or [],
                'alternative_solutions': c.get('alternative_solutions') or [],
                'formulas_or_steps': c.get('formulas_or_steps') or [],
                'diagram_requirements': c.get('diagram_requirements') or "",
                'partial_credit_rules': c.get('partial_credit_rules') or "Award partial credit for partially correct reasoning.",
                'common_misconceptions': c.get('common_misconceptions') or "",
            })

        if current_sum <= 0:
            current_sum = float(len(cleaned))

        # Scale proportionally to match target_total
        factor = target_total / current_sum
        running_sum = 0.0
        for i, c in enumerate(cleaned):
            if i == len(cleaned) - 1:
                # Last item takes the exact remainder to eliminate rounding drift
                c['max_marks'] = round(target_total - running_sum, 2)
            else:
                c['max_marks'] = round(c['max_marks'] * factor, 2)
                running_sum += c['max_marks']

        return cleaned

    def _generate_fallback_rubric(
        self, question_text: str, solution_text: str, max_marks: float, evaluation_type: str
    ) -> List[Dict[str, Any]]:
        """Generates deterministic, highly balanced rubric criteria derived from question type and solution text."""
        # Extract key concept phrases from solution text
        extracted_concepts = []
        if solution_text:
            lines = [l.strip().lstrip('•*-123456789.) ') for l in solution_text.split('\n') if len(l.strip()) > 10]
            extracted_concepts = [l for l in lines if not l.startswith('---')][:6]

        if evaluation_type == 'diagram':
            weights = [0.25, 0.35, 0.25, 0.15]
            descriptions = [
                "Correct structural layout and component identification",
                "Accurate technical diagram with proper labeling and orientations",
                "Explanation of working mechanism consistent with diagram",
                "Summary conclusion and technical correctness",
            ]
        elif evaluation_type == 'numerical':
            weights = [0.20, 0.30, 0.30, 0.20]
            descriptions = [
                "Identification of given parameters and relevant governing formula",
                "Correct step-by-step substitution and mathematical manipulation",
                "Intermediate derivations and calculation accuracy",
                "Final answer with correct magnitude, units, and conclusion",
            ]
        else:
            weights = [0.25, 0.35, 0.25, 0.15]
            descriptions = [
                "Core conceptual definition and fundamental structure",
                "Detailed explanation of principles, arguments, or mechanism",
                "Coverage of essential points, legal/statutory references or derivations",
                "Synthesis, relevant practical examples, and conclusion",
            ]

        criteria = []
        running = 0.0
        for idx, (w, desc) in enumerate(zip(weights, descriptions)):
            if idx == len(weights) - 1:
                m = round(max_marks - running, 2)
            else:
                m = round(max_marks * w, 2)
                running += m

            expected = [desc]
            if idx < len(extracted_concepts) and extracted_concepts[idx]:
                expected.append(extracted_concepts[idx])

            criteria.append({
                'id': f"c{idx + 1}",
                'description': desc,
                'max_marks': m,
                'expected_concepts': expected,
                'alternative_solutions': ["Valid alternative formulations accepted."],
                'formulas_or_steps': [],
                'diagram_requirements': "Diagram required with clear labels." if "diagram" in desc.lower() else "",
                'partial_credit_rules': "Award partial credit proportionate to accuracy.",
                'common_misconceptions': "",
            })
        return criteria
