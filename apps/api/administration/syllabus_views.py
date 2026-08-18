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
        instance = self.get_object()
        if instance.exams.exists():
            return Response({'detail': f'Cannot delete category "{instance.name}" because it contains {instance.exams.count()} positions.'}, status=status.HTTP_400_BAD_REQUEST)
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
        instance = self.get_object()
        if instance.papers.exists():
            return Response({'detail': f'Cannot delete exam "{instance.name}" because it contains {instance.papers.count()} papers.'}, status=status.HTTP_400_BAD_REQUEST)
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
        instance = self.get_object()
        if instance.subjects.exists():
            return Response({'detail': f'Cannot delete paper "{instance.name}" because it contains {instance.subjects.count()} subjects.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class SubjectViewSet(BaseSyllabusViewSet):
    serializer_class = SubjectSerializer
    
    def get_queryset(self):
        queryset = Subject.objects.all().order_by('order', 'id')
        paper_id = self.request.query_params.get('paper', None)
        if paper_id:
            queryset = queryset.filter(paper_id=paper_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.chapters.exists():
            return Response({'detail': f'Cannot delete subject "{instance.name}" because it contains {instance.chapters.count()} chapters.'}, status=status.HTTP_400_BAD_REQUEST)
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
        instance = self.get_object()
        if hasattr(instance, 'topics') and instance.topics.exists():
            return Response({'detail': f'Cannot delete chapter "{instance.title}" because it contains {instance.topics.count()} topics.'}, status=status.HTTP_400_BAD_REQUEST)
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
            'exams__papers__subjects__chapters__topics'
        ).order_by('order', 'id')

        tree_data = []
        for cat in categories:
            cat_data = {
                'id': cat.id,
                'name': cat.name,
                'is_active': cat.is_active,
                'positions': []
            }
            for exam in cat.exams.all().order_by('order', 'id'):
                exam_data = {
                    'id': exam.id,
                    'name': exam.name,
                    'is_active': exam.is_active,
                    'papers': []
                }
                for paper in exam.papers.all().order_by('order', 'id'):
                    paper_data = {
                        'id': paper.id,
                        'name': paper.name,
                        'is_active': paper.is_active,
                        'subjects': []
                    }
                    for sub in paper.subjects.all().order_by('order', 'id'):
                        sub_data = {
                            'id': sub.id,
                            'name': sub.name,
                            'is_active': sub.is_active,
                            'chapters': []
                        }
                        for chap in sub.chapters.all().order_by('order', 'id'):
                            chap_data = {
                                'id': chap.id,
                                'name': chap.title,
                                'is_active': chap.is_active,
                                'topics': []
                            }
                            for topic in chap.topics.all().order_by('order', 'id'):
                                chap_data['topics'].append({
                                    'id': topic.id,
                                    'name': topic.name,
                                    'is_active': topic.is_active
                                })
                            sub_data['chapters'].append(chap_data)
                        paper_data['subjects'].append(sub_data)
                    exam_data['papers'].append(paper_data)
                cat_data['positions'].append(exam_data)
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
