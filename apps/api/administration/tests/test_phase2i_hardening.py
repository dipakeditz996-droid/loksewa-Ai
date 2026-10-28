from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import User
from administration.views import AdminUsersView, AdminEvaluatorListView, AdminCourseApplicationView
from administration.cache_service import AdminCacheService, CACHE_KEY_SYLLABUS_STATS, CACHE_KEY_SYLLABUS_TREE
from courses.models import Course, CourseApplication
from exams.models import ExamCategory, Exam

class Phase2IHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            username='admin_test_p2i',
            email='admin_p2i@test.com',
            password='Password123!',
            role='admin',
            is_staff=True,
            is_active=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_test_p2i',
            email='teacher_p2i@test.com',
            password='Password123!',
            role='teacher',
            is_active=True
        )
        self.student = User.objects.create_user(
            username='student_test_p2i',
            email='student_p2i@test.com',
            password='Password123!',
            role='student',
            is_active=True
        )
        self.category = ExamCategory.objects.create(name='Cat P2I')
        self.exam = Exam.objects.create(name='Exam P2I', category=self.category)
        self.course = Course.objects.create(
            title='Course P2I',
            slug='course-p2i',
            exam=self.exam,
            status='published'
        )

    def test_admin_users_view_projected_fields(self):
        req = self.factory.get('/api/admin/users/?page=1&page_size=10')
        force_authenticate(req, user=self.admin)
        view = AdminUsersView.as_view()
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('users', resp.data)
        self.assertIn('total', resp.data)
        usernames = [u['username'] for u in resp.data['users']]
        self.assertIn('student_test_p2i', usernames)
        self.assertIn('admin_test_p2i', usernames)

    def test_admin_evaluator_list_view_projected_fields(self):
        req = self.factory.get('/api/admin/evaluators/?page=1&page_size=10')
        force_authenticate(req, user=self.admin)
        view = AdminEvaluatorListView.as_view()
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('evaluators', resp.data)
        self.assertIn('total', resp.data)
        evaluator_usernames = [e['username'] for e in resp.data['evaluators']]
        self.assertIn('teacher_test_p2i', evaluator_usernames)
        self.assertNotIn('student_test_p2i', evaluator_usernames)

    def test_admin_course_application_view_projected_fields(self):
        app = CourseApplication.objects.create(
            student=self.student,
            course=self.course,
            status='pending',
            note='Test application'
        )
        req = self.factory.get('/api/admin/course-applications/?page=1&per_page=10')
        force_authenticate(req, user=self.admin)
        view = AdminCourseApplicationView.as_view()
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get('results', [])
        self.assertTrue(len(results) >= 1)
        found = next((item for item in results if item['id'] == app.id), None)
        self.assertIsNotNone(found)
        self.assertEqual(found['student']['username'], 'student_test_p2i')
        self.assertEqual(found['course']['title'], 'Course P2I')
        self.assertEqual(found['application_status'], 'pending')

    def test_cache_service_invalidation_keys(self):
        cache.set(CACHE_KEY_SYLLABUS_TREE, {'test': 1}, 60)
        cache.set(CACHE_KEY_SYLLABUS_STATS, {'test': 2}, 60)
        AdminCacheService.invalidate_syllabus_tree()
        self.assertIsNone(cache.get(CACHE_KEY_SYLLABUS_TREE))
        self.assertIsNone(cache.get(CACHE_KEY_SYLLABUS_STATS))
