from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count, Q

from .models import Exam, ExamCategory, Subject, Examination, QuestionSet, Question


class PublicExamPreferenceTreeView(APIView):
    """GET /api/public/exam-preferences/ - the "what are you preparing for?"
    picker for registration: active ExamCategory rows, each with its Exam
    tree nested arbitrarily deep via Exam.parent (Level -> Service/Faculty,
    or however many levels a category actually has). Admin-managed through
    the existing ExamCategory/Exam CRUD - nothing here is hardcoded, so a
    new level or category shows up on the registration form with no
    frontend change."""
    permission_classes = [AllowAny]

    def get(self, request):
        def serialize_exam(exam, children_by_parent):
            return {
                'id': exam.id,
                'name': exam.name,
                'children': [
                    serialize_exam(child, children_by_parent)
                    for child in children_by_parent.get(exam.id, [])
                ],
            }

        categories = ExamCategory.objects.filter(is_active=True).order_by('order', 'name')
        exams = Exam.objects.filter(is_active=True, category__in=categories).order_by('order', 'name')

        children_by_parent = {}
        top_level_by_category = {}
        for exam in exams:
            if exam.parent_id:
                children_by_parent.setdefault(exam.parent_id, []).append(exam)
            else:
                top_level_by_category.setdefault(exam.category_id, []).append(exam)

        data = [
            {
                'id': category.id,
                'name': category.name,
                'exams': [
                    serialize_exam(exam, children_by_parent)
                    for exam in top_level_by_category.get(category.id, [])
                ],
            }
            for category in categories
        ]
        return Response(data)


class PublicSyllabusTreeView(APIView):
    """GET /api/public/syllabus/ - the active academic hierarchy (exam > paper >
    subject > chapter > topic) for the anonymous Syllabus page. Mirrors the
    admin academic tree but scoped to is_active records only, with real
    topic/question counts instead of hand-authored numbers."""
    permission_classes = [AllowAny]

    def get(self, request):
        exams = Exam.objects.filter(is_active=True).select_related('category').prefetch_related(
            'papers__subjects__chapters__topics',
        ).order_by('order')

        data = []
        for exam in exams:
            papers = []
            subjects_count = 0
            for paper in exam.papers.filter(is_active=True).order_by('order'):
                subjects = []
                for subject in paper.subjects.filter(is_active=True).order_by('order'):
                    topic_groups = []
                    topics_count = 0
                    for chapter in subject.chapters.filter(is_active=True).order_by('order'):
                        topics = list(
                            chapter.topics.filter(is_active=True).order_by('order').values_list('name', flat=True)
                        )
                        topics_count += len(topics)
                        topic_groups.append({'id': chapter.id, 'name': chapter.title, 'topics': topics})
                    questions_count = Question.objects.filter(
                        topic__chapter__subject=subject, status='approved'
                    ).count()
                    subjects.append({
                        'id': subject.id,
                        'name': subject.name,
                        'topicsCount': topics_count,
                        'questionsCount': questions_count,
                        'topicGroups': topic_groups,
                    })
                subjects_count += len(subjects)
                papers.append({
                    'id': paper.id,
                    'name': paper.name,
                    'title': paper.description or paper.name,
                    'subjects': subjects,
                })
            data.append({
                'id': exam.id,
                'name': exam.name,
                'level': exam.category.name if exam.category else '',
                'description': exam.description,
                'papersCount': len(papers),
                'subjectsCount': subjects_count,
                'papers': papers,
            })
        return Response(data)


class PublicExaminationListView(APIView):
    """GET /api/public/exams/ - published mock/practice examinations for the
    anonymous Exams page. Only metadata is exposed; questions themselves are
    never returned pre-login."""
    permission_classes = [AllowAny]

    def get(self, request):
        exams = Examination.objects.filter(status='published').select_related(
            'exam', 'subject', 'subject__paper'
        ).order_by('-created_at')[:30]

        data = []
        for e in exams:
            data.append({
                'id': e.id,
                'title': e.title,
                'level': e.exam.name if e.exam else None,
                'type': e.get_exam_type_display(),
                'paper': e.subject.paper.name if e.subject and e.subject.paper else 'Mixed',
                'questions': e.total_questions,
                'duration': e.time_limit,
                'subjects': [e.subject.name] if e.subject else [],
                'status': e.computed_status,
            })
        return Response(data)


class PublicSubjectListView(APIView):
    """GET /api/public/subjects/ - active subjects ranked by their real
    approved-question count, for the anonymous Practice page's
    'Practice by Subject' grid."""
    permission_classes = [AllowAny]

    def get(self, request):
        subjects = Subject.objects.filter(is_active=True).annotate(
            q_count=Count(
                'chapters__topics__questions',
                filter=Q(chapters__topics__questions__status='approved'),
                distinct=True,
            )
        ).order_by('-q_count', 'name')[:12]

        data = [{'id': s.id, 'name': s.name, 'questionsCount': s.q_count} for s in subjects]
        return Response(data)


class PublicQuestionSetListView(APIView):
    """GET /api/public/practice-sets/ - published practice sets for the
    anonymous Practice page's 'Popular Practice Sets' grid."""
    permission_classes = [AllowAny]

    def get(self, request):
        sets = QuestionSet.objects.filter(status='published').select_related('exam', 'subject').order_by('-created_at')[:9]

        data = []
        for qs in sets:
            difficulty = 'Mixed'
            if qs.difficulty_distribution:
                try:
                    difficulty = max(qs.difficulty_distribution, key=qs.difficulty_distribution.get).capitalize()
                except (ValueError, TypeError):
                    difficulty = 'Mixed'
            data.append({
                'id': qs.id,
                'name': qs.name,
                'exam': qs.exam.name if qs.exam else None,
                'subject': qs.subject.name if qs.subject else None,
                'difficulty': difficulty,
                'estimatedMinutes': qs.time_limit,
                'questionsCount': qs.total_questions,
            })
        return Response(data)
