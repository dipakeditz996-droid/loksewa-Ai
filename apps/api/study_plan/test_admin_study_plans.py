from rest_framework.test import APITestCase
from rest_framework import status
from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from courses.models import Course, Enrollment
from study_plan.models import StudyPlanTemplate, StudyPlanTemplateTask, StudyPlan, StudyTask

class AdminStudyPlanTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='password', role='admin')
        self.student = User.objects.create_user(username='student', password='password', role='student')
        self.teacher = User.objects.create_user(username='teacher', password='password', role='teacher')

        self.category = ExamCategory.objects.create(name='Test Category')
        self.exam = Exam.objects.create(category=self.category, name='Test Exam')
        self.course = Course.objects.create(title='Test Course', exam=self.exam, duration_months=3)
        self.subject = Subject.objects.create(name='Test Subject')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Test Chapter')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Test Topic')

        self.template_url = '/api/study-plan/admin/templates/'

    def test_permissions(self):
        # Anonymous
        res = self.client.get(self.template_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Student
        self.client.force_authenticate(user=self.student)
        res = self.client.get(self.template_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Teacher
        self.client.force_authenticate(user=self.teacher)
        res = self.client.get(self.template_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.template_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_crud_and_safe_delete(self):
        self.client.force_authenticate(user=self.admin)
        
        # Create
        data = {
            'name': '30 Day Plan',
            'description': 'A rigorous 30 day plan',
            'duration_days': 30,
            'exam': self.exam.id,
            'course': self.course.id,
            'is_active': True,
            'tasks': [
                {
                    'day_number': 1,
                    'title': 'Day 1 Topic',
                    'task_type': 'STUDY_NOTE',
                    'subject': self.subject.id,
                    'topic': self.topic.id,
                    'duration_minutes': 60
                }
            ]
        }
        res = self.client.post(self.template_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        template_id = res.data['id']
        
        # Ensure task was created
        template = StudyPlanTemplate.objects.get(id=template_id)
        self.assertEqual(template.tasks.count(), 1)
        
        # Update
        update_data = {
            'name': '30 Day Plan V2',
            'tasks': [
                {
                    'day_number': 1,
                    'title': 'Day 1 Updated',
                    'task_type': 'PRACTICE',
                    'subject': self.subject.id,
                    'topic': self.topic.id,
                    'duration_minutes': 45
                }
            ]
        }
        res = self.client.put(f"{self.template_url}{template_id}/", update_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertEqual(template.name, '30 Day Plan V2')
        self.assertEqual(template.tasks.first().title, 'Day 1 Updated')

        # Safe Delete Check
        # Let's assign it manually to a student
        plan = StudyPlan.objects.create(
            student=self.student,
            exam=self.exam,
            template=template,
            target_date='2030-01-01'
        )
        
        res = self.client.delete(f"{self.template_url}{template_id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Unassign manually
        plan.delete()
        
        # Delete now works
        res = self.client.delete(f"{self.template_url}{template_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_duplicate_and_assign(self):
        self.client.force_authenticate(user=self.admin)
        template = StudyPlanTemplate.objects.create(
            name='Master Plan',
            duration_days=30,
            course=self.course,
            exam=self.exam,
            is_active=True
        )
        StudyPlanTemplateTask.objects.create(
            template=template, day_number=1, title='T1', task_type='STUDY_NOTE', duration_minutes=30
        )
        
        # Duplicate
        res = self.client.post(f"{self.template_url}{template.id}/duplicate/")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_template_id = res.data['id']
        
        new_template = StudyPlanTemplate.objects.get(id=new_template_id)
        self.assertEqual(new_template.name, 'Master Plan - Copy')
        self.assertFalse(new_template.is_active)
        self.assertEqual(new_template.tasks.count(), 1)
        self.assertEqual(new_template.tasks.first().title, 'T1')
        
        # Assign 
        # First enroll student
        Enrollment.objects.create(course=self.course, student=self.student, status='ACTIVE')
        
        # Assign fails if template inactive
        res = self.client.post(f"{self.template_url}{new_template_id}/assign/", {'course_id': self.course.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Activate template
        self.client.post(f"{self.template_url}{new_template_id}/activate/")
        
        # Assign again
        res = self.client.post(f"{self.template_url}{new_template_id}/assign/", {'course_id': self.course.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        
        # Verify student plan created and tasks generated
        self.assertTrue(StudyPlan.objects.filter(student=self.student, template=new_template).exists())
        student_plan = StudyPlan.objects.get(student=self.student, template=new_template)
        
        # Task should have been mapped! 
        self.assertEqual(StudyTask.objects.filter(study_plan=student_plan).count(), 1)
