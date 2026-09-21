"""A student practises - and even sees - only the exams their purchase covers.

Every check goes through the real endpoints. Enrollments are what an approved
payment creates (subscriptions/views.py approve), so they stand in for
"purchased" here; a pending payment creates none.
"""
from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from core.models import AdminSettings, User
from courses.models import Course, CourseApplication, Enrollment
from exams.models import (
    Chapter, Exam, ExamCategory, Paper, PracticeSession, Question, QuestionMastery, Subject, Topic,
)
from subscriptions.models import Subscription, SubscriptionPayment, SubscriptionPlan
from support.models import StudentProfile

STUDY = '/api/practice-sessions/study/'
SESSIONS = '/api/practice-sessions/'
EXAMS = '/api/exams/'


class ExamAccessBase(APITestCase):
    def setUp(self):
        self.cat = ExamCategory.objects.create(name='PSC Exams')
        self.level = Exam.objects.create(category=self.cat, name='5th Level Exam')
        self.exam_a = self.make_exam('Civil Sub Engineer')
        self.exam_b = self.make_exam('Computer Operator')
        self.exam_c = self.make_exam('Surveyor')
        self.exam_d = self.make_exam('Geomatic', status='coming_soon')
        self.course_a = self.make_course(self.exam_a)
        self.course_b = self.make_course(self.exam_b)
        self.course_c = self.make_course(self.exam_c)
        self.course_d = self.make_course(self.exam_d, status='coming_soon')
        self.student = User.objects.create_user(username='stu', password='pw', role='student')
        self.client.force_authenticate(self.student)
        self.plan = SubscriptionPlan.objects.create(name='Pkg', description='', duration=30, price='500')

    def make_exam(self, name, status='active', parent='level'):
        exam = Exam.objects.create(category=self.cat, name=name, status=status,
                                   parent=self.level if parent == 'level' else None)
        paper = Paper.objects.create(exam=exam, name='P1')
        subject = Subject.objects.create(paper=paper, name=f'{name} subject')
        chapter = Chapter.objects.create(subject=subject, title='Unit 1')
        exam.topic = Topic.objects.create(chapter=chapter, name=f'{name} topic')
        for i in range(3):
            Question.objects.create(
                topic=exam.topic, question_type='mcq', status='approved', text=f'{name} question {i}',
                option_a='a', option_b='b', option_c='c', option_d='d', correct_option='B', marks=1)
        return exam

    def make_course(self, exam, status='published'):
        return Course.objects.create(title=f'{exam.name} course', slug=f'c-{exam.id}', status=status, exam=exam)

    def enroll(self, course, user=None, **kw):
        return Enrollment.objects.create(student=user or self.student, course=course, **kw)

    def enforce(self, on=True):
        s = AdminSettings.get_settings()
        s.enforce_subscription_access = on
        s.save()

    def subscribe(self, plan=None, days_left=30, user=None):
        now = timezone.now()
        return Subscription.objects.create(
            student=user or self.student, plan=plan or self.plan, status='ACTIVE',
            start_date=now - timedelta(days=5), expiry_date=now + timedelta(days=days_left))

    def listed(self, client=None):
        r = (client or self.client).get(EXAMS)
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        return [e['id'] for e in (body['results'] if isinstance(body, dict) else body)]

    def study(self, exam, topic=None, **extra):
        data = {'exam': exam.id, 'topic': (topic or exam.topic).id}
        data.update(extra)
        return self.client.post(STUDY, data, format='json')


class ExamListTests(ExamAccessBase):
    def test_single_course_shows_only_that_courses_exam(self):
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        self.assertEqual(self.listed(), [self.exam_a.id])

    def test_multi_course_shows_each_selected_course_and_no_other(self):
        self.enforce(); self.subscribe()
        self.enroll(self.course_a); self.enroll(self.course_b)
        self.assertEqual(sorted(self.listed()), sorted([self.exam_a.id, self.exam_b.id]))   # not C, not D

    def test_bundle_shows_every_bundled_course(self):
        self.enforce(); self.subscribe()
        bundle = SubscriptionPlan.objects.create(name='Bundle', description='', duration=30, price='900', package_type='BUNDLE')
        bundle.eligible_courses.set([self.course_a, self.course_b, self.course_c])
        for c in bundle.eligible_courses.all():
            self.enroll(c)               # what approving a BUNDLE payment creates
        self.assertEqual(sorted(self.listed()), sorted([self.exam_a.id, self.exam_b.id, self.exam_c.id]))

    def test_all_access_covers_every_published_course_but_not_coming_soon(self):
        self.enforce()
        all_access = SubscriptionPlan.objects.create(name='All', description='', duration=30, price='999', package_type='ALL_ACCESS')
        self.subscribe(plan=all_access)
        self.assertEqual(sorted(self.listed()), sorted([self.exam_a.id, self.exam_b.id, self.exam_c.id]))

    def test_expired_all_access_grants_nothing(self):
        self.enforce()
        all_access = SubscriptionPlan.objects.create(name='All', description='', duration=30, price='999', package_type='ALL_ACCESS')
        self.subscribe(plan=all_access, days_left=-1)
        self.assertEqual(self.client.get(EXAMS).status_code, 403)          # package gate

    def test_no_package_at_all_is_denied_when_enforced(self):
        self.enforce()
        r = self.client.get(EXAMS)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['code'], 'subscription_required')

    def test_expired_enrollment_lists_nothing(self):
        self.enforce(); self.subscribe()
        self.enroll(self.course_a, expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.listed(), [])

    def test_unverified_payment_lists_nothing(self):
        """A pending payment creates a CourseApplication, never an Enrollment."""
        self.enforce(); self.subscribe()
        CourseApplication.objects.create(student=self.student, course=self.course_a, status='pending')
        self.assertEqual(self.listed(), [])

    def test_coming_soon_course_or_exam_lists_nothing(self):
        self.enforce(); self.subscribe()
        self.enroll(self.course_d)
        self.assertEqual(self.listed(), [])
        self.course_a.status = 'coming_soon'; self.course_a.save()
        self.enroll(self.course_a)
        self.assertEqual(self.listed(), [])

    def test_owning_a_level_covers_the_exams_under_it(self):
        self.enforce(); self.subscribe()
        self.enroll(self.make_course(self.level))
        listed = self.listed()
        self.assertIn(self.exam_a.id, listed)
        self.assertIn(self.exam_b.id, listed)
        self.assertNotIn(self.exam_d.id, listed)             # Coming Soon child still excluded

    def test_unrelated_exams_never_appear(self):
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        listed = self.listed()
        for other in (self.exam_b, self.exam_c, self.exam_d, self.level):
            self.assertNotIn(other.id, listed)

    def test_one_students_list_does_not_leak_to_another(self):
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        other = User.objects.create_user(username='stu2', password='pw', role='student')
        self.subscribe(user=other); self.enroll(self.course_b, user=other)
        c2 = APIClient(); c2.force_authenticate(other)
        self.assertEqual(self.listed(), [self.exam_a.id])
        self.assertEqual(self.listed(c2), [self.exam_b.id])
        self.assertEqual(self.listed(), [self.exam_a.id])

    def test_retrieving_an_unauthorised_exam_by_id_is_a_404(self):
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        self.assertEqual(self.client.get(f'{EXAMS}{self.exam_a.id}/').status_code, 200)
        self.assertEqual(self.client.get(f'{EXAMS}{self.exam_b.id}/').status_code, 404)

    def test_staff_keep_the_whole_catalogue(self):
        self.enforce()
        for role in ('admin', 'teacher'):
            staff = User.objects.create_user(username=role, password='pw', role=role)
            c = APIClient(); c.force_authenticate(staff)
            listed = self.listed(c)
            self.assertTrue({self.exam_a.id, self.exam_b.id, self.exam_c.id, self.exam_d.id} <= set(listed), role)

    def test_enforcement_off_still_scopes_to_owned_and_target_exams(self):
        self.enforce(False)
        self.enroll(self.course_a)
        StudentProfile.objects.create(user=self.student, target_position=self.exam_b)
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        self.assertEqual(sorted(self.listed()), sorted([self.exam_a.id, self.exam_b.id]))   # not C

    def test_target_position_grants_nothing_for_a_self_registered_student_when_enforced(self):
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        StudentProfile.objects.create(user=self.student, target_position=self.exam_b)      # intends to buy B
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.listed(), [self.exam_a.id])

    def test_admin_granted_student_gets_their_target_when_enforced(self):
        self.enforce()
        StudentProfile.objects.create(user=self.student, access_origin='ADMIN_GRANTED', target_position=self.exam_c)
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.listed(), [self.exam_c.id])

    def test_exam_list_query_count_is_bounded(self):
        self.enforce(); self.subscribe()
        for c in (self.course_a, self.course_b, self.course_c):
            self.enroll(c)
        AdminSettings.get_settings()
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(self.client.get(EXAMS).status_code, 200)
        self.assertLessEqual(len(ctx), 14, [q['sql'][:70] for q in ctx.captured_queries])


class DuplicateNameTests(ExamAccessBase):
    def test_identical_names_are_qualified_by_their_real_parent_or_category(self):
        other_level = Exam.objects.create(category=self.cat, name='4th Level Exam')
        amin5 = Exam.objects.create(category=self.cat, parent=self.level, name='Amin (Surveyor)')
        amin4 = Exam.objects.create(category=self.cat, parent=other_level, name='Amin (Surveyor)')
        cat2 = ExamCategory.objects.create(name='Civil Service')
        so_a = Exam.objects.create(category=self.cat, name='Section Officer')
        so_b = Exam.objects.create(category=cat2, name='Section Officer')
        staff = User.objects.create_user(username='adm', password='pw', role='admin')
        c = APIClient(); c.force_authenticate(staff)
        rows = {e['id']: e['display_name'] for e in c.get(EXAMS).json()}
        self.assertEqual(rows[amin5.id], 'Amin (Surveyor) — 5th Level Exam')
        self.assertEqual(rows[amin4.id], 'Amin (Surveyor) — 4th Level Exam')
        self.assertEqual(rows[so_a.id], 'Section Officer — PSC Exams')
        self.assertEqual(rows[so_b.id], 'Section Officer — Civil Service')
        self.assertEqual(rows[self.exam_a.id], 'Civil Sub Engineer')       # unique names stay plain

    def test_a_student_who_sees_only_one_of_two_same_named_exams_gets_the_plain_name(self):
        twin = Exam.objects.create(category=self.cat, parent=self.level, name=self.exam_a.name)
        self.enforce(); self.subscribe(); self.enroll(self.course_a)
        rows = self.client.get(EXAMS).json()
        self.assertEqual([e['display_name'] for e in rows], ['Civil Sub Engineer'])
        self.assertNotIn(twin.id, [e['id'] for e in rows])


class PracticeStartTests(ExamAccessBase):
    """Fixing the dropdown is not enough: the start endpoints refuse other exams."""

    def setUp(self):
        super().setUp()
        self.enforce(); self.subscribe(); self.enroll(self.course_a)

    def test_authorised_exam_starts(self):
        r = self.study(self.exam_a)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['total_questions'], 3)

    def test_direct_id_manipulation_is_denied_on_study(self):
        r = self.study(self.exam_b)                                       # B's exam AND B's topic
        self.assertEqual(r.status_code, 403)
        self.assertFalse(PracticeSession.objects.filter(user=self.student).exists())

    def test_authorised_exam_with_another_exams_topic_yields_nothing(self):
        r = self.study(self.exam_a, topic=self.exam_b.topic)
        self.assertEqual(r.status_code, 400)                              # no questions - none of B's leak
        self.assertFalse(PracticeSession.objects.filter(user=self.student).exists())

    def test_omitting_the_exam_does_not_bypass_the_check(self):
        r = self.client.post(STUDY, {'topic': self.exam_b.topic.id}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.post(STUDY, {'topic': self.exam_b.topic.id, 'exam': 'all'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.client.post(STUDY, {'topic': self.exam_a.topic.id}, format='json').status_code, 200)

    def test_junk_exam_id_is_a_400_not_a_500(self):
        r = self.client.post(STUDY, {'topic': self.exam_a.topic.id, 'exam': 'abc'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_timed_or_flexible_session_refuses_an_unauthorised_exam(self):
        for exam in (self.exam_b, self.exam_d):
            r = self.client.post(SESSIONS, {'exam': exam.id, 'mode': 'flexible', 'total_questions': 3}, format='json')
            self.assertEqual(r.status_code, 403, exam.name)
        self.assertFalse(PracticeSession.objects.filter(user=self.student).exists())

    def test_random_practice_means_all_of_my_exams_never_the_whole_platform(self):
        for exam_param in ('all', None):
            body = {'mode': 'flexible', 'total_questions': 20, 'topic': 'all', 'subject': 'all'}
            if exam_param:
                body['exam'] = exam_param
            r = self.client.post(SESSIONS, body, format='json')
            self.assertEqual(r.status_code, 200)
            texts = {q['text'] for q in r.json()['questions']}
            self.assertEqual(len(texts), 3)
            self.assertTrue(all(t.startswith('Civil Sub Engineer') for t in texts), texts)

    def test_random_practice_cannot_be_widened_by_naming_another_exams_topic(self):
        r = self.client.post(SESSIONS, {'exam': 'all', 'topic': self.exam_b.topic.id, 'mode': 'flexible'}, format='json')
        self.assertEqual(r.status_code, 400)                              # nothing of B is reachable

    def test_multi_course_student_can_start_each_owned_exam_but_not_a_third(self):
        self.enroll(self.course_b)
        self.assertEqual(self.study(self.exam_a).status_code, 200)
        self.assertEqual(self.study(self.exam_b).status_code, 200)
        self.assertEqual(self.study(self.exam_c).status_code, 403)

    def test_expiry_or_cancellation_stops_a_running_session_from_resuming(self):
        sid = self.study(self.exam_a).json()['session']['id']
        Enrollment.objects.filter(student=self.student).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.study(self.exam_a).status_code, 403)
        self.assertTrue(PracticeSession.objects.filter(id=sid).exists())   # data kept, just not reachable

    def test_expired_subscription_is_denied_even_with_a_live_enrollment(self):
        Subscription.objects.filter(student=self.student).update(expiry_date=timezone.now() - timedelta(days=1))
        self.assertEqual(self.study(self.exam_a).status_code, 403)

    def test_staff_can_practise_any_exam(self):
        staff = User.objects.create_user(username='adm', password='pw', role='admin')
        c = APIClient(); c.force_authenticate(staff)
        self.assertEqual(c.post(STUDY, {'exam': self.exam_b.id, 'topic': self.exam_b.topic.id}, format='json').status_code, 200)


class OtherModesRespectAccessTests(ExamAccessBase):
    def setUp(self):
        super().setUp()
        self.enforce(); self.subscribe(); self.enroll(self.course_a)

    def test_daily_practice_draws_only_from_owned_exams(self):
        r = self.client.post(SESSIONS + 'daily/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(all(q['text'].startswith('Civil Sub Engineer') for q in r.json()['questions']))

    def test_daily_practice_with_nothing_owned_gives_no_questions_not_the_whole_bank(self):
        Enrollment.objects.filter(student=self.student).delete()
        StudentProfile.objects.create(user=self.student, access_origin='ADMIN_GRANTED')   # passes the package gate, no target
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        r = self.client.post(SESSIONS + 'daily/', {}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_revision_queue_and_counts_ignore_questions_from_unowned_exams(self):
        own = Question.objects.filter(topic=self.exam_a.topic).first()
        foreign = Question.objects.filter(topic=self.exam_b.topic).first()
        for q in (own, foreign):
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1, times_incorrect=1,
                                           consecutive_incorrect=2, next_review_at=timezone.now() - timedelta(days=1),
                                           last_attempted_at=timezone.now())
        counts = self.client.get(SESSIONS + 'revision_summary/').json()
        self.assertEqual(counts['total_available'], 1)
        r = self.client.post(SESSIONS + 'start_revision/', {}, format='json')
        self.assertEqual([q['id'] for q in r.json()['questions']], [own.id])

    def test_question_catalogue_is_scoped_too(self):
        foreign = Question.objects.filter(topic=self.exam_b.topic).first()
        own = Question.objects.filter(topic=self.exam_a.topic).first()
        self.assertEqual(self.client.get(f'/api/questions/{own.id}/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/questions/{foreign.id}/').status_code, 404)
        body = self.client.get('/api/questions/').json()
        ids = [q['id'] for q in (body['results'] if isinstance(body, dict) else body)]
        self.assertTrue(ids and foreign.id not in ids)

    def test_course_parameter_cannot_grant_access(self):
        r = self.client.post(SESSIONS, {'course': self.course_b.id, 'mode': 'flexible'}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.post(STUDY, {'course': self.course_b.id, 'exam': self.exam_b.id, 'topic': self.exam_b.topic.id}, format='json')
        self.assertEqual(r.status_code, 403)
