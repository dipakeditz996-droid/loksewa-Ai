from django.db import models
from django.utils import timezone
from core.models import User
from django.conf import settings

class ExamCategory(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Exam(models.Model):
    category = models.ForeignKey(ExamCategory, on_delete=models.CASCADE, related_name='exams')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Paper(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='papers')
    name = models.CharField(max_length=255)
    paper_number = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.exam.name})"

class Subject(models.Model):
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='subjects', null=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.paper.name if self.paper else 'No Paper'})"

class Chapter(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.subject.name})"

class Topic(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='topics')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.chapter.title}"

class UserTopicProgress(models.Model):
    STATUS_CHOICES = (
        ('not-started', 'Not Started'),
        ('in-progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topic_progress')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='user_progress')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not-started')
    accuracy = models.FloatField(null=True, blank=True)
    progress = models.IntegerField(default=0) # percentage
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'topic')

    def __str__(self):
        return f"{self.user.username} - {self.topic.name} ({self.status})"

class Question(models.Model):
    QUESTION_TYPES = (
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True / False'),
        ('short_answer', 'Short Answer'),
        ('long_answer', 'Long Answer'),
        ('subjective', 'Subjective'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('changes_requested', 'Changes Requested'),
        ('rejected', 'Rejected'),
        ('archived', 'Archived'),
    )
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    question_id = models.CharField(max_length=20, unique=True, blank=True, null=True, help_text="Permanent unique ID (e.g., Q-000001)")
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='mcq')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    text = models.TextField()
    
    # MCQ Fields
    option_a = models.CharField(max_length=255, blank=True, null=True)
    option_b = models.CharField(max_length=255, blank=True, null=True)
    option_c = models.CharField(max_length=255, blank=True, null=True)
    option_d = models.CharField(max_length=255, blank=True, null=True)
    correct_option = models.CharField(max_length=1, choices=(
        ('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')
    ), blank=True, null=True)
    
    # Subjective Fields
    model_answer = models.TextField(blank=True, help_text='Reference answer for evaluators')
    
    # Common properties
    marks = models.FloatField(default=1)
    negative_marks = models.FloatField(default=0)
    expected_time_minutes = models.IntegerField(default=1)
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    # AI Fields
    ai_generate_options = models.BooleanField(default=False)
    ai_status = models.CharField(
        max_length=20, 
        choices=(('pending', 'Pending'), ('reviewed', 'Reviewed'), ('approved', 'Approved')), 
        default='pending'
    )
    
    # Moderation & Workflow Fields
    tags = models.CharField(max_length=255, blank=True, help_text="Comma-separated tags")
    reference = models.CharField(max_length=255, blank=True, help_text="Source or reference material")
    reviewer_comment = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_questions'
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='authored_questions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.question_id:
            self.question_id = f"Q-{self.pk:06d}"
            # Use update() to avoid calling save() again recursively
            Question.objects.filter(pk=self.pk).update(question_id=self.question_id)

    @property
    def usage_count(self):
        """Helper to get how many sets/exams reference this question."""
        sets_count = self.question_sets.count()
        mock_exams_count = self.model_exams.count()
        return sets_count + mock_exams_count

    def __str__(self):
        return f"[{self.question_id or 'New'}] {self.text[:50]}"

class QuestionCollection(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=50, blank=True, help_text="Hex code or tailwind class")
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name")
    status = models.CharField(max_length=20, choices=(('active', 'Active'), ('inactive', 'Inactive')), default='active')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_collections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    questions = models.ManyToManyField(Question, related_name='collections', blank=True)

    def __str__(self):
        return self.name

class CollectionRule(models.Model):
    collection = models.OneToOneField(QuestionCollection, on_delete=models.CASCADE, related_name='rule')
    keywords = models.JSONField(default=list, help_text="List of strings")
    apply_to_new = models.BooleanField(default=True)
    apply_to_csv = models.BooleanField(default=True)

    def __str__(self):
        return f"Rule for {self.collection.name}"

class AIClassificationSuggestion(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='ai_suggestions')
    collection = models.ForeignKey(QuestionCollection, on_delete=models.CASCADE)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, 
        choices=(('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')), 
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Suggestion: {self.collection.name} for {self.question.question_id}"

class QuestionSet(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'), # Equivalent to published for now or just a moderation step
        ('published', 'Published'),
        ('changes_requested', 'Changes Requested'),
        ('rejected', 'Rejected'),
        ('archived', 'Archived'),
    )
    SET_TYPE_CHOICES = (
        ('full_mock', 'Full Mock Set'),
        ('subject', 'Subject Set'),
        ('chapter', 'Chapter Set'),
        ('topic', 'Topic Set'),
        ('position', 'Position-wise Set'),
        ('custom', 'Custom Set'),
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    set_type = models.CharField(max_length=20, choices=SET_TYPE_CHOICES, default='custom')
    category = models.ForeignKey(ExamCategory, on_delete=models.CASCADE, related_name='question_sets')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='question_sets', help_text="Position / Level")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='question_sets', null=True, blank=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='question_sets', null=True, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='question_sets', null=True, blank=True)
    subject_distribution = models.JSONField(default=dict, blank=True, help_text="For Full Mock sets, format: {'subject_id': count}")
    
    total_questions = models.IntegerField()
    time_limit = models.IntegerField(default=60, help_text="Time limit in minutes")
    passing_marks = models.FloatField(default=0)
    total_marks = models.FloatField(default=100)
    marks_per_question = models.FloatField(default=1)
    
    negative_marking = models.BooleanField(default=False)
    negative_marking_value = models.FloatField(default=0.20, help_text="Amount deducted per wrong answer")
    
    randomize_questions = models.BooleanField(default=False)
    randomize_options = models.BooleanField(default=False)
    
    difficulty_distribution = models.JSONField(default=dict, help_text="e.g., {'easy': 20, 'medium': 20, 'hard': 10}")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    questions = models.ManyToManyField(Question, through='QuestionSetQuestion', related_name='question_sets')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_question_sets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Moderation Workflow
    reviewer_comment = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, related_name='reviewed_practice_sets', on_delete=models.SET_NULL, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class QuestionSetQuestion(models.Model):
    question_set = models.ForeignKey(QuestionSet, on_delete=models.CASCADE, related_name='question_set_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)
    marks = models.FloatField(default=1)

    class Meta:
        unique_together = ('question_set', 'question')
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.question_set.name} - Q{self.question_id}"

class PracticeSession(models.Model):
    MODE_CHOICES = (
        ('flexible', 'Flexible'),
        ('timed', 'Timed'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='practice_sessions')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='flexible')
    difficulty = models.CharField(max_length=10, blank=True, null=True)
    total_questions = models.IntegerField()
    correct_count = models.IntegerField(default=0)
    incorrect_count = models.IntegerField(default=0)
    unanswered_count = models.IntegerField(default=0)
    score = models.FloatField(default=0)
    accuracy = models.FloatField(default=0)
    time_taken_seconds = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class QuestionAttempt(models.Model):
    session = models.ForeignKey(PracticeSession, on_delete=models.CASCADE, related_name='attempts')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    is_marked_for_review = models.BooleanField(default=False)
    time_taken_seconds = models.IntegerField(default=0)

class Bookmark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'question')

class ModelExam(models.Model):
    """
    [LEGACY - DEPRECATED]
    This model is being replaced by `Examination`.
    Do not use for new implementations.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='model_exams')
    duration_minutes = models.IntegerField(default=90)
    total_questions = models.IntegerField()
    total_marks = models.FloatField()
    passing_marks = models.FloatField(null=True, blank=True)
    negative_marking = models.FloatField(default=0.2) # e.g. 0.2 means 20% negative marks per wrong answer
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    questions = models.ManyToManyField(Question, related_name='model_exams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class ModelExamAttempt(models.Model):
    """
    [LEGACY - DEPRECATED]
    This model is being replaced by `ExaminationAttempt`.
    Do not use for new implementations.
    """
    STATUS_CHOICES = (
        ('in-progress', 'In Progress'),
        ('submitted', 'Submitted'),
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='model_exam_attempts')
    model_exam = models.ForeignKey(ModelExam, on_delete=models.CASCADE, related_name='attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in-progress')
    
    score = models.FloatField(default=0)
    accuracy = models.FloatField(default=0)
    correct_count = models.IntegerField(default=0)
    incorrect_count = models.IntegerField(default=0)
    unanswered_count = models.IntegerField(default=0)
    time_taken_seconds = models.IntegerField(default=0)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} - {self.model_exam.title} ({self.status})"

class ModelExamAttemptAnswer(models.Model):
    """
    [LEGACY - DEPRECATED]
    This model is being replaced by `StudentAnswer`.
    Do not use for new implementations.
    """
    attempt = models.ForeignKey(ModelExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    is_marked_for_review = models.BooleanField(default=False)

    class Meta:
        unique_together = ('attempt', 'question')

# ============================================================
# SUBJECTIVE PRACTICE SYSTEM
# ============================================================

class SubjectivePracticeSet(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='subjective_practice_sets')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='subjective_practice_sets')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='subjective_practice_sets')
    questions = models.ManyToManyField(Question, related_name='practice_sets')
    estimated_time_minutes = models.IntegerField(default=60)
    difficulty = models.CharField(max_length=10, choices=Question.DIFFICULTY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class SubjectiveModelExam(models.Model):
    """
    [LEGACY - DEPRECATED]
    This model is being deprecated as part of the Mock Exam consolidation.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='subjective_model_exams')
    questions = models.ManyToManyField(Question, related_name='subjective_model_exams')
    duration_minutes = models.IntegerField(default=180)
    total_marks = models.FloatField(default=100)
    passing_marks = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class SubjectiveAttempt(models.Model):
    MODE_CHOICES = (
        ('practice', 'Practice Set'),
        ('topic', 'Topic Practice'),
        ('model_exam', 'Model Exam'),
    )
    STATUS_CHOICES = (
        ('in-progress', 'In Progress'),
        ('submitted', 'Submitted'),
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjective_attempts')
    practice_set = models.ForeignKey(SubjectivePracticeSet, on_delete=models.SET_NULL, null=True, blank=True, related_name='attempts')
    model_exam = models.ForeignKey(SubjectiveModelExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='attempts')
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='practice')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in-progress')

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} - {self.mode} ({self.status})"

class SubjectiveAnswer(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under-review', 'Under Review'),
        ('evaluated', 'Evaluated'),
        ('returned', 'Returned'),
    )
    attempt = models.ForeignKey(SubjectiveAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.TextField(blank=True)
    file_url = models.URLField(blank=True, null=True, help_text='URL for uploaded PDF/image answer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    last_saved_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    word_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('attempt', 'question')

    def __str__(self):
        return f"Answer for Q{self.question_id} by {self.attempt.student.username}"

class Evaluation(models.Model):
    answer = models.OneToOneField(SubjectiveAnswer, on_delete=models.CASCADE, related_name='evaluation')
    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='evaluations_given')
    marks_obtained = models.FloatField(default=0)
    feedback = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Eval: {self.marks_obtained}/{self.answer.question.marks}"

class Annotation(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='annotations')
    selected_text = models.TextField(help_text='The highlighted portion of the student answer')
    comment = models.TextField()
    start_offset = models.IntegerField(default=0, help_text='Character offset start in answer_text')
    end_offset = models.IntegerField(default=0, help_text='Character offset end in answer_text')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Annotation: {self.comment[:40]}"

class VideoFeedback(models.Model):
    evaluation = models.OneToOneField(Evaluation, on_delete=models.CASCADE, related_name='video_feedback')
    youtube_url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Video for Eval#{self.evaluation_id}"

# ============================================================
# EXAM & MOCK TEST MANAGEMENT SYSTEM
# ============================================================

class Examination(models.Model):
    EXAM_TYPES = (
        ('mock', 'Mock Test'),
        ('practice', 'Practice Test'),
        ('full', 'Full-Length Exam'),
        ('position', 'Position-Based Exam'),
        ('subject', 'Subject Test'),
        ('custom', 'Custom Exam'),
        ('subjective', 'Subjective Exam'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('published', 'Published'),
        ('changes_requested', 'Changes Requested'),
        ('rejected', 'Rejected'),
        ('archived', 'Archived'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES, default='mock')
    category = models.ForeignKey(ExamCategory, on_delete=models.CASCADE, related_name='examinations')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='examinations', help_text="Position / Level")
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='examinations', help_text="Specific course this mock exam belongs to")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='examinations', null=True, blank=True)
    
    question_set = models.ForeignKey(QuestionSet, on_delete=models.SET_NULL, null=True, blank=True, related_name='examinations')
    questions = models.ManyToManyField(Question, through='ExaminationQuestion', related_name='examinations_set')
    
    instructions = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to='exams/thumbnails/', null=True, blank=True)
    
    # Configuration (can inherit from QuestionSet or override)
    total_questions = models.IntegerField(default=0)
    time_limit = models.IntegerField(default=60, help_text="Time limit in minutes")
    total_marks = models.FloatField(default=100)
    passing_marks = models.FloatField(default=0)
    marks_per_question = models.FloatField(default=1)
    negative_marking = models.BooleanField(default=False)
    negative_marking_value = models.FloatField(default=0.20)
    
    # Attempt Settings
    max_attempts = models.IntegerField(default=1, help_text="0 for Unlimited")
    allow_resume = models.BooleanField(default=True)
    auto_submit = models.BooleanField(default=True)
    
    RESULT_VISIBILITY = (
        ('immediate', 'Immediately'),
        ('after_end', 'After Exam Ends'),
        ('manual', 'After Manual Review'),
    )
    result_visibility = models.CharField(max_length=20, choices=RESULT_VISIBILITY, default='immediate')
    show_correct_answers = models.BooleanField(default=False)
    
    # Question Behavior
    randomize_questions = models.BooleanField(default=False)
    randomize_options = models.BooleanField(default=False)
    
    # Scheduling
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_examinations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Moderation Workflow
    reviewer_comment = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, related_name='reviewed_mock_exams', on_delete=models.SET_NULL, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

class ExaminationQuestion(models.Model):
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='examination_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)
    marks = models.FloatField(default=1)

    class Meta:
        unique_together = ('examination', 'question')
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.examination.title} - Q{self.question_id}"

class ExaminationEligibility(models.Model):
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='eligibility_rules')
    target_category = models.ForeignKey(ExamCategory, on_delete=models.CASCADE, null=True, blank=True)
    target_position = models.ForeignKey(Exam, on_delete=models.CASCADE, null=True, blank=True)
    is_global = models.BooleanField(default=False, help_text="If True, all students can access")
    
    def __str__(self):
        return f"Eligibility for {self.examination.title}"

class ExaminationAttempt(models.Model):
    STATUS_CHOICES = (
        ('in-progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('evaluated', 'Evaluated'),
    )
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='examination_attempts')
    
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in-progress')
    
    score = models.FloatField(default=0)
    percentage = models.FloatField(default=0)
    passed = models.BooleanField(default=False)
    time_taken_seconds = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.student.username} - {self.examination.title}"

class StudentAnswer(models.Model):
    attempt = models.ForeignKey(ExaminationAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, blank=True, null=True)
    answer_text = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    marks_awarded = models.FloatField(default=0)
    
    class Meta:
        unique_together = ('attempt', 'question')
        
    def __str__(self):
        return f"Answer to Q{self.question_id} by {self.attempt.student.username}"

class LegacyModelExamMigration(models.Model):
    """
    Mapping table to ensure idempotency when migrating ModelExam records 
    to the canonical Examination architecture.
    """
    legacy_model_exam = models.ForeignKey(ModelExam, on_delete=models.CASCADE, related_name='migrations')
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='legacy_migrations')
    migrated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('legacy_model_exam', 'examination')

