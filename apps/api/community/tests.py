"""Real, DB-backed tests for the Loksewa Community feature: post/reply CRUD,
best-answer marking (incl. self-marking rules), helpful votes, bookmarks,
reports + admin moderation, and IDOR/permission isolation across roles."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from .models import CommunityPost, CommunityReply, CommunityHelpfulVote, CommunityBookmark, CommunityReport


class CommunityTestBase(APITestCase):
    def setUp(self):
        self.student_a = User.objects.create_user(username='cstudent_a', password='pw', role='student')
        self.student_b = User.objects.create_user(username='cstudent_b', password='pw', role='student')
        self.teacher = User.objects.create_user(username='cteacher', password='pw', role='teacher')
        self.admin = User.objects.create_user(username='cadmin', password='pw', role='admin', is_staff=True)

        category = ExamCategory.objects.create(name='__c_cat__')
        exam_level = Exam.objects.create(name='__c_level__', category=category)
        paper = Paper.objects.create(exam=exam_level, name='__c_paper__')
        subject = Subject.objects.create(name='__c_subject__', paper=paper)
        chapter = Chapter.objects.create(subject=subject, title='__c_chapter__')
        self.topic = Topic.objects.create(name='__c_topic__', chapter=chapter)
        self.question = Question.objects.create(
            text='What is 2+2?', option_a='3', option_b='4', option_c='5', option_d='6',
            correct_option='b', topic=self.topic, status='approved',
        )


class CommunityPostTests(CommunityTestBase):
    def test_student_can_create_post(self):
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post('/api/community/posts/', {
            'title': 'How do I solve percentage problems?',
            'body': 'I keep getting confused with base value calculations.',
            'post_type': 'question',
            'topic': self.topic.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CommunityPost.objects.count(), 1)
        self.assertEqual(CommunityPost.objects.first().author, self.student_a)

    def test_post_from_practice_question_carries_source_question(self):
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post('/api/community/posts/', {
            'title': 'Doubt: What is 2+2?',
            'body': "I'm stuck on this question from practice.",
            'post_type': 'question',
            'topic': self.topic.id,
            'source_question': self.question.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # create uses the write serializer (plain FK id); the nested
        # question detail is only expanded on retrieve - confirm that here.
        self.assertEqual(resp.data['source_question'], self.question.id)
        detail = self.client.get(f'/api/community/posts/{resp.data["id"]}/')
        self.assertEqual(detail.data['source_question']['id'], self.question.id)
        self.assertEqual(detail.data['source_question']['text'], 'What is 2+2?')

    def test_short_title_rejected(self):
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post('/api/community/posts/', {
            'title': 'Hi', 'body': 'short question here please help', 'post_type': 'question',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_create_post(self):
        resp = self.client.post('/api/community/posts/', {
            'title': 'Can I post anonymously?', 'body': 'testing unauthenticated access here',
        }, format='json')
        self.assertIn(resp.status_code, (401, 403))

    def test_retrieve_increments_view_count(self):
        post = CommunityPost.objects.create(author=self.student_a, title='View count test', body='body text here')
        self.client.force_authenticate(user=self.student_b)
        self.client.get(f'/api/community/posts/{post.id}/')
        self.client.get(f'/api/community/posts/{post.id}/')
        post.refresh_from_db()
        self.assertEqual(post.view_count, 2)

    def test_search_finds_matching_post(self):
        CommunityPost.objects.create(author=self.student_a, title='Constitutional Law doubt', body='Article 18 confusion')
        CommunityPost.objects.create(author=self.student_a, title='Unrelated post', body='something else entirely')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.get('/api/community/posts/?search=Constitutional')
        self.assertEqual(resp.status_code, 200)
        titles = [p['title'] for p in resp.data['results']]
        self.assertIn('Constitutional Law doubt', titles)
        self.assertNotIn('Unrelated post', titles)

    def test_removed_post_hidden_from_others_but_visible_to_author_and_admin(self):
        post = CommunityPost.objects.create(author=self.student_a, title='Removed post test', body='body text', status='removed')

        self.client.force_authenticate(user=self.student_b)
        resp = self.client.get('/api/community/posts/')
        self.assertNotIn(post.id, [p['id'] for p in resp.data['results']])

        self.client.force_authenticate(user=self.student_a)
        resp = self.client.get('/api/community/posts/')
        self.assertIn(post.id, [p['id'] for p in resp.data['results']])

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/community/posts/')
        self.assertIn(post.id, [p['id'] for p in resp.data['results']])

    def test_only_admin_can_pin(self):
        post = CommunityPost.objects.create(author=self.student_a, title='Pin test post', body='body text here')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post(f'/api/community/posts/{post.id}/pin/')
        self.assertEqual(resp.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/community/posts/{post.id}/pin/')
        self.assertEqual(resp.status_code, 200)
        post.refresh_from_db()
        self.assertTrue(post.is_pinned)

    def test_locked_post_rejects_new_replies_from_students(self):
        post = CommunityPost.objects.create(author=self.student_a, title='Locked post test', body='body text', is_locked=True)
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post('/api/community/replies/', {'post': post.id, 'body': 'trying to reply anyway'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_bookmark_toggle(self):
        post = CommunityPost.objects.create(author=self.student_a, title='Bookmark test post', body='body text here')
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post(f'/api/community/posts/{post.id}/toggle_bookmark/')
        self.assertEqual(resp.data['bookmarked'], True)
        self.assertEqual(CommunityBookmark.objects.filter(user=self.student_b, post=post).count(), 1)
        resp = self.client.post(f'/api/community/posts/{post.id}/toggle_bookmark/')
        self.assertEqual(resp.data['bookmarked'], False)
        self.assertEqual(CommunityBookmark.objects.filter(user=self.student_b, post=post).count(), 0)


class CommunityReplyTests(CommunityTestBase):
    def setUp(self):
        super().setUp()
        self.post = CommunityPost.objects.create(author=self.student_a, title='Need help with this', body='Detailed question body here')

    def test_teacher_can_reply(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/community/replies/', {'post': self.post.id, 'body': 'Here is the explanation you need.'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['author']['role'], 'teacher')

    def test_post_author_can_mark_best_answer(self):
        reply = CommunityReply.objects.create(post=self.post, author=self.teacher, body='The correct approach is...')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post(f'/api/community/replies/{reply.id}/mark_best/')
        self.assertEqual(resp.status_code, 200)
        reply.refresh_from_db()
        self.assertTrue(reply.is_best_answer)

    def test_random_student_cannot_mark_best_answer(self):
        reply = CommunityReply.objects.create(post=self.post, author=self.teacher, body='An answer.')
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post(f'/api/community/replies/{reply.id}/mark_best/')
        self.assertEqual(resp.status_code, 403)
        reply.refresh_from_db()
        self.assertFalse(reply.is_best_answer)

    def test_marking_new_best_answer_unmarks_previous(self):
        reply1 = CommunityReply.objects.create(post=self.post, author=self.teacher, body='First answer', is_best_answer=True)
        reply2 = CommunityReply.objects.create(post=self.post, author=self.student_b, body='Better answer')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post(f'/api/community/replies/{reply2.id}/mark_best/')
        self.assertEqual(resp.status_code, 200)
        reply1.refresh_from_db()
        reply2.refresh_from_db()
        self.assertFalse(reply1.is_best_answer)
        self.assertTrue(reply2.is_best_answer)

    def test_helpful_vote_toggle(self):
        reply = CommunityReply.objects.create(post=self.post, author=self.teacher, body='Helpful answer here')
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post(f'/api/community/replies/{reply.id}/toggle_helpful/')
        self.assertEqual(resp.data['is_helpful'], True)
        self.assertEqual(resp.data['helpful_count'], 1)
        resp = self.client.post(f'/api/community/replies/{reply.id}/toggle_helpful/')
        self.assertEqual(resp.data['is_helpful'], False)
        self.assertEqual(resp.data['helpful_count'], 0)

    def test_reply_to_reply_threading(self):
        parent = CommunityReply.objects.create(post=self.post, author=self.teacher, body='Parent answer')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.post('/api/community/replies/', {
            'post': self.post.id, 'body': 'Thanks, follow-up question', 'parent_reply': parent.id,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(CommunityReply.objects.get(id=resp.data['id']).parent_reply_id, parent.id)


class CommunityModerationAndSecurityTests(CommunityTestBase):
    def setUp(self):
        super().setUp()
        self.post = CommunityPost.objects.create(author=self.student_a, title='Report target post', body='Body content here')
        self.reply = CommunityReply.objects.create(post=self.post, author=self.teacher, body='Reply content here')

    def test_student_can_report_post_and_it_notifies_admins(self):
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post(f'/api/community/posts/{self.post.id}/report/', {'reason': 'spam'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(CommunityReport.objects.filter(post=self.post, status='open').count(), 1)

        from core.models import Notification
        self.assertTrue(Notification.objects.filter(recipient=self.admin, type='community').exists())

    def test_student_cannot_see_reports_queue(self):
        CommunityReport.objects.create(reporter=self.student_b, post=self.post, reason='spam')
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.get('/api/community/reports/')
        self.assertIn(resp.status_code, (403, 404))

    def test_admin_can_resolve_report(self):
        report = CommunityReport.objects.create(reporter=self.student_b, post=self.post, reason='spam')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/community/reports/{report.id}/resolve/')
        self.assertEqual(resp.status_code, 200)
        report.refresh_from_db()
        self.assertEqual(report.status, 'resolved')
        self.assertEqual(report.resolved_by, self.admin)

    def test_only_admin_can_moderate_remove_post(self):
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.post(f'/api/community/posts/{self.post.id}/moderate_remove/')
        self.assertEqual(resp.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/community/posts/{self.post.id}/moderate_remove/')
        self.assertEqual(resp.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, 'removed')

    def test_non_owner_cannot_edit_post(self):
        self.client.force_authenticate(user=self.student_b)
        resp = self.client.patch(f'/api/community/posts/{self.post.id}/', {'title': 'Hacked title here'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.post.refresh_from_db()
        self.assertNotEqual(self.post.title, 'Hacked title here')

    def test_non_owner_cannot_delete_reply(self):
        self.client.force_authenticate(user=self.student_a)
        resp = self.client.delete(f'/api/community/replies/{self.reply.id}/')
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(CommunityReply.objects.filter(id=self.reply.id).exists())

    def test_owner_can_delete_own_reply(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.delete(f'/api/community/replies/{self.reply.id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(CommunityReply.objects.filter(id=self.reply.id).exists())
