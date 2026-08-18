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
        exam = self.get_object()
        attempts = exam.attempts.all()
        
        total_attempts = attempts.count()
        completed_attempts = attempts.filter(status='evaluated').count()
        
        if total_attempts == 0:
            return Response({
                "total_attempts": 0,
                "completed_attempts": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_rate": 0,
            })
            
        avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0
        pass_count = attempts.filter(passed=True).count()
        
        # Not computing high/low via DB if we only have simple stats, but let's do it in python if small
        scores = [a.score for a in attempts if a.status == 'evaluated']
        highest = max(scores) if scores else 0
        lowest = min(scores) if scores else 0
        
        return Response({
            "total_attempts": total_attempts,
            "completed_attempts": completed_attempts,
            "average_score": round(avg_score, 2),
            "highest_score": highest,
            "lowest_score": lowest,
            "pass_rate": round((pass_count / total_attempts) * 100, 2) if total_attempts > 0 else 0,
        })
