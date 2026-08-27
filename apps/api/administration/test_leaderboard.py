"""Tests for the Admin Ranking & Leaderboard endpoint."""
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from courses.models import Course, Enrollment
from exams.models import (
    Chapter, Exam, ExamCategory, Examination, ExaminationAttempt,
    Paper, Subject, Topic,
)
from gamification.models import GamificationProfile, XPTransaction

URL = '/api/admin/gamification/leaderboard/'


class LeaderboardTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.superadmin = User.objects.create_user(
            username='super1', password='pw', role='super-admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teach1', password='pw', role='teacher')

        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(category=self.category, name='Kharidar')
        self.paper = Paper.objects.create(exam=self.exam, name='Paper I')
        self.subject = Subject.objects.create(paper=self.paper, name='GK')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Geo')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Rivers')
        self.examination = Examination.objects.create(
            title='Mock', exam_type='mock', category=self.category,
            exam=self.exam, time_limit=60, total_marks=100,
        )
        self.course = Course.objects.create(title='Kharidar Course')

    def make_student(self, username, xp=0, level=1, streak=0):
        user = User.objects.create_user(username=username, password='pw', role='student',
                                        email=f'{username}@example.com')
        # A profile may already exist via a post_save signal.
        profile, _ = GamificationProfile.objects.get_or_create(user=user)
        profile.xp = xp
        profile.level = level
        profile.study_current_streak = streak
        profile.save()
        return user

    def add_attempt(self, student, percentage, when=None):
        attempt = ExaminationAttempt.objects.create(
            examination=self.examination, student=student,
            status='submitted', score=percentage, percentage=percentage,
        )
        attempt.submitted_at = when or timezone.now()
        attempt.save(update_fields=['submitted_at'])
        return attempt

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)


class PermissionTests(LeaderboardTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        student = self.make_student('s_perm')
        self.client.force_authenticate(user=student)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_rejected(self):
        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_allowed(self):
        self.as_admin()
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)

    def test_super_admin_allowed(self):
        self.client.force_authenticate(user=self.superadmin)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)


class RankingTests(LeaderboardTestBase):
    def test_students_ordered_by_xp_descending(self):
        self.make_student('low', xp=100)
        self.make_student('high', xp=900)
        self.make_student('mid', xp=500)
        self.as_admin()
        res = self.client.get(URL)
        names = [r['student']['username'] for r in res.data['results']]
        self.assertEqual(names, ['high', 'mid', 'low'])
        self.assertEqual([r['rank'] for r in res.data['results']], [1, 2, 3])

    def test_only_students_are_ranked(self):
        self.make_student('a_student', xp=10)
        self.as_admin()
        res = self.client.get(URL)
        usernames = [r['student']['username'] for r in res.data['results']]
        self.assertNotIn('teach1', usernames)
        self.assertNotIn('admin1', usernames)

    def test_ties_broken_deterministically(self):
        """Equal XP falls back to average score, then exams, then id."""
        weak = self.make_student('tie_weak', xp=500)
        strong = self.make_student('tie_strong', xp=500)
        self.add_attempt(weak, 40)
        self.add_attempt(strong, 95)
        self.as_admin()

        first = [r['student']['username'] for r in self.client.get(URL).data['results']]
        second = [r['student']['username'] for r in self.client.get(URL).data['results']]
        self.assertEqual(first, second)              # stable
        self.assertEqual(first[0], 'tie_strong')     # and correct

    def test_exam_metrics_come_from_attempts(self):
        student = self.make_student('exam_guy', xp=10)
        self.add_attempt(student, 80)
        self.add_attempt(student, 60)
        self.as_admin()
        row = self.client.get(URL).data['results'][0]
        self.assertEqual(row['exams_completed'], 2)
        self.assertEqual(row['average_score'], 70.0)
        self.assertEqual(row['best_score'], 80.0)

    def test_exam_category_ranks_by_average_score(self):
        high_xp_low_score = self.make_student('xp_king', xp=9999)
        self.add_attempt(high_xp_low_score, 30)
        low_xp_high_score = self.make_student('score_king', xp=1)
        self.add_attempt(low_xp_high_score, 99)
        self.as_admin()
        res = self.client.get(URL, {'category': 'exam'})
        self.assertEqual(res.data['results'][0]['student']['username'], 'score_king')

    def test_streak_category(self):
        self.make_student('streaky', xp=1, streak=30)
        self.make_student('lazy', xp=9999, streak=0)
        self.as_admin()
        res = self.client.get(URL, {'category': 'streak'})
        self.assertEqual(res.data['results'][0]['student']['username'], 'streaky')
        self.assertEqual(res.data['results'][0]['streak'], 30)

    def test_unknown_category_rejected(self):
        self.as_admin()
        res = self.client.get(URL, {'category': 'popularity'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_streak_rejects_a_period_window(self):
        """A streak has no historical window, so this must not be faked."""
        self.as_admin()
        res = self.client.get(URL, {'category': 'streak', 'period': 'weekly'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class PeriodTests(LeaderboardTestBase):
    def test_weekly_xp_uses_dated_transactions(self):
        recent = self.make_student('recent', xp=1000)
        stale = self.make_student('stale', xp=1000)
        XPTransaction.objects.create(user=recent, amount=300, reason='practice')
        old = XPTransaction.objects.create(user=stale, amount=900, reason='practice')
        XPTransaction.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=40))

        self.as_admin()
        res = self.client.get(URL, {'period': 'weekly'})
        rows = {r['student']['username']: r['xp'] for r in res.data['results']}
        self.assertEqual(rows['recent'], 300)
        self.assertEqual(rows['stale'], 0)   # outside the window, not lifetime XP

    def test_unknown_period_rejected(self):
        self.as_admin()
        self.assertEqual(
            self.client.get(URL, {'period': 'daily'}).status_code,
            status.HTTP_400_BAD_REQUEST)


class SearchPaginationTests(LeaderboardTestBase):
    def test_search_matches_username_and_email(self):
        self.make_student('dipak', xp=10)
        self.make_student('sita', xp=20)
        self.as_admin()

        by_name = self.client.get(URL, {'search': 'dipak'})
        self.assertEqual(by_name.data['count'], 1)
        self.assertEqual(by_name.data['results'][0]['student']['username'], 'dipak')

        by_email = self.client.get(URL, {'search': 'sita@example.com'})
        self.assertEqual(by_email.data['count'], 1)

    def test_pagination_and_rank_continuity(self):
        for i in range(12):
            self.make_student(f'st{i:02d}', xp=100 - i)
        self.as_admin()

        p1 = self.client.get(URL, {'page_size': 5, 'page': 1})
        p2 = self.client.get(URL, {'page_size': 5, 'page': 2})

        self.assertEqual(p1.data['count'], 12)
        self.assertEqual(len(p1.data['results']), 5)
        self.assertEqual([r['rank'] for r in p1.data['results']], [1, 2, 3, 4, 5])
        # Rank continues across the page boundary rather than restarting.
        self.assertEqual([r['rank'] for r in p2.data['results']], [6, 7, 8, 9, 10])
        self.assertTrue(p1.data['has_next'])
        self.assertTrue(p2.data['has_previous'])

        ids1 = {r['student']['id'] for r in p1.data['results']}
        ids2 = {r['student']['id'] for r in p2.data['results']}
        self.assertEqual(ids1 & ids2, set())

    def test_course_filter_limits_to_active_enrollment(self):
        enrolled = self.make_student('enrolled', xp=50)
        other = self.make_student('outsider', xp=999)
        cancelled = self.make_student('cancelled', xp=800)
        Enrollment.objects.create(student=enrolled, course=self.course, status='active')
        Enrollment.objects.create(student=cancelled, course=self.course, status='cancelled')

        self.as_admin()
        res = self.client.get(URL, {'course_id': self.course.id})
        usernames = [r['student']['username'] for r in res.data['results']]
        self.assertEqual(usernames, ['enrolled'])
        self.assertNotIn('outsider', usernames)
        self.assertNotIn('cancelled', usernames)

    def test_bad_course_id_rejected(self):
        self.as_admin()
        self.assertEqual(
            self.client.get(URL, {'course_id': 'abc'}).status_code,
            status.HTTP_400_BAD_REQUEST)


class SummaryTests(LeaderboardTestBase):
    def test_summary_covers_all_students_not_just_the_page(self):
        for i in range(10):
            self.make_student(f'sum{i}', xp=(i + 1) * 100, streak=1 if i < 4 else 0)
        self.as_admin()
        res = self.client.get(URL, {'page_size': 3})

        self.assertEqual(len(res.data['results']), 3)
        summary = res.data['summary']
        self.assertEqual(summary['total_students'], 10)
        self.assertEqual(summary['top_xp'], 1000)         # not just this page's max
        self.assertEqual(summary['average_xp'], 550.0)
        self.assertEqual(summary['active_students'], 4)

    def test_summary_respects_the_search_filter(self):
        self.make_student('alpha', xp=100)
        self.make_student('beta', xp=900)
        self.as_admin()
        res = self.client.get(URL, {'search': 'alpha'})
        self.assertEqual(res.data['summary']['total_students'], 1)
        self.assertEqual(res.data['summary']['top_xp'], 100)


class EmptyStateTests(LeaderboardTestBase):
    def test_zero_students_returns_a_valid_empty_response(self):
        self.as_admin()
        res = self.client.get(URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 0)
        self.assertEqual(res.data['results'], [])
        self.assertEqual(res.data['summary']['total_students'], 0)
        self.assertEqual(res.data['summary']['top_xp'], 0)
        self.assertEqual(res.data['summary']['average_xp'], 0)

    def test_student_without_a_gamification_profile_still_ranks(self):
        user = User.objects.create_user(username='no_profile', password='pw', role='student')
        GamificationProfile.objects.filter(user=user).delete()
        self.as_admin()
        res = self.client.get(URL)
        self.assertEqual(res.data['count'], 1)
        row = res.data['results'][0]
        self.assertEqual(row['xp'], 0)
        self.assertEqual(row['level'], 1)


class QueryCountTests(LeaderboardTestBase):
    def test_query_count_does_not_grow_with_student_count(self):
        """Guards against N+1: 5 students and 25 must cost the same queries."""
        self.as_admin()

        for i in range(5):
            self.make_student(f'few{i}', xp=i * 10)
        with CaptureQueriesContext(connection) as few_ctx:
            self.client.get(URL, {'page_size': 100})
        few = len(few_ctx.captured_queries)

        for i in range(20):
            self.make_student(f'many{i}', xp=i * 10)
        with CaptureQueriesContext(connection) as many_ctx:
            self.client.get(URL, {'page_size': 100})
        many = len(many_ctx.captured_queries)

        self.assertEqual(
            few, many,
            f'query count grew from {few} (5 students) to {many} (25 students) — '
            f'that is an N+1.'
        )
