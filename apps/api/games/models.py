from django.db import models
from django.utils import timezone
import random
import string
from core.models import User
from exams.models import Question

def generate_invite_code():
    return 'LOK-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

class GameProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='game_profile')
    total_1v1_wins = models.IntegerField(default=0)
    best_survival_score = models.IntegerField(default=0)
    best_survival_streak = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.user.username} Game Profile"

class GameMatch(models.Model):
    STATUS_CHOICES = (
        ('SEARCHING', 'Searching'),
        ('MATCHED', 'Matched'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_p1')
    player2 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_as_p2')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SEARCHING')
    invite_code = models.CharField(max_length=15, unique=True, null=True, blank=True)
    is_invite_only = models.BooleanField(default=False)
    
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_matches')
    is_draw = models.BooleanField(default=False)
    
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)
    
    current_question_index = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Match {self.id}: {self.player1} vs {self.player2}"

class GameQuestion(models.Model):
    match = models.ForeignKey(GameMatch, on_delete=models.CASCADE, related_name='game_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField()
    deadline = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ('match', 'order')
        
    def __str__(self):
        return f"Match {self.match_id} - Q{self.order}"

class GameAnswer(models.Model):
    game_question = models.ForeignKey(GameQuestion, on_delete=models.CASCADE, related_name='answers')
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    score_awarded = models.IntegerField(default=0)
    time_taken_seconds = models.FloatField(default=0.0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('game_question', 'player')

class SurvivalGame(models.Model):
    STATUS_CHOICES = (
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )
    player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='survival_games')
    lives_remaining = models.IntegerField(default=3)
    score = models.IntegerField(default=0)
    questions_survived = models.IntegerField(default=0)
    highest_streak = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    
    current_question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True)
    question_deadline = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.player.username} Survival - Score: {self.score}"

class SurvivalAnswer(models.Model):
    survival_game = models.ForeignKey(SurvivalGame, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    score_awarded = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)
