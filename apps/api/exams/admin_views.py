from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from administration.permissions import IsAdminUser

from .models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from .admin_serializers import (
    AdminExamCategorySerializer, AdminExamSerializer, AdminPaperSerializer,
    AdminSubjectSerializer, AdminChapterSerializer, AdminTopicSerializer
)

class AdminExamCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExamCategory.objects.all().order_by('order', '-created_at')
    serializer_class = AdminExamCategorySerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    filterset_fields = ['is_active']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.exams.exists():
            return Response(
                {"detail": "Cannot delete category because it contains exams."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.select_related('category').all().order_by('order', '-created_at')
    serializer_class = AdminExamSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'is_active', 'parent']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.papers.exists():
            return Response(
                {"detail": "Cannot delete exam because it contains papers."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(instance, 'examinations') and instance.examinations.exists():
            return Response(
                {"detail": "Cannot delete exam because it is referenced by mock exams."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(instance, 'question_sets') and instance.question_sets.exists():
            return Response(
                {"detail": "Cannot delete exam because it is referenced by practice sets."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminPaperViewSet(viewsets.ModelViewSet):
    queryset = Paper.objects.select_related('exam').all().order_by('order', '-created_at')
    serializer_class = AdminPaperSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'paper_number', 'description']
    filterset_fields = ['exam', 'is_active']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.subjects.exists():
            return Response(
                {"detail": "Cannot delete paper because it contains subjects."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminSubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('paper').all().order_by('order', '-created_at')
    serializer_class = AdminSubjectSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'code', 'description']
    filterset_fields = ['paper', 'is_active']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.chapters.exists():
            return Response(
                {"detail": "Cannot delete subject because it contains chapters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(instance, 'examinations') and instance.examinations.exists():
            return Response(
                {"detail": "Cannot delete subject because it is referenced by mock exams."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.select_related('subject').all().order_by('order', '-created_at')
    serializer_class = AdminChapterSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description']
    filterset_fields = ['subject', 'is_active']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.topics.exists():
            return Response(
                {"detail": "Cannot delete chapter because it contains topics."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminTopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.select_related('chapter').all().order_by('order', '-created_at')
    serializer_class = AdminTopicSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    filterset_fields = ['chapter', 'is_active']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'questions') and instance.questions.exists():
            return Response(
                {"detail": "Cannot delete topic because it contains questions."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(instance, 'user_progress') and instance.user_progress.exists():
            return Response(
                {"detail": "Cannot delete topic because student progress exists for it."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class AdminAcademicTreeAPIView(APIView):
    """
    Returns the complete canonical academic hierarchy in a structured tree format.
    Performant version using prefetch_related to avoid N+1 query issues.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        categories = ExamCategory.objects.prefetch_related(
            'exams',
            'exams__papers',
            'exams__papers__subjects',
            'exams__papers__subjects__chapters',
            'exams__papers__subjects__chapters__topics'
        ).all().order_by('order')

        tree = []
        for cat in categories:
            cat_data = {
                'id': cat.id,
                'name': cat.name,
                'is_active': cat.is_active,
                'exams': []
            }
            
            for exam in cat.exams.all():
                exam_data = {
                    'id': exam.id,
                    'name': exam.name,
                    'is_active': exam.is_active,
                    'papers': []
                }
                
                for paper in exam.papers.all():
                    paper_data = {
                        'id': paper.id,
                        'name': paper.name,
                        'is_active': paper.is_active,
                        'subjects': []
                    }
                    
                    for subject in paper.subjects.all():
                        subject_data = {
                            'id': subject.id,
                            'name': subject.name,
                            'is_active': subject.is_active,
                            'chapters': []
                        }
                        
                        for chapter in subject.chapters.all():
                            chapter_data = {
                                'id': chapter.id,
                                'title': chapter.title,
                                'is_active': chapter.is_active,
                                'topics': []
                            }
                            
                            for topic in chapter.topics.all():
                                chapter_data['topics'].append({
                                    'id': topic.id,
                                    'name': topic.name,
                                    'is_active': topic.is_active
                                })
                                
                            subject_data['chapters'].append(chapter_data)
                        paper_data['subjects'].append(subject_data)
                    exam_data['papers'].append(paper_data)
                cat_data['exams'].append(exam_data)
            tree.append(cat_data)
            
        return Response(tree)
