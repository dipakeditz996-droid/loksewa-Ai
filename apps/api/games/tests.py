from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import GameProfile

User = get_user_model()


class LeaderboardTests(APITestCase):
    """games.LeaderboardView (/api/games/leaderboard/) - the game-specific
    top-10 widget (1v1 wins, survival score), distinct from the platform-wide
    XP leaderboard in administration/leaderboard_views.py."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='student1', password='pass123', role='student')

    def test_anonymous_rejected(self):
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_state(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['top_1v1'], [])
        self.assertEqual(response.data['top_survival'], [])

    def test_ranking_ordered_server_side(self):
        low = User.objects.create_user(username='low', password='pass123', role='student')
        high = User.objects.create_user(username='high', password='pass123', role='student')
        GameProfile.objects.create(user=low, total_1v1_wins=1, best_survival_score=10)
        GameProfile.objects.create(user=high, total_1v1_wins=9, best_survival_score=90)

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.data['top_1v1'][0]['username'], 'high')
        self.assertEqual(response.data['top_survival'][0]['username'], 'high')

    def test_excludes_non_student_accounts(self):
        teacher = User.objects.create_user(username='teach1', password='pass123', role='teacher')
        GameProfile.objects.create(user=teacher, total_1v1_wins=99, best_survival_score=999)
        student_profile_user = User.objects.create_user(
            username='realstudent', password='pass123', role='student')
        GameProfile.objects.create(user=student_profile_user, total_1v1_wins=1, best_survival_score=1)

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        usernames_1v1 = [row['username'] for row in response.data['top_1v1']]
        usernames_survival = [row['username'] for row in response.data['top_survival']]
        self.assertNotIn('teach1', usernames_1v1)
        self.assertNotIn('teach1', usernames_survival)
        self.assertIn('realstudent', usernames_1v1)


class WeeklyQuizTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='student1', password='pass123', role='student'
        )
        self.other_student = User.objects.create_user(
            username='student2', password='pass123', role='student'
        )
        from exams.models import Question
        self.questions = []
        for i in range(5):
            q = Question.objects.create(
                text=f'Question {i} text?',
                option_a=f'Option A {i}',
                option_b=f'Option B {i}',
                option_c=f'Option C {i}',
                option_d=f'Option D {i}',
                correct_option='A',
                explanation=f'Explanation for question {i}',
                status='approved',
                question_type='mcq',
            )
            self.questions.append(q)

    def test_anonymous_access_rejected(self):
        self.assertEqual(self.client.get('/api/games/weekly-quiz/current/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/games/weekly-quiz/start/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/games/weekly-quiz/submit/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_current_weekly_quiz(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/weekly-quiz/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('title', response.data)
        self.assertIn('week_number', response.data)
        self.assertFalse(response.data['has_attempted'])
        self.assertFalse(response.data['has_in_progress'])
        self.assertGreaterEqual(response.data['questions_count'], 1)

    def test_start_weekly_quiz_does_not_leak_answers(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/games/weekly-quiz/start/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attempt_id', response.data)
        self.assertIn('questions', response.data)
        first_q = response.data['questions'][0]
        # Security: verify no correct_option or explanation in start payload
        self.assertNotIn('correct_option', first_q)
        self.assertNotIn('explanation', first_q)

    def test_submit_weekly_quiz_and_award_xp(self):
        self.client.force_authenticate(user=self.student)
        start_res = self.client.post('/api/games/weekly-quiz/start/')
        attempt_id = start_res.data['attempt_id']
        questions = start_res.data['questions']

        # Answer the first question correctly ('A')
        answers = {
            str(questions[0]['question_id']): 'A',
        }
        if len(questions) > 1:
            answers[str(questions[1]['question_id'])] = 'B'

        submit_res = self.client.post('/api/games/weekly-quiz/submit/', {
            'attempt_id': attempt_id,
            'answers': answers,
            'time_taken_seconds': 45
        }, format='json')

        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_res.data['status'], 'COMPLETED')
        self.assertGreaterEqual(submit_res.data['correct_answers'], 1)
        self.assertGreater(submit_res.data['xp_awarded'], 0)
        self.assertIn('review', submit_res.data)

        # Idempotency check: submitting again returns same result
        resubmit = self.client.post('/api/games/weekly-quiz/submit/', {
            'attempt_id': attempt_id,
            'answers': answers,
        }, format='json')
        self.assertEqual(resubmit.status_code, status.HTTP_200_OK)
        self.assertEqual(resubmit.data['score'], submit_res.data['score'])

    def test_other_student_cannot_submit_or_view_attempt(self):
        self.client.force_authenticate(user=self.student)
        start_res = self.client.post('/api/games/weekly-quiz/start/')
        attempt_id = start_res.data['attempt_id']

        # Other student tries to submit
        self.client.force_authenticate(user=self.other_student)
        forbidden_submit = self.client.post('/api/games/weekly-quiz/submit/', {
            'attempt_id': attempt_id,
            'answers': {},
        }, format='json')
        self.assertEqual(forbidden_submit.status_code, status.HTTP_404_NOT_FOUND)

        # Other student tries to view review
        forbidden_view = self.client.get(f'/api/games/weekly-quiz/attempts/{attempt_id}/')
        self.assertEqual(forbidden_view.status_code, status.HTTP_404_NOT_FOUND)

    def test_game_history_includes_weekly_quizzes(self):
        self.client.force_authenticate(user=self.student)
        start_res = self.client.post('/api/games/weekly-quiz/start/')
        attempt_id = start_res.data['attempt_id']
        self.client.post('/api/games/weekly-quiz/submit/', {
            'attempt_id': attempt_id,
            'answers': {},
        }, format='json')

        hist_res = self.client.get('/api/games/history/')
        self.assertEqual(hist_res.status_code, status.HTTP_200_OK)
        self.assertIn('weekly_quizzes', hist_res.data)
        self.assertEqual(len(hist_res.data['weekly_quizzes']), 1)
        self.assertEqual(hist_res.data['weekly_quizzes'][0]['id'], attempt_id)


class DuelMatchmakingTests(APITestCase):
    """
    Test suite for Random Duel matchmaking with real student priority,
    timeout handling, bot fallback, self-match prevention, cancellation,
    and gamification rules.
    """

    def setUp(self):
        self.student1 = User.objects.create_user(username='student1', password='pass123', role='student')
        self.student2 = User.objects.create_user(username='student2', password='pass123', role='student')
        self.student3 = User.objects.create_user(username='student3', password='pass123', role='student')
        from exams.models import Question
        from .models import GameMatch, GameProfile
        self.GameMatch = GameMatch
        self.GameProfile = GameProfile

        self.questions = []
        for i in range(12):
            q = Question.objects.create(
                text=f'Duel Question {i} text?',
                option_a=f'Option A {i}',
                option_b=f'Option B {i}',
                option_c=f'Option C {i}',
                option_d=f'Option D {i}',
                correct_option='A',
                explanation=f'Explanation {i}',
                status='approved',
                question_type='mcq',
            )
            self.questions.append(q)

    def test_first_player_enters_searching(self):
        self.client.force_authenticate(user=self.student1)
        res = self.client.post('/api/games/matchmaking/random/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'SEARCHING')
        self.assertFalse(res.data['is_bot_match'])
        self.assertEqual(res.data['opponent_type'], 'HUMAN')
        self.assertGreater(res.data['time_remaining_matchmaking'], 0)

    def test_human_matchmaking_priority(self):
        # Student 1 starts search
        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        # Student 2 joins while student 1 is searching
        self.client.force_authenticate(user=self.student2)
        res2 = self.client.post('/api/games/matchmaking/random/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['id'], match_id)
        self.assertEqual(res2.data['status'], 'MATCHED')
        self.assertFalse(res2.data['is_bot_match'])
        self.assertEqual(res2.data['opponent_type'], 'HUMAN')
        self.assertEqual(res2.data['player1'], self.student1.id)
        self.assertEqual(res2.data['player2'], self.student2.id)

    def test_self_match_prevention(self):
        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        # Student 1 calls random again -> must return active search, NOT match with themselves
        res2 = self.client.post('/api/games/matchmaking/random/')
        self.assertEqual(res2.data['id'], match_id)
        self.assertNotEqual(res2.data.get('player1'), res2.data.get('player2'))
        self.assertIsNone(res2.data.get('player2'))
        self.assertEqual(res2.data['status'], 'SEARCHING')

    def test_cancellation_removes_queue(self):
        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        # Cancel search
        cancel_res = self.client.post(f'/api/games/matches/{match_id}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        # Match status is CANCELLED
        match = self.GameMatch.objects.get(id=match_id)
        self.assertEqual(match.status, 'CANCELLED')

        # Student 2 searches -> does NOT match with cancelled match
        self.client.force_authenticate(user=self.student2)
        res2 = self.client.post('/api/games/matchmaking/random/')
        self.assertNotEqual(res2.data['id'], match_id)
        self.assertEqual(res2.data['status'], 'SEARCHING')

    def test_timeout_fallback_to_bot_match(self):
        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        # Simulate timeout expired
        from django.utils import timezone
        from datetime import timedelta
        match = self.GameMatch.objects.get(id=match_id)
        match.matchmaking_timeout_at = timezone.now() - timedelta(seconds=1)
        match.save()

        # State check triggers atomic bot fallback
        state_res = self.client.get(f'/api/games/matches/{match_id}/state/')
        self.assertEqual(state_res.status_code, status.HTTP_200_OK)
        self.assertEqual(state_res.data['status'], 'MATCHED')
        self.assertTrue(state_res.data['is_bot_match'])
        self.assertEqual(state_res.data['opponent_type'], 'BOT')
        self.assertEqual(state_res.data['player2_name'], 'LoksewaAI Bot')
        self.assertIn('current_question', state_res.data)

    def test_bot_match_leaderboard_rule_does_not_increment_wins(self):
        from django.utils import timezone
        from datetime import timedelta
        from games.views import MatchStateView

        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        match = self.GameMatch.objects.get(id=match_id)
        match.matchmaking_timeout_at = timezone.now() - timedelta(seconds=1)
        match.save()
        self.client.get(f'/api/games/matches/{match_id}/state/')

        # Force match completion with student1 having higher score
        match.refresh_from_db()
        match.player1_score = 40
        match.player2_score = 20
        MatchStateView().end_match(match)

        # Verify GameProfile total_1v1_wins is NOT incremented for bot matches
        profile, _ = self.GameProfile.objects.get_or_create(user=self.student1)
        self.assertEqual(profile.total_1v1_wins, 0)

    def test_security_cannot_answer_others_match(self):
        self.client.force_authenticate(user=self.student1)
        res1 = self.client.post('/api/games/matchmaking/random/')
        match_id = res1.data['id']

        # Student 2 tries to answer Student 1's match without being part of it
        self.client.force_authenticate(user=self.student2)
        ans_res = self.client.post(f'/api/games/matches/{match_id}/answer/', {'option': 'A'})
        self.assertEqual(ans_res.status_code, status.HTTP_403_FORBIDDEN)


class DailyDrillTests(APITestCase):
    def setUp(self):
        from exams.models import Question, QuestionMastery
        from gamification.models import GamificationProfile
        from games.models import DailyDrillSession, DailyDrillQuestion

        self.student1 = User.objects.create_user(username='drill_student1', password='pass123', role='student')
        self.student2 = User.objects.create_user(username='drill_student2', password='pass123', role='student')
        
        self.DailyDrillSession = DailyDrillSession
        self.DailyDrillQuestion = DailyDrillQuestion
        self.QuestionMastery = QuestionMastery

        # Create approved questions for selection
        self.questions = []
        for i in range(12):
            q = Question.objects.create(
                text=f'Civil/General MCQ Question {i}?',
                option_a=f'Option A {i}',
                option_b=f'Option B {i}',
                option_c=f'Option C {i}',
                option_d=f'Option D {i}',
                correct_option='A',
                explanation=f'Detailed explanation for question {i}.',
                hint=f'Helpful hint for question {i}.',
                status='approved',
                question_type='mcq'
            )
            self.questions.append(q)

    def test_anonymous_access_rejected(self):
        self.assertEqual(self.client.get('/api/games/daily-drill/today/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/games/daily-drill/start/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/games/daily-drill/1/answer/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/games/daily-drill/1/complete/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_today_initial_state_empty(self):
        self.client.force_authenticate(user=self.student1)
        res = self.client.get('/api/games/daily-drill/today/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['exists'])
        self.assertIsNone(res.data['session'])

    def test_start_daily_drill_creates_session_without_answer_leak(self):
        self.client.force_authenticate(user=self.student1)
        res = self.client.post('/api/games/daily-drill/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'IN_PROGRESS')
        self.assertEqual(res.data['duration_seconds'], 300)
        self.assertGreaterEqual(res.data['remaining_seconds'], 290)
        self.assertGreaterEqual(len(res.data['questions']), 5)

        first_q = res.data['questions'][0]
        # Security: Answers and explanations must NOT be revealed before the student answers
        self.assertIsNone(first_q['correct_option'])
        self.assertIsNone(first_q['explanation'])
        self.assertFalse(first_q['is_answered'])

    def test_daily_drill_stability_on_refresh(self):
        self.client.force_authenticate(user=self.student1)
        start_res1 = self.client.post('/api/games/daily-drill/start/')
        session_id1 = start_res1.data['id']
        questions1 = [q['question_id'] for q in start_res1.data['questions']]

        # Subsequent GET today returns the exact same session
        today_res = self.client.get('/api/games/daily-drill/today/')
        self.assertEqual(today_res.status_code, status.HTTP_200_OK)
        self.assertTrue(today_res.data['exists'])
        self.assertEqual(today_res.data['session']['id'], session_id1)
        self.assertEqual([q['question_id'] for q in today_res.data['session']['questions']], questions1)

        # Subsequent POST start returns the exact same session (idempotent resume)
        start_res2 = self.client.post('/api/games/daily-drill/start/')
        self.assertEqual(start_res2.status_code, status.HTTP_200_OK)
        self.assertEqual(start_res2.data['id'], session_id1)

    def test_immediate_feedback_on_answer(self):
        self.client.force_authenticate(user=self.student1)
        start_res = self.client.post('/api/games/daily-drill/start/')
        session_id = start_res.data['id']
        first_q = start_res.data['questions'][0]
        q_id = first_q['question_id']

        # Submit correct answer ('A')
        ans_res = self.client.post(f'/api/games/daily-drill/{session_id}/answer/', {
            'question_id': q_id,
            'selected_option': 'A'
        })
        self.assertEqual(ans_res.status_code, status.HTTP_200_OK)
        self.assertTrue(ans_res.data['is_correct'])
        self.assertEqual(ans_res.data['correct_option'], 'A')
        self.assertIn('explanation', ans_res.data)
        self.assertEqual(ans_res.data['current_score'], 10)
        self.assertEqual(ans_res.data['correct_answers'], 1)

        # Verify QuestionMastery record was updated
        mastery = self.QuestionMastery.objects.filter(user=self.student1, question_id=q_id).first()
        self.assertIsNotNone(mastery)
        self.assertEqual(mastery.times_correct, 1)

        # Idempotent re-submission does not duplicate score
        repeat_res = self.client.post(f'/api/games/daily-drill/{session_id}/answer/', {
            'question_id': q_id,
            'selected_option': 'A'
        })
        self.assertEqual(repeat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(repeat_res.data['current_score'], 10)
        self.assertEqual(repeat_res.data['correct_answers'], 1)

    def test_complete_drill_awards_xp_and_streak(self):
        from gamification.services import get_or_create_profile
        self.client.force_authenticate(user=self.student1)
        start_res = self.client.post('/api/games/daily-drill/start/')
        session_id = start_res.data['id']
        questions = start_res.data['questions']

        # Answer 2 questions correctly
        for q in questions[:2]:
            self.client.post(f'/api/games/daily-drill/{session_id}/answer/', {
                'question_id': q['question_id'],
                'selected_option': 'A'
            })

        complete_res = self.client.post(f'/api/games/daily-drill/{session_id}/complete/')
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_res.data['status'], 'COMPLETED')
        self.assertEqual(complete_res.data['correct_answers'], 2)
        self.assertEqual(complete_res.data['score'], 20)
        self.assertGreater(complete_res.data['xp_awarded'], 0)
        self.assertEqual(complete_res.data['current_streak'], 1)
        self.assertEqual(len(complete_res.data['review']), len(questions))

        # Verify gamification profile XP and streak
        profile = get_or_create_profile(self.student1)
        self.assertEqual(profile.xp, complete_res.data['xp_awarded'])
        self.assertEqual(profile.study_current_streak, 1)

    def test_idempotent_completion_prevents_duplicate_xp(self):
        from gamification.services import get_or_create_profile
        self.client.force_authenticate(user=self.student1)
        start_res = self.client.post('/api/games/daily-drill/start/')
        session_id = start_res.data['id']

        # Complete once
        res1 = self.client.post(f'/api/games/daily-drill/{session_id}/complete/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        initial_xp = get_or_create_profile(self.student1).xp

        # Complete second time (simulating refresh/replay attack)
        res2 = self.client.post(f'/api/games/daily-drill/{session_id}/complete/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        after_xp = get_or_create_profile(self.student1).xp

        # XP must NOT be awarded twice
        self.assertEqual(after_xp, initial_xp)

    def test_security_cannot_access_or_modify_other_student_drill(self):
        self.client.force_authenticate(user=self.student1)
        start_res = self.client.post('/api/games/daily-drill/start/')
        session_id = start_res.data['id']
        q_id = start_res.data['questions'][0]['question_id']

        # Student 2 attempts to view Student 1's drill
        self.client.force_authenticate(user=self.student2)
        get_res = self.client.get(f'/api/games/daily-drill/{session_id}/')
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # Student 2 attempts to answer Student 1's drill
        ans_res = self.client.post(f'/api/games/daily-drill/{session_id}/answer/', {
            'question_id': q_id,
            'selected_option': 'A'
        })
        self.assertEqual(ans_res.status_code, status.HTTP_404_NOT_FOUND)

        # Student 2 attempts to complete Student 1's drill
        comp_res = self.client.post(f'/api/games/daily-drill/{session_id}/complete/')
        self.assertEqual(comp_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_weak_topic_prioritization(self):
        from exams.models import QuestionMastery
        # Mark question 3 as weak for student1
        weak_q = self.questions[3]
        qm, _ = QuestionMastery.objects.get_or_create(user=self.student1, question=weak_q)
        qm.times_answered = 3
        qm.times_incorrect = 3
        qm.consecutive_incorrect = 2
        qm.save()

        self.client.force_authenticate(user=self.student1)
        res = self.client.post('/api/games/daily-drill/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['focus_type'], 'weak_areas')
        question_ids = [q['question_id'] for q in res.data['questions']]
        self.assertIn(weak_q.id, question_ids)

    def test_weak_topic_prioritization_with_course_exam(self):
        from exams.models import ExamCategory, Exam, Paper, Subject, QuestionMastery
        from support.models import StudentProfile

        cat = ExamCategory.objects.create(name='Engineering')
        exam = Exam.objects.create(name='Civil 5th Level', category=cat, is_active=True, status='active')
        paper = Paper.objects.create(exam=exam, name='Paper 1')
        subject = Subject.objects.create(paper=paper, name='Civil Tech')
        
        # Assign subject to question 4
        course_q = self.questions[4]
        course_q.subject = subject
        course_q.save()

        # Link student to this exam target
        StudentProfile.objects.update_or_create(user=self.student1, defaults={'target_position': exam})

        qm, _ = QuestionMastery.objects.get_or_create(user=self.student1, question=course_q)
        qm.times_answered = 2
        qm.times_incorrect = 2
        qm.save()

        self.client.force_authenticate(user=self.student1)
        res = self.client.post('/api/games/daily-drill/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['focus_type'], 'weak_areas')
        question_ids = [q['question_id'] for q in res.data['questions']]
        self.assertIn(course_q.id, question_ids)


