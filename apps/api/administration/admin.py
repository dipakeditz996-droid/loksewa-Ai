from django.contrib import admin
from .models import (
    AuditLog, CSVImport, ExportJob, TrashItem, DatabaseBackup,
    PdfBrandingSetting, PdfBrandingRecord, PdfBrandingBatchJob,
)

@admin.register(PdfBrandingSetting)
class PdfBrandingSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'logo_enabled', 'watermark_enabled', 'watermark_text', 'version', 'updated_at')
    readonly_fields = ('version', 'updated_at')

@admin.register(PdfBrandingRecord)
class PdfBrandingRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'material', 'document_title', 'status', 'decision', 'applied_version', 'last_processed_at')
    list_filter = ('status', 'decision')
    search_fields = ('document_title', 'material__title')

@admin.register(PdfBrandingBatchJob)
class PdfBrandingBatchJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'operation', 'status', 'processed_count', 'total_files', 'success_count', 'failed_count', 'created_at')
    list_filter = ('status', 'operation')
