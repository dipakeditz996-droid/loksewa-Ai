from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from .models import Examination, ExaminationAttempt, StudentAnswer, Question
from .attempt_timing import (
    attempt_remaining_seconds,
    attempt_is_expired,
    enforce_expiry,
    finalize_attempt,
)
from .student_serializers import (
    StudentExaminationSerializer, 
    StudentExaminationAttemptSerializer, 
    StudentExaminationResultSerializer,
    StudentExaminationAttemptListSerializer,
    StudentSecureQuestionSerializer,
    StudentLeaderboardSerializer
)
from core.pagination import StandardResultsSetPagination
from django.db.models import F, Window, Sum, Avg, Max, Count, FloatField, ExpressionWrapper
from django.db.models.functions import DenseRank

class StudentExaminationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for students to view available exams and start them.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StudentExaminationSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Enforce Enrollment Access Control
        from courses.models import Enrollment
        active_courses = Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True)
        
        # Get published and live exams, filtering out exams that are restricted to a course the student is not enrolled in
        from django.db.models import Q
        base_qs = Examination.objects.filter(status__in=['published', 'live']).filter(Q(course__isnull=True) | Q(course_id__in=active_courses))
        return base_qs.filter(Q(exam_type='custom', created_by=user) | ~Q(exam_type='custom'))
        
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

        if examination.status not in ['published', 'live']:
            return Response(
                {'detail': 'Exam is not currently active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
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

        with transaction.atomic():
            # Lock this student's rows for this exam so two tabs racing on
            # "Start" cannot both create an attempt.
            active_attempt = (
                ExaminationAttempt.objects
                .select_for_update()
                .filter(examination=examination, student=user, status='in-progress')
                .first()
            )

            # allow_resume used to be stored but never read — leaving mid-exam
            # and coming back always silently continued regardless of the
            # flag. Live Exams additionally forbid resume unconditionally
            # (the category's "no pause/restart" rule), not left to the
            # per-exam checkbox.
            resume_allowed = examination.allow_resume and examination.objective_category != 'live'

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

            attempt = ExaminationAttempt.objects.create(
                examination=examination,
                student=user,
                status='in-progress',
            )

        serializer = StudentExaminationAttemptSerializer(attempt)
        return Response(
            {**serializer.data, 'resumed': False},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='active-attempt')
    def active_attempt(self, request, pk=None):
        """The student's in-progress attempt for this exam, if any."""
        examination = self.get_object()
        attempt = ExaminationAttempt.objects.filter(
            examination=examination, student=request.user, status='in-progress'
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
        from exams.models import ExamCategory
        categories = ExamCategory.objects.filter(is_active=True).prefetch_related(
            'exams', 'exams__papers', 'exams__papers__subjects', 
            'exams__papers__subjects__chapters', 'exams__papers__subjects__chapters__topics'
        )
        tree = []
        for cat in categories:
            cat_data = {
                'id': cat.id, 'name': cat.name, 'is_active': cat.is_active, 'exams': []
            }
            for exam in cat.exams.filter(is_active=True):
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
        from exams.models import Question
        q_filter = self._build_question_filter(request.data)
        count = Question.objects.filter(q_filter).count()
        return Response({'available': count})

    @action(detail=False, methods=['post'])
    def generate_custom(self, request):
        from exams.models import ExaminationQuestion, Question, Exam
        from django.db import transaction

        exam_id = request.data.get('exam_id')
        category_id = request.data.get('category_id')
        num_questions = int(request.data.get('question_count', 20))
        random_questions = request.data.get('random_questions', True)

        if not exam_id and not category_id:
            return Response({'detail': 'exam_id or category_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        q_filter = self._build_question_filter(request.data)

        try:
            with transaction.atomic():
                qs = Question.objects.filter(q_filter)
                available = qs.count()

                if num_questions > available:
                    return Response({
                        'detail': f'Only {available} questions are available for your selected criteria.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if random_questions:
                    questions = list(qs.order_by('?')[:num_questions])
                else:
                    questions = list(qs.order_by('id')[:num_questions])

                # Examination.exam is a required FK to one Position/Level, but
                # a category-wide "full syllabus" exam spans every position
                # under that category - there's no single exam to point at.
                # Fall back to whichever exam the first selected question
                # actually belongs to (purely for display; the real content
                # is the ExaminationQuestion rows below). This also fixes the
                # exam's `category` always being ExamCategory.objects.first()
                # regardless of what was actually selected.
                if exam_id:
                    resolved_exam = Exam.objects.get(id=exam_id)
                else:
                    first_question = questions[0] if questions else None
                    resolved_exam = (
                        first_question.topic.chapter.subject.paper.exam
                        if first_question else
                        Exam.objects.filter(category_id=category_id).first()
                    )
                    if not resolved_exam:
                        return Response({'detail': 'No exam found under this category.'}, status=status.HTTP_400_BAD_REQUEST)

                custom_exam = Examination.objects.create(
                    title=f"Custom Exam - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                    exam_type='custom',
                    objective_category='custom',
                    category=resolved_exam.category,
                    exam=resolved_exam,
                    total_questions=len(questions),
                    time_limit=len(questions),
                    total_marks=len(questions),
                    passing_marks=len(questions) * 0.4,
                    status='published',
                    created_by=request.user
                )

                exam_questions = [
                    ExaminationQuestion(examination=custom_exam, question=q, order=i, marks=1)
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

class StudentExaminationAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for students to manage their active and past attempts.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StudentExaminationAttemptSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        qs = ExaminationAttempt.objects.filter(
            student=self.request.user
        ).select_related('examination').prefetch_related('answers')
        
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentExaminationAttemptListSerializer
        if self.action == 'result':
            return StudentExaminationResultSerializer
        return super().get_serializer_class()

    def get_object(self):
        """
        Every read of an attempt first settles its clock. A tab left open past
        the deadline therefore sees a submitted attempt, not a running one.
        """
        attempt = super().get_object()
        enforce_expiry(attempt)
        return attempt

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        All still-running attempts for the current student.

        The Focus Mode context calls this on mount so a refresh, a reopened
        tab, or a second device re-applies exam focus from server state rather
        than from anything the browser remembered.
        """
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
        """
        attempt = self.get_object()
        return Response({
            'id': attempt.id,
            'status': attempt.status,
            'is_active': attempt.status == 'in-progress',
            'is_expired': attempt_is_expired(attempt),
            'remaining_seconds': attempt_remaining_seconds(attempt),
            'server_time': timezone.now().isoformat(),
        })


    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Returns the questions for this attempt without the correct answers."""
        attempt = self.get_object()
        examination = attempt.examination
        
        # Get questions depending on whether it's from a question_set or directly mapped
        if examination.question_set:
            questions = examination.question_set.questions.all()
        else:
            # Direct mapping via ExaminationQuestion, ordered the way the
            # exam was authored (this used to unconditionally return
            # Question.objects.none() here, so any exam built by attaching
            # questions directly - rather than via a QuestionSet - showed
            # "No questions found" despite having real, approved questions).
            from .models import ExaminationQuestion
            question_ids = list(
                ExaminationQuestion.objects
                .filter(examination=examination)
                .order_by('order', 'id')
                .values_list('question_id', flat=True)
            )
            questions = sorted(
                Question.objects.filter(id__in=question_ids),
                key=lambda q: question_ids.index(q.id),
            )

        # Old Past Exams must reproduce the original paper exactly — shuffling
        # is hard-blocked for that category regardless of the admin flag.
        # For everything else, shuffle deterministically per attempt (seeded
        # on the attempt id) so the order is stable across reloads/Next
        # navigation rather than re-randomizing on every request.
        if examination.randomize_questions and examination.objective_category != 'old_past':
            import random
            random.Random(attempt.id).shuffle(questions)

        serializer = StudentSecureQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """Save or update an answer for a specific question."""
        attempt = self.get_object()

        if attempt.status != 'in-progress':
            detail = (
                'Time is up - this attempt has been submitted automatically.'
                if attempt.submitted_at else
                'Cannot answer - exam is not in progress.'
            )
            return Response({'detail': detail, 'status': attempt.status},
                            status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get('question')
        selected_option = request.data.get('selected_option')
        
        if not question_id:
            return Response({'detail': 'Question ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            question = Question.objects.get(pk=question_id)
        except Question.DoesNotExist:
            return Response({'detail': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        student_answer, created = StudentAnswer.objects.get_or_create(
            attempt=attempt,
            question=question,
            defaults={'selected_option': selected_option}
        )
        
        if not created:
            student_answer.selected_option = selected_option
            student_answer.save()
            
        return Response({'status': 'saved'})

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit the exam attempt and calculate the score.

        Scoring lives in attempt_timing.finalize_attempt so that a manual
        submit and an automatic expiry cannot drift apart, and so a second tab
        pressing Submit is a harmless no-op instead of an error.
        """
        attempt = self.get_object()

        if attempt.status != 'in-progress':
            # get_object() may have just auto-submitted an expired attempt;
            # from the student's point of view that is a success.
            if attempt.submitted_at:
                return Response({
                    'detail': 'Exam submitted.',
                    'attempt_id': attempt.id,
                    'auto_submitted': True,
                })
            return Response({'detail': 'Exam already submitted.'},
                            status=status.HTTP_400_BAD_REQUEST)

        finalize_attempt(attempt)

        return Response({
            'detail': 'Exam submitted successfully.',
            'attempt_id': attempt.id,
            'auto_submitted': False,
        })

    @action(detail=True, methods=['get'])
    def result(self, request, pk=None):
        """View results if visibility allows."""
        attempt = self.get_object()
        
        if attempt.status == 'in-progress':
            return Response({'detail': 'Exam not yet submitted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if attempt.examination.result_visibility == 'manual' and attempt.status != 'evaluated':
            return Response({'detail': 'Result pending manual review.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = self.get_serializer(attempt)
        return Response(serializer.data)


def _build_leaderboard_data(request):
    """
    Build a leaderboard from ExaminationAttempt.

    Strategy:
    - Include status 'submitted' or 'evaluated'
    - Best attempt per student per exam is used
    - Returns a list of dicts with student info and ranking data
    """
    exam_id_param = request.query_params.get('exam', 'all')
    time_filter = request.query_params.get('time_filter', 'all')
    ranking_type = request.query_params.get('ranking_type', 'overall')
    search_query = request.query_params.get('search', '').strip()

    now = timezone.now()
    
    # ---- ExaminationAttempt ----
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
            student__username__icontains=search_query
        ) | exam_qs.filter(
            student__first_name__icontains=search_query
        ) | exam_qs.filter(
            student__last_name__icontains=search_query
        )

    # Build per-student aggregated data
    # Key: student_id -> best stats
    student_map = {}
    
    def _get_display_name(student):
        name = f"{student.first_name} {student.last_name}".strip()
        return name if name else student.username
    
    # Process ExaminationAttempt (best attempt = highest percentage per student)
    for attempt in exam_qs.select_related('student', 'examination'):
        sid = attempt.student.id
        total_marks = attempt.examination.total_marks or 100
        pct = attempt.percentage if attempt.percentage is not None else 0
        score = attempt.score if attempt.score is not None else 0
        
        if sid not in student_map:
            student_map[sid] = {
                'student_id': sid,
                'student_name': _get_display_name(attempt.student),
                'profile_image': attempt.student.avatar or None,
                'best_percentage': pct,
                'best_score': score,
                'total_exams': 1,
                'avg_percentage': pct,
                'sum_percentage': pct,
            }
        else:
            student_map[sid]['total_exams'] += 1
            student_map[sid]['sum_percentage'] += pct
            student_map[sid]['avg_percentage'] = student_map[sid]['sum_percentage'] / student_map[sid]['total_exams']
            if pct > student_map[sid]['best_percentage']:
                student_map[sid]['best_percentage'] = pct
                student_map[sid]['best_score'] = score

    # Determine sort key based on ranking_type
    if ranking_type == 'overall':
        # Sort by average percentage then best_score
        students = sorted(student_map.values(), key=lambda x: (-x['avg_percentage'], -x['best_score']))
        score_field = 'avg_percentage'
    else:
        # Sort by best percentage then best_score
        students = sorted(student_map.values(), key=lambda x: (-x['best_percentage'], -x['best_score']))
        score_field = 'best_percentage'
    
    # Assign DenseRank (ties get the same rank)
    ranked = []
    current_rank = 0
    prev_key = None
    for i, s in enumerate(students):
        sort_key = (round(s['avg_percentage' if ranking_type == 'overall' else 'best_percentage'], 4), round(s['best_score'], 4))
        if sort_key != prev_key:
            current_rank = i + 1
            prev_key = sort_key
        
        ranked.append({
            'rank': current_rank,
            'student_id': s['student_id'],
            'student_name': s['student_name'],
            'profile_image': s['profile_image'],
            'score': round(s['best_score'], 2),
            'percentage': round(s['avg_percentage' if ranking_type == 'overall' else 'best_percentage'], 2),
            'total_exams': s['total_exams'],
        })
    
    return ranked


class LeaderboardViewSet(viewsets.ViewSet):
    """
    Provides leaderboard rankings for students based on ExaminationAttempt data.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        try:
            ranked = _build_leaderboard_data(request)
        except Exception as e:
            return Response({'detail': f'Error building leaderboard: {str(e)}'}, status=500)
        
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        
        count = len(ranked)
        paginated = ranked[start:end]

        return Response({
            'count': count,
            'next': page + 1 if end < count else None,
            'previous': page - 1 if page > 1 else None,
            'results': paginated
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
        avg_pct = 0
        highest_pct = 0

        if total_participants > 0:
            percentages = [item['percentage'] for item in ranked]
            avg_pct = sum(percentages) / total_participants
            highest_pct = max(percentages)

        return Response({
            'totalParticipants': total_participants,
            'averageScore': round(avg_pct, 1),
            'highestScore': round(highest_pct, 1)
        })
