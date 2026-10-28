from rest_framework import serializers
from .models import PdfBrandingSetting, PdfBrandingRecord, PdfBrandingBatchJob


class PdfBrandingSettingSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    watermark_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PdfBrandingSetting
        fields = [
            'id',
            # Logo
            'logo_enabled',
            'logo_placement',
            'logo_size',
            'logo_opacity',
            'logo_margin',
            'logo_url',
            # Watermark
            'watermark_enabled',
            'watermark_type',
            'watermark_text',
            'watermark_image_url',
            'watermark_placement',
            'watermark_opacity',
            'watermark_rotation',
            'watermark_size',
            'watermark_color',
            # Policy & Defaults
            'apply_by_default_on_upload',
            'include_in_bulk_by_default',
            'eligible_categories',
            # Version & Audit
            'version',
            'updated_at',
        ]
        read_only_fields = ['id', 'version', 'updated_at', 'logo_url', 'watermark_image_url']

    def get_logo_url(self, obj):
        if obj.logo_file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo_file.url) if request else obj.logo_file.url
        return None

    def get_watermark_image_url(self, obj):
        if obj.watermark_image_file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.watermark_image_file.url) if request else obj.watermark_image_file.url
        return None

    def validate_logo_opacity(self, value):
        if not (0.05 <= value <= 1.0):
            raise serializers.ValidationError("Logo opacity must be between 0.05 and 1.0.")
        return value

    def validate_watermark_opacity(self, value):
        if not (0.01 <= value <= 1.0):
            raise serializers.ValidationError("Watermark opacity must be between 0.01 and 1.0.")
        return value

    def validate_watermark_rotation(self, value):
        if not (-180 <= value <= 180):
            raise serializers.ValidationError("Watermark rotation must be between -180 and 180 degrees.")
        return value

    def validate_watermark_color(self, value):
        v = (value or '').strip()
        if not v.startswith('#') or len(v) not in (4, 7):
            raise serializers.ValidationError("Watermark color must be a valid hex code (e.g. #0B2545).")
        return v


class PdfBrandingRecordSerializer(serializers.ModelSerializer):
    material_id = serializers.ReadOnlyField(source='material.id')
    material_title = serializers.ReadOnlyField(source='material.title')
    material_category = serializers.ReadOnlyField(source='material.content_category')
    exam_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    has_original = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    is_outdated = serializers.SerializerMethodField()

    class Meta:
        model = PdfBrandingRecord
        fields = [
            'id',
            'material_id',
            'material_title',
            'material_category',
            'exam_name',
            'subject_name',
            'status',
            'decision',
            'applied_version',
            'has_original',
            'last_processed_at',
            'error_message',
            'page_count',
            'file_size_bytes',
            'file_url',
            'is_outdated',
            'created_at',
            'updated_at',
        ]

    def get_exam_name(self, obj):
        return obj.material.exam.name if obj.material and obj.material.exam else None

    def get_subject_name(self, obj):
        return obj.material.subject.name if obj.material and obj.material.subject else None

    def get_has_original(self, obj):
        return bool(obj.original_file)

    def get_file_url(self, obj):
        if obj.material and obj.material.file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.material.file.url) if request else obj.material.file.url
        return None

    def get_is_outdated(self, obj):
        current_version = self.context.get('current_version')
        if current_version is None:
            from .models import PdfBrandingSetting
            current_version = PdfBrandingSetting.get_settings().version
        return obj.status == 'branded' and obj.applied_version < current_version


class PdfBrandingBatchJobSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = PdfBrandingBatchJob
        fields = [
            'id',
            'status',
            'operation',
            'total_files',
            'processed_count',
            'success_count',
            'failed_count',
            'skipped_count',
            'applied_version',
            'results',
            'error_summary',
            'created_by_username',
            'created_at',
            'started_at',
            'completed_at',
        ]
