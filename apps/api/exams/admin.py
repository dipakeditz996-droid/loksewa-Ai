from django.contrib import admin
from .models import Exam, Subject, Chapter, Topic, Question, PracticeSession, QuestionAttempt, UserTopicProgress

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'order']
    list_filter = ['category', 'is_active']
    search_fields = ['name']

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'paper']
    list_filter = ['paper__exam', 'paper']
    search_fields = ['name', 'code']

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['name', 'chapter', 'is_active']
    list_filter = ['is_active', 'chapter__subject']
    search_fields = ['name']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_id', 'topic', 'question_type', 'difficulty', 'status']
    list_filter = ['difficulty', 'topic__chapter__subject']
    search_fields = ['text', 'question_id']
    autocomplete_fields = ['topic']

@admin.register(PracticeSession)
class PracticeSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'exam', 'mode', 'score', 'completed']
    list_filter = ['mode', 'completed']
    search_fields = ['user__username']

@admin.register(QuestionAttempt)
class QuestionAttemptAdmin(admin.ModelAdmin):
    list_display = ['session', 'question', 'is_correct', 'time_taken_seconds']
    list_filter = ['is_correct']

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'is_active']
    list_filter = ['is_active', 'subject']
    search_fields = ['title']

@admin.register(UserTopicProgress)
class UserTopicProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'topic', 'status', 'progress', 'accuracy', 'last_updated']
    list_filter = ['status', 'topic__chapter__subject']
