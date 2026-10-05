from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from courses.models import Course, Enrollment
from notes.models import StudyMaterial, StudentMaterialBookmark, StudentMaterialProgress
from subscriptions.models import Subscription, SubscriptionPlan
from administration.models import TrashItem


class SyllabusAndNotesE2ETests(APITestCase):
    def setUp(self):
        # 1. Academic Hierarchy
        self.category = ExamCategory.objects.create(name='PSC Nepal', order=1, is_active=True)
        self.level = Exam.objects.create(
            name='5th Level', category=self.category, order=1, is_active=True, status='active'
        )
        self.exam_civil = Exam.objects.create(
            name='Civil Engineering', category=self.category, parent=self.level, order=1, is_active=True, status='active'
        )
        self.exam_computer = Exam.objects.create(
            name='Computer Engineering', category=self.category, parent=self.level, order=2, is_active=True, status='active'
        )

        # Papers, Subjects, Chapters, Topics for Civil
        self.paper_civil = Paper.objects.create(exam=self.exam_civil, name='Paper I', order=1, is_active=True)
        self.subject_civil = Subject.objects.create(paper=self.paper_civil, name='Structural Analysis', order=1, is_active=True)
        self.chapter_civil = Chapter.objects.create(subject=self.subject_civil, title='Mechanics', order=1, is_active=True)
        self.topic_civil = Topic.objects.create(chapter=self.chapter_civil, name='Stress & Strain', order=1, is_active=True)

        # Question for Civil
        self.question_civil = Question.objects.create(
            exam=self.exam_civil,
            subject=self.subject_civil,
            chapter=self.chapter_civil,
            topic=self.topic_civil,
            text='What is Hooke\'s law?',
            question_type='mcq',
            option_a='Linear',
            option_b='Nonlinear',
            correct_option='A',
            marks=1,
            difficulty='easy',
            status='approved',
        )

        # Papers, Subjects, Chapters, Topics for Computer
        self.paper_computer = Paper.objects.create(exam=self.exam_computer, name='Paper I', order=1, is_active=True)
        self.subject_computer = Subject.objects.create(paper=self.paper_computer, name='Data Structures', order=1, is_active=True)
        self.chapter_computer = Chapter.objects.create(subject=self.subject_computer, title='Trees', order=1, is_active=True)
        self.topic_computer = Topic.objects.create(chapter=self.chapter_computer, name='Binary Search Trees', order=1, is_active=True)

        # 2. Courses
        self.course_civil = Course.objects.create(
            title='Civil 5th Level Master Preparation',
            slug='civil-5th-master',
            exam=self.exam_civil,
            status='published',
            is_open_for_enrollment=True,
        )
        self.course_computer = Course.objects.create(
            title='Computer 5th Level Master Preparation',
            slug='computer-5th-master',
            exam=self.exam_computer,
            status='published',
            is_open_for_enrollment=True,
        )
        self.course_coming_soon = Course.objects.create(
            title='Electrical 5th Level Preparation',
            slug='electrical-5th',
            exam=self.exam_civil,
            status='coming_soon',
            is_open_for_enrollment=False,
        )

        # 3. Users
        self.admin = User.objects.create_superuser(
            username='admin_boss', email='admin@loksewa.ai', password='adminpassword123', role='super-admin'
        )
        self.student_a = User.objects.create_user(
            username='student_a', email='student_a@loksewa.ai', password='password123', role='student'
        )
        self.student_b = User.objects.create_user(
            username='student_b', email='student_b@loksewa.ai', password='password123', role='student'
        )
        self.student_multi = User.objects.create_user(
            username='student_multi', email='multi@loksewa.ai', password='password123', role='student'
        )

        # 4. Enrollments
        # Student A -> Civil only
        Enrollment.objects.create(student=self.student_a, course=self.course_civil, status='active')

        # Student B -> Computer only
        Enrollment.objects.create(student=self.student_b, course=self.course_computer, status='active')

        # Student Multi -> Both Civil and Computer
        Enrollment.objects.create(student=self.student_multi, course=self.course_civil, status='active')
        Enrollment.objects.create(student=self.student_multi, course=self.course_computer, status='active')

        # 5. Study Materials
        self.material_civil = StudyMaterial.objects.create(
            title='Civil Engineering Overview & Syllabus',
            exam=self.exam_civil,
            course=self.course_civil,
            subject=self.subject_civil,
            chapter=self.chapter_civil,
            topic=self.topic_civil,
            content_category='syllabus',
            note_type='standard',
            material_type='notes',
            access_type='free',
            status='published',
            is_downloadable=True,
        )
        self.material_civil_detailed = StudyMaterial.objects.create(
            title='Mechanics In-Depth Topicwise Notes',
            exam=self.exam_civil,
            course=self.course_civil,
            subject=self.subject_civil,
            chapter=self.chapter_civil,
            topic=self.topic_civil,
            content_category='subjective_topicwise',
            note_type='standard',
            material_type='notes',
            access_type='free',
            status='published',
            is_downloadable=True,
        )
        self.material_computer = StudyMaterial.objects.create(
            title='Binary Search Trees Guide',
            exam=self.exam_computer,
            course=self.course_computer,
            subject=self.subject_computer,
            chapter=self.chapter_computer,
            topic=self.topic_computer,
            content_category='subjective_topicwise',
            note_type='standard',
            material_type='notes',
            access_type='free',
            status='published',
            is_downloadable=False,
        )

    # =========================================================================
    # 1. PUBLIC SYLLABUS TESTS
    # =========================================================================

    def test_public_syllabus_tree_accessible_without_auth(self):
        """Anonymous visitor can access /api/public/syllabus/ and see published academic hierarchy."""
        response = self.client.get('/api/public/syllabus/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        cat = next((c for c in response.data if c['name'] == 'PSC Nepal'), None)
        self.assertIsNotNone(cat)

        level = next((l for l in cat.get('exams', []) if l['name'] == '5th Level'), None)
        self.assertIsNotNone(level)
        self.assertGreaterEqual(len(level['children']), 2)

        civil_prep = next((c for c in level['children'] if c['name'] == 'Civil Engineering'), None)
        self.assertIsNotNone(civil_prep)
        self.assertEqual(len(civil_prep['papers']), 1)

        paper = civil_prep['papers'][0]
        self.assertEqual(paper['name'], 'Paper I')
        self.assertEqual(len(paper['subjects']), 1)

        subject = paper['subjects'][0]
        self.assertEqual(subject['name'], 'Structural Analysis')
        self.assertEqual(subject['questionsCount'], 1)
        self.assertEqual(subject['topicsCount'], 1)

    def test_anonymous_cannot_access_student_notes(self):
        """Anonymous visitor cannot query student notes or student portal."""
        res_portal = self.client.get('/api/notes/student/portal/')
        self.assertEqual(res_portal.status_code, status.HTTP_401_UNAUTHORIZED)

        res_materials = self.client.get('/api/notes/materials/')
        self.assertEqual(res_materials.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================================
    # 2. COURSE ACCESS & ISOLATION TESTS
    # =========================================================================

    def test_student_a_accesses_civil_notes_and_blocked_from_computer(self):
        """Student A has Civil course: can access Civil notes, but Computer notes return 404/403."""
        self.client.force_authenticate(user=self.student_a)

        # 1. Materials list contains Civil notes only
        res_list = self.client.get('/api/notes/materials/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        returned_ids = [m['id'] for m in res_list.data]
        self.assertIn(self.material_civil.id, returned_ids)
        self.assertIn(self.material_civil_detailed.id, returned_ids)
        self.assertNotIn(self.material_computer.id, returned_ids)

        # 2. Direct retrieve of Computer note is blocked
        res_retrieve = self.client.get(f'/api/notes/materials/{self.material_computer.id}/')
        self.assertIn(res_retrieve.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # 3. Direct download of Computer note is blocked
        res_download = self.client.get(f'/api/notes/materials/{self.material_computer.id}/download/')
        self.assertIn(res_download.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_multi_course_student_can_access_both_preparations(self):
        """Student enrolled in multiple courses can see notes for all enrolled courses."""
        self.client.force_authenticate(user=self.student_multi)

        # List should include both Civil and Computer
        res_list = self.client.get('/api/notes/materials/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        returned_ids = [m['id'] for m in res_list.data]
        self.assertIn(self.material_civil.id, returned_ids)
        self.assertIn(self.material_computer.id, returned_ids)

        # Portal view allows switching to Computer exam explicitly
        res_portal_comp = self.client.get(f'/api/notes/student/portal/?exam_id={self.exam_computer.id}')
        self.assertEqual(res_portal_comp.status_code, status.HTTP_200_OK)
        self.assertEqual(res_portal_comp.data['selectedPreparation']['id'], self.exam_computer.id)

    def test_expired_enrollment_revokes_access(self):
        """Expired enrollment immediately revokes note access while preserving progress."""
        # Enroll student A with expired date
        enrollment = Enrollment.objects.get(student=self.student_a, course=self.course_civil)
        enrollment.expires_at = timezone.now() - timedelta(days=1)
        enrollment.save()

        # Record progress and bookmark before expiry test
        StudentMaterialBookmark.objects.create(student=self.student_a, material=self.material_civil)
        StudentMaterialProgress.objects.create(student=self.student_a, material=self.material_civil, progress=85)

        self.client.force_authenticate(user=self.student_a)
        res_list = self.client.get('/api/notes/materials/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 0)

        # Historical bookmark and progress records in database must still exist
        self.assertTrue(StudentMaterialBookmark.objects.filter(student=self.student_a, material=self.material_civil).exists())
        self.assertEqual(StudentMaterialProgress.objects.get(student=self.student_a, material=self.material_civil).progress, 85)

    def test_coming_soon_course_never_grants_student_access(self):
        """Courses marked coming_soon do not grant student note access."""
        from courses.services.course_access_service import CourseAccessService
        Enrollment.objects.create(student=self.student_a, course=self.course_coming_soon, status='active')
        self.assertFalse(CourseAccessService.has_course_access(self.student_a, self.course_coming_soon.id))

    # =========================================================================
    # 3. PAGINATION & BACKWARD COMPATIBILITY
    # =========================================================================

    def test_notes_pagination_activates_with_page_param(self):
        """Querying with page parameter returns { count, next, previous, results } envelope."""
        self.client.force_authenticate(user=self.student_a)

        # Paginated request
        res_paginated = self.client.get('/api/notes/materials/?page=1&page_size=1')
        self.assertEqual(res_paginated.status_code, status.HTTP_200_OK)
        self.assertIn('count', res_paginated.data)
        self.assertIn('results', res_paginated.data)
        self.assertEqual(len(res_paginated.data['results']), 1)

        # Unpaginated request returns direct list
        res_raw = self.client.get('/api/notes/materials/')
        self.assertEqual(res_raw.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res_raw.data, list)
        self.assertEqual(len(res_raw.data), 2)

    # =========================================================================
    # 4. ADMIN MANAGEMENT & DATA SAFETY
    # =========================================================================

    def test_admin_create_material_validates_hierarchy_and_persists_chapter(self):
        """Creating study material validates topic-chapter relationship and persists chapter."""
        self.client.force_authenticate(user=self.admin)

        # Invalid: Topic from Computer paired with Chapter from Civil
        res_invalid = self.client.post('/api/admin/study-materials/', {
            'title': 'Corrupted Material',
            'exam': self.exam_civil.id,
            'subject': self.subject_civil.id,
            'chapter': self.chapter_civil.id,
            'topic': self.topic_computer.id,
            'content': 'Some content',
        })
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid creation
        res_valid = self.client.post('/api/admin/study-materials/', {
            'title': 'New Mechanics Notes',
            'exam': self.exam_civil.id,
            'subject': self.subject_civil.id,
            'chapter': self.chapter_civil.id,
            'topic': self.topic_civil.id,
            'content': 'Valid mechanics text',
            'access_type': 'free',
            'status': 'published',
        })
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        mat_id = res_valid.data['id']

        created_mat = StudyMaterial.objects.get(pk=mat_id)
        self.assertEqual(created_mat.chapter_id, self.chapter_civil.id)
        self.assertEqual(created_mat.topic_id, self.topic_civil.id)

    def test_admin_delete_material_uses_soft_delete(self):
        """Deleting study material moves it to Trash via SafeDeleteService rather than hard deleting."""
        self.client.force_authenticate(user=self.admin)
        mat_id = self.material_civil.id

        res_del = self.client.delete(f'/api/admin/study-materials/{mat_id}/', {'reason': 'Obsolete curriculum'})
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertTrue(res_del.data['success'])

        # StudyMaterial status should be changed to archived, not published
        self.material_civil.refresh_from_db()
        self.assertEqual(self.material_civil.status, 'archived')
        self.assertFalse(StudyMaterial.objects.filter(pk=mat_id, status='published').exists())

        # And must exist in TrashItem for safe recovery
        trash_entry = TrashItem.objects.filter(model_name='studymaterial', object_id=str(mat_id)).first()
        self.assertIsNotNone(trash_entry)
        self.assertEqual(trash_entry.title, 'Civil Engineering Overview & Syllabus')
