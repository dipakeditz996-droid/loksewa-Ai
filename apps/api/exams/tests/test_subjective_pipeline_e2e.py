import io
import fitz
from tempfile import TemporaryDirectory
from PIL import Image
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status

from exams.models import (
    ExamCategory, Exam, Examination, ExaminationAttempt, ExaminationQuestion,
    Question, SubjectiveSubmission, SubjectiveSubmissionPage, SubjectiveQuestionScore
)
from exams.tasks import run_subjective_submission_processing, dispatch_subjective_submission_processing

User = get_user_model()


def create_text_pdf(text_pages):
    """Creates a real searchable PDF with PyMuPDF containing the given page texts."""
    doc = fitz.open()
    for text in text_pages:
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), text, fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    buf.seek(0)
    return buf.getvalue()


class SubjectivePipelineEndToEndTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls._media_directory = TemporaryDirectory()
        cls._storage_override = override_settings(
            STORAGES={
                'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
                'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
            },
            MEDIA_ROOT=cls._media_directory.name,
            CELERY_TASK_ALWAYS_EAGER=True,
        )
        cls._storage_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        cls._storage_override.disable()
        cls._media_directory.cleanup()
        super().tearDownClass()

    def setUp(self):
        self.student = User.objects.create_user(
            username='pipeline_student',
            email='student@pipeline.com',
            role='student',
            first_name='Student',
            last_name='User',
        )
        self.admin = User.objects.create_user(
            username='pipeline_admin',
            email='admin@pipeline.com',
            role='admin',
            first_name='Admin',
            last_name='Evaluator',
        )

        self.category = ExamCategory.objects.create(name='Civil Service')
        self.academic_exam = Exam.objects.create(name='Section Officer', category=self.category)

        self.exam = Examination.objects.create(
            title='Subjective Governance Exam',
            exam_type='subjective',
            category=self.category,
            exam=self.academic_exam,
            time_limit=180,
            upload_deadline_minutes=60,
            total_marks=20,
            passing_marks=8,
            total_questions=2,
            status='published',
            result_visibility='immediate',
        )

        # Create two subjective questions with rubrics
        self.q1 = Question.objects.create(
            text='Explain the core principles of good governance in public administration.',
            question_type='subjective',
            marks=10,
            model_answer='Good governance consists of transparency, accountability, rule of law, and citizen participation.',
        )
        self.eq1 = ExaminationQuestion.objects.create(
            examination=self.exam,
            question=self.q1,
            order=1,
            question_number='Q1',
            marks=10,
            evaluation_type='descriptive',
            model_solution=self.q1.model_answer,
            rubric=[
                {'criterion': 'Principles of Good Governance', 'max_marks': 5.0, 'keywords': ['transparency', 'accountability', 'rule of law']},
                {'criterion': 'Public Administration Context', 'max_marks': 5.0, 'keywords': ['citizen', 'public', 'participation']},
            ]
        )

        self.q2 = Question.objects.create(
            text='Discuss the role of local government in decentralized service delivery.',
            question_type='subjective',
            marks=10,
            model_answer='Local government provides direct public services, promotes grassroots democracy, and ensures equitable resource distribution.',
        )
        self.eq2 = ExaminationQuestion.objects.create(
            examination=self.exam,
            question=self.q2,
            order=2,
            question_number='Q2',
            marks=10,
            evaluation_type='analytical',
            model_solution=self.q2.model_answer,
            rubric=[
                {'criterion': 'Decentralization & Service Delivery', 'max_marks': 5.0, 'keywords': ['decentralization', 'service', 'delivery']},
                {'criterion': 'Grassroots Democracy & Equity', 'max_marks': 5.0, 'keywords': ['democracy', 'distribution', 'grassroots']},
            ]
        )

    def test_complete_subjective_answer_sheet_pipeline(self):
        """
        Tests complete pipeline:
        Student Attempt -> Upload PDF -> OCR & Text Extraction -> Question Mapping ->
        Provisional Scoring -> DB Persistence -> Status Polling -> Admin Review -> Publication
        """
        # 1. Start student attempt
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status='in-progress',
            started_at=timezone.now(),
        )

        # 2. Upload student answer sheet PDF (containing answers for Q1 and Q2)
        page1_content = (
            "Question 1\n"
            "The core principles of good governance include transparency, accountability, and the rule of law. "
            "Public administration must ensure active citizen participation and responsiveness to societal needs.\n"
        )
        page2_content = (
            "Question 2\n"
            "Local government plays an indispensable role in decentralized service delivery by bringing administration "
            "closer to the people. It fosters grassroots democracy and equitable resource distribution across communities.\n"
        )

        pdf_bytes = create_text_pdf([page1_content, page2_content])
        uploaded_file = SimpleUploadedFile(
            'answersheet_pipeline.pdf',
            pdf_bytes,
            content_type='application/pdf'
        )

        self.client.force_authenticate(user=self.student)
        upload_url = f"/api/student/exam-attempts/{attempt.id}/answer-sheet/"
        upload_res = self.client.post(upload_url, {'pdf_file': uploaded_file}, format='multipart')

        self.assertEqual(upload_res.status_code, status.HTTP_200_OK)
        submission_id = upload_res.data['submission_id']
        self.assertTrue(submission_id > 0)
        self.assertEqual(upload_res.data['page_count'], 2)
        self.assertIn('task_id', upload_res.data)

        # 3. Verify submission record exists and file is durably stored
        submission = SubjectiveSubmission.objects.get(id=submission_id)
        self.assertTrue(bool(submission.answer_pdf))
        self.assertEqual(submission.page_count, 2)

        # 4. Execute processing pipeline
        process_result = run_subjective_submission_processing(submission.id)
        self.assertIsNotNone(process_result)
        self.assertIn('submission_id', process_result)

        # 5. Verify OCR and extraction
        submission.refresh_from_db()
        self.assertEqual(submission.ocr_status, 'completed')
        self.assertIn('transparency', submission.raw_ocr_text.lower())
        self.assertIn('decentralized', submission.raw_ocr_text.lower())

        # 6. Verify question scores are calculated and persisted
        scores = list(submission.question_scores.order_by('question_number'))
        self.assertEqual(len(scores), 2)
        q1_score = scores[0]
        q2_score = scores[1]
        self.assertEqual(q1_score.question_number, 1)
        self.assertEqual(q2_score.question_number, 2)
        self.assertGreater(q1_score.marks_obtained, 0)
        self.assertLessEqual(q1_score.marks_obtained, 10)
        self.assertGreater(q2_score.marks_obtained, 0)
        self.assertLessEqual(q2_score.marks_obtained, 10)

        # 7. Check student checking-status endpoint returns accurate stage
        status_url = f"/api/student/exam-attempts/{attempt.id}/checking-status/"
        status_res = self.client.get(status_url)
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertTrue(status_res.data['has_submission'])
        self.assertEqual(status_res.data['ocr_status'], 'completed')
        self.assertIn(status_res.data['stage'], ['awaiting_review', 'published'])

        # 8. Admin reviews submissions list
        self.client.force_authenticate(user=self.admin)
        admin_subs_url = f"/api/admin/exams/{self.exam.id}/submissions/"
        admin_subs_res = self.client.get(admin_subs_url)
        self.assertEqual(admin_subs_res.status_code, status.HTTP_200_OK)
        sub_list = admin_subs_res.data if isinstance(admin_subs_res.data, list) else admin_subs_res.data.get('results', [])
        self.assertEqual(len(sub_list), 1)
        self.assertEqual(sub_list[0]['id'], submission.id)

        # 9. Admin checks detail view by attempt
        detail_url = f"/api/admin/subjective-submissions/by-attempt/{attempt.id}/"
        detail_res = self.client.get(detail_url)
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_res.data['question_scores']), 2)

        # 10. Admin publishes final result
        publish_url = f"/api/admin/subjective-submissions/{submission.id}/publish/"
        pub_res = self.client.post(publish_url)
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)

        submission.refresh_from_db()
        attempt.refresh_from_db()
        self.assertTrue(submission.is_published)
        self.assertEqual(attempt.status, 'evaluated')
        self.assertGreater(attempt.score, 0)

        # 11. Student can now see published result
        self.client.force_authenticate(user=self.student)
        student_res = self.client.get(f"/api/student/exam-attempts/{attempt.id}/result/")
        self.assertEqual(student_res.status_code, status.HTTP_200_OK)
        self.assertTrue(student_res.data['is_published'])
        self.assertEqual(student_res.data['score'], attempt.score)
