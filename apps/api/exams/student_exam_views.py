from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from .models import Examination, ExaminationAttempt, StudentAnswer, Question, ModelExam, ModelExamAttempt
from .student_serializers import (
    StudentExaminationSerializer, 
    StudentExaminationAttemptSerializer, 
    StudentExaminationResultSerializer,
    StudentSecureQuestionSerializer,
    StudentLeaderboardSerializer
)
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
        # Get published and live exams
        # Note: You can add logic to filter by ExaminationEligibility here
        return Examination.objects.filter(status__in=['published', 'live'])
        
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        examination = self.get_object()
        user = request.user
        
        if examination.status not in ['published', 'live']:
            return Response({'detail': 'Exam is not currently active.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check for in-progress attempts
        active_attempt = ExaminationAttempt.objects.filter(examination=examination, student=user, status='in-progress').first()
        if active_attempt:
            return Response({'detail': 'You already have an active attempt for this exam.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check max attempts
        if examination.max_attempts > 0:
            attempts_count = ExaminationAttempt.objects.filter(examination=examination, student=user).count()
            if attempts_count >= examination.max_attempts:
                return Response({'detail': 'Maximum attempts reached for this exam.'}, status=status.HTTP_403_FORBIDDEN)
                
        # Create attempt
        attempt = ExaminationAttempt.objects.create(
            examination=examination,
            student=user,
            status='in-progress'
        )
        
        serializer = StudentExaminationAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class StudentExaminationAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for students to manage their active and past attempts.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StudentExaminationAttemptSerializer
    
    def get_queryset(self):
        return ExaminationAttempt.objects.filter(student=self.request.user)
        
    def get_serializer_class(self):
        if self.action == 'result':
            return StudentExaminationResultSerializer
        return super().get_serializer_class()
        
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Returns the questions for this attempt without the correct answers."""
        attempt = self.get_object()
        examination = attempt.examination
        
        # Get questions depending on whether it's from a question_set or directly mapped
        if examination.question_set:
            questions = examination.question_set.questions.all()
        else:
            # Fallback if there's direct mapping
            questions = Question.objects.none()
            
        # In a real implementation you might shuffle questions here if randomize_questions is True
        # and store the shuffled order for this attempt.
        
        serializer = StudentSecureQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """Save or update an answer for a specific question."""
        attempt = self.get_object()
        
        if attempt.status != 'in-progress':
            return Response({'detail': 'Cannot answer - exam is not in progress.'}, status=status.HTTP_400_BAD_REQUEST)
            
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
        """Submit the exam attempt and calculate the score."""
        attempt = self.get_object()
        
        if attempt.status != 'in-progress':
            return Response({'detail': 'Exam already submitted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            examination = attempt.examination
            answers = StudentAnswer.objects.filter(attempt=attempt)
            
            score = 0
            total_possible = examination.total_marks
            
            for answer in answers:
                question = answer.question
                if answer.selected_option and question.correct_option:
                    if answer.selected_option.upper() == question.correct_option.upper():
                        answer.is_correct = True
                        answer.marks_awarded = question.marks
                        score += question.marks
                    elif examination.negative_marking:
                        score -= examination.negative_marking_value
                answer.save()
            
            score = max(0, score)  # Floor at 0
            percentage = round((score / total_possible * 100), 2) if total_possible > 0 else 0
            
            attempt.score = score
            attempt.percentage = percentage
            attempt.passed = score >= examination.passing_marks
            attempt.submitted_at = timezone.now()
            attempt.status = 'submitted'
            
            if attempt.started_at:
                delta = timezone.now() - attempt.started_at
                attempt.time_taken_seconds = int(delta.total_seconds())
            
            attempt.save()
            
        return Response({'detail': 'Exam submitted successfully.', 'attempt_id': attempt.id})

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
    Build a unified leaderboard from both ExaminationAttempt and ModelExamAttempt.
    
    Strategy:
    - ExaminationAttempt: include status 'submitted' or 'evaluated'
    - ModelExamAttempt: include status 'submitted'
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

    # ---- ModelExamAttempt ----
    model_qs = ModelExamAttempt.objects.filter(status='submitted')
    
    if time_filter == 'year':
        model_qs = model_qs.filter(started_at__year=now.year)
    elif time_filter == 'month':
        model_qs = model_qs.filter(started_at__year=now.year, started_at__month=now.month)
    elif time_filter == 'week':
        model_qs = model_qs.filter(started_at__gte=now - timezone.timedelta(days=7))
    
    if search_query:
        model_qs = model_qs.filter(
            student__username__icontains=search_query
        ) | model_qs.filter(
            student__first_name__icontains=search_query
        ) | model_qs.filter(
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

    # Process ModelExamAttempt
    for attempt in model_qs.select_related('student', 'model_exam'):
        sid = attempt.student.id
        total_marks = attempt.model_exam.total_marks or 100
        score = attempt.score if attempt.score is not None else 0
        pct = round((score / total_marks) * 100, 2) if total_marks > 0 else 0
        
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
    Provides leaderboard rankings for students based on exam attempts.
    Combines ExaminationAttempt and ModelExamAttempt data.
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
