from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import GameProfile

User = get_user_model()


class LeaderboardTests(APITestCase):
    """games.LeaderboardView (/api/games/leaderboard/) - the game-specific
    top-10 widget (1v1 wins, survival score), distinct from the platform-wide
    XP leaderboard in administration/leaderboard_views.py."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='student1', password='pass123', role='student')

    def test_anonymous_rejected(self):
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_state(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['top_1v1'], [])
        self.assertEqual(response.data['top_survival'], [])

    def test_ranking_ordered_server_side(self):
        low = User.objects.create_user(username='low', password='pass123', role='student')
        high = User.objects.create_user(username='high', password='pass123', role='student')
        GameProfile.objects.create(user=low, total_1v1_wins=1, best_survival_score=10)
        GameProfile.objects.create(user=high, total_1v1_wins=9, best_survival_score=90)

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        self.assertEqual(response.data['top_1v1'][0]['username'], 'high')
        self.assertEqual(response.data['top_survival'][0]['username'], 'high')

    def test_excludes_non_student_accounts(self):
        teacher = User.objects.create_user(username='teach1', password='pass123', role='teacher')
        GameProfile.objects.create(user=teacher, total_1v1_wins=99, best_survival_score=999)
        student_profile_user = User.objects.create_user(
            username='realstudent', password='pass123', role='student')
        GameProfile.objects.create(user=student_profile_user, total_1v1_wins=1, best_survival_score=1)

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/leaderboard/')
        usernames_1v1 = [row['username'] for row in response.data['top_1v1']]
        usernames_survival = [row['username'] for row in response.data['top_survival']]
        self.assertNotIn('teach1', usernames_1v1)
        self.assertNotIn('teach1', usernames_survival)
        self.assertIn('realstudent', usernames_1v1)
