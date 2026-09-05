from rest_framework import serializers

from .models import WebsitePage


class AdminWebsitePageSerializer(serializers.ModelSerializer):
    """slug is intentionally read-only here - an admin edits an existing
    page's title/content/status, never renames its identity (the public URL
    and any inbound links depend on the slug staying stable)."""
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WebsitePage
        fields = ['id', 'slug', 'title', 'content', 'status', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_updated_by_name(self, obj):
        if not obj.updated_by_id:
            return None
        return obj.updated_by.get_full_name() or obj.updated_by.username


class PublicWebsitePageSerializer(serializers.ModelSerializer):
    """What a visitor sees - never updated_by, never the internal id, never
    draft content (the view only ever fetches status='published' rows)."""

    class Meta:
        model = WebsitePage
        fields = ['slug', 'title', 'content', 'updated_at']
