"""Regression coverage for StudentExaminationViewSet._build_question_filter().

Every multi-hop lookup above chapter-level (subject/paper/exam scope) was
missing the `chapter__` segment - Topic has no direct `subject` field, only
via `chapter` - so selecting a custom exam scoped to a subject, paper, or
exam (as opposed to a specific chapter or topic) raised
"Unsupported lookup ... for ForeignKey" and 500'd both the availability
check and the actual generation endpoint.
"""
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question

User = get_user_model()


class CustomExamBuilderFilterTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student1', password='pass123', role='student')

        self.category = ExamCategory.objects.create(name='Public Service')
        self.exam = Exam.objects.create(category=self.category, name='Section Officer')
        self.paper = Paper.objects.create(exam=self.exam, name='First Paper')
        self.subject = Subject.objects.create(paper=self.paper, name='General Knowledge')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Geography')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Rivers')

        self.question = Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved',
            text='Which is the longest river in Nepal?',
            option_a='Koshi', option_b='Karnali', option_c='Gandaki', option_d='Bagmati',
            correct_option='B',
        )

        self.client.force_authenticate(user=self.student)

    def test_available_questions_scoped_to_exam(self):
        response = self.client.post('/api/student/exams/available-questions/', {
            'exam_id': self.exam.id, 'question_type': 'mcq',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], 1)

    def test_available_questions_scoped_to_paper(self):
        response = self.client.post('/api/student/exams/available-questions/', {
            'paper_id': self.paper.id, 'question_type': 'mcq',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], 1)

    def test_available_questions_scoped_to_subject(self):
        response = self.client.post('/api/student/exams/available-questions/', {
            'subject_id': self.subject.id, 'question_type': 'mcq',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], 1)

    def test_generate_custom_exam_scoped_to_exam(self):
        response = self.client.post('/api/student/exams/generate_custom/', {
            'exam_id': self.exam.id, 'question_type': 'mcq', 'question_count': 1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
