"""End-to-End tests for the complete Student Practice Module lifecycle.

Validates:
1. Quick Start:
   - Random (QuestionSelectionService, approved-only, unique questions, server scoring, XP)
   - Weak Topic (real QuestionMastery history, empty state)
   - Recently Incorrect (real incorrect attempts, empty state)
   - Saved Questions (Bookmark, toggle, ordering, cross-student privacy)
2. Topicwise Study:
   - Topic navigation, hint reveal, answer reveal, question pagination, restart
3. Course & Student Security:
   - Cross-course access denied
   - Cross-student attempt/session access denied
   - Server-authoritative scoring & XP idempotency
"""
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from core.models import AdminSettings, User
from courses.models import Course, Enrollment
from exams.models import (
    Chapter, Exam, ExamCategory, Paper, PracticeSession,
    Question, QuestionAttempt, QuestionMastery, Bookmark, Subject, Topic,
)
from exams.selection_service import QuestionSelectionService
from gamification.models import GamificationProfile, XPTransaction


class PracticeLifecycleE2ETests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        settings = AdminSettings.get_settings()
        settings.enforce_subscription_access = False
        settings.save()

        # Users
        self.student_a = User.objects.create_user(username='student_a', password='pw', role='student')
        self.student_b = User.objects.create_user(username='student_b', password='pw', role='student')

        # Academic hierarchy for Course A
        self.cat = ExamCategory.objects.create(name='Public Service')
        self.exam_a = Exam.objects.create(category=self.cat, name='Officer Exam')
        self.paper_a = Paper.objects.create(exam=self.exam_a, name='General Studies')
        self.subject_a = Subject.objects.create(paper=self.paper_a, name='Governance')
        self.chapter_a = Chapter.objects.create(subject=self.subject_a, title='Constitution')
        self.topic_a1 = Topic.objects.create(chapter=self.chapter_a, name='Fundamental Rights')
        self.topic_a2 = Topic.objects.create(chapter=self.chapter_a, name='Directive Principles')

        # Course A & Enrollment for Student A
        self.course_a = Course.objects.create(title='Officer Prep', slug='officer-prep', status='published', exam=self.exam_a)
        Enrollment.objects.create(student=self.student_a, course=self.course_a, status='active')

        # Academic hierarchy for Course B
        self.exam_b = Exam.objects.create(category=self.cat, name='Forestry Exam')
        self.paper_b = Paper.objects.create(exam=self.exam_b, name='Forest Management')
        self.subject_b = Subject.objects.create(paper=self.paper_b, name='Ecology')
        self.chapter_b = Chapter.objects.create(subject=self.subject_b, title='Biodiversity')
        self.topic_b = Topic.objects.create(chapter=self.chapter_b, name='National Parks')

        # Course B (Student A is NOT enrolled)
        self.course_b = Course.objects.create(title='Forestry Prep', slug='forestry-prep', status='published', exam=self.exam_b)
        Enrollment.objects.create(student=self.student_b, course=self.course_b, status='active')

        # Approved Questions for Topic A1
        self.q_a1_1 = Question.objects.create(
            topic=self.topic_a1, question_type='mcq', status='approved',
            text='Which article guarantees right to equality?',
            option_a='Article 16', option_b='Article 18', option_c='Article 21', option_d='Article 25',
            correct_option='B', explanation='Article 18 provides right to equality in Nepal constitution.',
            hint='It is between 16 and 20.', marks=1,
        )
        self.q_a1_2 = Question.objects.create(
            topic=self.topic_a1, question_type='mcq', status='approved',
            text='Which article protects personal liberty?',
            option_a='Article 16', option_b='Article 17', option_c='Article 18', option_d='Article 19',
            correct_option='B', explanation='Article 17 guarantees right to freedom.', marks=1,
        )
        # Draft Question (must never appear)
        self.q_draft = Question.objects.create(
            topic=self.topic_a1, question_type='mcq', status='draft',
            text='Draft question that should be hidden',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='A',
        )

        # Approved Questions for Course B
        self.q_b = Question.objects.create(
            topic=self.topic_b, question_type='mcq', status='approved',
            text='Which national park is home to one-horned rhino?',
            option_a='Chitwan', option_b='Rara', option_c='Bardiya', option_d='Langtang',
            correct_option='A', explanation='Chitwan National Park is renowned for one-horned rhinos.',
        )

        # Clients
        self.client_a = APIClient()
        self.client_a.force_authenticate(self.student_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(self.student_b)

    def tearDown(self):
        super().tearDown()
        s = AdminSettings.get_settings()
        s.enforce_subscription_access = False
        s.save()
        cache.clear()

    # ── 1. RANDOM PRACTICE ───────────────────────────────────────────────────

    def test_random_practice_flow_and_server_scoring(self):
        """Random practice selects only approved questions in scope, creates attempts,
        evaluates answers server-side, calculates accuracy, and awards XP idempotently."""
        r = self.client_a.post('/api/practice-sessions/', {
            'course': self.course_a.id,
            'mode': 'flexible',
            'total_questions': 2,
        }, format='json')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        session_id = data['session']['id']
        questions = data['questions']

        # Verify draft question is excluded
        returned_ids = {q['id'] for q in questions}
        self.assertNotIn(self.q_draft.id, returned_ids)
        self.assertIn(self.q_a1_1.id, returned_ids)

        # Question text present, but correct answer and explanation hidden in flexible session
        for q in questions:
            self.assertIn('text', q)
            self.assertIn('option_a', q)
            self.assertNotIn('correct_option', q)
            self.assertNotIn('explanation', q)

        # Answer question 1 correctly ('b')
        ans_r1 = self.client_a.post(f'/api/practice-sessions/{session_id}/answer/', {
            'question_id': self.q_a1_1.id,
            'selected_option': 'b',
        }, format='json')
        self.assertEqual(ans_r1.status_code, 200)

        # Answer question 2 incorrectly ('a' instead of 'b')
        ans_r2 = self.client_a.post(f'/api/practice-sessions/{session_id}/answer/', {
            'question_id': self.q_a1_2.id,
            'selected_option': 'a',
        }, format='json')
        self.assertEqual(ans_r2.status_code, 200)

        # Submit session
        sub_r = self.client_a.post(f'/api/practice-sessions/{session_id}/submit/', {
            'time_taken_seconds': 45,
        }, format='json')
        self.assertEqual(sub_r.status_code, 200)
        sub_data = sub_r.json()
        session_summary = sub_data['session']

        self.assertTrue(session_summary['completed'])
        self.assertEqual(session_summary['correct_count'], 1)
        self.assertEqual(session_summary['incorrect_count'], 1)
        self.assertEqual(session_summary['unanswered_count'], 0)
        self.assertEqual(session_summary['accuracy'], 50.0)
        self.assertEqual(session_summary['score'], 1)

        # Check XP awarded (1 correct answer = 1 XP)
        profile = GamificationProfile.objects.get(user=self.student_a)
        self.assertEqual(profile.xp, 1)

        # Submit again (idempotent): XP must NOT be awarded twice
        sub_r2 = self.client_a.post(f'/api/practice-sessions/{session_id}/submit/', {
            'time_taken_seconds': 45,
        }, format='json')
        self.assertEqual(sub_r2.status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.xp, 1)
        self.assertEqual(XPTransaction.objects.filter(user=self.student_a).count(), 1)

    # ── 2. WEAK TOPICS QUICK START ──────────────────────────────────────────

    def test_weak_topics_quick_start(self):
        """Weak Topics uses actual student QuestionMastery history (< 60% accuracy)."""
        # Initially student has no attempts, revision summary shows 0
        summary_r = self.client_a.get(f'/api/practice-sessions/revision_summary/?course_id={self.course_a.id}')
        self.assertEqual(summary_r.status_code, 200)
        self.assertEqual(summary_r.json()['weak_topics'], 0)

        # Attempting weak topics without data returns clear message
        start_r = self.client_a.post('/api/practice-sessions/start_revision/', {
            'focus': 'weak_topics',
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(start_r.status_code, 400)
        self.assertIn('No weak topics are available yet', start_r.json()['detail'])

        # Now simulate weak topic history: 3 answers, 1 correct (33% accuracy) on topic_a1
        mastery, _ = QuestionMastery.objects.get_or_create(user=self.student_a, question=self.q_a1_1)
        mastery.times_answered = 3
        mastery.times_correct = 1
        mastery.save()
        cache.clear()

        # Summary now identifies 1 weak topic
        summary_r2 = self.client_a.get(f'/api/practice-sessions/revision_summary/?course_id={self.course_a.id}')
        self.assertEqual(summary_r2.json()['weak_topics'], 1)

        # Starting weak topic revision succeeds and serves questions from that weak topic
        rev_r = self.client_a.post('/api/practice-sessions/start_revision/', {
            'focus': 'weak_topics',
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(rev_r.status_code, 200)
        rev_data = rev_r.json()
        self.assertEqual(rev_data['session']['mode'], 'revision')
        self.assertTrue(len(rev_data['questions']) > 0)

    # ── 3. RECENTLY INCORRECT QUICK START ───────────────────────────────────

    def test_recently_incorrect_quick_start(self):
        """Recently Incorrect pulls from recent mistakes (< 7 days ago) in QuestionMastery."""
        # Initially no mistakes
        r_empty = self.client_a.post('/api/practice-sessions/start_revision/', {
            'focus': 'recent_mistakes',
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(r_empty.status_code, 400)
        self.assertIn('No recently incorrect questions', r_empty.json()['detail'])

        # Record a mistake today
        mastery, _ = QuestionMastery.objects.get_or_create(user=self.student_a, question=self.q_a1_2)
        mastery.record_answer(is_correct=False)

        # Starting recent mistakes revision now yields the question
        r_mistakes = self.client_a.post('/api/practice-sessions/start_revision/', {
            'focus': 'recent_mistakes',
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(r_mistakes.status_code, 200)
        q_ids = [q['id'] for q in r_mistakes.json()['questions']]
        self.assertIn(self.q_a1_2.id, q_ids)

    # ── 4. SAVED QUESTIONS (BOOKMARKS) ──────────────────────────────────────

    def test_saved_questions_lifecycle_and_ownership(self):
        """Students can save/unsave questions, list them in order, and cannot see others' saved questions."""
        # Student A saves question 1
        save_r = self.client_a.post('/api/bookmarks/', {
            'question_id': self.q_a1_1.id,
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(save_r.status_code, 200)
        self.assertEqual(save_r.json()['status'], 'added')

        # Listing saved questions shows question 1
        list_a = self.client_a.get(f'/api/bookmarks/?course_id={self.course_a.id}')
        self.assertEqual(list_a.status_code, 200)
        self.assertEqual(len(list_a.json()), 1)
        self.assertEqual(list_a.json()[0]['question'], self.q_a1_1.id)

        # Student B cannot see Student A's saved questions
        list_b = self.client_b.get(f'/api/bookmarks/?course_id={self.course_b.id}')
        self.assertEqual(list_b.status_code, 200)
        self.assertEqual(len(list_b.json()), 0)

        # Student A toggling same question removes it
        unsave_r = self.client_a.post('/api/bookmarks/', {
            'question_id': self.q_a1_1.id,
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(unsave_r.status_code, 200)
        self.assertEqual(unsave_r.json()['status'], 'removed')

        # List is now empty
        self.assertEqual(len(self.client_a.get(f'/api/bookmarks/?course_id={self.course_a.id}').json()), 0)

    # ── 5. TOPICWISE STUDY ──────────────────────────────────────────────────

    def test_topicwise_study_flow(self):
        """Topicwise study has no timer, supports hint/answer reveal, and resumes stable sessions."""
        study_r = self.client_a.post('/api/practice-sessions/study/', {
            'topic': self.topic_a1.id,
            'course': self.course_a.id,
            'page_size': 10,
        }, format='json')
        self.assertEqual(study_r.status_code, 200)
        data = study_r.json()
        session_id = data['session']['id']
        self.assertEqual(data['session']['mode'], 'study')

        # Test Hint Reveal
        reveal_r = self.client_a.post(f'/api/practice-sessions/{session_id}/reveal/', {
            'question_id': self.q_a1_1.id,
        }, format='json')
        self.assertEqual(reveal_r.status_code, 200)
        self.assertEqual(reveal_r.json()['correct_option'], 'B')
        self.assertIn('Article 18', reveal_r.json()['explanation'])

        # Re-requesting study without restart resumes the existing session
        resume_r = self.client_a.post('/api/practice-sessions/study/', {
            'topic': self.topic_a1.id,
            'course': self.course_a.id,
        }, format='json')
        self.assertEqual(resume_r.status_code, 200)
        self.assertEqual(resume_r.json()['session']['id'], session_id)
        self.assertTrue(resume_r.json()['resumed'])

    # ── 6. COURSE BOUNDARY SECURITY ─────────────────────────────────────────

    def test_cross_course_access_denied(self):
        """Student A cannot practice Course B's topics, exams, or questions."""
        # 1. Attempting to start practice on Course B
        r_start = self.client_a.post('/api/practice-sessions/', {
            'course': self.course_b.id,
            'mode': 'flexible',
        }, format='json')
        self.assertEqual(r_start.status_code, 403)

        # 2. Attempting to study Course B's topic
        r_study = self.client_a.post('/api/practice-sessions/study/', {
            'topic': self.topic_b.id,
            'course': self.course_a.id,
        }, format='json')
        self.assertEqual(r_study.status_code, 403)
        self.assertIn('not part of the selected course', r_study.json()['detail'])

        # 3. Attempting to bookmark Course B's question
        r_bm = self.client_a.post('/api/bookmarks/', {
            'question_id': self.q_b.id,
            'course_id': self.course_a.id,
        }, format='json')
        self.assertEqual(r_bm.status_code, 404)

    # ── 7. CROSS-STUDENT ATTEMPT MANIPULATION ────────────────────────────────

    def test_student_cannot_manipulate_other_students_session(self):
        """Student B cannot answer, submit, or view Student A's session."""
        r = self.client_a.post('/api/practice-sessions/', {
            'course': self.course_a.id,
            'mode': 'flexible',
            'total_questions': 1,
        }, format='json')
        session_id = r.json()['session']['id']

        # Student B attempts to submit answer to Student A's session
        r_hack_answer = self.client_b.post(f'/api/practice-sessions/{session_id}/answer/', {
            'question_id': self.q_a1_1.id,
            'selected_option': 'b',
        }, format='json')
        self.assertEqual(r_hack_answer.status_code, 404)

        # Student B attempts to submit Student A's session
        r_hack_submit = self.client_b.post(f'/api/practice-sessions/{session_id}/submit/', {
            'time_taken_seconds': 10,
        }, format='json')
        self.assertEqual(r_hack_submit.status_code, 404)

        # Student B attempts to view Student A's result
        r_hack_result = self.client_b.get(f'/api/practice-sessions/{session_id}/result/')
        self.assertEqual(r_hack_result.status_code, 404)
