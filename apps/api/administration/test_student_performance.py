"""Tests for Admin Student Performance & Detailed Exam Review."""
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import (
    Chapter, Exam, ExamCategory, Examination, ExaminationAttempt,
    ExaminationQuestion, Paper, PracticeSession, Question, StudentAnswer,
    Subject, Topic,
)
from gamification.models import GamificationProfile


class PerformanceTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='padmin', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='pteacher', password='pw', role='teacher')
        self.student = User.objects.create_user(
            username='pstudent', password='pw', role='student',
            email='pstudent@example.com', first_name='Pra', last_name='Student')
        self.other_student = User.objects.create_user(
            username='pother', password='pw', role='student')

        profile, _ = GamificationProfile.objects.get_or_create(user=self.student)
        profile.xp = 1240
        profile.level = 5
        profile.study_current_streak = 5
        profile.save()

        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(category=self.category, name='Kharidar')
        self.paper = Paper.objects.create(exam=self.exam, name='Paper I')

        # Two subjects so subject aggregation has something to separate.
        self.constitution = Subject.objects.create(paper=self.paper, name='Constitution')
        self.geography = Subject.objects.create(paper=self.paper, name='Geography')
        self.ch_rights = Chapter.objects.create(subject=self.constitution, title='Rights')
        self.ch_rivers = Chapter.objects.create(subject=self.geography, title='Rivers')
        self.topic_fundamental = Topic.objects.create(
            chapter=self.ch_rights, name='Fundamental Rights')
        self.topic_rivers = Topic.objects.create(chapter=self.ch_rivers, name='Major Rivers')

        self.examination = Examination.objects.create(
            title='GK Mock', exam_type='mock', category=self.category,
            exam=self.exam, time_limit=60, total_marks=5, total_questions=5,
        )

        self.questions = []
        for i in range(5):
            topic = self.topic_fundamental if i < 3 else self.topic_rivers
            q = Question.objects.create(
                topic=topic, text=f'Q{i}', question_type='mcq', status='approved',
                difficulty='easy' if i < 2 else 'hard', marks=1,
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='A', explanation=f'Because {i}',
            )
            ExaminationQuestion.objects.create(
                examination=self.examination, question=q, order=i + 1, marks=1)
            self.questions.append(q)

        self.url = f'/api/admin/students/{self.student.id}/performance/'

    def make_attempt(self, student=None, percentage=80.0, passed=True, answers=None):
        """answers: list of (question_index, selected_option or None, is_correct)."""
        attempt = ExaminationAttempt.objects.create(
            examination=self.examination, student=student or self.student,
            status='evaluated', score=percentage / 20, percentage=percentage,
            passed=passed, time_taken_seconds=600,
        )
        attempt.submitted_at = timezone.now()
        attempt.save(update_fields=['submitted_at'])
        for idx, selected, correct in (answers or []):
            StudentAnswer.objects.create(
                attempt=attempt, question=self.questions[idx],
                selected_option=selected, is_correct=correct,
                marks_awarded=1 if correct else 0,
            )
        return attempt

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)


class PermissionTests(PerformanceTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(self.url).status_code,
                         status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(self.url).status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_teacher_rejected(self):
        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get(self.url).status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_admin_allowed(self):
        self.as_admin()
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_review_and_history_are_admin_only(self):
        attempt = self.make_attempt()
        self.client.force_authenticate(user=self.student)
        self.assertEqual(
            self.client.get(f'/api/admin/exam-attempts/{attempt.id}/review/').status_code,
            status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.get(f'/api/admin/students/{self.student.id}/exam-history/').status_code,
            status.HTTP_403_FORBIDDEN)

    def test_non_student_id_returns_404(self):
        self.as_admin()
        res = self.client.get(f'/api/admin/students/{self.teacher.id}/performance/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_sensitive_fields_exposed(self):
        self.as_admin()
        body = str(self.client.get(self.url).data)
        for leaked in ('password', 'token', 'secret'):
            self.assertNotIn(leaked, body.lower())


class EmptyStateTests(PerformanceTestBase):
    def test_student_with_no_attempts_returns_valid_zeros(self):
        self.as_admin()
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        exam = res.data['exam_performance']
        self.assertEqual(exam['total_attempted'], 0)
        self.assertEqual(exam['total_completed'], 0)
        self.assertEqual(exam['average_percentage'], 0)
        self.assertEqual(res.data['subjects'], [])
        self.assertEqual(res.data['topics'], [])
        self.assertEqual(res.data['weak_topics'], [])
        self.assertEqual(res.data['trend']['points'], [])
        self.assertIsNone(res.data['trend']['improvement'])
        self.assertIsNone(res.data['mistake_analysis']['weakest_subject'])

    def test_profile_values_still_returned_without_attempts(self):
        self.as_admin()
        student = self.client.get(self.url).data['student']
        self.assertEqual(student['xp'], 1240)
        self.assertEqual(student['level'], 5)
        self.assertEqual(student['streak'], 5)


class AnswerCountingTests(PerformanceTestBase):
    def test_correct_wrong_and_skipped_are_counted_separately(self):
        # 2 correct, 1 wrong, 1 skipped (null), 1 skipped (empty string)
        self.make_attempt(answers=[
            (0, 'A', True), (1, 'A', True),
            (2, 'B', False),
            (3, None, False),
            (4, '', False),
        ])
        self.as_admin()
        exam = self.client.get(self.url).data['exam_performance']
        self.assertEqual(exam['correct'], 2)
        self.assertEqual(exam['incorrect'], 1)
        self.assertEqual(exam['skipped'], 2)
        self.assertEqual(exam['questions_attempted'], 5)
        # Accuracy is measured against answered questions only: 2 of 3.
        self.assertEqual(exam['accuracy'], 66.67)

    def test_other_students_answers_are_not_counted(self):
        self.make_attempt(answers=[(0, 'A', True)])
        self.make_attempt(student=self.other_student,
                          answers=[(1, 'A', True), (2, 'A', True)])
        self.as_admin()
        exam = self.client.get(self.url).data['exam_performance']
        self.assertEqual(exam['questions_attempted'], 1)

    def test_pass_and_fail_counts(self):
        self.make_attempt(percentage=90, passed=True)
        self.make_attempt(percentage=30, passed=False)
        self.as_admin()
        exam = self.client.get(self.url).data['exam_performance']
        self.assertEqual(exam['pass_count'], 1)
        self.assertEqual(exam['fail_count'], 1)
        self.assertEqual(exam['highest_score'], 90)
        self.assertEqual(exam['lowest_score'], 30)


class SubjectTopicAggregationTests(PerformanceTestBase):
    def test_subject_aggregation_splits_by_subject(self):
        # Constitution (q0-q2): 1 correct of 3.  Geography (q3-q4): 2 of 2.
        self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, 'B', False),
            (3, 'A', True), (4, 'A', True),
        ])
        self.as_admin()
        subjects = {s['subject_name']: s for s in self.client.get(self.url).data['subjects']}
        self.assertEqual(subjects['Constitution']['correct'], 1)
        self.assertEqual(subjects['Constitution']['incorrect'], 2)
        self.assertEqual(subjects['Constitution']['accuracy'], 33.33)
        self.assertEqual(subjects['Geography']['accuracy'], 100.0)

    def test_subjects_sorted_strongest_first(self):
        self.make_attempt(answers=[
            (0, 'B', False), (1, 'B', False), (2, 'B', False),
            (3, 'A', True), (4, 'A', True),
        ])
        self.as_admin()
        names = [s['subject_name'] for s in self.client.get(self.url).data['subjects']]
        self.assertEqual(names[0], 'Geography')
        self.assertEqual(names[-1], 'Constitution')

    def test_topic_aggregation(self):
        self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, 'B', False),
            (3, 'A', True), (4, 'A', True),
        ])
        self.as_admin()
        topics = {t['topic_name']: t for t in self.client.get(self.url).data['topics']}
        self.assertEqual(topics['Fundamental Rights']['accuracy'], 33.33)
        self.assertEqual(topics['Fundamental Rights']['subject_name'], 'Constitution')
        self.assertEqual(topics['Major Rivers']['accuracy'], 100.0)

    def test_weak_topic_uses_the_sixty_percent_rule(self):
        self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, 'B', False),   # 33% -> weak
            (3, 'A', True), (4, 'A', True),                     # 100% but only 2 answers
        ])
        self.as_admin()
        data = self.client.get(self.url).data
        weak_names = [t['topic_name'] for t in data['weak_topics']]
        self.assertIn('Fundamental Rights', weak_names)
        self.assertEqual(data['meta']['weak_accuracy_threshold'], 60)

    def test_thin_evidence_is_not_labelled_weak(self):
        """One wrong answer must not brand a topic as a weakness."""
        self.make_attempt(answers=[(3, 'B', False)])
        self.as_admin()
        data = self.client.get(self.url).data
        self.assertEqual(data['weak_topics'], [])
        self.assertEqual(data['strong_topics'], [])
        # It still appears in the raw topic list.
        self.assertEqual(len(data['topics']), 1)

    def test_mistake_analysis_identifies_weakest_area(self):
        """Both subjects need enough answers before they can be compared."""
        # Constitution: 3 answers, all wrong.  Geography: 3 answers, all right
        # (q3/q4 plus a second pass at q3 in another attempt).
        self.make_attempt(answers=[
            (0, 'B', False), (1, 'B', False), (2, 'B', False),
            (3, 'A', True), (4, 'A', True),
        ])
        self.make_attempt(answers=[(3, 'A', True)])
        self.as_admin()
        analysis = self.client.get(self.url).data['mistake_analysis']
        self.assertEqual(analysis['weakest_subject']['subject_name'], 'Constitution')
        self.assertEqual(analysis['best_subject']['subject_name'], 'Geography')
        self.assertEqual(analysis['total_wrong'], 3)

    def test_best_and_weakest_need_two_subjects_to_compare(self):
        """A lone qualifying subject must not be reported as both."""
        self.make_attempt(answers=[
            (0, 'B', False), (1, 'B', False), (2, 'B', False),   # Constitution only
        ])
        self.as_admin()
        analysis = self.client.get(self.url).data['mistake_analysis']
        self.assertIsNone(analysis['best_subject'])
        self.assertIsNone(analysis['weakest_subject'])


class TrendTests(PerformanceTestBase):
    def test_trend_is_chronological(self):
        for pct in (40, 55, 70, 85):
            self.make_attempt(percentage=pct)
        self.as_admin()
        trend = self.client.get(self.url).data['trend']
        self.assertEqual([p['percentage'] for p in trend['points']], [40, 55, 70, 85])
        # Second half averaged 77.5 against 47.5 -> +30.
        self.assertEqual(trend['improvement'], 30.0)

    def test_improvement_is_null_without_enough_points(self):
        self.make_attempt(percentage=50)
        self.as_admin()
        self.assertIsNone(self.client.get(self.url).data['trend']['improvement'])


class ExamHistoryTests(PerformanceTestBase):
    def setUp(self):
        super().setUp()
        self.history_url = f'/api/admin/students/{self.student.id}/exam-history/'

    def test_history_rows_carry_answer_breakdown(self):
        self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, None, False),
        ])
        self.as_admin()
        row = self.client.get(self.history_url).data['results'][0]
        self.assertEqual(row['correct'], 1)
        self.assertEqual(row['incorrect'], 1)
        self.assertEqual(row['skipped'], 1)

    def test_pagination(self):
        for i in range(7):
            self.make_attempt(percentage=50 + i)
        self.as_admin()
        p1 = self.client.get(self.history_url, {'page_size': 3, 'page': 1})
        p2 = self.client.get(self.history_url, {'page_size': 3, 'page': 2})
        self.assertEqual(p1.data['count'], 7)
        self.assertEqual(len(p1.data['results']), 3)
        self.assertTrue(p1.data['has_next'])
        ids1 = {r['attempt_id'] for r in p1.data['results']}
        ids2 = {r['attempt_id'] for r in p2.data['results']}
        self.assertEqual(ids1 & ids2, set())

    def test_result_filter(self):
        self.make_attempt(percentage=90, passed=True)
        self.make_attempt(percentage=20, passed=False)
        self.as_admin()
        passed = self.client.get(self.history_url, {'result': 'passed'})
        self.assertEqual(passed.data['count'], 1)
        self.assertTrue(passed.data['results'][0]['passed'])
        failed = self.client.get(self.history_url, {'result': 'failed'})
        self.assertEqual(failed.data['count'], 1)

    def test_exam_type_filter(self):
        self.make_attempt()
        self.as_admin()
        self.assertEqual(self.client.get(self.history_url, {'exam_type': 'mock'}).data['count'], 1)
        self.assertEqual(self.client.get(self.history_url, {'exam_type': 'practice'}).data['count'], 0)

    def test_only_this_students_attempts(self):
        self.make_attempt()
        self.make_attempt(student=self.other_student)
        self.as_admin()
        self.assertEqual(self.client.get(self.history_url).data['count'], 1)


class AttemptReviewTests(PerformanceTestBase):
    def test_review_returns_every_exam_question(self):
        """Questions the student never opened must still appear as SKIPPED."""
        attempt = self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, None, False),
        ])
        self.as_admin()
        res = self.client.get(f'/api/admin/exam-attempts/{attempt.id}/review/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # 5 questions on the exam, only 3 answer rows exist.
        self.assertEqual(len(res.data['questions']), 5)
        self.assertEqual(res.data['summary']['total_questions'], 5)

    def test_review_classifies_correct_wrong_skipped(self):
        attempt = self.make_attempt(answers=[
            (0, 'A', True), (1, 'B', False), (2, None, False),
        ])
        self.as_admin()
        questions = self.client.get(
            f'/api/admin/exam-attempts/{attempt.id}/review/').data['questions']
        by_number = {q['number']: q for q in questions}

        self.assertEqual(by_number[1]['status'], 'correct')
        self.assertEqual(by_number[1]['student_answer'], 'A')
        self.assertEqual(by_number[1]['correct_answer'], 'A')
        self.assertEqual(by_number[1]['marks_obtained'], 1)

        self.assertEqual(by_number[2]['status'], 'incorrect')
        self.assertEqual(by_number[2]['student_answer'], 'B')
        self.assertEqual(by_number[2]['marks_obtained'], 0)

        self.assertEqual(by_number[3]['status'], 'skipped')
        self.assertIsNone(by_number[3]['student_answer'])
        # Never opened at all:
        self.assertEqual(by_number[5]['status'], 'skipped')

    def test_review_summary_matches_question_statuses(self):
        attempt = self.make_attempt(answers=[
            (0, 'A', True), (1, 'A', True), (2, 'B', False),
        ])
        self.as_admin()
        data = self.client.get(f'/api/admin/exam-attempts/{attempt.id}/review/').data
        self.assertEqual(data['summary']['correct'], 2)
        self.assertEqual(data['summary']['incorrect'], 1)
        self.assertEqual(data['summary']['skipped'], 2)
        self.assertEqual(data['summary']['answered'], 3)
        self.assertEqual(data['summary']['accuracy'], 66.67)

    def test_review_includes_context_and_explanation(self):
        attempt = self.make_attempt(answers=[(0, 'B', False)])
        self.as_admin()
        q = self.client.get(
            f'/api/admin/exam-attempts/{attempt.id}/review/').data['questions'][0]
        self.assertEqual(q['subject'], 'Constitution')
        self.assertEqual(q['topic'], 'Fundamental Rights')
        self.assertEqual(q['difficulty'], 'easy')
        self.assertEqual(q['explanation'], 'Because 0')
        # No per-question timing is stored for exams, so this stays null.
        self.assertIsNone(q['time_spent_seconds'])

    def test_missing_attempt_returns_404(self):
        self.as_admin()
        self.assertEqual(
            self.client.get('/api/admin/exam-attempts/999999/review/').status_code,
            status.HTTP_404_NOT_FOUND)


class PracticeTests(PerformanceTestBase):
    def test_practice_totals_come_from_sessions(self):
        PracticeSession.objects.create(
            user=self.student, exam=self.exam, total_questions=10,
            correct_count=7, incorrect_count=2, unanswered_count=1,
            score=70, accuracy=77.78, time_taken_seconds=300, completed=True)
        PracticeSession.objects.create(
            user=self.student, exam=self.exam, total_questions=5,
            correct_count=3, incorrect_count=2, unanswered_count=0,
            score=60, accuracy=60, time_taken_seconds=120, completed=False)
        self.as_admin()
        practice = self.client.get(self.url).data['practice_performance']
        self.assertEqual(practice['total_sessions'], 2)
        self.assertEqual(practice['completed_sessions'], 1)
        self.assertEqual(practice['questions_attempted'], 15)
        self.assertEqual(practice['correct'], 10)
        self.assertEqual(practice['skipped'], 1)
        # Averages consider completed sessions only.
        self.assertEqual(practice['average_score'], 70.0)


class QueryCountTests(PerformanceTestBase):
    def test_performance_query_count_is_flat(self):
        """More attempts must not mean more queries."""
        self.as_admin()
        for i in range(2):
            self.make_attempt(answers=[(0, 'A', True), (1, 'B', False)])
        with CaptureQueriesContext(connection) as few:
            self.client.get(self.url)

        for i in range(10):
            self.make_attempt(answers=[(0, 'A', True), (2, 'B', False)])
        with CaptureQueriesContext(connection) as many:
            self.client.get(self.url)

        self.assertEqual(
            len(few.captured_queries), len(many.captured_queries),
            f'queries grew {len(few.captured_queries)} -> {len(many.captured_queries)}')

    def test_review_query_count_is_flat(self):
        """Review cost must not scale with the number of questions."""
        self.as_admin()
        small = self.make_attempt(answers=[(0, 'A', True)])
        with CaptureQueriesContext(connection) as few:
            self.client.get(f'/api/admin/exam-attempts/{small.id}/review/')

        # Add 20 more questions to the same examination.
        for i in range(20):
            q = Question.objects.create(
                topic=self.topic_rivers, text=f'Extra {i}', question_type='mcq',
                status='approved', difficulty='medium', marks=1,
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='A')
            ExaminationQuestion.objects.create(
                examination=self.examination, question=q, order=100 + i, marks=1)

        with CaptureQueriesContext(connection) as many:
            res = self.client.get(f'/api/admin/exam-attempts/{small.id}/review/')
        self.assertEqual(len(res.data['questions']), 25)
        self.assertEqual(
            len(few.captured_queries), len(many.captured_queries),
            f'queries grew {len(few.captured_queries)} -> {len(many.captured_queries)}')
