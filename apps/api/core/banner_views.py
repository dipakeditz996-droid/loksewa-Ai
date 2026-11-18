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

def _ensure_banner_table():
    try:
        from django.core.management import call_command
        call_command('migrate', 'core', interactive=False)
    except Exception as e:
        logger.warning(f"Auto-migration for core banner failed: {e}")

class PublicHomepageBannerView(APIView):
    """GET /api/public/banners/ - Returns active homepage banners in display order."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = cache.get(CACHE_KEY_PUBLIC_BANNERS)
        if cached is not None:
            return Response(cached)

        try:
            banners = HomepageBanner.objects.filter(is_active=True).order_by('display_order', '-created_at')
            serializer = PublicHomepageBannerSerializer(banners, many=True, context={'request': request})
            data = serializer.data
            cache.set(CACHE_KEY_PUBLIC_BANNERS, data, timeout=300)
            return Response(data)
        except Exception as e:
            _ensure_banner_table()
            try:
                banners = HomepageBanner.objects.filter(is_active=True).order_by('display_order', '-created_at')
                serializer = PublicHomepageBannerSerializer(banners, many=True, context={'request': request})
                return Response(serializer.data)
            except Exception:
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
        except Exception:
            _ensure_banner_table()
            try:
                return super().list(request, *args, **kwargs)
            except Exception:
                return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception:
            _ensure_banner_table()
            return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
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
        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
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
        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
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
        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
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

        cache.delete(CACHE_KEY_PUBLIC_BANNERS)
        return Response({'success': True, 'updated': updated_count})
