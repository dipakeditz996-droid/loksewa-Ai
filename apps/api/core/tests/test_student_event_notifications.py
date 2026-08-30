"""New student-facing event-triggered notifications added to
NotificationService: exam published/cancelled/schedule-changed/starting-soon,
exam result published, subjective evaluation, gamification level-up and
streak milestones, and study plan creation.

Covers: each trigger actually fires, the related_id dedupe keeps repeats from
duplicating a notification, and finalize_attempt's notification is deferred
to transaction.on_commit so a rolled-back attempt never leaves an orphan row.
"""
from django.db import transaction
from django.test import TransactionTestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Notification, AdminSettings
from core.notification_service import NotificationService
from support.models import NotificationPreference
from exams.models import (
    Exam, ExamCategory, Examination, ExaminationAttempt, ExaminationQuestion,
    Question, Topic, Chapter, Subject, Paper, StudentAnswer,
    SubjectiveAttempt, SubjectiveAnswer, Evaluation,
)
from exams.attempt_timing import finalize_attempt
from courses.models import Course, Enrollment


def _make_examination(**overrides):
    category = ExamCategory.objects.create(name='Loksewa')
    position = Exam.objects.create(name='Kharidar', category=category)
    defaults = dict(
        title='Constitutional Law Mock Exam',
        category=category,
        exam=position,
        status='published',
        total_questions=1,
        time_limit=60,
        total_marks=1,
        passing_marks=0,
    )
    defaults.update(overrides)
    return Examination.objects.create(**defaults)


class ExamPublishedNotificationTests(APITestCase):
    def setUp(self):
        self.student1 = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')
        self.student2 = User.objects.create_user(
            username='s2', email='s2@test.com', password='pass123', role='student')
        self.teacher = User.objects.create_user(
            username='t1', email='t1@test.com', password='pass123', role='teacher')
        self.exam = _make_examination()

    def test_publish_notifies_all_active_students_when_no_course(self):
        NotificationService.notify_students_exam_update(self.exam, 'published')
        recipients = set(
            Notification.objects.filter(type='exam', related_id=f'exam-published:{self.exam.id}')
            .values_list('recipient__username', flat=True)
        )
        self.assertEqual(recipients, {'s1', 's2'})
        self.assertFalse(Notification.objects.filter(recipient=self.teacher).exists())

    def test_publish_scoped_to_enrolled_students_when_course_set(self):
        course = Course.objects.create(title='Kharidar Prep', slug='kharidar-prep', status='published')
        Enrollment.objects.create(student=self.student1, course=course, status='active')
        self.exam.course = course
        self.exam.save()

        NotificationService.notify_students_exam_update(self.exam, 'published')
        recipients = set(
            Notification.objects.filter(type='exam', related_id=f'exam-published:{self.exam.id}')
            .values_list('recipient__username', flat=True)
        )
        self.assertEqual(recipients, {'s1'})

    def test_repeated_call_does_not_duplicate(self):
        NotificationService.notify_students_exam_update(self.exam, 'published')
        NotificationService.notify_students_exam_update(self.exam, 'published')
        count = Notification.objects.filter(
            recipient=self.student1, type='exam', related_id=f'exam-published:{self.exam.id}'
        ).count()
        self.assertEqual(count, 1)

    def test_respects_exam_reminders_preference(self):
        NotificationPreference.objects.create(user=self.student1, exam_reminders=False)
        NotificationService.notify_students_exam_update(self.exam, 'published')
        self.assertFalse(Notification.objects.filter(recipient=self.student1).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.student2).exists())

    def test_respects_global_kill_switch(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.notifications_enabled = False
        settings_obj.save()
        NotificationService.notify_students_exam_update(self.exam, 'published')
        self.assertFalse(Notification.objects.filter(type='exam').exists())

    def test_publish_via_admin_api_notifies_students(self):
        admin = User.objects.create_user(
            username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        draft = _make_examination(status='draft', title='Draft Exam')
        question = Question.objects.create(
            topic=self._topic(), text='2+2?', question_type='mcq',
            option_a='3', option_b='4', correct_option='B', marks=1,
        )
        ExaminationQuestion.objects.create(examination=draft, question=question, marks=1)
        draft.total_questions = 1
        draft.save()

        self.client.force_authenticate(user=admin)
        response = self.client.post(f'/api/admin/exams/{draft.id}/publish/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student1, type='exam', related_id=f'exam-published:{draft.id}'
            ).exists()
        )

    def _topic(self):
        category = ExamCategory.objects.create(name=f'Cat-{User.objects.count()}')
        position = Exam.objects.create(name='Pos', category=category)
        paper = Paper.objects.create(exam=position, name='Paper 1')
        subject = Subject.objects.create(paper=paper, name='GK')
        chapter = Chapter.objects.create(subject=subject, title='History')
        return Topic.objects.create(chapter=chapter, name='Ancient History')


class ExamCancelledAndStartingSoonTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')

    def test_archiving_an_upcoming_published_exam_notifies_as_cancelled(self):
        admin = User.objects.create_user(
            username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        exam = _make_examination(start_time=timezone.now() + timedelta(days=1))

        self.client.force_authenticate(user=admin)
        response = self.client.post(f'/api/admin/exams/{exam.id}/archive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.student, type='exam', related_id=f'exam-cancelled:{exam.id}')
        self.assertEqual(notif.priority, 'critical')

    def test_archiving_an_already_completed_exam_does_not_notify(self):
        admin = User.objects.create_user(
            username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        exam = _make_examination(
            start_time=timezone.now() - timedelta(days=2),
            end_time=timezone.now() - timedelta(days=1),
        )

        self.client.force_authenticate(user=admin)
        response = self.client.post(f'/api/admin/exams/{exam.id}/archive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(type='exam', related_id__startswith='exam-cancelled').exists())

    def test_starting_soon_notifies_within_window_only(self):
        soon_exam = _make_examination(start_time=timezone.now() + timedelta(minutes=15))
        far_exam = _make_examination(start_time=timezone.now() + timedelta(hours=5))

        sent = NotificationService.notify_exams_starting_soon(window_minutes=30)
        self.assertEqual(sent, 1)
        self.assertTrue(
            Notification.objects.filter(recipient=self.student, related_id=f'exam-starting-soon:{soon_exam.id}').exists()
        )
        self.assertFalse(
            Notification.objects.filter(related_id=f'exam-starting-soon:{far_exam.id}').exists()
        )

    def test_starting_soon_does_not_duplicate_on_repeated_runs(self):
        _make_examination(start_time=timezone.now() + timedelta(minutes=10))
        NotificationService.notify_exams_starting_soon(window_minutes=30)
        NotificationService.notify_exams_starting_soon(window_minutes=30)
        self.assertEqual(
            Notification.objects.filter(recipient=self.student, type='exam').count(), 1
        )


class ResultPublishedNotificationTests(TransactionTestCase):
    """TransactionTestCase (not the default TestCase) because these assert on
    transaction.on_commit behaviour, which the default TestCase's
    always-rolled-back wrapping transaction never actually commits."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')

    def test_finalizing_an_attempt_notifies_the_student(self):
        exam = _make_examination(result_visibility='immediate')
        attempt = ExaminationAttempt.objects.create(examination=exam, student=self.student)
        finalize_attempt(attempt)

        notif = Notification.objects.get(recipient=self.student, type='result', related_id=f'result:{attempt.id}')
        self.assertEqual(notif.priority, 'important')

    def test_manual_result_visibility_does_not_notify(self):
        exam = _make_examination(result_visibility='manual')
        attempt = ExaminationAttempt.objects.create(examination=exam, student=self.student)
        finalize_attempt(attempt)
        self.assertFalse(Notification.objects.filter(recipient=self.student, type='result').exists())

    def test_finalizing_twice_does_not_duplicate(self):
        exam = _make_examination(result_visibility='immediate')
        attempt = ExaminationAttempt.objects.create(examination=exam, student=self.student)
        finalize_attempt(attempt)
        finalize_attempt(attempt)  # idempotent no-op per finalize_attempt's own status guard
        self.assertEqual(
            Notification.objects.filter(recipient=self.student, type='result').count(), 1
        )

    def test_rolled_back_transaction_leaves_no_orphan_notification(self):
        exam = _make_examination(result_visibility='immediate')
        attempt = ExaminationAttempt.objects.create(examination=exam, student=self.student)

        class _Boom(Exception):
            pass

        try:
            with transaction.atomic():
                finalize_attempt(attempt)
                raise _Boom('force rollback of the outer transaction')
        except _Boom:
            pass

        self.assertFalse(Notification.objects.filter(recipient=self.student, type='result').exists())


class SubjectiveEvaluationNotificationTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')
        self.teacher = User.objects.create_user(
            username='t1', email='t1@test.com', password='pass123', role='teacher')

        category = ExamCategory.objects.create(name='Loksewa')
        position = Exam.objects.create(name='Kharidar', category=category)
        paper = Paper.objects.create(exam=position, name='Paper 1')
        subject = Subject.objects.create(paper=paper, name='GK')
        chapter = Chapter.objects.create(subject=subject, title='History')
        topic = Topic.objects.create(chapter=chapter, name='Ancient History')
        self.question = Question.objects.create(
            topic=topic, text='Describe the constitution.', question_type='subjective', marks=10)

        self.attempt = SubjectiveAttempt.objects.create(student=self.student, mode='practice')
        self.answer = SubjectiveAnswer.objects.create(
            attempt=self.attempt, question=self.question, answer_text='...', status='submitted')

    def test_teacher_evaluate_action_notifies_student(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(
            f'/api/evaluations/{self.answer.id}/evaluate/',
            {'marks_obtained': 7, 'feedback': 'Good structure.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(recipient=self.student, type='result', title='Answer Evaluated').exists()
        )


class LevelUpNotificationTests(TransactionTestCase):
    """TransactionTestCase, not APITestCase/TestCase — award_xp defers its
    notification to transaction.on_commit (see gamification/services.py),
    which never fires inside the default TestCase's always-rolled-back
    wrapping transaction."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')

    def test_crossing_a_level_threshold_notifies(self):
        from gamification.services import award_xp
        from gamification.models import ReferralSetting

        ReferralSetting.get_settings()  # xp_per_level defaults to 1000
        award_xp(self.student, 1000, 'Test award')  # 1000 XP -> level 2

        notif = Notification.objects.get(recipient=self.student, type='gamification', title='Level Up!')
        self.assertIn('Level 2', notif.message)

    def test_staying_within_the_same_level_does_not_notify(self):
        from gamification.services import award_xp

        award_xp(self.student, 50, 'Test award')  # still level 1
        self.assertFalse(Notification.objects.filter(recipient=self.student, type='gamification').exists())

    def test_repeated_award_at_the_same_level_does_not_duplicate(self):
        from gamification.services import award_xp

        award_xp(self.student, 1000, 'First award')  # -> level 2
        award_xp(self.student, 10, 'Second award')  # still level 2
        self.assertEqual(
            Notification.objects.filter(recipient=self.student, type='gamification', related_id='level:2').count(), 1
        )


class StreakMilestoneNotificationTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')
        self.client.force_authenticate(user=self.student)

        from exams.models import Exam as PositionExam, ExamCategory as Cat
        from study_plan.models import StudyPlan, StudyTask

        category = Cat.objects.create(name='Loksewa')
        position = PositionExam.objects.create(name='Kharidar', category=category)
        self.plan = StudyPlan.objects.create(
            student=self.student, exam=position, target_date=timezone.now().date(),
        )
        self.task = StudyTask.objects.create(
            study_plan=self.plan, date=timezone.now().date(),
            title='Read Chapter 1', task_type='STUDY_NOTE',
        )

    def _set_streak(self, current, last_study_date):
        from gamification.models import GamificationProfile

        profile, _ = GamificationProfile.objects.get_or_create(user=self.student)
        profile.study_current_streak = current
        profile.study_highest_streak = current
        profile.last_study_date = last_study_date
        profile.save()

    def test_hitting_a_milestone_notifies(self):
        self._set_streak(current=2, last_study_date=timezone.now().date() - timedelta(days=1))
        response = self.client.post(f'/api/study-plan/tasks/{self.task.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.student, type='gamification', related_id='streak:3')
        self.assertIn('3-Day Streak', notif.title)

    def test_non_milestone_streak_does_not_notify(self):
        self._set_streak(current=3, last_study_date=timezone.now().date() - timedelta(days=1))
        response = self.client.post(f'/api/study-plan/tasks/{self.task.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(recipient=self.student, type='gamification').exists())


class StudyPlanCreatedNotificationTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='s1', email='s1@test.com', password='pass123', role='student')
        self.client.force_authenticate(user=self.student)

    def test_creating_a_study_plan_notifies_the_student(self):
        from exams.models import Exam as PositionExam, ExamCategory as Cat

        category = Cat.objects.create(name='Loksewa')
        position = PositionExam.objects.create(name='Kharidar', category=category)

        response = self.client.post('/api/study-plan/plans/', {
            'exam': position.id,
            'target_date': (timezone.now().date() + timedelta(days=90)).isoformat(),
            'daily_minutes': 120,
            'study_days': ['Monday', 'Wednesday', 'Friday'],
            'level': 'BEGINNER',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student, type='study_plan', title='Study Plan Created'
            ).exists()
        )
