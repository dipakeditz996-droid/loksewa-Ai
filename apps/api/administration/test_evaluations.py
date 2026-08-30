"""Tests for the Admin Evaluation module: the subjective-answer evaluation
queue (AdminEvaluationsView) and workspace (AdminEvaluationDetailView).
Real canonical models (SubjectiveAnswer/Evaluation/Question), no mocks."""
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question,
    SubjectivePracticeSet, SubjectiveAttempt, SubjectiveAnswer, Evaluation,
)

LIST_URL = '/api/admin/evaluations/'


def detail_url(pk):
    return f'/api/admin/evaluations/{pk}/'


class EvaluationTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teacher1', password='pw', role='teacher')
        self.other_teacher = User.objects.create_user(
            username='teacher2', password='pw', role='teacher')
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')
        self.other_student = User.objects.create_user(
            username='stu2', password='pw', role='student')

        category = ExamCategory.objects.create(name='Loksewa')
        exam = Exam.objects.create(category=category, name='Kharidar')
        paper = Paper.objects.create(exam=exam, name='First Paper')
        subject = Subject.objects.create(paper=paper, name='General Knowledge')
        chapter = Chapter.objects.create(subject=subject, title='Geography')
        self.topic = Topic.objects.create(chapter=chapter, name='Mountains')

        self.question = Question.objects.create(
            topic=self.topic, question_type='subjective', status='approved',
            text='Explain the significance of the Himalayas.',
            model_answer='Barrier effect, monsoon interception.',
            marks=10,
        )
        self.practice_set = SubjectivePracticeSet.objects.create(
            title='GK Practice', exam=exam, subject=subject, topic=self.topic,
            status='published',
        )
        self.practice_set.questions.add(self.question)

    def make_submitted_answer(self, student=None, marks=10):
        from django.utils import timezone
        student = student or self.student
        attempt = SubjectiveAttempt.objects.create(
            student=student, practice_set=self.practice_set, mode='practice',
            status='submitted', submitted_at=timezone.now(),
        )
        answer = SubjectiveAnswer.objects.create(
            attempt=attempt, question=self.question,
            answer_text='The Himalayas block cold winds.',
            status='submitted', submitted_at=timezone.now(), word_count=5,
        )
        return answer

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def as_teacher(self):
        self.client.force_authenticate(user=self.teacher)

    def as_student(self):
        self.client.force_authenticate(user=self.student)


class QueuePermissionTests(EvaluationTestBase):
    def test_anonymous_cannot_list(self):
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_cannot_list(self):
        self.as_student()
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_list(self):
        # IsEvaluatorUser: teachers are the app's own evaluator role, not
        # just admins - matches TeacherEvaluationViewSet's existing access.
        answer = self.make_submitted_answer()
        self.as_teacher()
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_admin_can_list(self):
        self.make_submitted_answer()
        self.as_admin()
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total'], 1)

    def test_anonymous_cannot_view_detail(self):
        answer = self.make_submitted_answer()
        self.assertEqual(self.client.get(detail_url(answer.id)).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_cannot_view_detail(self):
        answer = self.make_submitted_answer()
        self.as_student()
        self.assertEqual(self.client.get(detail_url(answer.id)).status_code, status.HTTP_403_FORBIDDEN)

    def test_authorized_evaluator_can_view_detail(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.get(detail_url(answer.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], answer.id)
        self.assertEqual(resp.data['student']['username'], 'stu1')
        self.assertEqual(resp.data['question']['model_answer'], 'Barrier effect, monsoon interception.')

    def test_anonymous_cannot_patch(self):
        answer = self.make_submitted_answer()
        resp = self.client.patch(detail_url(answer.id), {'marks_obtained': 5, 'feedback': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_cannot_patch(self):
        answer = self.make_submitted_answer()
        self.as_student()
        resp = self.client.patch(detail_url(answer.id), {'marks_obtained': 5, 'feedback': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class QueueListTests(EvaluationTestBase):
    def test_empty_queue(self):
        self.as_admin()
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['evaluations'], [])
        self.assertEqual(resp.data['total'], 0)

    def test_default_filter_is_submitted_status(self):
        submitted = self.make_submitted_answer()
        evaluated = self.make_submitted_answer(student=self.other_student)
        evaluated.status = 'evaluated'
        evaluated.save()

        self.as_admin()
        resp = self.client.get(LIST_URL)
        ids = [e['id'] for e in resp.data['evaluations']]
        self.assertIn(submitted.id, ids)
        self.assertNotIn(evaluated.id, ids)

    def test_status_all_returns_every_status(self):
        self.make_submitted_answer()
        evaluated = self.make_submitted_answer(student=self.other_student)
        evaluated.status = 'evaluated'
        evaluated.save()

        self.as_admin()
        resp = self.client.get(LIST_URL, {'status': 'all'})
        self.assertEqual(resp.data['total'], 2)

    def test_search_by_student_username(self):
        self.make_submitted_answer(student=self.student)
        self.make_submitted_answer(student=self.other_student)

        self.as_admin()
        resp = self.client.get(LIST_URL, {'status': 'all', 'search': 'stu1'})
        self.assertEqual(resp.data['total'], 1)
        self.assertEqual(resp.data['evaluations'][0]['student'], 'stu1')

    def test_pagination(self):
        for i in range(5):
            student = User.objects.create_user(username=f'bulk{i}', password='pw', role='student')
            self.make_submitted_answer(student=student)

        self.as_admin()
        resp = self.client.get(LIST_URL, {'page_size': 2, 'page': 1})
        self.assertEqual(resp.data['total'], 5)
        self.assertEqual(len(resp.data['evaluations']), 2)
        self.assertEqual(resp.data['totalPages'], 3)

        resp2 = self.client.get(LIST_URL, {'page_size': 2, 'page': 3})
        self.assertEqual(len(resp2.data['evaluations']), 1)

    def test_list_includes_exam_subject_context(self):
        self.make_submitted_answer()
        self.as_admin()
        resp = self.client.get(LIST_URL)
        row = resp.data['evaluations'][0]
        self.assertEqual(row['exam'], 'Kharidar')
        self.assertEqual(row['subject'], 'General Knowledge')

    def test_no_n_plus_one_regression(self):
        for i in range(8):
            student = User.objects.create_user(username=f'nplus1_{i}', password='pw', role='student')
            answer = self.make_submitted_answer(student=student)
            Evaluation.objects.create(answer=answer, evaluator=self.admin, marks_obtained=5, feedback='ok')
            answer.status = 'evaluated'
            answer.save()

        self.as_admin()
        with CaptureQueriesContext(connection) as ctx:
            resp = self.client.get(LIST_URL, {'status': 'evaluated', 'page_size': 8})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['evaluations']), 8)
        # A handful of fixed queries (count, page, auth) plus the single
        # select_related'd page query - NOT one query per row, which is
        # what the original implementation did via a per-row
        # Evaluation.objects.filter(answer=answer).first() call.
        self.assertLess(len(ctx.captured_queries), 10, msg=f"{len(ctx.captured_queries)} queries issued - looks like an N+1 regression")


class EvaluationActionTests(EvaluationTestBase):
    def test_marks_within_range_saves_successfully(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 7.5, 'feedback': 'Solid answer.', 'finalize': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['evaluation']['marks_obtained'], 7.5)
        self.assertEqual(resp.data['status'], 'under-review')

    def test_marks_exceeding_maximum_rejected(self):
        answer = self.make_submitted_answer()  # question.marks == 10
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 15, 'feedback': '', 'finalize': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marks_obtained', resp.data)
        answer.refresh_from_db()
        self.assertFalse(hasattr(answer, 'evaluation'))

    def test_negative_marks_rejected(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': -1, 'feedback': '', 'finalize': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_marks_rejected(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 'not-a-number', 'feedback': '', 'finalize': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_marks_rejected(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {'feedback': 'no marks given'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_finalize_true_marks_answer_evaluated(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 8, 'feedback': 'Great.', 'finalize': True,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'evaluated')
        answer.refresh_from_db()
        self.assertEqual(answer.status, 'evaluated')
        self.assertEqual(answer.evaluation.evaluator, self.admin)

    def test_finalize_false_marks_answer_under_review_not_evaluated(self):
        answer = self.make_submitted_answer()
        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 8, 'feedback': 'Draft feedback', 'finalize': False,
        }, format='json')
        self.assertEqual(resp.data['status'], 'under-review')
        answer.refresh_from_db()
        self.assertEqual(answer.status, 'under-review')

    def test_re_evaluating_an_already_evaluated_answer_is_allowed(self):
        # The backend already supports re-evaluation via update_or_create
        # (TeacherEvaluationViewSet.evaluate does the same) - the admin
        # endpoint must not add a new restriction that blocks it.
        answer = self.make_submitted_answer()
        Evaluation.objects.create(answer=answer, evaluator=self.teacher, marks_obtained=6, feedback='first pass')
        answer.status = 'evaluated'
        answer.save()

        self.as_admin()
        resp = self.client.patch(detail_url(answer.id), {
            'marks_obtained': 9, 'feedback': 'revised', 'finalize': True,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['evaluation']['marks_obtained'], 9)
        self.assertEqual(resp.data['evaluation']['evaluator_name'], 'admin1')

    def test_detail_not_found_for_unknown_id(self):
        self.as_admin()
        resp = self.client.get(detail_url(999999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_not_found_for_unknown_id(self):
        self.as_admin()
        resp = self.client.patch(detail_url(999999), {'marks_obtained': 1, 'feedback': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
