from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.cache import cache
from django.db import OperationalError, ProgrammingError
import logging

logger = logging.getLogger(__name__)

from administration.permissions import IsAdminUser
from administration.models import AuditLog
from .models import HomepageBanner
from .banner_serializers import PublicHomepageBannerSerializer, AdminHomepageBannerSerializer

CACHE_KEY_PUBLIC_BANNERS = 'public:homepage_banners'

def invalidate_banner_cache():
    try:
        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
        cache.delete('public_homepage_banners')
    except Exception:
        pass

def _ensure_banner_table():
    """Ensure core_homepagebanner exists via direct raw SQL for PostgreSQL and SQLite."""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS core_homepagebanner (
                    id BIGSERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    subtitle VARCHAR(500) NOT NULL DEFAULT '',
                    badge_text VARCHAR(100) NOT NULL DEFAULT '',
                    cta_text VARCHAR(100) NOT NULL DEFAULT '',
                    cta_url VARCHAR(500) NOT NULL DEFAULT '',
                    cta_secondary_text VARCHAR(100) NOT NULL DEFAULT '',
                    cta_secondary_url VARCHAR(500) NOT NULL DEFAULT '',
                    image VARCHAR(100) NULL,
                    mobile_image VARCHAR(100) NULL,
                    image_fit VARCHAR(20) NOT NULL DEFAULT 'cover',
                    image_focal_x VARCHAR(20) NOT NULL DEFAULT 'center',
                    image_focal_y VARCHAR(20) NOT NULL DEFAULT 'center',
                    mobile_image_fit VARCHAR(20) NOT NULL DEFAULT 'cover',
                    mobile_image_focal_x VARCHAR(20) NOT NULL DEFAULT 'center',
                    mobile_image_focal_y VARCHAR(20) NOT NULL DEFAULT 'center',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_by_id BIGINT NULL REFERENCES core_user(id) ON DELETE SET NULL
                );
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS image_fit VARCHAR(20) NOT NULL DEFAULT 'cover';
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS image_focal_x VARCHAR(20) NOT NULL DEFAULT 'center';
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS image_focal_y VARCHAR(20) NOT NULL DEFAULT 'center';
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS mobile_image_fit VARCHAR(20) NOT NULL DEFAULT 'cover';
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS mobile_image_focal_x VARCHAR(20) NOT NULL DEFAULT 'center';
                ALTER TABLE core_homepagebanner ADD COLUMN IF NOT EXISTS mobile_image_focal_y VARCHAR(20) NOT NULL DEFAULT 'center';
            """)
    except Exception as e:
        logger.warning(f"Raw SQL table ensure for core_homepagebanner failed: {e}")
        try:
            from django.core.management import call_command
            call_command('migrate', 'core', interactive=False)
        except Exception as e2:
            logger.warning(f"Fallback migrate for core failed: {e2}")

class PublicHomepageBannerView(APIView):
    """GET /api/public/banners/ - Returns active homepage banners in display order."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            cached = cache.get(CACHE_KEY_PUBLIC_BANNERS)
            if cached is not None:
                return Response(cached)

            banners = list(HomepageBanner.objects.filter(is_active=True).order_by('display_order', '-created_at'))
            serializer = PublicHomepageBannerSerializer(banners, many=True, context={'request': request})
            data = serializer.data
            cache.set(CACHE_KEY_PUBLIC_BANNERS, data, timeout=300)
            return Response(data)
        except Exception as e:
            logger.warning(f"Error reading banners, self-healing table: {e}")
            try:
                from django.db import connection
                connection.close()
                _ensure_banner_table()
                banners = list(HomepageBanner.objects.filter(is_active=True).order_by('display_order', '-created_at'))
                serializer = PublicHomepageBannerSerializer(banners, many=True, context={'request': request})
                return Response(serializer.data)
            except Exception as inner_e:
                logger.error(f"Failed to return banners after self-healing: {inner_e}")
                return Response([])


class AdminHomepageBannerViewSet(viewsets.ModelViewSet):
    """Full CRUD and ordering controls for homepage banners in Admin Panel."""
    queryset = HomepageBanner.objects.select_related('created_by').all().order_by('display_order', '-created_at')
    serializer_class = AdminHomepageBannerSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'subtitle', 'badge_text', 'cta_text']

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.warning(f"Admin banner list error: {e}")
            try:
                from django.db import connection
                connection.close()
                _ensure_banner_table()
                return super().list(request, *args, **kwargs)
            except Exception:
                return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.warning(f"Admin banner create error: {e}")
            try:
                from django.db import connection
                connection.close()
                _ensure_banner_table()
                return super().create(request, *args, **kwargs)
            except Exception as e2:
                logger.error(f"Failed to create banner: {e2}")
                return Response({"detail": f"Failed to save banner: {e2}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        invalidate_banner_cache()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='CREATE_BANNER',
                entity_type='HomepageBanner',
                entity_id=str(instance.id),
                details={'title': instance.title, 'is_active': instance.is_active, 'order': instance.display_order},
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = serializer.save()
        invalidate_banner_cache()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='UPDATE_BANNER',
                entity_type='HomepageBanner',
                entity_id=str(instance.id),
                details={'title': instance.title, 'is_active': instance.is_active, 'order': instance.display_order},
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        instance_id = str(instance.id)
        details = {'title': instance.title, 'order': instance.display_order}
        instance.delete()
        invalidate_banner_cache()
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='DELETE_BANNER',
                entity_type='HomepageBanner',
                entity_id=instance_id,
                details=details,
            )
        except Exception:
            pass

    @action(detail=True, methods=['patch'], url_path='toggle')
    def toggle_active(self, request, pk=None):
        banner = self.get_object()
        banner.is_active = not banner.is_active
        banner.save(update_fields=['is_active', 'updated_at'])
        invalidate_banner_cache()
        return Response({'id': banner.id, 'is_active': banner.is_active})

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Supports multiple flexible payload formats:
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
                items = [{'id': banner_id, 'display_order': idx} for idx, banner_id in enumerate(payload['order'])]
            else:
                return Response({'error': 'Invalid format. Expected list or object with items/order'}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(payload, list):
            if payload and isinstance(payload[0], (int, str)):
                items = [{'id': banner_id, 'display_order': idx} for idx, banner_id in enumerate(payload)]
            else:
                items = payload
        else:
            return Response({'error': 'Expected a list or dict of banner items'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for item in items:
            if isinstance(item, dict):
                banner_id = item.get('id')
                order = item.get('display_order')
                if banner_id is not None and order is not None:
                    HomepageBanner.objects.filter(id=banner_id).update(display_order=order)
                    updated_count += 1

        invalidate_banner_cache()
        return Response({'success': True, 'updated': updated_count})
