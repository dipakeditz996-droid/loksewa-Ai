from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Avg
from django.utils import timezone
import copy

from exams.models import Examination, ExaminationAttempt, QuestionSet
from .exam_serializers import ExaminationSerializer, ExaminationAttemptSerializer
from .examination_question_views import ExaminationQuestionMixin

class ExaminationViewSet(ExaminationQuestionMixin, viewsets.ModelViewSet):
    queryset = Examination.objects.all().select_related('category', 'exam', 'subject', 'question_set').order_by('-created_at')
    serializer_class = ExaminationSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        exam = self.get_object()
        was_published = exam.status == 'published'
        old_start = exam.start_time
        old_end = exam.end_time

        instance = serializer.save()

        if was_published and instance.status == 'published' and (
            instance.start_time != old_start or instance.end_time != old_end
        ):
            from core.notification_service import NotificationService
            NotificationService.notify_students_exam_update(instance, 'schedule_changed')

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        exam = self.get_object()
        new_exam = copy.copy(exam)
        new_exam.pk = None
        new_exam.title = f"Copy of {exam.title}"
        new_exam.status = 'draft'
        new_exam.created_by = request.user
        new_exam.save()
        
        # Copy eligibility rules
        for rule in exam.eligibility_rules.all():
            rule.pk = None
            rule.examination = new_exam
            rule.save()
            
        serializer = self.get_serializer(new_exam)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        exam = self.get_object()
        
        # Questions come from the canonical ExaminationQuestion assignment, not
        # from a QuestionSet — the builder attaches them directly.
        assigned = exam.examination_questions.count()

        errors = []
        if not exam.title or not exam.title.strip():
            errors.append("The exam needs a title.")
        if not exam.category_id or not exam.exam_id:
            errors.append("Academic targeting is incomplete: choose a category and a position.")
        if assigned < 1:
            errors.append("Add at least one question before publishing.")
        if exam.time_limit < 1:
            errors.append("Time Limit must be greater than 0.")
        if exam.total_marks < 1:
            errors.append("Total Marks must be greater than 0.")
        if exam.passing_marks and exam.passing_marks > exam.total_marks:
            errors.append("Passing Marks cannot exceed Total Marks.")
        if exam.start_time and exam.end_time and exam.end_time <= exam.start_time:
            errors.append("The end time must come after the start time.")
        if exam.total_questions and assigned < exam.total_questions:
            errors.append(
                f"This exam targets {exam.total_questions} question(s) but only {assigned} "
                f"are assigned."
            )

        if errors:
            return Response(
                {"error": "Cannot publish exam.", "details": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 'published' is the only valid published state in Examination.STATUS_CHOICES;
        # scheduling is expressed by start_time/end_time, not by extra statuses.
        exam.status = 'published'
        exam.save(update_fields=['status', 'updated_at'])

        from core.notification_service import NotificationService
        NotificationService.notify_students_exam_update(exam, 'published')

        serializer = self.get_serializer(exam)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        exam = self.get_object()
        # Archiving a still-upcoming/live exam is a real cancellation the
        # students it was visible to need to hear about. Archiving one that
        # already finished is routine cleanup — computed_status is 'COMPLETED'
        # by then, so no notification fires.
        was_cancellation = exam.status == 'published' and exam.computed_status in ('UPCOMING', 'LIVE')
        exam.status = 'archived'
        exam.save()

        if was_cancellation:
            from core.notification_service import NotificationService
            NotificationService.notify_students_exam_update(exam, 'cancelled')

        serializer = self.get_serializer(exam)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Student's-eye view of the exam, built from its assigned questions."""
        exam = self.get_object()

        rows = exam.examination_questions.select_related('question').order_by('order', 'id')
        if not rows.exists():
            return Response(
                {"error": "This exam has no questions assigned yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Correct answers are deliberately omitted — this mirrors what a student sees.
        questions = [{
            'id': row.question.id,
            'question_id': row.question.question_id,
            'text': row.question.text,
            'question_type': row.question.question_type,
            'difficulty': row.question.difficulty,
            'option_a': row.question.option_a,
            'option_b': row.question.option_b,
            'option_c': row.question.option_c,
            'option_d': row.question.option_d,
            'marks': row.marks,
            'order': row.order,
        } for row in rows]

        return Response({
            'title': exam.title,
            'instructions': exam.instructions,
            'time_limit': exam.time_limit,
            'total_marks': exam.total_marks,
            'total_questions': len(questions),
            'questions': questions,
        })


    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        from exams.analytics_utils import build_examination_analytics
        exam = self.get_object()
        return Response(build_examination_analytics(exam))

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        from django.core.paginator import Paginator
        from django.db.models import Count, Q, F, Window
        from django.db.models.functions import Rank
        
        exam = self.get_object()
        
        # Using Window function for rank
        attempts = exam.attempts.select_related('student').annotate(
            correct_answers=Count('answers', filter=Q(answers__is_correct=True)),
            skipped_answers=Count('answers', filter=Q(answers__selected_option__isnull=True)),
            incorrect_answers=Count('answers', filter=Q(answers__is_correct=False) & Q(answers__selected_option__isnull=False)),
            rank=Window(
                expression=Rank(),
                order_by=[F('score').desc(), F('time_taken_seconds').asc()]
            )
        )
        
        # We need a subquery or a python sort if we filter after window function? 
        # Actually window function rank is computed over the entire queryset. 
        # If we filter the queryset, the rank is recomputed for the filtered subset.
        # This is correct if we want rank among the filtered subset.
        # If we want global rank, we should compute it first or do it in python.
        # For simplicity, Django's Window function computes it on the current QuerySet.
        
        # Filtering
        status_filter = request.query_params.get('status')
        if status_filter:
            attempts = attempts.filter(status=status_filter)
            
        passed_filter = request.query_params.get('passed')
        if passed_filter is not None:
            passed = passed_filter.lower() == 'true'
            attempts = attempts.filter(passed=passed)
            
        search = request.query_params.get('search')
        if search:
            attempts = attempts.filter(
                Q(student__first_name__icontains=search) | 
                Q(student__last_name__icontains=search) |
                Q(student__email__icontains=search) |
                Q(student__username__icontains=search)
            )
            
        ordering = request.query_params.get('ordering', '-score')
        if ordering:
            attempts = attempts.order_by(ordering, 'time_taken_seconds')
            
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        paginator = Paginator(attempts, page_size)
        
        try:
            current_page = paginator.page(page)
        except Exception:
            return Response({"results": [], "count": 0})
            
        results = []
        for attempt in current_page.object_list:
            results.append({
                "id": attempt.id,
                "student_id": attempt.student.id,
                "student_name": f"{attempt.student.first_name} {attempt.student.last_name}".strip() or attempt.student.username,
                "email": attempt.student.email,
                "started_at": attempt.started_at,
                "submitted_at": attempt.submitted_at,
                "status": attempt.status,
                "score": attempt.score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "time_taken_seconds": attempt.time_taken_seconds,
                "correct_answers": attempt.correct_answers,
                "incorrect_answers": attempt.incorrect_answers,
                "skipped_answers": attempt.skipped_answers,
                "rank": attempt.rank if attempt.status == 'evaluated' else None
            })
            
        return Response({
            "count": paginator.count,
            "num_pages": paginator.num_pages,
            "current_page": page,
            "results": results
        })
