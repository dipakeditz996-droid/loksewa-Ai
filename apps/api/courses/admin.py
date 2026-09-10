from django.contrib import admin
from .models import Course, Enrollment, CourseApplication, TeacherCourseAssignment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'is_open_for_enrollment', 'featured', 'exam', 'duration_months', 'created_at')
    list_filter = ('status', 'is_open_for_enrollment', 'featured', 'exam__category')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    actions = ['mark_coming_soon', 'mark_published', 'mark_archived']

    def mark_coming_soon(self, request, queryset):
        queryset.update(status='coming_soon', is_open_for_enrollment=False)
        self.message_user(request, f"Marked {queryset.count()} course(s) as Coming Soon.")
    mark_coming_soon.short_description = "Mark selected as Coming Soon"

    def mark_published(self, request, queryset):
        queryset.update(status='published')
        self.message_user(request, f"Published {queryset.count()} course(s).")
    mark_published.short_description = "Publish selected courses"

    def mark_archived(self, request, queryset):
        queryset.update(status='archived', is_open_for_enrollment=False)
        self.message_user(request, f"Archived {queryset.count()} course(s).")
    mark_archived.short_description = "Archive selected courses"


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status', 'enrolled_at', 'expires_at')
    list_filter = ('status',)
    search_fields = ('student__username', 'student__email', 'course__title')
    raw_id_fields = ('student', 'course')


@admin.register(CourseApplication)
class CourseApplicationAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status', 'applied_at', 'reviewed_at', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('student__username', 'student__email', 'course__title')
    raw_id_fields = ('student', 'course', 'subscription_payment', 'reviewed_by')
    readonly_fields = ('applied_at',)

    actions = ['approve_applications', 'reject_applications']

    def approve_applications(self, request, queryset):
        from django.utils import timezone
        queryset.filter(status='pending').update(
            status='approved',
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(request, f"Approved {queryset.count()} application(s).")
    approve_applications.short_description = "Approve selected applications"

    def reject_applications(self, request, queryset):
        from django.utils import timezone
        queryset.filter(status='pending').update(
            status='rejected',
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(request, f"Rejected {queryset.count()} application(s).")
    reject_applications.short_description = "Reject selected applications"


@admin.register(TeacherCourseAssignment)
class TeacherCourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'course', 'assigned_at')
    search_fields = ('teacher__username', 'course__title')
    raw_id_fields = ('teacher', 'course')
