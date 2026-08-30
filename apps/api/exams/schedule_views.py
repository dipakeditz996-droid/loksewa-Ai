from rest_framework import viewsets, filters, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from administration.permissions import IsAdminUser
from core.notification_service import NotificationService
from .models import ExamSchedule, Examination
from .schedule_serializers import (
    AdminExamScheduleSerializer,
    StudentExamScheduleSerializer,
    StudentUpcomingMockExamSerializer
)

class AdminExamScheduleViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Admins to manage Official Loksewa PSC exam schedules.
    """
    queryset = ExamSchedule.objects.select_related('exam_category', 'exam').all().order_by('-is_active', 'exam_date', 'exam_time', '-created_at')
    serializer_class = AdminExamScheduleSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description', 'exam_category__name', 'exam__name']
    filterset_fields = ['is_published', 'is_active', 'exam_category', 'exam']

    def perform_create(self, serializer):
        schedule = serializer.save()
        if schedule.is_published:
            NotificationService.notify_admins_schedule_change(schedule, event_type="created")

    def perform_update(self, serializer):
        schedule = serializer.save()
        NotificationService.notify_admins_schedule_change(schedule, event_type="updated")

    @action(detail=True, methods=['post'], url_path='set-active')
    def set_active(self, request, pk=None):
        """Set this schedule as the single active Next Loksewa Exam."""
        schedule = self.get_object()
        if schedule.exam_date < timezone.now().date():
            return Response(
                {"detail": "Cannot set a past exam schedule as the active upcoming exam."},
                status=status.HTTP_400_BAD_REQUEST
            )
        schedule.is_active = True
        schedule.save()
        NotificationService.notify_admins_schedule_change(schedule, event_type="activated as Next Exam")
        return Response(AdminExamScheduleSerializer(schedule).data)

    @action(detail=True, methods=['post'], url_path='toggle-publish')
    def toggle_publish(self, request, pk=None):
        """Toggle publish/unpublish status."""
        schedule = self.get_object()
        schedule.is_published = not schedule.is_published
        schedule.save()
        event_type = "published" if schedule.is_published else "unpublished"
        NotificationService.notify_admins_schedule_change(schedule, event_type=event_type)
        return Response(AdminExamScheduleSerializer(schedule).data)


class StudentExamScheduleNextView(APIView):
    """
    Read-only public/student endpoint that returns the single authoritative
    Next Official Loksewa Exam schedule.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        # Find active published schedule on or after today
        schedule = ExamSchedule.objects.filter(
            is_active=True,
            is_published=True,
            exam_date__gte=today
        ).select_related('exam_category', 'exam').first()

        # Fallback: if no active one, get the earliest future published schedule
        if not schedule:
            schedule = ExamSchedule.objects.filter(
                is_published=True,
                exam_date__gte=today
            ).select_related('exam_category', 'exam').order_by('exam_date', 'exam_time').first()

        if not schedule:
            return Response({
                "schedule": None,
                "message": "No upcoming Loksewa exam scheduled.",
                "server_time": timezone.now().isoformat()
            })

        serializer = StudentExamScheduleSerializer(schedule)
        return Response({
            "schedule": serializer.data,
            "server_time": timezone.now().isoformat()
        })


class StudentUpcomingMockExamView(APIView):
    """
    Read-only endpoint returning the next upcoming or live Mock Exam
    eligible for the requesting student.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        user = request.user if request.user.is_authenticated else None

        # Filter by enrollment if authenticated
        active_courses = []
        if user:
            from courses.models import Enrollment
            active_courses = list(Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True))

        base_qs = Examination.objects.filter(status__in=['published', 'live'])
        if user:
            base_qs = base_qs.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))
            base_qs = base_qs.filter(Q(exam_type='custom', created_by=user) | ~Q(exam_type='custom'))
        else:
            # Public only sees global non-custom exams
            base_qs = base_qs.filter(course__isnull=True, exam_type__in=['mock', 'full', 'position'])

        # Find live exams first (where end_time is future or None)
        live_exam = base_qs.filter(
            Q(start_time__lte=now) | Q(start_time__isnull=True),
            Q(end_time__gt=now) | Q(end_time__isnull=True)
        ).select_related('category', 'exam').order_by('-start_time').first()

        if live_exam:
            serializer = StudentUpcomingMockExamSerializer(live_exam, context={'request': request})
            return Response({
                "mock_exam": serializer.data,
                "status": "LIVE",
                "server_time": now.isoformat()
            })

        # Otherwise find next upcoming exam
        upcoming_exam = base_qs.filter(
            start_time__gt=now
        ).select_related('category', 'exam').order_by('start_time').first()

        if upcoming_exam:
            serializer = StudentUpcomingMockExamSerializer(upcoming_exam, context={'request': request})
            return Response({
                "mock_exam": serializer.data,
                "status": "UPCOMING",
                "server_time": now.isoformat()
            })

        return Response({
            "mock_exam": None,
            "status": "NONE",
            "message": "No upcoming mock examinations scheduled.",
            "server_time": now.isoformat()
        })
