from rest_framework import serializers
from .models import HomepageBanner

class PublicHomepageBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()

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


class AdminHomepageBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
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
            'is_active',
            'display_order',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'image': {'required': False},
            'mobile_image': {'required': False},
        }

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

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None
