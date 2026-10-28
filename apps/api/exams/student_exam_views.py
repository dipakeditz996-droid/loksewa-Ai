import os
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from .models import (
    Exam as AcademicExam,
    Examination,
    ExaminationAttempt,
    ExaminationRequest,
    Subject,
    Topic,
    StudentAnswer,
    Question,
    CalmSessionLog,
)
from .selection_service import QuestionSelectionService
from .attempt_timing import (
    attempt_expires_at,
    attempt_remaining_seconds,
    attempt_is_expired,
    enforce_expiry,
    finalize_attempt,
    recompute_after_evaluation,
)
from administration.permissions import IsEvaluatorUser
from .student_serializers import (
    StudentExaminationSerializer, 
    StudentExaminationAttemptSerializer, 
    StudentExaminationResultSerializer,
    StudentExaminationAttemptListSerializer,
    ExaminationRequestSerializer,
    StudentSecureQuestionSerializer,
    StudentReviewQuestionSerializer,
    StudentLeaderboardSerializer
)
from core.pagination import StandardResultsSetPagination
from django.db.models import F, Window, Sum, Avg, Max, Count, FloatField, ExpressionWrapper, Q
from django.db.models.functions import DenseRank
from subscriptions.permissions import HasActiveSubscription

class StudentExaminationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for students to view available exams and start them.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    serializer_class = StudentExaminationSerializer

    def list(self, request, *args, **kwargs):
        user = request.user
        course_id = request.query_params.get('course_id') or ''
        topicwise = request.query_params.get('topicwise') or ''
        from django.conf import settings
        use_cache = not getattr(settings, 'TESTING', False) and request.META.get('SERVER_NAME') != 'testserver'
        if use_cache and user.is_authenticated:
            from core.views import get_student_dashboard_version
            from django.core.cache import cache
            dash_ver = get_student_dashboard_version(user.id)
            cache_key = f'student_exams_list:{user.id}:{dash_ver}:{course_id}:{topicwise}'
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return Response(cached)
            except Exception:
                pass

        response = super().list(request, *args, **kwargs)
        if use_cache and user.is_authenticated:
            try:
                cache.set(cache_key, response.data, 120)
            except Exception:
                pass
        return response
    
    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q

        if not user or not user.is_authenticated:
            return Examination.objects.none()

        if user.role in ('teacher', 'admin', 'super-admin'):
            return Examination.objects.filter(status__in=['published', 'live'])

        from courses.access import (
            authorized_courses,
            get_student_course_context,
            get_authorized_examination_filter,
        )

        # For single-object actions, allow the student to access any exam that belongs
        # to ANY of their authorized courses or authorized exam scopes.
        if self.action in ('retrieve', 'start', 'active_attempt', 'question_paper'):
            exam_q = get_authorized_examination_filter(user)
            if exam_q is None:
                return Examination.objects.none()
            base_qs = (
                Examination.objects
                .filter(status__in=['published', 'live'])
                .filter(exam_q)
                .select_related('course', 'category', 'exam', 'subject', 'topic')
            )
            if user.is_authenticated:
                from django.db.models import Prefetch
                base_qs = base_qs.prefetch_related(
                    Prefetch(
                        'attempts',
                        queryset=ExaminationAttempt.objects.filter(student=user).order_by('-submitted_at', '-id'),
                        to_attr='student_attempts'
                    )
                )
            return base_qs.filter(Q(exam_type='custom', created_by=user) | ~Q(exam_type='custom'))

        req_course_id = self.request.query_params.get('course_id')
        auth_courses = authorized_courses(user)
        if not auth_courses.exists():
            base_qs = Examination.objects.filter(
                status__in=['published', 'live'],
                course__isnull=True,
            )
            if self.action == 'list':
                base_qs = base_qs.exclude(exam_type='custom').exclude(objective_category='custom')
                if self.request.query_params.get('topicwise', '').lower() in ('1', 'true', 'yes'):
                    base_qs = base_qs.filter(
                        Q(exam_type='subject') | Q(objective_category='topicwise') | Q(topic__isnull=False)
                    )
                return base_qs
            return base_qs.filter(Q(exam_type='custom', created_by=user) | ~Q(exam_type='custom'))

        target_course = None
        if req_course_id:
            try:
                c_id = int(req_course_id)
                target_course = auth_courses.filter(id=c_id).first()
                if not target_course:
                    # Requested course does NOT belong to student's authorized courses -> strict denial (no fallback)
                    return Examination.objects.none()
            except (ValueError, TypeError):
                return Examination.objects.none()

        if target_course:
            exam_q = get_authorized_examination_filter(user, target_course=target_course)
        else:
            exam_q = get_authorized_examination_filter(user)

        if exam_q is None:
            return Examination.objects.none()

        base_qs = (
            Examination.objects
            .filter(status__in=['published', 'live'])
            .filter(exam_q)
            .select_related('course', 'category', 'exam', 'subject', 'topic')
        )
        if user.is_authenticated:
            from django.db.models import Prefetch
            base_qs = base_qs.prefetch_related(
                Prefetch(
                    'attempts',
                    queryset=ExaminationAttempt.objects.filter(student=user).order_by('-submitted_at', '-id'),
                    to_attr='student_attempts'
                )
            )

        # Exclude subjective exams that do not have an assigned question paper PDF
        base_qs = base_qs.exclude(
            Q(exam_type='subjective') & (Q(question_paper_pdf__isnull=True) | Q(question_paper_pdf=''))
        )

        if self.action == 'list':
            base_qs = base_qs.exclude(exam_type='custom').exclude(objective_category='custom')
            if self.request.query_params.get('topicwise', '').lower() in ('1', 'true', 'yes'):
                base_qs = base_qs.filter(
                    Q(exam_type='subject') | Q(objective_category='topicwise') | Q(topic__isnull=False)
                )
            return base_qs
        return base_qs.filter(Q(exam_type='custom', created_by=user) | ~Q(exam_type='custom'))

    def retrieve(self, request, *args, **kwargs):
        user = request.user
        exam_id = kwargs.get('pk') or kwargs.get('id')
        from django.conf import settings
        use_cache = not getattr(settings, 'TESTING', False) and request.META.get('SERVER_NAME') != 'testserver'
        if use_cache and user.is_authenticated and exam_id:
            from core.views import get_student_dashboard_version
            dash_ver = get_student_dashboard_version(user.id)
            cache_key = f'student_exam_detail_v1:{user.id}:{exam_id}:{dash_ver}'
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        examination = self.get_object()
        if user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        serializer = self.get_serializer(examination)
        resp_data = serializer.data
        if use_cache and user.is_authenticated and exam_id:
            try:
                cache.set(cache_key, resp_data, 120)
            except Exception:
                pass
        return Response(resp_data)

    @action(detail=True, methods=['get'], url_path='question-paper')
    def question_paper(self, request, pk=None):
        """Securely stream question paper PDF for authorized students."""
        examination = self.get_object()
        user = request.user

        if user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if not examination.question_paper_pdf:
            return Response({'detail': 'No question paper uploaded for this examination.'}, status=status.HTTP_404_NOT_FOUND)

        from django.http import FileResponse
        try:
            return FileResponse(examination.question_paper_pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({'detail': f'Could not open question paper: {e}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='expert-solution')
    def expert_solution(self, request, pk=None):
        examination = self.get_object()
        user = request.user
        if user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if ExaminationAttempt.objects.filter(
            examination=examination, student=user, status__in=('in-progress', 'upload_pending')
        ).exists():
            return Response(
                {'detail': 'Expert solutions are unavailable while an examination attempt is active.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if examination.exam_type == 'subjective':
            if not examination.is_expert_solution_published or not examination.expert_solution_pdf:
                return Response({'detail': 'No Expert Solution has been published for this exam yet.'}, status=status.HTTP_404_NOT_FOUND)

            if request.query_params.get('download') in ('1', 'true', 'yes'):
                from django.http import FileResponse
                try:
                    return FileResponse(examination.expert_solution_pdf.open('rb'), content_type='application/pdf')
                except Exception as e:
                    return Response({'detail': f'Could not open expert solution PDF: {e}'}, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'examination': examination.id,
                'title': examination.title,
                'exam_type': 'subjective',
                'is_expert_solution_published': True,
                'has_expert_solution_pdf': True,
                'page_count': examination.expert_solution_page_count,
                'file_size': examination.expert_solution_file_size,
                'published_at': examination.expert_solution_published_at,
            })

        if examination.is_scheduled_live:
            return Response(
                {'detail': 'Expert solutions are unavailable for scheduled Live Exams.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        rows = examination.examination_questions.select_related('question').order_by('order', 'id')
        solutions = []
        for row in rows:
            question = row.question
            if not (question.correct_option or question.explanation or question.model_answer):
                continue
            solutions.append({
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'option_a': question.option_a,
                'option_b': question.option_b,
                'option_c': question.option_c,
                'option_d': question.option_d,
                'correct_option': question.correct_option,
                'explanation': question.explanation,
                'model_answer': question.model_answer,
                'marks': row.marks,
            })
        if not solutions:
            return Response({'detail': 'Expert solution is not available yet.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'examination': examination.id, 'title': examination.title, 'solutions': solutions})

    @action(detail=True, methods=['get'], url_path='expert-solution-pdf')
    def expert_solution_pdf(self, request, pk=None):
        """Securely stream expert solution PDF for authorized students."""
        examination = self.get_object()
        user = request.user
        if user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if ExaminationAttempt.objects.filter(
            examination=examination, student=user, status__in=('in-progress', 'upload_pending')
        ).exists():
            return Response(
                {'detail': 'Expert solutions are unavailable while an examination attempt is active.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not examination.is_expert_solution_published or not examination.expert_solution_pdf:
            return Response({'detail': 'No Expert Solution has been published for this exam yet.'}, status=status.HTTP_404_NOT_FOUND)

        from django.http import FileResponse
        try:
            return FileResponse(examination.expert_solution_pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({'detail': f'Could not open expert solution PDF: {e}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        Create *or resume* an ExaminationAttempt.

        Idempotent by design: a second tab, a refresh, or a double-click
        returns the student's existing in-progress attempt rather than
        creating a duplicate. The attempt row stays the single source of truth
        for "am I in an exam right now", which is what drives exam Focus Mode.
        """
        examination = self.get_object()
        user = request.user

        if user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if examination.status not in ['published', 'live']:
            return Response(
                {'detail': 'Exam is not currently active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if examination.requires_admin_request:
            exam_request = ExaminationRequest.objects.filter(
                student=user, examination=examination
            ).order_by('-created_at').first()

            if not exam_request or exam_request.status != 'approved':
                return Response(
                    {'detail': 'Admin approval is required before starting this examination.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        now = timezone.now()
        if examination.is_scheduled_live:
            if not examination.start_time or not examination.end_time:
                return Response(
                    {'detail': 'This Live Exam schedule is not configured.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if now < examination.start_time:
                return Response(
                    {'detail': 'This exam has not opened yet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if now > examination.end_time:
                return Response(
                    {'detail': 'This exam window has closed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif not examination.starts_anytime_after_approval:
            if examination.start_time and now < examination.start_time:
                return Response(
                    {'detail': 'This exam has not opened yet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if examination.end_time and now > examination.end_time:
                return Response(
                    {'detail': 'This exam window has closed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if examination.exam_type == 'subjective' and examination.is_scheduled_live and not examination.question_paper_pdf:
            return Response(
                {'detail': 'Question paper for this subjective exam is not available yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Lock this student's rows for this exam so two tabs racing on
            # "Start" cannot both create an attempt.
            active_attempt = (
                ExaminationAttempt.objects
                .select_for_update()
                .filter(examination=examination, student=user, status__in=('in-progress', 'upload_pending'))
                .first()
            )

            # allow_resume used to be stored but never read — leaving mid-exam
            # and coming back always silently continued regardless of the
            # flag. Live Exams additionally forbid resume unconditionally
            # (the category's "no pause/restart" rule), not left to the
            # per-exam checkbox.
            resume_allowed = examination.allow_resume and not examination.is_scheduled_live

            if active_attempt:
                # An attempt that ran out of time while the student was away is
                # closed here rather than silently resumed.
                if enforce_expiry(active_attempt):
                    active_attempt = None
                elif not resume_allowed:
                    # Leaving mid-attempt forfeits it: score whatever was
                    # answered so far instead of letting them continue later.
                    finalize_attempt(active_attempt)
                    active_attempt = None
                else:
                    serializer = StudentExaminationAttemptSerializer(active_attempt)
                    return Response(
                        {**serializer.data, 'resumed': True},
                        status=status.HTTP_200_OK,
                    )

            if examination.max_attempts and examination.max_attempts > 0:
                attempts_count = ExaminationAttempt.objects.filter(
                    examination=examination, student=user
                ).count()
                if attempts_count >= examination.max_attempts:
                    return Response(
                        {'detail': 'Maximum attempts reached for this exam.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            from subscriptions.entitlements import EntitlementService
            allowed, reason, quota_info = EntitlementService.check_and_reserve_exam_attempt(user, examination)
            if not allowed:
                return Response(
                    {
                        'detail': reason,
                        'feature': quota_info.get('feature'),
                        'remaining': quota_info.get('remaining', 0),
                        'upgrade_url': quota_info.get('upgrade_url', '/student/plans'),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            attempt = ExaminationAttempt.objects.create(
                examination=examination,
                student=user,
                status='in-progress',
            )

            from core.views import invalidate_student_dashboard
            invalidate_student_dashboard(user.id)

        serializer = StudentExaminationAttemptSerializer(attempt)
        return Response(
            {**serializer.data, 'resumed': False},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='active-attempt')
    def active_attempt(self, request, pk=None):
        """The student's in-progress attempt for this exam, if any."""
        examination = self.get_object()
        if request.user.role == 'student':
            from courses.access import is_examination_authorized_for_student
            if not is_examination_authorized_for_student(request.user, examination):
                return Response(
                    {'detail': 'You do not have access to this course examination.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        attempt = ExaminationAttempt.objects.filter(
            examination=examination, student=request.user, status__in=('in-progress', 'upload_pending')
        ).first()

        if attempt and enforce_expiry(attempt):
            attempt = None

        if not attempt:
            return Response({'active_attempt': None})

        return Response({
            'active_attempt': StudentExaminationAttemptSerializer(attempt).data
        })

    @action(detail=False, methods=['get'], url_path='academic-hierarchy')
    def academic_hierarchy(self, request):
        user = request.user
        allowed_exam_ids = None

        if user.role == 'student':
            from courses.access import authorized_courses, get_course_exam_ids, authorized_exam_ids
            course_id = request.query_params.get('course_id')
            if course_id:
                try:
                    c_id = int(course_id)
                    auth_c = authorized_courses(user).filter(id=c_id).first()
                    if auth_c:
                        allowed_exam_ids = get_course_exam_ids(auth_c)
                    else:
                        allowed_exam_ids = set()
                except (ValueError, TypeError):
                    allowed_exam_ids = set()
            else:
                allowed_exam_ids = authorized_exam_ids(user)

            if not allowed_exam_ids:
                return Response([])

        from exams.models import ExamCategory
        categories = ExamCategory.objects.filter(is_active=True).prefetch_related(
            'exams', 'exams__papers', 'exams__papers__subjects', 
            'exams__papers__subjects__chapters', 'exams__papers__subjects__chapters__topics'
        )
        tree = []
        for cat in categories:
            exams_qs = cat.exams.filter(is_active=True)
            if allowed_exam_ids is not None:
                exams_qs = exams_qs.filter(id__in=allowed_exam_ids)

            if not exams_qs.exists():
                continue

            cat_data = {
                'id': cat.id, 'name': cat.name, 'is_active': cat.is_active, 'exams': []
            }
            for exam in exams_qs:
                exam_data = {
                    'id': exam.id, 'name': exam.name, 'is_active': exam.is_active, 'papers': []
                }
                for paper in exam.papers.filter(is_active=True):
                    paper_data = {
                        'id': paper.id, 'name': paper.name, 'is_active': paper.is_active, 'subjects': []
                    }
                    for subject in paper.subjects.filter(is_active=True):
                        subject_data = {
                            'id': subject.id, 'name': subject.name, 'is_active': subject.is_active, 'chapters': []
                        }
                        for chapter in subject.chapters.filter(is_active=True):
                            chapter_data = {
                                'id': chapter.id, 'title': chapter.title, 'is_active': chapter.is_active, 'topics': []
                            }
                            for topic in chapter.topics.filter(is_active=True):
                                chapter_data['topics'].append({
                                    'id': topic.id, 'name': topic.name, 'is_active': topic.is_active
                                })
                            subject_data['chapters'].append(chapter_data)
                        paper_data['subjects'].append(subject_data)
                    exam_data['papers'].append(paper_data)
                cat_data['exams'].append(exam_data)
            tree.append(cat_data)
        return Response(tree)

    def _build_question_filter(self, data):
        from django.db.models import Q
        q_filter = Q(status='approved')
        
        category_id = data.get('category_id')
        exam_id = data.get('exam_id')
        paper_id = data.get('paper_id')
        subject_id = data.get('subject_id')
        chapter_id = data.get('chapter_id')
        topic_id = data.get('topic_id')
        difficulty = data.get('difficulty', 'all')
        question_type = data.get('question_type', 'mcq')

        # Question -> topic -> chapter -> subject -> paper -> exam -> category.
        # All multi-hop lookups below were missing the `chapter__` segment
        # (Topic has no direct `subject` field, only via `chapter`), so any
        # selection above chapter-level always hit "Unsupported lookup" -
        # the custom exam builder's availability check and generation both
        # 500'd for any exam/paper/subject-level scope.
        #
        # category_id is the top of the hierarchy (Central/Provincial/
        # Institutional in the client's terms) - it deliberately has no
        # elif chain with exam_id below it: picking a whole category means
        # "every question under every exam in it", not narrowed to one.
        if topic_id:
            q_filter &= Q(topic_id=topic_id)
        elif chapter_id:
            q_filter &= Q(topic__chapter_id=chapter_id)
        elif subject_id:
            q_filter &= Q(topic__chapter__subject_id=subject_id)
        elif paper_id:
            q_filter &= Q(topic__chapter__subject__paper_id=paper_id)
        elif exam_id:
            q_filter &= Q(topic__chapter__subject__paper__exam_id=exam_id)
        elif category_id:
            q_filter &= Q(topic__chapter__subject__paper__exam__category_id=category_id)

        if difficulty and difficulty != 'mixed' and difficulty != 'all':
            q_filter &= Q(difficulty=difficulty)
            
        if question_type:
            q_filter &= Q(question_type=question_type)
            
        return q_filter

    @action(detail=False, methods=['post'], url_path='available-questions')
    def available_questions(self, request):
        # QuestionSelectionService is imported at the top of this module
        data = request.data
        exam_id = data.get('exam_id')

        student_allowed_exam_ids = None
        if request.user.role == 'student':
            from courses.access import authorized_exam_ids
            allowed_exam_ids = authorized_exam_ids(request.user) or set()
            student_allowed_exam_ids = allowed_exam_ids
            if exam_id and int(exam_id) not in allowed_exam_ids:
                return Response({'available': 0})

        avail = QuestionSelectionService().check_availability(
            exam_id=data.get('exam_id'),
            exam_ids=student_allowed_exam_ids,
            category_id=data.get('category_id'),
            paper_id=data.get('paper_id'),
            subject_id=data.get('subject_id'),
            chapter_id=data.get('chapter_id'),
            topic_id=data.get('topic_id'),
            difficulty=data.get('difficulty') if data.get('difficulty') not in ('all', 'mixed', None) else None,
            question_type=data.get('question_type', 'mcq'),
        )
        return Response({'available': avail['total']})

    @action(detail=False, methods=['post'])
    def generate_custom(self, request):
        from exams.models import ExaminationQuestion, Exam
        # QuestionSelectionService is imported at the top of this module
        from django.db import transaction

        data = request.data
        exam_id = data.get('exam_id')
        category_id = data.get('category_id')
        num_questions = int(data.get('question_count', 20))
        difficulty_raw = data.get('difficulty')
        difficulty = difficulty_raw if difficulty_raw not in ('all', 'mixed', None) else None
        question_type = data.get('question_type', 'mcq')

        if not exam_id and not category_id:
            return Response({'detail': 'exam_id or category_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        student_allowed_exam_ids = None
        if request.user.role == 'student':
            from courses.access import authorized_exam_ids
            allowed_exam_ids = authorized_exam_ids(request.user) or set()
            student_allowed_exam_ids = allowed_exam_ids
            if exam_id and int(exam_id) not in allowed_exam_ids:
                return Response({'detail': 'You are not enrolled in the course for this exam.'}, status=status.HTTP_403_FORBIDDEN)

        service = QuestionSelectionService()
        avail = service.check_availability(
            exam_id=exam_id,
            exam_ids=student_allowed_exam_ids,
            category_id=category_id,
            paper_id=data.get('paper_id'),
            subject_id=data.get('subject_id'),
            chapter_id=data.get('chapter_id'),
            topic_id=data.get('topic_id'),
            difficulty=difficulty,
            question_type=question_type,
        )
        if num_questions > avail['total']:
            return Response({
                'detail': f'Only {avail["total"]} questions are available for your selected criteria.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                result = service.select(
                    exam_id=exam_id,
                    exam_ids=student_allowed_exam_ids,
                    category_id=category_id,
                    paper_id=data.get('paper_id'),
                    subject_id=data.get('subject_id'),
                    chapter_id=data.get('chapter_id'),
                    topic_id=data.get('topic_id'),
                    difficulty=difficulty,
                    question_type=question_type,
                    count=num_questions,
                    randomize=True,
                )
                questions = result['questions']

                # Examination.exam is a required FK to one Position/Level, but
                # a category-wide "full syllabus" exam spans every position
                # under that category - there's no single exam to point at.
                # Fall back to whichever exam the first selected question
                # actually belongs to (purely for display; the real content
                # is the ExaminationQuestion rows below).
                if exam_id:
                    resolved_exam = Exam.objects.get(id=exam_id)
                else:
                    first_question = questions[0] if questions else None
                    resolved_exam = None
                    if first_question:
                        if getattr(first_question, 'exam', None):
                            resolved_exam = first_question.exam
                        elif getattr(first_question, 'subject', None) and getattr(first_question.subject, 'paper', None):
                            resolved_exam = first_question.subject.paper.exam
                        elif getattr(first_question, 'chapter', None) and getattr(first_question.chapter, 'subject', None) and getattr(first_question.chapter.subject, 'paper', None):
                            resolved_exam = first_question.chapter.subject.paper.exam
                        elif getattr(first_question, 'topic', None) and getattr(first_question.topic, 'chapter', None) and getattr(first_question.topic.chapter, 'subject', None) and getattr(first_question.topic.chapter.subject, 'paper', None):
                            resolved_exam = first_question.topic.chapter.subject.paper.exam

                    if not resolved_exam:
                        resolved_exam = Exam.objects.filter(category_id=category_id).first()

                    if not resolved_exam:
                        return Response({'detail': 'No exam found under this category.'}, status=status.HTTP_400_BAD_REQUEST)

                # Scoring awards each question's own marks (Question.marks), so
                # the exam total must be the sum of those - not the question
                # count - or a 2-mark question can push a score past 100%.
                total_marks = sum(q.marks for q in questions)
                from courses.models import Course
                custom_course = Course.objects.filter(exam=resolved_exam).first()
                if not custom_course and resolved_exam.parent_id:
                    custom_course = Course.objects.filter(exam_id=resolved_exam.parent_id).first()

                custom_exam = Examination.objects.create(
                    title=f"Custom Exam - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                    exam_type='custom',
                    objective_category=None,
                    category=resolved_exam.category,
                    exam=resolved_exam,
                    course=custom_course,
                    total_questions=len(questions),
                    time_limit=len(questions),
                    total_marks=total_marks,
                    passing_marks=total_marks * 0.4,
                    show_correct_answers=True,
                    status='published',
                    created_by=request.user
                )

                exam_questions = [
                    ExaminationQuestion(examination=custom_exam, question=q, order=i, marks=q.marks)
                    for i, q in enumerate(questions)
                ]
                ExaminationQuestion.objects.bulk_create(exam_questions)
                
                attempt = ExaminationAttempt.objects.create(
                    examination=custom_exam,
                    student=request.user,
                    status='in-progress'
                )
                
                serializer = StudentExaminationAttemptSerializer(attempt)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StudentExaminationRequestViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    serializer_class = ExaminationRequestSerializer

    def get_queryset(self):
        return ExaminationRequest.objects.filter(student=self.request.user).select_related(
            'student', 'examination', 'reviewed_by'
        )

    def create(self, request, *args, **kwargs):
        if request.user.role != 'student':
            return Response({'detail': 'Only students can request an examination.'}, status=status.HTTP_403_FORBIDDEN)
        request_type = request.data.get('request_type', 'exam_access')
        if request_type == 'subjective_live':
            try:
                academic_exam_id = int(request.data.get('academic_exam'))
                course_id = int(request.data['course']) if request.data.get('course') else None
                subject_id = int(request.data['subject']) if request.data.get('subject') else None
                topic_id = int(request.data['topic']) if request.data.get('topic') else None
            except (TypeError, ValueError):
                return Response({'detail': 'A valid academic_exam is required.'}, status=status.HTTP_400_BAD_REQUEST)

            academic_exam = AcademicExam.objects.filter(pk=academic_exam_id, is_active=True).first()
            if not academic_exam:
                return Response({'detail': 'An active academic exam is required.'}, status=status.HTTP_404_NOT_FOUND)

            from courses.access import authorized_courses, authorized_exam_ids
            if course_id:
                course = authorized_courses(request.user).filter(pk=course_id, exam_id=academic_exam.id).first()
                if not course:
                    return Response({'detail': 'You are not authorized for this course.'}, status=status.HTTP_403_FORBIDDEN)
            elif academic_exam.id not in (authorized_exam_ids(request.user) or set()):
                return Response({'detail': 'You are not authorized for this academic exam.'}, status=status.HTTP_403_FORBIDDEN)

            subject = None
            if subject_id:
                subject = Subject.objects.filter(
                    pk=subject_id, paper__exam_id=academic_exam.id, is_active=True
                ).first()
                if not subject:
                    return Response({'detail': 'Subject must belong to the selected academic exam.'}, status=status.HTTP_400_BAD_REQUEST)

            topic = None
            if topic_id:
                topic = Topic.objects.filter(
                    pk=topic_id, chapter__subject__paper__exam_id=academic_exam.id, is_active=True
                ).first()
                if not topic or (subject and topic.chapter.subject_id != subject.id):
                    return Response({'detail': 'Topic must belong to the selected exam and subject.'}, status=status.HTTP_400_BAD_REQUEST)

            exam_request, created = ExaminationRequest.objects.get_or_create(
                student=request.user,
                academic_exam=academic_exam,
                request_type='subjective_live',
                status='pending',
                defaults={'course_id': course_id, 'subject': subject, 'topic': topic},
            )
            return Response(
                self.get_serializer(exam_request).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        if request_type != 'exam_access':
            return Response({'detail': 'Unsupported examination request type.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            examination_id = int(request.data.get('examination') or request.data.get('exam_id'))
        except (TypeError, ValueError):
            return Response({'detail': 'examination is required.'}, status=status.HTTP_400_BAD_REQUEST)

        examination = Examination.objects.filter(pk=examination_id, status='published').first()
        if not examination:
            return Response({'detail': 'Published examination not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not examination.requires_admin_request:
            return Response({'detail': 'This examination does not require an admin request.'}, status=status.HTTP_400_BAD_REQUEST)

        from courses.access import is_examination_authorized_for_student
        if not is_examination_authorized_for_student(request.user, examination):
            return Response({'detail': 'You are not authorized for this examination.'}, status=status.HTTP_403_FORBIDDEN)

        exam_request, created = ExaminationRequest.objects.get_or_create(
            student=request.user,
            examination=examination,
        )
        return Response(
            self.get_serializer(exam_request).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class StudentExaminationAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for students to manage their active and past attempts.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    serializer_class = StudentExaminationAttemptSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        if self.action in ['active', 'state', 'list', 'result', 'retrieve', 'request_checking', 'checking_status']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        qs = (
            ExaminationAttempt.objects
            .filter(student=user)
            .select_related('examination', 'examination__course', 'examination__category', 'subjective_submission')
            .prefetch_related('subjective_submission__checking_requests')
        )

        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param in ('results', 'completed', 'finished'):
                qs = qs.filter(status__in=('submitted', 'evaluated'))
            else:
                qs = qs.filter(status=status_param)

        course_id = self.request.query_params.get('course_id')
        if course_id:
            try:
                cid = int(course_id)
                from django.db.models import Q
                qs = qs.filter(Q(examination__course_id=cid) | Q(examination__exam__courses__id=cid))
            except (ValueError, TypeError):
                pass

        action = getattr(self, 'action', None)
        if action in ('retrieve', 'active'):
            qs = qs.prefetch_related('answers__question')

        if getattr(self, 'action', None) == 'list' and user.role == 'student':
            if status_param not in ('results', 'completed', 'finished'):
                from courses.access import get_authorized_examination_filter
                from django.db.models import Q
                exam_q = get_authorized_examination_filter(user, target_course=course_id)
                if exam_q is not None:
                    # Student is currently authorized: they can see their attempts for authorized exams,
                    # plus their historical submitted/evaluated attempts.
                    qs = qs.filter(
                        Q(status__in=('submitted', 'evaluated')) | Q(examination__in=Examination.objects.filter(exam_q))
                    )
                else:
                    # Student's course access is not active: historical completed attempts remain preserved.
                    qs = qs.filter(status__in=('submitted', 'evaluated'))

        return qs.order_by('-submitted_at', '-started_at', '-id')

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentExaminationAttemptListSerializer
        if self.action == 'result':
            return StudentExaminationResultSerializer
        return super().get_serializer_class()

    def _warm_rankings_cache(self, attempts, context):
        if not attempts:
            return
        from django.core.cache import cache
        from django.db.models import Count
        exam_ids = {a.examination_id for a in attempts if getattr(a, 'examination_id', None)}
        if not exam_ids:
            return

        participants_memo = context.setdefault('_participants_memo', {})
        ranks_memo = context.setdefault('_ranks_memo', {})

        missing_exam_ids = []
        for eid in exam_ids:
            c_key = f"att_participants:{eid}"
            val = cache.get(c_key)
            if val is not None:
                participants_memo[eid] = val
            else:
                missing_exam_ids.append(eid)

        if missing_exam_ids:
            p_counts = dict(
                ExaminationAttempt.objects.filter(
                    examination_id__in=missing_exam_ids,
                    status__in=['submitted', 'evaluated']
                ).values('examination_id').annotate(
                    cnt=Count('student', distinct=True)
                ).values_list('examination_id', 'cnt')
            )
            for eid in missing_exam_ids:
                cnt = p_counts.get(eid, 0)
                participants_memo[eid] = cnt
                try:
                    cache.set(f"att_participants:{eid}", cnt, 600)
                except Exception:
                    pass

        # For ranks: check cache for each attempt on the page
        missing_rank_attempts = []
        for a in attempts:
            if a.percentage is not None and a.status in ['submitted', 'evaluated']:
                pct_key = round(float(a.percentage), 2)
                cache_key = f"att_rank:{a.examination_id}:{int(pct_key * 100)}"
                cached = cache.get(cache_key)
                if cached is not None:
                    ranks_memo[(a.examination_id, pct_key)] = cached
                else:
                    missing_rank_attempts.append(a)

        # Batch compute missing ranks
        for a in missing_rank_attempts:
            pct_key = round(float(a.percentage), 2)
            memo_key = (a.examination_id, pct_key)
            if memo_key in ranks_memo:
                continue
            higher = ExaminationAttempt.objects.filter(
                examination_id=a.examination_id,
                status__in=['submitted', 'evaluated'],
                percentage__gt=a.percentage
            ).values('percentage').distinct().count()
            rank = higher + 1
            ranks_memo[memo_key] = rank
            try:
                cache.set(f"att_rank:{a.examination_id}:{int(pct_key * 100)}", rank, 600)
            except Exception:
                pass

    def _attach_batch_answer_stats(self, attempts):
        if not attempts:
            return
        from .models import StudentAnswer
        from django.db.models import Count, Q
        attempt_ids = [a.id for a in attempts]
        ans_stats = {
            row[0]: row[1:]
            for row in StudentAnswer.objects.filter(attempt_id__in=attempt_ids).values('attempt_id').annotate(
                correct=Count('id', filter=Q(is_correct=True)),
                wrong=Count('id', filter=Q(is_correct=False) & (Q(selected_option__isnull=False) | ~Q(answer_text=''))),
                attempted=Count('id', filter=Q(selected_option__isnull=False) | ~Q(answer_text='')),
                total=Count('id')
            ).values_list('attempt_id', 'correct', 'wrong', 'attempted', 'total')
        }
        for a in attempts:
            stats = ans_stats.get(a.id, (0, 0, 0, 0))
            a.annotated_correct = stats[0]
            a.annotated_wrong = stats[1]
            a.annotated_attempted = stats[2]
            a.annotated_total_answers = stats[3]

    def list(self, request, *args, **kwargs):
        user = request.user
        status_param = request.query_params.get('status', '')
        page_param = request.query_params.get('page', '1')
        page_size_param = request.query_params.get('page_size', '12')
        course_id = request.query_params.get('course_id', '')

        from django.conf import settings
        use_cache = not getattr(settings, 'TESTING', False) and request.META.get('SERVER_NAME') != 'testserver'

        if use_cache:
            from core.views import get_student_dashboard_version
            dash_ver = get_student_dashboard_version(user.id)
            cache_key = f"std_results_list_v2:{user.id}:{dash_ver}:{status_param}:{course_id}:{page_param}:{page_size_param}"
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            context = self.get_serializer_context()
            self._warm_rankings_cache(page, context)
            self._attach_batch_answer_stats(page)
            serializer = self.get_serializer(page, many=True, context=context)
            resp = self.get_paginated_response(serializer.data)
            try:
                cache.set(cache_key, resp.data, 60)
            except Exception:
                pass
            return resp

        context = self.get_serializer_context()
        self._warm_rankings_cache(queryset, context)
        self._attach_batch_answer_stats(queryset)
        serializer = self.get_serializer(queryset, many=True, context=context)
        resp_data = serializer.data
        try:
            cache.set(cache_key, resp_data, 60)
        except Exception:
            pass
        return Response(resp_data)

    def get_object(self):
        """
        Every read of an attempt first settles its clock. A tab left open past
        the deadline therefore sees a submitted attempt, not a running one.
        Enforces strict course authorization for active attempts, while preserving
        historical access to finalized results.
        """
        attempt = super().get_object()
        enforce_expiry(attempt)
        user = self.request.user
        if user.role == 'student':
            from rest_framework.exceptions import PermissionDenied
            if attempt.student_id != user.id:
                raise PermissionDenied("You do not have access to this examination attempt.")

            if attempt.status in ('in-progress', 'upload_pending'):
                from courses.access import is_examination_authorized_for_student
                if not is_examination_authorized_for_student(user, attempt.examination):
                    raise PermissionDenied("You do not have access to this active examination attempt.")
        return attempt

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        All still-running attempts for the current student.

        The Focus Mode context calls this on mount so a refresh, a reopened
        tab, or a second device re-applies exam focus from server state rather
        than from anything the browser remembered.
        """
        # Fast exit: if student has no in-progress attempt at all, return empty list immediately
        # without running heavy course authorization filter or prefetching questions/answers.
        if not ExaminationAttempt.objects.filter(student=request.user, status='in-progress').exists():
            return Response([])

        attempts = self.get_queryset().filter(status='in-progress')
        live = []
        for attempt in attempts:
            if not enforce_expiry(attempt):
                live.append(attempt)
        serializer = StudentExaminationAttemptSerializer(live, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def state(self, request, pk=None):
        """
        Lightweight poll target: attempt status plus remaining time. Used by
        the exam timer and the Focus Mode watchdog to re-sync with the server.
        For subjective exams, returns both writing timer and answer-upload deadline.
        """
        attempt = self.get_object()
        from .attempt_timing import (
            is_subjective_exam,
            subjective_exam_expires_at,
            subjective_exam_remaining_seconds,
            subjective_upload_expires_at,
            subjective_upload_remaining_seconds,
            subjective_upload_is_expired,
            is_subjective_upload_open,
        )
        is_subj = is_subjective_exam(attempt)
        sub_status = getattr(attempt.subjective_submission, 'status', None) if hasattr(attempt, 'subjective_submission') else None

        exam_exp = subjective_exam_expires_at(attempt) if is_subj else attempt_expires_at(attempt)
        upload_exp = subjective_upload_expires_at(attempt) if is_subj else None

        exam_rem = subjective_exam_remaining_seconds(attempt) if is_subj else attempt_remaining_seconds(attempt)
        upload_rem = subjective_upload_remaining_seconds(attempt) if is_subj else None

        return Response({
            'id': attempt.id,
            'status': attempt.status,
            'is_active': (
                (attempt.status in ('in-progress', 'upload_pending') and not subjective_upload_is_expired(attempt))
                if is_subj else (attempt.status == 'in-progress' and not attempt_is_expired(attempt))
            ),
            'is_expired': subjective_upload_is_expired(attempt) if is_subj else attempt_is_expired(attempt),
            'remaining_seconds': exam_rem,
            'time_remaining_seconds': exam_rem,
            'server_time': timezone.now().isoformat(),
            'is_subjective': is_subj,
            'exam_expires_at': exam_exp.isoformat() if exam_exp else None,
            'exam_remaining_seconds': exam_rem,
            'is_exam_expired': (exam_rem == 0) if is_subj else attempt_is_expired(attempt),
            'upload_expires_at': upload_exp.isoformat() if upload_exp else None,
            'upload_remaining_seconds': upload_rem,
            'upload_time_remaining_seconds': upload_rem,
            'is_upload_expired': subjective_upload_is_expired(attempt) if is_subj else None,
            'can_upload': is_subjective_upload_open(attempt) if is_subj else False,
            'submission_status': sub_status,
        })

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Returns questions for this attempt. Exposes correct answers only after submission when review is allowed."""
        from django.conf import settings
        use_cache = not getattr(settings, 'TESTING', False) and request.META.get('SERVER_NAME') != 'testserver'

        attempt = self.get_object()
        examination = attempt.examination

        # Check if correct answer review is allowed
        can_review = False
        if attempt.status != 'in-progress':
            if examination.result_visibility == 'manual' and attempt.status != 'evaluated':
                can_review = False
            elif examination.result_visibility == 'after_end' and examination.end_time and timezone.now() < examination.end_time:
                can_review = False
            elif examination.exam_type in ('custom', 'practice') or examination.objective_category == 'custom':
                can_review = True
            else:
                can_review = bool(examination.show_correct_answers)

        mode_key = "review" if can_review else "secure"
        cache_key = f"att_questions_v1:{attempt.id}:{mode_key}"
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

        fields = [
            'id', 'text', 'question_type', 'difficulty',
            'option_a', 'option_b', 'option_c', 'option_d',
            'marks', 'negative_marks'
        ]
        if can_review:
            fields.extend(['correct_option', 'explanation', 'model_answer'])

        # Get questions depending on whether it's from a question_set or directly mapped
        if examination.question_set:
            questions = list(examination.question_set.questions.only(*fields))
        else:
            from .models import ExaminationQuestion
            question_ids = list(
                ExaminationQuestion.objects
                .filter(examination=examination)
                .order_by('order', 'id')
                .values_list('question_id', flat=True)
            )
            q_map = {q.id: q for q in Question.objects.filter(id__in=question_ids).only(*fields)}
            questions = [q_map[qid] for qid in question_ids if qid in q_map]

        if examination.randomize_questions and examination.objective_category != 'past_year':
            import random
            random.Random(attempt.id).shuffle(questions)

        if can_review:
            serializer = StudentReviewQuestionSerializer(questions, many=True)
        else:
            serializer = StudentSecureQuestionSerializer(questions, many=True)

        data = serializer.data
        if use_cache:
            try:
                cache.set(cache_key, data, 1800)
            except Exception:
                pass
        return Response(data)

    def _get_examination_assigned_question_ids(self, attempt):
        examination = attempt.examination
        from django.core.cache import cache
        c_key = f"exam_assigned_qids_v1:{examination.id}"
        cached = cache.get(c_key)
        if cached is not None:
            return cached

        if examination.question_set_id:
            res = set(examination.question_set.questions.values_list('id', flat=True))
        else:
            from .models import ExaminationQuestion
            res = set(
                ExaminationQuestion.objects
                .filter(examination=examination)
                .values_list('question_id', flat=True)
            )
        try:
            cache.set(c_key, res, 300)
        except Exception:
            pass
        return res

    def _save_answers_payload(self, attempt, answers_payload):
        if not answers_payload:
            return
        assigned_qids = self._get_examination_assigned_question_ids(attempt)

        items = []
        if isinstance(answers_payload, dict):
            for q_key, val in answers_payload.items():
                try:
                    qid = int(q_key)
                except (ValueError, TypeError):
                    continue
                if qid not in assigned_qids:
                    continue
                if isinstance(val, dict):
                    items.append({
                        'question_id': qid,
                        'selected_option': val.get('selected_option'),
                        'answer_text': val.get('answer_text', ''),
                        'answer_text_provided': 'answer_text' in val,
                    })
                else:
                    items.append({
                        'question_id': qid,
                        'selected_option': val,
                        'answer_text': '',
                        'answer_text_provided': False,
                    })
        elif isinstance(answers_payload, list):
            for item in answers_payload:
                if not isinstance(item, dict):
                    continue
                qid = item.get('question_id') or item.get('question')
                try:
                    qid = int(qid)
                except (ValueError, TypeError):
                    continue
                if qid not in assigned_qids:
                    continue
                items.append({
                    'question_id': qid,
                    'selected_option': item.get('selected_option'),
                    'answer_text': item.get('answer_text', ''),
                    'answer_text_provided': 'answer_text' in item,
                })

        if not items:
            return

        qids_to_process = {item['question_id'] for item in items}
        existing_answers = {
            ans.question_id: ans
            for ans in StudentAnswer.objects.filter(attempt=attempt, question_id__in=qids_to_process)
        }

        to_create = []
        to_update = []
        for item in items:
            qid = item['question_id']
            sel_opt = item['selected_option']
            ans_txt = item['answer_text']
            txt_prov = item['answer_text_provided']

            if qid in existing_answers:
                ans = existing_answers[qid]
                changed = False
                if ans.selected_option != sel_opt:
                    ans.selected_option = sel_opt
                    changed = True
                if txt_prov and ans.answer_text != ans_txt:
                    ans.answer_text = ans_txt
                    changed = True
                if changed:
                    to_update.append(ans)
            else:
                to_create.append(StudentAnswer(
                    attempt=attempt,
                    question_id=qid,
                    selected_option=sel_opt,
                    answer_text=ans_txt if txt_prov else '',
                ))

        if to_create:
            StudentAnswer.objects.bulk_create(to_create, ignore_conflicts=True)
        if to_update:
            StudentAnswer.objects.bulk_update(to_update, ['selected_option', 'answer_text'])

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """Save or update an answer for a specific question (or a batch of answers)."""
        attempt = self.get_object()

        if attempt.status != 'in-progress':
            detail = (
                'Time is up - this attempt has been submitted automatically.'
                if attempt.submitted_at else
                'Cannot answer - exam is not in progress.'
            )
            return Response({'detail': detail, 'status': attempt.status},
                            status=status.HTTP_400_BAD_REQUEST)

        # Support batch answer payload: {"answers": [...]} or {"answers": {...}}
        batch_answers = request.data.get('answers')
        if batch_answers:
            self._save_answers_payload(attempt, batch_answers)
            return Response({'status': 'saved', 'batch': True})

        question_id = request.data.get('question') or request.data.get('question_id')
        selected_option = request.data.get('selected_option')
        answer_text_provided = 'answer_text' in request.data
        answer_text = request.data.get('answer_text', '')

        if not question_id:
            return Response({'detail': 'Question ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question_id = int(question_id)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid Question ID.'}, status=status.HTTP_400_BAD_REQUEST)

        assigned_qids = self._get_examination_assigned_question_ids(attempt)
        if question_id not in assigned_qids:
            return Response({'detail': 'Question does not belong to this examination.'}, status=status.HTTP_400_BAD_REQUEST)

        defaults = {'selected_option': selected_option}
        if answer_text_provided:
            defaults['answer_text'] = answer_text

        student_answer, created = StudentAnswer.objects.get_or_create(
            attempt=attempt,
            question_id=question_id,
            defaults=defaults,
        )

        if not created:
            update_fields = []
            if student_answer.selected_option != selected_option:
                student_answer.selected_option = selected_option
                update_fields.append('selected_option')
            if answer_text_provided and student_answer.answer_text != answer_text:
                student_answer.answer_text = answer_text
                update_fields.append('answer_text')
            if update_fields:
                student_answer.save(update_fields=update_fields)

        return Response({'status': 'saved'})

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit the exam attempt and calculate the score.
        Idempotent: if already submitted, returns HTTP 200 OK.
        Saves any final/un-autosaved answers provided in request body.
        Thread and concurrency safe: wrapped in an atomic database transaction
        with row-level lock on the ExaminationAttempt.
        """
        attempt = self.get_object()

        with transaction.atomic():
            locked_attempt = (
                ExaminationAttempt.objects
                .select_for_update()
                .get(pk=attempt.pk)
            )

            if locked_attempt.status != 'in-progress':
                return Response({
                    'detail': 'Exam already submitted.',
                    'attempt_id': locked_attempt.id,
                    'already_submitted': True,
                    'auto_submitted': bool(locked_attempt.submitted_at and attempt_is_expired(locked_attempt)),
                }, status=status.HTTP_200_OK)

            # Save any in-memory answers included in the submit payload before finalizing
            answers_payload = request.data.get('answers') if isinstance(request.data, dict) else None
            if answers_payload:
                self._save_answers_payload(locked_attempt, answers_payload)

            finalize_attempt(locked_attempt)
            from core.views import invalidate_student_dashboard
            invalidate_student_dashboard(request.user.id)
            cache.delete(f"att_questions_v1:{locked_attempt.id}:secure")
            cache.delete(f"att_questions_v1:{locked_attempt.id}:review")
            cache.delete(f"std_att_result:{request.user.id}:{locked_attempt.id}")
            cache.delete(f"student_exam_detail_v1:{request.user.id}:{locked_attempt.examination_id}")

            return Response({
                'detail': 'Exam submitted successfully.',
                'attempt_id': locked_attempt.id,
                'already_submitted': False,
                'auto_submitted': False,
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def result(self, request, pk=None):
        """View results if visibility allows."""
        att_id = pk or self.kwargs.get('pk')
        if att_id:
            cache_key = f"std_att_result:{request.user.id}:{att_id}"
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return Response(cached_result)

        attempt = self.get_object()
        
        if attempt.status in ('in-progress', 'upload_pending'):
            return Response({'detail': 'Exam not yet submitted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .attempt_timing import is_subjective_exam
        is_subj = is_subjective_exam(attempt)

        # For subjective exams, never expose results until published
        if is_subj:
            if hasattr(attempt, 'subjective_submission') and not attempt.subjective_submission.is_published:
                return Response(
                    {'detail': 'Your subjective answers are currently being evaluated. Results will be published once evaluation is complete.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif not hasattr(attempt, 'subjective_submission') and attempt.status != 'evaluated':
                return Response(
                    {'detail': 'Your subjective answers are currently being evaluated. Results will be published once evaluation is complete.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # For objective exams with restricted visibility:
            if attempt.examination.result_visibility == 'manual' and attempt.status != 'evaluated':
                return Response({'detail': 'Result pending manual review.'}, status=status.HTTP_403_FORBIDDEN)
                
            if attempt.examination.result_visibility == 'after_end':
                if attempt.examination.end_time and timezone.now() < attempt.examination.end_time:
                    return Response({'detail': 'Result will be available after the exam window ends.'}, status=status.HTTP_403_FORBIDDEN)

        # Cache check for finalized results
        cache_key = f"std_att_result:{request.user.id}:{attempt.id}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return Response(cached_result)

        # Lazy prefetch answers and evaluations only when visibility confirmed
        from django.db.models import Prefetch, prefetch_related_objects
        from .models import StudentAnswer
        prefetch_related_objects(
            [attempt],
            'subjective_submission__evaluator',
            'subjective_submission__question_scores',
            'subjective_submission__checking_requests',
            Prefetch(
                'answers',
                queryset=StudentAnswer.objects.select_related(
                    'question',
                    'question__subject',
                    'question__topic',
                    'question__chapter',
                    'question__chapter__subject',
                    'question__topic__chapter__subject'
                )
            )
        )

        serializer = self.get_serializer(attempt)
        data = serializer.data

        # Cache finalized results for 15 minutes
        if attempt.status == 'evaluated' or (not is_subj and attempt.status == 'submitted'):
            try:
                cache.set(cache_key, data, 900)
            except Exception:
                pass

        return Response(data)

    @action(detail=True, methods=['get', 'post'], url_path='answer-sheet')
    def answer_sheet(self, request, pk=None):
        if request.method == 'GET':
            return self.get_answer_sheet(request, pk)
        return self.upload_answer_sheet(request, pk)

    def upload_answer_sheet(self, request, pk=None):
        attempt = self.get_object()
        from .attempt_timing import is_subjective_exam, is_subjective_upload_open
        from .subjective_service import SubjectivePdfService
        from .models import SubjectiveSubmission, SubjectiveSubmissionPage

        if not is_subjective_exam(attempt):
            return Response(
                {'detail': 'Answer sheet upload is only supported for Subjective Examinations.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce server-authoritative upload deadline
        if not is_subjective_upload_open(attempt):
            return Response(
                {'detail': 'The answer sheet upload window has closed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Retrieve files
        uploaded_files = request.FILES.getlist('images') or request.FILES.getlist('files')
        single_pdf = request.FILES.get('pdf_file') or request.FILES.get('file')

        # If a single file was passed under 'images' or 'files' but it's a PDF, treat it as single_pdf
        if not single_pdf and uploaded_files and len(uploaded_files) == 1:
            first_f = uploaded_files[0]
            first_name = first_f.name.lower()
            first_f.seek(0)
            header_sample = first_f.read(10)
            first_f.seek(0)
            if first_name.endswith('.pdf') or header_sample.startswith(b'%PDF-') or getattr(first_f, 'content_type', '') in ['application/pdf', 'application/x-pdf']:
                single_pdf = first_f
                uploaded_files = []

        if not uploaded_files and not single_pdf:
            return Response(
                {'detail': 'Please provide at least one answer sheet image or a PDF file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate max upload size
        max_mb = getattr(attempt.examination, 'max_upload_size_mb', 50) or 50
        max_bytes = max_mb * 1024 * 1024

        submission, _ = SubjectiveSubmission.objects.get_or_create(attempt=attempt)
        submission.status = 'processing'
        submission.save(update_fields=['status'])

        try:
            if single_pdf:
                if single_pdf.size < 100:
                    submission.status = 'processing_failed'
                    submission.save(update_fields=['status'])
                    return Response(
                        {'detail': 'The uploaded PDF file is empty or corrupted.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if single_pdf.size > max_bytes:
                    submission.status = 'processing_failed'
                    submission.save(update_fields=['status'])
                    return Response(
                        {'detail': f'File exceeds maximum allowed upload size of {max_mb}MB.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                content_file, page_count, total_bytes = SubjectivePdfService.validate_and_process_pdf(single_pdf)
                submission.pages.all().delete()
            else:
                total_size = sum(f.size for f in uploaded_files)
                if total_size > max_bytes:
                    submission.status = 'processing_failed'
                    submission.save(update_fields=['status'])
                    return Response(
                        {'detail': f'Total upload size exceeds maximum limit of {max_mb}MB.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Sort by page order if page_order is provided
                page_order_str = request.data.get('page_order')
                if page_order_str:
                    try:
                        import json
                        if isinstance(page_order_str, str) and page_order_str.startswith('['):
                            order_list = json.loads(page_order_str)
                        else:
                            order_list = [x.strip() for x in page_order_str.split(',') if x.strip()]
                        file_map = {f.name: f for f in uploaded_files}
                        ordered_files = [file_map[name] for name in order_list if name in file_map]
                        for f in uploaded_files:
                            if f not in ordered_files:
                                ordered_files.append(f)
                        uploaded_files = ordered_files
                    except Exception:
                        pass

                images_data = []
                for f in uploaded_files:
                    f.seek(0)
                    images_data.append((f.name, f))

                content_file, page_count, total_bytes = SubjectivePdfService.process_and_merge_images(images_data)

                # Save individual pages
                submission.pages.all().delete()
                for idx, (fname, file_obj) in enumerate(images_data):
                    file_obj.seek(0)
                    ext = os.path.splitext(fname)[1].lower()
                    if not ext or ext not in ['.jpg', '.jpeg', '.png', '.webp', '.pdf']:
                        ext = '.jpg'
                    file_obj.name = f"page_{idx+1:03d}{ext}"
                    SubjectiveSubmissionPage.objects.create(
                        submission=submission,
                        page_number=idx + 1,
                        image_file=file_obj,
                        file_size_bytes=file_obj.size,
                    )

            submission.answer_pdf = content_file
            submission.page_count = page_count
            submission.file_size_bytes = total_bytes
            submission.status = 'processing'
            submission.ocr_status = 'processing'
            submission.evaluation_status = 'ocr_processing'
            submission.save()

            now = timezone.now()
            attempt.status = 'submitted'
            attempt.submitted_at = now
            if attempt.started_at:
                attempt.time_taken_seconds = max(0, int((now - attempt.started_at).total_seconds()))
            attempt.save(update_fields=['status', 'submitted_at', 'time_taken_seconds'])

            # Send notification to admins upon successful answer sheet submission
            try:
                from core.notification_service import NotificationService
                NotificationService.notify_admins_subjective_submission(submission)
            except Exception as notif_err:
                import logging
                logging.getLogger(__name__).warning("Failed to send admin subjective submission notification: %s", notif_err)

            # Trigger background OCR and rule-based evaluation reliably
            from .tasks import dispatch_subjective_submission_processing
            task_id = dispatch_subjective_submission_processing(submission.id)
            # Invalidate cached result for this attempt
            cache.delete(f"std_att_result:{request.user.id}:{attempt.id}")

            return Response({
                'detail': 'Answer sheet uploaded and submitted successfully.',
                'submission_id': submission.id,
                'task_id': task_id,
                'page_count': page_count,
                'file_size_bytes': total_bytes,
                'attempt_status': attempt.status,
                'submission_status': submission.status,
                'ocr_status': submission.ocr_status,
                'evaluation_status': submission.evaluation_status,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            submission.status = 'processing_failed'
            submission.save(update_fields=['status'])
            return Response(
                {'detail': f'Failed to process answer sheet: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_answer_sheet(self, request, pk=None):
        attempt = self.get_object()
        if not hasattr(attempt, 'subjective_submission') or not attempt.subjective_submission.answer_pdf:
            return Response({'detail': 'No answer-sheet PDF found.'}, status=status.HTTP_404_NOT_FOUND)

        from django.http import FileResponse
        try:
            return FileResponse(attempt.subjective_submission.answer_pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({'detail': f'Could not open answer-sheet PDF: {e}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='request-checking')
    def request_checking(self, request, pk=None):
        """
        Student requests manual checking for their submitted subjective exam answer sheet.
        """
        from django.db import transaction
        from core.notification_service import NotificationService
        from .models import SubjectiveCheckingRequest

        attempt = self.get_object()
        user = request.user

        # 1. Verify student owns the submission
        if attempt.student_id != user.id:
            return Response({'detail': 'You do not have permission to request checking for this attempt.'}, status=status.HTTP_403_FORBIDDEN)

        # 2. Verify submission belongs to a Subjective Exam
        if attempt.examination.exam_type != 'subjective':
            return Response({'detail': 'Manual checking is only available for Subjective Examinations.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Verify attempt is submitted (cannot be draft, started, or in_progress)
        if attempt.status not in ('submitted', 'evaluated', 'completed'):
            return Response({'detail': 'Attempt must be submitted before requesting evaluation.'}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Verify answer sheet has been submitted successfully
        if not hasattr(attempt, 'subjective_submission') or not attempt.subjective_submission.answer_pdf:
            return Response({'detail': 'Please submit your answer sheet before requesting manual checking.'}, status=status.HTTP_400_BAD_REQUEST)

        submission = attempt.subjective_submission
        if submission.status not in ('submitted', 'evaluated', 'processing', 'under_review'):
            return Response({'detail': 'Answer sheet submission is not in a valid state for manual checking.'}, status=status.HTTP_400_BAD_REQUEST)

        from .serializers import SubjectiveCheckingRequestSerializer
        from subscriptions.entitlements import EntitlementService

        with transaction.atomic():
            # 5. Check existing active request (pending, accepted, in_progress) -> return existing
            existing_active = (
                SubjectiveCheckingRequest.objects
                .select_for_update()
                .filter(submission=submission, status__in=['pending', 'accepted', 'in_progress'])
                .first()
            )
            if existing_active:
                serializer = SubjectiveCheckingRequestSerializer(existing_active)
                return Response(serializer.data, status=status.HTTP_200_OK)

            # 6. Check if already completed -> return existing
            completed_req = SubjectiveCheckingRequest.objects.filter(submission=submission, status='completed').first()
            if completed_req:
                serializer = SubjectiveCheckingRequestSerializer(completed_req)
                return Response(serializer.data, status=status.HTTP_200_OK)

            # 7. Check subjective evaluation entitlement before creating new request
            eval_allowed, eval_reason, eval_info = EntitlementService.check_evaluation_access(user)
            if not eval_allowed:
                return Response(
                    {
                        'detail': eval_reason or "Subjective evaluation quota exhausted. Upgrade your package for more subjective checks.",
                        'feature': 'evaluation:subjective',
                        'remaining': eval_info.get('remaining', 0),
                        'upgrade_url': eval_info.get('upgrade_url', '/student/plans'),
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Create new checking request
            checking_req = SubjectiveCheckingRequest.objects.create(
                student=user,
                submission=submission,
                status='pending',
            )

            # Consume 1 subjective evaluation entitlement
            EntitlementService.consume_evaluation(user, checking_req.id)

            transaction.on_commit(lambda: NotificationService.notify_checking_request_submitted(checking_req))

        # Invalidate cached result for this attempt
        cache.delete(f"std_att_result:{user.id}:{attempt.id}")

        serializer = SubjectiveCheckingRequestSerializer(checking_req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='evaluation-request')
    def evaluation_request(self, request, pk=None):
        """Canonical endpoint alias for subjective manual checking/evaluation request."""
        return self.request_checking(request, pk=pk)

    @action(detail=True, methods=['get'], url_path='checking-status')
    def checking_status(self, request, pk=None):
        """
        Check the status of the subjective submission, OCR progress, and manual checking request.
        """
        attempt = self.get_object()
        if not hasattr(attempt, 'subjective_submission'):
            return Response({
                'has_submission': False,
                'checking_request': None,
                'status': 'no_submission',
                'submission_status': None,
                'ocr_status': 'not_started',
                'evaluation_status': 'pending',
                'is_published': False,
                'stage': 'no_submission',
                'stage_label': 'No Answer Sheet Submitted',
            })

        submission = attempt.subjective_submission
        latest_req = submission.latest_checking_request
        from .serializers import SubjectiveCheckingRequestSerializer

        # Determine user-friendly processing stage
        if submission.is_published:
            stage = 'published'
            stage_label = 'Result Published'
        elif submission.status == 'processing_failed' or submission.ocr_status == 'failed':
            stage = 'failed'
            stage_label = 'Processing Failed'
        elif submission.status == 'upload_pending':
            stage = 'uploading'
            stage_label = 'Uploading Answer Sheet'
        elif submission.evaluation_status == 'ocr_processing' or submission.ocr_status == 'processing':
            stage = 'extracting'
            stage_label = 'Extracting Handwriting (OCR)'
        elif submission.evaluation_status == 'ai_evaluating':
            stage = 'evaluating'
            stage_label = 'Evaluating Answers'
        elif submission.evaluation_status in ('needs_review', 'ai_evaluated', 'admin_confirmed') or submission.status in ('under_review', 'evaluated'):
            stage = 'awaiting_review'
            stage_label = 'Awaiting Admin Review & Publication'
        else:
            stage = 'queued'
            stage_label = 'Queued for Evaluation'

        return Response({
            'has_submission': bool(submission.answer_pdf),
            'submission_id': submission.id,
            'submission_status': submission.status,
            'ocr_status': submission.ocr_status,
            'evaluation_status': submission.evaluation_status,
            'ocr_error': submission.ocr_error or '',
            'is_published': submission.is_published,
            'page_count': submission.page_count,
            'quality_gate_passed': submission.quality_gate_passed,
            'stage': stage,
            'stage_label': stage_label,
            'checking_request': SubjectiveCheckingRequestSerializer(latest_req).data if latest_req else None,
        })


class TeacherExaminationAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Subjective evaluation queue for the canonical Examination architecture.

    Read + one write action (evaluate) rather than a full ModelViewSet -
    grading assigns marks to existing StudentAnswer rows, it never creates
    or deletes attempts. Any teacher/admin may grade any attempt (mirrors
    the existing legacy SubjectiveAnswer evaluation queue's access model -
    evaluation is a shared queue, not scoped to "your own students").
    """
    permission_classes = [IsAuthenticated, IsEvaluatorUser]
    # The 'pending' list filter below returns a plain Python list (built
    # from a per-answer check that can't be expressed as a queryset filter
    # without duplicating SUBJECTIVE_TYPES into SQL) - this queue is small
    # (submitted subjective attempts only), so pagination is skipped rather
    # than built around a list.
    pagination_class = None

    def get_serializer_class(self):
        from .serializers import (
            ExaminationAttemptEvaluationListSerializer,
            ExaminationAttemptEvaluationSerializer,
        )
        if self.action == 'list':
            return ExaminationAttemptEvaluationListSerializer
        return ExaminationAttemptEvaluationSerializer

    def get_queryset(self):
        # Only attempts on exams that actually contain a subjective question
        # belong in this queue - a pure-MCQ attempt is already fully scored.
        qs = (
            ExaminationAttempt.objects
            .filter(
                status__in=['submitted', 'evaluated'],
                examination__exam_type='subjective',
            )
            .select_related('examination', 'student')
            .prefetch_related('answers__question')
            .order_by('-submitted_at')
        )
        status_param = self.request.query_params.get('status')
        if status_param == 'pending':
            # Can't filter "has an ungraded subjective answer" in the DB
            # without duplicating the SUBJECTIVE_TYPES check into a query -
            # this queue is small enough (submitted subjective attempts
            # only) that an in-Python filter here is simpler and correct.
            qs = [a for a in qs if any(
                ans.question.question_type in Question.SUBJECTIVE_TYPES and ans.evaluated_at is None
                for ans in a.answers.all()
            )]
        return qs

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """
        Body: {"answers": [{"answer_id": 1, "marks_awarded": 8}, ...]}
        Each answer_id must belong to this attempt and be a subjective
        question - MCQ answers are auto-graded and cannot be overridden here.
        """
        attempt = self.get_object()
        entries = request.data.get('answers', [])
        if not entries:
            return Response({'detail': 'answers is required.'}, status=status.HTTP_400_BAD_REQUEST)

        answers_by_id = {a.id: a for a in attempt.answers.select_related('question').all()}
        now = timezone.now()
        updated = 0

        for entry in entries:
            answer_id = entry.get('answer_id')
            marks = entry.get('marks_awarded')
            answer = answers_by_id.get(answer_id)
            if not answer or marks is None:
                continue
            if answer.question.question_type not in Question.SUBJECTIVE_TYPES:
                return Response(
                    {'detail': f'Question {answer.question_id} is objective and auto-graded - it cannot be manually evaluated.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                marks = float(marks)
            except (TypeError, ValueError):
                return Response({'detail': f'Invalid marks_awarded for answer {answer_id}.'}, status=status.HTTP_400_BAD_REQUEST)
            if marks < 0 or marks > answer.question.marks:
                return Response(
                    {'detail': f'marks_awarded for answer {answer_id} must be between 0 and {answer.question.marks}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            answer.marks_awarded = marks
            answer.evaluated_at = now
            answer.save(update_fields=['marks_awarded', 'evaluated_at'])
            updated += 1

        if updated == 0:
            return Response({'detail': 'No valid answers to evaluate.'}, status=status.HTTP_400_BAD_REQUEST)

        recompute_after_evaluation(attempt)
        serializer_class = self.get_serializer_class()
        return Response(serializer_class(attempt, context={'request': request}).data)


def _get_leaderboard_queryset(request):
    exam_id_param = request.query_params.get('exam', 'all')
    time_filter = request.query_params.get('time_filter', 'all')
    ranking_type = request.query_params.get('ranking_type', 'overall')
    search_query = request.query_params.get('search', '').strip()

    now = timezone.now()
    exam_qs = ExaminationAttempt.objects.filter(status__in=['submitted', 'evaluated'])

    if exam_id_param != 'all':
        exam_qs = exam_qs.filter(examination_id=exam_id_param)

    if time_filter == 'year':
        exam_qs = exam_qs.filter(submitted_at__year=now.year)
    elif time_filter == 'month':
        exam_qs = exam_qs.filter(submitted_at__year=now.year, submitted_at__month=now.month)
    elif time_filter == 'week':
        exam_qs = exam_qs.filter(submitted_at__gte=now - timezone.timedelta(days=7))

    if search_query:
        exam_qs = exam_qs.filter(
            Q(student__username__icontains=search_query) |
            Q(student__first_name__icontains=search_query) |
            Q(student__last_name__icontains=search_query)
        )

    # Database-level aggregation across attempts per student
    agg_qs = exam_qs.values(
        'student_id',
        'student__username',
        'student__first_name',
        'student__last_name',
        'student__avatar',
        'student__student_profile__show_leaderboard',
    ).annotate(
        total_exams=Count('id'),
        best_score=Max('score'),
        best_percentage=Max('percentage'),
        avg_percentage=Avg('percentage'),
    )

    if ranking_type == 'overall':
        agg_qs = agg_qs.order_by('-avg_percentage', '-best_score', '-total_exams', 'student_id')
    else:
        agg_qs = agg_qs.order_by('-best_percentage', '-best_score', '-total_exams', 'student_id')

    return agg_qs, ranking_type


def _build_leaderboard_data(request):
    """
    Build a leaderboard from ExaminationAttempt using database-side aggregation.
    """
    exam_id_param = request.query_params.get('exam', 'all')
    time_filter = request.query_params.get('time_filter', 'all')
    ranking_type = request.query_params.get('ranking_type', 'overall')
    search_query = request.query_params.get('search', '').strip()

    cache_key = 'leaderboard_v3:' + '|'.join([exam_id_param, time_filter, ranking_type, search_query])
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    agg_qs, r_type = _get_leaderboard_queryset(request)
    rows = list(agg_qs)

    current_user_id = getattr(getattr(request, 'user', None), 'id', None)
    ranked = []
    current_rank = 0
    prev_key = None

    for i, s in enumerate(rows):
        pct_field = 'avg_percentage' if r_type == 'overall' else 'best_percentage'
        pct_val = s.get(pct_field) or 0.0
        score_val = s.get('best_score') or 0.0
        sort_key = (round(pct_val, 4), round(score_val, 4))
        if sort_key != prev_key:
            current_rank = i + 1
            prev_key = sort_key

        sid = s['student_id']
        show_lb = s.get('student__student_profile__show_leaderboard')
        if show_lb is False and sid != current_user_id:
            display_name = "Anonymous Aspirant"
            avatar = None
        else:
            first_name = s.get('student__first_name') or ''
            last_name = s.get('student__last_name') or ''
            full_name = f"{first_name} {last_name}".strip()
            display_name = full_name if full_name else (s.get('student__username') or 'Student')
            avatar = s.get('student__avatar')

        ranked.append({
            'rank': current_rank,
            'student_id': sid,
            'student_name': display_name,
            'profile_image': avatar,
            'score': round(score_val, 2),
            'percentage': round(pct_val, 2),
            'total_exams': s.get('total_exams') or 1,
        })

    cache.set(cache_key, ranked, 60)
    return ranked


class LeaderboardViewSet(viewsets.ViewSet):
    """
    Provides leaderboard rankings for students based on ExaminationAttempt data.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def list(self, request):
        try:
            ranked = _build_leaderboard_data(request)
        except Exception as e:
            return Response({'detail': f'Error building leaderboard: {str(e)}'}, status=500)

        try:
            page = max(int(request.query_params.get('page', 1)), 1)
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = max(min(int(request.query_params.get('page_size', 20)), 100), 1)
        except (TypeError, ValueError):
            page_size = 20

        start = (page - 1) * page_size
        end = start + page_size

        count = len(ranked)
        paginated = ranked[start:end]

        # Consolidated single-trip return of current_user & summary stats
        user_id = getattr(getattr(request, 'user', None), 'id', None)
        current_user_item = next((item for item in ranked if item['student_id'] == user_id), None)

        avg_pct = 0.0
        highest_pct = 0.0
        if count > 0:
            percentages = [item['percentage'] for item in ranked]
            avg_pct = sum(percentages) / count
            highest_pct = max(percentages)

        summary = {
            'totalParticipants': count,
            'averageScore': round(avg_pct, 1),
            'highestScore': round(highest_pct, 1),
        }

        return Response({
            'count': count,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, (count + page_size - 1) // page_size),
            'next': page + 1 if end < count else None,
            'previous': page - 1 if page > 1 else None,
            'current_user': current_user_item,
            'summary': summary,
            'results': paginated,
        })

    @action(detail=False, methods=['get'], url_path='my-rank')
    def my_rank(self, request):
        try:
            ranked = _build_leaderboard_data(request)
        except Exception as e:
            return Response({'detail': f'Error building leaderboard: {str(e)}'}, status=500)

        user_id = request.user.id
        my_item = next((item for item in ranked if item['student_id'] == user_id), None)

        if not my_item:
            return Response({'detail': 'No ranking data available for current user.'}, status=404)

        return Response(my_item)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            ranked = _build_leaderboard_data(request)
        except Exception as e:
            return Response({'detail': f'Error building stats: {str(e)}'}, status=500)

        total_participants = len(ranked)
        avg_pct = 0.0
        highest_pct = 0.0

        if total_participants > 0:
            percentages = [item['percentage'] for item in ranked]
            avg_pct = sum(percentages) / total_participants
            highest_pct = max(percentages)

        return Response({
            'totalParticipants': total_participants,
            'averageScore': round(avg_pct, 1),
            'highestScore': round(highest_pct, 1),
        })

    @action(detail=False, methods=['get'])
    def trend(self, request):
        """
        Returns recent score trend for the authenticated student.
        """
        user = request.user
        attempts = (
            ExaminationAttempt.objects.filter(
                student=user,
                status__in=['submitted', 'evaluated'],
            )
            .select_related('examination')
            .order_by('started_at')[:30]
        )

        data = []
        for att in attempts:
            d_str = str(att.started_at.date()) if att.started_at else ''
            title = att.examination.title if att.examination else 'Exam'
            data.append({
                'date': d_str,
                'label': title[:12] if title else d_str,
                'score': round(att.score or 0.0, 1),
                'percentage': round(att.percentage or 0.0, 1),
            })

        return Response(data)
class CalmSessionLogView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    
    def post(self, request):
        event_type = request.data.get('event_type')
        meta_data = request.data.get('meta_data', {})
        
        if not event_type:
            return Response({'detail': 'event_type is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        CalmSessionLog.objects.create(
            student=request.user,
            event_type=event_type,
            meta_data=meta_data
        )
        return Response({'status': 'logged'})
