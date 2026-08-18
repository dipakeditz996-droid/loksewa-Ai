from django.db import models
from core.models import User
from exams.models import Exam, Subject, Topic

class StudyMaterial(models.Model):
    MATERIAL_TYPES = (
        ('notes', 'Notes'),
        ('pdf', 'PDF'),
        ('study_guide', 'Study Guide'),
        ('reference', 'Reference Material'),
    )
    ACCESS_TYPES = (
        ('free', 'Free'),
        ('premium', 'Premium'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    )

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='materials')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='materials')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='materials')
    
    description = models.TextField(blank=True, help_text="Short description for the list view")
    content = models.TextField(blank=True, help_text="Rich text content (HTML/Markdown)")
    
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, default='notes')
    file = models.FileField(upload_to='study_materials/pdfs/', blank=True, null=True)
    
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    estimated_reading_time = models.IntegerField(default=10, help_text="Estimated time in minutes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class StudentMaterialProgress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='material_progress')
    material = models.ForeignKey(StudyMaterial, on_delete=models.CASCADE, related_name='progress')
    progress = models.IntegerField(default=0, help_text="Percentage 0-100")
    completed = models.BooleanField(default=False)
    last_viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'material')
        ordering = ['-last_viewed_at']

    def __str__(self):
        return f"{self.student.username} - {self.material.title} ({self.progress}%)"


class StudentMaterialBookmark(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='material_bookmarks')
    material = models.ForeignKey(StudyMaterial, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'material')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} bookmarked {self.material.title}"
