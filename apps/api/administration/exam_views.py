from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Avg
from django.utils import timezone
import copy

from exams.models import Examination, ExaminationAttempt, QuestionSet
from .exam_serializers import ExaminationSerializer, ExaminationAttemptSerializer

class ExaminationViewSet(viewsets.ModelViewSet):
    queryset = Examination.objects.all().select_related('category', 'exam', 'subject', 'question_set').order_by('-created_at')
    serializer_class = ExaminationSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

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
        
        # Validation
        errors = []
        if not exam.question_set:
            errors.append("A Question Set must be selected.")
        if exam.total_questions < 1:
            errors.append("Total Questions must be greater than 0.")
        if exam.time_limit < 1:
            errors.append("Time Limit must be greater than 0.")
        if exam.total_marks < 1:
            errors.append("Total Marks must be greater than 0.")
            
        if exam.question_set and exam.question_set.question_set_questions.count() < exam.total_questions:
            errors.append(f"The selected Question Set only has {exam.question_set.question_set_questions.count()} questions, but {exam.total_questions} are required.")
            
        if errors:
            return Response({"error": "Cannot publish exam.", "details": errors}, status=status.HTTP_400_BAD_REQUEST)
            
        exam.status = 'published'
        exam.save()
        
        # If start_time is set, determine if it should be 'scheduled' or 'live'
        # But wait, the choices are draft, scheduled, live, completed, archived.
        if exam.start_time:
            if exam.start_time > timezone.now():
                exam.status = 'scheduled'
            elif exam.end_time and exam.end_time < timezone.now():
                exam.status = 'completed'
            else:
                exam.status = 'live'
        else:
            exam.status = 'live'
            
        exam.save()
        
        serializer = self.get_serializer(exam)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        exam = self.get_object()
        exam.status = 'archived'
        exam.save()
        serializer = self.get_serializer(exam)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        exam = self.get_object()
        if not exam.question_set:
            return Response({"error": "No Question Set attached."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Serialize questions for preview without correct options
        questions = []
        for qsq in exam.question_set.question_set_questions.select_related('question').all():
            q = qsq.question
            q_data = {
                'id': q.id,
                'text': q.text,
                'question_type': q.question_type,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'marks': qsq.marks,
            }
            questions.append(q_data)
            
        data = {
            'title': exam.title,
            'instructions': exam.instructions,
            'time_limit': exam.time_limit,
            'total_marks': exam.total_marks,
            'total_questions': exam.total_questions,
            'questions': questions
        }
        return Response(data)


    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        from django.db.models import Avg, Max, Min, Count, Q, F, Case, When, IntegerField, FloatField
        from django.db.models.functions import Cast
        from exams.models import StudentAnswer
        
        exam = self.get_object()
        attempts = exam.attempts.all()
        
        total_attempts = attempts.count()
        completed_attempts = attempts.filter(status='evaluated').count()
        in_progress = attempts.filter(status='in_progress').count()
        
        if total_attempts == 0:
            return Response({
                "exam": {
                    "id": exam.id,
                    "title": exam.title,
                    "exam_type": exam.exam_type,
                    "status": exam.status
                },
                "summary": {
                    "total_attempts": 0,
                    "completed_attempts": 0,
                    "in_progress_attempts": 0,
                },
                "message": "No examination attempts are available yet."
            })
            
        stats = attempts.filter(status='evaluated').aggregate(
            avg_score=Avg('score'),
            avg_percentage=Avg('percentage'),
            high=Max('score'),
            low=Min('score'),
            avg_time=Avg('time_taken_seconds'),
            min_time=Min('time_taken_seconds'),
            max_time=Max('time_taken_seconds')
        )
        
        pass_count = attempts.filter(status='evaluated', passed=True).count()
        fail_count = completed_attempts - pass_count
        
        # Question performance
        q_stats = StudentAnswer.objects.filter(
            attempt__examination=exam, attempt__status='evaluated'
        ).values(
            'question__id', 
            'question__text', 
            'question__difficulty'
        ).annotate(
            total_responses=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            skipped=Count('id', filter=Q(selected_option__isnull=True)),
        )
        
        question_performance = []
        difficulty_aggregate = {'easy': {'attempts': 0, 'correct': 0}, 'medium': {'attempts': 0, 'correct': 0}, 'hard': {'attempts': 0, 'correct': 0}}
        
        for idx, q in enumerate(q_stats):
            incorrect = q['total_responses'] - q['correct'] - q['skipped']
            accuracy = round((q['correct'] / q['total_responses'] * 100), 2) if q['total_responses'] > 0 else 0
            
            question_performance.append({
                "question_id": q['question__id'],
                "question_number": idx + 1,
                "question_text": q['question__text'][:100] + ('...' if len(q['question__text']) > 100 else ''),
                "total_responses": q['total_responses'],
                "correct": q['correct'],
                "incorrect": incorrect,
                "skipped": q['skipped'],
                "accuracy": accuracy,
                "difficulty": q['question__difficulty']
            })
            
            diff = q['question__difficulty']
            if diff in difficulty_aggregate:
                difficulty_aggregate[diff]['attempts'] += q['total_responses']
                difficulty_aggregate[diff]['correct'] += q['correct']
                
        difficulty_performance = []
        for diff, data in difficulty_aggregate.items():
            if data['attempts'] > 0:
                difficulty_performance.append({
                    "level": diff.capitalize(),
                    "attempts": data['attempts'],
                    "accuracy": round((data['correct'] / data['attempts'] * 100), 2)
                })
        
        # Score distribution (bins of 10%)
        distribution = list(attempts.filter(status='evaluated')
            .annotate(
                bin=Cast(F('percentage') / 10, IntegerField())
            )
            .values('bin')
            .annotate(count=Count('id'))
            .order_by('bin')
        )
        
        score_distribution = []
        for d in distribution:
            bin_idx = d['bin'] or 0
            start = bin_idx * 10
            end = start + 10
            score_distribution.append({
                "range": f"{start}-{end}%",
                "count": d['count']
            })
                      
        return Response({
            "exam": {
                "id": exam.id,
                "title": exam.title,
                "exam_type": exam.exam_type,
                "status": exam.status
            },
            "summary": {
                "total_attempts": total_attempts,
                "completed_attempts": completed_attempts,
                "in_progress_attempts": in_progress,
                "average_score": round(stats['avg_score'] or 0, 2),
                "average_percentage": round(stats['avg_percentage'] or 0, 2),
                "highest_score": round(stats['high'] or 0, 2),
                "lowest_score": round(stats['low'] or 0, 2),
                "pass_count": pass_count,
                "fail_count": fail_count,
            },
            "time_statistics": {
                "average_duration_seconds": round(stats['avg_time'] or 0, 2),
                "min_duration_seconds": stats['min_time'],
                "max_duration_seconds": stats['max_time']
            },
            "score_distribution": score_distribution,
            "question_performance": question_performance,
            "difficulty_performance": difficulty_performance,
        })

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
