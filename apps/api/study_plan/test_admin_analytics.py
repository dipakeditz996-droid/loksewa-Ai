"""Admin Study Plan monitoring: real numbers, one calculation shared with the
student's page, server-side filtering/pagination, and admin-only access."""
import datetime

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import User
from courses.models import Course, Enrollment
from exams.models import (
    ExamSchedule, Examination, ExaminationAttempt, PracticeSession, QuestionAttempt, QuestionMastery, StudentAnswer,
)
from gamification.models import GamificationProfile
from notes.models import StudentMaterialProgress, StudyMaterial
from study_plan import engine
from study_plan import test_overview as base

ADMIN = '/api/admin/study-plan/'


class AdminBase(base.PlanBase):
    def setUp(self):
        super().setUp()
        self.t1, self.t2 = self.exam_a.topics
        self.admin = User.objects.create_user(username='boss', password='pw', role='admin')
        self.teacher = User.objects.create_user(username='teach', password='pw', role='teacher')
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)
        self.enroll(self.course_a)                      # self.student is enrolled in course A

    def student_client(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def new_student(self, name, course=None, days_enrolled=0):
        u = User.objects.create_user(username=name, email=f'{name}@example.com', password='pw', role='student',
                                     first_name=name.title())
        e = Enrollment.objects.create(student=u, course=course or self.course_a)
        if days_enrolled:
            Enrollment.objects.filter(pk=e.pk).update(enrolled_at=timezone.now() - datetime.timedelta(days=days_enrolled))
        return u

    def api(self, path, **params):
        return self.admin_client.get(ADMIN + path, params)

    def rows(self, **params):
        r = self.api('students/', **params)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def row(self, user, **params):
        found = [r for r in self.rows(page_size=100, **params)['results'] if r['student']['id'] == user.id]
        self.assertEqual(len(found), 1, found)
        return found[0]


class PermissionTests(AdminBase):
    ENDPOINTS = ['preparations/', 'overview/', 'students/', 'topics/?exam=1', 'students/1/', 'students/1/plan/']

    def test_only_admins_may_call_any_admin_study_plan_endpoint(self):
        for path in self.ENDPOINTS:
            for label, client in (('student', self.student_client(self.student)), ('teacher', self.student_client(self.teacher)),
                                  ('anonymous', APIClient())):
                r = client.get(ADMIN + path)
                self.assertIn(r.status_code, (401, 403), f'{label} {path} -> {r.status_code}')
        for path in ('preparations/', 'overview/', 'students/'):
            self.assertEqual(self.admin_client.get(ADMIN + path).status_code, 200)

    def test_super_admin_is_allowed_too(self):
        boss = User.objects.create_user(username='root', password='pw', role='super-admin')
        self.assertEqual(self.student_client(boss).get(ADMIN + 'overview/').status_code, 200)

    def test_bad_parameters_are_rejected_not_ignored(self):
        for q in ('status=bogus', 'ordering=password', 'progress=200', 'exam=abc', 'active_from=yesterday'):
            self.assertEqual(self.admin_client.get(ADMIN + 'students/?' + q).status_code, 400, q)

    def test_topics_needs_a_preparation(self):
        self.assertEqual(self.api('topics/').status_code, 400)


class ScopeAndCourseAccessTests(AdminBase):
    def test_only_students_with_a_live_enrolment_in_a_published_course_are_listed(self):
        other = User.objects.create_user(username='nobody', password='pw', role='student')          # never enrolled
        expired = self.new_student('expired')
        Enrollment.objects.filter(student=expired).update(expires_at=timezone.now() - datetime.timedelta(days=1))
        cancelled = self.new_student('cancelled')
        Enrollment.objects.filter(student=cancelled).update(status='cancelled')
        Course.objects.filter(pk=self.course_b.pk).update(status='coming_soon')
        soon = self.new_student('soon', course=self.course_b)
        ids = {r['student']['id'] for r in self.rows()['results']}
        self.assertEqual(ids, {self.student.id})
        for u in (other, expired, cancelled, soon):
            self.assertNotIn(u.id, ids)

    def test_a_student_appears_once_per_preparation_and_only_under_their_own(self):
        self.enroll(self.course_b)
        pairs = {(r['student']['id'], r['exam_id']) for r in self.rows()['results']}
        self.assertEqual(pairs, {(self.student.id, self.exam_a.id), (self.student.id, self.exam_b.id)})
        only_b = {r['exam_id'] for r in self.rows(exam=self.exam_b.id)['results']}
        self.assertEqual(only_b, {self.exam_b.id})

    def test_staff_and_inactive_accounts_are_never_listed(self):
        Enrollment.objects.create(student=self.teacher, course=self.course_a)
        gone = self.new_student('gone')
        User.objects.filter(pk=gone.pk).update(is_active=False)
        ids = {r['student']['id'] for r in self.rows()['results']}
        self.assertEqual(ids, {self.student.id})

    def test_detail_for_a_student_without_a_plan_is_404(self):
        nobody = User.objects.create_user(username='nobody', password='pw', role='student')
        self.assertEqual(self.api(f'students/{nobody.id}/').status_code, 404)
        self.assertEqual(self.api(f'students/{nobody.id}/plan/').status_code, 404)
        self.assertEqual(self.api(f'students/{self.teacher.id}/').status_code, 404)
        self.assertEqual(self.api(f'students/999999/progress/').status_code, 404)

    def test_detail_for_a_preparation_the_student_is_not_in_is_404(self):
        self.assertEqual(self.api(f'students/{self.student.id}/plan/', exam=self.exam_b.id).status_code, 404)
        self.assertEqual(self.api(f'students/{self.student.id}/', exam=self.exam_b.id).status_code, 404)
        self.assertEqual(self.api(f'students/{self.student.id}/nonsense/').status_code, 404)

    def test_preparations_lists_only_preparations_with_students(self):
        r = self.api('preparations/').json()
        self.assertEqual([p['id'] for p in r['preparations']], [self.exam_a.id])
        self.assertEqual(r['preparations'][0]['students'], 1)


class SameNumbersAsTheStudentPageTests(AdminBase):
    """The admin never calculates progress differently from the student's page."""

    def build_activity(self):
        self.answer(self.t1, 10, 6, when=self.days_ago(2))
        self.answer(self.t2, 6, 5, when=self.days_ago(1))
        att = ExaminationAttempt.objects.create(
            examination=Examination.objects.create(title='M', category=self.cat, exam=self.exam_a, status='published',
                                                   exam_type='mock', total_questions=4),
            student=self.student, status='submitted', submitted_at=timezone.now() - datetime.timedelta(days=1),
            percentage=50, passed=False)
        for i, q in enumerate(self.t2.qs[6:10]):
            StudentAnswer.objects.create(attempt=att, question=q, selected_option='b' if i < 2 else 'a', is_correct=i < 2)
        m = StudyMaterial.objects.create(title='N', slug='n', exam=self.exam_a, topic=self.t1, status='published')
        StudentMaterialProgress.objects.create(student=self.student, material=m, progress=40)
        for q in self.t1.qs[:3]:
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1, times_incorrect=1,
                                           next_review_at=timezone.now() - datetime.timedelta(days=3))

    def test_progress_accuracy_revision_and_pace_equal_the_student_page(self):
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a,
                                    exam_date=engine.local_today() + datetime.timedelta(days=40))
        Enrollment.objects.filter(student=self.student).update(enrolled_at=timezone.now() - datetime.timedelta(days=30))
        self.build_activity()
        mine = self.get('progress').json()
        plan = self.get('plan').json()
        admin = self.row(self.student)

        self.assertEqual(admin['progress'], mine['overall']['percent'])
        self.assertEqual(admin['topics_started'], mine['overall']['topics_started'])
        self.assertEqual(admin['pace']['status'], mine['pace']['status'])
        self.assertEqual((admin['pace']['expected_percent'], admin['pace']['actual_percent']),
                         (mine['pace']['expected_percent'], mine['pace']['actual_percent']))
        self.assertEqual(admin['countdown']['days_remaining'], mine['countdown']['days_remaining'])
        attempts = sum(t['attempts'] for s in mine['subjects'] for c in s['chapters'] for t in c['topics'])
        correct = round(admin['accuracy'] * attempts / 100)
        self.assertEqual(admin['attempts'], attempts)
        self.assertAlmostEqual(correct, admin['correct'], delta=1)
        rev = plan['revision']
        self.assertEqual((admin['revision']['due_today'], admin['revision']['reviewed_today'], admin['revision']['remaining']),
                         (rev['due_total_today'], rev['reviewed_today'], rev['due_today']))
        self.assertEqual(admin['revision']['total'], rev['total'])

    def test_the_detail_sections_are_the_students_own_payloads(self):
        self.build_activity()
        sid = self.student.id
        for section in ('plan', 'progress', 'week'):
            theirs = self.get(section).json()
            ours = self.api(f'students/{sid}/{section}/').json()
            self.assertEqual(ours, theirs, section)

    def test_revision_completion_counts_due_and_reviewed_only(self):
        due = self.t1.qs[0]
        m = QuestionMastery.objects.create(user=self.student, question=due, times_answered=1, times_incorrect=1,
                                           next_review_at=timezone.now() - datetime.timedelta(hours=4))
        session = self.client.post('/api/practice-sessions/study/', {'topic': self.t1.id, 'exam': self.exam_a.id},
                                   format='json').json()['session']['id']
        # an unrelated question answered today is practice, not revision
        self.client.post(f'/api/practice-sessions/{session}/answer/',
                         {'question_id': self.t1.qs[5].id, 'selected_option': 'a'}, format='json')
        self.assertEqual(self.row(self.student)['revision']['reviewed_today'], 0)
        self.client.post(f'/api/practice-sessions/{session}/answer/', {'question_id': due.id, 'selected_option': 'b'}, format='json')
        r = self.row(self.student)['revision']
        self.assertEqual((r['due_today'], r['reviewed_today'], r['remaining']), (1, 1, 0))
        self.assertEqual(self.api('overview/').json()['revision']['percent'], 100)

    def test_a_question_answered_in_practice_and_in_an_exam_counts_once(self):
        self.answer(self.t1, 5, 5, when=self.days_ago(1))
        att = ExaminationAttempt.objects.create(
            examination=Examination.objects.create(title='M', category=self.cat, exam=self.exam_a, status='published',
                                                   exam_type='mock', total_questions=5),
            student=self.student, status='submitted', submitted_at=timezone.now())
        for q in self.t1.qs[:5]:
            StudentAnswer.objects.create(attempt=att, question=q, selected_option='b', is_correct=True)
        mine = self.topic_row(self.get('progress').json(), self.t1)
        self.assertEqual(self.row(self.student)['progress'], self.get('progress').json()['overall']['percent'])
        self.assertEqual(mine['answered_questions'], 5)


class StatusAndWarningTests(AdminBase):
    def schedule(self, days):
        return ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=days))

    def test_no_schedule_means_no_pace_status_not_a_made_up_one(self):
        self.answer(self.t1, 5, 4, when=self.days_ago(1))
        r = self.row(self.student)
        self.assertEqual((r['status'], r['status_label']), ('no_schedule', 'No exam date'))
        self.assertIsNone(r['pace']['status'])

    def test_on_track_slightly_behind_and_needs_attention_follow_the_pace_rule(self):
        self.schedule(60)                                                # 30 of 90 days elapsed -> 33% expected
        for name, answered in (('fast', 10), ('slightly', 3), ('slow', 1)):
            u = self.new_student(name, days_enrolled=30)
            for q in self.t1.qs[:answered]:                              # progress = answered / 10 of one of two topics
                session = PracticeSession.objects.create(user=u, exam=self.exam_a, mode='study', total_questions=1)
                QuestionAttempt.objects.create(session=session, question=q, selected_option='b', is_correct=True,
                                               viewed_at=self.days_ago(1))
        rows = {r['student']['username']: r for r in self.rows(page_size=100)['results']}
        self.assertEqual((rows['fast']['progress'], rows['slightly']['progress'], rows['slow']['progress']), (50, 15, 5))
        self.assertEqual(rows['fast']['pace']['expected_percent'], 33)
        self.assertEqual(rows['fast']['status'], 'on_track')
        self.assertEqual(rows['slightly']['status'], 'slightly_behind')
        self.assertEqual(rows['slow']['status'], 'needs_attention')
        self.assertTrue(any(f['code'] == 'behind_pace' for f in rows['slow']['flags']))
        self.assertEqual(rows['fast']['flags'], [])

    def test_inactivity_is_a_visible_flag_with_the_real_number_of_days(self):
        self.answer(self.t1, 3, 3, when=self.days_ago(20))
        r = self.row(self.student)
        self.assertEqual(r['status'], 'inactive')
        self.assertEqual(r['activity'], 'no_recent_activity')
        self.assertEqual(r['idle_days'], 20)
        flag = next(f for f in r['flags'] if f['code'] == 'inactive')
        self.assertEqual(flag['label'], 'No activity for 20 days')
        self.assertTrue(flag['action'])

    def test_a_new_student_with_no_activity_is_not_inactive_until_the_window_passes(self):
        fresh = self.new_student('fresh', days_enrolled=3)
        old = self.new_student('old', days_enrolled=20)
        self.assertNotEqual(self.row(fresh)['status'], 'inactive')
        r = self.row(old)
        self.assertEqual(r['status'], 'inactive')
        self.assertEqual(next(f for f in r['flags'] if f['code'] == 'inactive')['label'], 'No activity since enrolling 20 days ago')

    def test_low_accuracy_needs_enough_answers(self):
        self.answer(self.t1, 10, 2, when=self.days_ago(1))
        self.assertFalse([f for f in self.row(self.student)['flags'] if f['code'] == 'low_accuracy'])   # only 10 answers
        self.answer(self.t2, 10, 2, when=self.days_ago(1))
        r = self.row(self.student)
        flag = next(f for f in r['flags'] if f['code'] == 'low_accuracy')
        self.assertEqual(flag['label'], 'Low practice accuracy: 20% over 20 answers')
        self.assertEqual(r['status'], 'needs_attention')

    def test_overdue_revision_and_failed_exams_flag_the_student(self):
        for q in self.t1.qs[:10]:
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1,
                                           next_review_at=timezone.now() - datetime.timedelta(days=2))
        ex = Examination.objects.create(title='M', category=self.cat, exam=self.exam_a, status='published', exam_type='mock')
        for _ in range(2):
            ExaminationAttempt.objects.create(examination=ex, student=self.student, status='submitted',
                                              submitted_at=timezone.now(), percentage=20, passed=False)
        self.answer(self.t1, 1, 1, when=timezone.now())
        codes = {f['code'] for f in self.row(self.student)['flags']}
        self.assertEqual(codes, {'overdue_revision', 'failed_exams'})
        self.assertEqual(self.row(self.student)['status'], 'needs_attention')

    def test_a_healthy_student_has_no_flags(self):
        self.answer(self.t1, 5, 5, when=timezone.now())
        r = self.row(self.student)
        self.assertEqual(r['flags'], [])
        self.assertEqual(r['activity'], 'active_recently')

    def test_subjective_exams_never_count_as_failed(self):
        ex = Examination.objects.create(title='S', category=self.cat, exam=self.exam_a, status='published', exam_type='subjective')
        for _ in range(3):
            ExaminationAttempt.objects.create(examination=ex, student=self.student, status='submitted',
                                              submitted_at=timezone.now(), percentage=0, passed=False)
        r = self.row(self.student)['exams']
        self.assertEqual(r['objective']['failed'], 0)
        self.assertEqual((r['subjective']['submitted'], r['subjective']['awaiting_evaluation']), (3, 3))


class OverviewTests(AdminBase):
    def test_totals_come_from_the_whole_scope_not_the_page(self):
        for i in range(7):
            self.new_student(f's{i}', days_enrolled=30)              # never active -> inactive
        page = self.rows(page_size=3)
        self.assertEqual(len(page['results']), 3)
        self.assertEqual(page['total'], 8)
        o = self.api('overview/').json()
        self.assertEqual(o['students'], 8)
        self.assertEqual(sum(o['status']['counts'].values()), 8)
        self.assertEqual(o['status']['counts']['inactive'], 7)
        self.assertEqual(o['flagged'], 7)

    def test_average_progress_accuracy_and_target_are_real(self):
        self.answer(self.t1, 10, 8, when=timezone.now())                   # 10 answers today, 80%
        second = self.new_student('second')
        s = PracticeSession.objects.create(user=second, exam=self.exam_a, mode='study', total_questions=1)
        QuestionAttempt.objects.create(session=s, question=self.t1.qs[0], selected_option='a', is_correct=False, viewed_at=timezone.now())
        o = self.api('overview/').json()
        self.assertEqual(o['accuracy']['attempts'], 11)
        self.assertEqual(o['accuracy']['percent'], round(8 * 100 / 11))
        self.assertEqual(o['practice']['questions_today'], 11)
        self.assertEqual(o['practice']['active_today'], 2)
        if o['daily_target']['eligible']:
            self.assertEqual(o['daily_target']['met'], 0)             # nobody reached 20 questions
        first = self.row(self.student)
        self.assertEqual((first['today_questions'], first['daily_target']), (10, 20))

    def test_empty_scope_returns_zeros_and_no_invented_numbers(self):
        Enrollment.objects.all().delete()
        o = self.api('overview/').json()
        self.assertEqual(o['students'], 0)
        self.assertIsNone(o['average_progress'])
        self.assertIsNone(o['accuracy']['percent'])
        self.assertIsNone(o['revision']['percent'])
        self.assertEqual(o['schedules'], [])
        self.assertEqual(self.rows()['results'], [])

    def test_exam_dates_come_from_the_admins_schedule_per_preparation(self):
        self.enroll(self.course_b)
        ExamSchedule.objects.create(title='A exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=20))
        o = self.api('overview/').json()
        by = {s['exam_id']: s for s in o['schedules']}
        self.assertEqual(by[self.exam_a.id]['countdown']['days_remaining'], 20)
        self.assertEqual(by[self.exam_a.id]['countdown']['title'], 'A exam')
        self.assertIsNone(by[self.exam_b.id]['countdown'])
        self.assertEqual(by[self.exam_b.id]['without_schedule'], 1)

    def test_overview_can_be_scoped_to_one_preparation(self):
        self.enroll(self.course_b)
        self.new_student('only_b', course=self.course_b)
        self.assertEqual(self.api('overview/', exam=self.exam_b.id).json()['students'], 2)
        self.assertEqual(self.api('overview/', exam=self.exam_a.id).json()['students'], 1)

    def test_rules_are_returned_so_every_label_is_explainable(self):
        r = self.api('overview/').json()['rules']
        self.assertTrue(r['status'] and r['warnings'] and r['recommendations'])
        self.assertEqual(r['recommendation_events'], 'Recommendation engagement data is not available yet.')


class ListFeaturesTests(AdminBase):
    def test_search_matches_name_username_and_email(self):
        anna = self.new_student('anna')
        self.new_student('bikash')
        for term in ('anna', 'Anna', 'anna@example'):
            self.assertEqual([r['student']['id'] for r in self.rows(search=term)['results']], [anna.id], term)
        self.assertEqual(self.rows(search='zzz')['total'], 0)

    def test_status_activity_and_progress_filters(self):
        self.answer(self.t1, 10, 9, when=timezone.now())                     # active; topic 1 fully answered -> 50%
        stale = self.new_student('stale', days_enrolled=30)
        self.assertEqual({r['student']['id'] for r in self.rows(status='inactive')['results']}, {stale.id})
        self.assertEqual({r['student']['id'] for r in self.rows(activity='active_recently')['results']}, {self.student.id})
        prog = self.row(self.student)['progress']
        bucket = next(k for k, (lo, hi) in {'0-25': (0, 25), '26-50': (26, 50), '51-75': (51, 75), '76-100': (76, 100)}.items() if lo <= prog <= hi)
        self.assertIn(self.student.id, {r['student']['id'] for r in self.rows(progress=bucket)['results']})
        self.assertNotIn(stale.id, {r['student']['id'] for r in self.rows(progress=bucket)['results']})

    def test_date_range_uses_real_last_activity(self):
        self.answer(self.t1, 2, 2, when=self.days_ago(10))
        today = engine.local_today()
        hit = self.rows(active_from=(today - datetime.timedelta(days=12)).isoformat(),
                        active_to=(today - datetime.timedelta(days=8)).isoformat())
        self.assertEqual(hit['total'], 1)
        miss = self.rows(active_from=(today - datetime.timedelta(days=3)).isoformat())
        self.assertEqual(miss['total'], 0)

    def test_pagination_and_ordering(self):
        for i in range(5):
            self.new_student(f'zed{i}')
        first = self.rows(page_size=2, ordering='name')
        second = self.rows(page=2, page_size=2, ordering='name')
        names = [r['student']['name'].lower() for r in first['results'] + second['results']]
        self.assertEqual(names, sorted(names))
        self.assertEqual((first['total'], first['total_pages']), (6, 3))
        self.assertEqual(len(self.rows(page=3, page_size=2)['results']), 2)
        self.assertEqual(len(self.rows(page=9, page_size=2)['results']), 0)
        by_progress = self.rows(ordering='-progress')['results']
        vals = [r['progress'] for r in by_progress if r['progress'] is not None]
        self.assertEqual(vals, sorted(vals, reverse=True))

    def test_needs_attention_sorts_first_by_default(self):
        self.answer(self.t1, 3, 3, when=timezone.now())
        self.new_student('quiet', days_enrolled=30)
        self.assertEqual(self.rows()['results'][0]['student']['username'], 'quiet')

    def test_rows_expose_only_real_fields_and_no_internal_ones(self):
        r = self.rows()['results'][0]
        self.assertNotIn('_topics', r)
        for key in ('student', 'course', 'progress', 'today_questions', 'daily_target', 'accuracy', 'revision',
                    'last_activity', 'status', 'flags', 'preparation'):
            self.assertIn(key, r)
        self.assertNotIn('password', str(r))


class QueryCostTests(AdminBase):
    def count(self, path, **params):
        self.api(path, **params)
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(self.api(path, **params).status_code, 200)
        return len(ctx)

    def test_query_count_does_not_grow_with_the_number_of_students(self):
        self.answer(self.t1, 5, 3, when=self.days_ago(1))
        base_counts = (self.count('overview/'), self.count('students/'), self.count('topics/', exam=self.exam_a.id))
        for i in range(12):
            u = self.new_student(f'bulk{i}', days_enrolled=5)
            s = PracticeSession.objects.create(user=u, exam=self.exam_a, mode='study', total_questions=1)
            QuestionAttempt.objects.create(session=s, question=self.t1.qs[i % 10], selected_option='b', is_correct=True,
                                           viewed_at=self.days_ago(1))
            QuestionMastery.objects.create(user=u, question=self.t1.qs[i % 10], times_answered=1,
                                           next_review_at=timezone.now() - datetime.timedelta(days=1))
        after = (self.count('overview/'), self.count('students/'), self.count('topics/', exam=self.exam_a.id))
        self.assertEqual(base_counts, after)
        self.assertLessEqual(max(after), 30)


class TopicAnalyticsTests(AdminBase):
    def test_topics_without_enough_answers_say_so_instead_of_scoring(self):
        self.answer(self.t1, 5, 5, when=self.days_ago(1))
        data = self.api('topics/', exam=self.exam_a.id).json()
        topics = {t['id']: t for s in data['subjects'] for c in s['chapters'] for t in c['topics']}
        self.assertTrue(topics[self.t1.id]['insufficient_data'])
        self.assertIsNone(topics[self.t1.id]['accuracy'])
        self.assertEqual(data['strong'], [])

    def test_weak_strong_and_rarely_studied_are_classified_by_the_stated_rules(self):
        for i in range(3):
            u = self.new_student(f'p{i}')
            self.answer(self.t1, 10, 2, when=self.days_ago(1), user=u)        # 20% -> weak
            self.answer(self.t2, 10, 9, when=self.days_ago(1), user=u)        # 90% -> strong
        data = self.api('topics/', exam=self.exam_a.id).json()
        topics = {t['id']: t for s in data['subjects'] for c in s['chapters'] for t in c['topics']}
        self.assertEqual((topics[self.t1.id]['class'], topics[self.t1.id]['accuracy']), ('weak', 20))
        self.assertEqual((topics[self.t2.id]['class'], topics[self.t2.id]['accuracy']), ('strong', 90))
        self.assertEqual(topics[self.t1.id]['attempts'], 30)
        subj = data['subjects'][0]
        self.assertEqual(subj['accuracy'], 55)
        self.assertEqual(data['strong'], [])                                   # 55% pooled: not strong ...
        self.assertEqual([s['accuracy'] for s in data['needs_improvement']], [55])   # ... and below the 60% weak line

    def test_a_topic_nobody_started_is_rarely_studied(self):
        data = self.api('topics/', exam=self.exam_a.id).json()
        classes = {t['class'] for s in data['subjects'] for c in s['chapters'] for t in c['topics']}
        self.assertEqual(classes, {'rarely_studied'})

    def test_topic_numbers_only_cover_the_selected_preparation(self):
        self.enroll(self.course_b)
        u = self.new_student('bee', course=self.course_b)
        self.answer(self.exam_b.topics[0], 4, 4, when=self.days_ago(1), user=u)
        data = self.api('topics/', exam=self.exam_a.id).json()
        self.assertEqual(data['students'], 1)
        ids = {t['id'] for s in data['subjects'] for c in s['chapters'] for t in c['topics']}
        self.assertEqual(ids, {self.t1.id, self.t2.id})

    def test_no_students_gives_an_empty_result(self):
        Enrollment.objects.all().delete()
        data = self.api('topics/', exam=self.exam_a.id).json()
        self.assertEqual((data['students'], data['subjects']), (0, []))


class StudentDetailTests(AdminBase):
    def test_detail_header_status_and_recent_exams(self):
        GamificationProfile.objects.create(user=self.student, study_current_streak=4, study_highest_streak=9)
        self.answer(self.t1, 3, 3, when=timezone.now())
        ex = Examination.objects.create(title='Mock 1', category=self.cat, exam=self.exam_a, status='published', exam_type='mock')
        ExaminationAttempt.objects.create(examination=ex, student=self.student, status='submitted',
                                          submitted_at=timezone.now(), percentage=64.4, passed=True)
        r = self.api(f'students/{self.student.id}/').json()
        self.assertEqual(r['student']['username'], 'stu')
        self.assertEqual(r['selected'], self.exam_a.id)
        d = r['detail']
        self.assertEqual(d['streak'], 4)
        self.assertEqual(d['recent_exams'][0]['title'], 'Mock 1')
        self.assertEqual((d['recent_exams'][0]['percentage'], d['recent_exams'][0]['passed']), (64, True))
        self.assertNotIn('_topics', d)

    def test_detail_lists_every_preparation_the_student_is_in(self):
        self.enroll(self.course_b)
        r = self.api(f'students/{self.student.id}/').json()
        self.assertEqual({p['id'] for p in r['preparations']}, {self.exam_a.id, self.exam_b.id})
        self.assertEqual(self.api(f'students/{self.student.id}/', exam=self.exam_b.id).json()['selected'], self.exam_b.id)

    def test_viewing_a_students_plan_changes_nothing(self):
        before = (PracticeSession.objects.count(), QuestionAttempt.objects.count(), GamificationProfile.objects.count())
        for section in ('plan', 'progress', 'week'):
            self.assertEqual(self.api(f'students/{self.student.id}/{section}/').status_code, 200)
        self.assertEqual(before, (PracticeSession.objects.count(), QuestionAttempt.objects.count(), GamificationProfile.objects.count()))


class TaskSummaryTests(AdminBase):
    """The admin's "3 / 5 tasks" is the very task list the student sees."""

    def same_as_student(self, user=None, client=None):
        user = user or self.student
        mine = (client or self.client).get('/api/study-plan/plan/').json()['today']['progress']
        row = self.row(user)['tasks']
        self.assertEqual((row['completed'], row['total']), (mine['completed'], mine['total']), (row, mine))
        return row

    def test_fresh_student_has_the_same_open_tasks(self):
        row = self.same_as_student()
        self.assertGreater(row['total'], 0)
        self.assertEqual(row['completed'], 0)
        self.assertEqual(row['percent'], 0)

    def test_completed_practice_counts_exactly_as_on_the_student_page(self):
        self.answer(self.t1, 10, 2, when=self.days_ago(2))                  # a weak topic -> practice task
        before = self.same_as_student()
        session = self.client.post('/api/practice-sessions/study/', {'topic': self.t1.id, 'exam': self.exam_a.id},
                                   format='json').json()['session']['id']
        for q in self.t1.qs[:10]:
            self.client.post(f'/api/practice-sessions/{session}/answer/', {'question_id': q.id, 'selected_option': 'b'}, format='json')
        after = self.same_as_student()
        self.assertGreater(after['completed'], before['completed'])
        self.assertEqual(before['total'], after['total'])                    # today's list does not shrink when work is done

    def test_revision_notes_and_mock_tasks_match(self):
        for q in self.t2.qs[:4]:
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1, times_incorrect=1,
                                           next_review_at=timezone.now() - datetime.timedelta(hours=3))
        m = StudyMaterial.objects.create(title='Notes', slug='nn', exam=self.exam_a, topic=self.t1, status='published')
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=5))
        Examination.objects.create(title='Mock', category=self.cat, exam=self.exam_a, status='published', exam_type='mock',
                                   total_questions=5, time_limit=30)
        row = self.same_as_student()
        types = {t['type'] for t in self.client.get('/api/study-plan/plan/').json()['today']['tasks']}
        self.assertTrue({'REVISION', 'MOCK_EXAM'} <= types, types)
        StudentMaterialProgress.objects.create(student=self.student, material=m, progress=20)   # notes opened today
        self.same_as_student()
        session = self.client.post('/api/practice-sessions/study/', {'topic': self.t2.id, 'exam': self.exam_a.id},
                                   format='json').json()['session']['id']
        for q in self.t2.qs[:4]:
            self.client.post(f'/api/practice-sessions/{session}/answer/', {'question_id': q.id, 'selected_option': 'a'}, format='json')
        after = self.same_as_student()
        self.assertGreater(after['completed'], row['completed'])

    def test_submitting_the_suggested_mock_completes_it_for_both(self):
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=3))
        mock = Examination.objects.create(title='Mock', category=self.cat, exam=self.exam_a, status='published',
                                          exam_type='mock', total_questions=5, max_attempts=3)
        self.same_as_student()
        ExaminationAttempt.objects.create(examination=mock, student=self.student, status='submitted',
                                          submitted_at=timezone.now(), percentage=40, passed=False)
        row = self.same_as_student()
        self.assertGreaterEqual(row['completed'], 1)

    def test_a_mock_the_student_may_not_take_is_not_counted(self):
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=3))
        Examination.objects.create(title='Other course mock', category=self.cat, exam=self.exam_a, status='published',
                                   exam_type='mock', total_questions=5, course=self.course_b)
        self.same_as_student()
        self.assertNotIn('MOCK_EXAM', {t['type'] for t in self.client.get('/api/study-plan/plan/').json()['today']['tasks']})

    def test_several_students_each_match_their_own_plan(self):
        other = self.new_student('other')
        self.answer(self.t1, 10, 3, when=self.days_ago(2), user=other)
        self.same_as_student(other, self.student_client(other))
        self.same_as_student()

    def test_overview_task_completion_sums_the_students_task_lists(self):
        self.new_student('other2')
        rows = self.rows(page_size=100)['results']
        o = self.api('overview/').json()['tasks']
        self.assertEqual(o['total'], sum(r['tasks']['total'] for r in rows))
        self.assertEqual(o['completed'], sum(r['tasks']['completed'] for r in rows))
        self.assertEqual(o['students_with_tasks'], 2)
        self.assertIsNotNone(o['percent'])

    def test_no_syllabus_content_means_no_tasks_and_no_percentage(self):
        Enrollment.objects.all().delete()
        empty_exam = self.make_exam('Empty prep', topics=1, questions=0)
        course = Course.objects.create(title='Empty', slug='empty', status='published', exam=empty_exam)
        u = self.new_student('nocontent', course=course)
        row = self.row(u)
        self.assertEqual(row['tasks'], {'completed': 0, 'total': 0, 'percent': None})
        self.assertIsNone(row['progress'])

    def test_task_reasons_for_admins_are_not_worded_for_students(self):
        import re
        self.answer(self.t1, 10, 2, when=self.days_ago(2))
        for q in self.t2.qs[:3]:
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1, times_incorrect=1,
                                           next_review_at=timezone.now() - datetime.timedelta(hours=3))
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=4))
        tasks = self.api(f'students/{self.student.id}/plan/').json()['today']['tasks']
        self.assertTrue(tasks)
        for t in tasks:
            self.assertTrue(t['admin_reason'])
            self.assertFalse(re.search(r'\b(you|your)\b', t['admin_reason'], re.I), t['admin_reason'])
        row = self.row(self.student)
        for text in [f['label'] + ' ' + f['action'] for f in row['flags']] + [row['pace'].get('admin_reason', '')]:
            self.assertFalse(re.search(r'\b(you|your)\b', text, re.I), text)


class MockExamAnalyticsTests(AdminBase):
    def subjective_question(self):
        from exams.models import Question
        return Question.objects.create(topic=self.t1, question_type='short_answer', status='approved', text='Explain', marks=5)

    def attempt(self, exam, status='submitted', pct=0, passed=False, when=None):
        return ExaminationAttempt.objects.create(examination=exam, student=self.student, status=status,
                                                 submitted_at=when or timezone.now(), percentage=pct, passed=passed)

    def mock(self, title='M', exam_type='mock'):
        return Examination.objects.create(title=title, category=self.cat, exam=self.exam_a, status='published',
                                          exam_type=exam_type, total_questions=5)

    def test_objective_attempts_are_scored_and_can_fail(self):
        ex = self.mock()
        self.attempt(ex, pct=80, passed=True)
        self.attempt(ex, pct=20, passed=False)
        e = self.row(self.student)['exams']
        self.assertEqual(e['objective'], {'attempts': 2, 'passed': 1, 'failed': 1, 'average': 50})
        self.assertEqual(e['subjective']['submitted'], 0)

    def test_a_mock_with_ungraded_subjective_answers_is_awaiting_never_failed(self):
        ex = self.mock('Mixed')
        att = self.attempt(ex, pct=0, passed=False)                       # partial score, passed=False by default
        StudentAnswer.objects.create(attempt=att, question=self.subjective_question(), answer_text='text')
        self.attempt(ex, pct=10, passed=False)
        e = self.row(self.student)['exams']
        self.assertEqual((e['subjective']['submitted'], e['subjective']['awaiting_evaluation'], e['subjective']['evaluated']), (1, 1, 0))
        self.assertEqual(e['objective']['failed'], 1)                     # only the genuinely scored objective attempt
        self.assertIsNone(e['subjective']['average'])

    def test_graded_subjective_attempts_use_the_real_evaluation_score(self):
        ex = self.mock('Mixed')
        att = self.attempt(ex, status='evaluated', pct=70, passed=True)
        StudentAnswer.objects.create(attempt=att, question=self.subjective_question(), answer_text='text',
                                     evaluated_at=timezone.now(), marks_awarded=3.5)
        e = self.row(self.student)['exams']
        self.assertEqual((e['subjective']['evaluated'], e['subjective']['average']), (1, 70))
        self.assertEqual(e['objective']['attempts'], 0)
        self.assertEqual(e['objective']['failed'], 0)

    def test_subjective_type_exams_are_never_failed_even_without_answer_rows(self):
        ex = self.mock('Written', exam_type='subjective')
        for _ in range(3):
            self.attempt(ex, pct=0, passed=False)
        r = self.row(self.student)
        self.assertEqual(r['exams']['objective']['failed'], 0)
        self.assertEqual(r['exams']['subjective']['awaiting_evaluation'], 3)
        self.assertNotIn('failed_exams', {f['code'] for f in r['flags']})

    def test_failed_exam_warning_counts_only_scored_objective_attempts(self):
        ex = self.mock()
        for _ in range(2):
            self.attempt(ex, pct=10, passed=False)
        mixed = self.mock('Mixed')
        for _ in range(3):
            att = self.attempt(mixed, pct=0, passed=False)
            StudentAnswer.objects.create(attempt=att, question=self.subjective_question(), answer_text='x')
        flag = next(f for f in self.row(self.student)['flags'] if f['code'] == 'failed_exams')
        self.assertEqual(flag['label'], 'Failed 2 scored mock exams')

    def test_subjective_practice_sets_report_awaiting_and_evaluated_from_the_evaluation_records(self):
        from exams.models import Evaluation, SubjectiveAnswer, SubjectiveAttempt, SubjectivePracticeSet
        q = self.subjective_question()
        pset = SubjectivePracticeSet.objects.create(title='Set', exam=self.exam_a, subject=self.t1.chapter.subject)
        waiting = SubjectiveAttempt.objects.create(student=self.student, practice_set=pset, status='submitted')
        SubjectiveAnswer.objects.create(attempt=waiting, question=q, answer_text='a', status='submitted')
        done = SubjectiveAttempt.objects.create(student=self.student, practice_set=pset, status='submitted')
        ans = SubjectiveAnswer.objects.create(attempt=done, question=q, answer_text='a', status='evaluated')
        Evaluation.objects.create(answer=ans, marks_obtained=3)
        SubjectiveAttempt.objects.create(student=self.student, practice_set=pset, status='in-progress')   # not submitted
        s = self.row(self.student)['exams']['subjective_sets']
        self.assertEqual(s, {'submitted': 2, 'awaiting_evaluation': 1, 'evaluated': 1, 'average': 60})
        o = self.api('overview/').json()['exams']['subjective_sets']
        self.assertEqual((o['submitted'], o['awaiting_evaluation'], o['evaluated']), (2, 1, 1))

    def test_overview_keeps_objective_and_subjective_apart(self):
        self.attempt(self.mock(), pct=60, passed=True)
        att = self.attempt(self.mock('Mixed'))
        StudentAnswer.objects.create(attempt=att, question=self.subjective_question(), answer_text='x')
        e = self.api('overview/').json()['exams']
        self.assertEqual((e['objective']['attempts'], e['objective']['average'], e['objective']['failed']), (1, 60, 0))
        self.assertEqual((e['subjective']['submitted'], e['subjective']['awaiting_evaluation']), (1, 1))

    def test_detail_lists_awaiting_attempts_without_a_score(self):
        att = self.attempt(self.mock('Mixed'), pct=0, passed=False)
        StudentAnswer.objects.create(attempt=att, question=self.subjective_question(), answer_text='x')
        self.attempt(self.mock('Objective'), pct=90, passed=True)
        recent = {e['title']: e for e in self.api(f'students/{self.student.id}/').json()['detail']['recent_exams']}
        self.assertEqual((recent['Mixed']['state'], recent['Mixed']['percentage'], recent['Mixed']['passed']), ('awaiting_evaluation', None, None))
        self.assertEqual((recent['Objective']['state'], recent['Objective']['percentage'], recent['Objective']['passed']), ('scored', 90, True))


class ScheduleIntegrationTests(AdminBase):
    def test_the_admins_exam_schedule_drives_the_status_and_reports_its_scope(self):
        Enrollment.objects.filter(student=self.student).update(enrolled_at=timezone.now() - datetime.timedelta(days=30))
        self.answer(self.t1, 1, 1, when=self.days_ago(1))
        today = engine.local_today()
        ExamSchedule.objects.create(title='All exams', exam=None, exam_category=None, exam_date=today + datetime.timedelta(days=90))
        self.assertEqual(self.row(self.student)['countdown']['scope'], 'all')
        ExamSchedule.objects.create(title='Category', exam=None, exam_category=self.cat, exam_date=today + datetime.timedelta(days=80))
        self.assertEqual(self.row(self.student)['countdown']['scope'], 'category')
        ExamSchedule.objects.create(title='Level', exam=self.level, exam_date=today + datetime.timedelta(days=70))
        self.assertEqual(self.row(self.student)['countdown']['scope'], 'level')
        sched = ExamSchedule.objects.create(title='Mine', exam=self.exam_a, exam_date=today + datetime.timedelta(days=60))
        r = self.row(self.student)
        self.assertEqual((r['countdown']['scope'], r['countdown']['title'], r['countdown']['schedule_id']), ('exam', 'Mine', sched.id))
        self.assertIsNotNone(r['pace']['status'])
        self.assertEqual(r['status'], r['pace']['status'])                   # no warnings, so the pace status is the status

    def test_no_schedule_says_so_and_invents_nothing(self):
        r = self.row(self.student)
        self.assertIsNone(r['countdown'])
        self.assertEqual(r['pace']['admin_reason'], 'No exam date configured for this course.')
        o = self.api('overview/').json()
        self.assertIsNone(o['schedules'][0]['countdown'])
        self.assertEqual(o['schedules'][0]['without_schedule'], 1)

    def test_unpublished_and_past_schedules_are_ignored(self):
        today = engine.local_today()
        ExamSchedule.objects.create(title='Draft', exam=self.exam_a, exam_date=today + datetime.timedelta(days=10), is_published=False)
        ExamSchedule.objects.create(title='Past', exam=self.exam_a, exam_date=today - datetime.timedelta(days=3))
        self.assertIsNone(self.row(self.student)['countdown'])

    def test_students_of_each_preparation_get_their_own_schedule(self):
        self.enroll(self.course_b)
        today = engine.local_today()
        ExamSchedule.objects.create(title='A', exam=self.exam_a, exam_date=today + datetime.timedelta(days=20))
        ExamSchedule.objects.create(title='B', exam=self.exam_b, exam_date=today + datetime.timedelta(days=40))
        by = {r['exam_id']: r for r in self.rows(page_size=100)['results']}
        self.assertEqual((by[self.exam_a.id]['countdown']['title'], by[self.exam_b.id]['countdown']['title']), ('A', 'B'))

    def test_a_syllabus_without_content_is_not_called_behind_pace(self):
        Enrollment.objects.all().delete()
        empty = self.make_exam('Empty prep', topics=1, questions=0)
        course = Course.objects.create(title='Empty', slug='empty', status='published', exam=empty)
        u = self.new_student('nocontent', course=course, days_enrolled=10)
        ExamSchedule.objects.create(title='E', exam=empty, exam_date=engine.local_today() + datetime.timedelta(days=20))
        r = self.row(u)
        self.assertIsNone(r['pace']['status'])
        self.assertNotIn('behind_pace', {f['code'] for f in r['flags']})
        self.assertIn('no questions or notes', r['pace']['admin_reason'])
        self.assertEqual((r['status'], r['status_label']), ('no_schedule', 'Pace not measurable'))
        self.assertIsNone(self.student_client(u).get('/api/study-plan/progress/').json()['pace']['status'])   # the student page agrees


class DataIsolationTests(AdminBase):
    def test_a_student_cannot_read_another_students_plan_through_ids_or_urls(self):
        other = self.new_student('victim')
        self.answer(self.t1, 5, 5, when=timezone.now(), user=other)
        c = self.student_client(self.student)
        for path in (f'students/{other.id}/', f'students/{other.id}/plan/', f'students/{other.id}/progress/',
                     f'students/{other.id}/week/', f'students/{self.student.id}/', 'students/?search=victim'):
            r = c.get(ADMIN + path)
            self.assertEqual(r.status_code, 403, path)
            self.assertNotIn('victim', r.content.decode())
        # the student's own plan endpoints only ever describe the signed-in student, whatever `exam` is claimed
        self.assertEqual(c.get('/api/study-plan/plan/', {'exam': self.exam_b.id}).status_code, 403)
        me = c.get('/api/study-plan/progress/').json()
        self.assertEqual(me['exam']['id'], self.exam_a.id)

    def test_a_teacher_cannot_inspect_students(self):
        c = self.student_client(self.teacher)
        for path in ('overview/', 'students/', f'students/{self.student.id}/', f'students/{self.student.id}/plan/'):
            self.assertEqual(c.get(ADMIN + path).status_code, 403, path)
