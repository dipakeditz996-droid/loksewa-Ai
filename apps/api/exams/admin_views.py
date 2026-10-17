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

from administration.syllabus_views import (
    ExamCategoryViewSet as AdminExamCategoryViewSet,
    ExamViewSet as AdminExamViewSet,
    PaperViewSet as AdminPaperViewSet,
    SubjectViewSet as AdminSubjectViewSet,
    ChapterViewSet as AdminChapterViewSet,
    TopicViewSet as AdminTopicViewSet,
)

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
