from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from .models import GameMatch, SurvivalGame, GameQuestion, SurvivalAnswer
from exams.models import Question, Exam, Subject

User = get_user_model()

class AdminGamesPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student_user = User.objects.create_user(
            username='student1',
            email='student@test.com',
            password='pass123',
            role='student'
        )
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin@test.com',
            password='pass123',
            role='admin'
        )

    def test_anonymous_rejected(self):
        response = self.client.get('/api/games/admin/matches/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/games/admin/matches/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_allowed(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/games/admin/matches/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class AdminGameMatchesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='pass123',
            role='admin'
        )
        self.player1 = User.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='pass123',
            role='student'
        )
        self.player2 = User.objects.create_user(
            username='player2',
            email='player2@test.com',
            password='pass123',
            role='student'
        )
        self.client.force_authenticate(user=self.admin)

        # Create test match
        self.match = GameMatch.objects.create(
            player1=self.player1,
            player2=self.player2,
            status='COMPLETED',
            player1_score=80,
            player2_score=60,
            winner=self.player1,
            started_at=timezone.now() - timedelta(hours=1),
            ended_at=timezone.now()
        )

    def test_list_matches(self):
        response = self.client.get('/api/games/admin/matches/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(len(response.data['results']), 1)

    def test_pagination(self):
        response = self.client.get('/api/games/admin/matches/?page=1&page_size=10')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('page', response.data)
        self.assertIn('page_size', response.data)
        self.assertIn('total_pages', response.data)

    def test_search_by_username(self):
        response = self.client.get('/api/games/admin/matches/?search=player1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)

    def test_search_no_results(self):
        response = self.client.get('/api/games/admin/matches/?search=nonexistent')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)

    def test_status_filter(self):
        response = self.client.get('/api/games/admin/matches/?status=COMPLETED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)

    def test_status_filter_no_results(self):
        response = self.client.get('/api/games/admin/matches/?status=SEARCHING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)

    def test_response_no_sensitive_data(self):
        response = self.client.get('/api/games/admin/matches/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        match_data = response.data['results'][0]
        # Verify sensitive fields are not exposed
        self.assertNotIn('player1', match_data)
        self.assertNotIn('player2', match_data)
        self.assertNotIn('invite_code', match_data)
        # Verify safe fields are exposed
        self.assertIn('player1_username', match_data)
        self.assertIn('player2_username', match_data)
        self.assertIn('status', match_data)

class AdminSurvivalGamesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='pass123',
            role='admin'
        )
        self.player = User.objects.create_user(
            username='player',
            email='player@test.com',
            password='pass123',
            role='student'
        )
        self.client.force_authenticate(user=self.admin)

        # Create test survival game
        self.game = SurvivalGame.objects.create(
            player=self.player,
            score=150,
            questions_survived=10,
            highest_streak=10,
            status='COMPLETED',
            created_at=timezone.now() - timedelta(hours=1),
            ended_at=timezone.now()
        )

    def test_list_survival_games(self):
        response = self.client.get('/api/games/admin/survival-games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(len(response.data['results']), 1)

    def test_pagination(self):
        response = self.client.get('/api/games/admin/survival-games/?page=1&page_size=10')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)

    def test_search_by_username(self):
        response = self.client.get('/api/games/admin/survival-games/?search=player')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)

    def test_status_filter(self):
        response = self.client.get('/api/games/admin/survival-games/?status=COMPLETED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)

    def test_response_duration_calculation(self):
        response = self.client.get('/api/games/admin/survival-games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        game_data = response.data['results'][0]
        self.assertIn('duration_seconds', game_data)
        self.assertIsNotNone(game_data['duration_seconds'])

    def test_response_no_sensitive_data(self):
        response = self.client.get('/api/games/admin/survival-games/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        game_data = response.data['results'][0]
        # Verify sensitive fields are not exposed
        self.assertNotIn('player', game_data)
        # Verify safe fields are exposed
        self.assertIn('player_username', game_data)
        self.assertIn('score', game_data)
