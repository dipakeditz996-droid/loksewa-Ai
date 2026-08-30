from rest_framework import serializers

from .models import Testimonial


class AdminTestimonialSerializer(serializers.ModelSerializer):
    # Lets the admin table tell a student's own submission apart from one an
    # admin wrote directly, without exposing anything beyond a name/role.
    submitted_by_student = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = [
            'id', 'name', 'role_title', 'quote', 'avatar_url', 'rating',
            'is_published', 'display_order', 'created_at', 'updated_at',
            'submitted_by_student', 'submitted_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_submitted_by_student(self, obj):
        return bool(obj.created_by_id and obj.created_by.role == 'student')

    def get_submitted_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username if obj.created_by_id else None


class StudentTestimonialSerializer(serializers.ModelSerializer):
    """What a student sees of their own submitted review — no display_order
    (that's an admin curation concern), and is_published is read-only so a
    student can see moderation status but never set it themselves."""

    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role_title', 'quote', 'avatar_url', 'rating', 'is_published', 'updated_at']
        read_only_fields = ['id', 'is_published', 'updated_at']


class PublicTestimonialSerializer(serializers.ModelSerializer):
    """Field names match what the homepage's PublicTestimonial type already
    expects (name/position/avatar/review/rating), so the frontend needed no
    reshaping once this replaced the hardcoded response."""
    position = serializers.CharField(source='role_title')
    avatar = serializers.CharField(source='avatar_url')
    review = serializers.CharField(source='quote')

    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'position', 'avatar', 'review', 'rating']
