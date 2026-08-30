from rest_framework import serializers
from .models import Product, PaymentMethod, PaymentSubmission, Purchase
from core.models import User
from exams.models import Exam

class ProductSerializer(serializers.ModelSerializer):
    final_price = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('updated_at',)

class StudentBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class PaymentSubmissionSerializer(serializers.ModelSerializer):
    student_details = StudentBasicSerializer(source='student', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)

    class Meta:
        model = PaymentSubmission
        fields = '__all__'
        # expected_amount/submitted_amount are server-computed from the
        # product's price in StudentPaymentSubmissionViewSet.perform_create -
        # trusting client input for these would let a student claim they
        # paid less (or were expected to pay less) than the real price.
        read_only_fields = (
            'student', 'status', 'rejection_reason', 'submitted_at', 'verified_at',
            'verified_by', 'expected_amount', 'submitted_amount',
        )

    def validate_transaction_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Transaction ID cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Transaction ID is too long.")
        return value

class PaymentSubmissionAdminReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSubmission
        fields = ['status', 'rejection_reason']
        
class PurchaseSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    payment_submission_details = PaymentSubmissionSerializer(source='payment_submission', read_only=True)

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ('student', 'created_at', 'approved_at', 'status', 'amount_paid')
