import os
from rest_framework import serializers
from .models import HomepageBanner

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'}
MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024  # 5MB

class PublicHomepageBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    image_width = serializers.SerializerMethodField()
    image_height = serializers.SerializerMethodField()
    mobile_image_width = serializers.SerializerMethodField()
    mobile_image_height = serializers.SerializerMethodField()

    class Meta:
        model = HomepageBanner
        fields = [
            'id',
            'title',
            'subtitle',
            'badge_text',
            'cta_text',
            'cta_url',
            'cta_secondary_text',
            'cta_secondary_url',
            'image_url',
            'mobile_image_url',
            'image_width',
            'image_height',
            'mobile_image_width',
            'mobile_image_height',
            'image_fit',
            'image_focal_x',
            'image_focal_y',
            'mobile_image_fit',
            'mobile_image_focal_x',
            'mobile_image_focal_y',
            'display_order',
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        try:
            url = obj.image.url
            if request and not url.startswith(('http://', 'https://')):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_mobile_image_url(self, obj):
        if not obj.mobile_image:
            return None
        request = self.context.get('request')
        try:
            url = obj.mobile_image.url
            if request and not url.startswith(('http://', 'https://')):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_image_width(self, obj):
        try:
            return obj.image.width if obj.image else None
        except Exception:
            return None

    def get_image_height(self, obj):
        try:
            return obj.image.height if obj.image else None
        except Exception:
            return None

    def get_mobile_image_width(self, obj):
        try:
            return obj.mobile_image.width if obj.mobile_image else None
        except Exception:
            return None

    def get_mobile_image_height(self, obj):
        try:
            return obj.mobile_image.height if obj.mobile_image else None
        except Exception:
            return None

    def get_image_width(self, obj):
        try:
            return obj.image.width if obj.image else None
        except Exception:
            return None

    def get_image_height(self, obj):
        try:
            return obj.image.height if obj.image else None
        except Exception:
            return None

    def get_mobile_image_width(self, obj):
        try:
            return obj.mobile_image.width if obj.mobile_image else None
        except Exception:
            return None

    def get_mobile_image_height(self, obj):
        try:
            return obj.mobile_image.height if obj.mobile_image else None
        except Exception:
            return None


class AdminHomepageBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    image_width = serializers.SerializerMethodField()
    image_height = serializers.SerializerMethodField()
    mobile_image_width = serializers.SerializerMethodField()
    mobile_image_height = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = HomepageBanner
        fields = [
            'id',
            'title',
            'subtitle',
            'badge_text',
            'cta_text',
            'cta_url',
            'cta_secondary_text',
            'cta_secondary_url',
            'image',
            'image_url',
            'mobile_image',
            'mobile_image_url',
            'image_width',
            'image_height',
            'mobile_image_width',
            'mobile_image_height',
            'image_fit',
            'image_focal_x',
            'image_focal_y',
            'mobile_image_fit',
            'mobile_image_focal_x',
            'mobile_image_focal_y',
            'is_active',
            'display_order',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
            'mobile_image': {'required': False, 'allow_null': True},
        }

    def validate_image(self, value):
        if value:
            if hasattr(value, 'size') and value.size > MAX_IMAGE_FILE_SIZE:
                raise serializers.ValidationError("Desktop image size cannot exceed 5MB.")
            ext = os.path.splitext(getattr(value, 'name', ''))[1].lstrip('.').lower()
            if ext and ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise serializers.ValidationError(
                    f"Unsupported format '.{ext}'. Supported formats: JPG, PNG, WEBP, GIF, AVIF, SVG."
                )
        return value

    def validate_mobile_image(self, value):
        if value:
            if hasattr(value, 'size') and value.size > MAX_IMAGE_FILE_SIZE:
                raise serializers.ValidationError("Mobile image size cannot exceed 5MB.")
            ext = os.path.splitext(getattr(value, 'name', ''))[1].lstrip('.').lower()
            if ext and ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise serializers.ValidationError(
                    f"Unsupported format '.{ext}'. Supported formats: JPG, PNG, WEBP, GIF, AVIF, SVG."
                )
        return value

    def validate(self, attrs):
        if not self.instance:
            has_image = bool(attrs.get('image'))
            has_title = bool((attrs.get('title') or '').strip())
            if not has_image and not has_title:
                raise serializers.ValidationError("Please provide either a banner image or a headline.")
        return attrs

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        try:
            url = obj.image.url
            if request and not url.startswith(('http://', 'https://')):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_mobile_image_url(self, obj):
        if not obj.mobile_image:
            return None
        request = self.context.get('request')
        try:
            url = obj.mobile_image.url
            if request and not url.startswith(('http://', 'https://')):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_image_width(self, obj):
        try:
            return obj.image.width if obj.image else None
        except Exception:
            return None

    def get_image_height(self, obj):
        try:
            return obj.image.height if obj.image else None
        except Exception:
            return None

    def get_mobile_image_width(self, obj):
        try:
            return obj.mobile_image.width if obj.mobile_image else None
        except Exception:
            return None

    def get_mobile_image_height(self, obj):
        try:
            return obj.mobile_image.height if obj.mobile_image else None
        except Exception:
            return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None
