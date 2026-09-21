"""The Study Plan page: real-data progress, authorisation, transparent
recommendations, derived task completion, and the streak."""
import datetime
from unittest import mock

from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from core.models import AdminSettings, User
from courses.models import Course, CourseApplication, Enrollment
from exams.models import (
    Chapter, Exam, ExamCategory, ExamSchedule, Examination, ExaminationAttempt, Paper, PracticeSession, Question,
    QuestionAttempt, QuestionMastery, StudentAnswer, Subject, Topic, UserTopicProgress,
)
from gamification.models import GamificationProfile
from gamification.services import record_study_activity
from notes.models import StudentMaterialProgress, StudyMaterial
from study_plan import engine
from study_plan.models import StudyPlan

BASE = '/api/study-plan/'


class PlanBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.cat = ExamCategory.objects.create(name='PSC Exams')
        self.level = Exam.objects.create(category=self.cat, name='5th Level Exam')
        self.exam_a = self.make_exam('Civil Sub Engineer', topics=2, questions=10)
        self.exam_b = self.make_exam('Computer Operator', topics=1, questions=4)
        self.course_a = Course.objects.create(title='Civil course', slug='civil', status='published', exam=self.exam_a)
        self.course_b = Course.objects.create(title='Computer course', slug='computer', status='published', exam=self.exam_b)
        self.student = User.objects.create_user(username='stu', password='pw', role='student')
        self.client.force_authenticate(self.student)

    def make_exam(self, name, topics=2, questions=10, status='active'):
        exam = Exam.objects.create(category=self.cat, parent=self.level, name=name, status=status)
        paper = Paper.objects.create(exam=exam, name='P1')
        subject = Subject.objects.create(paper=paper, name=f'{name} subject')
        chapter = Chapter.objects.create(subject=subject, title=f'{name} unit')
        exam.topics = []
        for t in range(topics):
            topic = Topic.objects.create(chapter=chapter, name=f'{name} topic {t + 1}')
            topic.qs = [Question.objects.create(
                topic=topic, question_type='mcq', status='approved', text=f'{name} t{t + 1} q{i}',
                option_a='a', option_b='b', option_c='c', option_d='d', correct_option='B', marks=1)
                for i in range(questions)]
            exam.topics.append(topic)
        return exam

    def enroll(self, course, user=None, **kw):
        return Enrollment.objects.create(student=user or self.student, course=course, **kw)

    def get(self, name, exam=None, client=None):
        url = f'{BASE}{name}/' + (f'?exam={exam.id}' if exam else '')
        return (client or self.client).get(url)

    def answer(self, topic, n, correct, when=None, mode='study', user=None):
        """n real practice answers (`correct` of them right) on `topic`."""
        user = user or self.student
        session = PracticeSession.objects.create(user=user, exam=topic.chapter.subject.paper.exam, mode=mode,
                                                 total_questions=n, completed=(mode != 'study'))
        for i, q in enumerate(topic.qs[:n]):
            QuestionAttempt.objects.create(
                session=session, question=q, selected_option='b' if i < correct else 'a', is_correct=i < correct,
                is_viewed=True, viewed_at=when or timezone.now())
        return session

    @staticmethod
    def days_ago(n):
        return timezone.now() - datetime.timedelta(days=n)

    def topic_row(self, data, topic):
        for s in data['subjects']:
            for c in s['chapters']:
                for t in c['topics']:
                    if t['id'] == topic.id:
                        return t


class AuthorisationTests(PlanBase):
    def test_no_course_means_no_preparation(self):
        for name in ('preparations', 'plan', 'progress', 'week'):
            r = self.get(name)
            self.assertEqual(r.status_code, 200, name)
            self.assertFalse(r.json()['has_preparation'], name)

    def test_single_course_gets_only_its_own_preparation(self):
        self.enroll(self.course_a)
        r = self.get('preparations').json()
        self.assertEqual([p['id'] for p in r['preparations']], [self.exam_a.id])
        self.assertEqual(r['selected'], self.exam_a.id)
        self.assertEqual(r['preparations'][0]['course']['title'], 'Civil course')

    def test_default_preparation_is_the_one_the_student_enrolled_in(self):
        from support.models import StudentProfile
        StudentProfile.objects.create(user=self.student, access_origin='ADMIN_GRANTED', target_position=self.exam_a)
        self.enroll(self.course_b)
        self.student = User.objects.get(pk=self.student.pk)
        self.client.force_authenticate(self.student)
        r = self.get('preparations').json()
        self.assertEqual(r['selected'], self.exam_b.id)                    # bought B; A is only an admin-granted target
        self.assertEqual([p['enrolled'] for p in r['preparations']], [True, False])   # purchased first

    def test_another_students_exam_id_is_refused_on_every_endpoint(self):
        self.enroll(self.course_a)
        for name in ('plan', 'progress', 'week', 'preparations'):
            self.assertEqual(self.get(name, self.exam_b).status_code, 403, name)
        self.assertEqual(self.client.get(f'{BASE}plan/?exam=abc').status_code, 403)

    def test_multi_course_switching_changes_the_data(self):
        self.enroll(self.course_a); self.enroll(self.course_b)
        prep = self.get('preparations').json()
        self.assertEqual(sorted(p['id'] for p in prep['preparations']), sorted([self.exam_a.id, self.exam_b.id]))
        a = self.get('progress', self.exam_a).json()
        b = self.get('progress', self.exam_b).json()
        self.assertEqual({s['name'] for s in a['subjects']}, {'Civil Sub Engineer subject'})
        self.assertEqual({s['name'] for s in b['subjects']}, {'Computer Operator subject'})
        self.assertEqual(a['exam']['id'], self.exam_a.id)
        self.assertEqual(b['exam']['id'], self.exam_b.id)

    def test_expired_or_coming_soon_enrollments_grant_nothing(self):
        self.enroll(self.course_a, expires_at=timezone.now() - datetime.timedelta(days=1))
        self.course_b.status = 'coming_soon'; self.course_b.save()
        self.enroll(self.course_b)
        self.assertFalse(self.get('progress').json()['has_preparation'])

    def test_package_enforcement_applies(self):
        s = AdminSettings.get_settings(); s.enforce_subscription_access = True; s.save()
        self.enroll(self.course_a)
        r = self.get('plan')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['code'], 'subscription_required')

    def test_anonymous_is_rejected(self):
        self.assertEqual(APIClient().get(f'{BASE}plan/').status_code, 401)

    def test_the_admin_kill_switch_is_respected(self):
        self.enroll(self.course_a)
        s = AdminSettings.get_settings(); s.enable_study_plans = False; s.save()
        self.assertEqual(self.get('plan').status_code, 403)

    def test_preferences_only_ever_touch_the_callers_own_plan(self):
        self.enroll(self.course_a)
        other = User.objects.create_user(username='other', password='pw', role='student')
        other_plan = StudyPlan.objects.create(student=other, exam=self.exam_a, daily_minutes=45, daily_questions=15)
        r = self.client.patch(f'{BASE}preferences/', {'daily_minutes': 90, 'daily_questions': 30,
                                                       'student_id': other.id, 'plan_id': other_plan.id}, format='json')
        self.assertEqual(r.status_code, 200)
        other_plan.refresh_from_db()
        self.assertEqual((other_plan.daily_minutes, other_plan.daily_questions), (45, 15))
        mine = StudyPlan.objects.get(student=self.student)
        self.assertEqual((mine.daily_minutes, mine.daily_questions, mine.exam_id), (90, 30, self.exam_a.id))

    def test_preferences_are_validated(self):
        self.enroll(self.course_a)
        for bad in ({'daily_minutes': 3}, {'daily_questions': 'x'}, {'study_days': []}, {'study_days': ['Funday']}):
            self.assertEqual(self.client.patch(f'{BASE}preferences/', bad, format='json').status_code, 400, bad)
        r = self.client.patch(f'{BASE}preferences/', {'study_days': ['Sunday', 'Monday']}, format='json')
        self.assertEqual(r.json()['study_days'], ['Monday', 'Sunday'])

    def test_legacy_plan_endpoint_cannot_pick_an_exam_the_student_does_not_own(self):
        self.enroll(self.course_a)
        r = self.client.post('/api/study-plan/plans/', {'exam': self.exam_b.id, 'daily_minutes': 60, 'study_days': ['Monday']}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(StudyPlan.objects.filter(student=self.student).exists())


class ProgressTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.enroll(self.course_a)
        self.t1, self.t2 = self.exam_a.topics

    def test_untouched_syllabus_is_not_started_and_invents_no_percentage(self):
        d = self.get('progress').json()
        self.assertEqual(self.topic_row(d, self.t1)['status'], 'not_started')
        self.assertIsNone(self.topic_row(d, self.t1)['percent'])
        self.assertEqual(d['overall']['percent'], 0)
        self.assertEqual(d['overall']['topics_started'], 0)

    def test_progress_is_the_share_of_a_topics_questions_answered(self):
        self.answer(self.t1, 5, 4)                               # 5 of 10 answered
        d = self.get('progress').json()
        row = self.topic_row(d, self.t1)
        self.assertEqual((row['percent'], row['status'], row['accuracy'], row['attempts']), (50, 'in_progress', 80, 5))
        self.assertEqual(d['overall']['percent'], 25)            # (50 + 0) / 2 topics
        self.assertEqual(d['subjects'][0]['percent'], 25)

    def test_repeating_the_same_question_does_not_inflate_progress(self):
        self.answer(self.t1, 5, 5); self.answer(self.t1, 5, 5)
        self.assertEqual(self.topic_row(self.get('progress').json(), self.t1)['percent'], 50)

    def test_unsubmitted_timed_practice_answers_do_not_count(self):
        self.answer(self.t1, 5, 5, mode='flexible')              # session not completed -> not scored yet
        PracticeSession.objects.update(completed=False)
        self.assertEqual(self.topic_row(self.get('progress').json(), self.t1)['status'], 'not_started')

    def test_mock_exam_answers_count_as_evidence(self):
        exam = Examination.objects.create(title='M', category=self.cat, exam=self.exam_a, status='published',
                                          total_questions=3, exam_type='mock')
        att = ExaminationAttempt.objects.create(examination=exam, student=self.student, status='submitted',
                                                submitted_at=timezone.now())
        for i, q in enumerate(self.t2.qs[:4]):
            StudentAnswer.objects.create(attempt=att, question=q, selected_option='b' if i < 1 else 'a', is_correct=i < 1)
        row = self.topic_row(self.get('progress').json(), self.t2)
        self.assertEqual((row['percent'], row['accuracy'], row['attempts']), (40, 25, 4))

    def test_notes_progress_contributes_and_uses_only_visible_published_materials(self):
        m = StudyMaterial.objects.create(title='Notes', slug='n1', exam=self.exam_a, topic=self.t1, status='published')
        hidden = StudyMaterial.objects.create(title='Draft', slug='n2', exam=self.exam_a, topic=self.t1, status='draft')
        other_course = StudyMaterial.objects.create(title='Other', slug='n3', exam=self.exam_a, topic=self.t1,
                                                    status='published', course=self.course_b)
        StudentMaterialProgress.objects.create(student=self.student, material=m, progress=100, completed=True)
        StudentMaterialProgress.objects.create(student=self.student, material=hidden, progress=100, completed=True)
        row = self.topic_row(self.get('progress').json(), self.t1)
        # questions 0% and notes 100% -> average 50; the draft and the other course's material are ignored
        self.assertEqual((row['materials'], row['percent']), (1, 50))

    def test_topics_without_any_content_are_listed_but_never_counted(self):
        empty = Topic.objects.create(chapter=self.t1.chapter, name='Empty topic')
        d = self.get('progress').json()
        self.assertEqual(self.topic_row(d, empty)['status'], 'no_content')
        self.assertEqual(d['overall']['topics_with_content'], 2)

    def test_explicit_topic_progress_rows_are_honoured(self):
        UserTopicProgress.objects.create(user=self.student, topic=self.t2, status='in-progress', progress=70)
        self.assertEqual(self.topic_row(self.get('progress').json(), self.t2)['percent'], 70)

    def test_progress_never_leaks_between_students(self):
        self.answer(self.t1, 10, 10)
        other = User.objects.create_user(username='o2', password='pw', role='student')
        self.enroll(self.course_a, user=other)
        c = APIClient(); c.force_authenticate(other)
        self.assertEqual(self.get('progress', client=c).json()['overall']['percent'], 0)
        self.assertEqual(self.get('progress').json()['overall']['percent'], 50)


class CountdownAndPaceTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.enrolment = self.enroll(self.course_a)
        self.today = engine.local_today()

    def schedule(self, days, **kw):
        kw.setdefault('title', 'Official exam')
        return ExamSchedule.objects.create(exam_date=self.today + datetime.timedelta(days=days), **kw)

    def since(self, days_ago):
        Enrollment.objects.filter(pk=self.enrolment.pk).update(
            enrolled_at=timezone.now() - datetime.timedelta(days=days_ago))

    def test_no_schedule_means_no_countdown_and_an_honest_message(self):
        d = self.get('progress').json()
        self.assertIsNone(d['countdown'])
        self.assertEqual(d['pace']['reason'], 'No upcoming exam schedule configured.')
        self.assertIsNone(d['pace']['status'])

    def test_countdown_uses_the_admin_schedule_for_the_students_exam(self):
        self.schedule(47, exam=self.exam_a)
        c = self.get('progress').json()['countdown']
        self.assertEqual((c['source'], c['days_remaining']), ('schedule', 47))

    def test_the_most_specific_schedule_wins_and_others_are_ignored(self):
        self.schedule(10, exam=self.exam_b, title='Somebody elses exam')
        self.schedule(30, exam=None, exam_category=None, title='Global')
        self.schedule(40, exam=self.level, title='Level')
        self.schedule(60, exam=self.exam_a, title='Mine')
        self.assertEqual(self.get('progress').json()['countdown']['title'], 'Mine')
        ExamSchedule.objects.filter(title='Mine').delete()
        self.assertEqual(self.get('progress').json()['countdown']['title'], 'Level')

    def test_each_preparation_counts_down_to_its_own_exam_date_only(self):
        self.enroll(self.course_b)
        self.schedule(20, exam=self.exam_a, title='A exam')
        self.schedule(55, exam=self.exam_b, title='B exam')
        a = self.get('progress', self.exam_a).json()['countdown']
        b = self.get('progress', self.exam_b).json()['countdown']
        self.assertEqual((a['title'], a['days_remaining']), ('A exam', 20))
        self.assertEqual((b['title'], b['days_remaining']), ('B exam', 55))
        # A preparation with no schedule of its own never borrows the other one's date
        ExamSchedule.objects.filter(title='B exam').delete()
        self.assertIsNone(self.get('progress', self.exam_b).json()['countdown'])
        self.assertEqual(self.get('progress', self.exam_a).json()['countdown']['days_remaining'], 20)

    def test_past_and_unpublished_schedules_are_ignored(self):
        self.schedule(-3, exam=self.exam_a)
        self.schedule(20, exam=self.exam_a, is_published=False)
        self.assertIsNone(self.get('progress').json()['countdown'])

    def test_students_own_target_date_is_only_a_labelled_fallback(self):
        StudyPlan.objects.create(student=self.student, exam=self.exam_a,
                                 target_date=self.today + datetime.timedelta(days=20))
        c = self.get('progress').json()['countdown']
        self.assertEqual((c['source'], c['days_remaining']), ('student_target', 20))
        self.schedule(35, exam=self.exam_a)
        self.assertEqual(self.get('progress').json()['countdown']['source'], 'schedule')

    def test_on_track_when_progress_matches_the_pace(self):
        self.schedule(50, exam=self.exam_a); self.since(50)               # halfway through the window
        self.answer(self.exam_a.topics[0], 10, 8); self.answer(self.exam_a.topics[1], 10, 8)   # 100% -> ahead
        p = self.get('progress').json()['pace']
        self.assertEqual((p['status'], p['expected_percent'], p['actual_percent']), ('on_track', 50, 100))

    def test_slightly_behind_and_needs_attention_are_explained(self):
        self.schedule(50, exam=self.exam_a); self.since(50)
        self.answer(self.exam_a.topics[0], 10, 8)                          # overall 50% == expected 50 -> on track
        self.assertEqual(self.get('progress').json()['pace']['status'], 'on_track')
        PracticeSession.objects.all().delete()
        self.answer(self.exam_a.topics[0], 6, 6)                           # topic 60% -> overall 30% vs 50%
        p = self.get('progress').json()['pace']
        self.assertEqual((p['status'], p['label']), ('slightly_behind', 'Slightly Behind'))
        PracticeSession.objects.all().delete()
        p = self.get('progress').json()['pace']                            # nothing done: 0% vs 50%
        self.assertEqual(p['status'], 'needs_attention')
        self.assertIn('50%', p['reason'])
        self.assertIn('rule', p)

    def test_no_history_means_no_pace_rather_than_a_guess(self):
        Enrollment.objects.all().delete()
        Enrollment.objects.create(student=self.student, course=self.course_a)
        self.schedule(30, exam=self.exam_a)
        # enrolled just now: elapsed 0 of 30 days -> expected 0, and the student is at 0 -> on track, not invented
        p = self.get('progress').json()['pace']
        self.assertEqual((p['status'], p['expected_percent']), ('on_track', 0))


class WeakRevisionTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.enroll(self.course_a)
        self.t1, self.t2 = self.exam_a.topics

    def test_weak_topics_use_real_accuracy_and_a_minimum_sample(self):
        self.answer(self.t1, 10, 4)               # 40% over 10 -> weak
        self.answer(self.t2, 2, 0)                # 0% but only 2 answers -> too few to judge
        w = self.get('plan').json()['weak_topics']
        self.assertEqual([t['id'] for t in w['topics']], [self.t1.id])
        self.assertEqual((w['topics'][0]['accuracy'], w['topics'][0]['attempts']), (40, 10))
        self.assertIn('practice_url', w['topics'][0])
        self.assertIn('topic=%d' % self.t1.id, w['topics'][0]['practice_url'])

    def test_strong_topics_are_never_listed(self):
        self.answer(self.t1, 10, 9)
        self.assertEqual(self.get('plan').json()['weak_topics']['topics'], [])

    def test_repeated_incorrect_comes_from_the_revision_data(self):
        self.answer(self.t1, 10, 3)
        QuestionMastery.objects.create(user=self.student, question=self.t1.qs[0], times_answered=3, times_incorrect=3,
                                       consecutive_incorrect=3, next_review_at=timezone.now())
        self.assertEqual(self.get('plan').json()['weak_topics']['topics'][0]['repeated_incorrect'], 1)

    def test_revision_queue_counts_due_today_tomorrow_and_later(self):
        now = timezone.now()
        start, tomorrow = engine.day_bounds(engine.local_today())
        for q, due in zip(self.t1.qs[:6], [now - datetime.timedelta(days=2), start + datetime.timedelta(hours=1),
                                           tomorrow + datetime.timedelta(hours=2), tomorrow + datetime.timedelta(hours=5),
                                           tomorrow + datetime.timedelta(days=3), tomorrow + datetime.timedelta(days=9)]):
            QuestionMastery.objects.create(user=self.student, question=q, times_answered=1, next_review_at=due)
        r = self.get('plan').json()['revision']
        self.assertEqual((r['total'], r['due_today'], r['due_tomorrow'], r['later']), (6, 2, 2, 2))

    def test_revision_queue_is_limited_to_the_selected_preparation(self):
        self.enroll(self.course_b)
        QuestionMastery.objects.create(user=self.student, question=self.exam_b.topics[0].qs[0], times_answered=1,
                                       next_review_at=timezone.now())
        self.assertEqual(self.get('plan', self.exam_a).json()['revision']['total'], 0)
        self.assertEqual(self.get('plan', self.exam_b).json()['revision']['total'], 1)


class TodayPlanTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.enroll(self.course_a)
        self.t1, self.t2 = self.exam_a.topics
        self.client.patch(f'{BASE}preferences/', {'daily_minutes': 120, 'daily_questions': 20}, format='json')

    def today(self):
        return self.get('plan').json()['today']

    def test_a_new_student_gets_a_plan_built_from_the_real_syllabus(self):
        t = self.today()
        self.assertTrue(t['tasks'])
        names = {topic.name for topic in (self.t1, self.t2)}
        for task in t['tasks']:
            self.assertIn(task['type'], {'STUDY', 'PRACTICE', 'REVISION', 'MOCK_EXAM'})
            self.assertTrue(task['action']['url'].startswith('/student/'))
            if task['topic']:
                self.assertIn(task['topic']['name'], names)
        self.assertEqual(t['progress']['completed'], 0)

    def test_weak_topic_comes_first_and_says_why(self):
        self.answer(self.t2, 10, 3, when=self.days_ago(2))
        first = self.today()['tasks'][0]
        self.assertEqual((first['type'], first['topic']['id']), ('PRACTICE', self.t2.id))
        self.assertIn('Weak topic', first['reason'])
        self.assertIn('30% correct', first['reason'])

    def test_exam_proximity_is_reflected_in_the_reason(self):
        self.answer(self.t2, 10, 3, when=self.days_ago(2))
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a,
                                    exam_date=engine.local_today() + datetime.timedelta(days=12))
        self.assertIn('in 12 days', self.today()['tasks'][0]['reason'])

    def test_tasks_fit_the_daily_minutes(self):
        self.client.patch(f'{BASE}preferences/', {'daily_minutes': 25, 'daily_questions': 20}, format='json')
        t = self.today()
        self.assertLessEqual(t['planned_minutes'], 25 + 20)      # first task always fits; the rest respect the budget
        self.assertLessEqual(len(t['tasks']), 2)

    def test_completion_comes_from_real_activity_not_a_button(self):
        self.answer(self.t2, 10, 3, when=timezone.now() - datetime.timedelta(days=3))   # makes t2 weak (old activity)
        before = self.today()
        task = before['tasks'][0]
        self.assertFalse(task['completed'])
        self.assertEqual(task['done'], 0)
        self.answer(self.t2, task['target'], task['target'])                              # do today's practice
        after = self.today()['tasks'][0]
        self.assertTrue(after['completed'])
        self.assertEqual(after['done'], after['target'])
        self.assertEqual(self.today()['progress']['completed'], 1)
        # there is no endpoint that ticks a task off
        self.assertEqual(self.client.post(f'{BASE}plan/', {}, format='json').status_code, 405)

    def test_partial_practice_shows_partial_progress(self):
        self.answer(self.t2, 10, 3, when=timezone.now() - datetime.timedelta(days=3))
        target = self.today()['tasks'][0]['target']
        self.answer(self.t2, 4, 4)
        task = self.today()['tasks'][0]
        self.assertEqual((task['done'], task['completed']), (4, False))
        self.assertGreater(target, 4)

    def test_notes_task_completes_when_the_notes_are_opened_today(self):
        m = StudyMaterial.objects.create(title='Notes', slug='n1', exam=self.exam_a, topic=self.t1, status='published')
        study = [t for t in self.today()['tasks'] if t['type'] == 'STUDY'][0]
        self.assertEqual(study['action']['url'], f'/student/notes/{m.id}')
        self.assertFalse(study['completed'])
        StudentMaterialProgress.objects.create(student=self.student, material=m, progress=30)
        study = [t for t in self.today()['tasks'] if t['type'] == 'STUDY'][0]
        self.assertTrue(study['completed'])

    def test_mock_exam_is_suggested_only_close_to_the_exam_and_only_if_authorised(self):
        Examination.objects.create(title='Full mock', category=self.cat, exam=self.exam_a, status='published',
                                   exam_type='mock', total_questions=100, time_limit=120, total_marks=100)
        Examination.objects.create(title='Other course mock', category=self.cat, exam=self.exam_b, status='published',
                                   exam_type='mock', total_questions=10, time_limit=20, total_marks=10)
        self.assertFalse([t for t in self.today()['tasks'] if t['type'] == 'MOCK_EXAM'])       # no exam date
        ExamSchedule.objects.create(title='Exam', exam=self.exam_a, exam_date=engine.local_today() + datetime.timedelta(days=9))
        mocks = [t for t in self.today()['tasks'] if t['type'] == 'MOCK_EXAM']
        self.assertEqual(len(mocks), 1)
        self.assertEqual(mocks[0]['title'], 'Take a mock exam — Full mock')
        rec = self.get('plan').json()['recommendations']['mock']
        self.assertEqual((rec['title'], rec['total_questions'], rec['time_limit']), ('Full mock', 100, 120))

    def test_recommended_mock_respects_publication_window_and_attempt_limit(self):
        ex = Examination.objects.create(title='Old', category=self.cat, exam=self.exam_a, status='published', exam_type='mock',
                                        total_questions=5, end_time=timezone.now() - datetime.timedelta(days=1))
        Examination.objects.create(title='Draft', category=self.cat, exam=self.exam_a, status='draft', exam_type='mock', total_questions=5)
        used = Examination.objects.create(title='Used', category=self.cat, exam=self.exam_a, status='published', exam_type='mock',
                                          total_questions=5, max_attempts=1)
        ExaminationAttempt.objects.create(examination=used, student=self.student, status='submitted')
        self.assertIsNone(self.get('plan').json()['recommendations']['mock'])

    def test_not_a_study_day_is_flagged(self):
        today = engine.local_today()
        others = [d for d in engine.WEEKDAYS if d != engine.WEEKDAYS[today.weekday()]]
        self.client.patch(f'{BASE}preferences/', {'study_days': others}, format='json')
        self.assertFalse(self.today()['is_study_day'])

    def test_tomorrow_skips_what_was_done_today_and_carries_no_fake_items(self):
        self.answer(self.t2, 10, 3, when=timezone.now() - datetime.timedelta(days=3))
        first = self.today()['tasks'][0]
        self.answer(self.t2, first['target'], first['target'])
        tomorrow = self.today()['tomorrow']
        self.assertTrue(all(item['action']['url'] for item in tomorrow))
        self.assertNotIn(f"practice:{self.t2.id}", [i['id'] for i in tomorrow][:1])

    def test_practice_recommendation_comes_from_the_practice_flow(self):
        self.answer(self.t1, 10, 3)
        rec = self.get('plan').json()['recommendations']['practice']
        self.assertEqual(rec['topic_id'], self.t1.id)
        self.assertIn('/student/practice/session?', rec['url'])
        self.assertIn(f'exam={self.exam_a.id}', rec['url'])
        self.assertIn('mode=flexible', rec['url'])

    def test_continue_learning_uses_the_latest_real_activity(self):
        self.assertIsNone(self.get('plan').json()['continue_learning'])
        self.answer(self.t1, 3, 3, when=timezone.now() - datetime.timedelta(days=2))
        self.answer(self.t2, 3, 3)
        cl = self.get('plan').json()['continue_learning']
        self.assertEqual(cl['topic_id'], self.t2.id)
        self.assertEqual(cl['percent'], 30)

    def test_a_failing_section_is_isolated(self):
        with mock.patch('study_plan.engine.weak_topics', side_effect=RuntimeError('boom')):
            r = self.get('plan')
        self.assertEqual(r.status_code, 200)
        d = r.json()
        self.assertEqual(d['weak_topics'], {'error': 'Could not load this section.'})
        self.assertTrue(d['today']['tasks'])
        self.assertNotIn('error', d['revision'])


class WeekAndStreakTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.enroll(self.course_a)
        self.t1 = self.exam_a.topics[0]
        self.client.patch(f'{BASE}preferences/', {'daily_questions': 10}, format='json')

    def test_week_shows_real_daily_activity_against_the_target(self):
        today = engine.local_today()
        monday = today - datetime.timedelta(days=today.weekday())
        self.answer(self.t1, 5, 5, when=timezone.now())                                   # today: 5 of 10
        if today.weekday() > 0:
            self.answer(self.t1, 10, 10, when=timezone.now() - datetime.timedelta(days=today.weekday()))   # Monday: 10 of 10
        days = {d['date']: d for d in self.get('week').json()['days']}
        self.assertEqual(len(days), 7)
        todays = days[today.isoformat()]
        self.assertEqual((todays['questions'], todays['percent'], todays['state'], todays['is_today']), (5, 50, 'partial', True))
        if today.weekday() > 0:
            self.assertEqual(days[monday.isoformat()]['state'], 'done')
        future = [d for d in days.values() if d['date'] > today.isoformat()]
        self.assertTrue(all(d['state'] == 'none' and d['percent'] is None for d in future))

    def test_study_time_is_not_invented(self):
        s = self.get('week').json()['study_time']
        self.assertFalse(s['available'])
        self.assertEqual(s['recorded_minutes'], 0)
        self.assertEqual(s['label'], 'Tracked Practice & Exam Time')
        exam = Examination.objects.create(title='M', category=self.cat, exam=self.exam_a, status='published', exam_type='mock', total_questions=5)
        ExaminationAttempt.objects.create(examination=exam, student=self.student, status='submitted',
                                          submitted_at=timezone.now(), time_taken_seconds=1800)
        s = self.get('week').json()['study_time']
        self.assertEqual((s['available'], s['recorded_minutes']), (True, 30))
        self.assertIn('mock exams', s['note'])
        self.assertIn('not your total study time', s['note'])

    def test_the_streak_is_read_from_gamification_not_recomputed(self):
        GamificationProfile.objects.create(user=self.student, study_current_streak=6, study_highest_streak=9)
        self.answer(self.t1, 3, 3)
        s = self.get('week').json()['streak']
        self.assertEqual((s['current'], s['highest']), (6, 9))


class StreakRecorderTests(PlanBase):
    def test_first_activity_starts_a_streak_and_repeats_are_idempotent(self):
        self.assertEqual(record_study_activity(self.student), 1)
        self.assertEqual(record_study_activity(self.student), 1)
        self.assertEqual(GamificationProfile.objects.get(user=self.student).study_current_streak, 1)

    def test_consecutive_days_extend_and_a_gap_resets(self):
        now = timezone.now()
        record_study_activity(self.student, when=now - datetime.timedelta(days=2))
        self.assertEqual(record_study_activity(self.student, when=now - datetime.timedelta(days=1)), 2)
        self.assertEqual(record_study_activity(self.student, when=now), 3)
        self.assertEqual(GamificationProfile.objects.get(user=self.student).study_highest_streak, 3)
        self.assertEqual(record_study_activity(self.student, when=now + datetime.timedelta(days=3)), 1)

    def test_answering_a_practice_question_counts_as_studying(self):
        self.enroll(self.course_a)
        topic = self.exam_a.topics[0]
        r = self.client.post('/api/practice-sessions/study/', {'topic': topic.id, 'exam': self.exam_a.id}, format='json')
        sid, qid = r.json()['session']['id'], r.json()['questions'][0]['id']
        self.client.post(f'/api/practice-sessions/{sid}/answer/', {'question_id': qid, 'selected_option': 'b'}, format='json')
        self.assertEqual(GamificationProfile.objects.get(user=self.student).study_current_streak, 1)


class CostTests(PlanBase):
    def test_each_section_uses_a_bounded_number_of_queries(self):
        self.enroll(self.course_a)
        for t in self.exam_a.topics:
            self.answer(t, 6, 3)
        AdminSettings.get_settings()
        for name, bound in (('plan', 30), ('progress', 22), ('week', 20), ('preparations', 14)):
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.get(name).status_code, 200)
            self.assertLessEqual(len(ctx), bound, (name, len(ctx), [q['sql'][:60] for q in ctx.captured_queries]))

    def test_query_count_does_not_grow_with_the_size_of_the_syllabus(self):
        self.enroll(self.course_a)
        AdminSettings.get_settings()
        self.get('progress')                       # warm-up: first-use lookups aren't the syllabus's cost
        with CaptureQueriesContext(connection) as small:
            self.get('progress')
        for i in range(15):
            topic = Topic.objects.create(chapter=self.exam_a.topics[0].chapter, name=f'extra {i}')
            Question.objects.create(topic=topic, question_type='mcq', status='approved', text=f'x{i}', option_a='a',
                                    option_b='b', option_c='c', option_d='d', correct_option='A')
        with CaptureQueriesContext(connection) as large:
            self.get('progress')
        self.assertEqual(len(small), len(large), [q['sql'][:90] for q in small.captured_queries])



class RevisionCompletionTests(PlanBase):
    """A revision counts as completed only when a question that was DUE is
    answered - not whenever any question is answered."""

    def setUp(self):
        super().setUp()
        self.enroll(self.course_a)
        self.t1, self.t2 = self.exam_a.topics
        self.session = self.client.post('/api/practice-sessions/study/', {'topic': self.t1.id, 'exam': self.exam_a.id}, format='json').json()['session']['id']

    def mastery(self, question, due_in_hours, times=1, wrong=True):
        return QuestionMastery.objects.create(
            user=self.student, question=question, times_answered=times, times_incorrect=times if wrong else 0,
            times_correct=0 if wrong else times, next_review_at=timezone.now() + datetime.timedelta(hours=due_in_hours),
            last_attempted_at=timezone.now() - datetime.timedelta(days=2))

    def due_today(self, question):
        return self.mastery(question, -3)

    def answer_via_api(self, question, option='b'):
        r = self.client.post(f'/api/practice-sessions/{self.session}/answer/',
                             {'question_id': question.id, 'selected_option': option}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def revision(self):
        return self.get('plan').json()['revision']

    def revision_task(self):
        tasks = [t for t in self.get('plan').json()['today']['tasks'] if t['type'] == 'REVISION']
        return tasks[0] if tasks else None

    def test_case_a_a_due_question_that_is_answered_counts_once(self):
        q = self.t1.qs[0]
        self.due_today(q)
        self.assertEqual((self.revision()['due_total_today'], self.revision()['reviewed_today']), (1, 0))
        self.answer_via_api(q)
        r = self.revision()
        self.assertEqual((r['reviewed_today'], r['due_total_today'], r['due_today']), (1, 1, 0))
        task = self.revision_task()
        self.assertEqual((task['done'], task['target'], task['completed']), (1, 1, True))

    def test_case_b_a_question_that_is_not_due_does_not_count(self):
        due, other = self.t1.qs[0], self.t1.qs[1]
        self.due_today(due)
        self.mastery(other, 24 * 6)                       # next review in six days
        self.answer_via_api(other)
        r = self.revision()
        self.assertEqual((r['reviewed_today'], r['due_today']), (0, 1))
        task = self.revision_task()
        self.assertEqual((task['done'], task['completed']), (0, False))

    def test_case_c_a_question_due_tomorrow_answered_today_does_not_count(self):
        due, tomorrow = self.t1.qs[0], self.t1.qs[1]
        self.due_today(due)
        _start, tomorrow_start = engine.day_bounds(engine.local_today())
        QuestionMastery.objects.create(user=self.student, question=tomorrow, times_answered=1, times_incorrect=1,
                                       next_review_at=tomorrow_start + datetime.timedelta(hours=3))
        self.answer_via_api(tomorrow)
        r = self.revision()
        self.assertEqual((r['reviewed_today'], r['due_today']), (0, 1))
        self.assertEqual(self.revision_task()['done'], 0)

    def test_case_d_five_due_two_reviewed_is_two_of_five(self):
        for q in self.t1.qs[:5]:
            self.due_today(q)
        for q in self.t1.qs[:2]:
            self.answer_via_api(q)
        r = self.revision()
        self.assertEqual((r['due_total_today'], r['reviewed_today'], r['due_today']), (5, 2, 3))
        task = self.revision_task()
        self.assertEqual((task['done'], task['target'], task['completed']), (2, 5, False))
        self.assertEqual(task['detail'], '5 due today · 2 reviewed')

    def test_case_e_answering_the_same_due_item_again_does_not_inflate_completion(self):
        q = self.t1.qs[0]
        m = self.due_today(q)
        self.answer_via_api(q)
        self.answer_via_api(q, 'a')                       # a second tab / retry: the server keeps the first answer
        m.refresh_from_db()
        m.record_answer(False)                            # even a direct re-answer later the same day
        m.record_answer(True)
        self.assertEqual(self.revision()['reviewed_today'], 1)

    def test_a_first_attempt_is_never_a_revision(self):
        q = self.t1.qs[0]
        self.answer_via_api(q)                            # no mastery row yet
        m = QuestionMastery.objects.get(user=self.student, question=q)
        self.assertIsNone(m.last_due_review_at)
        self.assertEqual(self.revision()['reviewed_today'], 0)

    def test_unrelated_practice_today_does_not_complete_revision(self):
        self.due_today(self.t1.qs[0])
        self.answer(self.t2, 10, 10)                      # ten practice answers today, none of them the due question
        self.assertEqual(self.revision()['reviewed_today'], 0)
        self.assertFalse(self.revision_task()['completed'])

    def test_a_review_from_yesterday_does_not_count_today(self):
        q = self.t1.qs[0]
        m = self.due_today(q)
        m.last_due_review_at = timezone.now() - datetime.timedelta(days=1)
        m.next_review_at = timezone.now() + datetime.timedelta(days=2)
        m.save()
        self.assertEqual(self.revision()['reviewed_today'], 0)

    def test_the_queue_only_counts_questions_of_the_selected_preparation(self):
        self.enroll(self.course_b)
        self.due_today(self.exam_b.topics[0].qs[0])
        self.assertEqual(self.get('plan', self.exam_a).json()['revision']['total'], 0)
        r = self.get('plan', self.exam_b).json()['revision']
        self.assertEqual((r['total'], r['due_total_today']), (1, 1))

    def test_nothing_due_means_no_revision_task(self):
        self.mastery(self.t1.qs[0], 24 * 3)
        self.assertIsNone(self.revision_task())
        self.assertEqual(self.revision()['due_total_today'], 0)
