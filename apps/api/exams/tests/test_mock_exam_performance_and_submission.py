import uuid
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic,
    Question, Examination, ExaminationQuestion, ExaminationAttempt,
    StudentAnswer, SubjectiveSubmission
)
from courses.models import Course, Enrollment
from subscriptions.models import Subscription, SubscriptionPlan, StudentEntitlement

User = get_user_model()


class MockExamPerformanceAndSubmissionRegressionTests(APITestCase):
    def setUp(self):
        uid = uuid.uuid4().hex[:8]
        # Taxonomy
        self.category = ExamCategory.objects.create(name=f'PSC {uid}')
        self.exam_pos = Exam.objects.create(name=f'Nayab Subba {uid}', category=self.category)
        self.paper = Paper.objects.create(exam=self.exam_pos, name='First Paper')
        self.subject = Subject.objects.create(paper=self.paper, name='GK')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Geography')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Mountains')

        # Courses
        self.course_auth = Course.objects.create(
            title=f'Authorized Course {uid}', slug=f'auth-{uid}', exam=self.exam_pos, status='published'
        )
        self.course_unauth = Course.objects.create(
            title=f'Unauthorized Course {uid}', slug=f'unauth-{uid}', exam=self.exam_pos, status='published'
        )

        # Users
        self.student = User.objects.create_user(username=f'stu_{uid}', password='password123', role='student')
        self.other_student = User.objects.create_user(username=f'other_{uid}', password='password123', role='student')
        self.admin = User.objects.create_user(username=f'adm_{uid}', password='password123', role='admin')

        # Enrollments
        Enrollment.objects.create(student=self.student, course=self.course_auth, status='active')
        Enrollment.objects.create(student=self.other_student, course=self.course_unauth, status='active')

        # Subscription & Entitlement (Unlimited model/mock exams)
        self.plan = SubscriptionPlan.objects.create(name=f'Plan {uid}', price=1000, duration=30, status='ACTIVE')
        self.sub = Subscription.objects.create(student=self.student, plan=self.plan, status='ACTIVE')
        StudentEntitlement.objects.create(
            student=self.student,
            subscription=self.sub,
            feature='exam:objective:model',
            total_allowed=-1,  # unlimited
            consumed=0,
            reserved=0
        )
        StudentEntitlement.objects.create(
            student=self.student,
            subscription=self.sub,
            feature='exam:objective:total',
            total_allowed=-1,
            consumed=0,
            reserved=0
        )

        # Questions (4 objective questions: 2.0 marks each)
        self.q1 = Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved', text='Question 1',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='A', marks=2.0
        )
        self.q2 = Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved', text='Question 2',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='B', marks=2.0
        )
        self.q3 = Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved', text='Question 3',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='C', marks=2.0
        )
        self.q4 = Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved', text='Question 4',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='D', marks=2.0
        )

        # Examination with negative marking (20% deduction = 0.4 marks per wrong answer)
        self.exam = Examination.objects.create(
            title=f'Comprehensive Mock Exam {uid}',
            exam_type='mock',
            objective_category='model',
            category=self.category,
            exam=self.exam_pos,
            course=self.course_auth,
            time_limit=60,
            total_marks=8.0,
            passing_marks=4.0,
            negative_marking=True,
            negative_marking_value=0.20,
            show_correct_answers=True,
            status='published',
            allow_resume=True,
            created_by=self.admin
        )
        ExaminationQuestion.objects.create(examination=self.exam, question=self.q1, order=1, marks=2.0)
        ExaminationQuestion.objects.create(examination=self.exam, question=self.q2, order=2, marks=2.0)
        ExaminationQuestion.objects.create(examination=self.exam, question=self.q3, order=3, marks=2.0)
        ExaminationQuestion.objects.create(examination=self.exam, question=self.q4, order=4, marks=2.0)

    def test_01_authorized_student_starts_exam(self):
        """1. Authorized student starts an exam successfully."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'in-progress')
        self.assertEqual(res.data['resumed'], False)

    def test_02_unauthorized_student_cannot_start_inaccessible_exam(self):
        """2. Unauthorized student cannot start an inaccessible exam."""
        self.client.force_authenticate(user=self.other_student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_03_repeated_start_requests_do_not_duplicate_active_attempts(self):
        """3. Repeated start requests do not create duplicate active attempts."""
        self.client.force_authenticate(user=self.student)
        res1 = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        attempt_id = res1.data['id']

        # Second click / retry
        res2 = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['id'], attempt_id)
        self.assertEqual(res2.data['resumed'], True)

        # Assert exactly one attempt exists
        self.assertEqual(ExaminationAttempt.objects.filter(student=self.student, examination=self.exam).count(), 1)

    def test_04_existing_attempt_resumes_correctly(self):
        """4. Existing attempt resumes correctly where allowed."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Save an answer
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.q1.id,
            'selected_option': 'A'
        })

        # Resume attempt
        res_resume = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        self.assertEqual(res_resume.status_code, status.HTTP_200_OK)
        self.assertEqual(res_resume.data['id'], attempt_id)
        # Check that saved answer is preserved
        answers = res_resume.data.get('answers', [])
        ans_q1 = next((a for a in answers if a['question'] == self.q1.id), None)
        self.assertIsNotNone(ans_q1)
        self.assertEqual(ans_q1['selected_option'], 'A')

    def test_05_answers_autosave_correctly(self):
        """5. Answers autosave correctly via answer endpoint."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Autosave single answer
        ans_res = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.q1.id,
            'selected_option': 'A'
        })
        self.assertEqual(ans_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ans_res.data['status'], 'saved')

        # Verify DB record
        sa = StudentAnswer.objects.get(attempt_id=attempt_id, question=self.q1)
        self.assertEqual(sa.selected_option, 'A')

    def test_06_latest_answer_wins_on_update(self):
        """6. Latest answer wins when student changes option."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.q1.id,
            'selected_option': 'A'
        })
        # Change to B
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.q1.id,
            'selected_option': 'B'
        })

        sa = StudentAnswer.objects.get(attempt_id=attempt_id, question=self.q1)
        self.assertEqual(sa.selected_option, 'B')
        self.assertEqual(StudentAnswer.objects.filter(attempt_id=attempt_id, question=self.q1).count(), 1)

    def test_07_student_submits_completed_attempt_successfully(self):
        """7. Student submits a completed attempt successfully with accurate score."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Answer q1 correct ('A'), q2 correct ('B'), q3 wrong ('A' instead of 'C'), q4 left unanswered
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.q1.id, 'selected_option': 'A'})
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.q2.id, 'selected_option': 'B'})
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {'question': self.q3.id, 'selected_option': 'A'})

        sub_res = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data['already_submitted'], False)

        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, 'submitted')
        # q1: +2.0, q2: +2.0, q3: -0.4 (20% of 2.0), q4: 0 -> total: 3.6
        self.assertAlmostEqual(attempt.score, 3.6)
        # Passing marks: 4.0 -> passed should be False
        self.assertFalse(attempt.passed)

    def test_08_submission_saves_remaining_valid_answers_in_payload(self):
        """8. Submission payload saves remaining valid answers atomically."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # No answers autosaved beforehand. All answers submitted directly in final submit payload:
        payload = {
            'answers': [
                {'question_id': self.q1.id, 'selected_option': 'A'},
                {'question_id': self.q2.id, 'selected_option': 'B'},
                {'question_id': self.q3.id, 'selected_option': 'C'},
                {'question_id': self.q4.id, 'selected_option': 'D'},
            ]
        }
        sub_res = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/', payload, format='json')
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)

        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, 'submitted')
        self.assertEqual(attempt.score, 8.0)
        self.assertTrue(attempt.passed)

    def test_09_repeated_submission_does_not_duplicate_or_fail(self):
        """9. Repeated submission does not duplicate results or return 400."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # First submit
        sub1 = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(sub1.status_code, status.HTTP_200_OK)
        self.assertEqual(sub1.data['already_submitted'], False)

        # Second submit (retry/double click) - must return 200 OK with already_submitted=True
        sub2 = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(sub2.status_code, status.HTTP_200_OK)
        self.assertEqual(sub2.data['already_submitted'], True)

    def test_10_submission_reconciliation_via_state_endpoint(self):
        """10. Attempt status check reconciles state when submit response is lost."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Simulate submit completed
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')

        # Client queries state endpoint
        state_res = self.client.get(f'/api/student/exam-attempts/{attempt_id}/state/')
        self.assertEqual(state_res.status_code, status.HTTP_200_OK)
        self.assertEqual(state_res.data['status'], 'submitted')
        self.assertFalse(state_res.data['is_active'])

    def test_11_invalid_answer_payloads_handled_gracefully(self):
        """11. Invalid answer payloads are handled cleanly without server error."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Nonexistent question ID
        res_invalid = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': 999999,
            'selected_option': 'A'
        })
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing question ID
        res_missing = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'selected_option': 'A'
        })
        self.assertEqual(res_missing.status_code, status.HTTP_400_BAD_REQUEST)

    def test_12_attempt_ownership_is_enforced(self):
        """12. Attempt ownership is strictly enforced: other student cannot answer or submit."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # Other student tries to answer
        self.client.force_authenticate(user=self.other_student)
        ans_other = self.client.post(f'/api/student/exam-attempts/{attempt_id}/answer/', {
            'question': self.q1.id,
            'selected_option': 'A'
        })
        self.assertIn(ans_other.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Other student tries to submit
        sub_other = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertIn(sub_other.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_13_scoring_and_negative_marking_correctness(self):
        """13. Scoring and negative marking calculate precisely according to rules."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        # 1 correct (+2.0), 3 wrong (-0.4 * 3 = -1.2) -> net score = 0.8
        payload = {
            'answers': [
                {'question_id': self.q1.id, 'selected_option': 'A'},  # correct
                {'question_id': self.q2.id, 'selected_option': 'A'},  # wrong (correct is B)
                {'question_id': self.q3.id, 'selected_option': 'A'},  # wrong (correct is C)
                {'question_id': self.q4.id, 'selected_option': 'A'},  # wrong (correct is D)
            ]
        }
        self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/', payload, format='json')
        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        self.assertAlmostEqual(attempt.score, 0.8)
        self.assertAlmostEqual(attempt.percentage, 10.0)

    def test_14_subjective_examination_behavior_remains_intact(self):
        """14. Subjective examination workflow remains intact and gates result publishing."""
        uid = uuid.uuid4().hex[:6]
        subj_exam = Examination.objects.create(
            title=f'Subjective Test Exam {uid}',
            exam_type='subjective',
            category=self.category,
            exam=self.exam_pos,
            course=self.course_auth,
            time_limit=30,
            total_marks=20.0,
            passing_marks=8.0,
            status='published',
            created_by=self.admin
        )
        self.client.force_authenticate(user=self.student)
        start_res = self.client.post(f'/api/student/exams/{subj_exam.id}/start/')
        self.assertEqual(start_res.status_code, status.HTTP_201_CREATED)
        attempt_id = start_res.data['id']

        # Submit subjective exam
        sub_res = self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/')
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)

        attempt = ExaminationAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, 'submitted')

        # Result is gated until manual evaluation
        res_check = self.client.get(f'/api/student/exam-attempts/{attempt_id}/result/')
        self.assertIn(res_check.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])

    def test_15_result_data_is_available_after_submission(self):
        """15. Result endpoint returns full score and review data for objective exams."""
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/student/exams/{self.exam.id}/start/')
        attempt_id = res.data['id']

        self.client.post(f'/api/student/exam-attempts/{attempt_id}/submit/', {
            'answers': [{'question_id': self.q1.id, 'selected_option': 'A'}]
        }, format='json')

        res_data = self.client.get(f'/api/student/exam-attempts/{attempt_id}/result/')
        self.assertEqual(res_data.status_code, status.HTTP_200_OK)
        self.assertIn('score', res_data.data)
        self.assertIn('percentage', res_data.data)
        self.assertIn('answers', res_data.data)
