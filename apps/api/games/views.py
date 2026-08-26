from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from django.core.paginator import Paginator
import random
from datetime import timedelta

from .models import (
    GameMatch, GameQuestion, GameAnswer, SurvivalGame, SurvivalAnswer, GameProfile, generate_invite_code
)
from .serializers import (
    GameMatchSerializer, GameQuestionSerializer, SurvivalGameSerializer, ActiveSurvivalSerializer, GameProfileSerializer,
    AdminGameMatchSerializer, AdminSurvivalGameSerializer
)
from exams.models import Question
from exams.selection_service import QuestionSelectionService
from administration.permissions import IsAdminUser

# Configuration
MATCH_QUESTIONS_COUNT = 10
QUESTION_TIME_SECONDS = 15
SURVIVAL_MAX_LIVES = 3

def get_or_create_profile(user):
    profile, _ = GameProfile.objects.get_or_create(user=user)
    return profile

def assign_random_questions(match, exam_id=None, subject_id=None, topic_id=None, question_type='mcq'):
    """
    Selects approved questions from the Master Question Bank for a 1v1 match.
    All randomization happens server-side.
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
    for idx, q in enumerate(questions):
        GameQuestion.objects.create(
            match=match,
            question=q,
            order=idx
        )

# ==========================================
# 1v1 MATCHMAKING & PLAY
# ==========================================

class MatchmakingView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Check if user is already in an active/searching match
        existing_match = GameMatch.objects.filter(
            Q(player1=user) | Q(player2=user),
            status__in=['SEARCHING', 'MATCHED', 'IN_PROGRESS']
        ).first()
        
        if existing_match:
            return Response(GameMatchSerializer(existing_match).data)

        # Look for a waiting player
        waiting_match = GameMatch.objects.filter(status='SEARCHING', is_invite_only=False).exclude(player1=user).first()
        
        if waiting_match:
            # Join the match
            waiting_match.player2 = user
            waiting_match.status = 'MATCHED'
            assign_random_questions(waiting_match)
            # Set the deadline for the first question
            first_q = waiting_match.game_questions.first()
            first_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 5) # 5s buffer for intro
            first_q.save()
            waiting_match.started_at = timezone.now()
            waiting_match.save()
            return Response(GameMatchSerializer(waiting_match).data)
        
        # Create new waiting match
        new_match = GameMatch.objects.create(player1=user, is_invite_only=False)
        return Response(GameMatchSerializer(new_match).data)

class InviteMatchView(views.APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
            if request.user not in [match.player1, match.player2]:
                return Response({'error': 'Unauthorized'}, status=403)
                
            data = GameMatchSerializer(match).data
            
            # Check if match should auto-progress due to timeout
            if match.status == 'MATCHED' or match.status == 'IN_PROGRESS':
                current_q = match.game_questions.filter(order=match.current_question_index).first()
                if current_q and current_q.deadline and timezone.now() > current_q.deadline:
                    # Move to next question
                    self.advance_question(match)
            
            # Get current question
            if match.status in ['MATCHED', 'IN_PROGRESS']:
                current_q = match.game_questions.filter(order=match.current_question_index).first()
                if current_q:
                    data['current_question'] = GameQuestionSerializer(current_q).data
                    # Check if user already answered
                    has_answered = GameAnswer.objects.filter(game_question=current_q, player=request.user).exists()
                    data['has_answered'] = has_answered
            
            return Response(data)
        except GameMatch.DoesNotExist:
            return Response({'error': 'Match not found'}, status=404)

    def advance_question(self, match):
        if match.current_question_index >= MATCH_QUESTIONS_COUNT - 1:
            # End game
            self.end_match(match)
        else:
            match.current_question_index += 1
            match.status = 'IN_PROGRESS'
            next_q = match.game_questions.filter(order=match.current_question_index).first()
            if next_q:
                next_q.deadline = timezone.now() + timedelta(seconds=QUESTION_TIME_SECONDS + 2) # 2s transition buffer
                next_q.save()
            match.save()
            
    def end_match(self, match):
        match.status = 'COMPLETED'
        match.ended_at = timezone.now()
        
        if match.player1_score > match.player2_score:
            match.winner = match.player1
            p1_profile = get_or_create_profile(match.player1)
            p1_profile.total_1v1_wins += 1
            p1_profile.save()
        elif match.player2_score > match.player1_score:
            match.winner = match.player2
            p2_profile = get_or_create_profile(match.player2)
            p2_profile.total_1v1_wins += 1
            p2_profile.save()
        else:
            match.is_draw = True
            
        match.save()

class MatchAnswerView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id):
        try:
            match = GameMatch.objects.get(id=match_id, status__in=['MATCHED', 'IN_PROGRESS'])
            user = request.user
            if user not in [match.player1, match.player2]:
                return Response({'error': 'Unauthorized'}, status=403)
                
            selected_option = request.data.get('option')
            
            current_q = match.game_questions.filter(order=match.current_question_index).first()
            if not current_q:
                return Response({'error': 'No active question'}, status=400)
                
            if current_q.deadline and timezone.now() > current_q.deadline:
                return Response({'error': 'Time expired'}, status=400)
                
            if GameAnswer.objects.filter(game_question=current_q, player=user).exists():
                return Response({'error': 'Already answered'}, status=400)
                
            is_correct = (selected_option == current_q.question.correct_option)
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
                
            # Check if both answered, if so advance early
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
    )
    if result['questions']:
        question = result['questions'][0]
    else:
        # Fallback: any approved question
        fallback = service.select(count=1, randomize=True)
        question = fallback['questions'][0] if fallback['questions'] else None

    return question, points, time

class SurvivalStartView(views.APIView):
    permission_classes = [IsAuthenticated]

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

class SurvivalAnswerView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, survival_id):
        try:
            game = SurvivalGame.objects.get(id=survival_id, player=request.user, status='IN_PROGRESS')
            
            selected_option = request.data.get('option')
            
            # Check timeout
            if game.question_deadline and timezone.now() > game.question_deadline:
                is_correct = False # Timeout counts as wrong
            else:
                is_correct = (selected_option == game.current_question.correct_option)
                
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
                
                # Update profile
                profile = get_or_create_profile(request.user)
                if game.score > profile.best_survival_score:
                    profile.best_survival_score = game.score
                if game.highest_streak > profile.best_survival_streak:
                    profile.best_survival_streak = game.highest_streak
                profile.save()
                
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
        
        return Response({
            'matches': match_data,
            'survivals': survival_data
        })

class LeaderboardView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1v1 Wins
        top_1v1 = GameProfile.objects.order_by('-total_1v1_wins')[:10]
        # Survival
        top_survival = GameProfile.objects.order_by('-best_survival_score')[:10]

        return Response({
            'top_1v1': GameProfileSerializer(top_1v1, many=True).data,
            'top_survival': GameProfileSerializer(top_survival, many=True).data
        })

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
