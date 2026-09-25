from rest_framework import serializers
from .models import (
    GameMatch, GameQuestion, GameAnswer, SurvivalGame, SurvivalAnswer, GameProfile,
    WeeklyQuiz, WeeklyQuizQuestion, WeeklyQuizAttempt, WeeklyQuizAnswer,
    DailyDrillSession, DailyDrillQuestion
)

class GameProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = GameProfile
        fields = ['id', 'username', 'total_1v1_wins', 'best_survival_score', 'best_survival_streak']

from django.utils import timezone

class GameMatchSerializer(serializers.ModelSerializer):
    player1_name = serializers.CharField(source='player1.username', read_only=True)
    player2_name = serializers.SerializerMethodField()
    winner_name = serializers.SerializerMethodField()
    opponent_type = serializers.SerializerMethodField()
    time_remaining_matchmaking = serializers.SerializerMethodField()

    class Meta:
        model = GameMatch
        fields = [
            'id', 'status', 'invite_code', 'is_invite_only',
            'is_bot_match', 'bot_difficulty', 'opponent_type', 'time_remaining_matchmaking',
            'player1', 'player1_name', 'player2', 'player2_name',
            'player1_score', 'player2_score', 'current_question_index',
            'winner', 'winner_name', 'is_draw',
            'created_at', 'started_at', 'ended_at'
        ]

    def get_player2_name(self, obj):
        if obj.is_bot_match:
            return "LoksewaAI Bot"
        return obj.player2.username if obj.player2 else None

    def get_winner_name(self, obj):
        if obj.winner:
            return obj.winner.username
        if obj.is_bot_match and not obj.is_draw and obj.player2_score > obj.player1_score:
            return "LoksewaAI Bot"
        return None

    def get_opponent_type(self, obj):
        return "BOT" if obj.is_bot_match else "HUMAN"

    def get_time_remaining_matchmaking(self, obj):
        if obj.status == 'SEARCHING' and obj.matchmaking_timeout_at:
            remaining = int((obj.matchmaking_timeout_at - timezone.now()).total_seconds())
            return max(0, remaining)
        return 0

class AdminGameMatchSerializer(serializers.ModelSerializer):
    player1_username = serializers.CharField(source='player1.username', read_only=True)
    player2_username = serializers.SerializerMethodField()
    winner_username = serializers.SerializerMethodField()
    opponent_type = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = GameMatch
        fields = [
            'id', 'status', 'is_invite_only',
            'is_bot_match', 'bot_difficulty', 'opponent_type',
            'player1_id', 'player1_username', 'player2_id', 'player2_username',
            'player1_score', 'player2_score',
            'winner_id', 'winner_username', 'is_draw',
            'question_count',
            'created_at', 'started_at', 'ended_at'
        ]

    def get_player2_username(self, obj):
        if obj.is_bot_match:
            return "LoksewaAI Bot (Computer)"
        return obj.player2.username if obj.player2 else None

    def get_winner_username(self, obj):
        if obj.winner:
            return obj.winner.username
        if obj.is_bot_match and not obj.is_draw and obj.player2_score > obj.player1_score:
            return "LoksewaAI Bot (Computer)"
        return None

    def get_opponent_type(self, obj):
        return "BOT" if obj.is_bot_match else "HUMAN"

    def get_question_count(self, obj):
        return obj.game_questions.count()

class GameQuestionSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)

    class Meta:
        model = GameQuestion
        fields = ['id', 'order', 'deadline', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d']

class SurvivalGameSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)

    class Meta:
        model = SurvivalGame
        fields = [
            'id', 'player', 'player_name', 'lives_remaining', 'score',
            'questions_survived', 'highest_streak', 'current_streak',
            'status', 'created_at', 'ended_at'
        ]

class AdminSurvivalGameSerializer(serializers.ModelSerializer):
    player_username = serializers.CharField(source='player.username', read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    correct_answers = serializers.SerializerMethodField()

    class Meta:
        model = SurvivalGame
        fields = [
            'id', 'player_id', 'player_username', 'score',
            'questions_survived', 'highest_streak',
            'status', 'correct_answers', 'duration_seconds',
            'created_at', 'ended_at'
        ]

    def get_duration_seconds(self, obj):
        if obj.ended_at:
            delta = obj.ended_at - obj.created_at
            return int(delta.total_seconds())
        return None

    def get_correct_answers(self, obj):
        return obj.answers.filter(is_correct=True).count()

class ActiveSurvivalSerializer(serializers.ModelSerializer):
    # Only sent when game is in progress
    question_id = serializers.IntegerField(source='current_question.id', read_only=True)
    question_text = serializers.CharField(source='current_question.text', read_only=True)
    option_a = serializers.CharField(source='current_question.option_a', read_only=True)
    option_b = serializers.CharField(source='current_question.option_b', read_only=True)
    option_c = serializers.CharField(source='current_question.option_c', read_only=True)
    option_d = serializers.CharField(source='current_question.option_d', read_only=True)

    class Meta:
        model = SurvivalGame
        fields = [
            'id', 'status', 'lives_remaining', 'score', 'questions_survived', 'highest_streak', 'current_streak',
            'created_at', 'question_deadline', 'question_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d'
        ]


class WeeklyQuizQuestionClientSerializer(serializers.ModelSerializer):
    """Client-facing question representation during an active quiz (hides answers)."""
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)

    class Meta:
        model = WeeklyQuizQuestion
        fields = ['id', 'order', 'question_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d']


class WeeklyQuizSerializer(serializers.ModelSerializer):
    questions_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyQuiz
        fields = [
            'id', 'title', 'description', 'week_number', 'year',
            'start_date', 'end_date', 'duration_minutes', 'xp_reward',
            'is_active', 'questions_count', 'created_at'
        ]

    def get_questions_count(self, obj):
        return obj.quiz_questions.count()


class WeeklyQuizAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    duration_minutes = serializers.IntegerField(source='quiz.duration_minutes', read_only=True)

    class Meta:
        model = WeeklyQuizAttempt
        fields = [
            'id', 'quiz_id', 'quiz_title', 'student_name', 'status',
            'score', 'correct_answers', 'total_questions', 'duration_minutes',
            'time_taken_seconds', 'xp_awarded', 'started_at', 'completed_at'
        ]


class WeeklyQuizAnswerReviewSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)
    correct_option = serializers.CharField(source='question.correct_option', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)

    class Meta:
        model = WeeklyQuizAnswer
        fields = [
            'id', 'question_id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'selected_option', 'correct_option',
            'is_correct', 'explanation', 'submitted_at'
        ]


class DailyDrillQuestionClientSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)
    hint = serializers.SerializerMethodField()
    correct_option = serializers.SerializerMethodField()
    explanation = serializers.SerializerMethodField()
    is_answered = serializers.SerializerMethodField()

    class Meta:
        model = DailyDrillQuestion
        fields = [
            'id', 'order', 'question_id', 'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'selected_option', 'is_answered', 'is_correct',
            'correct_option', 'explanation', 'hint', 'answered_at'
        ]

    def get_is_answered(self, obj):
        return bool(obj.selected_option)

    def get_hint(self, obj):
        return obj.question.hint if (obj.question.hint and obj.question.hint.strip()) else None

    def get_correct_option(self, obj):
        # Reveal correct option only once student has answered, or session is completed
        if obj.selected_option or (obj.session and obj.session.status == 'COMPLETED'):
            return obj.question.correct_option
        return None

    def get_explanation(self, obj):
        # Reveal explanation only once student has answered, or session is completed
        if obj.selected_option or (obj.session and obj.session.status == 'COMPLETED'):
            return obj.question.explanation if (obj.question.explanation and obj.question.explanation.strip()) else None
        return None


class DailyDrillSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    remaining_seconds = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()
    accuracy = serializers.SerializerMethodField()
    focus_label = serializers.SerializerMethodField()
    questions = DailyDrillQuestionClientSerializer(source='drill_questions', many=True, read_only=True)

    class Meta:
        model = DailyDrillSession
        fields = [
            'id', 'student_name', 'date', 'exam_id', 'course_title',
            'focus_type', 'focus_label', 'status', 'duration_seconds',
            'remaining_seconds', 'score', 'correct_answers', 'total_questions',
            'answered_count', 'accuracy', 'time_taken_seconds', 'xp_awarded',
            'started_at', 'completed_at', 'questions'
        ]

    def get_remaining_seconds(self, obj):
        if obj.status == 'COMPLETED':
            return 0
        elapsed = int((timezone.now() - obj.started_at).total_seconds())
        remaining = obj.duration_seconds - elapsed
        return max(0, remaining)

    def get_answered_count(self, obj):
        return obj.drill_questions.exclude(selected_option__isnull=True).exclude(selected_option='').count()

    def get_accuracy(self, obj):
        if obj.total_questions > 0 and obj.status == 'COMPLETED':
            return round((obj.correct_answers / obj.total_questions) * 100, 1)
        return 0.0

    def get_focus_label(self, obj):
        labels = {
            'weak_areas': 'Weak Topics Priority',
            'revision': 'Revision Due',
            'course_mixed': 'Course Mixed Challenge',
        }
        return labels.get(obj.focus_type, 'Course Practice')


class DailyDrillReviewItemSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)
    correct_option = serializers.CharField(source='question.correct_option', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    hint = serializers.CharField(source='question.hint', read_only=True)

    class Meta:
        model = DailyDrillQuestion
        fields = [
            'id', 'order', 'question_id', 'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'selected_option', 'correct_option', 'is_correct',
            'explanation', 'hint', 'answered_at'
        ]

