from django.db import models
from django.conf import settings
from django.utils import timezone


class StudentProfile(models.Model):
    """
    Extended profile for students. OneToOne with User.
    Stores preferences, target exam info, privacy settings, etc.
    """
    STUDY_TIME_CHOICES = (
        ('morning', 'Morning (6AM - 12PM)'),
        ('afternoon', 'Afternoon (12PM - 5PM)'),
        ('evening', 'Evening (5PM - 9PM)'),
        ('night', 'Night (9PM - 12AM)'),
        ('flexible', 'Flexible'),
    )
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('mixed', 'Mixed'),
    )
    STUDY_MODE_CHOICES = (
        ('practice', 'Practice'),
        ('revision', 'Revision'),
        ('mock_exams', 'Mock Exams'),
        ('balanced', 'Balanced'),
    )
    LANGUAGE_CHOICES = (
        ('en', 'English'),
        ('ne', 'Nepali'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    target_category = models.ForeignKey(
        'exams.ExamCategory', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='targeted_students'
    )
    target_position = models.ForeignKey(
        'exams.Exam', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='targeted_students'
    )

    # Study Preferences
    preferred_study_time = models.CharField(
        max_length=20, choices=STUDY_TIME_CHOICES, default='flexible'
    )
    daily_study_goal_minutes = models.IntegerField(default=120)
    difficulty_preference = models.CharField(
        max_length=10, choices=DIFFICULTY_CHOICES, default='mixed'
    )
    study_mode = models.CharField(
        max_length=20, choices=STUDY_MODE_CHOICES, default='balanced'
    )

    # Privacy
    show_profile = models.BooleanField(default=False)
    show_leaderboard = models.BooleanField(default=True)
    allow_comparisons = models.BooleanField(default=False)
    allow_activity_visibility = models.BooleanField(default=False)

    # Appearance
    language = models.CharField(
        max_length=5, choices=LANGUAGE_CHOICES, default='en'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.username}"


class NotificationPreference(models.Model):
    """
    Per-user notification toggles, persisted server-side.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # Exam
    exam_reminders = models.BooleanField(default=True)
    exam_starting_soon = models.BooleanField(default=True)
    exam_deadline = models.BooleanField(default=True)
    result_published = models.BooleanField(default=True)

    # Study
    study_plan_reminders = models.BooleanField(default=True)
    practice_reminders = models.BooleanField(default=True)
    daily_progress = models.BooleanField(default=True)

    # AI Tutor
    ai_tutor_updates = models.BooleanField(default=True)
    study_recommendations = models.BooleanField(default=True)

    # Marketplace
    order_updates = models.BooleanField(default=True)
    marketplace_notifications = models.BooleanField(default=True)

    # System
    security_alerts = models.BooleanField(default=True)
    account_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f"Notifications: {self.user.username}"


class SupportTicket(models.Model):
    CATEGORY_CHOICES = (
        ('exam_problem', 'Exam Problem'),
        ('wrong_question', 'Wrong Question/Answer'),
        ('technical', 'Technical Issue'),
        ('ai_tutor', 'AI Tutor Problem'),
        ('account', 'Account Problem'),
        ('payment', 'Payment/Marketplace'),
        ('other', 'Other'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('waiting_student', 'Waiting for Student'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_tickets'
    )
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    related_exam = models.CharField(max_length=255, blank=True)
    related_question = models.CharField(max_length=255, blank=True)
    related_page = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['ticket_number']),
        ]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.ticket_number:
            self.ticket_number = f"LSAI-{self.pk:04d}"
            SupportTicket.objects.filter(pk=self.pk).update(ticket_number=self.ticket_number)

    def __str__(self):
        return f"{self.ticket_number}: {self.subject}"


class SupportMessage(models.Model):
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    message = models.TextField()
    is_staff_reply = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message on {self.ticket.ticket_number} by {self.sender.username}"


class SupportAttachment(models.Model):
    message = models.ForeignKey(
        SupportMessage, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to='support/attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name


class FAQ(models.Model):
    CATEGORY_CHOICES = (
        ('exams', 'Exams & Tests'),
        ('question_bank', 'Question Bank'),
        ('ai_tutor', 'AI Tutor'),
        ('study_plan', 'Study Plan'),
        ('practice', 'Practice'),
        ('marketplace', 'Marketplace'),
        ('account', 'Account & Security'),
        ('payments', 'Payments'),
        ('technical', 'Technical Issues'),
    )

    question = models.CharField(max_length=500)
    answer = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='exams')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    helpful_count = models.IntegerField(default=0)
    not_helpful_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-helpful_count']

    def __str__(self):
        return self.question[:80]


class FAQFeedback(models.Model):
    faq = models.ForeignKey(FAQ, on_delete=models.CASCADE, related_name='feedbacks')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    is_helpful = models.BooleanField()
    feedback_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('faq', 'user')

    def __str__(self):
        return f"{'Helpful' if self.is_helpful else 'Not helpful'}: {self.faq.question[:40]}"
