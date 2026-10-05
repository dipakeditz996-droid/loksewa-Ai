import os
import django
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic,
    Question, Examination, ExaminationQuestion, ExaminationAttempt,
    ExaminationRequest, StudentAnswer
)
from courses.models import Course, Enrollment

User = get_user_model()


class MockExamsE2EAuditTest(APITestCase):
    def setUp(self):
        # 1. Setup Academic Taxonomy
        self.category = ExamCategory.objects.create(name='PSC Nepal')
        self.exam_pos = Exam.objects.create(name='Nayab Subba', category=self.category)
        self.paper = Paper.objects.create(exam=self.exam_pos, name='First Paper')
        self.subject = Subject.objects.create(paper=self.paper, name='General Knowledge')
        self.chapter = Chapter.objects.create(subject=self.subject, title='History of Nepal')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Ancient Period')

        # 2. Setup Courses & Enrollments
        import uuid
        uid = uuid.uuid4().hex[:8]
        self.course_a = Course.objects.create(title='Course A (Authorized)', slug=f'course-a-{uid}', exam=self.exam_pos, status='published')
        self.course_b = Course.objects.create(title='Course B (Unauthorized)', slug=f'course-b-{uid}', exam=self.exam_pos, status='published')

        self.student_a = User.objects.create_user(username='student_a', password='password123', role='student')
        self.student_b = User.objects.create_user(username='student_b', password='password123', role='student')
        self.admin_user = User.objects.create_user(username='admin_audit', password='password123', role='admin')

        Enrollment.objects.create(student=self.student_a, course=self.course_a, status='active')
        Enrollment.objects.create(student=self.student_b, course=self.course_b, status='active')

        # 3. Setup Questions
        self.questions = []
        for i in range(1, 6):
            q = Question.objects.create(
                topic=self.topic,
                text=f'Question {i}: What is the capital of Nepal?',
                option_a='Pokhara',
                option_b='Kathmandu',
                option_c='Biratnagar',
                option_d='Lalitpur',
                correct_option='B',
                marks=2.0,
                difficulty='medium',
                status='approved',
                explanation=f'Kathmandu is the capital city of Nepal (Q{i}).',
                model_answer=f'Kathmandu is the official capital (Q{i}).'
            )
            self.questions.append(q)

        # Unrelated question not in the exam
        self.unrelated_question = Question.objects.create(
            topic=self.topic,
            text='Unrelated Question',
            option_a='A', option_b='B', option_c='C', option_d='D',
            correct_option='A', marks=1.0, status='approved'
        )

        # 4. Setup Examination in Course A
        self.exam_course_a = Examination.objects.create(
            title='Course A Mock Exam',
            exam_type='mock',
            objective_category='model',
            category=self.category,
            exam=self.exam_pos,
            course=self.course_a,
            total_questions=5,
            time_limit=30,
            total_marks=10.0,
            passing_marks=4.0,
            negative_marking=True,
            negative_marking_value=0.20,  # 20% deduction = 0.40 marks per wrong answer on 2-mark question
            show_correct_answers=True,
            status='published',
            created_by=self.admin_user
        )
        for idx, q in enumerate(self.questions):
            ExaminationQuestion.objects.create(
                examination=self.exam_course_a,
                question=q,
                order=idx,
                marks=q.marks
            )

        # 5. Setup Draft Exam (must NOT be visible to students)
        self.draft_exam = Examination.objects.create(
            title='Draft Exam Never Published',
            exam_type='mock',
            objective_category='model',
            category=self.category,
            exam=self.exam_pos,
            course=self.course_a,
            total_questions=5,
            time_limit=30,
            total_marks=10.0,
            status='draft',
            created_by=self.admin_user
        )

    def test_01_course_access_and_draft_isolation(self):
        """Student A sees Course A exams, not Course B or Drafts; Student B cannot access Course A."""
        self.client.force_authenticate(user=self.student_a)

        # List exams
        resp = self.client.get('/api/student/exams/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        exam_ids = [e['id'] for e in resp.data]
        self.assertIn(self.exam_course_a.id, exam_ids)
        self.assertNotIn(self.draft_exam.id, exam_ids, "Draft exam must never appear in student list!")

        # Student B tries to retrieve Course A exam
        self.client.force_authenticate(user=self.student_b)
        resp_b = self.client.get(f'/api/student/exams/{self.exam_course_a.id}/')
        self.assertIn(resp_b.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
                      "Student without course enrollment must be denied/hidden from accessing exam!")

    def test_02_request_admin_workflow(self):
        """Student must request admin approval for course-based mock exams before starting."""
        self.client.force_authenticate(user=self.student_a)

        # Direct start without approval must be blocked (403)
        start_resp = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        self.assertEqual(start_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin approval is required', start_resp.data.get('detail', ''))

        # Create request
        req_resp = self.client.post('/api/student/exam-requests/', {'examination': self.exam_course_a.id}, format='json')
        self.assertEqual(req_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(req_resp.data['status'], 'pending')
        request_id = req_resp.data['id']

        # Duplicate request must return existing without duplicate row
        dup_resp = self.client.post('/api/student/exam-requests/', {'examination': self.exam_course_a.id}, format='json')
        self.assertEqual(dup_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(dup_resp.data['id'], request_id)

        # Admin approves request
        self.client.force_authenticate(user=self.admin_user)
        approve_resp = self.client.post(f'/api/admin/exam-requests/{request_id}/approve/')
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data['status'], 'approved')

        # Student can now start
        self.client.force_authenticate(user=self.student_a)
        start_ok = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        self.assertEqual(start_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(start_ok.data['resumed'], False)
        attempt_id = start_ok.data['id']

        # Idempotent start: calling start again resumes the existing attempt
        start_resume = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        self.assertEqual(start_resume.status_code, status.HTTP_200_OK)
        self.assertEqual(start_resume.data['id'], attempt_id)
        self.assertEqual(start_resume.data['resumed'], True)

    def test_03_secure_question_serialization_and_stability(self):
        """Questions during in-progress attempt must not leak correct answer, and order must remain stable."""
        # Setup approved request & start attempt
        ExaminationRequest.objects.create(student=self.student_a, examination=self.exam_course_a, status='approved')
        self.client.force_authenticate(user=self.student_a)

        start_resp = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        attempt_id = start_resp.data['id']

        # Fetch questions
        q_resp = self.client.get(f'/api/student/exam-attempts/{attempt_id}/questions/')
        self.assertEqual(q_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(q_resp.data), 5)

        for q in q_resp.data:
            self.assertNotIn('correct_option', q, "In-progress questions must NEVER leak correct_option!")
            self.assertNotIn('explanation', q, "In-progress questions must NEVER leak explanation!")
            self.assertNotIn('model_answer', q, "In-progress questions must NEVER leak model_answer!")
            self.assertIn('text', q)
            self.assertIn('option_a', q)
            self.assertIn('option_b', q)

        # Refresh / second fetch - question ordering must be identical
        q_resp2 = self.client.get(f'/api/student/exam-attempts/{attempt_id}/questions/')
        self.assertEqual([q['id'] for q in q_resp.data], [q['id'] for q in q_resp2.data], "Question order must be stable across refreshes!")

    def test_04_answer_persistence_and_manipulation_security(self):
        """Test answering, persistence, rejecting foreign questions and foreign attempts."""
        ExaminationRequest.objects.create(student=self.student_a, examination=self.exam_course_a, status='approved')
        self.client.force_authenticate(user=self.student_a)
        start_resp = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        attempt_id = start_resp.data['id']

        # 1. Answer Q1: B
        ans_resp = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.questions[0].id,
            'selected_option': 'B'
        }, format='json')
        self.assertEqual(ans_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(ans_resp.data['status'], 'saved')

        # Verify DB persistence
        ans = StudentAnswer.objects.get(attempt_id=attempt_id, question=self.questions[0])
        self.assertEqual(ans.selected_option, 'B')

        # 2. Update answer: change to C
        ans_resp2 = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.questions[0].id,
            'selected_option': 'C'
        }, format='json')
        self.assertEqual(ans_resp2.status_code, status.HTTP_200_OK)
        ans.refresh_from_db()
        self.assertEqual(ans.selected_option, 'C')

        # 3. Security: Attempting to submit answer for unrelated question must fail
        bad_q_resp = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.unrelated_question.id,
            'selected_option': 'A'
        }, format='json')
        self.assertEqual(bad_q_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not belong', bad_q_resp.data.get('detail', ''))

        # 4. Security: Student B cannot submit answers to Student A's attempt
        self.client.force_authenticate(user=self.student_b)
        hijack_resp = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.questions[0].id,
            'selected_option': 'A'
        }, format='json')
        self.assertEqual(hijack_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_05_submission_scoring_negative_marking_and_xp(self):
        """Test exam submit, negative marking proportioned to question marks, result consistency, and XP."""
        from gamification.models import GamificationProfile

        ExaminationRequest.objects.create(student=self.student_a, examination=self.exam_course_a, status='approved')
        self.client.force_authenticate(user=self.student_a)
        start_resp = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        attempt_id = start_resp.data['id']

        # Profile XP before
        profile, _ = GamificationProfile.objects.get_or_create(user=self.student_a)
        xp_before = profile.xp

        # Answer 3 correct, 2 incorrect
        # Q1: B (Correct -> +2.0)
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.questions[0].id, 'selected_option': 'B'}, format='json')
        # Q2: B (Correct -> +2.0)
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.questions[1].id, 'selected_option': 'B'}, format='json')
        # Q3: B (Correct -> +2.0)
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.questions[2].id, 'selected_option': 'B'}, format='json')
        # Q4: A (Incorrect -> 20% penalty of 2.0 = -0.40)
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.questions[3].id, 'selected_option': 'A'}, format='json')
        # Q5: C (Incorrect -> 20% penalty of 2.0 = -0.40)
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.questions[4].id, 'selected_option': 'C'}, format='json')

        # Submit attempt
        submit_resp = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(submit_resp.status_code, status.HTTP_200_OK)

        # Expected score: 2 + 2 + 2 - 0.4 - 0.4 = 5.2 out of 10.0 (52.0%)
        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, 'submitted')
        self.assertAlmostEqual(attempt.score, 5.2, places=2)
        self.assertAlmostEqual(attempt.percentage, 52.0, places=1)
        self.assertTrue(attempt.passed)

        # Verify StudentAnswer marks_awarded consistency
        answers = StudentAnswer.objects.filter(attempt=attempt).order_by('question__id')
        self.assertEqual(answers[0].marks_awarded, 2.0)
        self.assertEqual(answers[1].marks_awarded, 2.0)
        self.assertEqual(answers[2].marks_awarded, 2.0)
        self.assertAlmostEqual(answers[3].marks_awarded, -0.40, places=2)
        self.assertAlmostEqual(answers[4].marks_awarded, -0.40, places=2)
        self.assertAlmostEqual(sum(a.marks_awarded for a in answers), attempt.score, places=2)

        # XP check
        profile.refresh_from_db()
        self.assertGreater(profile.xp, xp_before)
        xp_awarded = profile.xp - xp_before
        self.assertEqual(xp_awarded, 10 + int(52.0 / 10))  # 10 base + 5 = 15 XP

        # Idempotent submit test: second submit must NOT award XP again
        submit_resp2 = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(submit_resp2.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.xp - xp_before, 15, "XP must NEVER be duplicated on repeat submission!")

        # Post-submission Result View: student can view full solution and correct answers
        res_resp = self.client.get(f'/api/student/exam-attempts/{attempt_id}/result/')
        self.assertEqual(res_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(res_resp.data['score'], 5.2)
        self.assertEqual(res_resp.data['percentage'], 52.0)

        # Review questions post-submission now exposes correct_option and explanation
        q_review = self.client.get(f'/api/student/exam-attempts/{attempt_id}/questions/')
        self.assertEqual(q_review.status_code, status.HTTP_200_OK)
        self.assertEqual(q_review.data[0]['correct_option'], 'B')
        self.assertIn('Kathmandu', q_review.data[0]['explanation'])

    def test_06_timer_and_auto_submit_on_expiry(self):
        """Attempt past deadline must be auto-submitted by enforce_expiry."""
        from exams.attempt_timing import enforce_expiry

        ExaminationRequest.objects.create(student=self.student_a, examination=self.exam_course_a, status='approved')
        self.client.force_authenticate(user=self.student_a)
        start_resp = self.client.post(f'/api/student/exams/{self.exam_course_a.id}/start/')
        attempt_id = start_resp.data['id']

        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        # Fast forward attempt.started_at to 40 minutes ago (time limit is 30 min)
        attempt.started_at = timezone.now() - timezone.timedelta(minutes=40)
        attempt.save(update_fields=['started_at'])

        # Read attempt via API (get_object calls enforce_expiry)
        read_resp = self.client.get(f'/api/student/exam-attempts/{attempt_id}/')
        self.assertEqual(read_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(read_resp.data['status'], 'submitted')
        self.assertIsNotNone(read_resp.data['submitted_at'])
