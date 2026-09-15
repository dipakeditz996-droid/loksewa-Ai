from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from community.models import CommunityPost, CommunityReply


class CommunityFixtureBase(APITestCase):
    """
    Builds one real, canonical exams.Question of each kind - never a
    separate Community-side question model - so every test here proves the
    Community app is reusing the actual Question record, not a copy of it.
    """

    def setUp(self):
        self.student = User.objects.create_user(username='stu1', password='pw', role='student')
        self.student2 = User.objects.create_user(username='stu2', password='pw', role='student')
        self.teacher = User.objects.create_user(username='teach1', password='pw', role='teacher')
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)

        category = ExamCategory.objects.create(name='Loksewa')
        exam = Exam.objects.create(category=category, name='Section Officer')
        paper = Paper.objects.create(exam=exam, name='General Knowledge')
        subject = Subject.objects.create(paper=paper, name='Constitution')
        chapter = Chapter.objects.create(subject=subject, title='Fundamental Rights')
        self.topic = Topic.objects.create(chapter=chapter, name='Right to Equality')

        self.mcq_question = Question.objects.create(
            topic=self.topic, question_type='mcq', text='Which article guarantees equality?',
            option_a='Article 16', option_b='Article 18', option_c='Article 20', option_d='Article 22',
            correct_option='B', status='approved',
        )
        self.subjective_question = Question.objects.create(
            topic=self.topic, question_type='subjective',
            text='Explain the doctrine of separation of powers.',
            model_answer='A constitutional principle...', status='approved',
        )


class ObjectiveSubjectiveLinkingTests(CommunityFixtureBase):
    """Sections 1-4, 12: Community discussions link to the real Question and
    correctly derive objective/subjective/general - no duplicate models."""

    def test_create_objective_discussion_linked_to_canonical_question(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post('/api/community/posts/', {
            'title': 'Confused about equality article',
            'body': 'I thought it was Article 16, can someone explain?',
            'post_type': 'question',
            'topic': self.topic.id,
            'source_question': self.mcq_question.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        post = CommunityPost.objects.get(pk=resp.data['id'])
        self.assertEqual(post.source_question_id, self.mcq_question.id)
        self.assertEqual(post.question_category, 'objective')
        # No copy was made - Question table still has exactly the two fixture rows.
        self.assertEqual(Question.objects.count(), 2)

    def test_create_subjective_discussion_linked_to_canonical_question(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post('/api/community/posts/', {
            'title': 'Need help with separation of powers',
            'body': 'How should I structure this answer?',
            'post_type': 'question',
            'topic': self.topic.id,
            'source_question': self.subjective_question.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        post = CommunityPost.objects.get(pk=resp.data['id'])
        self.assertEqual(post.question_category, 'subjective')
        self.assertEqual(Question.objects.count(), 2)

    def test_general_discussion_has_no_question_category(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post('/api/community/posts/', {
            'title': 'How to prepare for PSC 5th level?',
            'body': 'Any tips on time management for the exam?',
            'post_type': 'discussion',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        post = CommunityPost.objects.get(pk=resp.data['id'])
        self.assertEqual(post.question_category, 'general')
        self.assertIsNone(post.source_question_id)

    def test_objective_detail_exposes_mcq_options(self):
        post = CommunityPost.objects.create(
            author=self.student, title='MCQ doubt here please', body='Which is correct here?',
            source_question=self.mcq_question,
        )
        self.client.force_authenticate(user=self.student)
        resp = self.client.get(f'/api/community/posts/{post.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['question_category'], 'objective')
        self.assertEqual(resp.data['source_question']['option_a'], 'Article 16')
        self.assertEqual(resp.data['source_question']['option_b'], 'Article 18')
        # correct_option is never serialized to students.
        self.assertNotIn('correct_option', resp.data['source_question'])

    def test_subjective_detail_never_exposes_mcq_options(self):
        post = CommunityPost.objects.create(
            author=self.student, title='Subjective doubt here please', body='How to answer this?',
            source_question=self.subjective_question,
        )
        self.client.force_authenticate(user=self.student)
        resp = self.client.get(f'/api/community/posts/{post.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['question_category'], 'subjective')
        sq = resp.data['source_question']
        self.assertIsNone(sq['option_a'])
        self.assertIsNone(sq['option_b'])
        self.assertIsNone(sq['option_c'])
        self.assertIsNone(sq['option_d'])

    def test_feed_filters_by_category(self):
        CommunityPost.objects.create(
            author=self.student, title='Objective post one here', body='body text here',
            source_question=self.mcq_question,
        )
        CommunityPost.objects.create(
            author=self.student, title='Subjective post one here', body='body text here',
            source_question=self.subjective_question,
        )
        CommunityPost.objects.create(
            author=self.student, title='General post one here', body='body text here',
        )
        self.client.force_authenticate(user=self.student)

        resp = self.client.get('/api/community/posts/?category=objective')
        self.assertEqual(resp.data['count'], 1)
        resp = self.client.get('/api/community/posts/?category=subjective')
        self.assertEqual(resp.data['count'], 1)
        resp = self.client.get('/api/community/posts/?category=general')
        self.assertEqual(resp.data['count'], 1)


class TeacherAndBestAnswerTests(CommunityFixtureBase):
    """Section 9-10: teachers can answer both kinds; best-answer architecture
    is reused as-is (no second best-answer model)."""

    def _make_post(self, source_question=None):
        return CommunityPost.objects.create(
            author=self.student, title='Need some help here please', body='details details details',
            source_question=source_question,
        )

    def test_teacher_can_answer_objective_discussion(self):
        post = self._make_post(self.mcq_question)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/community/replies/', {'post': post.id, 'body': "It's B, Article 18."}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data['author']['role'], 'teacher')

    def test_teacher_can_answer_subjective_discussion(self):
        post = self._make_post(self.subjective_question)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/community/replies/', {'post': post.id, 'body': 'Structure it in 3 parts...'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_post_author_marks_best_answer(self):
        post = self._make_post(self.mcq_question)
        self.client.force_authenticate(user=self.teacher)
        reply = self.client.post('/api/community/replies/', {'post': post.id, 'body': "It's B."}, format='json').data

        self.client.force_authenticate(user=self.student)
        resp = self.client.post(f'/api/community/replies/{reply["id"]}/mark_best/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_best_answer'])

    def test_stranger_cannot_mark_best_answer(self):
        post = self._make_post(self.mcq_question)
        self.client.force_authenticate(user=self.teacher)
        reply = self.client.post('/api/community/replies/', {'post': post.id, 'body': "It's B."}, format='json').data

        self.client.force_authenticate(user=self.student2)
        resp = self.client.post(f'/api/community/replies/{reply["id"]}/mark_best/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class SecurityAndIDORTests(CommunityFixtureBase):
    """Section 13: backend enforcement, not just frontend checks."""

    def test_unauthenticated_cannot_create_post(self):
        resp = self.client.post('/api/community/posts/', {
            'title': 'Should not work at all', 'body': 'unauthenticated attempt body',
            'post_type': 'discussion',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_cannot_edit_another_students_post(self):
        post = CommunityPost.objects.create(author=self.student, title='Original title here', body='original body text')
        self.client.force_authenticate(user=self.student2)
        resp = self.client.patch(f'/api/community/posts/{post.id}/', {'title': 'Hijacked title'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        post.refresh_from_db()
        self.assertEqual(post.title, 'Original title here')

    def test_student_cannot_delete_another_students_reply(self):
        post = CommunityPost.objects.create(author=self.student, title='Some post title here', body='some body text here')
        reply = CommunityReply.objects.create(post=post, author=self.student, body='original reply body')
        self.client.force_authenticate(user=self.student2)
        resp = self.client.delete(f'/api/community/replies/{reply.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(CommunityReply.objects.filter(pk=reply.id).exists())

    def test_student_cannot_pin_post(self):
        post = CommunityPost.objects.create(author=self.student, title='Some post title here', body='some body text here')
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(f'/api/community/posts/{post.id}/pin/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_moderate_remove_post(self):
        post = CommunityPost.objects.create(author=self.student, title='Some post title here', body='some body text here')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/community/posts/{post.id}/moderate_remove/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.status, 'removed')

    def test_removed_post_hidden_from_other_students_but_visible_to_author(self):
        post = CommunityPost.objects.create(
            author=self.student, title='Some post title here', body='some body text here', status='removed',
        )
        self.client.force_authenticate(user=self.student2)
        resp = self.client.get(f'/api/community/posts/{post.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.student)
        resp = self.client.get(f'/api/community/posts/{post.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
