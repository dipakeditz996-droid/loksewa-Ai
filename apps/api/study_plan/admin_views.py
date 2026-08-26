from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import datetime
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import StudyPlanTemplate, StudyPlanTemplateTask, StudyPlan
from courses.models import Course, Enrollment
from administration.permissions import IsAdminUser
from .admin_serializers import AdminStudyPlanTemplateSerializer

class AdminStudyPlanTemplateViewSet(viewsets.ModelViewSet):
    queryset = StudyPlanTemplate.objects.all().order_by('-created_at')
    serializer_class = AdminStudyPlanTemplateSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    filterset_fields = ['course', 'is_active', 'exam']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.instances.exists():
            return Response(
                {"detail": "Cannot delete template because it is currently assigned to students."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        template = self.get_object()
        template.is_active = True
        template.save()
        return Response({'status': 'activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        template = self.get_object()
        template.is_active = False
        template.save()
        return Response({'status': 'deactivated'})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def duplicate(self, request, pk=None):
        template = self.get_object()
        new_template = StudyPlanTemplate.objects.create(
            name=f"{template.name} - Copy",
            description=template.description,
            duration_days=template.duration_days,
            course=template.course,
            exam=template.exam,
            is_active=False
        )
        
        tasks_to_create = []
        for task in template.tasks.all():
            tasks_to_create.append(
                StudyPlanTemplateTask(
                    template=new_template,
                    day_number=task.day_number,
                    title=task.title,
                    task_type=task.task_type,
                    subject=task.subject,
                    topic=task.topic,
                    duration_minutes=task.duration_minutes
                )
            )
        StudyPlanTemplateTask.objects.bulk_create(tasks_to_create)
        
        return Response(
            {'status': 'duplicated', 'id': new_template.id}, 
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        template = self.get_object()
        course_id = request.data.get('course_id')
        
        if not template.is_active:
            return Response(
                {'error': 'Cannot assign an inactive template'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not course_id:
            return Response({'error': 'course_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if template.course and template.course != course:
            return Response(
                {'error': 'Template is restricted to another course'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get active enrollments
        enrollments = Enrollment.objects.filter(course=course, status='ACTIVE').select_related('student')
        
        assigned_count = 0
        from .services import generate_study_plan_tasks
        
        for enrollment in enrollments:
            student = enrollment.student
            # Skip if student already has an active study plan for this exam
            if StudyPlan.objects.filter(student=student, exam=template.exam).exists():
                continue
            
            target_date = timezone.now().date() + datetime.timedelta(days=template.duration_days)
            plan = StudyPlan.objects.create(
                student=student,
                exam=template.exam,
                template=template,
                target_date=target_date,
                daily_minutes=120, # Default minutes
                study_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            )
            generate_study_plan_tasks(plan, regenerate_future=False)
            assigned_count += 1
            
        return Response({'status': 'assigned', 'count': assigned_count})
