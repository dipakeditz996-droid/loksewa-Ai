import re
from rest_framework import serializers
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from core.models import AdminEmailRecipient, EmailDeliveryLog


VALID_EVENT_CATEGORIES = {'registration', 'payment', 'marketplace', 'security', 'system'}


class AdminEmailRecipientSerializer(serializers.ModelSerializer):
    event_categories = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    class Meta:
        model = AdminEmailRecipient
        fields = [
            'id',
            'email',
            'name',
            'is_active',
            'event_categories',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_email(self, value):
        normalized = (value or '').strip().lower()
        if not normalized:
            raise serializers.ValidationError("Email address is required.")
        try:
            django_validate_email(normalized)
        except DjangoValidationError:
            raise serializers.ValidationError("Please provide a valid email address.")

        # Check unique constraint on create or if changed
        instance = getattr(self, 'instance', None)
        qs = AdminEmailRecipient.objects.filter(email=normalized)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An admin recipient with this email already exists.")
        return normalized

    def validate_event_categories(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("event_categories must be a list.")
        invalid = [cat for cat in value if cat not in VALID_EVENT_CATEGORIES]
        if invalid:
            raise serializers.ValidationError(
                f"Invalid categories: {', '.join(invalid)}. Supported: {', '.join(sorted(VALID_EVENT_CATEGORIES))}."
            )
        return list(dict.fromkeys(value))  # deduplicate preserving order


class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDeliveryLog
        fields = [
            'id',
            'event_category',
            'recipient_email',
            'recipient_role',
            'subject',
            'template_name',
            'status',
            'idempotency_key',
            'attempts',
            'max_attempts',
            'error_message',
            'sent_at',
            'created_at',
            'updated_at',
            'metadata',
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Redact raw html_body and text_body from metadata in responses to keep payload light and secure
        if isinstance(data.get('metadata'), dict):
            safe_meta = {
                k: v for k, v in data['metadata'].items()
                if k not in ('html_body', 'text_body', 'password', 'code', 'token')
            }
            data['metadata'] = safe_meta
        return data


class SendTestEmailSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField(required=True)

