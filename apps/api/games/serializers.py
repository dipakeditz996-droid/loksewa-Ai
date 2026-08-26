from rest_framework import serializers
from .models import GameMatch, GameQuestion, GameAnswer, SurvivalGame, SurvivalAnswer, GameProfile

class GameProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = GameProfile
        fields = ['id', 'username', 'total_1v1_wins', 'best_survival_score', 'best_survival_streak']

class GameMatchSerializer(serializers.ModelSerializer):
    player1_name = serializers.CharField(source='player1.username', read_only=True)
    player2_name = serializers.CharField(source='player2.username', read_only=True)
    winner_name = serializers.CharField(source='winner.username', read_only=True)

    class Meta:
        model = GameMatch
        fields = [
            'id', 'status', 'invite_code', 'is_invite_only',
            'player1', 'player1_name', 'player2', 'player2_name',
            'player1_score', 'player2_score', 'current_question_index',
            'winner', 'winner_name', 'is_draw',
            'created_at', 'started_at', 'ended_at'
        ]

class AdminGameMatchSerializer(serializers.ModelSerializer):
    player1_username = serializers.CharField(source='player1.username', read_only=True)
    player2_username = serializers.CharField(source='player2.username', read_only=True)
    winner_username = serializers.CharField(source='winner.username', read_only=True, allow_null=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = GameMatch
        fields = [
            'id', 'status', 'is_invite_only',
            'player1_username', 'player2_username',
            'player1_score', 'player2_score',
            'winner_username', 'is_draw',
            'question_count',
            'created_at', 'started_at', 'ended_at'
        ]

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
            'id', 'player_username', 'score',
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
    question_text = serializers.CharField(source='current_question.text', read_only=True)
    option_a = serializers.CharField(source='current_question.option_a', read_only=True)
    option_b = serializers.CharField(source='current_question.option_b', read_only=True)
    option_c = serializers.CharField(source='current_question.option_c', read_only=True)
    option_d = serializers.CharField(source='current_question.option_d', read_only=True)

    class Meta:
        model = SurvivalGame
        fields = [
            'id', 'lives_remaining', 'score', 'questions_survived', 'current_streak',
            'question_deadline', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d'
        ]
