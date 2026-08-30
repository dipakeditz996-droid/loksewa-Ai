from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from courses.models import Course, Enrollment
from marketplace.models import Product, PaymentSubmission, Purchase, PaymentMethod
from exams.models import Question, QuestionSet, Exam, Subject, Topic, ExamCategory, Paper, Chapter
from notes.models import StudyMaterial

User = get_user_model()

class PermissionAndPhase2ATests(APITestCase):
    def setUp(self):
        # Create users
        self.student1 = User.objects.create_user(username='student1', role='student', password='password')
        self.student2 = User.objects.create_user(username='student2', role='student', password='password')
        self.teacher1 = User.objects.create_user(username='teacher1', role='teacher', password='password')
        self.teacher2 = User.objects.create_user(username='teacher2', role='teacher', password='password')
        self.admin1 = User.objects.create_superuser(username='admin1', role='admin', password='password')
        
        # Base setup
        self.category = ExamCategory.objects.create(name='Test Category')
        self.exam = Exam.objects.create(name='Test Exam', category=self.category)
        self.paper = Paper.objects.create(name='Test Paper', exam=self.exam)
        self.subject1 = Subject.objects.create(name='Test Subject', paper=self.paper)
        self.chapter1 = Chapter.objects.create(title='Test Chapter', subject=self.subject1)
        self.topic1 = Topic.objects.create(name='Test Topic', chapter=self.chapter1)
        
        # Course setup
        self.course1 = Course.objects.create(title='Course 1', status='published', exam=self.exam)
        
        # Product setup (category='COURSE')
        self.product1 = Product.objects.create(title='Product 1', category='COURSE', course=self.course1, price=100)
        
        # Marketplace submissions
        self.payment_method = PaymentMethod.objects.create(method_type='ESEWA', display_name='eSewa')
        self.submission1 = PaymentSubmission.objects.create(student=self.student1, product=self.product1, status='PENDING', expected_amount=100, submitted_amount=100, payment_method=self.payment_method)
        
        # Study Material setup
        self.material1 = StudyMaterial.objects.create(title='Material 1', teacher=self.teacher1, status='pending_review', exam=self.exam, subject=self.subject1)
        
        # Question setup
        self.question1 = Question.objects.create(text='Question 1', created_by=self.teacher1, status='pending_review', topic=self.topic1)
        
    def test_student_access_own_object_allowed(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.get('/api/marketplace/student/purchases/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_access_another_student_object_denied(self):
        # Create purchase for student1
        Purchase.objects.create(student=self.student1, product=self.product1, payment_submission=self.submission1, status='ACTIVE', amount_paid=100)
        self.client.force_authenticate(user=self.student2)
        response = self.client.get('/api/marketplace/student/purchases/')
        self.assertEqual(len(response.data), 0) # Should be empty or not found

    def test_teacher_editing_own_content_allowed(self):
        self.client.force_authenticate(user=self.teacher1)
        # Using Teacher notes endpoint, ensure teacher1 can see/update it
        response = self.client.patch(f'/api/notes/teacher/materials/{self.material1.id}/', {'title': 'Updated Title'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_teacher_editing_another_teacher_content_denied(self):
        self.client.force_authenticate(user=self.teacher2)
        response = self.client.patch(f'/api/notes/teacher/materials/{self.material1.id}/', {'title': 'Updated Title 2'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # get_queryset filters out

    def test_teacher_approving_own_content_denied(self):
        # Even if teacher is an admin, self-approval should be denied
        self.teacher1.role = 'admin'
        self.teacher1.is_staff = True
        self.teacher1.is_superuser = True
        self.teacher1.save()
        self.client.force_authenticate(user=self.teacher1)
        
        response = self.client.post(f'/api/notes/admin/materials/{self.material1.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        response2 = self.client.post('/api/admin/questions/bulk_action/', {'action': 'approve', 'ids': [self.question1.id]})
        self.assertEqual(response2.status_code, status.HTTP_403_FORBIDDEN)

    def test_authorized_admin_reviewing_content_allowed(self):
        self.client.force_authenticate(user=self.admin1)
        response = self.client.post(f'/api/notes/admin/materials/{self.material1.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response2 = self.client.post('/api/admin/questions/bulk_action/', {'action': 'approve', 'ids': [self.question1.id]})
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

    def test_unauthorized_user_calling_admin_review_endpoint_denied(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.post(f'/api/notes/admin/materials/{self.material1.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_phase_2a_regression_and_duplicate_prevention(self):
        self.client.force_authenticate(user=self.admin1)
        # First approval
        response = self.client.post(f'/api/marketplace/admin/payment-submissions/{self.submission1.id}/review/', {'status': 'APPROVED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify EXACTLY ONE purchase
        purchases = Purchase.objects.filter(student=self.student1, product=self.product1)
        self.assertEqual(purchases.count(), 1)
        
        # Verify EXACTLY ONE enrollment
        enrollments = Enrollment.objects.filter(student=self.student1, course=self.course1)
        self.assertEqual(enrollments.count(), 1)
        self.assertEqual(enrollments.first().status, 'active')
        
        # Trying to approve again should be rejected since it's no longer PENDING
        response2 = self.client.post(f'/api/marketplace/admin/payment-submissions/{self.submission1.id}/review/', {'status': 'APPROVED'})
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify counts remain 1
        self.assertEqual(Purchase.objects.filter(student=self.student1, product=self.product1).count(), 1)
        self.assertEqual(Enrollment.objects.filter(student=self.student1, course=self.course1).count(), 1)

    def test_admin_created_question_sets_created_by(self):
        # AdminQuestionViewSet.perform_create used to call serializer.save()
        # with no created_by, so every question made through the admin
        # Question Bank UI showed up as "Unknown" everywhere that field is
        # displayed (e.g. the Audit Logs page's Content Created events).
        self.client.force_authenticate(user=self.admin1)
        response = self.client.post('/api/admin/questions/', {
            'text': 'A new admin-authored question',
            'topic': self.topic1.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        question = Question.objects.get(pk=response.data['id'])
        self.assertEqual(question.created_by, self.admin1)
