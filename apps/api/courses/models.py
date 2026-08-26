from django.db import models
from django.conf import settings
from exams.models import Exam

class Course(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to='courses/thumbnails/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='courses', null=True, blank=True)
    featured = models.BooleanField(default=False)
    # Duration hint for public display
    duration_months = models.PositiveSmallIntegerField(default=0, help_text='Approximate duration in months')
    # Whether students can apply/enroll via the platform
    is_open_for_enrollment = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
    )
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} -> {self.course.title}"


class CourseApplication(models.Model):
    """
    Tracks a student's application to a specific course.

    Lifecycle:
      pending  (student submitted, awaiting payment / admin review)
      approved (admin approved payment → Enrollment created)
      rejected (admin rejected)
      cancelled (student cancelled)

    The subscription_payment FK links to the actual payment proof the student
    submitted. When the payment is approved the backend auto-creates an Enrollment.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_applications'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='applications'
    )
    # Linked payment — null if free / manually enrolled by admin
    subscription_payment = models.ForeignKey(
        'subscriptions.SubscriptionPayment',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='course_applications'
    )
    
    marketplace_payment = models.ForeignKey(
        'marketplace.PaymentSubmission',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='course_applications',
        help_text='If purchased via marketplace instead of subscription.'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    note = models.TextField(blank=True)

    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_course_applications'
    )

    class Meta:
        # One active application per student per course
        unique_together = ('student', 'course')
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.student.username} → {self.course.title} ({self.status})"


class TeacherCourseAssignment(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='teachers')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'course')

    def __str__(self):
        return f"Teacher {self.teacher.username} -> {self.course.title}"



# ============================================================
# TEACHER STUDENT MANAGEMENT SYSTEM
# ============================================================

class TeacherStudentNote(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_notes_given')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teacher_notes')
    note_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on {self.student.username} by {self.teacher.username}"

class TeacherMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_teacher_messages')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_teacher_messages')
    subject = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.sender.username} to {self.recipient.username}"
