from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import datetime
from django.db.models import Count, Q

from .models import StudyPlan, StudyTask
from .serializers import StudyPlanSerializer, StudyTaskSerializer
from .services import generate_study_plan_tasks

class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # A student should only access their own plan
        return StudyPlan.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        plan = serializer.save(student=self.request.user)
        # Generate initial tasks
        generate_study_plan_tasks(plan, regenerate_future=False)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        plan = self.get_object()
        generate_study_plan_tasks(plan, regenerate_future=True)
        return Response({"status": "Tasks regenerated successfully."})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        plan = self.get_object()
        plan.is_paused = True
        plan.save()
        return Response({"status": "Plan paused."})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        plan = self.get_object()
        plan.is_paused = False
        plan.save()
        # Generate tasks again to fill any gaps while paused
        generate_study_plan_tasks(plan, regenerate_future=False)
        return Response({"status": "Plan resumed."})

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        plan = self.get_object()
        
        # Total tasks completion
        total_tasks = StudyTask.objects.filter(study_plan=plan).count()
        completed_tasks = StudyTask.objects.filter(study_plan=plan, status='COMPLETED').count()
        
        # Weekly completion
        today = timezone.now().date()
        start_of_week = today - datetime.timedelta(days=today.weekday()) # Monday
        end_of_week = start_of_week + datetime.timedelta(days=6) # Sunday
        
        weekly_tasks = StudyTask.objects.filter(
            study_plan=plan, 
            date__gte=start_of_week, 
            date__lte=end_of_week
        ).count()
        
        weekly_completed = StudyTask.objects.filter(
            study_plan=plan, 
            date__gte=start_of_week, 
            date__lte=end_of_week,
            status='COMPLETED'
        ).count()

        # Subject progress (mock implementation for syllabus progress)
        # Real implementation would calculate based on Topic completion
        
        return Response({
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "weekly_tasks": weekly_tasks,
            "weekly_completed": weekly_completed,
        })


class StudyTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StudyTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyTask.objects.filter(study_plan__student=self.request.user)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        tasks = self.get_queryset().filter(date=today)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = timezone.now().date()
        end_date = today + datetime.timedelta(days=7)
        tasks = self.get_queryset().filter(date__gt=today, date__lte=end_date)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = 'COMPLETED'
        task.completed_at = timezone.now()
        task.save()
        return Response({"status": "Task marked as completed."})

    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        task = self.get_object()
        task.status = 'SKIPPED'
        task.save()
        return Response({"status": "Task marked as skipped."})
