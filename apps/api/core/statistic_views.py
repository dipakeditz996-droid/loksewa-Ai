from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

from administration.permissions import IsAdminUser
from administration.models import AuditLog
from administration.cache_service import AdminCacheService
from .models import HomepageStatistic
from .statistic_serializers import PublicHomepageStatisticSerializer, AdminHomepageStatisticSerializer

CACHE_KEY_PUBLIC_STATISTICS = 'public:homepage_statistics'
CACHE_KEY_PUBLIC_STATS = 'public:stats'

DEFAULT_HERO_STATISTICS = [
    {
        'placement': 'hero',
        'label': 'Aspirants Enrolled',
        'description': 'Active learners',
        'source_type': 'manual',
        'value': 10000.0,
        'suffix': '+',
        'precision': 0,
        'thousand_separator': True,
        'animation_enabled': True,
        'animation_duration': 1.5,
        'animation_start_value': 0.0,
        'icon': 'users',
        'accent_style': 'default',
        'display_order': 0,
        'is_active': True,
    },
    {
        'placement': 'hero',
        'label': 'Student Rating',
        'description': 'Verified reviews',
        'source_type': 'manual',
        'value': 4.9,
        'suffix': '/5',
        'precision': 1,
        'thousand_separator': False,
        'animation_enabled': True,
        'animation_duration': 1.5,
        'animation_start_value': 1.0,
        'icon': 'star',
        'accent_style': 'amber',
        'display_order': 1,
        'is_active': True,
    },
    {
        'placement': 'hero',
        'label': 'Exam Questions',
        'description': 'Verified syllabus questions',
        'source_type': 'manual',
        'value': 5000.0,
        'suffix': '+',
        'precision': 0,
        'thousand_separator': True,
        'animation_enabled': True,
        'animation_duration': 1.5,
        'animation_start_value': 0.0,
        'icon': 'book-open',
        'accent_style': 'default',
        'display_order': 2,
        'is_active': True,
    },
]

DEFAULT_PLATFORM_STATISTICS = [
    {
        'placement': 'platform',
        'label': 'Aspirants',
        'description': 'Active learners',
        'source_type': 'manual',
        'value': 100.0,
        'suffix': '+',
        'precision': 0,
        'thousand_separator': True,
        'animation_enabled': True,
        'animation_duration': 2.0,
        'animation_start_value': 0.0,
        'icon': 'users',
        'accent_style': 'default',
        'display_order': 0,
        'is_active': True,
    },
    {
        'placement': 'platform',
        'label': 'Questions',
        'description': 'Practice questions',
        'source_type': 'manual',
        'value': 1000.0,
        'suffix': '+',
        'precision': 0,
        'thousand_separator': True,
        'animation_enabled': True,
        'animation_duration': 2.0,
        'animation_start_value': 0.0,
        'icon': 'book-open',
        'accent_style': 'default',
        'display_order': 1,
        'is_active': True,
    },
    {
        'placement': 'platform',
        'label': 'Practice Sets',
        'description': 'Topic-wise sets',
        'source_type': 'manual',
        'value': 20.0,
        'suffix': '+',
        'precision': 0,
        'thousand_separator': True,
        'animation_enabled': True,
        'animation_duration': 2.0,
        'animation_start_value': 0.0,
        'icon': 'layers',
        'accent_style': 'default',
        'display_order': 2,
        'is_active': True,
    },
    {
        'placement': 'platform',
        'label': 'Content Accuracy',
        'description': 'Verified by experts',
        'source_type': 'manual',
        'value': 80.8,
        'suffix': '%',
        'precision': 1,
        'thousand_separator': False,
        'animation_enabled': True,
        'animation_duration': 2.0,
        'animation_start_value': 1.0,
        'icon': 'check-circle',
        'accent_style': 'gold',
        'display_order': 3,
        'is_active': True,
    },
]

def _ensure_statistic_table():
    """Ensure core_homepagestatistic table exists and seed defaults if empty."""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            if connection.vendor == 'sqlite':
                cursor.executescript("""
                    CREATE TABLE IF NOT EXISTS core_homepagestatistic (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        placement VARCHAR(20) NOT NULL DEFAULT 'platform',
                        label VARCHAR(150) NOT NULL DEFAULT '',
                        description VARCHAR(255) NOT NULL DEFAULT '',
                        source_type VARCHAR(20) NOT NULL DEFAULT 'manual',
                        automatic_metric VARCHAR(50) NOT NULL DEFAULT '',
                        value DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
                        raw_value VARCHAR(100) NOT NULL DEFAULT '',
                        prefix VARCHAR(30) NOT NULL DEFAULT '',
                        suffix VARCHAR(30) NOT NULL DEFAULT '',
                        precision SMALLINT NOT NULL DEFAULT 0,
                        thousand_separator BOOLEAN NOT NULL DEFAULT 1,
                        animation_enabled BOOLEAN NOT NULL DEFAULT 1,
                        animation_duration REAL NOT NULL DEFAULT 1.5,
                        animation_start_value REAL NOT NULL DEFAULT 0.0,
                        icon VARCHAR(50) NOT NULL DEFAULT '',
                        accent_style VARCHAR(30) NOT NULL DEFAULT 'default',
                        display_order INTEGER NOT NULL DEFAULT 0,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        created_by_id INTEGER NULL REFERENCES core_user(id) ON DELETE SET NULL
                    );
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_placement_idx ON core_homepagestatistic(placement);
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_order_idx ON core_homepagestatistic(display_order);
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_active_idx ON core_homepagestatistic(is_active);
                """)
            else:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS core_homepagestatistic (
                        id BIGSERIAL PRIMARY KEY,
                        placement VARCHAR(20) NOT NULL DEFAULT 'platform',
                        label VARCHAR(150) NOT NULL DEFAULT '',
                        description VARCHAR(255) NOT NULL DEFAULT '',
                        source_type VARCHAR(20) NOT NULL DEFAULT 'manual',
                        automatic_metric VARCHAR(50) NOT NULL DEFAULT '',
                        value NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
                        raw_value VARCHAR(100) NOT NULL DEFAULT '',
                        prefix VARCHAR(30) NOT NULL DEFAULT '',
                        suffix VARCHAR(30) NOT NULL DEFAULT '',
                        precision SMALLINT NOT NULL DEFAULT 0,
                        thousand_separator BOOLEAN NOT NULL DEFAULT TRUE,
                        animation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                        animation_duration DOUBLE PRECISION NOT NULL DEFAULT 1.5,
                        animation_start_value DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                        icon VARCHAR(50) NOT NULL DEFAULT '',
                        accent_style VARCHAR(30) NOT NULL DEFAULT 'default',
                        display_order INTEGER NOT NULL DEFAULT 0,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        created_by_id BIGINT NULL REFERENCES core_user(id) ON DELETE SET NULL
                    );
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_placement_idx ON core_homepagestatistic(placement);
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_order_idx ON core_homepagestatistic(display_order);
                    CREATE INDEX IF NOT EXISTS core_homepagestatistic_active_idx ON core_homepagestatistic(is_active);
                """)

        # Seed defaults if table is empty
        if HomepageStatistic.objects.count() == 0:
            for item in DEFAULT_HERO_STATISTICS:
                HomepageStatistic.objects.create(**item)
            for item in DEFAULT_PLATFORM_STATISTICS:
                HomepageStatistic.objects.create(**item)
    except Exception as e:
        logger.warning(f"Statistic table ensure/seed failed: {e}")


class PublicHomepageStatisticsView(APIView):
    """GET /api/public/statistics/ - Returns active hero and platform statistics in display order."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            cached = cache.get(CACHE_KEY_PUBLIC_STATISTICS)
            if cached is not None:
                return Response(cached)

            _ensure_statistic_table()
            active_stats = HomepageStatistic.objects.filter(is_active=True).order_by('display_order', '-created_at')

            hero_stats = [s for s in active_stats if s.placement == 'hero']
            platform_stats = [s for s in active_stats if s.placement == 'platform']

            data = {
                'hero': PublicHomepageStatisticSerializer(hero_stats, many=True).data,
                'platform': PublicHomepageStatisticSerializer(platform_stats, many=True).data,
            }
            cache.set(CACHE_KEY_PUBLIC_STATISTICS, data, timeout=300)
            return Response(data)
        except Exception as e:
            logger.warning(f"Error reading public statistics: {e}")
            _ensure_statistic_table()
            active_stats = HomepageStatistic.objects.filter(is_active=True).order_by('display_order', '-created_at')
            hero_stats = [s for s in active_stats if s.placement == 'hero']
            platform_stats = [s for s in active_stats if s.placement == 'platform']
            return Response({
                'hero': PublicHomepageStatisticSerializer(hero_stats, many=True).data,
                'platform': PublicHomepageStatisticSerializer(platform_stats, many=True).data,
            })


class PublicStatsBackwardsCompatView(APIView):
    """GET /api/public/stats/ - Backwards-compatible endpoint for existing consumers."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            cached = cache.get(CACHE_KEY_PUBLIC_STATS)
            if cached is not None:
                return Response(cached)

            _ensure_statistic_table()
            platform_stats = list(HomepageStatistic.objects.filter(placement='platform', is_active=True).order_by('display_order'))

            total_aspirants = 100
            total_questions = 1000
            practice_sets = 20
            content_accuracy = 80.8

            for s in platform_stats:
                label_lower = s.label.lower()
                val = s.resolve_target_value()
                try:
                    num_val = float(val) if not isinstance(val, (int, float)) else val
                except (ValueError, TypeError):
                    continue

                if 'aspirant' in label_lower or 'learner' in label_lower or 'student' in label_lower:
                    total_aspirants = int(num_val)
                elif 'question' in label_lower:
                    total_questions = int(num_val)
                elif 'set' in label_lower or 'practice' in label_lower:
                    practice_sets = int(num_val)
                elif 'accuracy' in label_lower or 'verified' in label_lower:
                    content_accuracy = round(float(num_val), 1)

            payload = {
                'total_aspirants': total_aspirants,
                'total_questions': total_questions,
                'practice_sets': practice_sets,
                'content_accuracy': content_accuracy,
            }
            cache.set(CACHE_KEY_PUBLIC_STATS, payload, timeout=300)
            return Response(payload)
        except Exception as e:
            logger.warning(f"Error in PublicStatsBackwardsCompatView: {e}")
            return Response({
                'total_aspirants': 100,
                'total_questions': 1000,
                'practice_sets': 20,
                'content_accuracy': 80.8,
            })


class AdminHomepageStatisticViewSet(viewsets.ModelViewSet):
    """Full CRUD, toggle, reorder, and automatic metric resolution for Homepage Statistics."""
    queryset = HomepageStatistic.objects.select_related('created_by').all().order_by('placement', 'display_order', '-created_at')
    serializer_class = AdminHomepageStatisticSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['label', 'description', 'prefix', 'suffix']

    def list(self, request, *args, **kwargs):
        try:
            _ensure_statistic_table()
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.warning(f"Admin statistic list error: {e}")
            _ensure_statistic_table()
            return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        AdminCacheService.invalidate_homepage_statistics()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='CREATE_HOMEPAGE_STATISTIC',
                entity_type='HomepageStatistic',
                entity_id=str(instance.id),
                details={
                    'placement': instance.placement,
                    'label': instance.label,
                    'formatted': instance.get_formatted_display(),
                    'is_active': instance.is_active,
                },
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = serializer.save()
        AdminCacheService.invalidate_homepage_statistics()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='UPDATE_HOMEPAGE_STATISTIC',
                entity_type='HomepageStatistic',
                entity_id=str(instance.id),
                details={
                    'placement': instance.placement,
                    'label': instance.label,
                    'formatted': instance.get_formatted_display(),
                    'is_active': instance.is_active,
                },
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        instance_id = str(instance.id)
        details = {'placement': instance.placement, 'label': instance.label}
        instance.delete()
        AdminCacheService.invalidate_homepage_statistics()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='DELETE_HOMEPAGE_STATISTIC',
                entity_type='HomepageStatistic',
                entity_id=instance_id,
                details=details,
            )
        except Exception:
            pass

    @action(detail=True, methods=['patch'], url_path='toggle')
    def toggle_active(self, request, pk=None):
        stat = self.get_object()
        stat.is_active = not stat.is_active
        stat.save(update_fields=['is_active', 'updated_at'])
        AdminCacheService.invalidate_homepage_statistics()
        return Response({'id': stat.id, 'is_active': stat.is_active})

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Accepts:
        - [{'id': 1, 'display_order': 0}, ...]
        - {'items': [{'id': 1, 'display_order': 0}, ...]}
        - {'order': [1, 2, 3]}
        - [1, 2, 3]
        """
        payload = request.data
        if isinstance(payload, dict):
            if 'items' in payload and isinstance(payload['items'], list):
                items = payload['items']
            elif 'order' in payload and isinstance(payload['order'], list):
                items = [{'id': stat_id, 'display_order': idx} for idx, stat_id in enumerate(payload['order'])]
            else:
                return Response({'error': 'Invalid format. Expected list or object with items/order'}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(payload, list):
            if payload and isinstance(payload[0], (int, str)):
                items = [{'id': stat_id, 'display_order': idx} for idx, stat_id in enumerate(payload)]
            else:
                items = payload
        else:
            return Response({'error': 'Expected a list or dict of statistic items'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for item in items:
            if isinstance(item, dict):
                stat_id = item.get('id')
                order = item.get('display_order')
                if stat_id is not None and order is not None:
                    HomepageStatistic.objects.filter(id=stat_id).update(display_order=order)
                    updated_count += 1

        AdminCacheService.invalidate_homepage_statistics()
        return Response({'success': True, 'updated': updated_count})

    @action(detail=False, methods=['get'], url_path='automatic-metrics')
    def automatic_metrics(self, request):
        """Returns the list of verified automatic metrics, their live values, descriptions, and criteria."""
        now = timezone.now()
        metrics = [
            {
                'key': 'enrolled_students',
                'name': 'Total Enrolled Students',
                'description': 'Distinct active student enrollments across all published courses',
                'current_value': HomepageStatistic.calculate_automatic_metric('enrolled_students'),
                'evaluated_at': now,
            },
            {
                'key': 'active_students',
                'name': 'Active Students',
                'description': 'Registered student accounts with active status (is_active=True)',
                'current_value': HomepageStatistic.calculate_automatic_metric('active_students'),
                'evaluated_at': now,
            },
            {
                'key': 'registered_students',
                'name': 'Total Registered Students',
                'description': 'All registered student user accounts',
                'current_value': HomepageStatistic.calculate_automatic_metric('registered_students'),
                'evaluated_at': now,
            },
            {
                'key': 'published_questions',
                'name': 'Published Exam Questions',
                'description': 'Verified and approved exam questions (status="approved")',
                'current_value': HomepageStatistic.calculate_automatic_metric('published_questions'),
                'evaluated_at': now,
            },
            {
                'key': 'published_practice_sets',
                'name': 'Published Practice Sets',
                'description': 'Question sets published for practice (status="published")',
                'current_value': HomepageStatistic.calculate_automatic_metric('published_practice_sets'),
                'evaluated_at': now,
            },
            {
                'key': 'published_exams',
                'name': 'Published Mock Examinations',
                'description': 'Live computer-based examinations (status="published")',
                'current_value': HomepageStatistic.calculate_automatic_metric('published_exams'),
                'evaluated_at': now,
            },
            {
                'key': 'total_reviews',
                'name': 'Student Reviews Count',
                'description': 'Approved and published student testimonials',
                'current_value': HomepageStatistic.calculate_automatic_metric('total_reviews'),
                'evaluated_at': now,
            },
            {
                'key': 'average_rating',
                'name': 'Student Rating',
                'description': 'Average star rating computed across published student reviews',
                'current_value': HomepageStatistic.calculate_automatic_metric('average_rating'),
                'evaluated_at': now,
            },
        ]
        return Response(metrics)
