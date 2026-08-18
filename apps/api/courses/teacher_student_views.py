from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Avg, F, Q, Sum, Max, ExpressionWrapper, FloatField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
import csv
from django.http import HttpResponse

from core.models import User
from courses.models import Enrollment, TeacherCourseAssignment, TeacherStudentNote, TeacherMessage
from exams.models import ExaminationAttempt, PracticeSession, UserTopicProgress

from .teacher_student_serializers import (
    TeacherStudentListSerializer,
    TeacherStudentDetailSerializer,
    TeacherStudentNoteSerializer,
    TeacherMessageSerializer
)

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['teacher', 'admin', 'super-admin']

class TeacherStudentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsTeacher]
    
    def get_queryset(self):
        teacher = self.request.user
        # Find all courses taught by this teacher
        assigned_courses = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        # Find all active enrollments in those courses
        student_ids = Enrollment.objects.filter(course_id__in=assigned_courses, status='active').values_list('student_id', flat=True).distinct()
        
        # Base Queryset of distinct students
        qs = User.objects.filter(id__in=student_ids)
        return qs

    def list(self, request):
        qs = self.get_queryset()
        
        # Annotate with basic stats
        qs = qs.annotate(
            enrolled_courses=Count('enrollments', filter=Q(enrollments__status='active'), distinct=True),
            completed_courses=Count('enrollments', filter=Q(enrollments__status='completed'), distinct=True),
            average_score=Coalesce(Avg('examination_attempts__percentage', filter=Q(examination_attempts__status='submitted')), 0.0),
            last_active=Max('examination_attempts__started_at')
        )
        
        # Manual Python-side "status" calculation for list (At Risk, Active, Inactive)
        # In a real heavy app, this would be a complex SQL annotation
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        results = []
        for student in qs:
            data = TeacherStudentListSerializer(student).data
            
            # Simple status logic
            if student.last_active and student.last_active < thirty_days_ago:
                data['status'] = 'Inactive'
            elif data['average_score'] < 40 and data['average_score'] > 0:
                data['status'] = 'At Risk'
            else:
                data['status'] = 'Active'
                
            results.append(data)
            
        return Response(results)

    def retrieve(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        # Aggregate detailed stats
        exam_avg = ExaminationAttempt.objects.filter(student=student, status='submitted').aggregate(
            avg_score=Avg('percentage'),
            best_score=Max('percentage'),
            total_time=Sum('time_taken_seconds')
        )
        
        practice_avg = PracticeSession.objects.filter(user=student).aggregate(
            avg_accuracy=Avg('accuracy'),
            total_time=Sum('time_taken_seconds')
        )
        
        enrollments = Enrollment.objects.filter(student=student)
        
        student.enrolled_courses_count = enrollments.filter(status='active').count()
        student.completed_courses_count = enrollments.filter(status='completed').count()
        student.average_score = exam_avg['avg_score'] or 0.0
        student.best_score = exam_avg['best_score'] or 0.0
        student.practice_accuracy = practice_avg['avg_accuracy'] or 0.0
        student.total_study_time = (exam_avg['total_time'] or 0) + (practice_avg['total_time'] or 0)
        
        serializer = TeacherStudentDetailSerializer(student)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        # Time-series exam performance
        attempts = ExaminationAttempt.objects.filter(
            student=student, status='submitted'
        ).order_by('started_at').values('id', 'started_at', 'percentage', 'examination__title')
        
        timeline = [{
            'date': att['started_at'].strftime('%Y-%m-%d'),
            'score': att['percentage'],
            'exam': att['examination__title']
        } for att in attempts]
        
        return Response({
            'exam_timeline': timeline,
            'total_exams_taken': len(attempts),
        })

    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        assigned_courses = TeacherCourseAssignment.objects.filter(teacher=request.user).values_list('course_id', flat=True)
        
        # Only show courses that THIS teacher teaches
        enrollments = Enrollment.objects.filter(
            student=student, 
            course_id__in=assigned_courses
        ).select_related('course')
        
        course_data = []
        for en in enrollments:
            # Mock progress for now, would typically come from course module completion
            course_data.append({
                'id': en.course.id,
                'name': en.course.title,
                'status': en.status,
                'enrolled_at': en.enrolled_at,
                'progress': 100 if en.status == 'completed' else 45, # Mock 45%
                'thumbnail': en.course.thumbnail
            })
            
        return Response(course_data)

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        topic_progress = UserTopicProgress.objects.filter(user=student, status='completed').select_related('topic')
        
        topics = [{
            'id': tp.topic.id,
            'name': tp.topic.name,
            'accuracy': tp.accuracy or 0.0,
            'progress': tp.progress
        } for tp in topic_progress]
        
        topics.sort(key=lambda x: x['accuracy'], reverse=True)
        
        strong_topics = topics[:5]
        weak_topics = topics[-5:] if len(topics) > 5 else []
        weak_topics.reverse() # lowest first
        
        return Response({
            'strong_topics': strong_topics,
            'weak_topics': weak_topics
        })

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        activities = []
        
        # Fetch exams
        exams = ExaminationAttempt.objects.filter(student=student).order_by('-started_at')[:10]
        for ex in exams:
            activities.append({
                'type': 'exam',
                'title': f"Attempted {ex.examination.title}",
                'date': ex.started_at,
                'status': ex.status,
                'score': ex.percentage
            })
            
        # Fetch practice sessions
        practices = PracticeSession.objects.filter(user=student).order_by('-created_at')[:10]
        for p in practices:
            title = "Practice Session"
            if p.topic: title = f"Practiced {p.topic.name}"
            elif p.subject: title = f"Practiced {p.subject.name}"
            
            activities.append({
                'type': 'practice',
                'title': title,
                'date': p.created_at,
                'status': 'completed' if p.completed else 'in-progress',
                'score': p.accuracy
            })
            
        activities.sort(key=lambda x: x['date'], reverse=True)
        return Response(activities[:15])

    @action(detail=False, methods=['get'], url_path='at-risk')
    def at_risk(self, request):
        qs = self.get_queryset()
        
        qs = qs.annotate(
            average_score=Coalesce(Avg('examination_attempts__percentage', filter=Q(examination_attempts__status='submitted')), 0.0),
            last_active=Max('examination_attempts__started_at')
        )
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        at_risk = []
        for student in qs:
            reason = None
            if student.average_score < 40 and student.average_score > 0:
                reason = f"Low average score ({student.average_score}%)"
            elif student.last_active and student.last_active < thirty_days_ago:
                reason = "Inactive for over 30 days"
                
            if reason:
                data = TeacherStudentListSerializer(student).data
                data['risk_reason'] = reason
                at_risk.append(data)
                
        return Response(at_risk)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        if request.method == 'POST':
            serializer = TeacherStudentNoteSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(teacher=request.user, student=student)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        notes = TeacherStudentNote.objects.filter(teacher=request.user, student=student)
        serializer = TeacherStudentNoteSerializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        qs = self.get_queryset().annotate(
            enrolled_courses=Count('enrollments', filter=Q(enrollments__status='active'), distinct=True),
            average_score=Coalesce(Avg('examination_attempts__percentage', filter=Q(examination_attempts__status='submitted')), 0.0),
        )
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Email', 'Enrolled Courses', 'Average Score'])
        
        for student in qs:
            writer.writerow([
                student.id,
                f"{student.first_name} {student.last_name}",
                student.email,
                student.enrolled_courses,
                f"{student.average_score}%"
            ])
            
        return response

class TeacherMessageViewSet(viewsets.GenericViewSet):
    permission_classes = [IsTeacher]
    serializer_class = TeacherMessageSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Verify recipient is a student of this teacher
            recipient_id = request.data.get('recipient')
            assigned_courses = TeacherCourseAssignment.objects.filter(teacher=request.user).values_list('course_id', flat=True)
            is_student = Enrollment.objects.filter(student_id=recipient_id, course_id__in=assigned_courses, status='active').exists()
            
            if not is_student:
                return Response({"detail": "You can only message your enrolled students."}, status=status.HTTP_403_FORBIDDEN)
                
            serializer.save(sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
