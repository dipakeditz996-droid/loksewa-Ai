from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
import datetime
from django.db.models import Count, Q

from .models import StudyPlan, StudyTask, StudyPlanTemplate
from .serializers import StudyPlanSerializer, StudyTaskSerializer, StudyPlanTemplateSerializer
from courses.models import Enrollment
from exams.models import UserTopicProgress
from gamification.models import GamificationProfile, Motivation
from .services import generate_study_plan_tasks

class StudyPlanTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudyPlanTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return StudyPlanTemplate.objects.filter(is_active=True)

def _study_plans_enabled():
    from core.models import AdminSettings
    return AdminSettings.get_settings().enable_study_plans


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # A student should only access their own plan
        return StudyPlan.objects.filter(student=self.request.user)

    def _verify_and_reward_template(self, template):
        pass

    def perform_create(self, serializer):
        if not _study_plans_enabled():
            raise PermissionDenied("Study plans are currently disabled by the administrator.")
        plan = serializer.save(student=self.request.user)
        # Generate initial tasks
        generate_study_plan_tasks(plan, regenerate_future=False)

        from core.notification_service import NotificationService
        NotificationService.notify_study_plan_created(plan)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        if not _study_plans_enabled():
            raise PermissionDenied("Study plans are currently disabled by the administrator.")
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

        # Motivation Message
        motivation_msg = None
        try:
            from gamification.models import Motivation
            motivation = Motivation.objects.filter(is_active=True).order_by('?').first()
            if motivation:
                motivation_msg = motivation.message
        except Exception:
            pass

        return Response({
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "weekly_tasks": weekly_tasks,
            "weekly_completed": weekly_completed,
            "motivation": motivation_msg,
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

        # ── Update study streak in GamificationProfile ──
        try:
            from gamification.models import GamificationProfile
            profile, _ = GamificationProfile.objects.get_or_create(user=request.user)
            today = timezone.now().date()
            yesterday = today - datetime.timedelta(days=1)

            if profile.last_study_date == today:
                pass  # Already recorded today, streak unchanged
            elif profile.last_study_date == yesterday:
                profile.study_current_streak += 1
            else:
                profile.study_current_streak = 1  # Reset — gap in study

            if profile.study_current_streak > profile.study_highest_streak:
                profile.study_highest_streak = profile.study_current_streak

            profile.last_study_date = today
            profile.save(update_fields=[
                'study_current_streak', 'study_highest_streak', 'last_study_date'
            ])

            from core.notification_service import NotificationService
            NotificationService.notify_streak_milestone(request.user, profile.study_current_streak)
        except Exception:
            pass  # Don't fail the completion just because streak update errored

        return Response({"status": "Task marked as completed."})


    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        task = self.get_object()
        task.status = 'SKIPPED'
        task.save()
        return Response({"status": "Task marked as skipped."})


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Course Progress (Enrollments)
        enrollments = Enrollment.objects.filter(student=user, status='active').select_related('course')
        courses_data = []
        for en in enrollments:
            courses_data.append({
                "id": en.course.id,
                "title": en.course.title,
                "slug": en.course.slug,
                "duration_months": en.course.duration_months
            })
            
        # 2. Topic Progress (Top 5 active)
        topic_progress_qs = UserTopicProgress.objects.filter(user=user).select_related('topic').order_by('-last_updated')[:5]
        topics_data = []
        for tp in topic_progress_qs:
            topics_data.append({
                "topic_id": tp.topic.id,
                "title": tp.topic.title,
                "status": tp.status,
                "progress": tp.progress,
                "accuracy": tp.accuracy
            })
            
        # 3. Study Plan & Today's Tasks
        plan = StudyPlan.objects.filter(student=user).first()
        today_tasks_data = []
        progress_data = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "weekly_tasks": 0,
            "weekly_completed": 0,
            "overall_percentage": 0
        }
        
        if plan:
            today = timezone.now().date()
            tasks_qs = StudyTask.objects.filter(study_plan=plan)
            
            # Progress
            progress_data["total_tasks"] = tasks_qs.count()
            progress_data["completed_tasks"] = tasks_qs.filter(status='COMPLETED').count()
            if progress_data["total_tasks"] > 0:
                progress_data["overall_percentage"] = int((progress_data["completed_tasks"] / progress_data["total_tasks"]) * 100)
                
            start_of_week = today - datetime.timedelta(days=today.weekday())
            end_of_week = start_of_week + datetime.timedelta(days=6)
            weekly_qs = tasks_qs.filter(date__gte=start_of_week, date__lte=end_of_week)
            progress_data["weekly_tasks"] = weekly_qs.count()
            progress_data["weekly_completed"] = weekly_qs.filter(status='COMPLETED').count()
            
            # Today Tasks
            today_tasks = tasks_qs.filter(date=today)
            upcoming_tasks = tasks_qs.filter(date__gt=today, date__lte=end_of_week + datetime.timedelta(days=7))
            from .serializers import StudyTaskSerializer
            today_tasks_data = StudyTaskSerializer(today_tasks, many=True).data
            upcoming_tasks_data = StudyTaskSerializer(upcoming_tasks, many=True).data
            
        # 4. Streak
        streak = 0
        try:
            profile = GamificationProfile.objects.get(user=user)
            streak = profile.study_current_streak
        except GamificationProfile.DoesNotExist:
            pass
            
        # 5. Motivation
        motivation_msg = "Small progress every day becomes a huge advantage on exam day."
        try:
            motivations = list(Motivation.objects.filter(is_active=True).order_by('id'))
            if motivations:
                index = timezone.now().date().toordinal() % len(motivations)
                motivation_msg = motivations[index].message
                
            if streak >= 7:
                motivation_msg = f"🔥 {streak} days in a row! Protect the streak and keep moving."
        except Exception:
            pass
            
        # 6. Continue Learning
        continue_learning = None
        last_topic = UserTopicProgress.objects.filter(user=user, status='in-progress').order_by('-last_updated').first()
        if last_topic:
            continue_learning = {
                "type": "topic",
                "id": last_topic.topic.id,
                "title": f"Continue Topic: {last_topic.topic.title}",
                "url": f"/student/practice?topic={last_topic.topic.id}"
            }
        elif plan:
            next_task = StudyTask.objects.filter(study_plan=plan, status='PENDING', date__lte=timezone.now().date()).order_by('date').first()
            if next_task:
                continue_learning = {
                    "type": "task",
                    "id": next_task.id,
                    "title": f"Next Task: {next_task.title}",
                    "url": "/student/study-plan"
                }

        return Response({
            "has_plan": plan is not None,
            "plan_details": {
                "target_exam": plan.exam.name if plan and plan.exam else None,
                "target_date": plan.target_date if plan else None
            } if plan else None,
            "courses": courses_data,
            "topic_progress": topics_data,
            "today_tasks": today_tasks_data,
            "upcoming_tasks": upcoming_tasks_data if plan else [],
            "progress": progress_data,
            "streak": streak,
            "motivation": motivation_msg,
            "continue_learning": continue_learning
        })
