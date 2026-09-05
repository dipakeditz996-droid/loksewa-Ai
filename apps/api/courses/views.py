from rest_framework import viewsets, permissions, status as drf_status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Count
from django.utils import timezone
from administration.permissions import IsTeacher
from .models import Course, TeacherCourseAssignment, Enrollment, CourseApplication
from .serializers import CourseSerializer, TeacherCourseAssignmentSerializer
from exams.models import SubjectiveAnswer
from subscriptions.permissions import HasActiveSubscription

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

        from analytics.services.teacher_analytics_service import TeacherAnalyticsService
        performance_by_course = {
            row['id']: row for row in TeacherAnalyticsService.get_course_performance(user)
        }

        courses_data = []
        course_ids = []
        for assignment in assigned_assignments:
            course = assignment.course
            course_ids.append(course.id)

            # Simple student count per course
            student_count = course.enrollments.filter(status='active').count()

            thumbnail_url = None
            if course.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(course.thumbnail.url)
                except Exception:
                    pass

            perf = performance_by_course.get(course.id)
            courses_data.append({
                'id': course.id,
                'title': course.title,
                'thumbnail': thumbnail_url,
                'status': course.status,
                'student_count': student_count,
                'completion_percentage': perf['completion'] if perf else 0,
                'average_score': perf['average_score'] if perf else 0,
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
        # Scoped to students enrolled in this teacher's own assigned courses -
        # same TeacherCourseAssignment -> Enrollment pattern used by
        # TeacherStudentViewSet, so one teacher's dashboard doesn't surface
        # (or let them evaluate) another teacher's students' submissions.
        teacher_student_ids = Enrollment.objects.filter(
            course_id__in=course_ids, status='active'
        ).values_list('student_id', flat=True)
        scoped_answers = SubjectiveAnswer.objects.filter(attempt__student_id__in=teacher_student_ids)

        pending_answers = scoped_answers.filter(status='submitted').select_related(
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

        total_pending = scoped_answers.filter(status='submitted').count()
        total_completed = scoped_answers.filter(status='evaluated').count()
        
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


# ============================================================
# PUBLIC COURSE LISTING
# ============================================================

class PublicCourseListView(APIView):
    """
    GET /api/courses/public/
    Returns all published courses that are open for enrollment.
    No authentication required — used on public website and registration form.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q

        courses = Course.objects.filter(
            status='published',
            is_open_for_enrollment=True,
        ).select_related('exam').annotate(
            enrolled_count=Count('enrollments', filter=Q(enrollments__status='active'))
        ).order_by('-featured', 'title')

        # Optional personalization: ?exam=<id> filters to courses for that
        # exact Exam (e.g. a student's registration preference - PSC 5th
        # Level Computer). This is filtering only, never auto-enrollment.
        exam_id = request.query_params.get('exam')
        if exam_id:
            courses = courses.filter(exam_id=exam_id)

        data = []
        for c in courses:
            # Count subjects in the linked exam
            subject_count = 0
            if c.exam:
                try:
                    # Try the paper-based structure first
                    from exams.models import Subject
                    subject_count = Subject.objects.filter(
                        paper__exam=c.exam
                    ).distinct().count()
                    if subject_count == 0:
                        # Fall back to legacy subjects
                        subject_count = c.exam.legacy_subjects.count()
                except Exception:
                    pass

            # Get associated plans
            plans = list(c.subscription_plans.filter(status='ACTIVE').values(
                'id', 'name', 'price', 'original_price', 'discount',
                'duration', 'duration_unit', 'badge', 'features'
            ).order_by('price'))

            thumbnail_url = None
            if c.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(c.thumbnail.url)
                except Exception:
                    pass

            data.append({
                'id': c.id,
                'title': c.title,
                'slug': c.slug,
                'short_description': c.short_description,
                'description': c.description,
                'thumbnail': thumbnail_url,
                'duration_months': c.duration_months,
                'subject_count': subject_count,
                'enrolled_count': c.enrolled_count,
                # Exam is the position/level model (core.models.Exam), which has
                # `name`, not `title` - fixes an AttributeError that fired for
                # any course with an exam linked.
                'exam': {'id': c.exam.id, 'title': c.exam.name} if c.exam else None,
                'featured': c.featured,
                'starting_price': plans[0]['price'] if plans else None,
                'plans': plans,
            })

        return Response(data)


# ============================================================
# STUDENT ENROLLMENT STATUS
# ============================================================

class StudentEnrollmentView(APIView):
    """
    GET /api/courses/my-enrollment/
    Returns the authenticated student's enrollment status, application, and payment.
    Allows the frontend to clearly distinguish:
      - No application (show CTA)
      - Application pending (show payment instructions)
      - Application approved / active enrollment (show active course)
      - Application rejected
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Most recent active enrollment
        enrollment = Enrollment.objects.filter(
            student=user, status='active'
        ).select_related('course', 'course__exam').first()

        # Most recent application (any status)
        application = CourseApplication.objects.filter(
            student=user
        ).select_related('course', 'subscription_payment').first()

        # Most recent subscription payment
        from subscriptions.models import SubscriptionPayment, Subscription
        payment = SubscriptionPayment.objects.filter(
            student=user
        ).select_related('plan').order_by('-submitted_at').first()

        # Active subscription
        active_sub = Subscription.objects.filter(
            student=user, status='ACTIVE'
        ).select_related('plan').first()

        enrollment_data = None
        if enrollment:
            enrollment_data = {
                'id': enrollment.id,
                'status': enrollment.status,
                'enrolled_at': enrollment.enrolled_at,
                'expires_at': enrollment.expires_at,
                'course': {
                    'id': enrollment.course.id,
                    'title': enrollment.course.title,
                    'slug': enrollment.course.slug,
                    'short_description': enrollment.course.short_description,
                    'exam': {
                        'id': enrollment.course.exam.id,
                        'title': enrollment.course.exam.title,
                    } if enrollment.course.exam else None,
                }
            }

        application_data = None
        if application:
            application_data = {
                'id': application.id,
                'status': application.status,
                'applied_at': application.applied_at,
                'reviewed_at': application.reviewed_at,
                'note': application.note,
                'course': {
                    'id': application.course.id,
                    'title': application.course.title,
                }
            }

        payment_data = None
        if payment:
            payment_data = {
                'id': payment.id,
                'status': payment.status,
                'plan_name': payment.plan.name,
                'amount': str(payment.amount),
                'submitted_at': payment.submitted_at,
                'rejection_reason': payment.rejection_reason if payment.status == 'REJECTED' else None,
            }

        sub_data = None
        if active_sub:
            sub_data = {
                'id': active_sub.id,
                'plan_name': active_sub.plan.name,
                'status': active_sub.status,
                'expiry_date': active_sub.expiry_date,
            }

        return Response({
            'has_active_enrollment': enrollment is not None,
            'enrollment': enrollment_data,
            'application': application_data,
            'payment': payment_data,
            'subscription': sub_data,
        })


class MyCoursesListView(APIView):
    """
    GET /api/courses/my-courses/
    Returns a list of all active courses the student is enrolled in, 
    including calculated real progress based on UserTopicProgress.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        user = request.user
        enrollments = Enrollment.objects.filter(
            student=user, status='active'
        ).select_related('course', 'course__exam')

        from exams.models import UserTopicProgress
        # Bulk fetch all user's topic progress to avoid N+1
        all_progress = UserTopicProgress.objects.filter(user=user, status='completed').values_list('topic_id', flat=True)
        completed_topic_ids = set(all_progress)

        data = []
        for en in enrollments:
            course = en.course
            thumbnail_url = None
            if course.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(course.thumbnail.url)
                except Exception:
                    pass

            # Calculate progress
            # Get all topics for the course's exam hierarchy
            total_topics = 0
            completed_in_course = 0
            if course.exam:
                from exams.models import Topic
                topics = Topic.objects.filter(chapter__subject__paper__exam=course.exam)
                total_topics = topics.count()
                topic_ids = set(topics.values_list('id', flat=True))
                completed_in_course = len(topic_ids.intersection(completed_topic_ids))

            progress_percentage = 0
            if total_topics > 0:
                progress_percentage = int((completed_in_course / total_topics) * 100)

            data.append({
                'enrollment_id': en.id,
                'enrolled_at': en.enrolled_at,
                'expires_at': en.expires_at,
                'course': {
                    'id': course.id,
                    'title': course.title,
                    'slug': course.slug,
                    'short_description': course.short_description,
                    'thumbnail': thumbnail_url,
                    'exam': {'id': course.exam.id, 'title': course.exam.title} if course.exam else None,
                },
                'progress': {
                    'total_topics': total_topics,
                    'completed_topics': completed_in_course,
                    'percentage': progress_percentage
                }
            })

        # Add course from active subscription if not already included
        from subscriptions.models import Subscription
        active_sub = Subscription.objects.filter(student=user, status='ACTIVE').first()
        if active_sub and active_sub.plan:
            # Check if this course is already in data
            enrolled_course_ids = [item['course']['id'] for item in data]
            
            # The subscription plan acts as a course wrapper for analytics/display
            # We map the plan to a dummy course object for display purposes
            if active_sub.plan.id not in enrolled_course_ids:
                data.append({
                    'enrollment_id': -active_sub.id,
                    'enrolled_at': active_sub.created_at,
                    'expires_at': active_sub.expiry_date,
                    'course': {
                        'id': active_sub.plan.id,
                        'title': active_sub.plan.name,
                        'slug': f"plan-{active_sub.plan.id}",
                        'short_description': active_sub.plan.description or "Your active subscription plan",
                        'thumbnail': None,
                        'exam': None,
                    },
                    'progress': {
                        'total_topics': 0,
                        'completed_topics': 0,
                        'percentage': 0
                    }
                })

        return Response(data)


class CourseDetailView(APIView):
    """
    GET /api/courses/<id>/
    Returns detailed information about a course. 
    If the user is enrolled, it also returns protected metadata (e.g., number of available practice sets).
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            course = Course.objects.select_related('exam').get(id=pk, status='published')
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        thumbnail_url = None
        if course.thumbnail:
            try:
                thumbnail_url = request.build_absolute_uri(course.thumbnail.url)
            except Exception:
                pass

        # Basic public data
        data = {
            'id': course.id,
            'title': course.title,
            'slug': course.slug,
            'short_description': course.short_description,
            'description': course.description,
            'thumbnail': thumbnail_url,
            'duration_months': course.duration_months,
            'is_open_for_enrollment': course.is_open_for_enrollment,
            'exam': {'id': course.exam.id, 'title': course.exam.title} if course.exam else None,
        }
        
        # Include the curriculum (subjects/chapters/topics)
        if course.exam:
            from exams.models import Subject
            from exams.serializers import SubjectSerializer
            subjects = Subject.objects.filter(paper__exam=course.exam, is_active=True)
            data['subjects'] = SubjectSerializer(subjects, many=True, context={'request': request}).data

        # Check enrollment
        is_enrolled = False
        if request.user.is_authenticated:
            is_enrolled = Enrollment.objects.filter(student=request.user, course=course, status='active').exists()

        data['is_enrolled'] = is_enrolled

        if is_enrolled:
            # Add protected metadata for enrolled students
            data['metadata'] = {}
            if course.exam:
                from exams.models import Subject
                data['metadata']['subject_count'] = Subject.objects.filter(paper__exam=course.exam).count()
                
            from notes.models import StudyMaterial
            data['metadata']['materials_count'] = StudyMaterial.objects.filter(course=course, status='published').count()
            
            from exams.models import Examination
            data['metadata']['mock_exams_count'] = Examination.objects.filter(course=course, status__in=['published', 'live']).count()

        return Response(data)


# ============================================================
# STUDENT COURSE APPLICATION SUBMISSION
# ============================================================

class StudentCourseApplicationView(APIView):
    """
    POST /api/courses/apply/
    Body: { course_id: int }

    Links a pending SubscriptionPayment to a CourseApplication for a specific course.
    This creates the explicit "Application" record so admin knows which course the student
    is applying for.

    If no pending payment exists, the application is created in 'pending' state anyway
    (admin can manually enroll free courses).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'error': 'course_id is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(id=course_id, status='published', is_open_for_enrollment=True)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found or not open for enrollment.'}, status=drf_status.HTTP_404_NOT_FOUND)

        # Check duplicate
        existing = CourseApplication.objects.filter(student=request.user, course=course).first()
        if existing:
            if existing.status in ('pending', 'approved'):
                return Response({
                    'error': f'You already have a {existing.status} application for this course.',
                    'application_id': existing.id,
                    'status': existing.status,
                }, status=drf_status.HTTP_409_CONFLICT)
            # Rejected or cancelled — allow reapplication
            existing.status = 'pending'
            existing.applied_at = timezone.now()
            existing.note = ''
            existing.save(update_fields=['status', 'note'])
            app = existing
        else:
            # Link to most recent pending payment if available
            from subscriptions.models import SubscriptionPayment
            pending_payment = SubscriptionPayment.objects.filter(
                student=request.user, status='PENDING'
            ).order_by('-submitted_at').first()

            app = CourseApplication.objects.create(
                student=request.user,
                course=course,
                subscription_payment=pending_payment,
                status='pending',
            )

        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='course_application',
            title='New Course Application',
            message=f"{request.user.get_full_name() or request.user.username} applied for '{course.title}'.",
            action_url='/admin-dashboard/applications',
        )

        return Response({
            'application_id': app.id,
            'status': app.status,
            'course': course.title,
            'message': 'Application submitted successfully.',
        }, status=drf_status.HTTP_201_CREATED)
