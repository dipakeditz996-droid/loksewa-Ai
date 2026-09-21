"""Practice final hardening: course/enrollment authorisation, package gate,
per-request overhead, read-only results, and session-start cost."""
from datetime import timedelta

from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import AdminSettings, User
from courses.models import Course, Enrollment
from exams.models import (
    Chapter, Exam, Paper, PracticeSession, Question, QuestionAttempt, Subject, Topic,
)
from exams.selection_service import QuestionSelectionService
from exams.test_practice_reliability import PracticeBase, STUDY
from subscriptions.models import Subscription, SubscriptionPlan
from support.models import StudentProfile


def bearer_client(user):
    """A client that authenticates through the real JWT path (not force_authenticate)."""
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
    return c


class CourseAccessTests(PracticeBase):
    """Course A / Course B, expired, Coming Soon - all enforced server-side."""

    def setUp(self):
        super().setUp()
        self.make_questions(4)
        self.course_a = Course.objects.create(title='A', slug='course-a', status='published', exam=self.exam)
        other_exam = Exam.objects.create(category=self.exam.category, name='Other exam')
        self.course_b = Course.objects.create(title='B', slug='course-b', status='published', exam=other_exam)

    def enroll(self, course, **kw):
        return Enrollment.objects.create(student=self.student, course=course, **kw)

    def create_practice(self, course):
        return self.client.post('/api/practice-sessions/', {
            'course': course.id, 'mode': 'flexible', 'total_questions': 3,
        }, format='json')

    def test_enrolled_student_can_practice_their_course(self):
        self.enroll(self.course_a)
        r = self.create_practice(self.course_a)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['session']['exam'], self.exam.id)      # the course's exam, not a client-supplied one

    def test_student_without_enrollment_is_denied(self):
        r = self.create_practice(self.course_a)
        self.assertEqual(r.status_code, 403)
        self.assertIn('not enrolled', r.json()['detail'])
        self.assertFalse(PracticeSession.objects.filter(user=self.student).exists())

    def test_enrolment_in_course_a_does_not_open_course_b(self):
        self.enroll(self.course_a)
        r = self.create_practice(self.course_b)
        self.assertEqual(r.status_code, 403)
        self.assertFalse(PracticeSession.objects.filter(user=self.student).exists())

    def test_client_cannot_swap_the_exam_of_an_authorised_course(self):
        self.enroll(self.course_a)
        r = self.client.post('/api/practice-sessions/', {
            'course': self.course_a.id, 'exam': self.course_b.exam_id, 'mode': 'flexible', 'total_questions': 3,
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['session']['exam'], self.exam.id)

    def test_expired_enrollment_is_denied(self):
        self.enroll(self.course_a, expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.create_practice(self.course_a).status_code, 403)

    def test_enrollment_with_a_future_expiry_still_works(self):
        self.enroll(self.course_a, expires_at=timezone.now() + timedelta(days=30))
        self.assertEqual(self.create_practice(self.course_a).status_code, 200)

    def test_cancelled_or_suspended_enrollment_is_denied(self):
        e = self.enroll(self.course_a, status='cancelled')
        self.assertEqual(self.create_practice(self.course_a).status_code, 403)
        e.status = 'suspended'
        e.save()
        self.assertEqual(self.create_practice(self.course_a).status_code, 403)

    def test_coming_soon_draft_and_archived_courses_grant_nothing(self):
        self.enroll(self.course_a)
        for status in ('coming_soon', 'draft', 'archived'):
            self.course_a.status = status
            self.course_a.save()
            r = self.create_practice(self.course_a)
            self.assertEqual(r.status_code, 403, status)
            self.assertIn('not available yet', r.json()['detail'])

    def test_unknown_course_id_looks_the_same_as_not_enrolled(self):
        r = self.client.post('/api/practice-sessions/', {'course': 999999, 'mode': 'flexible'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_study_with_a_course_needs_enrollment_and_a_topic_from_that_course(self):
        # not enrolled
        r = self.start(course=self.course_a.id)
        self.assertEqual(r.status_code, 403)
        self.enroll(self.course_a)
        self.assertEqual(self.start(course=self.course_a.id).status_code, 200)
        # enrolled in A, but the topic belongs to another exam
        other_topic = Topic.objects.create(
            chapter=Chapter.objects.create(
                subject=Subject.objects.create(paper=Paper.objects.create(exam=self.course_b.exam, name='P'), name='S'),
                title='C'),
            name='Elsewhere')
        Question.objects.create(topic=other_topic, question_type='mcq', status='approved', text='q',
                                option_a='a', option_b='b', option_c='c', option_d='d', correct_option='A')
        r = self.client.post(STUDY, {'topic': other_topic.id, 'course': self.course_a.id}, format='json')
        self.assertEqual(r.status_code, 403)         # refused (the exam is not one the student owns)

    def test_daily_practice_is_limited_to_the_exams_the_student_owns(self):
        other_topic = Topic.objects.create(
            chapter=Chapter.objects.create(
                subject=Subject.objects.create(paper=Paper.objects.create(exam=self.course_b.exam, name='P'), name='S'),
                title='C'),
            name='Elsewhere')
        for i in range(3):
            Question.objects.create(topic=other_topic, question_type='mcq', status='approved', text=f'other {i}',
                                    option_a='a', option_b='b', option_c='c', option_d='d', correct_option='A')
        texts = {q['text'] for q in self.client.post('/api/practice-sessions/daily/', {}, format='json').json()['questions']}
        self.assertTrue(texts and all(not t.startswith('other') for t in texts))
        # Once every enrollment has expired the student owns nothing: no fallback to the whole bank.
        PracticeSession.objects.filter(user=self.student).delete()
        Enrollment.objects.filter(student=self.student).update(expires_at=timezone.now() - timedelta(days=1))
        r = self.client.post('/api/practice-sessions/daily/', {}, format='json')
        self.assertEqual(r.status_code, 400)


class PackageGateTests(PracticeBase):
    def setUp(self):
        super().setUp()
        self.make_questions(3)
        s = AdminSettings.get_settings()
        s.enforce_subscription_access = True
        s.save()
        self.plan = SubscriptionPlan.objects.create(name='Basic', description='', duration=30, price='500.00')

    def subscribe(self, days_left):
        now = timezone.now()
        return Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=now - timedelta(days=60), expiry_date=now + timedelta(days=days_left))

    def test_no_package_is_denied_with_the_machine_readable_code(self):
        r = self.start()
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['code'], 'subscription_required')

    def test_active_package_is_allowed(self):
        self.subscribe(days_left=10)
        self.assertEqual(self.start().status_code, 200)

    def test_expired_package_is_denied(self):
        self.subscribe(days_left=-1)
        self.assertEqual(self.start().status_code, 403)

    def test_expiry_takes_effect_on_the_very_next_request(self):
        sub = self.subscribe(days_left=10)
        self.assertEqual(self.start().status_code, 200)
        sub.expiry_date = timezone.now() - timedelta(seconds=1)
        sub.save()
        self.assertEqual(self.start().status_code, 403)          # access is never cached

    def test_admin_granted_access_is_allowed_until_it_expires(self):
        profile = StudentProfile.objects.create(user=self.student, access_origin='ADMIN_GRANTED',
                                                admin_access_expiry=timezone.now() + timedelta(days=5))
        self.student.refresh_from_db()
        self.assertEqual(self.start().status_code, 200)
        profile.admin_access_expiry = timezone.now() - timedelta(days=1)
        profile.save()
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.start().status_code, 403)

    def test_every_practice_endpoint_is_behind_the_gate(self):
        for method, url in [
            ('post', '/api/practice-sessions/'), ('post', '/api/practice-sessions/daily/'),
            ('post', '/api/practice-sessions/start_revision/'), ('get', '/api/practice-sessions/revision_summary/'),
            ('get', '/api/practice-sessions/'),
        ]:
            r = getattr(self.client, method)(url, {}, format='json') if method == 'post' else self.client.get(url)
            self.assertEqual(r.status_code, 403, url)


class RequestOverheadTests(PracticeBase):
    def test_student_profile_comes_with_the_user_query_not_a_second_one(self):
        StudentProfile.objects.create(user=self.student)
        s = AdminSettings.get_settings()
        s.enforce_subscription_access = True
        s.save()
        StudentProfile.objects.filter(user=self.student).update(access_origin='ADMIN_GRANTED')
        with CaptureQueriesContext(connection) as ctx:
            r = bearer_client(self.student).get('/api/practice-sessions/')
        self.assertEqual(r.status_code, 200)
        standalone = [q['sql'] for q in ctx.captured_queries
                      if 'FROM "support_studentprofile"' in q['sql'] and 'JOIN' not in q['sql']]
        self.assertEqual(standalone, [], 'the profile should be joined into the user lookup')

    def test_the_user_is_still_validated_against_the_database_on_every_request(self):
        c = bearer_client(self.student)
        self.assertEqual(c.get('/api/practice-sessions/').status_code, 200)
        self.student.is_active = False
        self.student.save()
        self.assertEqual(c.get('/api/practice-sessions/').status_code, 401)   # deactivation is immediate

    def test_a_deleted_user_token_is_rejected(self):
        c = bearer_client(self.student)
        self.student.delete()
        self.assertEqual(c.get('/api/practice-sessions/').status_code, 401)

    @override_settings(ENFORCE_ACCESS_CACHE_TTL=15)
    def test_only_the_enforcement_flag_is_cached_and_saving_settings_refreshes_it(self):
        cache.clear()
        settings_row = AdminSettings.get_settings()
        with CaptureQueriesContext(connection) as ctx:
            self.assertFalse(AdminSettings.is_subscription_enforced())
            self.assertFalse(AdminSettings.is_subscription_enforced())
        self.assertEqual(len([q for q in ctx.captured_queries if 'core_adminsettings' in q['sql']]), 1)  # second call: no query
        settings_row.enforce_subscription_access = True
        settings_row.save()                                         # signal drops the cached flag
        self.assertTrue(AdminSettings.is_subscription_enforced())    # visible at once, in this process
        cache.clear()

    @override_settings(ENFORCE_ACCESS_CACHE_TTL=15)
    def test_a_stale_cached_flag_never_grants_a_student_access_they_lack(self):
        """The cache only holds the global switch; per-student access is still checked."""
        cache.clear()
        self.make_questions(2)
        s = AdminSettings.get_settings()
        s.enforce_subscription_access = True
        s.save()
        self.assertTrue(AdminSettings.is_subscription_enforced())   # cached True
        self.assertEqual(self.start().status_code, 403)             # student has no package
        cache.clear()


class ResultReadOnlyTests(PracticeBase):
    def setUp(self):
        super().setUp()
        self.make_questions(3)
        data = self.start().json()
        self.sid = data['session']['id']
        self.qid = data['questions'][0]['id']
        self.url = f'/api/practice-sessions/{self.sid}/result/'

    def test_opening_the_result_of_an_unfinished_session_does_not_finish_it(self):
        self.answer(self.sid, self.qid, 'b')
        for _ in range(3):                                            # open + refresh, refresh
            r = self.client.get(self.url)
            self.assertEqual(r.status_code, 409)
            self.assertEqual(r.json()['code'], 'session_in_progress')
        s = PracticeSession.objects.get(id=self.sid)
        self.assertFalse(s.completed)
        self.assertEqual((s.correct_count, s.unanswered_count), (0, 0))
        # and the student can carry on answering
        self.assertEqual(self.answer(self.sid, self.client.get(f'/api/practice-sessions/{self.sid}/questions/').json()['questions'][1]['id'], 'a').status_code, 200)

    def test_result_of_a_finished_session_is_readable_repeatedly_without_changes(self):
        self.answer(self.sid, self.qid, 'b')
        self.client.post(f'/api/practice-sessions/{self.sid}/submit/', {'time_taken_seconds': 3}, format='json')
        first = self.client.get(self.url)
        second = self.client.get(self.url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(first.json()['session']['correct_count'], 1)
        self.assertEqual(len(first.json()['attempts']), 3)

    def test_result_never_awards_xp(self):
        from unittest import mock
        self.answer(self.sid, self.qid, 'b')
        self.client.post(f'/api/practice-sessions/{self.sid}/submit/', {}, format='json')
        with mock.patch('gamification.services.award_xp') as award:
            self.client.get(self.url)
            self.client.get(self.url)
        award.assert_not_called()

    def test_result_is_read_only_and_owned(self):
        self.assertEqual(self.client.post(self.url, {}, format='json').status_code, 405)
        self.assertEqual(self.client.delete(self.url).status_code, 405)
        self.client.post(f'/api/practice-sessions/{self.sid}/submit/', {}, format='json')
        intruder = APIClient()
        intruder.force_authenticate(self.other)
        self.assertEqual(intruder.get(self.url).status_code, 404)


class SessionStartCostTests(PracticeBase):
    def test_selection_ids_come_from_the_same_pool_as_select(self):
        self.make_questions(5)
        self.make_questions(2, status='draft')
        Question.objects.create(topic=self.topic, question_type='subjective', status='approved',
                                text='essay', model_answer='x', marks=5)
        svc = QuestionSelectionService()
        ids = svc.select_ids(topic_id=self.topic.id, question_type='objective', limit=500)
        via_select = [q.id for q in svc.select(topic_id=self.topic.id, question_type='objective',
                                               count=500, randomize=False)['questions']]
        self.assertEqual(ids, sorted(ids))
        self.assertEqual(sorted(via_select), ids)
        self.assertEqual(len(svc.select_ids(topic_id=self.topic.id, question_type='objective', limit=3)), 3)

    def test_new_and_resumed_sessions_return_the_same_shape(self):
        self.make_questions(25)
        fresh = self.start().json()
        resumed = self.start().json()
        self.assertEqual(set(fresh) - {'resumed'}, set(resumed) - {'resumed'})
        self.assertEqual([q['id'] for q in fresh['questions']], [q['id'] for q in resumed['questions']])
        self.assertEqual(fresh['attempts'], resumed['attempts'])
        self.assertEqual(fresh['stats'], resumed['stats'])
        self.assertEqual((fresh['resumed'], resumed['resumed']), (False, True))

    def test_new_session_needs_no_extra_reads_and_a_bounded_number_of_queries(self):
        self.make_questions(60)
        AdminSettings.get_settings()        # a fresh test database has no settings row yet; not part of the start cost
        with CaptureQueriesContext(connection) as ctx:
            data = self.start().json()
        sql = [q['sql'] for q in ctx.captured_queries]
        # no COUNT(*) availability probe, no per-session stats aggregate, and
        # only the requested page's questions are ever loaded
        self.assertFalse(any('COUNT(' in s for s in sql), sql)
        self.assertEqual(len(data['questions']), 20)
        # 10 queries of session work + the exam-authorisation reads (enrollments, exam tree,
        # profile, settings) - which in production are 2 (the profile is joined into the user
        # lookup and the settings flag is cached).
        self.assertLessEqual(len(ctx), 15, [s[:70] for s in sql])
        self.assertEqual(QuestionAttempt.objects.filter(session_id=data['session']['id']).count(), 60)

    def test_a_second_page_of_a_new_session_can_be_requested_directly(self):
        self.make_questions(45)
        data = self.client.post(STUDY, {'topic': self.topic.id, 'page': 3}, format='json').json()
        self.assertEqual((data['page'], len(data['questions'])), (3, 5))
        self.assertEqual(data['first_index'], 40)
