"""PublicCourseListView (/api/courses/public/) powers the homepage's Courses
section. Covers: a course with an exam linked no longer 500s (it read
`exam.title`, but core.models.Exam only has `.name`), and the response now
carries real subject/enrollment counts instead of the frontend inventing them.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject
from courses.models import Course, Enrollment


class PublicCourseListViewTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(name='Kharidar', category=self.category)
        paper = Paper.objects.create(exam=self.exam, name='Paper 1')
        Subject.objects.create(paper=paper, name='GK')
        Subject.objects.create(paper=paper, name='Math')

        self.course = Course.objects.create(
            title='Kharidar Foundation', slug='kharidar-foundation',
            short_description='Complete Kharidar prep.', status='published',
            is_open_for_enrollment=True, exam=self.exam, duration_months=6,
        )

    def test_course_with_linked_exam_does_not_500(self):
        """Regression test: `exam.title` on core.models.Exam raised
        AttributeError (the field is `.name`) for any course with an exam set."""
        response = self.client.get('/api/courses/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['exam']['title'], 'Kharidar')

    def test_reports_real_subject_count(self):
        response = self.client.get('/api/courses/public/')
        self.assertEqual(response.data[0]['subject_count'], 2)

    def test_reports_real_enrolled_count(self):
        for i in range(3):
            student = User.objects.create_user(
                username=f'stud{i}', email=f's{i}@test.com', password='pass123', role='student')
            Enrollment.objects.create(student=student, course=self.course, status='active')
        cancelled_student = User.objects.create_user(
            username='cancelled', email='c@test.com', password='pass123', role='student')
        Enrollment.objects.create(student=cancelled_student, course=self.course, status='cancelled')

        response = self.client.get('/api/courses/public/')
        self.assertEqual(response.data[0]['enrolled_count'], 3)

    def test_unpublished_courses_are_excluded(self):
        Course.objects.create(
            title='Draft Course', slug='draft-course', status='draft', is_open_for_enrollment=True,
        )
        response = self.client.get('/api/courses/public/')
        titles = [c['title'] for c in response.data]
        self.assertNotIn('Draft Course', titles)

    def test_anonymous_access_allowed(self):
        response = self.client.get('/api/courses/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TeacherCourseViewSetTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', email='teacher@test.com', password='pass', role='teacher'
        )
        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(name='Kharidar', category=self.category)
        self.course = Course.objects.create(
            title='Teacher Course', slug='teacher-course', status='published',
            is_open_for_enrollment=True, exam=self.exam, duration_months=6,
        )
        from courses.models import TeacherCourseAssignment
        TeacherCourseAssignment.objects.create(teacher=self.teacher, course=self.course)

    def test_teacher_course_list_success(self):
        """Regression test for Bug 3: Teacher course list does not throw FieldError"""
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get('/api/teacher/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
