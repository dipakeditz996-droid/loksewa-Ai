from django.db import models
from django.contrib.auth import get_user_model
from exams.models import Exam, Subject, Topic

User = get_user_model()

class StudyPlan(models.Model):
    LEVEL_CHOICES = [
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
    ]
    
    TIME_CHOICES = [
        ('MORNING', 'Morning'),
        ('AFTERNOON', 'Afternoon'),
        ('EVENING', 'Evening'),
        ('NIGHT', 'Night'),
    ]

    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name='study_plan')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='study_plans')
    
    target_date = models.DateField()
    daily_minutes = models.IntegerField(default=120)
    
    # Store JSON list of days, e.g. ["Sunday", "Monday"]
    study_days = models.JSONField(default=list)
    
    preferred_time = models.CharField(max_length=20, choices=TIME_CHOICES, blank=True, null=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='BEGINNER')
    
    is_paused = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username}'s Study Plan for {self.exam.title}"

class StudyTask(models.Model):
    TASK_TYPE_CHOICES = [
        ('STUDY_NOTE', 'Study Note'),
        ('PRACTICE', 'Practice'),
        ('MODEL_EXAM', 'Model Exam'),
        ('SUBJECTIVE_PRACTICE', 'Subjective Practice'),
        ('REVIEW_MISTAKES', 'Review Mistakes'),
        ('REVISION', 'Revision'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('SKIPPED', 'Skipped'),
    ]

    study_plan = models.ForeignKey(StudyPlan, on_delete=models.CASCADE, related_name='tasks')
    date = models.DateField()
    
    title = models.CharField(max_length=255)
    task_type = models.CharField(max_length=50, choices=TASK_TYPE_CHOICES)
    
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='study_tasks')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='study_tasks')
    
    duration_minutes = models.IntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} on {self.date}"

    class Meta:
        ordering = ['date', 'created_at']
