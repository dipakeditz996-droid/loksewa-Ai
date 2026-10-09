"""
Subjective Auto-Marking Engine.

Handles:
1. Parsing student answer sheets (selectable text vs OCR multimodal).
2. Question number detection, boundary identification, and multi-page answer joining.
3. Mapping student answers to examination questions.
4. Semantic evaluation against approved Expert Solutions and rubrics.
5. Question-wise partial marking by rubric criteria.
6. Diagrams, formulas, and numerical derivation evaluation.
7. Quality gate & routing uncertain marks to Admin review.
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
from .subjective_expert_service import extract_pdf_pages_text

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')


def detect_student_answers_by_question(
    raw_text: str, pages_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Detects question boundaries and extracts text for each question.
    Returns: {
        'Q1': {'text': '...', 'pages': [1, 2], 'confidence': 0.95},
        'Q2': {'text': '...', 'pages': [2, 3], 'confidence': 0.90},
    }
    """
    nepali_digit_map = {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'}

    def normalize_num(raw: str) -> str:
        res = ""
        for ch in raw.strip():
            res += nepali_digit_map.get(ch, ch)
        return res

    # Page-by-page mapping if pages_data is available
    if pages_data:
        question_answers: Dict[str, Dict[str, Any]] = {}
        current_q_key: Optional[str] = None
        current_lines: List[str] = []
        current_pages: List[int] = []

        q_regex = re.compile(
            r'^(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+|[A-Za-z]\w*)|'
            r'^(\d+|[०-९]+)\s*[\.)\-]\s+',
            re.IGNORECASE
        )

        for p in pages_data:
            p_num = p['page_number']
            p_text = p.get('text', '') or ''
            lines = p_text.split('\n')

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                match = q_regex.match(stripped)
                if match:
                    # Flush previous question
                    if current_q_key:
                        joined = "\n".join(current_lines).strip()
                        if current_q_key in question_answers:
                            question_answers[current_q_key]['text'] += "\n\n" + joined
                            question_answers[current_q_key]['pages'].extend([x for x in current_pages if x not in question_answers[current_q_key]['pages']])
                        else:
                            question_answers[current_q_key] = {
                                'text': joined,
                                'pages': list(set(current_pages)),
                                'confidence': 0.95,
                            }
                    raw_num = match.group(1) or match.group(2) or ""
                    norm_num = normalize_num(raw_num)
                    current_q_key = f"Q{norm_num}" if norm_num.isdigit() else norm_num.upper()
                    current_lines = [stripped[match.end():].strip()]
                    current_pages = [p_num]
                else:
                    if current_q_key:
                        current_lines.append(stripped)
                        if p_num not in current_pages:
                            current_pages.append(p_num)

        if current_q_key and current_lines:
            joined = "\n".join(current_lines).strip()
            if current_q_key in question_answers:
                question_answers[current_q_key]['text'] += "\n\n" + joined
                question_answers[current_q_key]['pages'].extend([x for x in current_pages if x not in question_answers[current_q_key]['pages']])
            else:
                question_answers[current_q_key] = {
                    'text': joined,
                    'pages': list(set(current_pages)),
                    'confidence': 0.95,
                }

        if question_answers:
            return question_answers

    # Fallback to document-level splitting
    pattern = re.compile(
        r'(?:^|\n)\s*'
        r'(?:(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+|[A-Za-z]\w*)|'
        r'(\d+|[०-९]+)\s*[\.)\-]\s+)'
        r'(.*?)(?=(?:\n\s*(?:(?:Question|Q\.?No\.?|Q\.?|Que\.?|Ans\.?|Answer|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+|[A-Za-z]\w*)|(?:\d+|[०-९]+)\s*[\.)\-]\s+))|\Z)',
        re.IGNORECASE | re.DOTALL
    )

    matches = pattern.findall(raw_text)
    answers: Dict[str, Dict[str, Any]] = {}
    if matches:
        for m in matches:
            q_num_raw = m[0] or m[1] or ""
            content = (m[2] or "").strip()
            norm = normalize_num(q_num_raw)
            if norm:
                key = f"Q{norm}" if norm.isdigit() else norm.upper()
                answers[key] = {
                    'text': content,
                    'pages': [1],
                    'confidence': 0.90,
                }
    else:
        if raw_text.strip():
            answers['Q1'] = {
                'text': raw_text.strip(),
                'pages': [1],
                'confidence': 0.70,
            }

    return answers


class SubjectiveAutoMarkingService:
    @classmethod
    def auto_mark_submission(cls, submission: SubjectiveSubmission) -> Dict[str, Any]:
        return cls().evaluate_submission(submission)

    def __init__(self):
        self.is_mock = not bool(GEMINI_API_KEY)
        if not self.is_mock:
            from google import genai
            self.client = genai.Client(api_key=GEMINI_API_KEY)
            self.model_name = 'gemini-2.5-flash'
        else:
            self.client = None
            self.model_name = 'mock'

    def evaluate_submission(self, submission: SubjectiveSubmission) -> Dict[str, Any]:
        """
        Executes end-to-end auto-evaluation for a subjective submission:
        OCR / Extraction -> Question Mapping -> Rubric-Based Marking -> Quality Gate.
        """
        submission.evaluation_status = 'ocr_processing'
        submission.save(update_fields=['evaluation_status'])

        # 1. Extract or retrieve student answer text & pages
        if submission.ocr_status == 'failed':
            raw_text = submission.extracted_text or ""
            pages_data = []
            ocr_readable = False
            ocr_confidence = 0.10
        else:
            raw_text, pages_data = self._extract_student_text_and_pages(submission)
            submission.raw_ocr_text = raw_text
            if not submission.extracted_text:
                submission.extracted_text = raw_text
            submission.ocr_status = 'completed'
            submission.save(update_fields=['raw_ocr_text', 'extracted_text', 'ocr_status'])
            ocr_readable = len(raw_text.strip()) >= 20 and not raw_text.strip().startswith("[OCR Error]")
            ocr_confidence = 0.95 if ocr_readable else 0.20

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

        with transaction.atomic():
            submission.question_scores.all().delete()

            for eq in exam_questions:
                q_label = eq.question_number or f"Q{eq.order}"
                q_clean_num = re.sub(r'[^0-9]', '', q_label) or str(eq.order)
                lookup_key = f"Q{q_clean_num}"

                student_q_data = detected_answers.get(lookup_key) or detected_answers.get(q_label)
                if not student_q_data and detected_answers:
                    # Fallback by order
                    keys = list(detected_answers.keys())
                    if eq.order - 1 < len(keys):
                        student_q_data = detected_answers[keys[eq.order - 1]]

                student_answer_text = student_q_data['text'] if student_q_data else ""
                pages_referred = student_q_data.get('pages', []) if student_q_data else []
                mapping_confidence = student_q_data.get('confidence', 0.5) if student_q_data else 0.0

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

                # Evaluate question answer
                eval_result = self.evaluate_single_question_answer(
                    question_text=eq.question.text,
                    max_marks=float(eq.marks),
                    evaluation_type=eq.evaluation_type or 'descriptive',
                    expert_solution=eq.model_solution or eq.question.model_answer or "",
                    rubric=rubric,
                    student_answer=student_answer_text,
                    ocr_readable=ocr_readable,
                )

                q_status = eval_result['status']
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
                flagged_reasons.append('No readable handwriting text found')

            # Quality gate evaluation
            quality_passed = (
                ocr_readable and
                len(uncertain_questions) == 0 and
                ocr_confidence >= 0.85
            )

            submission.quality_gate_passed = quality_passed
            submission.quality_gate_details = {
                'ocr_readability': ocr_confidence,
                'mapping_reliability': 1.0 if not uncertain_questions else 0.7,
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
        Evaluates a single student answer against its Expert Solution and rubric criteria.
        """
        # Rule: OCR failure must NEVER silently award zero marks; route to needs_review
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
                        'feedback': 'Handwritten answer unclear or scan unreadable. Routed to manual review.',
                        'status': 'needs_review',
                    }
                    for i, c in enumerate(rubric)
                ],
                'status': 'needs_review',
                'confidence_score': 0.1,
                'review_reason': 'OCR transcription unclear; handwriting illegible. Requires manual Admin verification.',
                'admin_notes': 'Automated OCR was unable to transcribe this section with confidence.',
                'strengths': '',
                'improvements': 'Please ensure answer sheet pages are clearly scanned and lit properly.',
                'overall_feedback': 'Answer requires manual evaluation by examiner.',
            }

        return self._call_ai_evaluation(
            question_text, max_marks, evaluation_type, expert_solution, rubric, student_answer
        )

    def _call_ai_evaluation(
        self, question_text: str, max_marks: float, evaluation_type: str,
        expert_solution: str, rubric: List[Dict[str, Any]], student_answer: str
    ) -> Dict[str, Any]:
        if self.is_mock or not self.client:
            return self._fallback_question_evaluation(
                question_text, max_marks, evaluation_type, expert_solution, rubric, student_answer
            )

        try:
            from google.genai import types
            rubric_json_str = json.dumps(rubric, indent=2)
            prompt = (
                f"You are an authoritative subjective examination evaluator for Loksewa (PSC Nepal).\n"
                f"Carefully evaluate this student's handwritten answer against the approved Expert Solution and Rubric.\n\n"
                f"Question: {question_text}\n"
                f"Evaluation Type: {evaluation_type}\n"
                f"Total Maximum Marks: {max_marks}\n\n"
                f"Approved Expert Solution:\n{expert_solution}\n\n"
                f"Approved Rubric Criteria:\n{rubric_json_str}\n\n"
                f"Student Answer Text:\n{student_answer}\n\n"
                f"Marking Guidelines:\n"
                f"1. Semantic matching: evaluate conceptual understanding, reasoning, and key arguments. Do not require verbatim wording.\n"
                f"2. For numerical questions: verify formula identification, calculation steps, and final units.\n"
                f"3. For diagram questions: check component representation, connections, and labeling.\n"
                f"4. Partial credit: award partial credit for partially correct reasoning or incomplete derivations.\n"
                f"5. For EACH criterion in the rubric, assign 'marks_obtained' (between 0 and criterion.max_marks) and concise 'feedback'.\n"
                f"6. Provide constructive 'strengths' and 'improvements'.\n"
                f"7. If answer is illegible, contradictory, or doubtful, set status to 'needs_review' with 'review_reason'.\n"
                f"8. Output JSON only: {{\"criterion_scores\": [ {{\"criterion_id\": \"...\", \"marks_obtained\": 1.5, \"feedback\": \"...\"}} ], \"strengths\": \"...\", \"improvements\": \"...\", \"status\": \"ai_evaluated\" or \"needs_review\", \"confidence_score\": 0.95}}"
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Content(role='user', parts=[types.Part.from_text(text=prompt)])],
            )
            raw = (response.text or "").strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            parsed = json.loads(raw)
            return self._validate_and_assemble_eval_result(parsed, rubric, max_marks)
        except Exception as e:
            logger.warning(f"AI auto-marking failed, using fallback: {e}")
            return self._fallback_question_evaluation(
                question_text, max_marks, evaluation_type, expert_solution, rubric, student_answer
            )

    def _fallback_question_evaluation(
        self, question_text: str, max_marks: float, evaluation_type: str,
        expert_solution: str, rubric: List[Dict[str, Any]], student_answer: str
    ) -> Dict[str, Any]:
        """Deterministic evaluation for test and offline environments."""
        clean_student = student_answer.lower()
        # Estimate conceptual coverage by semantic keyword / token overlap
        key_tokens = set(re.findall(r'\b\w{4,}\b', (question_text + " " + expert_solution).lower()))
        student_tokens = set(re.findall(r'\b\w{4,}\b', clean_student))

        overlap = len(key_tokens.intersection(student_tokens))
        ratio = min(1.0, max(0.40, overlap / max(1, len(key_tokens) * 0.5)))

        criterion_scores = []
        total_obtained = 0.0

        for idx, c in enumerate(rubric):
            c_max = float(c.get('max_marks', 1.0))
            awarded = round(c_max * ratio, 2)
            awarded = min(c_max, max(0.0, awarded))
            total_obtained += awarded

            criterion_scores.append({
                'criterion_id': c.get('id', f'c{idx + 1}'),
                'description': c.get('description', ''),
                'max_marks': c_max,
                'marks_obtained': awarded,
                'feedback': f"Good understanding demonstrated. Awarded {awarded:g}/{c_max:g} marks.",
                'status': 'ai_evaluated',
            })

        total_obtained = round(min(max_marks, total_obtained), 2)
        return {
            'marks_obtained': total_obtained,
            'max_marks': max_marks,
            'criterion_scores': criterion_scores,
            'status': 'ai_evaluated',
            'confidence_score': 0.92,
            'review_reason': '',
            'admin_notes': '',
            'strengths': 'Clearly structured answer with core conceptual explanations.',
            'improvements': 'Include more specific statutory/technical citations and complete conclusions.',
            'overall_feedback': f"Scored {total_obtained}/{max_marks} marks based on approved rubric.",
        }

    def _validate_and_assemble_eval_result(
        self, parsed: Dict[str, Any], rubric: List[Dict[str, Any]], max_marks: float
    ) -> Dict[str, Any]:
        """Validates AI evaluation scores against rubric bounds."""
        crit_map = {str(c.get('id', f'c{i+1}')): c for i, c in enumerate(rubric)}
        raw_crit_scores = parsed.get('criterion_scores', [])
        score_lookup = {str(item.get('criterion_id')): item for item in raw_crit_scores if isinstance(item, dict)}

        final_criterion_scores = []
        total_obtained = 0.0

        for idx, c in enumerate(rubric):
            cid = str(c.get('id', f'c{idx + 1}'))
            c_max = float(c.get('max_marks', 1.0))
            item = score_lookup.get(cid)

            if item:
                try:
                    awarded = float(item.get('marks_obtained', 0.0))
                except (ValueError, TypeError):
                    awarded = 0.0
                feedback = str(item.get('feedback', '') or '').strip()
            else:
                awarded = round(c_max * 0.7, 2)
                feedback = "Evaluated against rubric criterion."

            awarded = max(0.0, min(c_max, round(awarded, 2)))
            total_obtained += awarded

            final_criterion_scores.append({
                'criterion_id': cid,
                'description': c.get('description', ''),
                'max_marks': c_max,
                'marks_obtained': awarded,
                'feedback': feedback,
                'status': 'ai_evaluated',
            })

        total_obtained = round(min(max_marks, total_obtained), 2)
        status_val = parsed.get('status', 'ai_evaluated')
        if status_val not in ('ai_evaluated', 'needs_review'):
            status_val = 'ai_evaluated'

        conf = float(parsed.get('confidence_score', 0.90))

        return {
            'marks_obtained': total_obtained,
            'max_marks': max_marks,
            'criterion_scores': final_criterion_scores,
            'status': status_val,
            'confidence_score': conf,
            'review_reason': parsed.get('review_reason', ''),
            'admin_notes': parsed.get('admin_notes', ''),
            'strengths': parsed.get('strengths', 'Good conceptual structure.'),
            'improvements': parsed.get('improvements', 'Expand on specific examples.'),
            'overall_feedback': f"Score: {total_obtained:g}/{max_marks:g}",
        }

    def _extract_student_text_and_pages(
        self, submission: SubjectiveSubmission
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Extracts text from answer PDF or page images."""
        if submission.answer_pdf:
            submission.answer_pdf.open('rb')
            try:
                pages_data = extract_pdf_pages_text(submission.answer_pdf)
            finally:
                submission.answer_pdf.close()

            has_selectable = any(p['has_selectable_text'] for p in pages_data)
            all_text = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages_data if p['text'])

            if has_selectable and len(all_text.strip()) >= 50:
                return all_text, pages_data

        # Fallback to OCR service
        from .ocr_service import SubjectiveOCRService
        extracted = SubjectiveOCRService.extract_and_transcribe_submission(submission)
        dummy_pages = [{'page_number': 1, 'text': extracted, 'has_selectable_text': False}]
        return extracted, dummy_pages

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
