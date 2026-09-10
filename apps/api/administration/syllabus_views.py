from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from administration.permissions import IsAdminUser
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from .syllabus_serializers import (
    ExamCategorySerializer, ExamSerializer, PaperSerializer, SubjectSerializer, 
    ChapterSerializer, TopicSerializer, ReorderSerializer
)

class BaseSyllabusViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['patch'])
    def reorder(self, request):
        serializer = ReorderSerializer(data=request.data, many=True)
        if serializer.is_valid():
            objects_to_update = []
            for item in serializer.validated_data:
                obj = self.get_queryset().model.objects.get(id=item['id'])
                obj.order = item['order']
                objects_to_update.append(obj)
            
            self.get_queryset().model.objects.bulk_update(objects_to_update, ['order'])
            return Response({'status': 'reordered'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExamCategoryViewSet(BaseSyllabusViewSet):
    queryset = ExamCategory.objects.all().order_by('order', 'id')
    serializer_class = ExamCategorySerializer

    def destroy(self, request, *args, **kwargs):
        """Allow cascade delete — Django will delete child exams, papers, subjects, chapters, topics."""
        return super().destroy(request, *args, **kwargs)

class ExamViewSet(BaseSyllabusViewSet):
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        queryset = Exam.objects.all().order_by('order', 'id')
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Allow cascade delete — Django will delete child papers, subjects, chapters, topics."""
        return super().destroy(request, *args, **kwargs)

class PaperViewSet(BaseSyllabusViewSet):
    serializer_class = PaperSerializer
    
    def get_queryset(self):
        queryset = Paper.objects.all().order_by('order', 'id')
        exam_id = self.request.query_params.get('exam', None)
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Allow cascade delete — Django will delete child subjects, chapters, topics."""
        return super().destroy(request, *args, **kwargs)

class SubjectViewSet(BaseSyllabusViewSet):
    serializer_class = SubjectSerializer
    
    def get_queryset(self):
        queryset = Subject.objects.all().order_by('order', 'id')
        paper_id = self.request.query_params.get('paper', None)
        if paper_id:
            queryset = queryset.filter(paper_id=paper_id)
        # A Subject belongs to an Exam through its Paper. The UI calls an Exam a
        # "Position", so allow narrowing straight to one without picking a Paper.
        exam_id = self.request.query_params.get('exam', None)
        if exam_id:
            queryset = queryset.filter(paper__exam_id=exam_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Allow cascade delete — Django will delete child chapters and topics."""
        return super().destroy(request, *args, **kwargs)

class ChapterViewSet(BaseSyllabusViewSet):
    serializer_class = ChapterSerializer
    
    def get_queryset(self):
        queryset = Chapter.objects.all().order_by('order', 'id')
        subject_id = self.request.query_params.get('subject', None)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Allow cascade delete — Django will delete child topics and questions."""
        return super().destroy(request, *args, **kwargs)

class TopicViewSet(BaseSyllabusViewSet):
    serializer_class = TopicSerializer
    
    def get_queryset(self):
        queryset = Topic.objects.all().order_by('order', 'id')
        chapter_id = self.request.query_params.get('chapter', None)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset

from rest_framework.views import APIView

class SyllabusTreeView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        categories = ExamCategory.objects.prefetch_related(
            'exams__children__children__papers__subjects__chapters__topics',
            'exams__papers__subjects__chapters__topics',
        ).order_by('order', 'id')

        def build_paper(paper):
            paper_data = {
                'id': paper.id,
                'name': paper.name,
                'is_active': paper.is_active,
                'subjects': [],
            }
            for sub in paper.subjects.all().order_by('order', 'id'):
                sub_data = {
                    'id': sub.id,
                    'name': sub.name,
                    'is_active': sub.is_active,
                    'chapters': [],
                }
                for chap in sub.chapters.all().order_by('order', 'id'):
                    chap_data = {
                        'id': chap.id,
                        'name': chap.title,
                        'is_active': chap.is_active,
                        'topics': [
                            {'id': topic.id, 'name': topic.name, 'is_active': topic.is_active}
                            for topic in chap.topics.all().order_by('order', 'id')
                        ],
                    }
                    sub_data['chapters'].append(chap_data)
                paper_data['subjects'].append(sub_data)
            return paper_data

        # Exam is self-nesting (see exams.models.Exam): a "Level" (4th/5th/7th
        # Level) is a parent-less Exam row, and its child Exam rows are the
        # "Preparation/Service" underneath it (e.g. Civil Engineering). Build
        # that nesting recursively instead of flattening every Exam row in
        # the category onto one list, which mixed Levels and Services
        # together as siblings.
        def build_exam(exam):
            return {
                'id': exam.id,
                'name': exam.name,
                'status': exam.status,
                'is_active': exam.is_active,
                'category_id': exam.category_id,
                'children': [
                    build_exam(child) for child in exam.children.all().order_by('order', 'id')
                ],
                'papers': [
                    build_paper(paper) for paper in exam.papers.all().order_by('order', 'id')
                ],
            }

        tree_data = []
        for cat in categories:
            cat_data = {
                'id': cat.id,
                'name': cat.name,
                'is_active': cat.is_active,
                'positions': [
                    build_exam(exam)
                    for exam in cat.exams.filter(parent__isnull=True).order_by('order', 'id')
                ],
            }
            tree_data.append(cat_data)

        return Response(tree_data)

class SyllabusStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        return Response({
            'categories': ExamCategory.objects.count(),
            'exams': Exam.objects.count(),
            'papers': Paper.objects.count(),
            'subjects': Subject.objects.count(),
            'chapters': Chapter.objects.count(),
            'topics': Topic.objects.count()
        })
