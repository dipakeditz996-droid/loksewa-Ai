"""PublicCourseListView (/api/courses/public/) powers the homepage's Courses
section. Covers: a course with an exam linked no longer 500s (it read
`exam.title`, but core.models.Exam only has `.name`), and the response now
carries real subject/enrollment counts instead of the frontend inventing them.
"""
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
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

    def test_course_hierarchy_includes_active_categories_regardless_of_database_ids(self):
        category = ExamCategory.objects.create(name='Imported Exam Category', order=1)
        level = Exam.objects.create(name='Imported Level', category=category, order=1)
        preparation = Exam.objects.create(
            name='Imported Preparation',
            category=category,
            parent=level,
            order=1,
        )
        course = Course.objects.create(
            title='Imported Preparation Course',
            slug='imported-preparation-course',
            status='published',
            exam=preparation,
        )

        response = self.client.get('/api/courses/hierarchy/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_category = next(
            item for item in response.data if item['id'] == category.id
        )
        returned_level = next(
            item for item in returned_category['exams'] if item['id'] == level.id
        )
        returned_preparation = next(
            item for item in returned_level['children'] if item['id'] == preparation.id
        )
        self.assertEqual(
            [item['id'] for item in returned_preparation['courses']],
            [course.id],
        )

    def test_public_categories_endpoint_annotates_course_counts(self):
        """Tests that /api/courses/categories/ returns active categories with accurate course counts."""
        empty_cat = ExamCategory.objects.create(name='Empty Category', order=99, is_active=True)
        inactive_cat = ExamCategory.objects.create(name='Inactive Category', order=100, is_active=False)

        response = self.client.get('/api/courses/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cat_ids = [c['id'] for c in response.data]
        self.assertIn(self.category.id, cat_ids)
        self.assertIn(empty_cat.id, cat_ids)
        self.assertNotIn(inactive_cat.id, cat_ids)

        found_cat = next(c for c in response.data if c['id'] == self.category.id)
        self.assertEqual(found_cat['course_count'], 1)
        self.assertEqual(found_cat['published_course_count'], 1)

        found_empty = next(c for c in response.data if c['id'] == empty_cat.id)
        self.assertEqual(found_empty['course_count'], 0)
        self.assertEqual(found_empty['published_course_count'], 0)


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
