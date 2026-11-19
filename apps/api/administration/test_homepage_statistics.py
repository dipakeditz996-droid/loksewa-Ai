from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.cache import cache
from core.models import User, HomepageStatistic
from administration.models import AuditLog
from core.statistic_views import CACHE_KEY_PUBLIC_STATISTICS, CACHE_KEY_PUBLIC_STATS

class HomepageStatisticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin_tester',
            email='admin@nesmastery.com',
            password='Password123!',
            role='admin',
            is_staff=True,
        )

        # Create regular student user
        self.student_user = User.objects.create_user(
            username='student_tester',
            email='student@nesmastery.com',
            password='Password123!',
            role='student',
        )

        # Clear existing seed for isolated test
        HomepageStatistic.objects.all().delete()

        self.hero_stat = HomepageStatistic.objects.create(
            placement='hero',
            label='Aspirants Enrolled',
            description='Active learners',
            source_type='manual',
            value=10000.0,
            suffix='+',
            precision=0,
            thousand_separator=True,
            animation_enabled=True,
            animation_duration=1.5,
            animation_start_value=0.0,
            icon='users',
            accent_style='default',
            display_order=0,
            is_active=True,
            created_by=self.admin_user,
        )

        self.platform_stat = HomepageStatistic.objects.create(
            placement='platform',
            label='Content Accuracy',
            description='Verified by experts',
            source_type='manual',
            value=80.8,
            suffix='%',
            precision=1,
            thousand_separator=False,
            animation_enabled=True,
            animation_duration=2.0,
            animation_start_value=1.0,
            icon='check-circle',
            accent_style='gold',
            display_order=1,
            is_active=True,
            created_by=self.admin_user,
        )

    def test_public_statistics_endpoint(self):
        """Public endpoint should return active statistics grouped by hero and platform."""
        res = self.client.get('/api/public/statistics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('hero', res.data)
        self.assertIn('platform', res.data)
        self.assertEqual(len(res.data['hero']), 1)
        self.assertEqual(len(res.data['platform']), 1)
        self.assertEqual(res.data['hero'][0]['label'], 'Aspirants Enrolled')
        self.assertEqual(res.data['hero'][0]['formatted_value'], '10,000+')
        self.assertEqual(res.data['platform'][0]['formatted_value'], '80.8%')

    def test_public_statistics_cache(self):
        """Public endpoint should cache results and invalidate on update."""
        res1 = self.client.get('/api/public/statistics/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(cache.get(CACHE_KEY_PUBLIC_STATISTICS))

        # Admin updates the stat
        self.client.force_authenticate(user=self.admin_user)
        update_res = self.client.patch(
            f'/api/admin/homepage-statistics/{self.hero_stat.id}/',
            {'value': 12500.0},
            format='json'
        )
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        # Cache should be cleared
        self.assertIsNone(cache.get(CACHE_KEY_PUBLIC_STATISTICS))

        # Fresh public call reflects update
        self.client.logout()
        res2 = self.client.get('/api/public/statistics/')
        self.assertEqual(res2.data['hero'][0]['formatted_value'], '12,500+')

    def test_student_cannot_access_admin_endpoints(self):
        """Unauthorized non-admin users cannot mutate or view admin statistics."""
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/admin/homepage-statistics/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        create_res = self.client.post('/api/admin/homepage-statistics/', {
            'placement': 'hero',
            'label': 'Hacked Stat',
            'value': 999,
        })
        self.assertEqual(create_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_crud_workflow(self):
        """Admin can create, edit, toggle, reorder, and delete statistics."""
        self.client.force_authenticate(user=self.admin_user)

        # Create
        create_res = self.client.post('/api/admin/homepage-statistics/', {
            'placement': 'platform',
            'label': 'Practice Sets',
            'description': 'Topic-wise sets',
            'source_type': 'manual',
            'value': 25.0,
            'suffix': '+',
            'precision': 0,
            'thousand_separator': True,
            'animation_enabled': True,
            'animation_duration': 2.0,
            'display_order': 2,
            'is_active': True,
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_id = create_res.data['id']

        # Audit log verification
        audit = AuditLog.objects.filter(action='CREATE_HOMEPAGE_STATISTIC', entity_id=str(new_id)).first()
        self.assertIsNotNone(audit)

        # Toggle
        toggle_res = self.client.patch(f'/api/admin/homepage-statistics/{new_id}/toggle/')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_res.data['is_active'])

        # Reorder
        reorder_res = self.client.post('/api/admin/homepage-statistics/reorder/', [
            {'id': self.platform_stat.id, 'display_order': 5},
            {'id': new_id, 'display_order': 1},
        ], format='json')
        self.assertEqual(reorder_res.status_code, status.HTTP_200_OK)
        self.platform_stat.refresh_from_db()
        self.assertEqual(self.platform_stat.display_order, 5)

        # Delete
        delete_res = self.client.delete(f'/api/admin/homepage-statistics/{new_id}/')
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(HomepageStatistic.objects.filter(id=new_id).exists())

    def test_automatic_metrics_resolution(self):
        """Automatic mode should query verified database metrics and provide metadata."""
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.get('/api/admin/homepage-statistics/automatic-metrics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 7)

        # Create an automatic statistic
        create_res = self.client.post('/api/admin/homepage-statistics/', {
            'placement': 'platform',
            'label': 'Live Active Students',
            'description': 'Verified from active accounts',
            'source_type': 'automatic',
            'automatic_metric': 'active_students',
            'suffix': '+',
            'display_order': 3,
            'is_active': True,
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        stat_obj = HomepageStatistic.objects.get(id=create_res.data['id'])
        self.assertGreaterEqual(float(stat_obj.resolve_target_value()), 1.0)
