from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.cache import cache

from gamification.models import GamificationProfile, ReferralSetting, Referral, XPTransaction
from gamification.services import get_or_create_profile, award_xp, award_coins, register_referral

User = get_user_model()


class GamificationReferralDashboardTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="student_user",
            email="student@example.com",
            password="testpassword123",
            role="student",
        )
        self.profile = get_or_create_profile(self.user)
        self.profile.referral_code = "STUDENT123"
        self.profile.xp = 250
        self.profile.coins = 50
        self.profile.save()

        # Create settings
        self.settings = ReferralSetting.get_settings()
        self.settings.is_enabled = True
        self.settings.save()

        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        cache.clear()

    def test_referral_dashboard_schema_and_compatibility(self):
        response = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check top-level keys
        self.assertIn('profile', data)
        self.assertIn('stats', data)
        self.assertIn('settings', data)

        # Profile fields
        profile = data['profile']
        self.assertEqual(profile['xp'], 250)
        self.assertEqual(profile['coins'], 50)
        self.assertEqual(profile['referral_code'], "STUDENT123")

        # Stats fields (all legacy fields preserved)
        stats_data = data['stats']
        required_stats_keys = [
            'total_referrals',
            'successful_referrals',
            'pending_referrals',
            'total_xp_earned',
            'total_coins_earned',
            'rank',
            'streak_days',
            'games_played',
            'games_won',
            'accuracy',
            'best_score',
            'questions_answered',
        ]
        for key in required_stats_keys:
            self.assertIn(key, stats_data, f"Missing required stats key: {key}")

        self.assertEqual(stats_data['games_played'], 0)
        self.assertEqual(stats_data['games_won'], 0)
        self.assertEqual(stats_data['accuracy'], 0)

    def test_referral_dashboard_caching(self):
        # First request populates cache
        resp1 = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second request should hit cache with 0 DB queries
        with self.assertNumQueries(0):
            resp2 = self.client.get('/api/gamification/referrals/me/')
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            self.assertEqual(resp2.json(), resp1.json())

    def test_cache_invalidation_on_award_xp(self):
        resp1 = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(resp1.json()['profile']['xp'], 250)

        # Award XP to user
        award_xp(self.user, 100, "Completed test")

        # Next request must reflect updated XP
        resp2 = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(resp2.json()['profile']['xp'], 350)

    def test_cache_invalidation_on_award_coins(self):
        resp1 = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(resp1.json()['profile']['coins'], 50)

        award_coins(self.user, 25)

        resp2 = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(resp2.json()['profile']['coins'], 75)

    def test_daily_motivation_caching(self):
        resp1 = self.client.get('/api/gamification/daily-motivation/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second request must hit cache with 0 DB queries
        with self.assertNumQueries(0):
            resp2 = self.client.get('/api/gamification/daily-motivation/')
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            self.assertEqual(resp2.json(), resp1.json())
