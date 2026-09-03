"""The personal-inbox endpoints (/api/notifications/*) already served students
via NotificationListView/NotificationUnreadCountView/NotificationReadView/
NotificationMarkAllReadView, but had no test coverage at all. Covers: a
student only ever sees their own notifications, unread counts and mark-read/
mark-all-read work and are scoped to request.user, pagination, and the
category filter added for the new /student/notifications center.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Notification


class NotificationOwnershipTests(APITestCase):
    def setUp(self):
        self.student1 = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student')
        self.student2 = User.objects.create_user(
            username='stud2', email='s2@test.com', password='pass123', role='student')

        self.own_notif = Notification.objects.create(
            recipient=self.student1, type='exam', title='Mine', message='For student1.')
        self.other_notif = Notification.objects.create(
            recipient=self.student2, type='exam', title='Not mine', message='For student2.')

    def test_list_only_returns_own_notifications(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {n['title'] for n in response.data['results']}
        self.assertEqual(titles, {'Mine'})

    def test_cannot_mark_another_students_notification_read(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.patch(f'/api/notifications/{self.other_notif.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.other_notif.refresh_from_db()
        self.assertFalse(self.other_notif.is_read)

    def test_mark_all_read_only_touches_own_notifications(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.other_notif.refresh_from_db()
        self.assertFalse(self.other_notif.is_read)
        self.own_notif.refresh_from_db()
        self.assertTrue(self.own_notif.is_read)


class NotificationReadStateTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student')
        self.client.force_authenticate(user=self.student)

    def test_unread_count_and_latest(self):
        for i in range(3):
            Notification.objects.create(
                recipient=self.student, type='exam', title=f'N{i}', message='msg')
        Notification.objects.create(
            recipient=self.student, type='exam', title='Read one', message='msg', is_read=True)

        response = self.client.get('/api/notifications/unread/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 3)
        self.assertEqual(len(response.data['latest']), 4)

    def test_mark_one_read_sets_read_at(self):
        notif = Notification.objects.create(
            recipient=self.student, type='exam', title='N', message='msg')
        response = self.client.patch(f'/api/notifications/{notif.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
        self.assertIsNotNone(notif.read_at)

    def test_mark_all_read(self):
        for i in range(5):
            Notification.objects.create(
                recipient=self.student, type='exam', title=f'N{i}', message='msg')
        response = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.student, is_read=False).count(), 0)

    def test_pagination_page_size(self):
        for i in range(25):
            Notification.objects.create(
                recipient=self.student, type='exam', title=f'N{i}', message='msg')
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 25)
        self.assertEqual(len(response.data['results']), 20)
        self.assertIsNotNone(response.data['next'])

        response_page2 = self.client.get('/api/notifications/?page=2')
        self.assertEqual(len(response_page2.data['results']), 5)


class NotificationCategoryFilterTests(APITestCase):
    """The student notification center's tabs (All/Unread/Important/Exam/
    Learning/Achievement/System) are powered by ?category= on top of the
    existing ?unread=/?type=/?priority= filters."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student')
        self.client.force_authenticate(user=self.student)

        Notification.objects.create(recipient=self.student, type='exam', title='Exam', message='m')
        Notification.objects.create(recipient=self.student, type='result', title='Result', message='m')
        Notification.objects.create(recipient=self.student, type='practice', title='Practice', message='m')
        Notification.objects.create(recipient=self.student, type='course', title='Course', message='m')
        Notification.objects.create(recipient=self.student, type='study_plan', title='Plan', message='m')
        Notification.objects.create(recipient=self.student, type='gamification', title='Level Up', message='m')
        Notification.objects.create(recipient=self.student, type='payment', title='Payment', message='m')
        Notification.objects.create(recipient=self.student, type='announcement', title='Announcement', message='m')
        Notification.objects.create(
            recipient=self.student, type='system', title='Critical', message='m', priority='critical')
        Notification.objects.create(
            recipient=self.student, type='exam', title='Important exam', message='m', priority='important')

    def _titles(self, category):
        response = self.client.get(f'/api/notifications/?category={category}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {n['title'] for n in response.data['results']}

    def test_exam_category_groups_exam_result_evaluation(self):
        self.assertEqual(self._titles('exam'), {'Exam', 'Result', 'Important exam'})

    def test_learning_category_groups_practice_course_study_plan(self):
        self.assertEqual(self._titles('learning'), {'Practice', 'Course', 'Plan'})

    def test_achievement_category_is_gamification(self):
        self.assertEqual(self._titles('achievement'), {'Level Up'})

    def test_system_category_is_the_catch_all(self):
        # 'payment' now has its own 'payments' category tab (see
        # NOTIFICATION_CATEGORY_MAP), so it's no longer part of the
        # 'system' catch-all.
        self.assertEqual(self._titles('system'), {'Announcement', 'Critical'})

    def test_payments_category_groups_payment(self):
        self.assertEqual(self._titles('payments'), {'Payment'})

    def test_important_category_is_priority_based(self):
        self.assertEqual(self._titles('important'), {'Critical', 'Important exam'})
