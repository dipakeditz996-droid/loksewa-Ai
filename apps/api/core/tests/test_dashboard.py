from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from exams.models import Examination
from courses.models import Course
from study_plan.models import StudyPlan, StudyTask
from django.utils import timezone

User = get_user_model()

class StudentDashboardTests(APITestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(
            username='teststudent', 
            password='testpassword123',
            first_name='Test',
            last_name='Student',
            role='student'
        )
        
        # Create a course and exam
        from exams.models import ExamCategory, Exam as PositionExam
        
        self.course = Course.objects.create(title="Loksewa Prep", slug="loksewa-prep")
        self.category = ExamCategory.objects.create(name="Public Service")
        self.position_exam = PositionExam.objects.create(category=self.category, name="Section Officer")
        self.exam = Examination.objects.create(
            title="Test Exam", 
            category=self.category,
            exam=self.position_exam,
            course=self.course, 
            status='published'
        )
        
        # URL for dashboard
        self.url = '/api/dashboard/'

    def test_anonymous_user_rejected(self):
        """Ensure unauthenticated users get 401 Unauthorized"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_student_can_fetch_dashboard(self):
        """Ensure an authenticated student can retrieve their dashboard data"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify structure
        data = response.json()
        self.assertIn('profile', data)
        self.assertIn('stats', data)
        self.assertIn('todaysPlan', data)
        self.assertIn('continueLearning', data)
        
        # Verify profile computation
        self.assertEqual(data['profile']['name'], 'Test Student')
        # Completion percentage should be 50 (base) + 15 (name) = 65
        self.assertEqual(data['profile']['completionPercentage'], 65)

    def test_todays_study_plan_is_returned(self):
        """Ensure tasks scheduled for today are included in todaysPlan"""
        # Create a study plan and task for today
        study_plan = StudyPlan.objects.create(
            student=self.user,
            exam=self.position_exam,
            target_date=timezone.localdate() + timezone.timedelta(days=30)
        )
        task = StudyTask.objects.create(
            study_plan=study_plan,
            date=timezone.localdate(),
            title="Read Chapter 1",
            task_type="STUDY_NOTE",
            duration_minutes=45
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data['todaysPlan']), 1)
        self.assertEqual(data['todaysPlan'][0]['title'], "Read Chapter 1")
        self.assertEqual(data['todaysPlan'][0]['duration'], 45)
