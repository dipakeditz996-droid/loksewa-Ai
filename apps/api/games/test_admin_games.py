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


class AdminGameListFilterTests(TestCase):
    """player_id / date_from / date_to filters added on top of the existing
    search/status filters for the two admin list endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass123', role='admin')
        self.player1 = User.objects.create_user(
            username='player1', email='player1@test.com', password='pass123', role='student')
        self.player2 = User.objects.create_user(
            username='player2', email='player2@test.com', password='pass123', role='student')
        self.other_player = User.objects.create_user(
            username='other', email='other@test.com', password='pass123', role='student')
        self.client.force_authenticate(user=self.admin)

        self.old_match = GameMatch.objects.create(
            player1=self.player1, player2=self.other_player, status='COMPLETED',
        )
        self.old_match.created_at = timezone.now() - timedelta(days=10)
        self.old_match.save(update_fields=['created_at'])

        self.recent_match = GameMatch.objects.create(
            player1=self.player1, player2=self.player2, status='COMPLETED',
        )

        self.old_survival = SurvivalGame.objects.create(player=self.other_player, status='COMPLETED')
        self.old_survival.created_at = timezone.now() - timedelta(days=10)
        self.old_survival.save(update_fields=['created_at'])

        self.recent_survival = SurvivalGame.objects.create(player=self.player1, status='COMPLETED')

    def test_matches_filter_by_player_id(self):
        response = self.client.get(f'/api/games/admin/matches/?player_id={self.player2.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.recent_match.id)

    def test_matches_filter_by_date_range(self):
        today = timezone.now().date().isoformat()
        response = self.client.get(f'/api/games/admin/matches/?date_from={today}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.recent_match.id)

    def test_matches_invalid_player_id_ignored_not_500(self):
        response = self.client.get('/api/games/admin/matches/?player_id=not-a-number')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_survival_filter_by_player_id(self):
        response = self.client.get(f'/api/games/admin/survival-games/?player_id={self.player1.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.recent_survival.id)

    def test_survival_filter_by_date_range(self):
        today = timezone.now().date().isoformat()
        response = self.client.get(f'/api/games/admin/survival-games/?date_from={today}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.recent_survival.id)


class AdminGameStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

    def test_anonymous_rejected(self):
        response = self.client.get('/api/games/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/games/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_empty_database_state(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/games/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totalPlayers'], 0)
        self.assertEqual(response.data['totalGamesPlayed'], 0)
        self.assertEqual(response.data['completedGames'], 0)
        self.assertIsNone(response.data['averageDuelScore'])
        self.assertIsNone(response.data['averageSurvivalScore'])
        self.assertEqual(response.data['recentActivity'], [])

    def test_stats_calculated_from_real_records(self):
        player1 = User.objects.create_user(
            username='p1', email='p1@test.com', password='pass123', role='student')
        player2 = User.objects.create_user(
            username='p2', email='p2@test.com', password='pass123', role='student')

        GameMatch.objects.create(
            player1=player1, player2=player2, status='COMPLETED',
            player1_score=80, player2_score=60, winner=player1,
        )
        GameMatch.objects.create(player1=player1, status='SEARCHING')
        SurvivalGame.objects.create(player=player1, status='COMPLETED', score=100)
        SurvivalGame.objects.create(player=player2, status='IN_PROGRESS', score=20)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/games/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data['totalPlayers'], 2)
        self.assertEqual(data['activePlayers'], 2)
        self.assertEqual(data['totalDuels'], 2)
        self.assertEqual(data['totalSurvivalRuns'], 2)
        self.assertEqual(data['totalGamesPlayed'], 4)
        self.assertEqual(data['completedDuels'], 1)
        self.assertEqual(data['completedSurvivalRuns'], 1)
        self.assertEqual(data['completedGames'], 2)
        self.assertEqual(data['averageDuelScore'], 70.0)
        self.assertEqual(data['averageSurvivalScore'], 100.0)
        self.assertEqual(len(data['recentActivity']), 4)

    def test_no_n_plus_one_regression(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        players = [
            User.objects.create_user(username=f'bulk{i}', email=f'bulk{i}@test.com', password='pass123', role='student')
            for i in range(6)
        ]
        for i in range(0, 6, 2):
            GameMatch.objects.create(
                player1=players[i], player2=players[i + 1], status='COMPLETED',
                player1_score=10, player2_score=5,
            )
        for p in players:
            SurvivalGame.objects.create(player=p, status='COMPLETED', score=50)

        self.client.force_authenticate(user=self.admin)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/games/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(len(ctx.captured_queries), 15)


class AdminPlayerGameActivityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='student1', email='student1@test.com', password='pass123', role='student')
        self.opponent = User.objects.create_user(
            username='opponent', email='opponent@test.com', password='pass123', role='student')

    def test_anonymous_rejected(self):
        response = self.client.get(f'/api/games/admin/players/{self.student.id}/activity/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/games/admin/players/{self.student.id}/activity/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_student_404(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/games/admin/players/999999/activity/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_view_real_activity(self):
        GameMatch.objects.create(
            player1=self.student, player2=self.opponent, status='COMPLETED',
            player1_score=90, player2_score=40, winner=self.student,
        )
        SurvivalGame.objects.create(player=self.student, status='COMPLETED', score=120, questions_survived=8)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/games/admin/players/{self.student.id}/activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data['player']['username'], 'student1')
        self.assertEqual(data['summary']['duelsPlayed'], 1)
        self.assertEqual(data['summary']['duelsWon'], 1)
        self.assertEqual(data['summary']['survivalRuns'], 1)
        self.assertEqual(data['summary']['bestSurvivalScore'], 120)
        self.assertEqual(len(data['recentMatches']), 1)
        self.assertEqual(len(data['recentSurvivalRuns']), 1)
