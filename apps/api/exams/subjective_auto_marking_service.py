"""
Subjective Rule-Based Auto-Marking Engine (NO AI / NO LLM).

Handles:
1. Parsing student answer sheets (selectable text vs traditional OCR).
2. Question number detection, boundary identification, subquestions, and multi-page answer continuation.
3. Mapping student answers to canonical ExaminationQuestions.
4. Rule-based, deterministic evaluation against approved Expert Solutions and rubrics.
5. Question-wise partial marking by rubric criteria with domain synonyms and negation detection.
6. Separation of OCR confidence, mapping confidence, and marking confidence.
7. Quality gate & routing uncertain/contradictory answers to Admin review.
8. Safe calculation and validation of scores and audit trail.
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from django.db import transaction

from .models import (
    Examination, ExaminationQuestion, ExaminationAttempt,
    SubjectiveSubmission, SubjectiveSubmissionPage, SubjectiveQuestionScore
)
from .ocr_service import SubjectiveOCRService
from .subjective_text_comparator import RuleBasedAnswerComparator

logger = logging.getLogger(__name__)


def detect_student_answers_by_question(
    raw_text: str, pages_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Detects question boundaries and extracts text for each question.
    Supports:
    - 1, Q1, Q.1, Question 1, Ans 1, 1.
    - 2(a), Q2(a), 2 (a), Q2.a, 3(b)
    - Devanagari numerals (१, २, ३(क)...)
    - Cross-page continuation across multiple pages.
    Returns: {
        'Q1': {'text': '...', 'pages': [1, 2], 'confidence': 0.95, 'has_duplicates': False},
        'Q2': {'text': '...', 'pages': [2], 'confidence': 0.95, 'has_duplicates': False},
        'Q3(A)': {'text': '...', 'pages': [2, 3], 'confidence': 0.95, 'has_duplicates': False},
    }
    """
    nepali_digit_map = {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'}
    nepali_sub_map = {'क': 'A', 'ख': 'B', 'ग': 'C', 'घ': 'D', 'ङ': 'E'}

    def normalize_num(raw: str) -> str:
        res = ""
        for ch in raw.strip():
            res += nepali_digit_map.get(ch, ch)
        return res

    # Regex matching:
    # Q.1, Question 1, 1., 1(a), Q1(a), Q. 1 (a), प्रश्न १, प्रश्न १(क)
    q_regex = re.compile(
        r'^(?:(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*)?'
        r'(\d+|[०-९]+)'
        r'(?:\s*[\(\[]\s*([a-zA-Z]|[क-ङ]|[ivxIVX]+)\s*[\)\]]|\s*[\.-]?\s*([a-zA-Z]|[क-ङ]|[ivxIVX]+))?'
        r'(?:\s*[\.:\)\-\]]|\s+|$|\Z)',
        re.IGNORECASE
    )

    def extract_header_and_key(line: str) -> Optional[Tuple[str, str, int]]:
        stripped = line.strip()
        match = q_regex.match(stripped)
        if not match:
            return None
        raw_num = match.group(1) or ""
        norm_num = normalize_num(raw_num)
        if not norm_num:
            return None

        sub_part = match.group(2) or match.group(3) or ""
        sub_part_clean = nepali_sub_map.get(sub_part, sub_part).upper()

        if sub_part_clean:
            key = f"Q{norm_num}({sub_part_clean})"
        else:
            key = f"Q{norm_num}"

        end_pos = match.end()
        remainder = stripped[end_pos:].strip()
        return key, remainder, end_pos

    question_answers: Dict[str, Dict[str, Any]] = {}
    current_q_key: Optional[str] = None
    current_lines: List[str] = []
    current_pages: List[int] = []
    seen_headers: set = set()
    duplicate_headers: set = set()

    if pages_data:
        for p in pages_data:
            p_num = p['page_number']
            p_text = p.get('text', '') or ''
            lines = p_text.split('\n')

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                header_info = extract_header_and_key(stripped)
                if header_info:
                    key, remainder, _ = header_info
                    if key in seen_headers:
                        duplicate_headers.add(key)
                    else:
                        seen_headers.add(key)

                    # Flush previous question
                    if current_q_key:
                        joined = "\n".join(current_lines).strip()
                        if current_q_key in question_answers:
                            question_answers[current_q_key]['text'] += "\n\n" + joined
                            for pg in current_pages:
                                if pg not in question_answers[current_q_key]['pages']:
                                    question_answers[current_q_key]['pages'].append(pg)
                        else:
                            question_answers[current_q_key] = {
                                'text': joined,
                                'pages': list(dict.fromkeys(current_pages)),
                                'confidence': 0.95,
                                'has_duplicates': False,
                            }

                    current_q_key = key
                    current_lines = [remainder] if remainder else []
                    current_pages = [p_num]
                else:
                    if current_q_key:
                        current_lines.append(stripped)
                        if p_num not in current_pages:
                            current_pages.append(p_num)

        # Flush final question
        if current_q_key and current_lines:
            joined = "\n".join(current_lines).strip()
            if current_q_key in question_answers:
                question_answers[current_q_key]['text'] += "\n\n" + joined
                for pg in current_pages:
                    if pg not in question_answers[current_q_key]['pages']:
                        question_answers[current_q_key]['pages'].append(pg)
            else:
                question_answers[current_q_key] = {
                    'text': joined,
                    'pages': list(dict.fromkeys(current_pages)),
                    'confidence': 0.95,
                    'has_duplicates': False,
                }

        for k in question_answers:
            if k in duplicate_headers:
                question_answers[k]['has_duplicates'] = True

    # Fallback if no page structure or empty match
    if not question_answers and raw_text.strip():
        lines = raw_text.split('\n')
        current_q_key = None
        current_lines = []
        seen_headers = set()
        duplicate_headers = set()

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            header_info = extract_header_and_key(stripped)
            if header_info:
                key, remainder, _ = header_info
                if key in seen_headers:
                    duplicate_headers.add(key)
                else:
                    seen_headers.add(key)

                if current_q_key:
                    joined = "\n".join(current_lines).strip()
                    if current_q_key in question_answers:
                        question_answers[current_q_key]['text'] += "\n\n" + joined
                    else:
                        question_answers[current_q_key] = {
                            'text': joined,
                            'pages': [1],
                            'confidence': 0.85,
                            'has_duplicates': False,
                        }
                current_q_key = key
                current_lines = [remainder] if remainder else []
            else:
                if current_q_key:
                    current_lines.append(stripped)

        if current_q_key and current_lines:
            joined = "\n".join(current_lines).strip()
            if current_q_key in question_answers:
                question_answers[current_q_key]['text'] += "\n\n" + joined
            else:
                question_answers[current_q_key] = {
                    'text': joined,
                    'pages': [1],
                    'confidence': 0.85,
                    'has_duplicates': False,
                }

        for k in question_answers:
            if k in duplicate_headers:
                question_answers[k]['has_duplicates'] = True

    # If still no headers matched, default entire content to Q1 with lower confidence
    if not question_answers and raw_text.strip():
        question_answers['Q1'] = {
            'text': raw_text.strip(),
            'pages': [1],
            'confidence': 0.40,
            'has_duplicates': False,
        }

    return question_answers


class SubjectiveAutoMarkingService:
    """
    Deterministic rule-based subjective auto-marking service.
    Zero generative AI or external LLM dependencies.
    """

    @classmethod
    def auto_mark_submission(cls, submission: SubjectiveSubmission) -> Dict[str, Any]:
        return cls().evaluate_submission(submission)

    def __init__(self):
        self.comparator = RuleBasedAnswerComparator()

    def evaluate_submission(self, submission: SubjectiveSubmission) -> Dict[str, Any]:
        """
        Executes end-to-end rule-based evaluation for a subjective submission:
        OCR / Extraction -> Question Mapping -> Deterministic Rubric Marking -> Quality Gate.
        """
        submission.evaluation_status = 'ocr_processing'
        submission.save(update_fields=['evaluation_status'])

        # 1. OCR Extraction using local PyMuPDF / RapidOCR
        raw_text, pages_data, ocr_confidence = self._extract_student_text_and_pages(submission)
        submission.raw_ocr_text = raw_text
        if not submission.extracted_text:
            submission.extracted_text = raw_text

        ocr_readable = len(raw_text.strip()) >= 20 and not raw_text.strip().startswith("[OCR Error]") and not raw_text.strip().startswith("[Handwritten page scan captured")
        submission.ocr_status = 'completed' if ocr_readable else 'failed'
        submission.save(update_fields=['raw_ocr_text', 'extracted_text', 'ocr_status'])

        # 2. Detect student questions
        submission.evaluation_status = 'ai_evaluating'
        submission.save(update_fields=['evaluation_status'])

        detected_answers = detect_student_answers_by_question(submission.extracted_text, pages_data)

        examination = submission.attempt.examination
        exam_questions = list(examination.examination_questions.select_related('question').order_by('order', 'id'))

        total_exam_score = 0.0
        total_exam_max = 0.0
        flagged_reasons = []
        uncertain_questions = []
        scores_created = []

        mapping_confidences = []
        marking_confidences = []

        with transaction.atomic():
            submission.question_scores.all().delete()

            for eq in exam_questions:
                # Sanitize question label: if no digits (e.g. OCR noise like "WER", "UANTITY"), fallback to Q{order}
                raw_label = (eq.question_number or '').strip()
                if not raw_label or not re.search(r'\d', raw_label):
                    q_label = f"Q{eq.order}"
                else:
                    q_label = raw_label

                q_clean_num = re.sub(r'[^0-9]', '', q_label) or str(eq.order)
                base_key = f"Q{q_clean_num}"

                # Match by explicit key, normalized upper label, or base key
                student_q_data = (
                    detected_answers.get(q_label.upper()) or
                    detected_answers.get(f"Q{q_label.upper()}") or
                    detected_answers.get(base_key)
                )

                # Fallback to positional order if lookup misses
                if not student_q_data and detected_answers:
                    pos_key = f"Q{eq.order}"
                    student_q_data = detected_answers.get(pos_key)
                    if not student_q_data:
                        keys = list(detected_answers.keys())
                        if eq.order - 1 < len(keys):
                            student_q_data = detected_answers[keys[eq.order - 1]]

                student_answer_text = student_q_data['text'] if student_q_data else ""
                pages_referred = student_q_data.get('pages', []) if student_q_data else []
                map_conf = student_q_data.get('confidence', 0.5) if student_q_data else 0.0
                has_dup = student_q_data.get('has_duplicates', False) if student_q_data else False

                if has_dup:
                    map_conf = min(map_conf, 0.50)
                    flagged_reasons.append(f"{q_label}: Duplicate question answer sections detected.")

                if not student_q_data:
                    map_conf = 0.0

                mapping_confidences.append(map_conf)

                # Ensure rubric is present
                rubric = eq.rubric or []
                if not rubric:
                    from .subjective_expert_service import SubjectiveExpertSolutionService
                    service = SubjectiveExpertSolutionService()
                    rubric = service.generate_rubric_for_question(
                        question_text=eq.question.text,
                        solution_text=eq.model_solution or eq.question.model_answer or "Standard reference solution.",
                        max_marks=float(eq.marks),
                        evaluation_type=eq.evaluation_type or 'descriptive'
                    )
                    eq.rubric = rubric
                    eq.save(update_fields=['rubric'])

                # Evaluate question answer with deterministic comparator
                eval_result = self.evaluate_single_question_answer(
                    question_text=eq.question.text,
                    max_marks=float(eq.marks),
                    evaluation_type=eq.evaluation_type or 'descriptive',
                    expert_solution=eq.model_solution or eq.question.model_answer or "",
                    rubric=rubric,
                    student_answer=student_answer_text,
                    ocr_readable=ocr_readable,
                )

                marking_confidences.append(eval_result.get('confidence_score', 0.8))

                q_status = eval_result['status']
                if map_conf < 0.60 and student_answer_text:
                    q_status = 'needs_review'
                    if f"{q_label}: Uncertain question boundary" not in flagged_reasons:
                        flagged_reasons.append(f"{q_label}: Uncertain question boundary or low mapping confidence.")

                if q_status == 'needs_review':
                    uncertain_questions.append(q_label)
                    if eval_result.get('review_reason'):
                        flagged_reasons.append(f"{q_label}: {eval_result['review_reason']}")

                st = eval_result.get('strengths', '')
                if isinstance(st, list):
                    st = "\n".join(str(x) for x in st)
                imp = eval_result.get('improvements', '')
                if isinstance(imp, list):
                    imp = "\n".join(str(x) for x in imp)

                q_score = SubjectiveQuestionScore.objects.create(
                    submission=submission,
                    question=eq.question,
                    question_number=eq.order,
                    marks_obtained=eval_result['marks_obtained'],
                    max_marks=eval_result['max_marks'],
                    feedback=eval_result['overall_feedback'],
                    criterion_scores=eval_result['criterion_scores'],
                    status=q_status,
                    confidence_score=eval_result['confidence_score'],
                    review_reason=eval_result.get('review_reason', ''),
                    admin_notes=eval_result.get('admin_notes', ''),
                    strengths=st,
                    improvements=imp,
                    student_answer_text=student_answer_text,
                    pages_referred=pages_referred,
                    rubric_snapshot=rubric,
                )
                scores_created.append(q_score)
                total_exam_score += eval_result['marks_obtained']
                total_exam_max += eval_result['max_marks']

            # Update attempt scores
            attempt = submission.attempt
            attempt.score = round(total_exam_score, 2)
            effective_total = total_exam_max if total_exam_max > 0 else float(examination.total_marks or 100)
            attempt.percentage = round((total_exam_score / effective_total * 100), 2) if effective_total > 0 else 0.0

            exam_total = float(examination.total_marks or 100)
            exam_pass = float(examination.passing_marks or (exam_total * 0.4))
            pass_ratio = (exam_pass / exam_total) if exam_total > 0 else 0.4
            pass_marks = effective_total * pass_ratio
            attempt.passed = total_exam_score >= pass_marks

            if not ocr_readable:
                flagged_reasons.append('No readable handwriting text found; requires manual review.')

            avg_map_conf = round(sum(mapping_confidences) / len(mapping_confidences), 2) if mapping_confidences else 0.0
            avg_mark_conf = round(sum(marking_confidences) / len(marking_confidences), 2) if marking_confidences else 0.0

            # Quality gate evaluation
            quality_passed = (
                ocr_readable and
                len(uncertain_questions) == 0 and
                ocr_confidence >= 0.70 and
                avg_map_conf >= 0.70 and
                avg_mark_conf >= 0.70
            )

            submission.quality_gate_passed = quality_passed
            submission.quality_gate_details = {
                'ocr_confidence': round(ocr_confidence, 2),
                'mapping_confidence': avg_map_conf,
                'marking_confidence': avg_mark_conf,
                'uncertain_questions': uncertain_questions,
                'flagged_reasons': flagged_reasons,
                'flags': flagged_reasons,
                'evaluated_at': timezone.now().isoformat(),
            }

            if not quality_passed:
                submission.evaluation_status = 'needs_review'
                submission.status = 'under_review'
            else:
                submission.evaluation_status = 'ai_evaluated'
                submission.status = 'evaluated'

            # Auto-publication check: ONLY if explicitly enabled on examination AND quality gate fully passed
            if examination.auto_publish_eligible and quality_passed:
                submission.is_published = True
                submission.published_at = timezone.now()
                submission.evaluation_status = 'published'
                attempt.status = 'evaluated'
            else:
                # Kept unpublished awaiting Admin review/confirmation
                submission.is_published = False

            submission.evaluated_at = timezone.now()
            submission.evaluator_feedback = self._compile_overall_feedback(scores_created)
            submission.save()
            attempt.save(update_fields=['score', 'percentage', 'passed', 'status'])

        return {
            'submission_id': submission.id,
            'evaluation_status': submission.evaluation_status,
            'quality_gate_passed': submission.quality_gate_passed,
            'total_score': attempt.score,
            'total_max': total_exam_max,
            'percentage': attempt.percentage,
            'uncertain_questions': uncertain_questions,
            'is_published': submission.is_published,
        }

    def evaluate_single_question_answer(
        self, question_text: str, max_marks: float, evaluation_type: str,
        expert_solution: str, rubric: List[Dict[str, Any]],
        student_answer: str, ocr_readable: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluates a single student answer using deterministic multi-signal comparison.
        """
        if not ocr_readable or not student_answer.strip():
            return {
                'marks_obtained': 0.0,
                'max_marks': max_marks,
                'criterion_scores': [
                    {
                        'criterion_id': c.get('id', f'c{i+1}'),
                        'description': c.get('description', ''),
                        'max_marks': c.get('max_marks', 1.0),
                        'marks_obtained': 0.0,
                        'feedback': 'Answer unreadable or unanswered. Routed to manual review.',
                        'status': 'needs_review',
                    }
                    for i, c in enumerate(rubric)
                ],
                'status': 'needs_review',
                'confidence_score': 0.1,
                'review_reason': 'OCR transcription unclear or answer blank. Requires manual Admin verification.',
                'admin_notes': 'Automated OCR produced insufficient text for reliable marking.',
                'strengths': '',
                'improvements': 'Please ensure answer sheet pages are clearly legible and numbered.',
                'overall_feedback': 'Answer requires manual evaluation by examiner.',
            }

        return self.comparator.evaluate_answer(
            student_answer=student_answer,
            expert_solution=expert_solution,
            rubric=rubric,
            max_marks=max_marks,
            question_text=question_text,
            evaluation_type=evaluation_type
        )

    def _extract_student_text_and_pages(
        self, submission: SubjectiveSubmission
    ) -> Tuple[str, List[Dict[str, Any]], float]:
        """
        Extracts text from answer PDF or page images via PyMuPDF or OpenCV + RapidOCR.
        Returns: (full_text, pages_data, avg_ocr_confidence)
        """
        if submission.extracted_text and not submission.answer_pdf and not submission.pages.exists():
            pages_data = [{'page_number': 1, 'text': submission.extracted_text, 'confidence': 0.95}]
            return submission.extracted_text, pages_data, 0.95

        if submission.raw_ocr_text and not submission.answer_pdf and not submission.pages.exists():
            pages_data = [{'page_number': 1, 'text': submission.raw_ocr_text, 'confidence': 0.95}]
            return submission.raw_ocr_text, pages_data, 0.95

        if not submission.answer_pdf and not submission.pages.exists():
            return "", [], 0.10

        ocr_service = SubjectiveOCRService()
        pages_data = ocr_service.extract_pages_data(submission)
        full_text = "\n\n".join(p['text'] for p in pages_data if p.get('text')).strip()

        confidences = [p.get('confidence', 0.8) for p in pages_data if p.get('confidence')]
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.50

        return full_text, pages_data, avg_conf

    def _compile_overall_feedback(self, scores: List[SubjectiveQuestionScore]) -> str:
        """Assembles summary evaluator feedback."""
        lines = []
        for s in scores:
            lines.append(f"Q{s.question_number}: {s.marks_obtained:g}/{s.max_marks:g} — {s.feedback or 'Completed'}")
            if s.strengths:
                lines.append(f"  • Strength: {s.strengths}")
            if s.improvements:
                lines.append(f"  • Area to improve: {s.improvements}")
        return "\n".join(lines)
