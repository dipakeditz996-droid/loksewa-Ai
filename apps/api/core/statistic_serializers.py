from rest_framework import serializers
from .models import HomepageStatistic

class PublicHomepageStatisticSerializer(serializers.ModelSerializer):
    value = serializers.SerializerMethodField()
    formatted_value = serializers.SerializerMethodField()

    class Meta:
        model = HomepageStatistic
        fields = [
            'id',
            'placement',
            'label',
            'description',
            'value',
            'raw_value',
            'formatted_value',
            'prefix',
            'suffix',
            'precision',
            'thousand_separator',
            'animation_enabled',
            'animation_duration',
            'animation_start_value',
            'icon',
            'accent_style',
            'display_order',
        ]

    def get_value(self, obj):
        return obj.resolve_target_value()

    def get_formatted_value(self, obj):
        return obj.get_formatted_display()


class AdminHomepageStatisticSerializer(serializers.ModelSerializer):
    resolved_value = serializers.SerializerMethodField()
    formatted_value = serializers.SerializerMethodField()
    live_metric_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = HomepageStatistic
        fields = [
            'id',
            'placement',
            'label',
            'description',
            'source_type',
            'automatic_metric',
            'value',
            'raw_value',
            'prefix',
            'suffix',
            'precision',
            'thousand_separator',
            'animation_enabled',
            'animation_duration',
            'animation_start_value',
            'icon',
            'accent_style',
            'display_order',
            'is_active',
            'resolved_value',
            'formatted_value',
            'live_metric_count',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_resolved_value(self, obj):
        return obj.resolve_target_value()

    def get_formatted_value(self, obj):
        return obj.get_formatted_display()

    def get_live_metric_count(self, obj):
        if obj.source_type == 'automatic' and obj.automatic_metric:
            return obj.calculate_automatic_metric(obj.automatic_metric)
        return None

    def validate_animation_duration(self, value):
        if value < 0.1 or value > 10.0:
            raise serializers.ValidationError("Animation duration must be between 0.1 and 10.0 seconds.")
        return round(value, 2)

    def validate_precision(self, value):
        if value < 0 or value > 4:
            raise serializers.ValidationError("Decimal precision must be between 0 and 4.")
        return value

    def validate(self, attrs):
        source_type = attrs.get('source_type', getattr(self.instance, 'source_type', 'manual'))
        automatic_metric = attrs.get('automatic_metric', getattr(self.instance, 'automatic_metric', ''))
        
        if source_type == 'automatic' and not automatic_metric:
            raise serializers.ValidationError({"automatic_metric": "Automatic metric must be selected when data source is automatic."})

        return attrs
