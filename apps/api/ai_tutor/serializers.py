from rest_framework import serializers
from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'mode', 'created_at', 'updated_at']


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'mode', 'created_at', 'updated_at', 'messages']


SUPPORTED_LANGUAGES = {
    'en': 'en',
    'english': 'en',
    'ne': 'ne',
    'nepali': 'ne',
    'np': 'ne',
}


class AITutorAskRequestSerializer(serializers.Serializer):
    question = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        min_length=2,
        max_length=1000,
        error_messages={
            'required': 'Question is required.',
            'blank': 'Question cannot be blank.',
            'max_length': 'Question cannot exceed 1000 characters.',
            'min_length': 'Question must be at least 2 characters long.',
        }
    )
    language = serializers.CharField(
        required=False,
        default='ne',
        allow_blank=False,
        max_length=20,
    )
    context = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        max_length=1500,
        error_messages={
            'max_length': 'Context cannot exceed 1500 characters.',
        }
    )

    def validate_language(self, value):
        if not value:
            return 'ne'
        normalized = value.strip().lower()
        if normalized not in SUPPORTED_LANGUAGES:
            raise serializers.ValidationError(
                "Unsupported language. Supported values are: 'ne', 'en', 'nepali', 'english'."
            )
        return SUPPORTED_LANGUAGES[normalized]

    def validate_question(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Question cannot be blank.")
        return cleaned

    def validate_context(self, value):
        if not value:
            return ""
        return value.strip()


class CitationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    type = serializers.CharField(default='study_material')
    subject = serializers.CharField(allow_null=True, required=False)
    exam = serializers.CharField(allow_null=True, required=False)


class AITutorAskResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    language = serializers.CharField()
    citations = CitationSerializer(many=True)
    source_unavailable = serializers.BooleanField()
    model = serializers.CharField()
