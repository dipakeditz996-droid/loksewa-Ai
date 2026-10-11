"""
Comprehensive Test Suite for LoksewaAI Rule-Based OCR Subjective Evaluation Engine (NO AI / NO LLM).

Validates:
1. Question paper parsing and positional combined marks mapping ([5 + 6], [4+6]).
2. Traditional OCR pipeline, text normalization, and cross-page question continuation.
3. Multi-signal deterministic answer comparator (synonyms, negations, contradictions, bounds).
4. Submission evaluation workflow, separate confidence tracking, quality gate, and Admin review routing.
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal

from exams.models import (
    ExamCategory, Exam, Examination, Question, ExaminationQuestion,
    ExaminationAttempt, SubjectiveSubmission, SubjectiveSubmissionPage,
    SubjectiveQuestionScore
)
from exams.subjective_question_paper_parser import QuestionPaperParser
from exams.subjective_text_comparator import RuleBasedAnswerComparator, normalize_text
from exams.subjective_auto_marking_service import (
    SubjectiveAutoMarkingService, detect_student_answers_by_question
)
from exams.subjective_expert_service import SubjectiveExpertSolutionService

User = get_user_model()


class QuestionPaperParserTests(TestCase):
    def setUp(self):
        self.parser = QuestionPaperParser()

    def test_sequential_questions_extraction(self):
        sample = """
        1. Explain the importance of federalism in Nepal. [5]
        2. Describe the functions of the legislature. [6]
        """
        result = self.parser.parse_question_paper(sample)
        self.assertEqual(len(result['questions']), 2)
        q1 = result['questions'][0]
        q2 = result['questions'][1]
        self.assertEqual(q1['question_number'], '1')
        self.assertEqual(q1['max_marks'], 5.0)
        self.assertEqual(q2['question_number'], '2')
        self.assertEqual(q2['max_marks'], 6.0)
        self.assertEqual(result['total_marks'], 11.0)
        self.assertTrue(result['validation']['valid'])

    def test_combined_marks_across_questions(self):
        """
        Layout:
        5. Explain federalism.
        6. Explain the separation of powers. [5 + 6]
        Maps positionally: Q5=5.0, Q6=6.0.
        """
        sample = """
        5. Explain federalism.
        6. Explain the separation of powers. [5 + 6]
        """
        result = self.parser.parse_question_paper(sample)
        self.assertEqual(len(result['questions']), 2)
        q5 = result['questions'][0]
        q6 = result['questions'][1]
        self.assertEqual(q5['question_number'], '5')
        self.assertEqual(q5['max_marks'], 5.0)
        self.assertEqual(q6['question_number'], '6')
        self.assertEqual(q6['max_marks'], 6.0)
        self.assertEqual(result['total_marks'], 11.0)

    def test_combined_marks_with_three_questions(self):
        """
        Layout with 3 questions: 4 + 6 + 5
        """
        sample = """
        1. Discuss public accountability.
        2. Explain good governance.
        3. Describe transparency mechanisms. [4 + 6 + 5]
        """
        result = self.parser.parse_question_paper(sample)
        self.assertEqual(len(result['questions']), 3)
        self.assertEqual(result['questions'][0]['max_marks'], 4.0)
        self.assertEqual(result['questions'][1]['max_marks'], 6.0)
        self.assertEqual(result['questions'][2]['max_marks'], 5.0)
        self.assertEqual(result['total_marks'], 15.0)

    def test_combined_subquestion_marks(self):
        """
        Layout:
        7(a) Explain rule of law.
        7(b) Explain constitutional supremacy. [4+6]
        Maps 4 to 7(a) and 6 to 7(b).
        """
        sample = """
        7(a) Explain rule of law.
        7(b) Explain constitutional supremacy. [4+6]
        """
        result = self.parser.parse_question_paper(sample)
        self.assertEqual(len(result['questions']), 2)
        q7a = result['questions'][0]
        q7b = result['questions'][1]
        self.assertEqual(q7a['max_marks'], 4.0)
        self.assertEqual(q7b['max_marks'], 6.0)
        self.assertEqual(result['total_marks'], 10.0)

    def test_nepali_numerals_and_brackets(self):
        sample = """
        १. नेपालको संविधानका विशेषताहरू लेख्नुहोस् । [१०]
        २. स्थानीय तहको काम र कर्तव्य उल्लेख गर्नुहोस् । (५+५)
        """
        result = self.parser.parse_question_paper(sample)
        self.assertGreaterEqual(len(result['questions']), 1)
        self.assertEqual(result['questions'][0]['question_number'], '1')
        self.assertEqual(result['questions'][0]['max_marks'], 10.0)


class StudentAnswerMappingTests(TestCase):
    def test_cross_page_answer_continuation(self):
        """
        Page 1: Q1 starts
        Page 2: Q1 continues, then Q2 starts
        """
        pages_data = [
            {
                'page_number': 1,
                'text': "Q.1 Federalism is a system of government where power is divided constitutionally.",
            },
            {
                'page_number': 2,
                'text': "between the central government and provincial constituent units.\nQ.2 The legislature performs crucial law-making functions.",
            }
        ]
        answers = detect_student_answers_by_question("", pages_data)
        self.assertIn('Q1', answers)
        self.assertIn('Q2', answers)
        self.assertIn("divided constitutionally", answers['Q1']['text'])
        self.assertIn("provincial constituent units", answers['Q1']['text'])
        self.assertEqual(answers['Q1']['pages'], [1, 2])
        self.assertEqual(answers['Q2']['pages'], [2])

    def test_subquestion_answer_mapping(self):
        text = """
        Q.3(a)
        Rule of law ensures that all citizens and institutions are subject to law.

        Q.3(b)
        Separation of powers divides governance between executive, legislature, and judiciary.
        """
        answers = detect_student_answers_by_question(text)
        self.assertTrue('Q3(A)' in answers or 'Q3(a)' in answers or 'Q3' in answers)

    def test_duplicate_question_detection(self):
        pages_data = [
            {'page_number': 1, 'text': "Q1 Federalism definition part 1."},
            {'page_number': 2, 'text': "Q1 Additional notes on federalism from another attempt."},
        ]
        answers = detect_student_answers_by_question("", pages_data)
        self.assertIn('Q1', answers)
        self.assertTrue(answers['Q1'].get('has_duplicates', False))


class RuleBasedAnswerComparatorTests(TestCase):
    def setUp(self):
        self.comparator = RuleBasedAnswerComparator()
        self.rubric = [
            {
                'id': 'c1',
                'description': 'Correct definition of federalism',
                'max_marks': 2.0,
                'expected_concepts': ['division of power', 'constitutional distribution of authority'],
            },
            {
                'id': 'c2',
                'description': 'Tiers of government in Nepal',
                'max_marks': 2.0,
                'expected_concepts': ['three tiers', 'federal provincial local levels'],
            },
            {
                'id': 'c3',
                'description': 'Conclusion and constitutional reference',
                'max_marks': 1.0,
                'expected_concepts': ['Constitution of Nepal 2072', 'Schedule 5 to 9'],
            }
        ]

    def test_exact_and_strong_matching_answer(self):
        student_answer = (
            "Federalism involves constitutional distribution of authority and division of power. "
            "Nepal has three tiers of government: federal, provincial, and local levels. "
            "Under the Constitution of Nepal 2072, powers are demarcated under Schedule 5 to 9."
        )
        expert_solution = "Federalism is constitutional distribution of authority among federal provincial local tiers."
        result = self.comparator.evaluate_answer(
            student_answer=student_answer,
            expert_solution=expert_solution,
            rubric=self.rubric,
            max_marks=5.0
        )
        self.assertGreaterEqual(result['marks_obtained'], 4.0)
        self.assertLessEqual(result['marks_obtained'], 5.0)
        self.assertEqual(result['status'], 'ai_evaluated')
        self.assertGreaterEqual(result['confidence_score'], 0.70)

    def test_synonym_recognition(self):
        """
        'openness' should match concept expecting 'transparency'.
        """
        rubric = [
            {
                'id': 'c1',
                'description': 'Transparency in public administration',
                'max_marks': 5.0,
                'expected_concepts': ['transparency', 'accountability'],
            }
        ]
        student_answer = "Public administration requires openness and answerability in government actions."
        expert_solution = "Transparency and accountability are the bedrock of governance."
        result = self.comparator.evaluate_answer(
            student_answer=student_answer,
            expert_solution=expert_solution,
            rubric=rubric,
            max_marks=5.0
        )
        self.assertGreater(result['marks_obtained'], 2.0)

    def test_contradiction_and_negation_detection(self):
        """
        Student writes a contradictory statement ('not divided', 'no provincial level').
        Engine must flag contradiction and avoid giving full marks.
        """
        student_answer = "Federalism means power is not divided and there is no provincial autonomy in the state."
        expert_solution = "Federalism is a constitutional division of power between federal and provincial levels."
        result = self.comparator.evaluate_answer(
            student_answer=student_answer,
            expert_solution=expert_solution,
            rubric=self.rubric,
            max_marks=5.0
        )
        self.assertTrue(result['metrics']['contradictions_found'] > 0 or result['status'] == 'needs_review' or result['marks_obtained'] < 3.0)

    def test_marks_bounds_enforcement(self):
        """Awarded marks must strictly satisfy 0 <= awarded <= max_marks."""
        student_answer = "Excessive text with everything duplicated " * 50
        result = self.comparator.evaluate_answer(
            student_answer=student_answer,
            expert_solution="Standard solution.",
            rubric=self.rubric,
            max_marks=5.0
        )
        self.assertLessEqual(result['marks_obtained'], 5.0)
        self.assertGreaterEqual(result['marks_obtained'], 0.0)


class EndToEndWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='eval_candidate', email='candidate@loksewa.gov.np', password='password123'
        )
        self.admin = User.objects.create_superuser(
            username='admin_evaluator', email='admin@loksewa.gov.np', password='adminpassword123'
        )
        self.category = ExamCategory.objects.create(name='Civil Service')
        self.position = Exam.objects.create(category=self.category, name='Section Officer')
        self.examination = Examination.objects.create(
            title='Subjective Governance Exam 2083',
            exam_type='subjective',
            category=self.category,
            exam=self.position,
            total_marks=20.0,
            passing_marks=8.0,
            total_questions=2,
            auto_publish_eligible=False,
            created_by=self.admin
        )
        self.q1 = Question.objects.create(
            question_type='subjective',
            text='Explain the concept of Good Governance and its major pillars in Nepal.',
            marks=10.0,
            status='approved',
            created_by=self.admin
        )
        self.q2 = Question.objects.create(
            question_type='subjective',
            text='Describe public accountability mechanisms under the Constitution of Nepal.',
            marks=10.0,
            status='approved',
            created_by=self.admin
        )
        self.eq1 = ExaminationQuestion.objects.create(
            examination=self.examination,
            question=self.q1,
            order=1,
            marks=10.0,
            question_number='Q1',
            model_solution='Good governance consists of rule of law, transparency, accountability, participation, and responsiveness.',
            rubric=[
                {'id': 'c1', 'description': 'Definition of Good Governance', 'max_marks': 4.0, 'expected_concepts': ['rule of law', 'transparency']},
                {'id': 'c2', 'description': 'Accountability and Participation', 'max_marks': 3.0, 'expected_concepts': ['accountability', 'participation']},
                {'id': 'c3', 'description': 'Conclusion and Legal Framework', 'max_marks': 3.0, 'expected_concepts': ['Good Governance Act 2064', 'effectiveness']},
            ]
        )
        self.eq2 = ExaminationQuestion.objects.create(
            examination=self.examination,
            question=self.q2,
            order=2,
            marks=10.0,
            question_number='Q2',
            model_solution='Public accountability is maintained through Parliamentary oversight, Auditor General audit, and CIAA.',
            rubric=[
                {'id': 'c1', 'description': 'Constitutional bodies', 'max_marks': 5.0, 'expected_concepts': ['Auditor General', 'CIAA']},
                {'id': 'c2', 'description': 'Parliamentary committees', 'max_marks': 5.0, 'expected_concepts': ['Public Accounts Committee', 'oversight']},
            ]
        )

        self.attempt = ExaminationAttempt.objects.create(
            examination=self.examination,
            student=self.user,
            status='submitted'
        )
        self.submission = SubjectiveSubmission.objects.create(
            attempt=self.attempt,
            page_count=2,
            file_size_bytes=10240,
            status='submitted'
        )

    def test_auto_marking_with_readable_text(self):
        self.submission.extracted_text = (
            "Q1. Good governance represents ethical governance characterized by rule of law, transparency, and participation. "
            "In Nepal, it is governed by the Good Governance Act 2064.\n\n"
            "Q2. Public accountability is enforced through constitutional institutions including the Auditor General and the CIAA, "
            "as well as the Public Accounts Committee through legislative oversight."
        )
        self.submission.ocr_status = 'completed'
        self.submission.save()

        service = SubjectiveAutoMarkingService()
        result = service.evaluate_submission(self.submission)

        self.submission.refresh_from_db()
        self.attempt.refresh_from_db()

        self.assertGreater(self.attempt.score, 0.0)
        self.assertLessEqual(self.attempt.score, 20.0)
        self.assertEqual(self.submission.question_scores.count(), 2)

        # Marks must not be published automatically if exam requires review
        self.assertFalse(self.submission.is_published)

    def test_low_ocr_confidence_triggers_review(self):
        """Unreadable handwriting must route to needs_review instead of failing silently."""
        self.submission.extracted_text = ""
        self.submission.raw_ocr_text = ""
        self.submission.ocr_status = 'failed'
        self.submission.save()

        service = SubjectiveAutoMarkingService()
        result = service.evaluate_submission(self.submission)

        self.submission.refresh_from_db()
        self.assertEqual(self.submission.evaluation_status, 'needs_review')
        self.assertFalse(self.submission.quality_gate_passed)
        self.assertFalse(self.submission.is_published)

    def test_idempotent_evaluation_no_duplicates(self):
        """Evaluating twice must update records atomically without duplicate question scores."""
        self.submission.extracted_text = "Q1. Good governance principles.\nQ2. Public accountability mechanisms."
        self.submission.ocr_status = 'completed'
        self.submission.save()

        service = SubjectiveAutoMarkingService()
        service.evaluate_submission(self.submission)
        count_first = self.submission.question_scores.count()

        service.evaluate_submission(self.submission)
        count_second = self.submission.question_scores.count()

        self.assertEqual(count_first, count_second)
        self.assertEqual(count_second, 2)
