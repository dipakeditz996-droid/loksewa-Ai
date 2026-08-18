from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from exams.models import QuestionCollection, CollectionRule, Question
from rest_framework import serializers


class CollectionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionRule
        fields = ['id', 'keywords', 'apply_to_new', 'apply_to_csv']


class QuestionCollectionSerializer(serializers.ModelSerializer):
    rule = CollectionRuleSerializer(required=False, allow_null=True)
    question_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = QuestionCollection
        fields = [
            'id', 'name', 'description', 'color', 'icon', 'status',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'question_count', 'rule'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.questions.count()

    def create(self, validated_data):
        rule_data = validated_data.pop('rule', None)
        collection = QuestionCollection.objects.create(**validated_data)
        if rule_data:
            CollectionRule.objects.create(collection=collection, **rule_data)
        else:
            CollectionRule.objects.create(collection=collection)
        return collection

    def update(self, instance, validated_data):
        rule_data = validated_data.pop('rule', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if rule_data is not None:
            rule, created = CollectionRule.objects.get_or_create(collection=instance)
            for attr, value in rule_data.items():
                setattr(rule, attr, value)
            rule.save()

        return instance


class CollectionQuestionSerializer(serializers.ModelSerializer):
    """Lightweight question serializer for listing questions in a collection."""
    subject_name = serializers.CharField(source='subject.name', default='', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', default='', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_id', 'text', 'question_type', 'difficulty', 'subject_name', 'chapter_name', 'status']


class QuestionCollectionViewSet(viewsets.ModelViewSet):
    queryset = QuestionCollection.objects.all().order_by('-created_at')
    serializer_class = QuestionCollectionSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Return all questions in this collection."""
        collection = self.get_object()
        questions = collection.questions.all()
        serializer = CollectionQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_questions(self, request, pk=None):
        """Add questions to this collection. Body: { question_ids: [1,2,3] }"""
        collection = self.get_object()
        question_ids = request.data.get('question_ids', [])
        if not question_ids:
            return Response({'error': 'question_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

        questions = Question.objects.filter(id__in=question_ids)
        if not questions.exists():
            return Response({'error': 'No valid questions found for the given IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        collection.questions.add(*questions)
        return Response({
            'success': True,
            'added': questions.count(),
            'question_count': collection.questions.count(),
        })

    @action(detail=True, methods=['post'])
    def remove_questions(self, request, pk=None):
        """Remove questions from this collection. Body: { question_ids: [1,2,3] }"""
        collection = self.get_object()
        question_ids = request.data.get('question_ids', [])
        if not question_ids:
            return Response({'error': 'question_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

        questions = Question.objects.filter(id__in=question_ids)
        collection.questions.remove(*questions)
        return Response({
            'success': True,
            'removed': questions.count(),
            'question_count': collection.questions.count(),
        })

    @action(detail=True, methods=['post'])
    def scan_rules(self, request, pk=None):
        collection = self.get_object()
        try:
            rule = collection.rule
        except CollectionRule.DoesNotExist:
            return Response({'error': 'No rule configured for this collection.'}, status=400)

        keywords = rule.keywords
        if not keywords:
            return Response({'message': 'No keywords defined in rule.'})

        from django.db.models import Q
        import operator
        from functools import reduce

        query = reduce(operator.or_, (Q(text__icontains=kw) | Q(explanation__icontains=kw) for kw in keywords))
        matching_questions = Question.objects.filter(query).exclude(collections=collection)

        from exams.models import AIClassificationSuggestion

        created_suggestions = 0
        for q in matching_questions:
            suggestion, created = AIClassificationSuggestion.objects.get_or_create(
                question=q,
                collection=collection,
                defaults={'reason': f"Matched keywords from collection rules: {', '.join(keywords)}"}
            )
            if created:
                created_suggestions += 1

        return Response({
            'success': True,
            'scanned': Question.objects.count(),
            'matched': matching_questions.count(),
            'suggestions_created': created_suggestions
        })

