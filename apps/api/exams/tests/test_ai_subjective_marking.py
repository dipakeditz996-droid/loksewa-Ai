import io
from tempfile import TemporaryDirectory
from PIL import Image
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status

from exams.models import (
    ExamCategory, Exam, Examination, Question, ExaminationQuestion,
    ExaminationAttempt, SubjectiveSubmission, SubjectiveSubmissionPage,
    SubjectiveQuestionScore
)
from exams.subjective_expert_service import SubjectiveExpertSolutionService
from exams.subjective_auto_marking_service import SubjectiveAutoMarkingService, detect_student_answers_by_question

User = get_user_model()


def create_dummy_pdf(num_pages=1):
    """Generates a minimal valid in-memory PDF using Pillow."""
    images = [Image.new('RGB', (200, 200), color='white') for _ in range(num_pages)]
    buf = io.BytesIO()
    images[0].save(buf, format='PDF', save_all=True, append_images=images[1:])
    buf.seek(0)
    return buf.getvalue()


class AISubjectiveAutoMarkingTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls._media_directory = TemporaryDirectory()
        cls._storage_override = override_settings(
            STORAGES={
                'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
                'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
            },
            MEDIA_ROOT=cls._media_directory.name,
        )
        cls._storage_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._storage_override.disable()
        try:
            cls._media_directory.cleanup()
        except Exception:
            pass

    def setUp(self):
        # 1. Users
        self.admin = User.objects.create_superuser(
            username='admin_mark',
            email='admin_mark@loksewa.ai',
            password='Password123!',
            is_staff=True,
            role='admin'
        )

        self.student = User.objects.create_user(
            username='student_mark',
            email='student_mark@loksewa.ai',
            password='Password123!',
            role='student'
        )

        self.other_student = User.objects.create_user(
            username='other_mark',
            email='other_mark@loksewa.ai',
            password='Password123!',
            role='student'
        )

        # 2. Base Exam Structure
        self.category = ExamCategory.objects.create(name='Civil Services', order=1)
        self.academic_exam = Exam.objects.create(
            category=self.category,
            name='Section Officer Subjective',
            is_active=True
        )

        self.exam = Examination.objects.create(
            exam_type='subjective',
            title='Governance & Public Policy 2081',
            category=self.category,
            exam=self.academic_exam,
            time_limit=180,
            total_questions=3,
            total_marks=30,
            passing_marks=12,
            status='published',
            answer_upload_enabled=True,
            max_upload_size_mb=25,
        )

        # 3. Create canonical Questions and ExaminationQuestions
        self.q1 = Question.objects.create(
            text='Explain the concept of Good Governance and its 8 core characteristics.',
            question_type='subjective',
            marks=10
        )
        self.q2 = Question.objects.create(
            text='Analyze the Fiscal Federalism challenges in Nepal.',
            question_type='subjective',
            marks=12
        )
        self.q3 = Question.objects.create(
            text='Draw and explain the Public Policy Cycle diagram.',
            question_type='subjective',
            marks=8
        )

        self.eq1 = ExaminationQuestion.objects.create(
            examination=self.exam,
            question=self.q1,
            order=1,
            question_number='Q1',
            marks=10,
            evaluation_type='descriptive'
        )
        self.eq2 = ExaminationQuestion.objects.create(
            examination=self.exam,
            question=self.q2,
            order=2,
            question_number='Q2',
            marks=12,
            evaluation_type='descriptive'
        )
        self.eq3 = ExaminationQuestion.objects.create(
            examination=self.exam,
            question=self.q3,
            order=3,
            question_number='Q3',
            marks=8,
            evaluation_type='diagram'
        )

    # =========================================================================
    # 1. Admin Question Configuration Tests
    # =========================================================================

    def test_configure_subjective_questions_unequal_marks(self):
        """Admin can configure unequal maximum marks and total_marks updates accurately."""
        self.client.force_authenticate(user=self.admin)
        url = f"/api/admin/exams/{self.exam.id}/configure-subjective-questions/"
        payload = {
            "questions": [
                {"question_number": 1, "marks": 8, "evaluation_type": "descriptive", "text": "Q1 text"},
                {"question_number": 2, "marks": 10, "evaluation_type": "descriptive", "text": "Q2 text"},
                {"question_number": 3, "marks": 5, "evaluation_type": "numerical", "text": "Q3 text"},
                {"question_number": 4, "marks": 7, "evaluation_type": "diagram", "text": "Q4 text"},
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.exam.refresh_from_db()
        self.assertEqual(self.exam.total_questions, 4)
        self.assertEqual(self.exam.total_marks, 30)

    def test_configure_subjective_questions_rejects_duplicates_and_invalid_marks(self):
        """Duplicate question numbers or non-positive marks must be rejected."""
        self.client.force_authenticate(user=self.admin)
        url = f"/api/admin/exams/{self.exam.id}/configure-subjective-questions/"

        # Duplicate question number
        bad_payload = {
            "questions": [
                {"question_number": 1, "marks": 10},
                {"question_number": 1, "marks": 10},
            ]
        }
        resp = self.client.post(url, bad_payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Zero or negative marks
        bad_payload2 = {
            "questions": [
                {"question_number": 1, "marks": 0},
            ]
        }
        resp2 = self.client.post(url, bad_payload2, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 2. Expert Solution & Rubric Generation Tests
    # =========================================================================

    def test_rubric_totals_strictly_sum_to_question_maximum_marks(self):
        """SubjectiveExpertSolutionService._normalize_rubric_totals guarantees sum(criterion) == eq.marks."""
        criteria = [
            {"criterion": "Definition", "max_marks": 3.0},
            {"criterion": "Key principles", "max_marks": 3.0},
            {"criterion": "Critical analysis", "max_marks": 3.0},
            {"criterion": "Conclusion", "max_marks": 3.0},
        ]
        # Question has 10 marks total, criteria currently sum to 12.0
        normalized = SubjectiveExpertSolutionService._normalize_rubric_totals(criteria, 10.0)
        total_sum = sum(c['max_marks'] for c in normalized)
        self.assertAlmostEqual(total_sum, 10.0, places=2)

    def test_admin_update_and_approve_rubrics(self):
        """Admin can review, edit, and approve rubrics."""
        self.client.force_authenticate(user=self.admin)
        url = f"/api/admin/exams/{self.exam.id}/update-rubrics/"

        payload = {
            "rubrics": [
                {
                    "question_id": self.eq1.id,
                    "model_solution": "Official explanation of Good Governance...",
                    "rubric": [
                        {"criterion": "8 characteristics defined", "max_marks": 5.0},
                        {"criterion": "Constitutional relevance in Nepal", "max_marks": 5.0},
                    ],
                    "rubric_approved": True
                }
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.eq1.refresh_from_db()
        self.assertTrue(self.eq1.rubric_approved)
        self.assertEqual(self.eq1.rubric_version, 2)
        self.assertEqual(len(self.eq1.rubric), 2)

    # =========================================================================
    # 3. Question Number Detection & Mapping Tests
    # =========================================================================

    def test_question_number_regex_detection_english_and_nepali(self):
        """Detects varied English and Nepali question numbering formats."""
        sample_text = (
            "Q.No. 1\nGood Governance is the process of decision making.\n\n"
            "Question 2:\nFiscal federalism has vertical imbalance.\n\n"
            "प्रश्न नं. ३\nनीति चक्रको चित्र तल प्रस्तुत छ।\n"
        )
        parsed = detect_student_answers_by_question(sample_text)
        self.assertIn('Q1', parsed)
        self.assertIn('Q2', parsed)
        self.assertIn('Q3', parsed)
        self.assertIn("Good Governance", parsed['Q1']['text'])
        self.assertIn("Fiscal federalism", parsed['Q2']['text'])
        self.assertIn("नीति चक्र", parsed['Q3']['text'])

    def test_multi_page_answer_continuity(self):
        """Multi-page answer sheets map answers across pages and track page references."""
        pages = [
            {"page_number": 1, "text": "Q1: Definition of Good Governance part 1..."},
            {"page_number": 2, "text": "Q1 Continued: 8 characteristics include transparency and rule of law..."},
            {"page_number": 3, "text": "Q2: Fiscal Federalism explanation..."},
        ]
        parsed = detect_student_answers_by_question('', pages_data=pages)
        self.assertIn('Q1', parsed)
        self.assertIn('Q2', parsed)
        self.assertIn(1, parsed['Q1']['pages'])
        self.assertIn(2, parsed['Q1']['pages'])
        self.assertIn("part 1", parsed['Q1']['text'])
        self.assertIn("transparency", parsed['Q1']['text'])

    # =========================================================================
    # 4. Semantic Auto-Marking & Quality Gate Tests
    # =========================================================================

    def test_ocr_failure_does_not_award_zero_silently(self):
        """When student answer text cannot be read/extracted, route to needs_review, never silent 0."""
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='submitted'
        )
        submission = SubjectiveSubmission.objects.create(
            attempt=attempt,
            page_count=2,
            ocr_status='failed',
            ocr_error='Image blurry and handwriting illegible'
        )

        SubjectiveAutoMarkingService.auto_mark_submission(submission)
        submission.refresh_from_db()

        self.assertEqual(submission.evaluation_status, 'needs_review')
        self.assertFalse(submission.quality_gate_passed)
        self.assertTrue(any('OCR transcription unclear' in f or 'handwriting' in f for f in submission.quality_gate_details.get('flags', [])))

        # Check question scores: status must be needs_review, not marked as 0 wrong
        q_scores = submission.question_scores.all()
        for qs in q_scores:
            self.assertEqual(qs.status, 'needs_review')
            self.assertIn('OCR transcription unclear', qs.review_reason)

    def test_semantic_evaluation_with_criteria_and_feedback(self):
        """Simulate evaluation awarding criterion-level partial marks within bounds."""
        # Approve rubric for eq1
        self.eq1.rubric = [
            {"criterion": "Core concepts", "max_marks": 5.0},
            {"criterion": "Nepali context", "max_marks": 5.0},
        ]
        self.eq1.rubric_approved = True
        self.eq1.save()

        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='submitted'
        )
        submission = SubjectiveSubmission.objects.create(
            attempt=attempt,
            page_count=1,
            extracted_text="Q1: Good governance promotes transparency, rule of law, and accountability in Nepal."
        )

        with patch.object(SubjectiveAutoMarkingService, '_call_ai_evaluation') as mock_ai:
            mock_ai.return_value = {
                "marks_obtained": 8.0,
                "max_marks": 10.0,
                "confidence_score": 0.88,
                "status": "ai_evaluated",
                "review_reason": "",
                "criterion_scores": [
                    {"criterion_id": "c1", "description": "Core concepts", "max_marks": 5.0, "marks_obtained": 4.5, "feedback": "Good"},
                    {"criterion_id": "c2", "description": "Nepali context", "max_marks": 5.0, "marks_obtained": 3.5, "feedback": "Valid"},
                ],
                "strengths": ["Clear definition of accountability"],
                "improvements": ["Cite Article 51 of Constitution"],
                "overall_feedback": "Well structured answer."
            }

            SubjectiveAutoMarkingService.auto_mark_submission(submission)

        submission.refresh_from_db()
        q1_score = submission.question_scores.filter(question_number=1).first()
        self.assertIsNotNone(q1_score)
        self.assertEqual(q1_score.marks_obtained, 8.0)
        self.assertEqual(q1_score.max_marks, 10.0)
        self.assertEqual(len(q1_score.criterion_scores), 2)
        self.assertIn("Clear definition", q1_score.strengths)
        # Rubric snapshot is saved
        self.assertIsNotNone(q1_score.rubric_snapshot)

    # =========================================================================
    # 5. Admin Review & Result Publication Separation Tests
    # =========================================================================

    def test_admin_confirm_evaluation_and_audit_trail(self):
        """Admin can confirm evaluation, adjust marks, and record audit trail."""
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='submitted'
        )
        attempt.score = 15
        attempt.save()
        submission = SubjectiveSubmission.objects.create(
            attempt=attempt,
            evaluation_status='needs_review',
        )
        SubjectiveQuestionScore.objects.create(
            submission=submission,
            question_number=1,
            max_marks=10,
            marks_obtained=5,
            status='needs_review'
        )

        self.client.force_authenticate(user=self.admin)
        url = f"/api/admin/subjective-submissions/{submission.id}/confirm-evaluation/"
        resp = self.client.post(url, {"notes": "Verified handwriting manually"}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        submission.refresh_from_db()
        self.assertEqual(submission.evaluation_status, 'admin_confirmed')
        self.assertFalse(submission.is_published)  # Evaluation confirmed != published!
        self.assertEqual(len(submission.audit_trail), 1)
        self.assertEqual(submission.audit_trail[0]['action'], 'confirmed_evaluation')

    def test_student_cannot_view_marks_until_published(self):
        """AI evaluated marks remain 403 Forbidden to student until published."""
        self.exam.result_visibility = "manual"
        self.exam.save()
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='submitted',
            score=25
        )
        SubjectiveSubmission.objects.create(
            attempt=attempt,
            evaluation_status='ai_evaluated',
            is_published=False,
        )

        self.client.force_authenticate(user=self.student)
        url = f"/api/student/exam-attempts/{attempt.id}/result/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("currently being evaluated", resp.data.get("detail", ""))

    def test_other_student_cannot_access_submission(self):
        """Another student cannot access another student's attempt result."""
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='submitted'
        )
        self.client.force_authenticate(user=self.other_student)
        url = f"/api/student/exam-attempts/{attempt.id}/result/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
