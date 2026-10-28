"""
LoksewaAI PDF Branding & Watermark Engine

Provides centralized, production-grade PDF watermarking and branding with:
- PyMuPDF (fitz) + Pillow engine
- Preserved original copy tracking (preventing repeated/duplicate watermarking)
- Transparent logo overlays with proportional scaling
- Configurable text and image watermarks (opacity, rotation, placement, color)
- Support for portrait, landscape, and mixed page orientations
- Safe atomic file replacement with pre-save validation
- Detailed inventory, preview, and bounded batch processing
"""

import io
import os
import math
import hashlib
import logging
from typing import Optional, Tuple, Dict, Any, List

from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image

logger = logging.getLogger(__name__)

# Security & sanity limits
MAX_PDF_PAGES = 1000
MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.webp')


class PdfBrandingError(Exception):
    """Base exception for PDF branding operations."""
    pass


class MalformedPdfError(PdfBrandingError):
    """Raised when the source file is not a valid readable PDF."""
    pass


class EncryptedPdfError(PdfBrandingError):
    """Raised when attempting to brand an encrypted or password-protected PDF."""
    pass


class SignedPdfError(PdfBrandingError):
    """Raised when attempting to brand a digitally signed PDF (which would invalidate the signature)."""
    pass


class PdfLimitError(PdfBrandingError):
    """Raised when PDF exceeds safe page count or file size limits."""
    pass


def hex_to_rgb(hex_code: str) -> Tuple[float, float, float]:
    """Convert a hex color code (e.g. '#0B2545') to normalized float RGB (0.0 - 1.0)."""
    hex_code = (hex_code or '#0B2545').strip().lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join([c * 2 for c in hex_code])
    if len(hex_code) != 6:
        hex_code = '0B2545'
    try:
        r = int(hex_code[0:2], 16) / 255.0
        g = int(hex_code[2:4], 16) / 255.0
        b = int(hex_code[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return (0.043, 0.145, 0.27)  # default Loksewa navy blue


class PdfBrandingService:
    """Core service for applying branding to PDFs, managing records, and executing bulk jobs."""

    @staticmethod
    def validate_source_pdf_bytes(pdf_bytes: bytes) -> int:
        """
        Validate source PDF bytes.
        Returns the verified page count or raises a specific PdfBrandingError.
        """
        import pymupdf

        if not pdf_bytes:
            raise MalformedPdfError("Source PDF is empty (0 bytes).")

        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise PdfLimitError(f"PDF exceeds maximum allowed size ({len(pdf_bytes) // (1024 * 1024)}MB > 50MB).")

        if not pdf_bytes.startswith(b'%PDF'):
            # Some PDFs have slight leading whitespace or BOM
            start = pdf_bytes[:1024].find(b'%PDF')
            if start == -1:
                raise MalformedPdfError("File lacks standard %PDF header signature.")

        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise MalformedPdfError(f"Unable to parse PDF: {str(e)}")

        try:
            if doc.is_encrypted:
                raise EncryptedPdfError("Encrypted or password-protected PDFs cannot be branded.")

            # Check for digital signatures / sigflags
            if getattr(doc, 'has_sigflags', False):
                sig_flags = doc.sigflags
                if sig_flags and sig_flags > 0:
                    raise SignedPdfError(
                        "This document has digital signatures. Modifying it would invalidate existing signatures."
                    )

            page_count = doc.page_count
            if page_count <= 0:
                raise MalformedPdfError("PDF contains 0 pages.")

            if page_count > MAX_PDF_PAGES:
                raise PdfLimitError(f"PDF exceeds page limit ({page_count} pages > {MAX_PDF_PAGES}).")

            return page_count
        finally:
            doc.close()

    @classmethod
    def apply_branding_to_pdf_bytes(
        cls,
        pdf_bytes: bytes,
        settings: Optional[Any] = None,
    ) -> bytes:
        """
        Apply configured logo and watermark to PDF bytes.
        Preserves page dimensions, orientations, and text content.
        Validates output before returning.
        """
        import pymupdf
        from .models import PdfBrandingSetting

        if settings is None:
            settings = PdfBrandingSetting.get_settings()

        # Validate input
        original_page_count = cls.validate_source_pdf_bytes(pdf_bytes)

        # Prepare logo bytes if enabled
        logo_bytes = None
        if settings.logo_enabled and settings.logo_file:
            try:
                logo_file = settings.logo_file
                logo_file.seek(0)
                raw_logo = logo_file.read()
                if raw_logo:
                    # Apply logo opacity if < 1.0 using Pillow
                    if settings.logo_opacity < 0.99:
                        im = Image.open(io.BytesIO(raw_logo)).convert("RGBA")
                        r, g, b, a = im.split()
                        a = a.point(lambda p: int(p * max(0.05, min(1.0, settings.logo_opacity))))
                        im.putalpha(a)
                        buf = io.BytesIO()
                        im.save(buf, format="PNG")
                        logo_bytes = buf.getvalue()
                    else:
                        logo_bytes = raw_logo
            except Exception as e:
                logger.warning(f"Could not read logo image: {e}")
                logo_bytes = None

        # Prepare watermark image bytes if enabled and watermark_type == 'image'
        watermark_img_bytes = None
        if settings.watermark_enabled and settings.watermark_type == 'image' and settings.watermark_image_file:
            try:
                wm_file = settings.watermark_image_file
                wm_file.seek(0)
                raw_wm = wm_file.read()
                if raw_wm:
                    im = Image.open(io.BytesIO(raw_wm)).convert("RGBA")
                    # Opacity
                    opacity = max(0.01, min(1.0, settings.watermark_opacity or 0.15))
                    r, g, b, a = im.split()
                    a = a.point(lambda p: int(p * opacity))
                    im.putalpha(a)
                    # Rotation
                    rot = settings.watermark_rotation or 0
                    if rot != 0:
                        im = im.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)
                    buf = io.BytesIO()
                    im.save(buf, format="PNG")
                    watermark_img_bytes = buf.getvalue()
            except Exception as e:
                logger.warning(f"Could not read watermark image: {e}")
                watermark_img_bytes = None

        # Text watermark styling
        wm_text = (settings.watermark_text or "LoksewaAI").strip()
        wm_color = hex_to_rgb(settings.watermark_color)
        wm_opacity = max(0.01, min(1.0, settings.watermark_opacity or 0.15))
        wm_rotation = settings.watermark_rotation or 45
        wm_size_map = {'small': 32, 'medium': 48, 'large': 64}
        wm_fontsize = wm_size_map.get(settings.watermark_size, 48)

        # Logo sizing
        logo_size_map = {
            'small': (80, 40),
            'medium': (130, 55),
            'large': (180, 75),
        }
        logo_max_w, logo_max_h = logo_size_map.get(settings.logo_size, (130, 55))
        logo_margin = max(10, min(100, settings.logo_margin or 24))

        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        try:
            for page in doc:
                rect = page.rect
                page_w = rect.width
                page_h = rect.height

                # 1. Overlay Watermark
                if settings.watermark_enabled:
                    if settings.watermark_type == 'image' and watermark_img_bytes:
                        # Center watermark image
                        wm_box_size = min(page_w, page_h) * 0.55
                        cx, cy = page_w / 2.0, page_h / 2.0
                        wm_rect = pymupdf.Rect(
                            cx - wm_box_size / 2.0,
                            cy - wm_box_size / 2.0,
                            cx + wm_box_size / 2.0,
                            cy + wm_box_size / 2.0,
                        )
                        page.insert_image(wm_rect, stream=watermark_img_bytes, keep_proportion=True, overlay=True)

                    elif settings.watermark_type == 'text' and wm_text:
                        placement = settings.watermark_placement or 'diagonal-center'
                        
                        # Calculate points to place watermark
                        if placement == 'tile':
                            points = [
                                pymupdf.Point(page_w * 0.25, page_h * 0.25),
                                pymupdf.Point(page_w * 0.50, page_h * 0.50),
                                pymupdf.Point(page_w * 0.75, page_h * 0.75),
                            ]
                        elif placement == 'top-center':
                            points = [pymupdf.Point(page_w * 0.50, page_h * 0.25)]
                        elif placement == 'bottom-center':
                            points = [pymupdf.Point(page_w * 0.50, page_h * 0.75)]
                        else:
                            # center or diagonal-center
                            points = [pymupdf.Point(page_w * 0.50, page_h * 0.50)]

                        angle = wm_rotation if placement in ('diagonal-center', 'tile') else 0

                        text_len = pymupdf.get_text_length(wm_text, fontname="helv", fontsize=wm_fontsize)
                        
                        for pt in points:
                            shape = page.new_shape()
                            origin = pymupdf.Point(pt.x - (text_len / 2.0), pt.y + (wm_fontsize * 0.35))
                            morph = (pt, pymupdf.Matrix(angle)) if angle != 0 else None
                            shape.insert_text(
                                origin,
                                wm_text,
                                fontsize=wm_fontsize,
                                fontname="helv",
                                color=wm_color,
                                morph=morph,
                                fill_opacity=wm_opacity,
                                stroke_opacity=wm_opacity,
                            )
                            shape.commit()

                # 2. Overlay Logo
                if settings.logo_enabled and logo_bytes:
                    placement = settings.logo_placement or 'top-right'
                    
                    if placement == 'top-left':
                        x0 = logo_margin
                        y0 = logo_margin
                    elif placement == 'top-center':
                        x0 = (page_w - logo_max_w) / 2.0
                        y0 = logo_margin
                    elif placement == 'bottom-left':
                        x0 = logo_margin
                        y0 = page_h - logo_margin - logo_max_h
                    elif placement == 'bottom-center':
                        x0 = (page_w - logo_max_w) / 2.0
                        y0 = page_h - logo_margin - logo_max_h
                    elif placement == 'bottom-right':
                        x0 = page_w - logo_margin - logo_max_w
                        y0 = page_h - logo_margin - logo_max_h
                    else:
                        # top-right (default)
                        x0 = page_w - logo_margin - logo_max_w
                        y0 = logo_margin

                    logo_rect = pymupdf.Rect(x0, y0, x0 + logo_max_w, y0 + logo_max_h)
                    page.insert_image(logo_rect, stream=logo_bytes, keep_proportion=True, overlay=True)

            # Metadata tagging
            config_hash = settings.compute_config_hash()
            tag_string = f"loksewa_branded:v{settings.version}:{config_hash}"
            meta = doc.metadata or {}
            existing_kw = meta.get('keywords') or ''
            if 'loksewa_branded' not in existing_kw:
                meta['keywords'] = f"{existing_kw} {tag_string}".strip()
            else:
                meta['keywords'] = tag_string
            doc.set_metadata(meta)

            output_bytes = doc.tobytes(garbage=3, deflate=True)
        finally:
            doc.close()

        # Validate resulting output
        verify_doc = pymupdf.open(stream=output_bytes, filetype="pdf")
        try:
            if verify_doc.page_count != original_page_count:
                raise MalformedPdfError(
                    f"Validation failed: page count changed after branding ({verify_doc.page_count} != {original_page_count})"
                )
        finally:
            verify_doc.close()

        return output_bytes

    @classmethod
    def get_or_create_record(cls, material) -> Any:
        """Retrieve or create the PdfBrandingRecord for a given StudyMaterial."""
        from .models import PdfBrandingRecord
        record, _ = PdfBrandingRecord.objects.get_or_create(
            material=material,
            defaults={
                'document_title': material.title,
                'document_category': material.content_category,
                'status': 'unbranded',
                'decision': 'default',
            }
        )
        if record.document_title != material.title or record.document_category != material.content_category:
            record.document_title = material.title
            record.document_category = material.content_category
            record.save(update_fields=['document_title', 'document_category'])
        return record

    @classmethod
    def process_material(
        cls,
        material,
        settings: Optional[Any] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Apply branding to a single StudyMaterial.
        - Preserves clean original copy in record.original_file.
        - If re-processing, generates output from the preserved original to prevent duplicate watermarks.
        - Performs atomic validation and replacement.
        """
        from .models import PdfBrandingSetting, PdfBrandingRecord

        if settings is None:
            settings = PdfBrandingSetting.get_settings()

        record = cls.get_or_create_record(material)

        # Check explicit admin opt-out unless force=True
        if record.decision == 'skip' and not force:
            return {
                'id': material.id,
                'title': material.title,
                'status': 'skipped',
                'reason': 'Explicitly marked to skip branding',
            }

        if not material.file:
            record.status = 'failed'
            record.error_message = 'No active file attached to material'
            record.save()
            return {
                'id': material.id,
                'title': material.title,
                'status': 'failed',
                'error': record.error_message,
            }

        # Check if eligible category unless force=True
        if not force and settings.eligible_categories:
            if material.content_category not in settings.eligible_categories:
                return {
                    'id': material.id,
                    'title': material.title,
                    'status': 'excluded',
                    'reason': f"Category '{material.content_category}' not in eligible categories policy",
                }

        # Determine source bytes:
        # If original_file exists, ALWAYS process from pristine original!
        source_bytes = None
        has_preserved_original = bool(record.original_file)

        try:
            if has_preserved_original:
                record.original_file.seek(0)
                source_bytes = record.original_file.read()
            else:
                material.file.seek(0)
                source_bytes = material.file.read()

                # Preserve clean original copy now before modifying
                orig_filename = f"orig_{material.id}_{os.path.basename(material.file.name)}"
                record.original_file.save(orig_filename, ContentFile(source_bytes), save=False)

            # Apply branding
            branded_bytes = cls.apply_branding_to_pdf_bytes(source_bytes, settings=settings)

            # Atomically replace active file
            active_filename = os.path.basename(material.file.name)
            material.file.save(active_filename, ContentFile(branded_bytes), save=True)

            # Update record
            record.status = 'branded'
            record.applied_version = settings.version
            record.applied_hash = settings.compute_config_hash()
            record.last_processed_at = timezone.now()
            record.error_message = ''
            record.file_size_bytes = len(branded_bytes)
            import pymupdf
            with pymupdf.open(stream=branded_bytes, filetype="pdf") as d:
                record.page_count = d.page_count

            record.save()

            return {
                'id': material.id,
                'title': material.title,
                'status': 'branded',
                'version': record.applied_version,
                'pages': record.page_count,
                'size': record.file_size_bytes,
            }

        except Exception as e:
            logger.exception(f"Failed to brand material {material.id}: {e}")
            record.status = 'failed'
            record.error_message = str(e)
            record.save()
            return {
                'id': material.id,
                'title': material.title,
                'status': 'failed',
                'error': str(e),
            }

    @classmethod
    def restore_original(cls, material) -> Dict[str, Any]:
        """
        Restore the unbranded pristine original for a document if one is preserved.
        """
        record = cls.get_or_create_record(material)
        if not record.original_file:
            return {
                'id': material.id,
                'success': False,
                'error': 'No original unbranded file is preserved for this document.',
            }

        try:
            record.original_file.seek(0)
            orig_bytes = record.original_file.read()
            active_filename = os.path.basename(material.file.name)
            material.file.save(active_filename, ContentFile(orig_bytes), save=True)

            record.status = 'unbranded'
            record.applied_version = 0
            record.applied_hash = ''
            record.error_message = ''
            record.last_processed_at = timezone.now()
            record.file_size_bytes = len(orig_bytes)
            record.save()

            return {
                'id': material.id,
                'success': True,
                'status': 'unbranded',
            }
        except Exception as e:
            return {
                'id': material.id,
                'success': False,
                'error': str(e),
            }

    @classmethod
    def get_inventory_summary(cls) -> Dict[str, Any]:
        """Summarize existing PDF documents and their branding status."""
        from notes.models import StudyMaterial
        from .models import PdfBrandingSetting, PdfBrandingRecord

        settings = PdfBrandingSetting.get_settings()
        current_version = settings.version

        qs = StudyMaterial.objects.filter(file__isnull=False).exclude(file='')

        total = qs.count()
        records = {r.material_id: r for r in PdfBrandingRecord.objects.filter(material__in=qs)}

        branded_count = 0
        unbranded_count = 0
        failed_count = 0
        excluded_count = 0
        outdated_count = 0

        for m in qs:
            rec = records.get(m.id)
            if not rec:
                unbranded_count += 1
            elif rec.status == 'branded':
                branded_count += 1
                if rec.applied_version < current_version:
                    outdated_count += 1
            elif rec.status == 'failed':
                failed_count += 1
            elif rec.status == 'excluded' or rec.decision == 'skip':
                excluded_count += 1
            else:
                unbranded_count += 1

        return {
            'total': total,
            'branded': branded_count,
            'unbranded': unbranded_count,
            'failed': failed_count,
            'excluded': excluded_count,
            'outdated': outdated_count,
            'current_version': current_version,
            'eligible_categories': settings.eligible_categories,
        }

    @classmethod
    def preview_bulk_operation(
        cls,
        action: str = 'all_eligible',
        material_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Preview a planned bulk operation before confirmation.
        Returns affected count, item summary, and eligibility details.
        """
        from notes.models import StudyMaterial
        from .models import PdfBrandingSetting, PdfBrandingRecord

        settings = PdfBrandingSetting.get_settings()
        qs = StudyMaterial.objects.filter(file__isnull=False).exclude(file='').select_related('exam', 'subject')

        if material_ids:
            qs = qs.filter(id__in=material_ids)

        records_map = {r.material_id: r for r in PdfBrandingRecord.objects.filter(material__in=qs)}

        affected_items = []
        excluded_items = []

        for m in qs:
            rec = records_map.get(m.id)
            is_skip = rec and rec.decision == 'skip' and not material_ids
            is_cat_eligible = not settings.eligible_categories or m.content_category in settings.eligible_categories

            item_info = {
                'id': m.id,
                'title': m.title,
                'category': m.content_category,
                'exam': m.exam.name if m.exam else None,
                'current_status': rec.status if rec else 'unbranded',
                'applied_version': rec.applied_version if rec else 0,
            }

            if is_skip:
                excluded_items.append({**item_info, 'reason': 'Marked to skip branding'})
                continue

            if not is_cat_eligible and not material_ids:
                excluded_items.append({**item_info, 'reason': f"Category '{m.content_category}' not eligible"})
                continue

            if action == 'unbranded_only' and rec and rec.status == 'branded':
                excluded_items.append({**item_info, 'reason': 'Already branded'})
                continue

            if action == 'outdated_only' and (not rec or rec.status != 'branded' or rec.applied_version >= settings.version):
                excluded_items.append({**item_info, 'reason': 'Not outdated'})
                continue

            if action == 'failed_only' and (not rec or rec.status != 'failed'):
                excluded_items.append({**item_info, 'reason': 'Not in failed state'})
                continue

            affected_items.append(item_info)

        return {
            'action': action,
            'affected_count': len(affected_items),
            'excluded_count': len(excluded_items),
            'current_version': settings.version,
            'sample_affected': affected_items[:25],
            'sample_excluded': excluded_items[:10],
        }

    @classmethod
    def execute_batch_job(
        cls,
        job_id: int,
        batch_size: int = 25,
    ) -> Any:
        """
        Execute a PdfBrandingBatchJob in bounded batches.
        Designed to be run by Celery task OR synchronously in tests/management commands.
        """
        from notes.models import StudyMaterial
        from .models import PdfBrandingBatchJob, PdfBrandingSetting

        try:
            job = PdfBrandingBatchJob.objects.get(id=job_id)
        except PdfBrandingBatchJob.DoesNotExist:
            logger.error(f"PdfBrandingBatchJob #{job_id} does not exist.")
            return None

        settings = PdfBrandingSetting.get_settings()
        job.status = 'in_progress'
        job.started_at = timezone.now()
        job.applied_version = settings.version
        job.save(update_fields=['status', 'started_at', 'applied_version'])

        target_ids = job.file_ids or []
        if not target_ids:
            # Query all eligible materials
            qs = StudyMaterial.objects.filter(file__isnull=False).exclude(file='')
            target_ids = list(qs.values_list('id', flat=True))
            job.total_files = len(target_ids)
            job.file_ids = target_ids
            job.save(update_fields=['total_files', 'file_ids'])

        results = []
        processed_count = 0
        success_count = 0
        failed_count = 0
        skipped_count = 0

        # Process in bounded chunks
        for i in range(0, len(target_ids), batch_size):
            chunk = target_ids[i:i + batch_size]
            materials = list(StudyMaterial.objects.filter(id__in=chunk))
            material_map = {m.id: m for m in materials}

            for mid in chunk:
                mat = material_map.get(mid)
                if not mat:
                    skipped_count += 1
                    processed_count += 1
                    results.append({'id': mid, 'status': 'skipped', 'reason': 'Material record not found'})
                    continue

                outcome = cls.process_material(mat, settings=settings, force=(job.operation == 'reprocess_all'))
                processed_count += 1

                if outcome.get('status') == 'branded':
                    success_count += 1
                elif outcome.get('status') == 'failed':
                    failed_count += 1
                else:
                    skipped_count += 1

                results.append(outcome)

            # Persist checkpoint after each batch
            job.processed_count = processed_count
            job.success_count = success_count
            job.failed_count = failed_count
            job.skipped_count = skipped_count
            job.results = results
            job.save(update_fields=['processed_count', 'success_count', 'failed_count', 'skipped_count', 'results'])

        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'completed_at'])

        # Create audit log
        from .models import AuditLog
        try:
            AuditLog.objects.create(
                actor=job.created_by,
                action='EXECUTE_PDF_BRANDING_JOB',
                entity_type='PdfBrandingBatchJob',
                entity_id=str(job.id),
                details={
                    'operation': job.operation,
                    'total': job.total_files,
                    'success': job.success_count,
                    'failed': job.failed_count,
                    'skipped': job.skipped_count,
                    'version': job.applied_version,
                }
            )
        except Exception:
            pass

        return job
