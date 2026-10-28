from rest_framework import viewsets, permissions, status
from .permissions import IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from exams.models import QuestionCollection, CollectionRule, Question, ExamCategory, Exam, Subject, Chapter, Topic
from courses.services.course_access_service import CourseAccessService
from rest_framework import serializers
from django.db.models import Q, Count


class CollectionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionRule
        fields = ['id', 'keywords', 'apply_to_new', 'apply_to_csv']


class QuestionCollectionSerializer(serializers.ModelSerializer):
    rule = CollectionRuleSerializer(required=False, allow_null=True)
    question_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    position = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.all(), source='exam', required=False, allow_null=True
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=ExamCategory.objects.all(), required=False, allow_null=True
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), required=False, allow_null=True
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=Chapter.objects.all(), required=False, allow_null=True
    )
    topic = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.all(), required=False, allow_null=True
    )

    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    position_name = serializers.CharField(source='exam.name', read_only=True, default=None)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    chapter_name = serializers.CharField(source='chapter.title', read_only=True, default=None)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    
    course_id = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = QuestionCollection
        fields = [
            'id', 'name', 'description', 'color', 'icon', 'status',
            'category', 'position', 'subject', 'chapter', 'topic',
            'category_name', 'position_name', 'subject_name', 'chapter_name', 'topic_name',
            'course_id', 'course_title',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'question_count', 'rule'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        val = getattr(obj, 'question_count_annotated', None)
        return val if val is not None else obj.questions.count()

    def _get_course(self, obj):
        if not hasattr(obj, '_cached_course'):
            obj._cached_course = CourseAccessService.get_question_course(obj) if obj.exam_id else None
        return obj._cached_course

    def get_course_id(self, obj):
        c = self._get_course(obj)
        return c.id if c else None

    def get_course_title(self, obj):
        c = self._get_course(obj)
        return c.title if c else None

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
    subject_name = serializers.SerializerMethodField()
    chapter_name = serializers.SerializerMethodField()
    topic_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    def get_subject_name(self, obj):
        try:
            if obj.subject:
                return obj.subject.name
            return obj.topic.chapter.subject.name
        except AttributeError:
            return ''

    def get_chapter_name(self, obj):
        try:
            if obj.chapter:
                return obj.chapter.title
            return obj.topic.chapter.title
        except AttributeError:
            return ''

    def get_topic_name(self, obj):
        try:
            return obj.topic.name if obj.topic else ''
        except AttributeError:
            return ''

    def get_position_name(self, obj):
        try:
            return obj.exam.name if obj.exam else ''
        except AttributeError:
            return ''

    def get_course_title(self, obj):
        c = CourseAccessService.get_question_course(obj)
        return c.title if c else ''

    class Meta:
        model = Question
        fields = ['id', 'question_id', 'text', 'question_type', 'marks', 'difficulty',
                  'subject_name', 'chapter_name', 'topic_name', 'position_name', 'course_title', 'status']


class QuestionCollectionViewSet(viewsets.ModelViewSet):
    queryset = QuestionCollection.objects.select_related(
        'category', 'exam', 'subject', 'chapter', 'topic', 'created_by', 'rule'
    ).annotate(
        question_count_annotated=Count('questions', distinct=True)
    ).order_by('-created_at')
    serializer_class = QuestionCollectionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        position_id = self.request.query_params.get('position') or self.request.query_params.get('exam')
        if position_id:
            qs = qs.filter(exam_id=position_id)
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        chapter_id = self.request.query_params.get('chapter')
        if chapter_id:
            qs = qs.filter(chapter_id=chapter_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_collections()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_collections()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_collections()

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Return all questions in this collection."""
        collection = self.get_object()
        questions = collection.questions.select_related(
            'subject', 'chapter', 'topic', 'exam', 'topic__chapter', 'topic__chapter__subject'
        ).all()
        serializer = CollectionQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_questions(self, request, pk=None):
        """Add questions to this collection with scope compatibility validation. Body: { question_ids: [1,2,3] }"""
        collection = self.get_object()
        question_ids = request.data.get('question_ids', [])
        if not question_ids:
            return Response({'error': 'question_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)

        questions = Question.objects.filter(id__in=question_ids)
        if not questions.exists():
            return Response({'error': 'No valid questions found for the given IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate scope compatibility if collection has an academic target configured
        incompatible = []
        for q in questions:
            if collection.exam_id and q.exam_id and q.exam_id != collection.exam_id:
                incompatible.append(f"{q.question_id or q.id}: Level/Position mismatch")
            elif collection.subject_id and q.subject_id and q.subject_id != collection.subject_id:
                incompatible.append(f"{q.question_id or q.id}: Subject mismatch")
            elif collection.chapter_id and q.chapter_id and q.chapter_id != collection.chapter_id:
                incompatible.append(f"{q.question_id or q.id}: Chapter mismatch")

        if incompatible:
            return Response({
                'error': f"{len(incompatible)} question(s) are incompatible with the collection's academic scope.",
                'details': incompatible[:5],
            }, status=status.HTTP_400_BAD_REQUEST)

        collection.questions.add(*questions)
        return Response({
            'success': True,
            'added': questions.count(),
            'question_count': collection.questions.count(),
        })

    @action(detail=True, methods=['post'])
    def remove_questions(self, request, pk=None):
        """Remove questions from this collection without deleting underlying questions. Body: { question_ids: [1,2,3] }"""
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

