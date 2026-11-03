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
        # Fetch the courses assigned to the teacher. active_student_count is
        # annotated here (one query for every assigned course) instead of
        # calling course.enrollments.filter(...).count() per course in the
        # loop below, which ran one extra query per assigned course.
        from django.db.models import Count, Q as DjangoQ
        assigned_assignments = TeacherCourseAssignment.objects.filter(teacher=user).select_related('course').annotate(
            active_student_count=Count(
                'course__enrollments',
                filter=DjangoQ(course__enrollments__status='active'),
                distinct=True,
            )
        )

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
            student_count = assignment.active_student_count

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
    Returns published + coming_soon courses (no auth required).

    published  → is_open_for_enrollment=True, purchaseable
    coming_soon → is_coming_soon=True, never purchaseable (UI shows badge only)

    Used on public website, the admin package eligibility selector,
    and the student registration form.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q, Prefetch
        from subscriptions.models import SubscriptionPlan
        from exams.models import Subject, Exam

        active_plans_prefetch = Prefetch(
            'subscription_plans',
            queryset=SubscriptionPlan.objects.filter(status='ACTIVE').order_by('price'),
            to_attr='active_plans'
        )

        courses_qs = Course.objects.filter(
            status__in=['published', 'coming_soon'],
        ).select_related('exam', 'exam__parent', 'exam__category').prefetch_related(
            active_plans_prefetch
        ).annotate(
            enrolled_count=Count('enrollments', filter=Q(enrollments__status='active'))
        ).order_by('-featured', 'title')

        # Optional filter: ?exam=<id> scopes to courses for a specific Exam node.
        exam_id = request.query_params.get('exam')
        if exam_id:
            courses_qs = courses_qs.filter(exam_id=exam_id)

        # Optional filter: ?category_id=<id> scopes to courses under an ExamCategory
        category_id = request.query_params.get('category_id') or request.query_params.get('category')
        if category_id:
            courses_qs = courses_qs.filter(exam__category_id=category_id)

        # Optional filter: ?level_id=<id> scopes to courses under a parent Level
        level_id = request.query_params.get('level_id') or request.query_params.get('level')
        if level_id:
            courses_qs = courses_qs.filter(Q(exam__parent_id=level_id) | Q(exam_id=level_id))

        # Optional search
        search_query = request.query_params.get('search')
        if search_query:
            courses_qs = courses_qs.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(exam__name__icontains=search_query)
            )

        # Optional filter: ?status=published|coming_soon restricts to one status.
        status_filter = request.query_params.get('status')
        if status_filter in ('published', 'coming_soon'):
            courses_qs = courses_qs.filter(status=status_filter)

        courses = list(courses_qs)
        exam_ids = [c.exam_id for c in courses if c.exam_id]

        subject_counts = {}
        legacy_counts = {}
        if exam_ids:
            try:
                subject_counts = dict(
                    Subject.objects.filter(paper__exam_id__in=exam_ids)
                    .values('paper__exam_id')
                    .annotate(cnt=Count('id', distinct=True))
                    .values_list('paper__exam_id', 'cnt')
                )
                legacy_counts = dict(
                    Exam.objects.filter(id__in=exam_ids)
                    .annotate(cnt=Count('legacy_subjects'))
                    .values_list('id', 'cnt')
                )
            except Exception:
                pass

        data = []
        for c in courses:
            subject_count = 0
            if c.exam_id:
                subject_count = subject_counts.get(c.exam_id) or legacy_counts.get(c.exam_id, 0)

            is_coming_soon = (c.status == 'coming_soon')

            # Only active/published courses surface their plans.
            # Coming-soon courses must never surface a purchaseable plan.
            if is_coming_soon:
                plans = []
            else:
                plans = [
                    {
                        'id': p.id,
                        'name': p.name,
                        'price': p.price,
                        'original_price': p.original_price,
                        'discount': p.discount,
                        'duration': p.duration,
                        'duration_unit': p.duration_unit,
                        'badge': p.badge,
                        'features': p.features,
                    }
                    for p in getattr(c, 'active_plans', [])
                ]

            thumbnail_url = None
            if c.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(c.thumbnail.url)
                except Exception:
                    pass

            # Build exam context including level/category for frontend hierarchy display
            exam_data = None
            category_id = None
            category_name = None
            level_id = None
            level_name = None
            if c.exam:
                category_id = c.exam.category_id
                category_name = c.exam.category.name if c.exam.category else None
                level_id = c.exam.parent_id if c.exam.parent_id else c.exam.id
                level_name = c.exam.parent.name if c.exam.parent else c.exam.name
                exam_data = {
                    'id': c.exam.id,
                    'title': c.exam.name,
                    'status': c.exam.status,
                    'is_active': c.exam.is_active,
                    'order': c.exam.order,
                    'parent_id': c.exam.parent_id,
                    'parent_name': c.exam.parent.name if c.exam.parent else None,
                    'category_id': category_id,
                    'category_name': category_name,
                }

            hierarchy_parts = [p for p in (category_name, level_name if level_name != c.title else None, c.title) if p]
            hierarchy_path = " › ".join(hierarchy_parts) if hierarchy_parts else c.title

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
                'exam': exam_data,
                'category_id': category_id,
                'category_name': category_name,
                'level_id': level_id,
                'level_name': level_name,
                'hierarchy_path': hierarchy_path,
                'order': c.exam.order if c.exam else 0,
                'featured': c.featured,
                'status': c.status,
                'is_coming_soon': is_coming_soon,
                'starting_price': plans[0]['price'] if plans else None,
                'plans': plans,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'updated_at': c.updated_at.isoformat() if c.updated_at else None,
            })

        return Response(data)

class ProgressiveHierarchyAPIView(APIView):
    """
    GET /api/courses/hierarchy/
    Returns the progressive academic hierarchy:
      Category → Level (Exam, no parent) → Faculty/Course-type (Exam, parent=Level) → Courses

    Includes both published (active) and coming_soon courses.
    coming_soon courses carry is_coming_soon=True and no plan data — the
    frontend must not render a Buy/Enroll button for them.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from exams.models import ExamCategory, Exam
        from courses.models import Course
        from django.db.models import Prefetch
        from subscriptions.models import SubscriptionPlan

        # Keep this data-driven: category primary keys are database-specific and
        # may differ between environments (for example, after imports/seeding).
        categories = ExamCategory.objects.filter(
            is_active=True
        ).order_by('order', 'id')

        all_exams = list(Exam.objects.filter(is_active=True).order_by('order', 'id'))

        from courses.services.course_sync_service import ensure_courses_for_exams
        ensure_courses_for_exams(all_exams)

        # Include published AND coming_soon courses in the tree.
        # Archived / draft courses are excluded.
        active_plans_prefetch = Prefetch(
            'subscription_plans',
            queryset=SubscriptionPlan.objects.filter(status='ACTIVE'),
            to_attr='active_plans'
        )
        all_courses = list(Course.objects.filter(
            status__in=['published', 'coming_soon']
        ).select_related('exam').prefetch_related(active_plans_prefetch))

        # Index courses by exam_id
        courses_by_exam = {}
        for c in all_courses:
            if c.exam_id:
                is_cs = (c.status == 'coming_soon')
                active_plans = getattr(c, 'active_plans', [])
                courses_by_exam.setdefault(c.exam_id, []).append({
                    'id': c.id,
                    'title': c.title,
                    'slug': c.slug,
                    'short_description': c.short_description,
                    'thumbnail': request.build_absolute_uri(c.thumbnail.url) if c.thumbnail else None,
                    'status': c.status,
                    'is_coming_soon': is_cs,
                    # Never expose plans for coming_soon courses
                    'has_plans': (not is_cs) and (len(active_plans) > 0),
                })

        # Build parent→children index
        exams_by_parent = {}
        root_exams_by_category = {}
        for e in all_exams:
            if e.parent_id:
                exams_by_parent.setdefault(e.parent_id, []).append(e)
            else:
                root_exams_by_category.setdefault(e.category_id, []).append(e)

        def build_exam_tree(exam):
            children = exams_by_parent.get(exam.id, [])
            node_courses = courses_by_exam.get(exam.id, [])
            return {
                'id': exam.id,
                'name': exam.name,
                'description': exam.description,
                'children': [build_exam_tree(ch) for ch in children],
                'courses': node_courses,
            }

        result = []
        for cat in categories:
            root_exams = root_exams_by_category.get(cat.id, [])
            result.append({
                'id': cat.id,
                'name': cat.name,
                'description': cat.description,
                'exams': [build_exam_tree(e) for e in root_exams],
            })

        return Response(result)

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
                        'title': getattr(enrollment.course.exam, 'name', getattr(enrollment.course.exam, 'title', '')),
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
    GET /api/courses/my-courses/ and /api/courses/my-learning/
    Returns student courses tailored to their registration Exam Category and Level by default.
    Supports query parameters:
      - category_id: Override or filter by exam category
      - level_id: Override or filter by level (Exam with parent=None)
      - search: Filter by keyword in course title
      - format=structured: Return dictionary with registered hierarchy metadata,
        level courses, and other enrolled courses.
        Without format=structured, returns combined list of courses maintaining
        backward compatibility with MyCourse[] while adding access fields:
        access_state ('enrolled', 'active_subscription', 'free_trial', 'coin_unlocked', 'locked'),
        has_access, is_registered_prep, and is_active_context.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.core.cache import cache
        from django.utils import timezone
        from courses.services.course_access_service import CourseAccessService
        from courses.services.course_sync_service import ensure_courses_for_exams
        from exams.models import UserTopicProgress, Topic, ExamCategory, Exam
        from .models import Course, Enrollment
        from django.db.models import Count, Q

        # Resolve student registration preferences from StudentProfile
        from support.models import StudentProfile
        profile = StudentProfile.objects.filter(user=user).select_related(
            'target_category', 'target_position', 'target_course', 'target_course__exam'
        ).first()
        reg_category = profile.target_category if profile else None
        reg_position = profile.target_position if profile else None
        reg_level = None

        if reg_position:
            curr = reg_position
            while curr.parent_id:
                curr = curr.parent
            reg_level = curr
            if not reg_category and curr.category:
                reg_category = curr.category
        elif profile and profile.target_course and profile.target_course.exam:
            curr = profile.target_course.exam
            while curr.parent_id:
                curr = curr.parent
            reg_level = curr
            if not reg_category and curr.category:
                reg_category = curr.category

        active_course = profile.target_course if profile else None

        # Query parameter filters
        category_id_param = request.query_params.get('category_id')
        level_id_param = request.query_params.get('level_id')
        search_param = request.query_params.get('search', '').strip()
        is_structured = (
            request.query_params.get('view_mode') == 'structured'
            or request.query_params.get('structured') == 'true'
            or request.query_params.get('format') == 'structured'
            or request.headers.get('X-Requested-Format') == 'structured'
            or request.path.rstrip('/').endswith('my-learning')
        )

        target_category = None
        target_level = None

        if category_id_param:
            try:
                target_category = ExamCategory.objects.filter(id=category_id_param, is_active=True).first()
            except (ValueError, TypeError):
                pass

        if level_id_param:
            try:
                target_level = Exam.objects.filter(id=level_id_param, is_active=True).first()
                if target_level and not target_category and target_level.category:
                    target_category = target_level.category
            except (ValueError, TypeError):
                pass

        # If no explicit query parameters, use student's registered hierarchy
        if not category_id_param and not level_id_param:
            target_category = reg_category
            target_level = reg_level

        # Versioned cache key
        from django.conf import settings
        is_testing = getattr(settings, 'TESTING', False)

        dash_ver = cache.get(f'dashboard_version:{user.id}') or 1
        cat_key = target_category.id if target_category else 0
        lvl_key = target_level.id if target_level else 0
        cache_key = f'my_learning_v4:{user.id}:{dash_ver}:{cat_key}:{lvl_key}:{search_param}:{int(is_structured)}'
        if not is_testing:
            try:
                cached_data = cache.get(cache_key)
                if cached_data is not None:
                    res = Response(cached_data)
                    res['X-Registered-Category-Id'] = str(reg_category.id) if reg_category else ''
                    res['X-Registered-Level-Id'] = str(reg_level.id) if reg_level else ''
                    res['X-Is-Preference-Set'] = 'true' if (reg_category and reg_level) else 'false'
                    return res
            except Exception:
                pass

        # Fetch courses matching the target hierarchy level
        matching_courses_qs = Course.objects.none()
        if target_level:
            descendant_exam_ids = {target_level.id}
            child_ids = set(Exam.objects.filter(parent=target_level, is_active=True).values_list('id', flat=True))
            descendant_exam_ids.update(child_ids)
            if child_ids:
                grandchild_ids = set(Exam.objects.filter(parent_id__in=child_ids, is_active=True).values_list('id', flat=True))
                descendant_exam_ids.update(grandchild_ids)

            # Ensure canonical courses exist for all preparation exams in hierarchy
            ensure_courses_for_exams(Exam.objects.filter(id__in=descendant_exam_ids, is_active=True))

            matching_courses_qs = Course.objects.filter(
                status='published', exam_id__in=descendant_exam_ids
            ).select_related('exam', 'exam__category', 'exam__parent')
        elif target_category:
            matching_courses_qs = Course.objects.filter(
                status='published', exam__category=target_category
            ).select_related('exam', 'exam__category', 'exam__parent')

        if search_param:
            matching_courses_qs = matching_courses_qs.filter(title__icontains=search_param)

        now = timezone.now()

        # 1. Active unexpired enrollments
        enrollments_by_course = {
            e.course_id: e for e in Enrollment.objects.filter(student=user, status='active').filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=now)
            )
        }

        # 2. Active subscriptions and their covered course IDs
        sub_unlocked_courses = {}  # course_id -> is_free_trial (bool)
        try:
            from subscriptions.models import Subscription, SubscriptionCourseSelection
            active_subs = list(
                Subscription.objects.filter(
                    Q(expiry_date__isnull=True) | Q(expiry_date__gt=now),
                    student=user, status='ACTIVE'
                ).select_related('plan', 'plan__course').prefetch_related('plan__eligible_courses')
            )
            sub_ids = [s.id for s in active_subs]
            payment_ids = [s.payment_id for s in active_subs if getattr(s, 'payment_id', None)]

            for s in active_subs:
                plan = s.plan
                if not plan:
                    continue
                is_free = bool(getattr(plan, 'is_default_free', False) or float(plan.price or 0) == 0)
                pkg_type = getattr(plan, 'package_type', 'SINGLE')
                access_type = getattr(plan, 'course_access_type', None)

                if pkg_type == 'ALL_ACCESS' or access_type == 'ALL_ACCESS':
                    for cid in Course.objects.filter(status='published').values_list('id', flat=True):
                        sub_unlocked_courses[cid] = is_free
                elif pkg_type == 'BUNDLE':
                    for c in plan.eligible_courses.filter(status='published'):
                        if c.id not in sub_unlocked_courses or (not is_free and sub_unlocked_courses[c.id]):
                            sub_unlocked_courses[c.id] = is_free
                elif pkg_type == 'SINGLE':
                    if plan.course_id and plan.course and plan.course.status == 'published':
                        if plan.course_id not in sub_unlocked_courses or (not is_free and sub_unlocked_courses[plan.course_id]):
                            sub_unlocked_courses[plan.course_id] = is_free
                    else:
                        el = list(plan.eligible_courses.filter(status='published'))
                        if len(el) == 1:
                            sub_unlocked_courses[el[0].id] = is_free

            if sub_ids or payment_ids:
                sel_q = Q(subscription_id__in=sub_ids)
                if payment_ids:
                    sel_q |= Q(payment_id__in=payment_ids)
                selections = SubscriptionCourseSelection.objects.filter(
                    sel_q, course__status='published'
                ).values_list('course_id', flat=True)
                for cid in selections:
                    if cid not in sub_unlocked_courses:
                        sub_unlocked_courses[cid] = False
        except Exception:
            pass

        # 3. Coin entitlements
        coin_entitled_course_ids = set()
        try:
            from wallet.models import ContentEntitlement
            coin_entitled_course_ids = set(
                ContentEntitlement.objects.filter(
                    user=user,
                    content_type='COURSE',
                    status='ACTIVE'
                ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).values_list('content_id', flat=True)
            )
        except Exception:
            pass

        # 4. Admin-granted access
        admin_access = False
        try:
            from subscriptions.access import has_admin_granted_access
            admin_access = has_admin_granted_access(user)
        except Exception:
            pass

        authorized_course_ids = set(enrollments_by_course.keys()) | set(sub_unlocked_courses.keys()) | coin_entitled_course_ids
        if admin_access:
            authorized_course_ids.update(Course.objects.filter(status='published').values_list('id', flat=True))

        matching_course_ids = set(matching_courses_qs.values_list('id', flat=True))
        other_course_ids = authorized_course_ids - matching_course_ids
        other_enrolled_courses_qs = Course.objects.filter(
            id__in=other_course_ids, status='published'
        ).select_related('exam', 'exam__category', 'exam__parent')
        if search_param:
            other_enrolled_courses_qs = other_enrolled_courses_qs.filter(title__icontains=search_param)

        # Progress calculation batch across both lists
        all_target_courses = list(matching_courses_qs)
        all_other_courses = list(other_enrolled_courses_qs)
        combined_courses = all_target_courses + all_other_courses

        exam_ids = [c.exam_id for c in combined_courses if c.exam_id]
        exam_topic_counts = {}
        exam_completed_counts = {}

        if exam_ids:
            topic_aggregates = (
                Topic.objects.filter(chapter__subject__paper__exam_id__in=exam_ids)
                .values('chapter__subject__paper__exam_id')
                .annotate(total=Count('id'))
            )
            for row in topic_aggregates:
                exam_topic_counts[row['chapter__subject__paper__exam_id']] = row['total']

            completed_aggregates = (
                UserTopicProgress.objects.filter(
                    user=user,
                    status='completed',
                    topic__chapter__subject__paper__exam_id__in=exam_ids,
                )
                .values('topic__chapter__subject__paper__exam_id')
                .annotate(completed=Count('id'))
            )
            for row in completed_aggregates:
                exam_completed_counts[row['topic__chapter__subject__paper__exam_id']] = row['completed']

        def serialize_item(course, is_reg_prep=True):
            en = enrollments_by_course.get(course.id)
            thumbnail_url = None
            if course.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(course.thumbnail.url)
                except Exception:
                    pass

            if course.id in enrollments_by_course:
                access_state = 'enrolled'
                has_access = True
            elif course.id in coin_entitled_course_ids:
                access_state = 'coin_unlocked'
                has_access = True
            elif course.id in sub_unlocked_courses:
                has_access = True
                access_state = 'free_trial' if sub_unlocked_courses[course.id] else 'active_subscription'
            elif admin_access:
                has_access = True
                access_state = 'active_subscription'
            else:
                access_state = 'locked'
                has_access = False

            total_topics = exam_topic_counts.get(course.exam_id, 0) if course.exam_id else 0
            completed_in_course = exam_completed_counts.get(course.exam_id, 0) if course.exam_id else 0
            progress_percentage = int((completed_in_course / total_topics) * 100) if total_topics > 0 else 0

            category_info = None
            level_info = None
            if course.exam:
                if course.exam.category:
                    category_info = {'id': course.exam.category.id, 'name': course.exam.category.name}
                if course.exam.parent:
                    level_info = {'id': course.exam.parent.id, 'name': course.exam.parent.name}
                else:
                    level_info = {'id': course.exam.id, 'name': course.exam.name}

            return {
                'enrollment_id': en.id if en else course.id,
                'enrolled_at': en.enrolled_at if en else course.created_at,
                'expires_at': en.expires_at if en else None,
                'access_state': access_state,
                'has_access': has_access,
                'is_registered_prep': is_reg_prep,
                'is_active_context': bool(active_course and active_course.id == course.id),
                'course': {
                    'id': course.id,
                    'title': course.title,
                    'slug': course.slug,
                    'short_description': course.short_description,
                    'thumbnail': thumbnail_url,
                    'category': category_info,
                    'level': level_info,
                    'exam': {'id': course.exam.id, 'title': getattr(course.exam, 'name', getattr(course.exam, 'title', ''))} if course.exam else None,
                },
                'progress': {
                    'total_topics': total_topics,
                    'completed_topics': completed_in_course,
                    'percentage': progress_percentage
                }
            }

        primary_items = [serialize_item(c, is_reg_prep=True) for c in all_target_courses]
        other_items = [serialize_item(c, is_reg_prep=False) for c in all_other_courses]

        if is_structured:
            data = {
                'registered_category': {'id': reg_category.id, 'name': reg_category.name} if reg_category else None,
                'registered_level': {'id': reg_level.id, 'name': reg_level.name} if reg_level else None,
                'selected_category': {'id': target_category.id, 'name': target_category.name} if target_category else None,
                'selected_level': {'id': target_level.id, 'name': target_level.name} if target_level else None,
                'is_preference_set': bool(reg_category and reg_level),
                'active_course_id': active_course.id if active_course else None,
                'courses': primary_items,
                'other_enrolled_courses': other_items,
            }
        else:
            data = primary_items + other_items

        try:
            cache.set(cache_key, data, 300)
        except Exception:
            pass

        res = Response(data)
        res['X-Registered-Category-Id'] = str(reg_category.id) if reg_category else ''
        res['X-Registered-Level-Id'] = str(reg_level.id) if reg_level else ''
        res['X-Is-Preference-Set'] = 'true' if (reg_category and reg_level) else 'false'
        return res



class CourseDetailView(APIView):
    """
    GET /api/courses/<id>/
    Returns detailed information about a course. 
    If the user is enrolled, it also returns protected metadata (e.g., number of available practice sets).
    """
    permission_classes = [AllowAny]

    def get(self, request, lookup_value):
        from django.core.cache import cache
        try:
            if str(lookup_value).isdigit():
                course = Course.objects.select_related('exam').get(id=int(lookup_value), status='published')
            else:
                course = Course.objects.select_related('exam').get(slug=lookup_value, status='published')
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        # Cache public course data and curriculum tree for 300s
        course_tree_cache_key = f'course_detail_v2:{course.id}'
        cached_course_data = None
        try:
            cached_course_data = cache.get(course_tree_cache_key)
        except Exception:
            pass

        if cached_course_data is None:
            thumbnail_url = None
            if course.thumbnail:
                try:
                    thumbnail_url = request.build_absolute_uri(course.thumbnail.url)
                except Exception:
                    pass

            base_data = {
                'id': course.id,
                'title': course.title,
                'slug': course.slug,
                'short_description': course.short_description,
                'description': course.description,
                'thumbnail': thumbnail_url,
                'duration_months': course.duration_months,
                'is_open_for_enrollment': course.is_open_for_enrollment,
                'exam': {'id': course.exam.id, 'title': getattr(course.exam, 'name', getattr(course.exam, 'title', ''))} if course.exam else None,
            }

            # Prefetch curriculum hierarchy in bounded queries
            if course.exam:
                from exams.models import Subject
                from exams.serializers import SubjectSerializer
                subjects = (
                    Subject.objects.filter(paper__exam=course.exam, is_active=True)
                    .prefetch_related('chapters__topics')
                )
                base_data['subjects'] = SubjectSerializer(subjects, many=True, context={'request': request}).data
                base_data['subject_count'] = len(subjects)
            else:
                base_data['subjects'] = []
            from notes.models import StudyMaterial
            from exams.models import Examination
            base_data['materials_count'] = StudyMaterial.objects.filter(course=course, status='published').count()
            base_data['mock_exams_count'] = Examination.objects.filter(course=course, status__in=['published', 'live']).count()

            try:
                cache.set(course_tree_cache_key, base_data, 300)
            except Exception:
                pass
            cached_course_data = base_data

        import copy
        data = copy.deepcopy(cached_course_data)
        subject_count = data.pop('subject_count', 0)
        materials_count = data.pop('materials_count', 0)
        mock_exams_count = data.pop('mock_exams_count', 0)

        # Check enrollment dynamically for authenticated student
        is_enrolled = False
        if request.user.is_authenticated:
            from .models import Enrollment
            is_enrolled = Enrollment.objects.filter(student=request.user, course_id=course.id, status='active').exists()

        data['is_enrolled'] = is_enrolled

        if is_enrolled:
            data['metadata'] = {
                'subject_count': subject_count,
                'materials_count': materials_count,
                'mock_exams_count': mock_exams_count,
            }

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
