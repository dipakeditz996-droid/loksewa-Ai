"""PublicStudyMaterialListView (/api/notes/public/) powers the homepage's
Notes section. Covers: only free, published, non-course-locked materials are
shown to anonymous visitors, with real fields (no invented page counts/size/
view counts).
"""
from rest_framework import status
from rest_framework.test import APITestCase

from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from courses.models import Course
from notes.models import StudyMaterial


class PublicStudyMaterialListViewTests(APITestCase):
    def setUp(self):
        category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(name='Kharidar', category=category)
        paper = Paper.objects.create(exam=self.exam, name='Paper 1')
        self.subject = Subject.objects.create(paper=paper, name='Constitutional Law')

    def test_only_free_published_uncoursed_materials_returned(self):
        StudyMaterial.objects.create(
            title='Free Published Note', exam=self.exam, subject=self.subject,
            status='published', access_type='free',
        )
        StudyMaterial.objects.create(
            title='Premium Note', exam=self.exam, subject=self.subject,
            status='published', access_type='premium',
        )
        StudyMaterial.objects.create(
            title='Draft Note', exam=self.exam, subject=self.subject,
            status='draft', access_type='free',
        )
        course = Course.objects.create(title='Some Course', slug='some-course')
        StudyMaterial.objects.create(
            title='Course-Locked Note', exam=self.exam, subject=self.subject,
            status='published', access_type='free', course=course,
        )

        response = self.client.get('/api/notes/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [m['title'] for m in response.data]
        self.assertEqual(titles, ['Free Published Note'])

    def test_response_has_real_fields_only(self):
        StudyMaterial.objects.create(
            title='Note', exam=self.exam, subject=self.subject,
            status='published', access_type='free', difficulty='advanced',
            estimated_reading_time=15,
        )
        response = self.client.get('/api/notes/public/')
        row = response.data[0]
        self.assertEqual(row['subject_name'], 'Constitutional Law')
        self.assertEqual(row['difficulty'], 'advanced')
        self.assertEqual(row['estimated_reading_time'], 15)
        self.assertNotIn('size', row)
        self.assertNotIn('pages', row)
        self.assertNotIn('views', row)

    def test_anonymous_access_allowed(self):
        response = self.client.get('/api/notes/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
