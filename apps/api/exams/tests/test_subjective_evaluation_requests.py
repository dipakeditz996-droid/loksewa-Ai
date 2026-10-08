import io
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from tempfile import TemporaryDirectory

from exams.models import (
    ExamCategory, Exam, Paper, Subject,
    Examination, ExaminationAttempt, SubjectiveSubmission,
    SubjectiveCheckingRequest,
)

User = get_user_model()


class SubjectiveEvaluationRequestTests(APITestCase):
    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.admin = User.objects.create_user(username='admin_eval', password='password123', role='admin', is_staff=True)
        self.evaluator = User.objects.create_user(username='evaluator1', password='password123', role='teacher')
        self.student = User.objects.create_user(username='student_dipak', password='password123', role='student')
        self.other_student = User.objects.create_user(username='student_other', password='password123', role='student')

        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam_level = Exam.objects.create(name='Section Officer', category=self.category)
        self.paper = Paper.objects.create(exam=self.exam_level, name='Paper 1')
        self.subject = Subject.objects.create(paper=self.paper, name='Public Administration')

        # Published subjective exam
        self.subjective_exam = Examination.objects.create(
            title='Subjective Model Exam - Public Administration',
            exam_type='subjective',
            category=self.category,
            exam=self.exam_level,
            status='published',
            total_marks=100,
            passing_marks=40,
        )

        # Objective exam for negative testing
        self.objective_exam = Examination.objects.create(
            title='Objective Model Exam - General Knowledge',
            exam_type='mock',
            objective_category='model',
            category=self.category,
            exam=self.exam_level,
            status='published',
            total_marks=50,
            passing_marks=20,
        )

        # Student's submitted attempt for the subjective exam
        self.attempt = ExaminationAttempt.objects.create(
            examination=self.subjective_exam,
            student=self.student,
            status='submitted',
        )

        pdf_content = b"%PDF-1.4 test dummy answer sheet"
        uploaded_pdf = SimpleUploadedFile("answer_sheet.pdf", pdf_content, content_type="application/pdf")
        self.submission = SubjectiveSubmission.objects.create(
            attempt=self.attempt,
            status='submitted',
            answer_pdf=uploaded_pdf,
            page_count=2,
            file_size_bytes=len(pdf_content),
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    # -------------------------------------------------------------
    # 1. Student-Side Request Validations
    # -------------------------------------------------------------
    def test_student_can_request_evaluation_for_own_submitted_subjective_attempt(self):
        """Student can submit an evaluation request for their own submitted attempt."""
        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{self.attempt.id}/request-checking/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['student_id'], self.student.id)
        self.assertEqual(response.data['examination_title'], self.subjective_exam.title)

        # Verify record in DB
        req = SubjectiveCheckingRequest.objects.filter(submission=self.submission).first()
        self.assertIsNotNone(req)
        self.assertEqual(req.status, 'pending')
        self.assertEqual(req.student, self.student)

    def test_canonical_evaluation_request_endpoints(self):
        """Both canonical alias and nested endpoints work for evaluation request."""
        self.client.force_authenticate(user=self.student)
        # Test /api/student/exam-attempts/{id}/evaluation-request/
        url1 = f'/api/student/exam-attempts/{self.attempt.id}/evaluation-request/'
        response1 = self.client.post(url1)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.data['status'], 'pending')

        # Test duplicate return on canonical route
        url2 = f'/api/attempts/{self.attempt.id}/evaluation-request/'
        response2 = self.client.post(url2)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['status'], 'pending')

    def test_student_cannot_request_evaluation_for_another_student_attempt(self):
        """A student cannot request evaluation on someone else's attempt."""
        self.client.force_authenticate(user=self.other_student)
        url = f'/api/student/exam-attempts/{self.attempt.id}/request-checking/'
        response = self.client.post(url)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_student_cannot_request_evaluation_before_submission(self):
        """Draft or in-progress attempts cannot request evaluation."""
        in_progress_attempt = ExaminationAttempt.objects.create(
            examination=self.subjective_exam,
            student=self.student,
            status='started',
        )
        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{in_progress_attempt.id}/request-checking/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_request_evaluation_without_submitted_answer_sheet(self):
        """Attempts without submitted answer sheet cannot request evaluation."""
        attempt_without_pdf = ExaminationAttempt.objects.create(
            examination=self.subjective_exam,
            student=self.student,
            status='submitted',
        )
        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{attempt_without_pdf.id}/request-checking/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_objective_exam_cannot_use_subjective_evaluation_request(self):
        """Objective exams cannot use the subjective evaluation request endpoint."""
        obj_attempt = ExaminationAttempt.objects.create(
            examination=self.objective_exam,
            student=self.student,
            status='submitted',
        )
        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{obj_attempt.id}/request-checking/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_request_returns_existing_record_without_duplication(self):
        """Submitting multiple requests returns the existing request and creates no duplicate rows."""
        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{self.attempt.id}/request-checking/'
        resp1 = self.client.post(url)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Second request
        resp2 = self.client.post(url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data['id'], resp1.data['id'])
        self.assertEqual(resp2.data['status'], 'pending')

        # Total count remains exactly 1
        self.assertEqual(SubjectiveCheckingRequest.objects.filter(submission=self.submission).count(), 1)

    # -------------------------------------------------------------
    # 2. Admin Queue, Filtering & Detail
    # -------------------------------------------------------------
    def test_admin_can_view_evaluation_requests_and_filter(self):
        """Admin can list evaluation requests with search and status filters."""
        # Create requests
        req = SubjectiveCheckingRequest.objects.create(
            student=self.student,
            submission=self.submission,
            status='pending',
        )

        self.client.force_authenticate(user=self.admin)
        url = '/api/admin/subjective-checking-requests/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 1)
        self.assertEqual(resp.data[0]['id'], req.id)
        self.assertEqual(resp.data[0]['student_name'], self.student.username)
        self.assertEqual(resp.data[0]['examination_title'], self.subjective_exam.title)

        # Test filter by status
        resp_pending = self.client.get(f'{url}?status=pending')
        self.assertEqual(resp_pending.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_pending.data), 1)

        resp_rejected = self.client.get(f'{url}?status=rejected')
        self.assertEqual(resp_rejected.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_rejected.data), 0)

        # Test search
        resp_search = self.client.get(f'{url}?search=dipak')
        self.assertEqual(resp_search.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_search.data), 1)

    def test_admin_stats_endpoint(self):
        """Admin stats returns aggregated request counts."""
        SubjectiveCheckingRequest.objects.create(
            student=self.student,
            submission=self.submission,
            status='pending',
        )
        self.client.force_authenticate(user=self.admin)
        url = '/api/admin/subjective-checking-requests/stats/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['pending'], 1)
        self.assertEqual(resp.data['accepted'], 0)
        self.assertEqual(resp.data['rejected'], 0)

    # -------------------------------------------------------------
    # 3. Accept & Reject Workflow + Data Safety
    # -------------------------------------------------------------
    def test_admin_can_accept_evaluation_request(self):
        """Admin can accept pending request, transitioning to accepted state."""
        req = SubjectiveCheckingRequest.objects.create(
            student=self.student,
            submission=self.submission,
            status='pending',
        )

        self.client.force_authenticate(user=self.admin)
        url = f'/api/admin/subjective-checking-requests/{req.id}/accept/'
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'accepted')

        req.refresh_from_db()
        self.assertEqual(req.status, 'accepted')
        self.assertEqual(req.reviewed_by, self.admin)
        self.assertIsNotNone(req.reviewed_at)

    def test_admin_can_reject_evaluation_request_with_mandatory_reason(self):
        """Admin rejection requires non-empty reason and preserves historical data."""
        req = SubjectiveCheckingRequest.objects.create(
            student=self.student,
            submission=self.submission,
            status='pending',
        )

        self.client.force_authenticate(user=self.admin)
        url = f'/api/admin/subjective-checking-requests/{req.id}/reject/'

        # Empty reason rejected
        empty_resp = self.client.post(url, {'rejection_reason': '   '})
        self.assertEqual(empty_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid reason
        valid_reason = "The uploaded answer sheet is not legible. Please rescan and upload clear pages."
        resp = self.client.post(url, {'rejection_reason': valid_reason})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'rejected')
        self.assertEqual(resp.data['rejection_reason'], valid_reason)

        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        self.assertEqual(req.rejection_reason, valid_reason)
        self.assertEqual(req.reviewed_by, self.admin)

        # CRITICAL DATA SAFETY CHECK:
        # Attempt and Submission MUST NOT be deleted or altered
        self.attempt.refresh_from_db()
        self.submission.refresh_from_db()
        self.assertEqual(self.attempt.status, 'submitted')
        self.assertEqual(self.submission.status, 'submitted')
        self.assertTrue(bool(self.submission.answer_pdf))

    # -------------------------------------------------------------
    # 4. Student View of Status & Rejection Reason
    # -------------------------------------------------------------
    def test_student_can_view_evaluation_status_and_rejection_reason(self):
        """Student receives rejection reason on their checking status endpoint."""
        reason = "Evaluator capacity is currently full for this subject."
        SubjectiveCheckingRequest.objects.create(
            student=self.student,
            submission=self.submission,
            status='rejected',
            rejection_reason=reason,
        )

        self.client.force_authenticate(user=self.student)
        url = f'/api/student/exam-attempts/{self.attempt.id}/checking-status/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['has_submission'])
        self.assertIsNotNone(resp.data['checking_request'])
        self.assertEqual(resp.data['checking_request']['status'], 'rejected')
        self.assertEqual(resp.data['checking_request']['rejection_reason'], reason)

    # -------------------------------------------------------------
    # 5. Permission Restrictions
    # -------------------------------------------------------------
    def test_anonymous_and_student_cannot_access_admin_queue(self):
        """Anonymous and standard student accounts are forbidden from admin evaluation queue."""
        url = '/api/admin/subjective-checking-requests/'

        # Anonymous
        anon_resp = self.client.get(url)
        self.assertEqual(anon_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Student
        self.client.force_authenticate(user=self.student)
        stu_resp = self.client.get(url)
        self.assertEqual(stu_resp.status_code, status.HTTP_403_FORBIDDEN)
