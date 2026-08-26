from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from exams.models import QuestionSet, Question, ExamCategory, Exam, Subject, QuestionSetQuestion
from exams.selection_service import QuestionSelectionService
from administration.models import AuditLog
from administration.question_serializers import AdminQuestionSerializer

class QuestionSetQuestionSerializer(serializers.ModelSerializer):
    question_details = AdminQuestionSerializer(source='question', read_only=True)

    class Meta:
        model = QuestionSetQuestion
        fields = ['id', 'question', 'question_details', 'order', 'marks']
        read_only_fields = ['id']

class QuestionSetSerializer(serializers.ModelSerializer):
    questions_list = QuestionSetQuestionSerializer(source='question_set_questions', many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    position_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    unit_name = serializers.CharField(source='chapter.title', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = QuestionSet
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        set_type = data.get('set_type', 'custom')
        if set_type in ['subject', 'chapter', 'topic'] and not data.get('subject'):
            raise serializers.ValidationError({"subject": f"Subject is required for {set_type} set."})
        if set_type in ['chapter', 'topic'] and not data.get('chapter'):
            raise serializers.ValidationError({"chapter": f"Chapter is required for {set_type} set."})
        if set_type == 'topic' and not data.get('topic'):
            raise serializers.ValidationError({"topic": "Topic is required for topic set."})
        
        if set_type == 'full_mock':
            distribution = data.get('subject_distribution', {})
            total = sum(int(v) for v in distribution.values() if str(v).isdigit())
            if total != data.get('total_questions'):
                raise serializers.ValidationError({"subject_distribution": f"Subject distribution ({total}) must equal total question count ({data.get('total_questions')})."})
        
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class QuestionSetViewSet(viewsets.ModelViewSet):
    queryset = QuestionSet.objects.all().order_by('-created_at')
    serializer_class = QuestionSetSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        qset = self.get_object()
        
        # Duplicate the set
        new_qset = QuestionSet.objects.get(pk=qset.pk)
        new_qset.pk = None
        new_qset.name = f"Copy of {qset.name}"
        new_qset.status = 'draft'
        new_qset.created_by = request.user
        new_qset.save()
        
        # Duplicate the question mappings
        qset_questions = QuestionSetQuestion.objects.filter(question_set=qset)
        new_mappings = []
        for qsq in qset_questions:
            new_mappings.append(QuestionSetQuestion(
                question_set=new_qset,
                question=qsq.question,
                order=qsq.order,
                marks=qsq.marks
            ))
        QuestionSetQuestion.objects.bulk_create(new_mappings)
        
        AuditLog.objects.create(
            actor=request.user, action='DUPLICATE_QUESTION_SET', entity_type='QuestionSet', 
            entity_id=str(new_qset.id), details={"original_id": qset.id}
        )
        return Response(QuestionSetSerializer(new_qset).data)

    @action(detail=True, methods=['post'])
    def add_questions(self, request, pk=None):
        qset = self.get_object()
        question_ids = request.data.get('question_ids', [])
        if not isinstance(question_ids, list):
            return Response({"error": "question_ids must be a list"}, status=400)
            
        # Validation based on set_type
        if qset.set_type != 'custom':
            questions_qs = Question.objects.filter(id__in=question_ids).select_related(
                'topic', 'topic__chapter', 'topic__chapter__subject',
                'topic__chapter__subject__paper'
            )
            for q in questions_qs:
                subject = q.topic.chapter.subject
                question_exam_id = subject.paper.exam_id if subject.paper_id else subject.exam_id
                if qset.set_type == 'position' and question_exam_id != qset.exam_id:
                    return Response({"error": f"Question {q.id} does not belong to Position {qset.exam.name}."}, status=400)
                if qset.set_type == 'subject' and q.topic.chapter.subject_id != qset.subject_id:
                    return Response({"error": f"Question {q.id} does not belong to Subject {qset.subject.name}."}, status=400)
                if qset.set_type == 'chapter' and q.topic.chapter_id != qset.chapter_id:
                    return Response({"error": f"Question {q.id} does not belong to Chapter {qset.chapter.title}."}, status=400)
                if qset.set_type == 'topic' and q.topic_id != qset.topic_id:
                    return Response({"error": f"Question {q.id} does not belong to Topic {qset.topic.name}."}, status=400)
                # full_mock logic could validate if it matches distribution, but we'll trust the selector for simplicity.

        existing_ids = set(QuestionSetQuestion.objects.filter(question_set=qset).values_list('question_id', flat=True))
        current_max_order = QuestionSetQuestion.objects.filter(question_set=qset).order_by('-order').first()
        start_order = (current_max_order.order + 1) if current_max_order else 1
        
        new_mappings = []
        for q_id in question_ids:
            if q_id not in existing_ids:
                new_mappings.append(QuestionSetQuestion(
                    question_set=qset,
                    question_id=q_id,
                    order=start_order,
                    marks=qset.marks_per_question
                ))
                start_order += 1
                
        if new_mappings:
            QuestionSetQuestion.objects.bulk_create(new_mappings)
            
        return Response({"success": True, "added_count": len(new_mappings)})

    @action(detail=True, methods=['post'])
    def remove_questions(self, request, pk=None):
        qset = self.get_object()
        question_ids = request.data.get('question_ids', [])
        if not isinstance(question_ids, list):
            return Response({"error": "question_ids must be a list"}, status=400)
            
        deleted, _ = QuestionSetQuestion.objects.filter(question_set=qset, question_id__in=question_ids).delete()
        return Response({"success": True, "removed_count": deleted})

    @action(detail=True, methods=['post'])
    def reorder_questions(self, request, pk=None):
        qset = self.get_object()
        # Expects list of dicts: [{"question_id": 1, "order": 1}, ...]
        order_data = request.data.get('order_data', [])
        if not isinstance(order_data, list):
            return Response({"error": "order_data must be a list"}, status=400)
            
        mappings = QuestionSetQuestion.objects.filter(question_set=qset)
        mapping_dict = {m.question_id: m for m in mappings}
        
        updated = []
        for item in order_data:
            q_id = item.get('question_id')
            order = item.get('order')
            if q_id in mapping_dict and order is not None:
                mapping = mapping_dict[q_id]
                mapping.order = order
                updated.append(mapping)
                
        if updated:
            QuestionSetQuestion.objects.bulk_update(updated, ['order'])
            
        return Response({"success": True})


    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """
        Generate questions based on the difficulty distribution.

        Routes through the shared QuestionSelectionService (the same one used
        by Practice, Games, and Teacher Mock Exam auto-generation) so this
        preview only ever draws from APPROVED questions and stays in sync
        with the rest of the Master Question Bank selection logic.
        """
        qset = self.get_object()

        # Determine how many questions are needed per difficulty
        distribution = qset.difficulty_distribution or {}
        easy_needed = int(distribution.get('easy', 0))
        medium_needed = int(distribution.get('medium', 0))
        hard_needed = int(distribution.get('hard', 0))

        total_needed = easy_needed + medium_needed + hard_needed
        if total_needed != qset.total_questions:
            return Response({"error": "Distribution sum does not match total_questions."}, status=400)

        service = QuestionSelectionService()
        selected_ids = []

        if qset.set_type == 'full_mock':
            subject_dist = qset.subject_distribution or {}
            # Verify sum
            total_subj_needed = sum(int(v) for v in subject_dist.values() if str(v).isdigit())
            if total_subj_needed != qset.total_questions:
                return Response({"error": "Subject distribution sum does not match total_questions."}, status=400)

            # Simple approach: for each subject, grab questions randomly ignoring global difficulty
            # (or trying to balance it, but keeping it simple for now)
            for subj_id_str, count_str in subject_dist.items():
                if not str(count_str).isdigit(): continue
                count = int(count_str)
                if count <= 0: continue
                subj_id = int(subj_id_str)
                result = service.select(subject_id=subj_id, count=count, randomize=True)
                if not result['satisfied']:
                    return Response(
                        {"error": f"Not enough questions for Subject ID {subj_id}. Needed {count}, found {result['available']}."},
                        status=400,
                    )
                selected_ids.extend(q.id for q in result['questions'])

        else:
            # Hierarchy filter — mirrors QuestionSelectionService.apply_filters' academic-hierarchy kwargs
            filters = {}
            if qset.set_type == 'topic' and qset.topic_id:
                filters['topic_id'] = qset.topic_id
            elif qset.set_type == 'chapter' and qset.chapter_id:
                filters['chapter_id'] = qset.chapter_id
            elif qset.set_type == 'subject' and qset.subject_id:
                filters['subject_id'] = qset.subject_id
            elif qset.set_type == 'position' and qset.exam_id:
                filters['exam_id'] = qset.exam_id
            elif qset.set_type == 'custom':
                # Custom can be anything, but we might optionally filter by what's provided
                if qset.topic_id: filters['topic_id'] = qset.topic_id
                elif qset.chapter_id: filters['chapter_id'] = qset.chapter_id
                elif qset.subject_id: filters['subject_id'] = qset.subject_id
                elif qset.exam_id: filters['exam_id'] = qset.exam_id

            result = service.select(
                difficulty_distribution={'easy': easy_needed, 'medium': medium_needed, 'hard': hard_needed},
                randomize=True,
                **filters,
            )
            if not result['satisfied']:
                message = " ".join(result['warnings']) or "Not enough approved questions available for the requested distribution."
                return Response({"error": message}, status=400)
            selected_ids.extend(q.id for q in result['questions'])

        # Don't save, just return the preview data for AI generation
        questions = Question.objects.filter(id__in=selected_ids)
        serializer = AdminQuestionSerializer(questions, many=True)

        AuditLog.objects.create(
            actor=request.user, action='GENERATE_QUESTION_SET_PREVIEW', entity_type='QuestionSet', entity_id=str(qset.id),
            details={"questions_generated": len(selected_ids)}
        )

        return Response({"success": True, "generated_count": len(selected_ids), "preview_questions": serializer.data})

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        qset = self.get_object()
        
        # Validation
        if qset.questions.count() != qset.total_questions:
            return Response({"error": f"Question count mismatch. Set requires {qset.total_questions} questions but has {qset.questions.count()}."}, status=400)
            
        qset.status = 'published'
        qset.save()
        
        AuditLog.objects.create(
            actor=request.user, action='PUBLISH_QUESTION_SET', entity_type='QuestionSet', entity_id=str(qset.id)
        )
        
        return Response(QuestionSetSerializer(qset).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        qset = self.get_object()
        qset.status = 'draft'
        qset.save()
        
        AuditLog.objects.create(
            actor=request.user, action='UNPUBLISH_QUESTION_SET', entity_type='QuestionSet', entity_id=str(qset.id)
        )
        
        return Response(QuestionSetSerializer(qset).data)
