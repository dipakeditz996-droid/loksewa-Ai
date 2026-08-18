import random
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from exams.models import QuestionSet, Question, ExamCategory, Exam, Subject, QuestionSetQuestion
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
    unit_name = serializers.CharField(source='Chapter.title', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = QuestionSet
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        set_type = data.get('set_type', 'custom')
        if set_type in ['subject', 'chapter', 'topic'] and not data.get('subject'):
            raise serializers.ValidationError({"subject": f"Subject is required for {set_type} set."})
        if set_type in ['chapter', 'topic'] and not data.get('Chapter'):
            raise serializers.ValidationError({"Chapter": f"Chapter (Chapter) is required for {set_type} set."})
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
            questions_qs = Question.objects.filter(id__in=question_ids)
            for q in questions_qs:
                if qset.set_type == 'position' and q.topic.Chapter.subject.exam_id != qset.exam_id:
                    return Response({"error": f"Question {q.id} does not belong to Position {qset.exam.name}."}, status=400)
                if qset.set_type == 'subject' and q.topic.Chapter.subject_id != qset.subject_id:
                    return Response({"error": f"Question {q.id} does not belong to Subject {qset.subject.name}."}, status=400)
                if qset.set_type == 'chapter' and q.topic.unit_id != qset.unit_id:
                    return Response({"error": f"Question {q.id} does not belong to Chapter {qset.Chapter.title}."}, status=400)
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
        """
        qset = self.get_object()
        
        # Determine how many questions are needed per difficulty
        distribution = qset.difficulty_distribution
        easy_needed = int(distribution.get('easy', 0))
        medium_needed = int(distribution.get('medium', 0))
        hard_needed = int(distribution.get('hard', 0))
        
        total_needed = easy_needed + medium_needed + hard_needed
        if total_needed != qset.total_questions:
            return Response({"error": "Distribution sum does not match total_questions."}, status=400)
            
        base_qs = Question.objects.filter(status='published')
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
                pool = list(base_qs.filter(topic__unit__subject_id=subj_id).values_list('id', flat=True))
                if len(pool) < count:
                    return Response({"error": f"Not enough questions for Subject ID {subj_id}. Needed {count}, found {len(pool)}."}, status=400)
                selected_ids.extend(random.sample(pool, count))
                
        else:
            # Hierarchy filter
            if qset.set_type == 'topic' and qset.topic_id:
                base_qs = base_qs.filter(topic_id=qset.topic_id)
            elif qset.set_type == 'chapter' and qset.unit_id:
                base_qs = base_qs.filter(topic__unit_id=qset.unit_id)
            elif qset.set_type == 'subject' and qset.subject_id:
                base_qs = base_qs.filter(topic__unit__subject_id=qset.subject_id)
            elif qset.set_type == 'position' and qset.exam_id:
                base_qs = base_qs.filter(topic__unit__subject__exam_id=qset.exam_id)
            elif qset.set_type == 'custom':
                # Custom can be anything, but we might optionally filter by what's provided
                if qset.topic_id: base_qs = base_qs.filter(topic_id=qset.topic_id)
                elif qset.unit_id: base_qs = base_qs.filter(topic__unit_id=qset.unit_id)
                elif qset.subject_id: base_qs = base_qs.filter(topic__unit__subject_id=qset.subject_id)
                elif qset.exam_id: base_qs = base_qs.filter(topic__unit__subject__exam_id=qset.exam_id)
            
            easy_pool = list(base_qs.filter(difficulty='easy').values_list('id', flat=True))
            medium_pool = list(base_qs.filter(difficulty='medium').values_list('id', flat=True))
            hard_pool = list(base_qs.filter(difficulty='hard').values_list('id', flat=True))
            
            if len(easy_pool) < easy_needed:
                return Response({"error": f"Not enough easy questions. Needed {easy_needed}, found {len(easy_pool)}."}, status=400)
            if len(medium_pool) < medium_needed:
                return Response({"error": f"Not enough medium questions. Needed {medium_needed}, found {len(medium_pool)}."}, status=400)
            if len(hard_pool) < hard_needed:
                return Response({"error": f"Not enough hard questions. Needed {hard_needed}, found {len(hard_pool)}."}, status=400)
                
            selected_ids.extend(random.sample(easy_pool, easy_needed))
            selected_ids.extend(random.sample(medium_pool, medium_needed))
            selected_ids.extend(random.sample(hard_pool, hard_needed))
        
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
