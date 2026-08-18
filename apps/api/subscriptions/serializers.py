from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Notification, Invoice
from marketplace.serializers import PaymentMethodSerializer
from core.models import User

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    
    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ('student', 'status', 'start_date', 'expiry_date')

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
