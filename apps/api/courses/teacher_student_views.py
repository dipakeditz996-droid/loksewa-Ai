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
        
        course_id = request.query_params.get('course')
        if course_id:
            qs = qs.filter(enrollments__course_id=course_id, enrollments__status='active')
        
        # Annotate with basic stats
        qs = qs.annotate(
            enrolled_courses=Count('enrollments', filter=Q(enrollments__status='active'), distinct=True),
            completed_courses=Count('enrollments', filter=Q(enrollments__status='completed'), distinct=True),
            average_score=Coalesce(Avg('examination_attempts__percentage', filter=Q(examination_attempts__status='submitted')), 0.0),
            last_active=Max('examination_attempts__started_at'),
            practice_accuracy=Coalesce(Avg('practice_sessions__accuracy'), 0.0),
            mock_exam_performance=Coalesce(Avg('model_exam_attempts__score'), 0.0)
        )
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        
        results = []
        for student in qs:
            student.practice_accuracy = student.practice_accuracy
            student.mock_exam_performance = student.mock_exam_performance
            
            data = TeacherStudentListSerializer(student).data
            
            if student.last_active and student.last_active < thirty_days_ago:
                data['status'] = 'Inactive'
            elif data['average_score'] < 40 and data['average_score'] > 0:
                data['status'] = 'At Risk'
            else:
                data['status'] = 'Active'
                
            status_filter = request.query_params.get('status')
            if status_filter and status_filter.lower() != 'all':
                if data['status'].lower() != status_filter.lower():
                    continue
                    
            perf_filter = request.query_params.get('performance')
            if perf_filter and perf_filter.lower() != 'all':
                score = data['average_score']
                if perf_filter.lower() == 'excellent' and score < 80: continue
                if perf_filter.lower() == 'good' and (score < 60 or score >= 80): continue
                if perf_filter.lower() == 'average' and (score < 40 or score >= 60): continue
                if perf_filter.lower() == 'needs attention' and score >= 40: continue
                
            activity_filter = request.query_params.get('activity')
            if activity_filter and activity_filter.lower() != 'all':
                if activity_filter.lower() == 'active recently':
                    if not student.last_active or student.last_active < seven_days_ago: continue
                elif activity_filter.lower() == 'no activity':
                    if student.last_active: continue
                elif activity_filter.lower() == 'low activity':
                    if not student.last_active or student.last_active >= thirty_days_ago: continue
                    
            results.append(data)
            
        sort_by = request.query_params.get('sort', 'name')
        if sort_by == 'recent':
            results.sort(key=lambda x: x['last_active'] or '', reverse=True)
        elif sort_by == 'highest_perf':
            results.sort(key=lambda x: x['average_score'], reverse=True)
        elif sort_by == 'lowest_perf':
            results.sort(key=lambda x: x['average_score'])
        else:
            results.sort(key=lambda x: f"{x['first_name']} {x['last_name']}")
            
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
        
        # Bulk fetch student's completed topic IDs to optimize progress calculation
        completed_topic_ids = set(
            UserTopicProgress.objects.filter(user=student, status='completed').values_list('topic_id', flat=True)
        )
        
        course_data = []
        for en in enrollments:
            # Calculate actual progress
            total_topics = 0
            completed_in_course = 0
            if en.course.exam:
                from exams.models import Topic
                # Try getting topics for the exam through papers/subjects/chapters
                try:
                    topic_ids = set(Topic.objects.filter(
                        chapter__subject__paper__exam=en.course.exam
                    ).values_list('id', flat=True))
                    
                    if not topic_ids:
                        # Fallback for flat hierarchy without papers
                        topic_ids = set(Topic.objects.filter(
                            chapter__subject__exam=en.course.exam
                        ).values_list('id', flat=True))
                    
                    total_topics = len(topic_ids)
                    completed_in_course = len(topic_ids.intersection(completed_topic_ids))
                except Exception:
                    pass

            progress_percentage = 0
            if total_topics > 0:
                progress_percentage = min(100, int((completed_in_course / total_topics) * 100))
            elif en.status == 'completed':
                progress_percentage = 100
                
            course_data.append({
                'id': en.course.id,
                'name': en.course.title,
                'status': en.status,
                'enrolled_at': en.enrolled_at,
                'progress': progress_percentage,
                'thumbnail': en.course.thumbnail.url if en.course.thumbnail else None
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

    @action(detail=True, methods=['get', 'post', 'patch', 'delete'])
    def notes(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        if request.method == 'POST':
            serializer = TeacherStudentNoteSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(teacher=request.user, student=student)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        elif request.method == 'PATCH':
            note_id = request.data.get('note_id')
            note = get_object_or_404(TeacherStudentNote, id=note_id, teacher=request.user, student=student)
            serializer = TeacherStudentNoteSerializer(note, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        elif request.method == 'DELETE':
            note_id = request.query_params.get('note_id')
            if not note_id:
                note_id = request.data.get('note_id')
            if not note_id:
                return Response({"detail": "note_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            note = get_object_or_404(TeacherStudentNote, id=note_id, teacher=request.user, student=student)
            note.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        notes = TeacherStudentNote.objects.filter(teacher=request.user, student=student)
        serializer = TeacherStudentNoteSerializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        student = get_object_or_404(self.get_queryset(), pk=pk)
        
        exams = ExaminationAttempt.objects.filter(student=student).order_by('-started_at')
        exam_data = [{
            'id': f"exam_{ex.id}",
            'type': 'exam',
            'title': ex.examination.title,
            'started_at': ex.started_at,
            'submitted_at': ex.submitted_at,
            'status': ex.status,
            'score': ex.percentage,
            'time_taken': ex.time_taken_seconds
        } for ex in exams]
        
        practices = PracticeSession.objects.filter(user=student).order_by('-created_at')
        practice_data = [{
            'id': f"prac_{p.id}",
            'type': 'practice',
            'title': f"Practiced {p.topic.name}" if p.topic else (f"Practiced {p.subject.name}" if p.subject else "Practice Session"),
            'started_at': p.created_at,
            'submitted_at': p.created_at,
            'status': 'completed' if p.completed else 'in-progress',
            'score': p.accuracy,
            'time_taken': p.time_taken_seconds
        } for p in practices]
        
        return Response({
            'mock_exams': exam_data,
            'practice': practice_data,
            'all_attempts': sorted(exam_data + practice_data, key=lambda x: x['started_at'], reverse=True)
        })

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
