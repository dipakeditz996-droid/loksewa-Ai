from django.db import models
from core.models import User

class Conversation(models.Model):
    MODE_CHOICES = [
        ('EXPLAIN', 'Explain'),
        ('PRACTICE', 'Practice'),
        ('REVISION', 'Revision'),
        ('EXAM_STRATEGY', 'Exam Strategy'),
        ('STUDY_PLAN', 'Study Plan'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tutor_conversations')
    title = models.CharField(max_length=255, default="New Conversation")
    mode = models.CharField(max_length=50, choices=MODE_CHOICES, default='EXPLAIN')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username} - {self.title}"

    class Meta:
        ordering = ['-updated_at']


class Message(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role} in {self.conversation.title}"

    class Meta:
        ordering = ['created_at']


class PromptTemplate(models.Model):
    """Admin-editable per-mode system prompt suffix, appended to
    AdminSettings.ai_tutor_base_prompt when constructing the AI Tutor's
    system prompt. One row per Conversation mode."""

    MODE_DEFAULTS = {
        'EXPLAIN': "Your goal is to explain concepts clearly with key points and Loksewa exam relevance.",
        'PRACTICE': "Your goal is to generate practice questions (MCQs) for the student. Clearly state these are AI-generated.",
        'REVISION': "Your goal is to provide quick summaries, important facts, and common mistakes for rapid revision.",
        'EXAM_STRATEGY': "Your goal is to provide exam preparation strategies and tips for scoring high.",
        'STUDY_PLAN': "Your goal is to recommend study plan adjustments. Be structured and actionable.",
    }

    mode = models.CharField(max_length=50, choices=Conversation.MODE_CHOICES, unique=True)
    prompt_text = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Prompt for {self.mode}"

    @classmethod
    def get_all_seeded(cls):
        """Returns all 5 mode templates, creating any missing ones from
        MODE_DEFAULTS so admins always see the current live behaviour,
        not a blank field, on first visit."""
        existing = {p.mode: p for p in cls.objects.all()}
        for mode, default_text in cls.MODE_DEFAULTS.items():
            if mode not in existing:
                existing[mode] = cls.objects.create(mode=mode, prompt_text=default_text)
        return existing


class TutorUsage(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tutor_usage')
    date = models.DateField(auto_now_add=True)
    request_count = models.IntegerField(default=0)
    token_usage = models.IntegerField(default=0)

    class Meta:
        unique_together = ('student', 'date')

    def __str__(self):
        return f"{self.student.username} usage on {self.date}: {self.request_count} reqs"
