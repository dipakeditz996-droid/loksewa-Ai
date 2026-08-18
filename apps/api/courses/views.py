from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from administration.permissions import IsTeacher
from .models import Course, TeacherCourseAssignment
from .serializers import CourseSerializer, TeacherCourseAssignmentSerializer
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Count
from exams.models import SubjectiveAnswer

class TeacherCourseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for teachers to view and manage their assigned courses.
    """
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    http_method_names = ['get', 'patch'] # Only allow read and partial update

    def get_queryset(self):
        # Return courses that are assigned to this teacher
        return Course.objects.filter(
            teachers__teacher=self.request.user
        ).select_related('exam').prefetch_related(
            'exam__legacy_subjects', # Using legacy_subjects based on exams.models.py
            'exam__papers',
            'exam__papers__subjects',
            'exam__papers__subjects__chapters',
            'exam__papers__subjects__chapters__topics'
        ).distinct()

    def update(self, request, *args, **kwargs):
        # We only want to allow partial updates (PATCH) to specific fields like description
        kwargs['partial'] = True
        
        # Restrict modifiable fields
        allowed_fields = ['description']
        
        # Use mutable data
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        for key in list(data.keys()):
            if key not in allowed_fields:
                data.pop(key, None)
                
        # create a new request with the restricted data
        request._full_data = data
                
        return super().update(request, *args, **kwargs)

class TeacherDashboardView(APIView):
    """
    API endpoint for the Teacher Dashboard Overview.
    Provides aggregate stats, courses, pending evaluations, and recent activity scoped to the teacher.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        user = request.user
        
        # 1. Assigned Courses & Total Students
        # Fetch the courses assigned to the teacher
        assigned_assignments = TeacherCourseAssignment.objects.filter(teacher=user).select_related('course')
        courses_data = []
        course_ids = []
        for assignment in assigned_assignments:
            course = assignment.course
            course_ids.append(course.id)
            
            # Simple student count per course
            student_count = course.enrollments.filter(status='active').count()
            
            courses_data.append({
                'id': course.id,
                'title': course.title,
                'thumbnail': course.thumbnail,
                'status': course.status,
                'student_count': student_count,
            })
            
        # Total distinct students across all teacher's active courses
        from .models import Enrollment
        total_students = Enrollment.objects.filter(
            course_id__in=course_ids, 
            status='active'
        ).values('student').distinct().count()

        # Content Counts
        from exams.models import Question, QuestionSet
        questions_count = Question.objects.filter(created_by=user).count()
        practice_sets_count = QuestionSet.objects.filter(created_by=user).exclude(status='archived').count()
        published_content = questions_count + practice_sets_count

        # 2. Pending Evaluations
        # Currently fetching all submitted answers as there's no strict scoping to teacher courses in the models yet.
        pending_answers = SubjectiveAnswer.objects.filter(status='submitted').select_related(
            'attempt__student', 'question__topic'
        ).order_by('-submitted_at')[:5]
        
        evaluations_data = []
        for ans in pending_answers:
            evaluations_data.append({
                'id': ans.id,
                'student_name': ans.attempt.student.get_full_name() or ans.attempt.student.username,
                'question_id': ans.question.question_id,
                'context': ans.question.topic.name if ans.question.topic else "General",
                'submitted_at': ans.submitted_at,
                'status': ans.status
            })
            
        total_pending = SubjectiveAnswer.objects.filter(status='submitted').count()
        total_completed = SubjectiveAnswer.objects.filter(status='evaluated').count()
        
        # 3. Recent Practice Sets
        recent_sets = QuestionSet.objects.filter(created_by=user).exclude(status='archived').order_by('-created_at')[:3]
        recent_practice_sets = []
        for pset in recent_sets:
            recent_practice_sets.append({
                'id': pset.id,
                'name': pset.name,
                'status': pset.status,
                'questions_count': pset.question_set_questions.count(),
                'created_at': pset.created_at
            })

        # 3. Recent Activity (Latest Enrollments)
        recent_enrollments = Enrollment.objects.filter(
            course_id__in=course_ids
        ).select_related('student', 'course').order_by('-enrolled_at')[:5]
        
        activity_data = []
        for en in recent_enrollments:
            activity_data.append({
                'id': f"en_{en.id}",
                'type': 'enrollment',
                'description': f"{en.student.get_full_name() or en.student.username} enrolled in {en.course.title}",
                'date': en.enrolled_at
            })

        return Response({
            'stats': {
                'total_students': total_students,
                'assigned_courses': len(courses_data),
                'pending_evaluations': total_pending,
                'completed_evaluations': total_completed,
                'published_content': published_content
            },
            'courses': courses_data,
            'pending_evaluations': evaluations_data,
            'recent_practice_sets': recent_practice_sets,
            'recent_activity': activity_data
        })
