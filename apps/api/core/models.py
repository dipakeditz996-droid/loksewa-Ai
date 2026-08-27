from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
        ('super-admin', 'Super Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    avatar = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class TeacherProfile(models.Model):
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    QUESTION_TYPE_CHOICES = (
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('subjective', 'Subjective'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    bio = models.TextField(blank=True, null=True)
    specialization = models.CharField(max_length=255, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    experience_years = models.PositiveIntegerField(default=0)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    preferred_difficulty = models.CharField(
        max_length=10, choices=DIFFICULTY_CHOICES, default='medium', blank=True
    )
    preferred_question_type = models.CharField(
        max_length=20, choices=QUESTION_TYPE_CHOICES, default='mcq', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Teacher Profile: {self.user.username}"


class Notification(models.Model):
    TYPE_CHOICES = (
        ('question_review', 'Question Review'),
        ('material_review', 'Study Material Review'),
        ('student_activity', 'Student Activity'),
        ('system', 'System Alert'),
        ('support', 'Support Response'),
        ('payment', 'Payment Notification'),
        ('announcement', 'Announcement'),
        ('other', 'Other'),
    )
    PRIORITY_CHOICES = (
        ('normal', 'Normal'),
        ('important', 'Important'),
        ('critical', 'Critical'),
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    # Set when this row was fanned out from an admin broadcast. Lets the admin
    # side compute real per-campaign read/unread counts instead of guessing.
    source_admin_notification = models.ForeignKey(
        'AdminNotification', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deliveries',
    )
    related_id = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='other')
    title = models.CharField(max_length=255)
    message = models.TextField()
    action_url = models.CharField(max_length=500, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"


class AdminNotification(models.Model):
    """System-wide announcements/notifications created by admins."""
    TYPE_CHOICES = (
        ('alert', 'Alert'),
        ('announcement', 'Announcement'),
        ('system', 'System'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    title = models.CharField(max_length=255)
    content = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='announcement')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Targeting
    target_role = models.CharField(
        max_length=50,
        default='all',
        help_text="Target audience: 'all', 'students', 'teachers', 'admins'"
    )

    # Scheduling
    scheduled_for = models.DateTimeField(null=True, blank=True)

    # Tracking
    recipient_count = models.IntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='admin_notifications_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class AdminSettings(models.Model):
    """System-wide admin settings and configuration."""

    # Platform Settings
    platform_name = models.CharField(max_length=255, default='Loksewa')
    platform_logo_url = models.URLField(blank=True, null=True)
    platform_description = models.TextField(blank=True, default='')
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')

    # Email Settings
    email_smtp_host = models.CharField(max_length=255, blank=True, default='')
    email_smtp_port = models.IntegerField(blank=True, null=True, default=587)
    email_smtp_user = models.CharField(max_length=255, blank=True, default='')
    email_from_address = models.EmailField(blank=True, default='')
    email_from_name = models.CharField(max_length=255, blank=True, default='')

    # Notification Settings
    notifications_enabled = models.BooleanField(default=True)
    enable_email_notifications = models.BooleanField(default=True)
    enable_in_app_notifications = models.BooleanField(default=True)
    enable_push_notifications = models.BooleanField(default=False)

    # Security Settings
    password_min_length = models.IntegerField(default=8)
    password_require_uppercase = models.BooleanField(default=True)
    password_require_numbers = models.BooleanField(default=True)
    password_require_special_chars = models.BooleanField(default=True)
    session_timeout_minutes = models.IntegerField(default=60)
    enable_two_factor_auth = models.BooleanField(default=False)
    max_login_attempts = models.IntegerField(default=5)

    # Feature Flags
    enable_ai_tutor = models.BooleanField(default=True)
    enable_marketplace = models.BooleanField(default=True)
    enable_gamification = models.BooleanField(default=True)
    enable_study_plans = models.BooleanField(default=True)

    # Metadata
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_settings_updates')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Admin Settings"

    def __str__(self):
        return f"Admin Settings - Last Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')}"

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings object."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class SocialAccount(models.Model):
    PROVIDER_CHOICES = (
        ('google', 'Google'),
        ('facebook', 'Facebook'),
        ('apple', 'Apple'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='social_accounts')
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    provider_account_id = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('provider', 'provider_account_id')

    def __str__(self):
        return f"{self.user.username} - {self.provider}"


class Position(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
        ]

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#6366f1')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
