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


class StudentPortalPerformanceAndIsolationTests(APITestCase):
    """The student portal must cost a fixed number of queries however many
    materials there are (bookmark, progress and course were once fetched per
    row), and must keep returning only the requesting student's own state."""

    PORTAL = '/api/notes/student/portal/'

    def setUp(self):
        from django.core.cache import cache
        from core.models import User
        from courses.models import Enrollment
        cache.clear()
        cat = ExamCategory.objects.create(name='PSC')
        self.level = Exam.objects.create(category=cat, name='Level 5')
        self.exam = Exam.objects.create(category=cat, parent=self.level, name='Civil', status='active')
        self.other_exam = Exam.objects.create(category=cat, parent=self.level, name='Computer', status='active')
        self.course = Course.objects.create(title='Civil course', slug='civil', status='published', exam=self.exam)
        paper = Paper.objects.create(exam=self.exam, name='P1')
        subject = Subject.objects.create(paper=paper, name='Structures')
        chapter = Chapter.objects.create(subject=subject, title='Unit 1')
        self.topic = Topic.objects.create(chapter=chapter, name='Beams')
        self.alice = User.objects.create_user(username='alice', password='pw', role='student')
        self.bob = User.objects.create_user(username='bob', password='pw', role='student')
        for u in (self.alice, self.bob):
            Enrollment.objects.create(student=u, course=self.course)
        self.materials = [self.material(f'Note {i}') for i in range(6)]

    def material(self, title, **kw):
        kw.setdefault('status', 'published')
        kw.setdefault('exam', self.exam)
        return StudyMaterial.objects.create(title=title, topic=self.topic, chapter=self.topic.chapter,
                                            subject=self.topic.chapter.subject, course=self.course, **kw)

    def fetch(self, user, exam=None):
        self.client.force_authenticate(user)
        return self.client.get(self.PORTAL + (f'?exam_id={exam.id}' if exam else ''))

    def all_items(self, response):
        sections = response.data['sections']
        items = list(sections['syllabus'])
        for key in ('subjective_topicwise', 'objective_topicwise'):
            items += sections[key]['standard'] + sections[key]['ai']
        items += sections['revision_notes']['subjective'] + sections['revision_notes']['objective']
        return items

    def test_query_count_does_not_grow_with_the_number_of_materials(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        self.fetch(self.alice)                                       # warm caches
        with CaptureQueriesContext(connection) as few:
            self.assertEqual(self.fetch(self.alice).status_code, 200)
        for i in range(20):
            self.material(f'Extra {i}')
        with CaptureQueriesContext(connection) as many:
            r = self.fetch(self.alice)
        self.assertEqual(len(self.all_items(r)), 26)
        self.assertEqual(len(few), len(many))
        self.assertLessEqual(len(many), 10)

    def test_bookmark_and_progress_belong_to_the_requesting_student_only(self):
        from notes.models import StudentMaterialBookmark, StudentMaterialProgress
        m = self.materials[0]
        StudentMaterialBookmark.objects.create(student=self.alice, material=m)
        StudentMaterialProgress.objects.create(student=self.alice, material=m, progress=70)
        StudentMaterialProgress.objects.create(student=self.bob, material=self.materials[1], progress=30)

        mine = {i['id']: i for i in self.all_items(self.fetch(self.alice))}
        self.assertEqual((mine[m.id]['is_bookmarked'], mine[m.id]['progress']), (True, 70))
        self.assertEqual((mine[self.materials[1].id]['is_bookmarked'], mine[self.materials[1].id]['progress']), (False, 0))

        theirs = {i['id']: i for i in self.all_items(self.fetch(self.bob))}
        self.assertEqual((theirs[m.id]['is_bookmarked'], theirs[m.id]['progress']), (False, 0))
        self.assertEqual(theirs[self.materials[1].id]['progress'], 30)

    def test_unpublished_materials_and_other_preparations_are_not_returned(self):
        self.material('Draft', status='draft')
        self.material('Elsewhere', exam=self.other_exam)
        titles = {i['title'] for i in self.all_items(self.fetch(self.alice, self.exam))}
        self.assertNotIn('Draft', titles)
        self.assertNotIn('Elsewhere', titles)
        self.assertEqual(len(titles), 6)

    def test_a_preparation_the_student_does_not_own_is_refused(self):
        r = self.fetch(self.alice, self.other_exam)
        self.assertEqual(r.status_code, 403)

    def test_response_still_carries_the_fields_the_page_uses(self):
        item = self.all_items(self.fetch(self.alice))[0]
        for field in ('id', 'title', 'topic_name', 'subject_name', 'course_title', 'file_url', 'is_bookmarked', 'progress'):
            self.assertIn(field, item)
        self.assertEqual(item['course_title'], 'Civil course')
