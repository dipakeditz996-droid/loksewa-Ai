from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from administration.permissions import IsAdminUser
from django.conf import settings
from django.db.models import Q, ProtectedError
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question, Examination
from notes.models import StudyMaterial
from .syllabus_serializers import (
    ExamCategorySerializer, ExamSerializer, PaperSerializer, SubjectSerializer, 
    ChapterSerializer, TopicSerializer, ReorderSerializer
)
from .safe_delete_service import SafeDeleteService

def get_node_dependencies(instance):
    counts = {
        'notes': 0,
        'questions': 0,
        'exams': 0,
        'children': 0,
    }
    model_name = instance.__class__.__name__

    if isinstance(instance, ExamCategory):
        counts['children'] = instance.exams.count()
        counts['notes'] = StudyMaterial.objects.filter(exam__category=instance).count()
        counts['questions'] = Question.objects.filter(
            Q(category=instance) | Q(exam__category=instance) | Q(exam__parent__category=instance) |
            Q(subject__paper__exam__category=instance) | Q(chapter__subject__paper__exam__category=instance) |
            Q(topic__chapter__subject__paper__exam__category=instance)
        ).distinct().count()
        counts['exams'] = Examination.objects.filter(category=instance).count()
    elif isinstance(instance, Exam):
        counts['children'] = instance.children.count() + instance.papers.count()
        counts['notes'] = StudyMaterial.objects.filter(
            Q(exam=instance) | Q(exam__parent=instance)
        ).count()
        counts['questions'] = Question.objects.filter(
            Q(exam=instance) | Q(exam__parent=instance) |
            Q(subject__paper__exam=instance) | Q(chapter__subject__paper__exam=instance) |
            Q(topic__chapter__subject__paper__exam=instance) |
            Q(subject__paper__exam__parent=instance) | Q(chapter__subject__paper__exam__parent=instance) |
            Q(topic__chapter__subject__paper__exam__parent=instance)
        ).distinct().count()
        counts['exams'] = Examination.objects.filter(Q(exam=instance) | Q(exam__parent=instance)).count()
    elif isinstance(instance, Paper):
        counts['children'] = instance.subjects.count()
        counts['notes'] = StudyMaterial.objects.filter(subject__paper=instance).count()
        counts['questions'] = Question.objects.filter(
            Q(subject__paper=instance) | Q(chapter__subject__paper=instance) |
            Q(topic__chapter__subject__paper=instance)
        ).distinct().count()
        counts['exams'] = Examination.objects.filter(subject__paper=instance).count()
    elif isinstance(instance, Subject):
        counts['children'] = instance.chapters.count()
        counts['notes'] = StudyMaterial.objects.filter(
            Q(subject=instance) | Q(chapter__subject=instance) | Q(topic__chapter__subject=instance)
        ).distinct().count()
        counts['questions'] = Question.objects.filter(
            Q(subject=instance) | Q(chapter__subject=instance) | Q(topic__chapter__subject=instance)
        ).distinct().count()
        counts['exams'] = Examination.objects.filter(
            Q(subject=instance) | Q(questions__topic__chapter__subject=instance)
        ).distinct().count()
    elif isinstance(instance, Chapter):
        counts['children'] = instance.topics.count()
        counts['notes'] = StudyMaterial.objects.filter(
            Q(chapter=instance) | Q(topic__chapter=instance)
        ).distinct().count()
        counts['questions'] = Question.objects.filter(
            Q(chapter=instance) | Q(topic__chapter=instance)
        ).distinct().count()
        counts['exams'] = Examination.objects.filter(questions__topic__chapter=instance).distinct().count()
    elif isinstance(instance, Topic):
        counts['children'] = 0
        counts['notes'] = StudyMaterial.objects.filter(topic=instance).count()
        counts['questions'] = Question.objects.filter(topic=instance).count()
        counts['exams'] = Examination.objects.filter(questions__topic=instance).distinct().count()

    total_dependents = counts['notes'] + counts['questions'] + counts['exams'] + counts['children']
    has_dependencies = total_dependents > 0
    name = getattr(instance, 'name', getattr(instance, 'title', str(instance)))
    
    parts = []
    if counts['notes']:
        parts.append(f"{counts['notes']} notes")
    if counts['questions']:
        parts.append(f"{counts['questions']} questions")
    if counts['exams']:
        parts.append(f"{counts['exams']} exams")
    if counts['children']:
        parts.append(f"{counts['children']} child items")

    if parts:
        message = f"This {model_name.lower()} '{name}' is currently used by: {', '.join(parts)}. Deleting it may affect existing content."
    else:
        message = f"This {model_name.lower()} has no dependent content."

    return {
        'model': model_name,
        'id': instance.id,
        'name': name,
        'has_dependencies': has_dependencies,
        'counts': counts,
        'message': message,
        'is_active': getattr(instance, 'is_active', True),
    }

def cascade_delete_syllabus_node(instance, user=None):
    """
    Permanently deletes a syllabus node (ExamCategory, Exam, Paper, Subject, Chapter, Topic)
    along with ALL descendant nodes (child exams, papers, subjects, chapters, topics)
    and ALL questions, exams, study materials, and other related items.
    """
    model_name = instance.__class__.__name__
    name = getattr(instance, 'name', getattr(instance, 'title', str(instance)))
    instance_id = instance.id

    from exams.models import (
        ExamCategory, Exam, Paper, Subject, Chapter, Topic,
        Question, Examination, SubjectiveQuestionSet, QuestionSet, QuestionCollection
    )
    from notes.models import StudyMaterial
    from courses.models import Course
    from administration.models import AuditLog, TrashItem
    from administration.cache_service import AdminCacheService

    exam_ids = []
    paper_ids = []
    subject_ids = []
    chapter_ids = []
    topic_ids = []

    if isinstance(instance, ExamCategory):
        exams = Exam.objects.filter(category=instance)
        exam_ids = list(exams.values_list('id', flat=True))
        papers = Paper.objects.filter(exam_id__in=exam_ids)
        paper_ids = list(papers.values_list('id', flat=True))
        subjects = Subject.objects.filter(paper_id__in=paper_ids)
        subject_ids = list(subjects.values_list('id', flat=True))
        chapters = Chapter.objects.filter(subject_id__in=subject_ids)
        chapter_ids = list(chapters.values_list('id', flat=True))
        topics = Topic.objects.filter(chapter_id__in=chapter_ids)
        topic_ids = list(topics.values_list('id', flat=True))

        questions = Question.objects.filter(
            Q(category=instance) |
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        notes = StudyMaterial.objects.filter(
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        examinations = Examination.objects.filter(
            Q(category=instance) |
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids)
        )
        subj_sets = SubjectiveQuestionSet.objects.filter(
            Q(exam_category=instance) |
            Q(level_id__in=exam_ids) |
            Q(subject_id__in=subject_ids)
        )
        q_sets = QuestionSet.objects.filter(
            Q(category=instance) |
            Q(exam_id__in=exam_ids)
        )
        q_cols = QuestionCollection.objects.filter(
            Q(category=instance) |
            Q(exam_id__in=exam_ids)
        )
        courses = Course.objects.filter(exam_id__in=exam_ids)

    elif isinstance(instance, Exam):
        exam_ids = [instance.id]
        child_ids = list(Exam.objects.filter(parent=instance).values_list('id', flat=True))
        exam_ids.extend(child_ids)
        current_ids = child_ids
        while current_ids:
            next_level = list(Exam.objects.filter(parent_id__in=current_ids).values_list('id', flat=True))
            if not next_level:
                break
            exam_ids.extend(next_level)
            current_ids = next_level

        papers = Paper.objects.filter(exam_id__in=exam_ids)
        paper_ids = list(papers.values_list('id', flat=True))
        subjects = Subject.objects.filter(paper_id__in=paper_ids)
        subject_ids = list(subjects.values_list('id', flat=True))
        chapters = Chapter.objects.filter(subject_id__in=subject_ids)
        chapter_ids = list(chapters.values_list('id', flat=True))
        topics = Topic.objects.filter(chapter_id__in=chapter_ids)
        topic_ids = list(topics.values_list('id', flat=True))

        questions = Question.objects.filter(
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        notes = StudyMaterial.objects.filter(
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        examinations = Examination.objects.filter(
            Q(exam_id__in=exam_ids) |
            Q(subject_id__in=subject_ids)
        )
        subj_sets = SubjectiveQuestionSet.objects.filter(
            Q(level_id__in=exam_ids) |
            Q(subject_id__in=subject_ids)
        )
        q_sets = QuestionSet.objects.filter(exam_id__in=exam_ids)
        q_cols = QuestionCollection.objects.filter(exam_id__in=exam_ids)
        courses = Course.objects.filter(exam_id__in=exam_ids)

    elif isinstance(instance, Paper):
        paper_ids = [instance.id]
        subjects = Subject.objects.filter(paper=instance)
        subject_ids = list(subjects.values_list('id', flat=True))
        chapters = Chapter.objects.filter(subject_id__in=subject_ids)
        chapter_ids = list(chapters.values_list('id', flat=True))
        topics = Topic.objects.filter(chapter_id__in=chapter_ids)
        topic_ids = list(topics.values_list('id', flat=True))

        questions = Question.objects.filter(
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        notes = StudyMaterial.objects.filter(
            Q(subject_id__in=subject_ids) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        examinations = Examination.objects.filter(subject_id__in=subject_ids)
        subj_sets = SubjectiveQuestionSet.objects.filter(subject_id__in=subject_ids)

    elif isinstance(instance, Subject):
        subject_ids = [instance.id]
        chapters = Chapter.objects.filter(subject=instance)
        chapter_ids = list(chapters.values_list('id', flat=True))
        topics = Topic.objects.filter(chapter_id__in=chapter_ids)
        topic_ids = list(topics.values_list('id', flat=True))

        questions = Question.objects.filter(
            Q(subject=instance) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        notes = StudyMaterial.objects.filter(
            Q(subject=instance) |
            Q(chapter_id__in=chapter_ids) |
            Q(topic_id__in=topic_ids)
        )
        examinations = Examination.objects.filter(subject=instance)
        subj_sets = SubjectiveQuestionSet.objects.filter(subject=instance)

    elif isinstance(instance, Chapter):
        chapter_ids = [instance.id]
        topics = Topic.objects.filter(chapter=instance)
        topic_ids = list(topics.values_list('id', flat=True))

        questions = Question.objects.filter(
            Q(chapter=instance) |
            Q(topic_id__in=topic_ids)
        )
        notes = StudyMaterial.objects.filter(
            Q(chapter=instance) |
            Q(topic_id__in=topic_ids)
        )

    elif isinstance(instance, Topic):
        topic_ids = [instance.id]
        questions = Question.objects.filter(topic=instance)
        notes = StudyMaterial.objects.filter(topic=instance)

    deleted_counts = {
        'questions': 0,
        'notes': 0,
        'examinations': 0,
        'subjective_question_sets': 0,
        'question_sets': 0,
        'question_collections': 0,
        'courses': 0,
        'topics': len(topic_ids),
        'chapters': len(chapter_ids),
        'subjects': len(subject_ids),
        'papers': len(paper_ids),
        'exams': len(exam_ids),
    }

    from django.db import transaction
    with transaction.atomic():
        if 'questions' in locals():
            deleted_counts['questions'] = questions.count()
            # Explicit delete to trigger CASCADE on all dependent models (attempts, answers, etc.)
            questions.delete()

        if 'examinations' in locals():
            deleted_counts['examinations'] = examinations.count()
            examinations.delete()

        if 'subj_sets' in locals():
            deleted_counts['subjective_question_sets'] = subj_sets.count()
            subj_sets.delete()

        if 'q_sets' in locals():
            deleted_counts['question_sets'] = q_sets.count()
            q_sets.delete()

        if 'q_cols' in locals():
            deleted_counts['question_collections'] = q_cols.count()
            q_cols.delete()

        if 'notes' in locals():
            deleted_counts['notes'] = notes.count()
            notes.delete()

        if 'courses' in locals():
            deleted_counts['courses'] = courses.count()
            courses.delete()

        # Delete nodes bottom-up
        if topic_ids:
            Topic.objects.filter(id__in=topic_ids).delete()
        if chapter_ids:
            Chapter.objects.filter(id__in=chapter_ids).delete()
        if subject_ids:
            Subject.objects.filter(id__in=subject_ids).delete()
        if paper_ids:
            Paper.objects.filter(id__in=paper_ids).delete()
        if exam_ids:
            Exam.objects.filter(id__in=exam_ids).delete()

        # Clean up any TrashItems for these object IDs
        all_obj_ids = [str(instance_id)]
        all_obj_ids.extend([str(i) for i in exam_ids + paper_ids + subject_ids + chapter_ids + topic_ids])
        TrashItem.objects.filter(
            app_label__in=['exams', 'notes'],
            object_id__in=all_obj_ids
        ).delete()

        # If instance still exists in db (e.g. ExamCategory), delete it
        if instance.pk:
            try:
                instance.refresh_from_db()
                instance.delete()
            except Exception:
                pass

        # AuditLog
        AuditLog.objects.create(
            actor=user if user and user.is_authenticated else None,
            action='DELETE',
            entity_type=model_name.lower(),
            entity_id=str(instance_id),
            details={
                'title': name,
                'deleted_counts': deleted_counts,
                'cascade': True,
            }
        )

    AdminCacheService.invalidate_syllabus_tree()
    AdminCacheService.invalidate_data_safety()

    return deleted_counts

class BaseSyllabusViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_syllabus_tree()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_syllabus_tree()

    @action(detail=False, methods=['patch'])
    def reorder(self, request):
        serializer = ReorderSerializer(data=request.data, many=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        model_cls = self.get_queryset().model
        items_map = {item['id']: item['order'] for item in serializer.validated_data}
        objs = list(model_cls.objects.filter(id__in=items_map.keys()))

        if len(objs) != len(items_map):
            return Response(
                {"error": "One or more item IDs were not found for reordering."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Context boundary validation: Ensure all reordered items belong to the same parent context
        if model_cls == Subject:
            paper_ids = {obj.paper_id for obj in objs}
            if len(paper_ids) > 1:
                return Response(
                    {"error": "Cannot reorder subjects across different papers or preparations."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif model_cls == Chapter:
            subject_ids = {obj.subject_id for obj in objs}
            if len(subject_ids) > 1:
                return Response(
                    {"error": "Cannot reorder chapters across different subjects."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif model_cls == Topic:
            chapter_ids = {obj.chapter_id for obj in objs}
            if len(chapter_ids) > 1:
                return Response(
                    {"error": "Cannot reorder topics across different chapters."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        for obj in objs:
            obj.order = items_map[obj.id]

        model_cls.objects.bulk_update(objs, ['order'])
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_syllabus_tree()
        return Response({'status': 'reordered', 'updated_count': len(objs)})

    @action(detail=True, methods=['get'])
    def dependencies(self, request, pk=None):
        instance = self.get_object()
        return Response(get_node_dependencies(instance))

    @action(detail=True, methods=['patch', 'post'])
    def archive(self, request, pk=None):
        instance = self.get_object()
        new_active = request.data.get('is_active')
        if new_active is None:
            instance.is_active = not instance.is_active
        else:
            instance.is_active = bool(new_active)
        if hasattr(instance, 'status'):
            instance.status = 'active' if instance.is_active else 'inactive'
        instance.save()
        from .cache_service import AdminCacheService
        AdminCacheService.invalidate_syllabus_tree()
        return Response({
            'id': instance.id,
            'is_active': instance.is_active,
            'status': getattr(instance, 'status', 'active' if instance.is_active else 'inactive'),
            'message': f"{instance} is now {'active' if instance.is_active else 'archived'}."
        })





    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        model_name = instance.__class__.__name__
        name = getattr(instance, 'name', getattr(instance, 'title', str(instance)))

        deleted_counts = cascade_delete_syllabus_node(instance, user=request.user)

        return Response({
            'success': True,
            'message': f"{model_name} '{name}' and all associated nodes and questions were successfully deleted.",
            'deleted_counts': deleted_counts,
        }, status=status.HTTP_200_OK)

class ExamCategoryViewSet(BaseSyllabusViewSet):
    serializer_class = ExamCategorySerializer

    def get_queryset(self):
        from django.db.models import Count
        return ExamCategory.objects.annotate(
            position_count_annotated=Count('exams', distinct=True)
        ).order_by('order', 'id')

class ExamViewSet(BaseSyllabusViewSet):
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        from django.db.models import Count, Q
        queryset = Exam.objects.select_related('category', 'parent').annotate(
            paper_count_annotated=Count('papers', distinct=True),
            exams_count_annotated=Count('examinations', distinct=True),
            notes_count_annotated=Count('materials', filter=~Q(materials__status='archived'), distinct=True),
            questions_count_annotated=Count('questions', distinct=True)
        ).order_by('order', 'id')
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

class PaperViewSet(BaseSyllabusViewSet):
    serializer_class = PaperSerializer
    
    def get_queryset(self):
        from django.db.models import Count
        queryset = Paper.objects.select_related('exam').annotate(
            subject_count_annotated=Count('subjects', distinct=True)
        ).order_by('order', 'id')
        exam_id = self.request.query_params.get('exam', None)
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        return queryset

class SubjectViewSet(BaseSyllabusViewSet):
    serializer_class = SubjectSerializer
    
    def get_queryset(self):
        from django.db.models import Count, Q
        queryset = Subject.objects.select_related('paper__exam').annotate(
            chapter_count_annotated=Count('chapters', distinct=True),
            exams_count_annotated=Count('examinations', distinct=True),
            notes_count_annotated=Count('materials', filter=~Q(materials__status='archived'), distinct=True),
            questions_count_annotated=Count('questions', distinct=True)
        ).order_by('order', 'id')
        paper_id = self.request.query_params.get('paper', None)
        if paper_id:
            queryset = queryset.filter(paper_id=paper_id)
        # A Subject belongs to an Exam through its Paper. The UI calls an Exam a
        # "Position", so allow narrowing straight to one without picking a Paper.
        exam_id = self.request.query_params.get('exam', None) or self.request.query_params.get('exam_id', None)
        if exam_id:
            queryset = queryset.filter(paper__exam_id=exam_id)
        category_id = self.request.query_params.get('category', None) or self.request.query_params.get('category_id', None)
        if category_id:
            queryset = queryset.filter(paper__exam__category_id=category_id)
        return queryset

class ChapterViewSet(BaseSyllabusViewSet):
    serializer_class = ChapterSerializer
    
    def get_queryset(self):
        from django.db.models import Count
        queryset = Chapter.objects.select_related('subject__paper__exam').annotate(
            topic_count_annotated=Count('topics', distinct=True)
        ).order_by('order', 'id')
        subject_id = self.request.query_params.get('subject', None) or self.request.query_params.get('subject_id', None)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        exam_id = self.request.query_params.get('exam', None) or self.request.query_params.get('exam_id', None)
        if exam_id:
            queryset = queryset.filter(subject__paper__exam_id=exam_id)
        category_id = self.request.query_params.get('category', None) or self.request.query_params.get('category_id', None)
        if category_id:
            queryset = queryset.filter(subject__paper__exam__category_id=category_id)
        return queryset

class TopicViewSet(BaseSyllabusViewSet):
    serializer_class = TopicSerializer
    
    def get_queryset(self):
        queryset = Topic.objects.select_related('chapter__subject__paper__exam').order_by('order', 'id')
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        chapter_id = self.request.query_params.get('chapter', None) or self.request.query_params.get('chapter_id', None)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        subject_id = self.request.query_params.get('subject', None) or self.request.query_params.get('subject_id', None)
        if subject_id:
            queryset = queryset.filter(chapter__subject_id=subject_id)
        exam_id = self.request.query_params.get('exam', None) or self.request.query_params.get('exam_id', None)
        if exam_id:
            queryset = queryset.filter(chapter__subject__paper__exam_id=exam_id)
        category_id = self.request.query_params.get('category', None) or self.request.query_params.get('category_id', None)
        if category_id:
            queryset = queryset.filter(chapter__subject__paper__exam__category_id=category_id)
        return queryset

from rest_framework.views import APIView

class SyllabusTreeView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        use_cache = not getattr(settings, 'TESTING', False)
        if use_cache:
            from django.core.cache import cache
            cache_key = 'admin:syllabus:tree'
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return Response(cached)
            except Exception:
                pass

        from collections import defaultdict

        categories = list(ExamCategory.objects.only('id', 'name', 'is_active', 'order').order_by('order', 'id'))
        exams = list(Exam.objects.only('id', 'name', 'status', 'is_active', 'category_id', 'parent_id', 'order').order_by('order', 'id'))
        papers = list(Paper.objects.only('id', 'name', 'is_active', 'exam_id', 'order').order_by('order', 'id'))
        subjects = list(Subject.objects.only('id', 'name', 'is_active', 'paper_id', 'order').order_by('order', 'id'))
        chapters = list(Chapter.objects.only('id', 'title', 'is_active', 'subject_id', 'order').order_by('order', 'id'))
        topics = list(Topic.objects.only('id', 'name', 'is_active', 'chapter_id', 'order').order_by('order', 'id'))

        topics_by_chapter = defaultdict(list)
        for t in topics:
            topics_by_chapter[t.chapter_id].append({'id': t.id, 'name': t.name, 'is_active': t.is_active})

        chapters_by_subject = defaultdict(list)
        for c in chapters:
            chapters_by_subject[c.subject_id].append({
                'id': c.id,
                'name': c.title,
                'is_active': c.is_active,
                'topics': topics_by_chapter.get(c.id, [])
            })

        subjects_by_paper = defaultdict(list)
        for s in subjects:
            subjects_by_paper[s.paper_id].append({
                'id': s.id,
                'name': s.name,
                'is_active': s.is_active,
                'chapters': chapters_by_subject.get(s.id, [])
            })

        papers_by_exam = defaultdict(list)
        for p in papers:
            papers_by_exam[p.exam_id].append({
                'id': p.id,
                'name': p.name,
                'is_active': p.is_active,
                'subjects': subjects_by_paper.get(p.id, [])
            })

        child_exams_by_parent = defaultdict(list)
        root_exams_by_category = defaultdict(list)
        for e in exams:
            if e.parent_id is None:
                root_exams_by_category[e.category_id].append(e)
            else:
                child_exams_by_parent[e.parent_id].append(e)

        def assemble_exam(exam):
            return {
                'id': exam.id,
                'name': exam.name,
                'status': exam.status,
                'is_active': exam.is_active,
                'category_id': exam.category_id,
                'children': [assemble_exam(child) for child in child_exams_by_parent.get(exam.id, [])],
                'papers': papers_by_exam.get(exam.id, [])
            }

        tree_data = []
        for cat in categories:
            tree_data.append({
                'id': cat.id,
                'name': cat.name,
                'is_active': cat.is_active,
                'positions': [assemble_exam(exam) for exam in root_exams_by_category.get(cat.id, [])]
            })

        if use_cache:
            try:
                cache.set(cache_key, tree_data, 600)  # 10m TTL
            except Exception:
                pass
        return Response(tree_data)

class SyllabusStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        use_cache = not getattr(settings, 'TESTING', False)
        if use_cache:
            from django.core.cache import cache
            cache_key = 'admin:syllabus:stats'
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return Response(cached)
            except Exception:
                pass

        data = {
            'categories': ExamCategory.objects.count(),
            'exams': Exam.objects.count(),
            'papers': Paper.objects.count(),
            'subjects': Subject.objects.count(),
            'chapters': Chapter.objects.count(),
            'topics': Topic.objects.count()
        }
        if use_cache:
            try:
                cache.set(cache_key, data, 180)  # 3m TTL
            except Exception:
                pass
        return Response(data)
