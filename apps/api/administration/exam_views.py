from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg
from django.utils import timezone
import copy

from exams.models import Examination, ExaminationAttempt, QuestionSet
from .exam_serializers import ExaminationSerializer, ExaminationAttemptSerializer
from .examination_question_views import ExaminationQuestionMixin
# rest_framework.permissions.IsAdminUser checks Django's is_staff flag, which
# this app's admin accounts don't necessarily have - every other admin
# viewset here gates on role (admin/super-admin) via this app's own
# IsAdminUser instead. Using the DRF one 403'd every admin whose account
# wasn't separately flagged is_staff, silently blocking exam creation.
from .permissions import IsAdminUser, IsEvaluatorUser

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
        is_subjective_pdf = exam.exam_type == 'subjective' and bool(exam.question_paper_pdf)
        if not is_subjective_pdf and assigned < 1:
            errors.append("Add at least one question (or upload a Question Paper PDF for subjective exams) before publishing.")
        if exam.time_limit < 1:
            errors.append("Time Limit must be greater than 0.")
        if exam.total_marks < 1:
            errors.append("Total Marks must be greater than 0.")
        if exam.passing_marks and exam.passing_marks > exam.total_marks:
            errors.append("Passing Marks cannot exceed Total Marks.")
        if exam.start_time and exam.end_time and exam.end_time <= exam.start_time:
            errors.append("The end time must come after the start time.")
        if not is_subjective_pdf and exam.total_questions and assigned < exam.total_questions:
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
        # A subjective answer has no selected_option even when the student
        # wrote a full response - answer_text is what "answered" means there,
        # so "skipped" must check both or every subjective submission in a
        # Subjective Model Exam's results table reads as unattempted.
        attempts = exam.attempts.select_related('student').annotate(
            correct_answers=Count('answers', filter=Q(answers__is_correct=True)),
            skipped_answers=Count('answers', filter=Q(answers__selected_option__isnull=True) & Q(answers__answer_text='')),
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

    @action(detail=True, methods=['post'], url_path='question-paper')
    def upload_question_paper(self, request, pk=None):
        import os
        exam = self.get_object()
        file = request.FILES.get('file') or request.FILES.get('question_paper') or request.FILES.get('pdf_file')
        if not file:
            return Response({'detail': 'No PDF file was provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.lower().endswith('.pdf'):
            return Response({'detail': 'Only PDF files are accepted for the question paper.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size < 100:
            return Response({'detail': 'The uploaded PDF file is empty or corrupted.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 20 * 1024 * 1024:
            return Response({'detail': 'File size exceeds maximum allowed limit (20MB).'}, status=status.HTTP_400_BAD_REQUEST)

        content = file.read()
        if not content.startswith(b'%PDF-'):
            return Response({'detail': 'The uploaded file is not a valid PDF document (missing %PDF- header).'}, status=status.HTTP_400_BAD_REQUEST)
        page_count = max(1, content.count(b'/Type /Page\n') + content.count(b'/Type /Page\r') + content.count(b'/Type/Page'))
        file.seek(0)

        exam.question_paper_pdf = file
        exam.question_paper_page_count = page_count
        exam.question_paper_file_size = file.size
        exam.save(update_fields=['question_paper_pdf', 'question_paper_page_count', 'question_paper_file_size', 'updated_at'])

        return Response({
            'detail': 'Question paper uploaded successfully.',
            'page_count': page_count,
            'file_size': file.size,
            'filename': os.path.basename(exam.question_paper_pdf.name),
        }, status=status.HTTP_200_OK)

    @upload_question_paper.mapping.delete
    def delete_question_paper(self, request, pk=None):
        exam = self.get_object()
        if exam.question_paper_pdf:
            exam.question_paper_pdf.delete(save=False)
            exam.question_paper_pdf = None
            exam.question_paper_page_count = 0
            exam.question_paper_file_size = 0
            exam.save(update_fields=['question_paper_pdf', 'question_paper_page_count', 'question_paper_file_size', 'updated_at'])
        return Response({'detail': 'Question paper removed successfully.'})

    @upload_question_paper.mapping.get
    def get_question_paper(self, request, pk=None):
        from django.http import FileResponse
        exam = self.get_object()
        if not exam.question_paper_pdf:
            return Response({'detail': 'No question paper uploaded for this exam.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return FileResponse(exam.question_paper_pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({'detail': f'Could not open question paper: {e}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='submissions')
    def submissions(self, request, pk=None):
        from exams.models import SubjectiveSubmission
        from exams.serializers import AdminSubjectiveSubmissionListSerializer
        exam = self.get_object()
        submissions = (
            SubjectiveSubmission.objects
            .filter(attempt__examination=exam)
            .select_related('attempt', 'attempt__student', 'attempt__examination', 'evaluator')
            .order_by('-created_at')
        )
        status_param = request.query_params.get('status')
        if status_param == 'pending':
            submissions = submissions.filter(is_published=False)
        elif status_param == 'evaluated':
            submissions = submissions.filter(status='evaluated')
        elif status_param == 'published':
            submissions = submissions.filter(is_published=True)
        elif status_param and status_param != 'all':
            submissions = submissions.filter(status=status_param)

        serializer = AdminSubjectiveSubmissionListSerializer(submissions, many=True)
        return Response(serializer.data)


class AdminSubjectiveSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsEvaluatorUser]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        from django.db import models as db_models
        from exams.models import SubjectiveSubmission
        queryset = (
            SubjectiveSubmission.objects
            .select_related('attempt', 'attempt__student', 'attempt__examination', 'evaluator')
            .prefetch_related('pages', 'question_scores')
            .all()
        )
        exam_id = self.request.query_params.get('exam_id')
        if exam_id:
            queryset = queryset.filter(attempt__examination_id=exam_id)

        status_param = self.request.query_params.get('status')
        if status_param == 'pending':
            queryset = queryset.filter(is_published=False)
        elif status_param == 'evaluated':
            queryset = queryset.filter(status='evaluated')
        elif status_param == 'published':
            queryset = queryset.filter(is_published=True)
        elif status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                db_models.Q(attempt__student__username__icontains=search) |
                db_models.Q(attempt__student__email__icontains=search) |
                db_models.Q(attempt__student__first_name__icontains=search) |
                db_models.Q(attempt__student__last_name__icontains=search)
            )
        return queryset

    def get_serializer_class(self):
        from exams.serializers import AdminSubjectiveSubmissionListSerializer, AdminSubjectiveSubmissionDetailSerializer
        if self.action in ['retrieve', 'by_attempt']:
            return AdminSubjectiveSubmissionDetailSerializer
        return AdminSubjectiveSubmissionListSerializer

    @action(detail=False, methods=['get'], url_path='by-attempt/(?P<attempt_id>[^/.]+)')
    def by_attempt(self, request, attempt_id=None):
        from exams.models import SubjectiveSubmission
        from exams.serializers import AdminSubjectiveSubmissionDetailSerializer
        try:
            submission = (
                SubjectiveSubmission.objects
                .select_related('attempt', 'attempt__student', 'attempt__examination', 'evaluator')
                .prefetch_related('pages', 'question_scores')
                .get(attempt_id=attempt_id)
            )
        except SubjectiveSubmission.DoesNotExist:
            return Response({'detail': f'Submission for attempt #{attempt_id} not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminSubjectiveSubmissionDetailSerializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='answer-sheet')
    def answer_sheet(self, request, pk=None):
        from django.http import FileResponse
        submission = self.get_object()
        if not submission.answer_pdf:
            return Response({'detail': 'No answer PDF uploaded for this submission.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return FileResponse(submission.answer_pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({'detail': f'Could not open answer PDF: {e}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='ocr')
    def run_ocr(self, request, pk=None):
        from exams.ocr_service import SubjectiveOCRService
        from exams.serializers import AdminSubjectiveSubmissionDetailSerializer
        submission = self.get_object()
        SubjectiveOCRService.extract_and_transcribe_submission(submission)
        submission.refresh_from_db()
        serializer = AdminSubjectiveSubmissionDetailSerializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='update-transcription')
    def update_transcription(self, request, pk=None):
        from exams.serializers import AdminSubjectiveSubmissionDetailSerializer
        submission = self.get_object()
        extracted_text = request.data.get('extracted_text')
        if extracted_text is not None:
            submission.extracted_text = extracted_text
            submission.save(update_fields=['extracted_text', 'updated_at'])
        serializer = AdminSubjectiveSubmissionDetailSerializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='evaluate')
    def evaluate(self, request, pk=None):
        from exams.models import SubjectiveQuestionScore
        from exams.serializers import AdminSubjectiveSubmissionDetailSerializer
        from django.db import transaction

        submission = self.get_object()
        data = request.data

        # If already published, require explicit edit_published flag
        if submission.is_published and not data.get('edit_published', False):
            return Response(
                {'detail': 'This result has already been published. Please enable editing of published results to make changes.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        question_scores_data = data.get('question_scores', [])
        if not isinstance(question_scores_data, list):
            return Response({'detail': 'question_scores must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        validated_scores = []
        total_score = 0.0
        total_max = 0.0

        for idx, q_score in enumerate(question_scores_data):
            try:
                q_num = int(q_score.get('question_number', idx + 1))
            except (ValueError, TypeError):
                q_num = idx + 1

            try:
                marks_obtained = float(q_score.get('marks_obtained', 0))
            except (ValueError, TypeError):
                return Response({'detail': f'Question #{q_num}: Obtained marks must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                max_marks = float(q_score.get('max_marks', 10))
            except (ValueError, TypeError):
                return Response({'detail': f'Question #{q_num}: Maximum marks must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

            if max_marks <= 0:
                return Response({'detail': f'Question #{q_num}: Maximum marks must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

            if marks_obtained < 0:
                return Response({'detail': f'Question #{q_num}: Obtained marks cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

            if marks_obtained > max_marks:
                return Response({
                    'detail': f'Question #{q_num}: Obtained marks ({marks_obtained:g}) cannot exceed maximum marks ({max_marks:g}).'
                }, status=status.HTTP_400_BAD_REQUEST)

            feedback = str(q_score.get('feedback', '') or '').strip()
            validated_scores.append({
                'question_number': q_num,
                'marks_obtained': marks_obtained,
                'max_marks': max_marks,
                'feedback': feedback
            })
            total_score += marks_obtained
            total_max += max_marks

        with transaction.atomic():
            if 'evaluator_feedback' in data:
                submission.evaluator_feedback = str(data['evaluator_feedback'] or '').strip()
            submission.evaluator = request.user
            submission.evaluated_at = timezone.now()
            submission.status = 'evaluated'

            submission.question_scores.all().delete()
            for q in validated_scores:
                SubjectiveQuestionScore.objects.create(
                    submission=submission,
                    question_number=q['question_number'],
                    marks_obtained=q['marks_obtained'],
                    max_marks=q['max_marks'],
                    feedback=q['feedback']
                )

            attempt = submission.attempt
            attempt.score = total_score
            effective_total = total_max if total_max > 0 else float(attempt.examination.total_marks or 100)
            attempt.percentage = round((total_score / effective_total) * 100, 2) if effective_total > 0 else 0.0

            exam_total = float(attempt.examination.total_marks or 100)
            exam_pass = float(attempt.examination.passing_marks or (exam_total * 0.4))
            pass_ratio = (exam_pass / exam_total) if exam_total > 0 else 0.4
            pass_marks = effective_total * pass_ratio
            attempt.passed = total_score >= pass_marks
            attempt.status = 'evaluated'
            attempt.save(update_fields=['status', 'score', 'percentage', 'passed'])
            submission.save()

        serializer = AdminSubjectiveSubmissionDetailSerializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        from exams.serializers import AdminSubjectiveSubmissionDetailSerializer
        from core.notification_service import NotificationService
        from django.db import transaction

        submission = self.get_object()

        # Validation checks prior to publishing
        if not submission.attempt:
            return Response({'detail': 'Cannot publish: Attempt not found.'}, status=status.HTTP_400_BAD_REQUEST)
        if not submission.attempt.student:
            return Response({'detail': 'Cannot publish: Student not found.'}, status=status.HTTP_400_BAD_REQUEST)
        if not submission.attempt.examination:
            return Response({'detail': 'Cannot publish: Examination not found.'}, status=status.HTTP_400_BAD_REQUEST)

        scores = list(submission.question_scores.all())
        if not scores:
            return Response({'detail': 'Cannot publish yet: Please add and evaluate at least one question.'}, status=status.HTTP_400_BAD_REQUEST)

        for qs in scores:
            if qs.max_marks <= 0:
                return Response({'detail': f'Cannot publish: Question #{qs.question_number} maximum marks must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
            if qs.marks_obtained < 0:
                return Response({'detail': f'Cannot publish: Question #{qs.question_number} obtained marks cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
            if qs.marks_obtained > qs.max_marks:
                return Response({
                    'detail': f'Cannot publish: Question #{qs.question_number} obtained marks ({qs.marks_obtained:g}) cannot exceed maximum marks ({qs.max_marks:g}).'
                }, status=status.HTTP_400_BAD_REQUEST)

        total_max = sum(qs.max_marks for qs in scores)
        if total_max <= 0:
            return Response({'detail': 'Cannot publish: Total maximum marks must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        total_score = sum(qs.marks_obtained for qs in scores)
        percentage = round((total_score / total_max * 100), 2)

        with transaction.atomic():
            submission.is_published = True
            submission.published_at = timezone.now()
            submission.status = 'evaluated'
            submission.evaluator = request.user
            submission.save(update_fields=['is_published', 'published_at', 'status', 'evaluator', 'updated_at'])

            attempt = submission.attempt
            attempt.score = total_score
            attempt.percentage = percentage
            exam_total = float(attempt.examination.total_marks or 100)
            exam_pass = float(attempt.examination.passing_marks or (exam_total * 0.4))
            pass_ratio = (exam_pass / exam_total) if exam_total > 0 else 0.4
            pass_marks = total_max * pass_ratio
            attempt.passed = total_score >= pass_marks
            attempt.status = 'evaluated'
            attempt.save(update_fields=['status', 'score', 'percentage', 'passed'])

            transaction.on_commit(lambda: NotificationService.notify_subjective_result_published(submission))

        serializer = AdminSubjectiveSubmissionDetailSerializer(submission)
        return Response(serializer.data)

