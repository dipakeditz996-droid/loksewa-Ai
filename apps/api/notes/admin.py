from django.contrib import admin
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark

@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'exam', 'subject', 'topic', 'material_type', 'status', 'access_type', 'updated_at')
    list_filter = ('status', 'material_type', 'access_type', 'exam', 'subject')
    search_fields = ('title', 'description', 'content')
    prepopulated_fields = {'slug': ('title',)}
    autocomplete_fields = ('exam', 'subject', 'topic')

@admin.register(StudentMaterialProgress)
class StudentMaterialProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'material', 'progress', 'completed', 'last_viewed_at')
    list_filter = ('completed',)
    search_fields = ('student__username', 'material__title')

@admin.register(StudentMaterialBookmark)
class StudentMaterialBookmarkAdmin(admin.ModelAdmin):
    list_display = ('student', 'material', 'created_at')
    search_fields = ('student__username', 'material__title')
