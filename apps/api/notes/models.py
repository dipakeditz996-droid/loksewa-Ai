from django.db import models
from core.models import User
from exams.models import Exam, Subject, Topic
from core.upload_validators import validate_document_size_20mb, validate_document_extension


class MaterialCategory(models.Model):
    """A reusable label for study materials, e.g. "Current Affairs".

    Sits alongside the exam/subject/topic hierarchy rather than replacing it:
    the hierarchy says where a material belongs in the syllabus, a category says
    what kind of resource it is.
    """
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, blank=True, help_text="Hex code, e.g. #0B2545")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Material categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class MaterialCollection(models.Model):
    """A hand-curated bundle of study materials, e.g. a revision pack."""
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, blank=True, help_text="Hex code, e.g. #D4A72C")
    materials = models.ManyToManyField(
        'StudyMaterial', related_name='collections', blank=True
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_material_collections',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class StudyMaterial(models.Model):
    MATERIAL_TYPES = (
        ('notes', 'Notes'),
        ('pdf', 'PDF'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('presentation', 'Presentation'),
        ('external_link', 'External Link'),
        ('study_guide', 'Study Guide'),
        ('reference', 'Reference Material'),
    )
    ACCESS_TYPES = (
        ('free', 'Free'),
        ('premium', 'Premium'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('changes_requested', 'Changes Requested'),
        ('published', 'Published'),
        ('rejected', 'Rejected'),
        ('archived', 'Archived'),
    )
    DIFFICULTY_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True) # allow blank for auto-generation
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_materials')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='study_materials', null=True, blank=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='materials')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='materials')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='materials')
    category = models.ForeignKey(
        MaterialCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='materials',
    )

    description = models.TextField(blank=True, help_text="Short description for the list view")
    content = models.TextField(blank=True, help_text="Rich text content (HTML/Markdown)")
    
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, default='notes')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    file = models.FileField(
        upload_to='study_materials/pdfs/', blank=True, null=True,
        validators=[validate_document_size_20mb, validate_document_extension],
    )
    external_url = models.URLField(blank=True, null=True, help_text="For videos or external resources")
    
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    review_note = models.TextField(blank=True, help_text="Admin feedback when changes are requested or rejected")
    
    estimated_reading_time = models.IntegerField(default=10, help_text="Estimated time in minutes")

    available_to_ai_tutor = models.BooleanField(
        default=False,
        help_text="When true and status=published, the AI Tutor may retrieve and quote this "
                   "material's content as reference context for student questions.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid
            self.slug = slugify(self.title) + '-' + str(uuid.uuid4())[:8]
        super().save(*args, **kwargs)

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
