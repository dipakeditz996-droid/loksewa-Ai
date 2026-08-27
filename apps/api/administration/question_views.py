from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count
from exams.models import Question
from .question_serializers import AdminQuestionSerializer

class AdminQuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related(
        'topic', 'topic__chapter', 'topic__chapter__subject',
        'topic__chapter__subject__paper', 'topic__chapter__subject__paper__exam',
        'topic__chapter__subject__paper__exam__category',
    ).all().order_by('-created_at')
    serializer_class = AdminQuestionSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Enable filtering by syllabus hierarchy and collections
    filterset_fields = {
        'question_type': ['exact'],
        'status': ['exact'],
        'ai_status': ['exact'],
        'difficulty': ['exact'],
        'topic': ['exact'],
        'collections': ['exact'],
        'topic__chapter': ['exact'],
        'topic__chapter__subject': ['exact'],
        'topic__chapter__subject__paper': ['exact'],
        'topic__chapter__subject__paper__exam': ['exact'],
        'topic__chapter__subject__paper__exam__category': ['exact'],
    }
    search_fields = ['text', 'explanation', 'model_answer']
    ordering_fields = ['created_at', 'marks', 'difficulty']

    def perform_create(self, serializer):
        """Override create to set default values if needed."""
        serializer.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return summary statistics for the question bank.
        """
        qs = self.get_queryset()
        
        total = qs.count()
        mcq_count = qs.filter(question_type='mcq').count()
        subjective_count = qs.filter(question_type='subjective').count()
        active_count = qs.filter(status__in=['approved', 'pending_review']).count()
        draft_count = qs.filter(status='draft').count()
        ai_pending_count = qs.filter(ai_status='pending').count()
        
        # Difficulty breakdown
        difficulty_counts = list(qs.values('difficulty').annotate(count=Count('id')))
        
        # Collections stats could be fetched via Collection API
        
        return Response({
            'total': total,
            'mcq': mcq_count,
            'subjective': subjective_count,
            'active': active_count,
            'draft': draft_count,
            'ai_pending': ai_pending_count,
            'by_difficulty': difficulty_counts
        })

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a question. The duplicate will be placed in 'draft' status.
        """
        question = self.get_object()
        
        # Create a copy
        question.pk = None
        question.question_id = "" # Will be auto-generated on save
        question.status = 'draft'
        question.text = f"[COPY] {question.text}"
        question.save()
        
        from administration.models import AuditLog
        AuditLog.objects.create(
            actor=request.user, action='DUPLICATE_QUESTION', entity_type='Question', entity_id=question.question_id,
            details={"original_pk": pk, "new_pk": question.pk}
        )
        
        serializer = self.get_serializer(question)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def usage(self, request, pk=None):
        """Returns how many sets/exams reference this question."""
        question = self.get_object()
        return Response({"usage_count": question.usage_count})

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Perform a bulk action on a list of question IDs.
        Payload: { action: 'approve'|'draft'|'archive'|'delete'|'add_to_collection'|'remove_from_collection', ids: [1, 2, 3], collection_ids: [1,2] }
        """
        action_type = request.data.get('action')
        ids = request.data.get('ids', [])

        if not action_type or not ids:
            return Response({"error": "action and ids are required"}, status=400)

        questions = Question.objects.filter(id__in=ids)
        count = questions.count()

        from administration.models import AuditLog

        if action_type == 'delete':
            # Check usage before bulk delete
            for q in questions:
                if q.usage_count > 0:
                    return Response({"error": f"Cannot delete Question {q.question_id} because it is referenced in an exam or set."}, status=400)
            questions.delete()
            AuditLog.objects.create(
                actor=request.user, action='BULK_DELETE', entity_type='Question', entity_id=None,
                details={"ids": ids, "count": count}
            )
        elif action_type in ['approve', 'draft', 'archive']:
            if action_type == 'approve':
                for q in questions:
                    if q.created_by == request.user:
                        return Response({"error": "You cannot approve your own question."}, status=403)

            status_map = {'approve': 'approved', 'draft': 'draft', 'archive': 'archived'}
            new_status = status_map[action_type]
            questions.update(status=new_status)
            AuditLog.objects.create(
                actor=request.user, action=f'BULK_{action_type.upper()}', entity_type='Question', entity_id=None,
                details={"ids": ids, "count": count, "new_status": new_status}
            )
        elif action_type in ['add_to_collection', 'remove_from_collection']:
            collection_ids = request.data.get('collection_ids', [])
            if not collection_ids:
                return Response({"error": "collection_ids required for this action"}, status=400)
            
            from exams.models import QuestionCollection
            collections = QuestionCollection.objects.filter(id__in=collection_ids)
            
            for q in questions:
                if action_type == 'add_to_collection':
                    q.collections.add(*collections)
                else:
                    q.collections.remove(*collections)
            
            AuditLog.objects.create(
                actor=request.user, action=f'BULK_{action_type.upper()}', entity_type='Question', entity_id=None,
                details={"ids": ids, "count": count, "collection_ids": collection_ids}
            )
        else:
            return Response({"error": "Invalid action"}, status=400)
            
        return Response({"success": True, "count": count})

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create a list of questions.
        Payload: [ { question_type: 'mcq', text: '...', ... }, ... ]
        """
        questions_data = request.data
        if not isinstance(questions_data, list):
            return Response({"error": "Expected a list of questions"}, status=400)
            
        serializer = self.get_serializer(data=questions_data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "count": len(serializer.data), "data": serializer.data}, status=201)
        return Response(serializer.errors, status=400)
