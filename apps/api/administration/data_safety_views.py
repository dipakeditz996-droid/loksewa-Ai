import os
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError

from administration.models import TrashItem, DatabaseBackup, AuditLog
from administration.permissions import IsAdminUser, IsSuperAdminUser
from administration.safe_delete_service import SafeDeleteService
from administration.backup_service import BackupService
from administration.data_safety_serializers import (
    TrashItemSerializer, DatabaseBackupSerializer
)


class DataSafetyPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminDataSafetyOverviewView(APIView):
    """
    Returns high-level data safety metrics and system health indicators.
    All numbers are real and calculated directly from database records.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.conf import settings
        from django.db.models import Count, Q
        from administration.r2_storage_service import R2StorageService

        use_cache = not getattr(settings, 'TESTING', False)
        if use_cache:
            from django.core.cache import cache
            from administration.cache_service import CACHE_KEY_DATA_SAFETY_OVERVIEW
            cached = cache.get(CACHE_KEY_DATA_SAFETY_OVERVIEW)
            if cached is not None:
                return Response(cached, status=status.HTTP_200_OK)

        now = timezone.now()
        one_day_ago = now - timezone.timedelta(hours=24)
        seven_days_ago = now - timezone.timedelta(days=7)

        # Storage & settings info
        r2_configured = R2StorageService.is_configured()
        storage_backend = 'Cloudflare R2' if r2_configured else 'Local Filesystem'
        retention_days = getattr(settings, 'BACKUP_RETENTION_DAYS', 30)

        # Backups metrics - combined into 1 aggregated query
        b_stats = DatabaseBackup.objects.aggregate(
            total=Count('id'),
            verified=Count('id', filter=Q(status='verified')),
            r2_verified=Count('id', filter=Q(r2_verified=True)),
            failed=Count('id', filter=Q(status__in=['failed', 'corrupted'])),
            expired=Count('id', filter=Q(status='expired')),
            protected=Count('id', filter=Q(is_protected=True)),
        )
        total_backups_count = b_stats['total']
        verified_backups_count = b_stats['verified']
        r2_verified_count = b_stats['r2_verified']
        failed_backups_count = b_stats['failed']
        expired_backups_count = b_stats['expired']
        protected_backups_count = b_stats['protected']

        last_backup = DatabaseBackup.objects.filter(status='verified').first()
        latest_any_backup = DatabaseBackup.objects.first()

        safety_warnings = []
        if not r2_configured:
            safety_warnings.append("Cloudflare R2 off-site storage is not configured. Backups are stored locally only.")

        if not last_backup:
            safety_warnings.append("No verified database backups exist on this platform.")
            backup_status = "warning" if latest_any_backup else "failed"
        elif last_backup.created_at < one_day_ago:
            safety_warnings.append("Last verified database backup is more than 24 hours old.")
            backup_status = "warning"
        elif latest_any_backup and latest_any_backup.status in ('failed', 'corrupted'):
            safety_warnings.append(f"Most recent backup attempt failed: {latest_any_backup.verification_message}")
            backup_status = "warning"
        else:
            backup_status = "healthy"

        # Trash metrics - combined into 1 aggregated query
        t_stats = TrashItem.objects.filter(is_restored=False, is_permanent_deleted=False).aggregate(
            total=Count('id'),
            protected=Count('id', filter=Q(is_protected=True)),
        )
        trash_items_count = t_stats['total']
        protected_records_count = t_stats['protected']

        recently_restored_count = TrashItem.objects.filter(
            is_restored=True, restored_at__gte=seven_days_ago
        ).count()

        # Last permanent delete audit log
        last_perm_log = AuditLog.objects.filter(action='PERMANENT_DELETE').select_related('actor').order_by('-timestamp').first()
        last_permanent_delete = None
        if last_perm_log:
            last_permanent_delete = {
                'title': last_perm_log.details.get('title', 'Unknown item'),
                'item_type': last_perm_log.details.get('item_type', last_perm_log.entity_type),
                'deleted_by': last_perm_log.actor.get_full_name() or last_perm_log.actor.username if last_perm_log.actor else 'Admin',
                'timestamp': last_perm_log.timestamp.isoformat(),
            }

        last_backup_data = None
        if last_backup:
            last_backup_data = DatabaseBackupSerializer(last_backup).data

        payload = {
            'backup_status': backup_status,
            'last_backup': last_backup_data,
            'r2_configured': r2_configured,
            'storage_backend': storage_backend,
            'retention_days': retention_days,
            'verified_backups_count': verified_backups_count,
            'r2_verified_count': r2_verified_count,
            'failed_backups_count': failed_backups_count,
            'expired_backups_count': expired_backups_count,
            'protected_backups_count': protected_backups_count,
            'total_backups_count': total_backups_count,
            'trash_items_count': trash_items_count,
            'protected_records_count': protected_records_count,
            'recently_restored_count': recently_restored_count,
            'last_permanent_delete': last_permanent_delete,
            'safety_warnings': safety_warnings,
        }

        if use_cache:
            from django.core.cache import cache
            from administration.cache_service import CACHE_KEY_DATA_SAFETY_OVERVIEW
            cache.set(CACHE_KEY_DATA_SAFETY_OVERVIEW, payload, 120)

        return Response(payload, status=status.HTTP_200_OK)


class AdminTrashViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Manages soft-deleted records in the Trash / Recycle Bin.
    Supports single or bulk restoration, dependency analysis,
    and highly-protected permanent deletion.
    """
    queryset = TrashItem.objects.filter(is_restored=False, is_permanent_deleted=False).select_related(
        'deleted_by', 'restored_by', 'permanent_deleted_by'
    ).order_by('-deleted_at')
    serializer_class = TrashItemSerializer
    permission_classes = [IsAdminUser]
    pagination_class = DataSafetyPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'reason', 'object_id', 'item_type']
    filterset_fields = ['module', 'item_type', 'is_protected', 'app_label', 'model_name']
    ordering_fields = ['deleted_at', 'title', 'module']

    @action(detail=True, methods=['post'], url_path='restore')
    def restore_item(self, request, pk=None):
        trash_item = self.get_object()
        restore_parents = bool(request.data.get('restore_parents', False))

        try:
            result = SafeDeleteService.restore(
                trash_item=trash_item,
                user=request.user,
                restore_parents=restore_parents,
            )
            if not result.get('success') and result.get('needs_parent_restoration'):
                return Response(result, status=status.HTTP_409_CONFLICT)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Failed to restore record: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        trash_item = self.get_object()
        confirmation = str(request.data.get('confirmation', '')).strip()

        try:
            result = SafeDeleteService.permanent_delete(
                trash_item=trash_item,
                user=request.user,
                confirmation_text=confirmation,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Failed to permanently delete: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-restore')
    def bulk_restore(self, request):
        ids = request.data.get('ids', [])
        if not ids or not isinstance(ids, list):
            return Response({'error': 'A list of trash item IDs is required.'}, status=status.HTTP_400_BAD_REQUEST)

        restore_parents = bool(request.data.get('restore_parents', False))
        items = TrashItem.objects.filter(id__in=ids, is_restored=False, is_permanent_deleted=False)

        restored_count = 0
        failed_items = []

        for item in items:
            try:
                res = SafeDeleteService.restore(item, request.user, restore_parents=restore_parents)
                if res.get('success'):
                    restored_count += 1
                else:
                    failed_items.append({'id': item.id, 'title': item.title, 'reason': res.get('message')})
            except Exception as e:
                failed_items.append({'id': item.id, 'title': item.title, 'reason': str(e)})

        return Response({
            'restored_count': restored_count,
            'failed_count': len(failed_items),
            'failed_items': failed_items,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='empty-trash')
    def empty_trash(self, request):
        """
        Permanently empties all recoverable records from the Recycle Bin.
        Shielded items (with live student attempts, orders, or active dependencies)
        are safely preserved.
        """
        try:
            result = SafeDeleteService.empty_trash(user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f"Failed to empty recycle bin: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get', 'post'], url_path='retention')
    def retention_policy(self, request):
        """
        GET: Returns current auto-empty retention timeline days.
        POST: Updates retention timeline days (e.g. 7, 14, 30, 60, 90, 0=Never)
              and immediately triggers auto-cleanup if days > 0.
        """
        if request.method == 'GET':
            retention_days = SafeDeleteService.get_trash_retention_days()
            return Response({'retention_days': retention_days}, status=status.HTTP_200_OK)

        days = request.data.get('days')
        if days is None:
            return Response({'error': 'Parameter "days" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            days = int(days)
            if days < 0 or days > 365:
                return Response({'error': 'Retention days must be between 0 and 365 (0 = Never / Manual).'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid number of days specified.'}, status=status.HTTP_400_BAD_REQUEST)

        res = SafeDeleteService.set_trash_retention_days(days, user=request.user)
        cleanup_res = None
        if days > 0:
            cleanup_res = SafeDeleteService.auto_clean_expired_trash(user=request.user)

        return Response({
            'success': True,
            'retention_days': days,
            'cleanup': cleanup_res,
            'message': f"Recycle bin auto-empty timeline set to {days} days." if days > 0 else "Recycle bin auto-empty disabled (Manual cleanup only)."
        }, status=status.HTTP_200_OK)


class AdminDatabaseBackupViewSet(viewsets.ModelViewSet):
    """
    CRUD and recovery actions for real database backups.
    """
    queryset = DatabaseBackup.objects.select_related('created_by').order_by('-created_at')
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAdminUser]
    pagination_class = DataSafetyPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'verification_message']
    filterset_fields = ['status', 'backup_type', 'storage_backend', 'is_protected', 'r2_verified']
    ordering_fields = ['created_at', 'size_bytes']

    def create(self, request, *args, **kwargs):
        name = request.data.get('name', '').strip()
        backup_type = request.data.get('backup_type', 'manual').strip()

        try:
            backup = BackupService.create_backup(
                backup_type=backup_type,
                user=request.user,
                custom_name=name,
            )
            serializer = self.get_serializer(backup)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Failed to generate backup: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        backup = self.get_object()
        try:
            res = BackupService.delete_backup(backup, user=request.user)
            return Response(res, status=status.HTTP_200_OK)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify_backup(self, request, pk=None):
        backup = self.get_object()
        is_valid = BackupService.verify_backup(backup, user=request.user)
        return Response({
            'verified': is_valid,
            'status': backup.status,
            'message': backup.verification_message,
            'verified_at': backup.verified_at.isoformat() if backup.verified_at else None,
            'r2_verified': backup.r2_verified,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='toggle-protect')
    def toggle_protect(self, request, pk=None):
        backup = self.get_object()
        try:
            res = BackupService.toggle_protect_backup(backup, user=request.user)
            serializer = self.get_serializer(backup)
            return Response({
                **res,
                'backup': serializer.data,
            }, status=status.HTTP_200_OK)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore_backup(self, request, pk=None):
        backup = self.get_object()
        confirmation = str(request.data.get('confirmation', '')).strip()

        try:
            result = BackupService.restore_backup(
                backup=backup,
                user=request.user,
                confirmation_text=confirmation,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Restore failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_permissions(self):
        if self.action == 'download_backup':
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=['get'], url_path='download')
    def download_backup(self, request, pk=None):
        from administration.r2_storage_service import R2StorageService
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model

        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                try:
                    validated_token = AccessToken(token)
                    User = get_user_model()
                    candidate = User.objects.get(id=validated_token['user_id'])
                    if candidate.is_active:
                        user = candidate
                except Exception:
                    pass

        if not user or not user.is_authenticated or user.role not in ('admin', 'super-admin'):
            return Response({'error': 'Admin authorization required to download database backups.'}, status=status.HTTP_403_FORBIDDEN)

        backup = self.get_object()
        if not os.path.exists(backup.file_path):
            if backup.storage_key and R2StorageService.is_configured():
                BackupService.ensure_backup_dir()
                download_success = R2StorageService.download_file(backup.storage_key, backup.file_path)
                if not download_success:
                    raise Http404("Backup archive could not be retrieved from Cloudflare R2.")
            else:
                raise Http404("Backup archive file not found.")

        filename = os.path.basename(backup.file_path)
        response = FileResponse(open(backup.file_path, 'rb'), content_type='application/gzip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AdminRecoveryStatusView(APIView):
    """
    Emergency recovery overview and snapshot inventory.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        pre_restore_snapshots = DatabaseBackup.objects.filter(backup_type='pre_restore').order_by('-created_at')[:10]
        recent_backups = DatabaseBackup.objects.filter(status='verified').order_by('-created_at')[:5]

        return Response({
            'storage_directory': str(BackupService.BACKUP_DIR),
            'pre_restore_snapshots': DatabaseBackupSerializer(pre_restore_snapshots, many=True).data,
            'recovery_points': DatabaseBackupSerializer(recent_backups, many=True).data,
            'trash_recoverable_items': TrashItem.objects.filter(is_restored=False, is_permanent_deleted=False).count(),
        }, status=status.HTTP_200_OK)
