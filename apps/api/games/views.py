from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db import transaction
from django.db.models import Q, Avg, Max, F, FloatField, ExpressionWrapper, Exists, OuterRef
from django.core.paginator import Paginator
import random
from datetime import timedelta

from zoneinfo import ZoneInfo
from core.models import User
from .models import (
    GameMatch, GameQuestion, GameAnswer, SurvivalGame, SurvivalAnswer, GameProfile, generate_invite_code,
    WeeklyQuiz, WeeklyQuizQuestion, WeeklyQuizAttempt, WeeklyQuizAnswer,
    DailyDrillSession, DailyDrillQuestion
)
from .serializers import (
    GameMatchSerializer, GameQuestionSerializer, SurvivalGameSerializer, ActiveSurvivalSerializer, GameProfileSerializer,
    AdminGameMatchSerializer, AdminSurvivalGameSerializer,
    WeeklyQuizSerializer, WeeklyQuizQuestionClientSerializer, WeeklyQuizAttemptSerializer, WeeklyQuizAnswerReviewSerializer,
    DailyDrillSessionSerializer, DailyDrillReviewItemSerializer
)
from exams.models import Question, Exam, QuestionMastery
from exams.selection_service import QuestionSelectionService
from administration.permissions import IsAdminUser
from subscriptions.permissions import HasActiveSubscription

# Configuration
MATCH_QUESTIONS_COUNT = 10
QUESTION_TIME_SECONDS = 15
MATCHMAKING_TIMEOUT_SECONDS = 20
SURVIVAL_MAX_LIVES = 3

def get_or_create_profile(user):
    profile, _ = GameProfile.objects.get_or_create(user=user)
    return profile

def transition_to_bot_match(match, difficulty='medium'):
    """
    Atomically transitions a SEARCHING match whose timeout has expired into
    a Computer Opponent match. Uses real approved questions from the canonical
    QuestionSelectionService and configures deterministic difficulty.
    """
    with transaction.atomic():
        m = GameMatch.objects.select_for_update().filter(id=match.id).first()
        if not m or m.status != 'SEARCHING':
            return m or match

        m.is_bot_match = True
        m.bot_difficulty = difficulty
        m.status = 'MATCHED'
        m.player2 = None  # Computer bot has no user account
        m.started_at = timezone.now()
        m.save()

        assign_random_questions(m, exam_id=m.exam_id)
        first_q = m.game_questions.first()
        if first_q:
            first_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 5)
            first_q.save()
        return m

def assign_random_questions(match, exam_id=None, subject_id=None, topic_id=None, question_type='mcq'):
    """
    Selects approved questions from the Master Question Bank for a 1v1 match.
    All randomization happens server-side.
    For bot matches, precomputes realistic answer timing (3.5-7.0s) and deterministic accuracy.
    """
    service = QuestionSelectionService()
    result = service.select(
        exam_id=exam_id,
        subject_id=subject_id,
        topic_id=topic_id,
        question_type=question_type,
        count=MATCH_QUESTIONS_COUNT,
        randomize=True,
    )
    questions = result['questions']
    if not questions:
        # Fallback: any approved question if filters yield nothing
        result = service.select(count=MATCH_QUESTIONS_COUNT, randomize=True)
        questions = result['questions']

    diff = getattr(match, 'bot_difficulty', 'medium')
    if diff == 'easy':
        correct_prob = 0.40
    elif diff == 'hard':
        correct_prob = 0.85
    else:  # medium
        correct_prob = 0.65

    options_pool = ['A', 'B', 'C', 'D']

    for idx, q in enumerate(questions):
        bot_selected = None
        bot_correct = False
        bot_delay = 5.0

        if match.is_bot_match:
            correct_opt = (q.correct_option or 'A').strip().upper()
            if random.random() < correct_prob:
                bot_selected = correct_opt
                bot_correct = True
            else:
                wrong_options = [opt for opt in options_pool if opt != correct_opt]
                bot_selected = random.choice(wrong_options) if wrong_options else correct_opt
                bot_correct = (bot_selected == correct_opt)
            # Realistic delay between 3.5s and 7.0s
            bot_delay = round(random.uniform(3.5, 7.0), 1)

        GameQuestion.objects.create(
            match=match,
            question=q,
            order=idx,
            bot_selected_option=bot_selected,
            bot_is_correct=bot_correct,
            bot_answer_delay=bot_delay,
            bot_answered=False
        )

# ==========================================
# 1v1 MATCHMAKING & PLAY
# ==========================================

class MatchmakingView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        user = request.user

        # 1. Check if user is already in an active or searching match
        existing_match = GameMatch.objects.filter(
            Q(player1=user) | Q(player2=user),
            status__in=['SEARCHING', 'MATCHED', 'IN_PROGRESS']
        ).order_by('-created_at').first()

        if existing_match:
            # If still searching and timeout expired, transition to bot match immediately
            if existing_match.status == 'SEARCHING' and existing_match.matchmaking_timeout_at and timezone.now() >= existing_match.matchmaking_timeout_at:
                existing_match = transition_to_bot_match(existing_match)
            return Response(GameMatchSerializer(existing_match).data)

        # 2. Determine student course context (e.g. PSC 5th Level Civil)
        exam_id = None
        try:
            from courses.access import get_student_course_context
            ctx = get_student_course_context(user)
            if ctx and ctx.get('active_course'):
                exam_id = ctx['active_course'].get('exam_id')
        except Exception:
            pass

        # 3. Look for a waiting player atomically (Human match has strict priority)
        with transaction.atomic():
            waiting_qs = GameMatch.objects.select_for_update().filter(
                status='SEARCHING',
                is_invite_only=False,
                is_bot_match=False
            ).exclude(player1=user)

            if exam_id:
                # Prioritize same exam, or general/unscoped matches
                waiting_match = waiting_qs.filter(Q(exam_id=exam_id) | Q(exam__isnull=True)).order_by('created_at').first()
            else:
                waiting_match = waiting_qs.order_by('created_at').first()

            if waiting_match:
                # If waiting match has timed out, fallback that one to bot, and create fresh
                if waiting_match.matchmaking_timeout_at and timezone.now() >= waiting_match.matchmaking_timeout_at:
                    transition_to_bot_match(waiting_match)
                    waiting_match = None

            if waiting_match:
                # Join human match
                waiting_match.player2 = user
                waiting_match.status = 'MATCHED'
                waiting_match.started_at = timezone.now()
                assign_random_questions(waiting_match, exam_id=waiting_match.exam_id or exam_id)
                first_q = waiting_match.game_questions.first()
                if first_q:
                    first_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 5)
                    first_q.save()
                waiting_match.save()
                return Response(GameMatchSerializer(waiting_match).data)

            # 4. No human waiting match -> Create new search with 20s timeout window
            timeout_at = timezone.now() + timedelta(seconds=MATCHMAKING_TIMEOUT_SECONDS)
            new_match = GameMatch.objects.create(
                player1=user,
                is_invite_only=False,
                is_bot_match=False,
                exam_id=exam_id,
                matchmaking_timeout_at=timeout_at
            )
            return Response(GameMatchSerializer(new_match).data)

class MatchCancelView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id=None):
        user = request.user
        if match_id:
            match = GameMatch.objects.filter(id=match_id, player1=user, status='SEARCHING').first()
        else:
            match = GameMatch.objects.filter(player1=user, status='SEARCHING').first()

        if match:
            match.status = 'CANCELLED'
            match.ended_at = timezone.now()
            match.save()
            return Response({'status': 'Matchmaking cancelled', 'match_id': match.id})
        return Response({'status': 'No active matchmaking to cancel'}, status=200)

    def delete(self, request, match_id=None):
        return self.post(request, match_id)

class InviteMatchView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        user = request.user
        # Cancel old invites
        GameMatch.objects.filter(player1=user, status='SEARCHING', is_invite_only=True).update(status='CANCELLED')

        match = GameMatch.objects.create(
            player1=user,
            is_invite_only=True,
            invite_code=generate_invite_code()
        )
        return Response(GameMatchSerializer(match).data)

class JoinMatchView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        code = request.data.get('invite_code')
        if not code:
            return Response({'error': 'Invite code required'}, status=400)

        try:
            match = GameMatch.objects.get(invite_code=code, status='SEARCHING')
            if match.player1 == request.user:
                return Response({'error': 'Cannot join your own invite'}, status=400)

            match.player2 = request.user
            match.status = 'MATCHED'
            assign_random_questions(match)

            first_q = match.game_questions.first()
            if first_q:
                first_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 5)
                first_q.save()
            match.started_at = timezone.now()
            match.save()

            return Response(GameMatchSerializer(match).data)
        except GameMatch.DoesNotExist:
            return Response({'error': 'Invalid or expired invite code'}, status=404)

class MatchStateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, match_id):
        try:
            match = GameMatch.objects.get(id=match_id)
            # Security check: User must be player1 or player2
            if request.user != match.player1 and (match.is_bot_match or request.user != match.player2):
                return Response({'error': 'Unauthorized'}, status=403)

            # If match is SEARCHING and timeout reached -> fallback to bot match atomically
            if match.status == 'SEARCHING' and match.matchmaking_timeout_at and timezone.now() >= match.matchmaking_timeout_at:
                match = transition_to_bot_match(match)

            # Check if current question timed out
            if match.status in ['MATCHED', 'IN_PROGRESS']:
                current_q = match.game_questions.filter(order=match.current_question_index).first()
                if current_q and current_q.deadline and timezone.now() > current_q.deadline:
                    self.advance_question(match)

            # Simulate bot answer if active bot match
            if match.is_bot_match and match.status in ['MATCHED', 'IN_PROGRESS']:
                current_q = match.game_questions.filter(order=match.current_question_index).first()
                if current_q and not current_q.bot_answered and current_q.deadline:
                    total_duration = QUESTION_TIME_SECONDS + (5 if match.current_question_index == 0 else 2)
                    remaining = (current_q.deadline - timezone.now()).total_seconds()
                    elapsed = total_duration - remaining
                    if elapsed >= current_q.bot_answer_delay:
                        current_q.bot_answered = True
                        current_q.save(update_fields=['bot_answered'])
                        if current_q.bot_is_correct:
                            match.player2_score += 10
                            match.save(update_fields=['player2_score'])

                        # Check if human also already answered
                        human_answered = GameAnswer.objects.filter(game_question=current_q, player=match.player1).exists()
                        if human_answered:
                            self.advance_question(match)

            data = GameMatchSerializer(match).data

            # Attach current question and answer status
            if match.status in ['MATCHED', 'IN_PROGRESS']:
                current_q = match.game_questions.filter(order=match.current_question_index).first()
                if current_q:
                    data['current_question'] = GameQuestionSerializer(current_q).data
                    has_answered = GameAnswer.objects.filter(game_question=current_q, player=request.user).exists()
                    data['has_answered'] = has_answered
                    if match.is_bot_match:
                        data['bot_answered'] = current_q.bot_answered

            return Response(data)
        except GameMatch.DoesNotExist:
            return Response({'error': 'Match not found'}, status=404)

    def advance_question(self, match):
        if match.current_question_index >= MATCH_QUESTIONS_COUNT - 1:
            self.end_match(match)
        else:
            match.current_question_index += 1
            match.status = 'IN_PROGRESS'
            next_q = match.game_questions.filter(order=match.current_question_index).first()
            if next_q:
                next_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 2)
                next_q.save()
            match.save()

    def end_match(self, match):
        from gamification.services import award_xp

        match.status = 'COMPLETED'
        match.ended_at = timezone.now()

        if match.player1_score > match.player2_score:
            match.winner = match.player1
            # Leaderboard rule: only real human matches increment competitive total_1v1_wins
            if not match.is_bot_match:
                p1_profile = get_or_create_profile(match.player1)
                p1_profile.total_1v1_wins += 1
                p1_profile.save()
        elif match.player2_score > match.player1_score:
            if not match.is_bot_match and match.player2:
                match.winner = match.player2
                p2_profile = get_or_create_profile(match.player2)
                p2_profile.total_1v1_wins += 1
                p2_profile.save()
            else:
                # Bot won, winner User is None
                match.winner = None
        else:
            match.is_draw = True

        match.save()

        # Award XP:
        # Human player earns 10 XP per correct question (player1_score).
        # Winner human also receives +50 Victory Bonus.
        if match.player1_score > 0:
            award_xp(match.player1, match.player1_score, f'1v1 Match #{match.id} Score')
        if not match.is_bot_match and match.player2 and match.player2_score > 0:
            award_xp(match.player2, match.player2_score, f'1v1 Match #{match.id} Score')
        if match.winner and not match.is_draw:
            award_xp(match.winner, 50, f'1v1 Match #{match.id} Victory Bonus')

class MatchAnswerView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id):
        try:
            match = GameMatch.objects.get(id=match_id)
            user = request.user
            if user != match.player1 and (match.is_bot_match or user != match.player2):
                return Response({'error': 'Unauthorized'}, status=403)

            if match.status not in ['MATCHED', 'IN_PROGRESS']:
                return Response({'error': 'Match not active'}, status=400)

            selected_option = request.data.get('option') or request.data.get('selected_option')
            if selected_option is not None:
                selected_option = str(selected_option).strip().upper()

            current_q = match.game_questions.filter(order=match.current_question_index).first()
            if not current_q:
                return Response({'error': 'No active question'}, status=400)

            if current_q.deadline and timezone.now() > current_q.deadline:
                return Response({'error': 'Time expired'}, status=400)

            if GameAnswer.objects.filter(game_question=current_q, player=user).exists():
                return Response({'error': 'Already answered'}, status=400)

            correct_opt = (current_q.question.correct_option or '').strip().upper() if current_q.question else ''
            is_correct = bool(selected_option and selected_option == correct_opt)
            score_awarded = 10 if is_correct else 0

            GameAnswer.objects.create(
                game_question=current_q,
                player=user,
                selected_option=selected_option,
                is_correct=is_correct,
                score_awarded=score_awarded
            )

            # Update match score
            if is_correct:
                if user == match.player1:
                    match.player1_score += score_awarded
                else:
                    match.player2_score += score_awarded
                match.save()

            if match.is_bot_match:
                # If bot already answered, advance immediately
                if current_q.bot_answered:
                    MatchStateView().advance_question(match)
            else:
                # Human vs Human: check if both answered
                answers_count = GameAnswer.objects.filter(game_question=current_q).count()
                if answers_count >= 2:
                    MatchStateView().advance_question(match)

            return Response({'status': 'Answer recorded', 'is_correct': is_correct})

        except GameMatch.DoesNotExist:
            return Response({'error': 'Match not found'}, status=404)

# ==========================================
# SOLO SURVIVAL
# ==========================================

def get_survival_question(survived_count, exam_id=None, subject_id=None, topic_id=None):
    """
    Returns the next survival question using the Master Question Bank.
    Difficulty escalates as the player survives more questions.
    Only approved questions are considered.
    """
    if survived_count < 5:
        diff = 'easy'
        points = 10
        time = 15
    elif survived_count < 10:
        diff = 'medium'
        points = 20
        time = 12
    elif survived_count < 20:
        diff = 'hard'
        points = 30
        time = 10
    else:
        diff = 'hard'
        points = 50
        time = 8

    service = QuestionSelectionService()
    result = service.select(
        exam_id=exam_id,
        subject_id=subject_id,
        topic_id=topic_id,
        difficulty_distribution={diff: 1},
        randomize=True,
        question_type='objective',
    )
    if result['questions']:
        question = result['questions'][0]
    else:
        # Fallback: any approved question
        fallback = service.select(count=1, randomize=True, question_type='objective')
        question = fallback['questions'][0] if fallback['questions'] else None

    return question, points, time

class SurvivalStartView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        user = request.user
        # Cancel previous active
        SurvivalGame.objects.filter(player=user, status='IN_PROGRESS').update(status='COMPLETED')
        
        game = SurvivalGame.objects.create(player=user, lives_remaining=SURVIVAL_MAX_LIVES)
        q, points, t = get_survival_question(0)
        
        game.current_question = q
        game.question_deadline = timezone.now() + timedelta(seconds=t + 2)
        game.save()
        
        return Response(ActiveSurvivalSerializer(game).data)

class SurvivalActiveView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        active = SurvivalGame.objects.filter(player=request.user, status='IN_PROGRESS').first()
        if active and active.current_question:
            return Response({'active': True, 'game': ActiveSurvivalSerializer(active).data})
        return Response({'active': False, 'game': None})

class SurvivalAnswerView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, survival_id):
        try:
            game = SurvivalGame.objects.get(id=survival_id, player=request.user, status='IN_PROGRESS')
            
            selected_option = request.data.get('option') or request.data.get('selected_option')
            if selected_option is not None:
                selected_option = str(selected_option).strip().upper()
            
            # Check timeout
            if game.question_deadline and timezone.now() > game.question_deadline:
                is_correct = False # Timeout counts as wrong
            else:
                correct_opt = (game.current_question.correct_option or '').strip().upper() if game.current_question else ''
                is_correct = bool(selected_option and selected_option == correct_opt)
                
            # Score
            if is_correct:
                _, points, _ = get_survival_question(game.questions_survived)
                game.score += points
                game.questions_survived += 1
                game.current_streak += 1
                if game.current_streak > game.highest_streak:
                    game.highest_streak = game.current_streak
            else:
                game.lives_remaining -= 1
                game.current_streak = 0
                
            SurvivalAnswer.objects.create(
                survival_game=game,
                question=game.current_question,
                selected_option=selected_option,
                is_correct=is_correct
            )
            
            if game.lives_remaining <= 0:
                game.status = 'COMPLETED'
                game.ended_at = timezone.now()
                game.save()

                # Update game profile
                profile = get_or_create_profile(request.user)
                if game.score > profile.best_survival_score:
                    profile.best_survival_score = game.score
                if game.highest_streak > profile.best_survival_streak:
                    profile.best_survival_streak = game.highest_streak
                profile.save()

                # Award XP from server-computed score — never trust client values.
                # XP is only awarded once because completed games are rejected at
                # the top of this view (status='IN_PROGRESS' filter on get()).
                if game.score > 0:
                    from gamification.services import award_xp
                    award_xp(request.user, game.score, f'Survival Game #{game.id} Completed')

                return Response({'status': 'GAME_OVER', 'game': SurvivalGameSerializer(game).data})
                
            else:
                # Next question
                q, points, t = get_survival_question(game.questions_survived)
                game.current_question = q
                game.question_deadline = timezone.now() + timedelta(seconds=t + 2)
                game.save()
                return Response({'status': 'CONTINUE', 'is_correct': is_correct, 'game': ActiveSurvivalSerializer(game).data})
                
        except SurvivalGame.DoesNotExist:
            return Response({'error': 'Game not found'}, status=404)

# ==========================================
# HISTORY & LEADERBOARD
# ==========================================

class GameHistoryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        matches = GameMatch.objects.filter(Q(player1=user) | Q(player2=user)).order_by('-created_at')[:10]
        match_data = GameMatchSerializer(matches, many=True).data
        
        survivals = SurvivalGame.objects.filter(player=user).order_by('-created_at')[:10]
        survival_data = SurvivalGameSerializer(survivals, many=True).data

        weekly_quizzes = WeeklyQuizAttempt.objects.filter(student=user, status='COMPLETED').order_by('-completed_at')[:10]
        weekly_data = WeeklyQuizAttemptSerializer(weekly_quizzes, many=True).data
        
        return Response({
            'matches': match_data,
            'survivals': survival_data,
            'weekly_quizzes': weekly_data
        })

class LeaderboardView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Restricted to students - a teacher/admin who plays a duel while
        # testing still gets a GameProfile row, but this is a student
        # leaderboard and should never surface staff accounts.
        base = GameProfile.objects.filter(user__role='student').select_related('user')
        top_1v1 = base.order_by('-total_1v1_wins')[:10]
        top_survival = base.order_by('-best_survival_score')[:10]

        return Response({
            'top_1v1': GameProfileSerializer(top_1v1, many=True).data,
            'top_survival': GameProfileSerializer(top_survival, many=True).data
        })

# ==========================================
# WEEKLY QUIZ
# ==========================================

WEEKLY_QUIZ_QUESTIONS_COUNT = 15

def get_or_create_weekly_quiz(user=None):
    """
    Retrieves or provisions the active WeeklyQuiz for the current calendar week.
    Questions are selected via QuestionSelectionService from the Master Question Bank,
    respecting the student's authorized course scope when available.
    """
    now = timezone.now()
    current_year, current_week, _ = now.isocalendar()
    start_of_week = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)

    quiz, created = WeeklyQuiz.objects.get_or_create(
        week_number=current_week,
        year=current_year,
        defaults={
            'title': f'Weekly Grand Loksewa Quiz - Week {current_week}',
            'description': 'Comprehensive weekly MCQ challenge covering syllabus topics.',
            'start_date': start_of_week,
            'end_date': end_of_week,
            'duration_minutes': 20,
            'xp_reward': 100,
            'is_active': True,
        }
    )

    if quiz.quiz_questions.count() == 0:
        from courses.access import authorized_exam_ids
        exam_scope = None
        if user and user.is_authenticated:
            try:
                exam_scope = list(authorized_exam_ids(user))
            except Exception:
                exam_scope = None

        service = QuestionSelectionService()
        result = service.select(
            exam_ids=exam_scope if exam_scope else None,
            count=WEEKLY_QUIZ_QUESTIONS_COUNT,
            randomize=True,
            question_type='objective',
        )
        questions = result['questions']
        if len(questions) < WEEKLY_QUIZ_QUESTIONS_COUNT:
            # Fallback: select platform-wide approved objective questions
            fallback = service.select(count=WEEKLY_QUIZ_QUESTIONS_COUNT, randomize=True, question_type='objective')
            questions = fallback['questions']

        for idx, q in enumerate(questions):
            WeeklyQuizQuestion.objects.create(
                quiz=quiz,
                question=q,
                order=idx
            )

    return quiz


class WeeklyQuizCurrentView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quiz = get_or_create_weekly_quiz(request.user)
        latest_attempt = WeeklyQuizAttempt.objects.filter(
            quiz=quiz, student=request.user, status='COMPLETED'
        ).first()
        in_progress_attempt = WeeklyQuizAttempt.objects.filter(
            quiz=quiz, student=request.user, status='IN_PROGRESS'
        ).first()

        data = WeeklyQuizSerializer(quiz).data
        data['has_attempted'] = latest_attempt is not None
        data['has_in_progress'] = in_progress_attempt is not None
        data['in_progress_attempt_id'] = in_progress_attempt.id if in_progress_attempt else None
        data['latest_attempt'] = WeeklyQuizAttemptSerializer(latest_attempt).data if latest_attempt else None
        return Response(data)


class WeeklyQuizStartView(views.APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        quiz = get_or_create_weekly_quiz(request.user)

        # Check for in-progress attempt to resume
        attempt = WeeklyQuizAttempt.objects.filter(
            quiz=quiz, student=request.user, status='IN_PROGRESS'
        ).first()

        if not attempt:
            attempt = WeeklyQuizAttempt.objects.create(
                quiz=quiz,
                student=request.user,
                total_questions=quiz.quiz_questions.count(),
                status='IN_PROGRESS'
            )

        questions = quiz.quiz_questions.select_related('question').order_by('order')
        questions_data = WeeklyQuizQuestionClientSerializer(questions, many=True).data

        return Response({
            'attempt_id': attempt.id,
            'quiz': WeeklyQuizSerializer(quiz).data,
            'questions': questions_data,
            'duration_minutes': quiz.duration_minutes,
            'started_at': attempt.started_at,
        })


class WeeklyQuizSubmitView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', {})
        try:
            time_taken_seconds = int(request.data.get('time_taken_seconds', 0))
        except (ValueError, TypeError):
            time_taken_seconds = 0

        if not attempt_id:
            return Response({'error': 'attempt_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            attempt = WeeklyQuizAttempt.objects.select_related('quiz').get(id=attempt_id, student=request.user)
        except WeeklyQuizAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)

        # Idempotency check: if already completed, return existing result
        if attempt.status == 'COMPLETED':
            return self._build_result_response(attempt)

        quiz = attempt.quiz
        quiz_questions = quiz.quiz_questions.select_related('question').order_by('order')
        correct_count = 0
        total_count = quiz_questions.count()

        for qq in quiz_questions:
            q = qq.question
            selected = answers.get(str(q.id)) or answers.get(q.id)
            is_correct = (selected == q.correct_option) if selected else False
            if is_correct:
                correct_count += 1

            WeeklyQuizAnswer.objects.update_or_create(
                attempt=attempt,
                question=q,
                defaults={
                    'selected_option': selected,
                    'is_correct': is_correct
                }
            )

        # Score & XP calculation:
        # Each question is worth 10 points
        score = correct_count * 10
        xp_awarded = 0
        if total_count > 0 and correct_count > 0:
            ratio = correct_count / total_count
            xp_awarded = max(10, int(quiz.xp_reward * ratio))

        attempt.status = 'COMPLETED'
        attempt.score = score
        attempt.correct_answers = correct_count
        attempt.total_questions = total_count
        attempt.time_taken_seconds = time_taken_seconds
        attempt.xp_awarded = xp_awarded
        attempt.completed_at = timezone.now()
        attempt.save()

        # Award XP through canonical gamification service
        if xp_awarded > 0:
            from gamification.services import award_xp
            award_xp(
                request.user,
                xp_awarded,
                f"Weekly Quiz (Week {quiz.week_number}) - Score: {correct_count}/{total_count}"
            )

        return self._build_result_response(attempt)

    def _build_result_response(self, attempt):
        saved_answers = {
            ans.question_id: ans
            for ans in attempt.answers.select_related('question').all()
        }
        quiz_questions = attempt.quiz.quiz_questions.select_related('question').order_by('order')

        review = []
        for qq in quiz_questions:
            q = qq.question
            ans = saved_answers.get(q.id)
            review.append({
                'question_id': q.id,
                'order': qq.order,
                'question_text': q.text,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'selected_option': ans.selected_option if ans else None,
                'correct_option': q.correct_option,
                'is_correct': ans.is_correct if ans else False,
                'explanation': q.explanation or '',
            })

        percentage = round((attempt.correct_answers / max(1, attempt.total_questions)) * 100, 1)

        return Response({
            'attempt_id': attempt.id,
            'quiz_id': attempt.quiz_id,
            'quiz_title': attempt.quiz.title,
            'status': attempt.status,
            'score': attempt.score,
            'correct_answers': attempt.correct_answers,
            'total_questions': attempt.total_questions,
            'percentage': percentage,
            'xp_awarded': attempt.xp_awarded,
            'time_taken_seconds': attempt.time_taken_seconds,
            'completed_at': attempt.completed_at,
            'review': review
        })


class WeeklyQuizAttemptDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = WeeklyQuizAttempt.objects.select_related('quiz').get(id=attempt_id, student=request.user)
        except WeeklyQuizAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)

        if attempt.status != 'COMPLETED':
            return Response({'error': 'Attempt is still in progress'}, status=status.HTTP_400_BAD_REQUEST)

        return WeeklyQuizSubmitView()._build_result_response(attempt)


# ==========================================
# ADMIN VIEWS
# ==========================================

class AdminGameMatchesView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Get query parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        player_id = request.query_params.get('player_id', '').strip()
        date_from = request.query_params.get('date_from', '').strip()
        date_to = request.query_params.get('date_to', '').strip()
        order_by = request.query_params.get('order_by', '-created_at')

        # Build queryset with select_related to avoid N+1 queries
        qs = GameMatch.objects.select_related('player1', 'player2', 'winner')

        # Apply search filter
        if search:
            qs = qs.filter(
                Q(player1__username__icontains=search) |
                Q(player1__email__icontains=search) |
                Q(player2__username__icontains=search) |
                Q(player2__email__icontains=search) |
                Q(id__icontains=search)
            )

        # Apply status filter
        if status_filter and status_filter in dict(GameMatch.STATUS_CHOICES):
            qs = qs.filter(status=status_filter)

        # Apply player filter (either side of the match)
        if player_id:
            try:
                player_id_int = int(player_id)
                qs = qs.filter(Q(player1_id=player_id_int) | Q(player2_id=player_id_int))
            except ValueError:
                pass

        # Apply date range filter (on created_at, the one timestamp every
        # match has regardless of status - started_at/ended_at can be null)
        parsed_from = parse_date(date_from) if date_from else None
        if parsed_from:
            qs = qs.filter(created_at__date__gte=parsed_from)
        parsed_to = parse_date(date_to) if date_to else None
        if parsed_to:
            qs = qs.filter(created_at__date__lte=parsed_to)

        # Ensure valid ordering
        valid_orders = ['created_at', '-created_at', 'started_at', '-started_at', 'player1_score', '-player1_score']
        if order_by in valid_orders:
            qs = qs.order_by(order_by)
        else:
            qs = qs.order_by('-created_at')

        # Get total count before pagination
        total = qs.count()

        # Paginate
        paginator = Paginator(qs, page_size)
        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        serializer = AdminGameMatchSerializer(page_obj.object_list, many=True)

        return Response({
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': paginator.num_pages
        })

class AdminSurvivalGamesView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Get query parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        player_id = request.query_params.get('player_id', '').strip()
        date_from = request.query_params.get('date_from', '').strip()
        date_to = request.query_params.get('date_to', '').strip()
        order_by = request.query_params.get('order_by', '-created_at')

        # Build queryset with select_related to avoid N+1 queries
        qs = SurvivalGame.objects.select_related('player').prefetch_related('answers')

        # Apply search filter
        if search:
            qs = qs.filter(
                Q(player__username__icontains=search) |
                Q(player__email__icontains=search) |
                Q(id__icontains=search)
            )

        # Apply status filter
        if status_filter and status_filter in dict(SurvivalGame.STATUS_CHOICES):
            qs = qs.filter(status=status_filter)

        # Apply player filter
        if player_id:
            try:
                qs = qs.filter(player_id=int(player_id))
            except ValueError:
                pass

        # Apply date range filter
        parsed_from = parse_date(date_from) if date_from else None
        if parsed_from:
            qs = qs.filter(created_at__date__gte=parsed_from)
        parsed_to = parse_date(date_to) if date_to else None
        if parsed_to:
            qs = qs.filter(created_at__date__lte=parsed_to)

        # Ensure valid ordering
        valid_orders = ['created_at', '-created_at', 'score', '-score', 'questions_survived', '-questions_survived']
        if order_by in valid_orders:
            qs = qs.order_by(order_by)
        else:
            qs = qs.order_by('-created_at')

        # Get total count before pagination
        total = qs.count()

        # Paginate
        paginator = Paginator(qs, page_size)
        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        serializer = AdminSurvivalGameSerializer(page_obj.object_list, many=True)

        return Response({
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': paginator.num_pages
        })


# Window used to decide whether a player counts as "active" on the Game
# Center dashboard - matches the "monthly" window already used elsewhere
# in the admin (e.g. administration/leaderboard_views.py).
ACTIVE_PLAYER_WINDOW_DAYS = 30


class AdminGameStatsView(views.APIView):
    """GET /api/games/admin/stats/

    Real-data overview for the admin Game Center dashboard tab. Every figure
    is computed directly from GameMatch/SurvivalGame - nothing here is a
    stand-in or an estimate.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        since = timezone.now() - timedelta(days=ACTIVE_PLAYER_WINDOW_DAYS)

        # Exists() subqueries avoid the row-multiplying join that a plain
        # OR-across-three-reverse-relations filter would produce.
        played_p1 = GameMatch.objects.filter(player1=OuterRef('pk'))
        played_p2 = GameMatch.objects.filter(player2=OuterRef('pk'))
        played_survival = SurvivalGame.objects.filter(player=OuterRef('pk'))

        total_players = User.objects.annotate(
            has_p1=Exists(played_p1), has_p2=Exists(played_p2), has_surv=Exists(played_survival),
        ).filter(Q(has_p1=True) | Q(has_p2=True) | Q(has_surv=True)).count()

        active_players = User.objects.annotate(
            has_p1=Exists(played_p1.filter(created_at__gte=since)),
            has_p2=Exists(played_p2.filter(created_at__gte=since)),
            has_surv=Exists(played_survival.filter(created_at__gte=since)),
        ).filter(Q(has_p1=True) | Q(has_p2=True) | Q(has_surv=True)).count()

        total_duels = GameMatch.objects.count()
        total_survival_runs = SurvivalGame.objects.count()

        completed_duels = GameMatch.objects.filter(status='COMPLETED').count()
        completed_survival = SurvivalGame.objects.filter(status='COMPLETED').count()

        avg_duel_score = GameMatch.objects.filter(status='COMPLETED').aggregate(
            avg=Avg(ExpressionWrapper(
                (F('player1_score') + F('player2_score')) / 2.0, output_field=FloatField()
            ))
        )['avg']
        avg_survival_score = SurvivalGame.objects.filter(status='COMPLETED').aggregate(avg=Avg('score'))['avg']

        recent_matches = GameMatch.objects.select_related('player1', 'player2').order_by('-created_at')[:10]
        recent_survival = SurvivalGame.objects.select_related('player').order_by('-created_at')[:10]

        recent_activity = []
        for m in recent_matches:
            opponent = m.player2.username if m.player2 else 'waiting for opponent'
            recent_activity.append({
                'type': 'duel',
                'id': m.id,
                'description': f"{m.player1.username} vs {opponent}",
                'status': m.status,
                'timestamp': m.created_at.isoformat(),
                'playerId': m.player1_id,
                'opponentId': m.player2_id,
            })
        for s in recent_survival:
            recent_activity.append({
                'type': 'survival',
                'id': s.id,
                'description': f"{s.player.username} - survival run (score {s.score})",
                'status': s.status,
                'timestamp': s.created_at.isoformat(),
                'playerId': s.player_id,
                'opponentId': None,
            })
        recent_activity.sort(key=lambda item: item['timestamp'], reverse=True)

        return Response({
            'totalPlayers': total_players,
            'activePlayers': active_players,
            'activeWindowDays': ACTIVE_PLAYER_WINDOW_DAYS,
            'totalGamesPlayed': total_duels + total_survival_runs,
            'totalDuels': total_duels,
            'totalSurvivalRuns': total_survival_runs,
            'completedGames': completed_duels + completed_survival,
            'completedDuels': completed_duels,
            'completedSurvivalRuns': completed_survival,
            'averageDuelScore': round(avg_duel_score, 2) if avg_duel_score is not None else None,
            'averageSurvivalScore': round(avg_survival_score, 2) if avg_survival_score is not None else None,
            'recentActivity': recent_activity[:10],
        })


class AdminPlayerGameActivityView(views.APIView):
    """GET /api/games/admin/players/<player_id>/activity/

    Per-student game activity for admins: which games they played, scores,
    win/loss record, and accuracy - all read from real GameMatch/SurvivalGame/
    GameAnswer/SurvivalAnswer rows for that one student.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, player_id):
        try:
            player = User.objects.get(pk=player_id, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        matches_qs = GameMatch.objects.filter(Q(player1=player) | Q(player2=player))
        completed_matches = matches_qs.filter(status='COMPLETED')

        duels_played = completed_matches.count()
        duels_won = completed_matches.filter(winner=player).count()
        duels_drawn = completed_matches.filter(is_draw=True).count()
        duels_lost = duels_played - duels_won - duels_drawn

        survival_qs = SurvivalGame.objects.filter(player=player)
        best_survival_score = survival_qs.aggregate(m=Max('score'))['m']

        duel_answers = GameAnswer.objects.filter(player=player)
        duel_total = duel_answers.count()
        duel_correct = duel_answers.filter(is_correct=True).count()
        duel_accuracy = round((duel_correct / duel_total) * 100, 1) if duel_total else None

        survival_answers = SurvivalAnswer.objects.filter(survival_game__player=player)
        survival_total = survival_answers.count()
        survival_correct = survival_answers.filter(is_correct=True).count()
        survival_accuracy = round((survival_correct / survival_total) * 100, 1) if survival_total else None

        recent_matches = matches_qs.select_related('player1', 'player2', 'winner').order_by('-created_at')[:20]
        recent_survival = survival_qs.order_by('-created_at')[:20]

        return Response({
            'player': {
                'id': player.id,
                'username': player.username,
                'name': player.get_full_name() or player.username,
            },
            'summary': {
                'duelsPlayed': duels_played,
                'duelsWon': duels_won,
                'duelsLost': duels_lost,
                'duelsDrawn': duels_drawn,
                'duelAccuracy': duel_accuracy,
                'survivalRuns': survival_qs.count(),
                'bestSurvivalScore': best_survival_score,
                'survivalAccuracy': survival_accuracy,
            },
            'recentMatches': AdminGameMatchSerializer(recent_matches, many=True).data,
            'recentSurvivalRuns': AdminSurvivalGameSerializer(recent_survival, many=True).data,
        })


# ==========================================
# DAILY DRILL: 5-MIN LEARNING CHALLENGE
# ==========================================

class DailyDrillTodayView(views.APIView):
    """
    Returns the status of today's Daily Drill for the authenticated student.
    Uses canonical Nepal timezone (Asia/Kathmandu).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from gamification.services import STUDY_TZ_NAME
        nepal_tz = ZoneInfo(STUDY_TZ_NAME)
        today = timezone.localtime(timezone.now(), nepal_tz).date()

        session = DailyDrillSession.objects.filter(student=request.user, date=today).first()
        if session:
            # Check if active session exceeded timer duration (+30s grace)
            if session.status == 'IN_PROGRESS':
                elapsed = (timezone.now() - session.started_at).total_seconds()
                if elapsed > session.duration_seconds + 30:
                    session.status = 'COMPLETED'
                    session.time_taken_seconds = session.duration_seconds
                    session.completed_at = timezone.now()
                    session.save(update_fields=['status', 'time_taken_seconds', 'completed_at'])

            return Response({
                'exists': True,
                'session': DailyDrillSessionSerializer(session).data
            })

        # Course context resolution for preview
        from courses.access import get_student_course_context, authorized_exam_ids
        ctx = get_student_course_context(request.user)
        course_title = "Loksewa General Preparation"
        exam_id = None
        if ctx and ctx.get('active_course'):
            exam_id = ctx['active_course'].get('exam_id')
            course_title = ctx['active_course'].get('title')
        elif ctx and ctx.get('authorized_courses') and len(ctx['authorized_courses']) > 0:
            exam_id = ctx['authorized_courses'][0].get('exam_id')
            course_title = ctx['authorized_courses'][0].get('title')

        if not exam_id:
            exam_ids = authorized_exam_ids(request.user)
            if exam_ids:
                exam_id = next(iter(exam_ids))
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.target_position_id:
                exam_id = request.user.student_profile.target_position_id

        return Response({
            'exists': False,
            'session': None,
            'course_title': course_title,
            'exam_id': exam_id,
        })


class DailyDrillStartView(views.APIView):
    """
    Starts or resumes today's Daily Drill.
    Creates a stable, non-duplicating session for the day using canonical QuestionSelectionService
    and prioritizing syllabus weak areas from QuestionMastery.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        from gamification.services import STUDY_TZ_NAME
        nepal_tz = ZoneInfo(STUDY_TZ_NAME)
        today = timezone.localtime(timezone.now(), nepal_tz).date()

        # 1. Return existing session if already created today (Strict idempotency & stability)
        existing_session = DailyDrillSession.objects.filter(student=request.user, date=today).first()
        if existing_session:
            if existing_session.status == 'IN_PROGRESS':
                elapsed = (timezone.now() - existing_session.started_at).total_seconds()
                if elapsed > existing_session.duration_seconds + 30:
                    existing_session.status = 'COMPLETED'
                    existing_session.time_taken_seconds = existing_session.duration_seconds
                    existing_session.completed_at = timezone.now()
                    existing_session.save(update_fields=['status', 'time_taken_seconds', 'completed_at'])
            return Response(DailyDrillSessionSerializer(existing_session).data)

        # 2. Determine student's authorized course/exam
        from courses.access import get_student_course_context, authorized_exam_ids
        ctx = get_student_course_context(request.user)
        course_title = "Loksewa General Preparation"
        exam_id = None
        if ctx and ctx.get('active_course'):
            exam_id = ctx['active_course'].get('exam_id')
            course_title = ctx['active_course'].get('title')
        elif ctx and ctx.get('authorized_courses') and len(ctx['authorized_courses']) > 0:
            exam_id = ctx['authorized_courses'][0].get('exam_id')
            course_title = ctx['authorized_courses'][0].get('title')

        if not exam_id:
            exam_ids = authorized_exam_ids(request.user)
            if exam_ids:
                exam_id = next(iter(exam_ids))
            elif hasattr(request.user, 'student_profile') and request.user.student_profile.target_position_id:
                exam_id = request.user.student_profile.target_position_id

        # 3. Question Selection with Weak Areas Prioritization
        weak_mastery_qs = QuestionMastery.objects.filter(
            user=request.user,
            question__status='approved',
            question__question_type='mcq'
        )
        if exam_id:
            weak_mastery_qs = weak_mastery_qs.filter(
                Q(question__subject__paper__exam_id=exam_id) |
                Q(question__topic__chapter__subject__paper__exam_id=exam_id)
            )

        weak_records = list(weak_mastery_qs.filter(
            Q(times_incorrect__gt=F('times_correct')) |
            Q(consecutive_incorrect__gt=0) |
            Q(next_review_at__lte=timezone.now())
        ).order_by('-times_incorrect', '-last_attempted_at')[:4])

        selected_questions = []
        selected_ids = set()
        focus_type = 'course_mixed'

        if weak_records:
            focus_type = 'weak_areas'
            for wm in weak_records:
                selected_questions.append(wm.question)
                selected_ids.add(wm.question_id)

        # Fill remaining slots using canonical QuestionSelectionService
        needed = 10 - len(selected_questions)
        service = QuestionSelectionService()
        result = service.select(
            exam_id=exam_id,
            count=needed + len(selected_questions),
            question_type='mcq',
            randomize=True
        )
        for q in result.get('questions', []):
            if q.id not in selected_ids:
                selected_questions.append(q)
                selected_ids.add(q.id)
                if len(selected_questions) >= 10:
                    break

        # Fallback to broader approved pool if course has < 5 questions
        if len(selected_questions) < 5:
            fallback = service.select(count=10, question_type='mcq', randomize=True)
            for q in fallback.get('questions', []):
                if q.id not in selected_ids:
                    selected_questions.append(q)
                    selected_ids.add(q.id)
                    if len(selected_questions) >= 10:
                        break

        if not selected_questions:
            return Response(
                {"error": "Today's drill isn't available yet. There aren't enough eligible questions for your current course."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Atomic Session Creation
        with transaction.atomic():
            exam_obj = Exam.objects.filter(id=exam_id).first() if exam_id else None
            session = DailyDrillSession.objects.create(
                student=request.user,
                date=today,
                exam=exam_obj,
                course_title=course_title,
                focus_type=focus_type,
                status='IN_PROGRESS',
                duration_seconds=300,
                total_questions=len(selected_questions)
            )
            for idx, q in enumerate(selected_questions):
                DailyDrillQuestion.objects.create(
                    session=session,
                    question=q,
                    order=idx
                )

        return Response(DailyDrillSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class DailyDrillAnswerView(views.APIView):
    """
    Submits an answer for a single question in an active Daily Drill.
    Provides immediate feedback (correct/incorrect, correct option, explanation/hint).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = DailyDrillSession.objects.filter(id=session_id, student=request.user).first()
        if not session:
            return Response({'error': 'Daily drill session not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        if session.status != 'IN_PROGRESS':
            return Response({'error': 'This drill session is no longer in progress.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check server-authoritative timer expiration (+30s grace)
        elapsed = (timezone.now() - session.started_at).total_seconds()
        if elapsed > session.duration_seconds + 30:
            session.status = 'COMPLETED'
            session.time_taken_seconds = session.duration_seconds
            session.completed_at = timezone.now()
            session.save(update_fields=['status', 'time_taken_seconds', 'completed_at'])
            return Response({'error': 'Time has expired for this daily drill session.'}, status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get('question_id')
        selected_option = request.data.get('selected_option')

        if not question_id or not selected_option:
            return Response({'error': 'question_id and selected_option are required.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_opt = str(selected_option).strip().upper()
        if clean_opt not in ['A', 'B', 'C', 'D']:
            return Response({'error': 'Invalid option choice.'}, status=status.HTTP_400_BAD_REQUEST)

        drill_q = session.drill_questions.select_related('question').filter(question_id=question_id).first()
        if not drill_q:
            return Response({'error': 'Question does not belong to this daily drill.'}, status=status.HTTP_404_NOT_FOUND)

        correct_opt = (drill_q.question.correct_option or '').strip().upper()

        # If already answered, return existing state idempotently
        if drill_q.selected_option:
            return Response({
                'question_id': drill_q.question_id,
                'selected_option': drill_q.selected_option,
                'is_correct': drill_q.is_correct,
                'correct_option': correct_opt,
                'explanation': drill_q.question.explanation or '',
                'hint': drill_q.question.hint or '',
                'current_score': session.score,
                'correct_answers': session.correct_answers,
                'answered_count': session.drill_questions.exclude(selected_option__isnull=True).exclude(selected_option='').count(),
                'total_questions': session.total_questions,
            })

        is_correct = (clean_opt == correct_opt)
        drill_q.selected_option = clean_opt
        drill_q.is_correct = is_correct
        drill_q.answered_at = timezone.now()
        drill_q.save(update_fields=['selected_option', 'is_correct', 'answered_at'])

        if is_correct:
            session.correct_answers += 1
            session.score += 10
            session.save(update_fields=['correct_answers', 'score'])

        # Update QuestionMastery for spaced repetition & weak topic tracking
        try:
            qm, _ = QuestionMastery.objects.get_or_create(user=request.user, question=drill_q.question)
            qm.record_answer(is_correct)
        except Exception:
            pass

        answered_count = session.drill_questions.exclude(selected_option__isnull=True).exclude(selected_option='').count()

        return Response({
            'question_id': drill_q.question_id,
            'selected_option': clean_opt,
            'is_correct': is_correct,
            'correct_option': correct_opt,
            'explanation': drill_q.question.explanation or '',
            'hint': drill_q.question.hint or '',
            'current_score': session.score,
            'correct_answers': session.correct_answers,
            'answered_count': answered_count,
            'total_questions': session.total_questions,
        })


class DailyDrillCompleteView(views.APIView):
    """
    Completes a Daily Drill session, calculates final metrics, awards XP via canonical
    gamification service, and increments the daily study streak.
    Idempotent: Re-calling on a completed session does not award duplicate XP.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = DailyDrillSession.objects.filter(id=session_id, student=request.user).first()
        if not session:
            return Response({'error': 'Daily drill session not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        from gamification.services import award_xp, record_study_activity
        from .serializers import DailyDrillReviewItemSerializer

        # Idempotency check: if already completed, return existing results without re-awarding XP
        if session.status == 'COMPLETED':
            review_data = DailyDrillReviewItemSerializer(
                session.drill_questions.select_related('question').order_by('order'),
                many=True
            ).data
            return Response({
                'session_id': session.id,
                'status': session.status,
                'score': session.score,
                'correct_answers': session.correct_answers,
                'total_questions': session.total_questions,
                'accuracy': round((session.correct_answers / max(1, session.total_questions)) * 100, 1),
                'time_taken_seconds': session.time_taken_seconds,
                'xp_awarded': session.xp_awarded,
                'completed_at': session.completed_at,
                'review': review_data
            })

        # Finalize stats
        time_taken = min(session.duration_seconds, int((timezone.now() - session.started_at).total_seconds()))
        correct_count = session.drill_questions.filter(is_correct=True).count()
        total_count = session.total_questions or 10

        # Award XP: 15 base + 3 per correct answer (e.g. 10/10 = 45 XP)
        xp_to_award = 15 + (correct_count * 3)
        award_xp(
            request.user,
            xp_to_award,
            f"Daily Drill Completed ({session.date}) - {correct_count}/{total_count}"
        )
        current_streak = record_study_activity(request.user)

        session.status = 'COMPLETED'
        session.correct_answers = correct_count
        session.score = correct_count * 10
        session.time_taken_seconds = max(1, time_taken)
        session.xp_awarded = xp_to_award
        session.completed_at = timezone.now()
        session.save()

        review_data = DailyDrillReviewItemSerializer(
            session.drill_questions.select_related('question').order_by('order'),
            many=True
        ).data

        return Response({
            'session_id': session.id,
            'status': session.status,
            'score': session.score,
            'correct_answers': session.correct_answers,
            'total_questions': session.total_questions,
            'accuracy': round((session.correct_answers / max(1, session.total_questions)) * 100, 1),
            'time_taken_seconds': session.time_taken_seconds,
            'xp_awarded': session.xp_awarded,
            'current_streak': current_streak,
            'completed_at': session.completed_at,
            'review': review_data
        })


class DailyDrillDetailView(views.APIView):
    """
    Retrieves full details of a specific Daily Drill session owned by the authenticated student.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = DailyDrillSession.objects.filter(id=session_id, student=request.user).first()
        if not session:
            return Response({'error': 'Daily drill session not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(DailyDrillSessionSerializer(session).data)
