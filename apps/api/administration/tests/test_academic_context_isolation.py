from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from notes.models import StudyMaterial


class AcademicContextIsolationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='academic_admin',
            email='academic_admin@example.com',
            password='password123',
            role='admin',
            is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

        # Context A: PSC Exams -> 7th Level -> Civil Engineer
        self.cat_a = ExamCategory.objects.create(name='PSC Exams', order=1)
        self.level_a = Exam.objects.create(category=self.cat_a, name='7th Level', order=1)
        self.prep_a = Exam.objects.create(category=self.cat_a, parent=self.level_a, name='Civil Engineer', order=1)

        # Context B: License Exams -> Diploma License -> Civil Sub Engineering License
        self.cat_b = ExamCategory.objects.create(name='License Exams', order=2)
        self.level_b = Exam.objects.create(category=self.cat_b, name='Diploma License', order=1)
        self.prep_b = Exam.objects.create(category=self.cat_b, parent=self.level_b, name='Civil Sub Engineering License', order=1)

    def test_01_empty_context_does_not_leak_orphaned_subjects(self):
        """Preps without subjects return an empty tree and never inherit orphaned paper__isnull subjects."""
        # Create an orphaned subject in the DB (paper is None)
        Subject.objects.create(name='Global Orphan Subject', paper=None)

        res_a = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_a.id}')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertEqual(res_a.data, [])

        res_b = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_b.id}')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.data, [])

    def test_02_subject_created_in_context_a_does_not_appear_in_context_b(self):
        """Creating a subject in Context A isolates it strictly to Context A."""
        create_res = self.client.post('/api/admin/academic/subjects/', {
            'exam': self.prep_a.id,
            'name': 'Basic Civil Engineering',
            'code': 'CE-101',
            'order': 1,
            'is_active': True,
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        sub_a_id = create_res.data['id']

        # Verify Context A tree contains the subject
        tree_a = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_a.id}')
        self.assertEqual(tree_a.status_code, status.HTTP_200_OK)
        self.assertEqual(len(tree_a.data), 1)
        self.assertEqual(tree_a.data[0]['id'], sub_a_id)
        self.assertEqual(tree_a.data[0]['name'], 'Basic Civil Engineering')

        # Verify Context B tree remains completely empty
        tree_b = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_b.id}')
        self.assertEqual(tree_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(tree_b.data), 0)

        # Verify query filtering by exam
        filter_a = self.client.get(f'/api/admin/academic/subjects/?exam={self.prep_a.id}')
        self.assertEqual(len(filter_a.data), 1)
        filter_b = self.client.get(f'/api/admin/academic/subjects/?exam={self.prep_b.id}')
        self.assertEqual(len(filter_b.data), 0)

    def test_03_same_subject_name_in_both_contexts_creates_independent_records(self):
        """Creating 'Basic Civil Engineering' in both contexts creates independent, isolated subjects."""
        # Create in Context A
        res_a = self.client.post('/api/admin/academic/subjects/', {
            'exam': self.prep_a.id,
            'name': 'Basic Civil Engineering',
            'order': 1,
        })
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        sub_a_id = res_a.data['id']

        # Create identically named subject in Context B
        res_b = self.client.post('/api/admin/academic/subjects/', {
            'exam': self.prep_b.id,
            'name': 'Basic Civil Engineering',
            'order': 1,
        })
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        sub_b_id = res_b.data['id']

        # IDs must be independent
        self.assertNotEqual(sub_a_id, sub_b_id)

        # Verify Subject records in DB
        sub_a = Subject.objects.get(id=sub_a_id)
        sub_b = Subject.objects.get(id=sub_b_id)
        self.assertEqual(sub_a.paper.exam, self.prep_a)
        self.assertEqual(sub_b.paper.exam, self.prep_b)
        self.assertNotEqual(sub_a.paper, sub_b.paper)

        # Verify each tree only returns its own subject
        tree_a = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_a.id}')
        self.assertEqual(len(tree_a.data), 1)
        self.assertEqual(tree_a.data[0]['id'], sub_a_id)

        tree_b = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_b.id}')
        self.assertEqual(len(tree_b.data), 1)
        self.assertEqual(tree_b.data[0]['id'], sub_b_id)

    def test_04_chapters_and_topics_maintain_strict_hierarchy_isolation(self):
        """Chapters and topics under identical names stay isolated to their respective context."""
        # Setup subjects in both
        sub_a = Subject.objects.create(
            name='Civil Engineering',
            paper=Paper.objects.create(exam=self.prep_a, name='Paper A')
        )
        sub_b = Subject.objects.create(
            name='Civil Engineering',
            paper=Paper.objects.create(exam=self.prep_b, name='Paper B')
        )

        # Add Chapter to Context A
        chap_a_res = self.client.post('/api/admin/academic/chapters/', {
            'subject': sub_a.id,
            'title': 'Building Materials',
            'order': 1,
        })
        self.assertEqual(chap_a_res.status_code, status.HTTP_201_CREATED)
        chap_a_id = chap_a_res.data['id']

        # Add Chapter with same title to Context B
        chap_b_res = self.client.post('/api/admin/academic/chapters/', {
            'subject': sub_b.id,
            'title': 'Building Materials',
            'order': 1,
        })
        self.assertEqual(chap_b_res.status_code, status.HTTP_201_CREATED)
        chap_b_id = chap_b_res.data['id']
        self.assertNotEqual(chap_a_id, chap_b_id)

        # Add Topic to Chapter A
        top_a_res = self.client.post('/api/admin/academic/topics/', {
            'chapter': chap_a_id,
            'name': 'Bricks',
            'order': 1,
        })
        self.assertEqual(top_a_res.status_code, status.HTTP_201_CREATED)
        top_a_id = top_a_res.data['id']

        # Add Topic with same name to Chapter B
        top_b_res = self.client.post('/api/admin/academic/topics/', {
            'chapter': chap_b_id,
            'name': 'Bricks',
            'order': 1,
        })
        self.assertEqual(top_b_res.status_code, status.HTTP_201_CREATED)
        top_b_id = top_b_res.data['id']
        self.assertNotEqual(top_a_id, top_b_id)

        # Verify Context A tree contains only top_a under chap_a
        tree_a = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_a.id}')
        chaps_in_a = tree_a.data[0]['chapters']
        self.assertEqual(len(chaps_in_a), 1)
        self.assertEqual(chaps_in_a[0]['id'], chap_a_id)
        self.assertEqual(len(chaps_in_a[0]['topics']), 1)
        self.assertEqual(chaps_in_a[0]['topics'][0]['id'], top_a_id)

        # Verify Context B tree contains only top_b under chap_b
        tree_b = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_b.id}')
        chaps_in_b = tree_b.data[0]['chapters']
        self.assertEqual(len(chaps_in_b), 1)
        self.assertEqual(chaps_in_b[0]['id'], chap_b_id)
        self.assertEqual(len(chaps_in_b[0]['topics']), 1)
        self.assertEqual(chaps_in_b[0]['topics'][0]['id'], top_b_id)

    def test_05_editing_in_context_a_does_not_modify_context_b(self):
        """Editing subject, chapter or topic in Context A does not mutate Context B."""
        sub_a = Subject.objects.create(name='Surveying', paper=Paper.objects.create(exam=self.prep_a, name='P1'))
        sub_b = Subject.objects.create(name='Surveying', paper=Paper.objects.create(exam=self.prep_b, name='P2'))
        chap_a = Chapter.objects.create(subject=sub_a, title='Levelling')
        chap_b = Chapter.objects.create(subject=sub_b, title='Levelling')

        # Edit Subject in Context A
        self.client.patch(f'/api/admin/academic/subjects/{sub_a.id}/', {'name': 'Advanced Surveying'})
        sub_b.refresh_from_db()
        self.assertEqual(sub_b.name, 'Surveying')

        # Edit Chapter in Context A
        self.client.patch(f'/api/admin/academic/chapters/{chap_a.id}/', {'title': 'Differential Levelling'})
        chap_b.refresh_from_db()
        self.assertEqual(chap_b.title, 'Levelling')

    def test_06_cross_context_association_is_rejected(self):
        """Attempting to assign a chapter or topic across incompatible contexts is rejected with 400."""
        sub_a = Subject.objects.create(name='Sub A', paper=Paper.objects.create(exam=self.prep_a, name='P A'))
        sub_b = Subject.objects.create(name='Sub B', paper=Paper.objects.create(exam=self.prep_b, name='P B'))
        chap_a = Chapter.objects.create(subject=sub_a, title='Chap A')

        # Attempt to create chapter for sub_a with conflicting exam context of prep_b
        res = self.client.post('/api/admin/academic/chapters/', {
            'subject': sub_a.id,
            'exam': self.prep_b.id,
            'title': 'Conflicting Chapter',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('subject', res.data)

        # Attempt to create topic for chap_a with conflicting subject of sub_b
        res2 = self.client.post('/api/admin/academic/topics/', {
            'chapter': chap_a.id,
            'subject': sub_b.id,
            'name': 'Conflicting Topic',
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('chapter', res2.data)

    def test_07_reorder_is_strictly_scoped_to_parent_context(self):
        """Reordering items within Context A does not touch Context B, and cross-parent reorder is rejected."""
        sub_a = Subject.objects.create(name='Sub A', paper=Paper.objects.create(exam=self.prep_a, name='PA'))
        sub_b = Subject.objects.create(name='Sub B', paper=Paper.objects.create(exam=self.prep_b, name='PB'))

        chap_a1 = Chapter.objects.create(subject=sub_a, title='A1', order=1)
        chap_a2 = Chapter.objects.create(subject=sub_a, title='A2', order=2)
        chap_b1 = Chapter.objects.create(subject=sub_b, title='B1', order=1)

        # Reorder chapters in Context A
        reorder_res = self.client.patch('/api/admin/academic/chapters/reorder/', [
            {'id': chap_a1.id, 'order': 2},
            {'id': chap_a2.id, 'order': 1},
        ], format='json')
        self.assertEqual(reorder_res.status_code, status.HTTP_200_OK)

        chap_a1.refresh_from_db()
        chap_a2.refresh_from_db()
        chap_b1.refresh_from_db()
        self.assertEqual(chap_a1.order, 2)
        self.assertEqual(chap_a2.order, 1)
        self.assertEqual(chap_b1.order, 1)  # Context B unaffected

        # Reject attempt to reorder chapters belonging to different subjects
        bad_reorder = self.client.patch('/api/admin/academic/chapters/reorder/', [
            {'id': chap_a1.id, 'order': 1},
            {'id': chap_b1.id, 'order': 2},
        ], format='json')
        self.assertEqual(bad_reorder.status_code, status.HTTP_400_BAD_REQUEST)

    def test_08_notes_and_counts_isolate_per_context(self):
        """Study materials attached to Context A subjects/chapters/topics reflect only in Context A tree."""
        sub_a = Subject.objects.create(name='Hydraulics', paper=Paper.objects.create(exam=self.prep_a, name='P1'))
        sub_b = Subject.objects.create(name='Hydraulics', paper=Paper.objects.create(exam=self.prep_b, name='P2'))
        chap_a = Chapter.objects.create(subject=sub_a, title='Pipe Flow')
        chap_b = Chapter.objects.create(subject=sub_b, title='Pipe Flow')
        top_a = Topic.objects.create(chapter=chap_a, name='Laminar Flow')
        top_b = Topic.objects.create(chapter=chap_b, name='Laminar Flow')

        # Create note in Context A
        StudyMaterial.objects.create(
            title='Laminar Flow Notes',
            exam=self.prep_a,
            subject=sub_a,
            chapter=chap_a,
            topic=top_a,
            content_category='subjective_topicwise',
            status='published',
            teacher=self.admin,
        )

        tree_a = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_a.id}')
        tree_b = self.client.get(f'/api/admin/study-materials/academic-tree/?exam_id={self.prep_b.id}')

        # Context A topic must show 1 note
        self.assertEqual(tree_a.data[0]['chapters'][0]['topics'][0]['notes_count'], 1)
        # Context B topic must show 0 notes
        self.assertEqual(tree_b.data[0]['chapters'][0]['topics'][0]['notes_count'], 0)
