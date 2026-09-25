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
    is_bot_match = models.BooleanField(default=False)
    bot_difficulty = models.CharField(max_length=20, default='medium')
    matchmaking_timeout_at = models.DateTimeField(null=True, blank=True)
    exam = models.ForeignKey('exams.Exam', on_delete=models.SET_NULL, null=True, blank=True, related_name='game_matches')
    
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_matches')
    is_draw = models.BooleanField(default=False)
    
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)
    
    current_question_index = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        p2_label = "LoksewaAI Bot" if self.is_bot_match else str(self.player2)
        return f"Match {self.id}: {self.player1} vs {p2_label}"

class GameQuestion(models.Model):
    match = models.ForeignKey(GameMatch, on_delete=models.CASCADE, related_name='game_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField()
    deadline = models.DateTimeField(null=True, blank=True)
    
    # Bot simulation parameters
    bot_selected_option = models.CharField(max_length=1, null=True, blank=True)
    bot_is_correct = models.BooleanField(default=False)
    bot_answer_delay = models.FloatField(default=5.0)
    bot_answered = models.BooleanField(default=False)
    
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


class WeeklyQuiz(models.Model):
    title = models.CharField(max_length=255, default='Weekly Grand Loksewa Quiz')
    description = models.TextField(default='Weekly comprehensive MCQ challenge from the Master Question Bank.')
    week_number = models.IntegerField(default=1)
    year = models.IntegerField(default=2026)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=20)
    xp_reward = models.IntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-week_number']
        unique_together = ('week_number', 'year')

    def __str__(self):
        return f"{self.title} (Week {self.week_number}, {self.year})"


class WeeklyQuizQuestion(models.Model):
    quiz = models.ForeignKey(WeeklyQuiz, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ('quiz', 'order')

    def __str__(self):
        return f"Quiz {self.quiz_id} - Q{self.order}: {self.question_id}"


class WeeklyQuizAttempt(models.Model):
    STATUS_CHOICES = (
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )
    quiz = models.ForeignKey(WeeklyQuiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_quiz_attempts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    time_taken_seconds = models.IntegerField(default=0)
    xp_awarded = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} ({self.status}) - {self.score}pts"


class WeeklyQuizAnswer(models.Model):
    attempt = models.ForeignKey(WeeklyQuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('attempt', 'question')


class DailyDrillSession(models.Model):
    STATUS_CHOICES = (
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('EXPIRED', 'Expired'),
    )
    FOCUS_CHOICES = (
        ('weak_areas', 'Weak Topics'),
        ('revision', 'Revision Due'),
        ('course_mixed', 'Course Mixed'),
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_drill_sessions')
    date = models.DateField(db_index=True)
    exam = models.ForeignKey('exams.Exam', on_delete=models.SET_NULL, null=True, blank=True, related_name='daily_drill_sessions')
    course_title = models.CharField(max_length=255, blank=True, default='')
    focus_type = models.CharField(max_length=30, choices=FOCUS_CHOICES, default='course_mixed')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    duration_seconds = models.IntegerField(default=300)
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=10)
    time_taken_seconds = models.IntegerField(default=0)
    xp_awarded = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-started_at']
        unique_together = ('student', 'date', 'exam')

    def __str__(self):
        return f"{self.student.username} - Drill {self.date} ({self.status}) - {self.score}pts"


class DailyDrillQuestion(models.Model):
    session = models.ForeignKey(DailyDrillSession, on_delete=models.CASCADE, related_name='drill_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['order']
        unique_together = ('session', 'order')

    def __str__(self):
        return f"Drill {self.session_id} - Q{self.order}: {self.question_id}"

