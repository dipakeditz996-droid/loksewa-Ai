import os
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .permissions import IsAdminUser
from django.core.paginator import Paginator
from django.utils import timezone
from PIL import Image

from .models import (
    PdfBrandingSetting,
    PdfBrandingRecord,
    PdfBrandingBatchJob,
    AuditLog,
)
from .pdf_branding_serializers import (
    PdfBrandingSettingSerializer,
    PdfBrandingRecordSerializer,
    PdfBrandingBatchJobSerializer,
)
from .pdf_branding_service import (
    PdfBrandingService,
    PdfBrandingError,
    ALLOWED_IMAGE_EXTENSIONS,
)
from notes.models import StudyMaterial

logger = logging.getLogger(__name__)


class AdminPdfBrandingSettingsView(APIView):
    """Manage global PDF branding and watermark configuration."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings = PdfBrandingSetting.get_settings()
        summary = PdfBrandingService.get_inventory_summary()
        serializer = PdfBrandingSettingSerializer(settings, context={'request': request})
        return Response({
            'settings': serializer.data,
            'summary': summary,
        })

    def put(self, request):
        settings = PdfBrandingSetting.get_settings()
        serializer = PdfBrandingSettingSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            instance = serializer.save(updated_by=request.user)
            AuditLog.objects.create(
                actor=request.user,
                action='UPDATE_PDF_BRANDING_SETTINGS',
                entity_type='PdfBrandingSetting',
                entity_id=str(instance.id),
                details={
                    'version': instance.version,
                    'logo_enabled': instance.logo_enabled,
                    'watermark_enabled': instance.watermark_enabled,
                    'watermark_text': instance.watermark_text,
                }
            )
            return Response({
                'message': 'PDF branding settings updated successfully.',
                'settings': PdfBrandingSettingSerializer(instance, context={'request': request}).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        return self.put(request)


class AdminPdfBrandingLogoUploadView(APIView):
    """Upload, replace, or remove the central branding logo image."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        file_obj = request.FILES.get('logo') or request.FILES.get('logo_file') or request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No image file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 5MB)
        if file_obj.size > 5 * 1024 * 1024:
            return Response({'error': 'Logo file must be smaller than 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file extension
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return Response(
                {'error': f"Unsupported image format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate image integrity via Pillow
        try:
            im = Image.open(file_obj)
            im.verify()
            file_obj.seek(0)
        except Exception:
            return Response({'error': 'Uploaded file is not a valid readable image.'}, status=status.HTTP_400_BAD_REQUEST)

        settings = PdfBrandingSetting.get_settings()
        if settings.logo_file:
            try:
                settings.logo_file.delete(save=False)
            except Exception:
                pass

        settings.logo_file = file_obj
        settings.updated_by = request.user
        settings.save()

        AuditLog.objects.create(
            actor=request.user,
            action='UPLOAD_PDF_BRANDING_LOGO',
            entity_type='PdfBrandingSetting',
            entity_id=str(settings.id),
            details={'filename': file_obj.name, 'size': file_obj.size}
        )

        return Response({
            'message': 'Branding logo uploaded successfully.',
            'settings': PdfBrandingSettingSerializer(settings, context={'request': request}).data,
        })

    def delete(self, request):
        settings = PdfBrandingSetting.get_settings()
        if settings.logo_file:
            try:
                settings.logo_file.delete(save=False)
            except Exception:
                pass
            settings.logo_file = None
            settings.updated_by = request.user
            settings.save()

            AuditLog.objects.create(
                actor=request.user,
                action='REMOVE_PDF_BRANDING_LOGO',
                entity_type='PdfBrandingSetting',
                entity_id=str(settings.id),
                details={}
            )

        return Response({
            'message': 'Branding logo removed successfully.',
            'settings': PdfBrandingSettingSerializer(settings, context={'request': request}).data,
        })


class AdminPdfBrandingWatermarkImageUploadView(APIView):
    """Upload, replace, or remove the optional watermark image."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        file_obj = request.FILES.get('watermark_image') or request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No watermark image file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > 5 * 1024 * 1024:
            return Response({'error': 'Watermark image must be smaller than 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return Response(
                {'error': f"Unsupported image format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            im = Image.open(file_obj)
            im.verify()
            file_obj.seek(0)
        except Exception:
            return Response({'error': 'Uploaded file is not a valid readable image.'}, status=status.HTTP_400_BAD_REQUEST)

        settings = PdfBrandingSetting.get_settings()
        if settings.watermark_image_file:
            try:
                settings.watermark_image_file.delete(save=False)
            except Exception:
                pass

        settings.watermark_image_file = file_obj
        settings.watermark_type = 'image'
        settings.updated_by = request.user
        settings.save()

        return Response({
            'message': 'Watermark image uploaded successfully.',
            'settings': PdfBrandingSettingSerializer(settings, context={'request': request}).data,
        })

    def delete(self, request):
        settings = PdfBrandingSetting.get_settings()
        if settings.watermark_image_file:
            try:
                settings.watermark_image_file.delete(save=False)
            except Exception:
                pass
            settings.watermark_image_file = None
            settings.watermark_type = 'text'
            settings.updated_by = request.user
            settings.save()

        return Response({
            'message': 'Watermark image removed successfully.',
            'settings': PdfBrandingSettingSerializer(settings, context={'request': request}).data,
        })


class AdminPdfBrandingDocumentsView(APIView):
    """List existing PDF inventory with pagination, search, and status filters."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status')
        category_filter = request.query_params.get('category')
        search = (request.query_params.get('search') or '').strip()
        page = int(request.query_params.get('page') or 1)
        page_size = min(int(request.query_params.get('page_size') or 20), 100)

        # Retrieve study materials with attached files
        materials_qs = StudyMaterial.objects.filter(
            file__isnull=False
        ).exclude(file='').select_related('exam', 'subject', 'chapter', 'topic')

        if category_filter:
            materials_qs = materials_qs.filter(content_category=category_filter)

        if search:
            materials_qs = materials_qs.filter(title__icontains=search)

        # Ensure branding records exist for these materials
        materials_list = list(materials_qs)
        existing_records = {r.material_id: r for r in PdfBrandingRecord.objects.filter(material__in=materials_list)}
        
        to_create = []
        for m in materials_list:
            if m.id not in existing_records:
                to_create.append(PdfBrandingRecord(
                    material=m,
                    document_title=m.title,
                    document_category=m.content_category,
                    status='unbranded',
                    decision='default',
                ))
        if to_create:
            PdfBrandingRecord.objects.bulk_create(to_create, ignore_conflicts=True)

        # Query records
        records_qs = PdfBrandingRecord.objects.filter(
            material__in=materials_qs
        ).select_related('material', 'material__exam', 'material__subject').order_by('-updated_at')

        if status_filter:
            if status_filter == 'outdated':
                current_ver = PdfBrandingSetting.get_settings().version
                records_qs = records_qs.filter(status='branded', applied_version__lt=current_ver)
            else:
                records_qs = records_qs.filter(status=status_filter)

        paginator = Paginator(records_qs, page_size)
        paginated_records = paginator.get_page(page)

        current_ver = PdfBrandingSetting.get_settings().version
        serializer = PdfBrandingRecordSerializer(
            paginated_records,
            many=True,
            context={'request': request, 'current_version': current_ver}
        )

        return Response({
            'count': paginator.count,
            'totalPages': paginator.num_pages,
            'currentPage': page,
            'pageSize': page_size,
            'results': serializer.data,
            'summary': PdfBrandingService.get_inventory_summary(),
        })


class AdminPdfBrandingDocumentDetailView(APIView):
    """Manage single document branding, reprocess from clean original, or restore original."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            material = StudyMaterial.objects.select_related('exam', 'subject').get(pk=pk)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Study material not found.'}, status=status.HTTP_404_NOT_FOUND)

        record = PdfBrandingService.get_or_create_record(material)
        serializer = PdfBrandingRecordSerializer(record, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        action = (request.data.get('action') or '').strip().lower()
        try:
            material = StudyMaterial.objects.select_related('exam', 'subject').get(pk=pk)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Study material not found.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'apply':
            result = PdfBrandingService.process_material(material, force=True)
            if result.get('status') == 'failed':
                return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
            record = PdfBrandingService.get_or_create_record(material)
            return Response({
                'message': 'Branding applied successfully.',
                'record': PdfBrandingRecordSerializer(record, context={'request': request}).data,
            })

        elif action == 'restore':
            result = PdfBrandingService.restore_original(material)
            if not result.get('success'):
                return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
            record = PdfBrandingService.get_or_create_record(material)
            return Response({
                'message': 'Pristine original restored successfully.',
                'record': PdfBrandingRecordSerializer(record, context={'request': request}).data,
            })

        elif action == 'reprocess':
            # Reprocess from original with latest config
            result = PdfBrandingService.process_material(material, force=True)
            if result.get('status') == 'failed':
                return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
            record = PdfBrandingService.get_or_create_record(material)
            return Response({
                'message': 'Document reprocessed with latest branding configuration.',
                'record': PdfBrandingRecordSerializer(record, context={'request': request}).data,
            })

        return Response({'error': f"Unknown action: '{action}'"}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        try:
            material = StudyMaterial.objects.get(pk=pk)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Study material not found.'}, status=status.HTTP_404_NOT_FOUND)

        record = PdfBrandingService.get_or_create_record(material)
        decision = request.data.get('decision')
        if decision:
            if decision not in ('default', 'apply', 'skip'):
                return Response({'error': "decision must be 'default', 'apply', or 'skip'"}, status=status.HTTP_400_BAD_REQUEST)
            record.decision = decision
            if decision == 'skip':
                record.status = 'excluded'
            record.save()

        return Response({
            'message': 'Branding preference updated.',
            'record': PdfBrandingRecordSerializer(record, context={'request': request}).data,
        })


class AdminPdfBrandingBulkPreviewView(APIView):
    """Preview a planned bulk branding operation and show affected counts."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        action = request.data.get('action') or 'all_eligible'
        material_ids = request.data.get('material_ids') or []
        preview = PdfBrandingService.preview_bulk_operation(action=action, material_ids=material_ids)
        return Response(preview)


class AdminPdfBrandingBulkApplyView(APIView):
    """Trigger an authorized bulk branding batch operation."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        action = request.data.get('action') or 'all_eligible'
        material_ids = request.data.get('material_ids') or []
        confirmed = request.data.get('confirmed', False)

        if not confirmed:
            return Response(
                {'error': 'Explicit confirmation is required before starting a bulk branding operation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        preview = PdfBrandingService.preview_bulk_operation(action=action, material_ids=material_ids)
        affected_count = preview['affected_count']
        if affected_count == 0:
            return Response({'error': 'No eligible PDFs found for the selected criteria.'}, status=status.HTTP_400_BAD_REQUEST)

        target_ids = [item['id'] for item in preview['sample_affected']]
        if material_ids:
            target_ids = material_ids
        else:
            # Query all affected IDs
            from notes.models import StudyMaterial
            settings = PdfBrandingSetting.get_settings()
            qs = StudyMaterial.objects.filter(file__isnull=False).exclude(file='')
            if settings.eligible_categories:
                qs = qs.filter(content_category__in=settings.eligible_categories)
            records_map = {r.material_id: r for r in PdfBrandingRecord.objects.filter(material__in=qs)}
            final_ids = []
            for m in qs:
                rec = records_map.get(m.id)
                if rec and rec.decision == 'skip':
                    continue
                if action == 'unbranded_only' and rec and rec.status == 'branded':
                    continue
                if action == 'outdated_only' and (not rec or rec.status != 'branded' or rec.applied_version >= settings.version):
                    continue
                if action == 'failed_only' and (not rec or rec.status != 'failed'):
                    continue
                final_ids.append(m.id)
            target_ids = final_ids

        job = PdfBrandingBatchJob.objects.create(
            status='pending',
            operation=action,
            total_files=len(target_ids),
            file_ids=target_ids,
            created_by=request.user,
        )

        # Execute in background via Celery if explicitly requested and available;
        # otherwise run safe bounded batch processing immediately.
        run_async = request.data.get('async', False)
        dispatched_async = False
        if run_async:
            try:
                from .tasks import run_pdf_branding_batch_job_task
                run_pdf_branding_batch_job_task.delay(job.id)
                dispatched_async = True
            except Exception as e:
                logger.warning(f"Could not dispatch via Celery: {e}. Falling back to bounded execution.")

        if not dispatched_async:
            PdfBrandingService.execute_batch_job(job.id, batch_size=25)
            job.refresh_from_db()

        return Response({
            'message': 'Bulk branding job started successfully.',
            'job': PdfBrandingBatchJobSerializer(job).data,
            'is_async': dispatched_async,
        }, status=status.HTTP_202_ACCEPTED if dispatched_async else status.HTTP_200_OK)


class AdminPdfBrandingJobDetailView(APIView):
    """Check progress or retry failures for a bulk batch job."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            job = PdfBrandingBatchJob.objects.get(pk=pk)
        except PdfBrandingBatchJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(PdfBrandingBatchJobSerializer(job).data)

    def post(self, request, pk):
        # Retry failed items
        try:
            job = PdfBrandingBatchJob.objects.get(pk=pk)
        except PdfBrandingBatchJob.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        failed_ids = [r['id'] for r in (job.results or []) if r.get('status') == 'failed']
        if not failed_ids:
            return Response({'error': 'No failed items to retry in this job.'}, status=status.HTTP_400_BAD_REQUEST)

        retry_job = PdfBrandingBatchJob.objects.create(
            status='pending',
            operation='retry_failed',
            total_files=len(failed_ids),
            file_ids=failed_ids,
            created_by=request.user,
        )

        PdfBrandingService.execute_batch_job(retry_job.id, batch_size=25)
        retry_job.refresh_from_db()

        return Response({
            'message': f"Retried {len(failed_ids)} failed files.",
            'job': PdfBrandingBatchJobSerializer(retry_job).data,
        })


class AdminPdfBrandingJobsListView(APIView):
    """List recent bulk branding jobs."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        jobs = PdfBrandingBatchJob.objects.all().order_by('-created_at')[:20]
        return Response(PdfBrandingBatchJobSerializer(jobs, many=True).data)
