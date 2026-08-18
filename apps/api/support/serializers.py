from rest_framework import serializers
from django.contrib.auth import password_validation
from .models import (
    StudentProfile, NotificationPreference,
    SupportTicket, SupportMessage, SupportAttachment,
    FAQ, FAQFeedback
)


class StudentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    avatar = serializers.URLField(source='user.avatar', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    target_category_name = serializers.CharField(
        source='target_category.name', read_only=True, default=None
    )
    target_position_name = serializers.CharField(
        source='target_position.name', read_only=True, default=None
    )

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'username', 'email', 'full_name', 'first_name', 'last_name',
            'avatar', 'role', 'date_joined',
            'phone', 'bio',
            'target_category', 'target_category_name',
            'target_position', 'target_position_name',
            'preferred_study_time', 'daily_study_goal_minutes',
            'difficulty_preference', 'study_mode',
            'show_profile', 'show_leaderboard',
            'allow_comparisons', 'allow_activity_visibility',
            'language',
        ]
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            instance.user.last_name = user_data['last_name']
        instance.user.save()
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "New passwords do not match."
            })
        # Run Django's built-in password validators
        password_validation.validate_password(
            data['new_password'], self.context['request'].user
        )
        return data


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        exclude = ['id', 'user']


class SupportTicketListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'category', 'priority',
            'status', 'created_at', 'updated_at', 'message_count',
        ]
        read_only_fields = [
            'id', 'ticket_number', 'status', 'created_at', 'updated_at',
        ]

    def get_message_count(self, obj):
        return obj.messages.count()


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    """Used for creating new tickets. Student is set from request.user."""
    description = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = SupportTicket
        fields = [
            'subject', 'category', 'priority', 'description',
            'related_exam', 'related_question', 'related_page',
        ]

    def create(self, validated_data):
        description = validated_data.pop('description')
        user = self.context['request'].user
        ticket = SupportTicket.objects.create(student=user, **validated_data)
        # Create the initial message from the description
        SupportMessage.objects.create(
            ticket=ticket, sender=user, message=description, is_staff_reply=False
        )
        return ticket


class SupportTicketDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'category', 'priority',
            'status', 'related_exam', 'related_question', 'related_page',
            'created_at', 'updated_at', 'closed_at',
            'messages', 'message_count',
        ]

    def get_messages(self, obj):
        return SupportMessageSerializer(obj.messages.all(), many=True).data

    def get_message_count(self, obj):
        return obj.messages.count()


class SupportMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = SupportMessage
        fields = [
            'id', 'message', 'is_staff_reply',
            'sender_name', 'sender_role', 'created_at',
        ]
        read_only_fields = ['id', 'is_staff_reply', 'created_at']

    def get_sender_name(self, obj):
        if obj.is_staff_reply:
            return "Support Team"
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username


class SupportMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'answer', 'category',
            'helpful_count', 'not_helpful_count',
        ]


class FAQFeedbackSerializer(serializers.Serializer):
    is_helpful = serializers.BooleanField(required=True)
    feedback_text = serializers.CharField(required=False, allow_blank=True, default='')
