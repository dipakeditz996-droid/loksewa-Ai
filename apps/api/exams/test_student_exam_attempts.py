from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam, Question, StudentAnswer

User = get_user_model()

class StudentExaminationAttemptTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student1', password='password', role='student')
        self.other_student = User.objects.create_user(username='student2', password='password', role='student')
        
        self.category = ExamCategory.objects.create(name='Test Category')
        self.exam_level = Exam.objects.create(name='Test Level', category=self.category)
        
        self.examination = Examination.objects.create(
            title='Test Exam',
            category=self.category,
            exam=self.exam_level,
            total_questions=10,
            status='published'
        )
        
        from exams.models import Chapter, Paper, Subject, Topic

        self.paper = Paper.objects.create(exam=self.exam_level, name='Test Paper')
        self.subject = Subject.objects.create(name='Test Subject', paper=self.paper)
        self.chapter = Chapter.objects.create(subject=self.subject, title='Test Chapter')
        self.topic = Topic.objects.create(name='Test Topic', chapter=self.chapter)
        
        self.question = Question.objects.create(
            text='Test Q1',
            option_a='A', option_b='B', option_c='C', option_d='D',
            correct_option='a',
            topic=self.topic
        )

    def test_list_submitted_attempts(self):
        self.client.force_authenticate(user=self.student)
        
        # Create submitted attempt
        attempt1 = ExaminationAttempt.objects.create(
            student=self.student,
            examination=self.examination,
            status='submitted',
            score=5
        )
        # Create in-progress attempt
        attempt2 = ExaminationAttempt.objects.create(
            student=self.student,
            examination=self.examination,
            status='in-progress'
        )
        # Create other student's attempt
        attempt3 = ExaminationAttempt.objects.create(
            student=self.other_student,
            examination=self.examination,
            status='submitted'
        )
        
        StudentAnswer.objects.create(
            attempt=attempt1,
            question=self.question,
            selected_option='a',
            is_correct=True
        )

        url = reverse('student-exam-attempt-list')
        response = self.client.get(f"{url}?status=submitted")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Assuming pagination is enabled, response might be a dict with 'results'
        data = response.data.get('results', response.data) if isinstance(response.data, dict) and 'results' in response.data else response.data
        
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['id'], attempt1.id)
        self.assertEqual(data[0]['total_questions'], 10)
        self.assertEqual(data[0]['correct_answers'], 1)
        self.assertEqual(data[0]['wrong_answers'], 0)
        self.assertEqual(data[0]['unanswered'], 0)
        self.assertNotIn('answers', data[0])  # Should use ListSerializer without answers

    def test_unauthenticated(self):
        url = reverse('student-exam-attempt-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
