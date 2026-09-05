from django.utils import timezone
from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice
from core.models import Notification
from marketplace.serializers import PaymentMethodSerializer
from core.models import User

# No existing product rule defines "expiring soon" - this is the simple,
# documented default the spec allows in the absence of one.
EXPIRING_SOON_THRESHOLD_DAYS = 7

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    computed_status = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ('student', 'status', 'start_date', 'expiry_date')

    def get_remaining_days(self, obj):
        """Derived from expiry_date, never stored - stays correct without a
        background job having to decrement anything."""
        if obj.status != 'ACTIVE':
            return 0
        delta = obj.expiry_date - timezone.now()
        return max(delta.days, 0)

    def get_computed_status(self, obj):
        if obj.status != 'ACTIVE':
            return obj.status
        if obj.expiry_date <= timezone.now():
            return 'EXPIRED'
        if (obj.expiry_date - timezone.now()).days <= EXPIRING_SOON_THRESHOLD_DAYS:
            return 'EXPIRING_SOON'
        return 'ACTIVE'

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = SubscriptionPayment
        fields = '__all__'
        read_only_fields = ('student', 'status', 'rejection_reason', 'verified_at', 'verified_by')

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('student', 'type', 'title', 'message', 'related_id')

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'
