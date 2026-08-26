from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Product, PaymentMethod, PaymentSubmission, Purchase
from .serializers import (
    ProductSerializer,
    PaymentMethodSerializer,
    PaymentSubmissionSerializer,
    PaymentSubmissionAdminReviewSerializer,
    PurchaseSerializer
)

class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.role in ['admin', 'super-admin']

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in ['admin', 'super-admin']

# --- ADMIN VIEWS ---

class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

class AdminPaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAdminUser]

class AdminPaymentSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentSubmission.objects.all().order_by('-submitted_at')
    serializer_class = PaymentSubmissionSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'], serializer_class=PaymentSubmissionAdminReviewSerializer)
    def review(self, request, pk=None):
        submission = self.get_object()
        if submission.status != 'PENDING':
            return Response({"detail": "Submission is already processed."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = PaymentSubmissionAdminReviewSerializer(submission, data=request.data, partial=True)
        if serializer.is_valid():
            new_status = serializer.validated_data.get('status')
            rejection_reason = serializer.validated_data.get('rejection_reason', '')
            
            if new_status == 'REJECTED' and not rejection_reason:
                return Response({"rejection_reason": ["Required when rejecting."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Product validation on approval just to be safe
            if new_status == 'APPROVED' and submission.product.category == 'COURSE' and not submission.product.course:
                return Response({"detail": "Cannot approve. This COURSE product is missing a linked course."}, status=status.HTTP_400_BAD_REQUEST)
                
            from django.db import transaction
            from courses.models import Enrollment, CourseApplication
            
            with transaction.atomic():
                submission.status = new_status
                submission.rejection_reason = rejection_reason if new_status == 'REJECTED' else ''
                submission.verified_at = timezone.now()
                submission.verified_by = request.user
                submission.save()
                
                # If approved, create purchase
                if new_status == 'APPROVED':
                    Purchase.objects.update_or_create(
                        student=submission.student,
                        product=submission.product,
                        defaults={
                            'payment_submission': submission,
                            'amount_paid': submission.submitted_amount,
                            'status': 'ACTIVE',
                            'approved_at': timezone.now()
                        }
                    )
                    
                    # Provision Course Access
                    if submission.product.category == 'COURSE' and submission.product.course:
                        enrollment, created = Enrollment.objects.get_or_create(
                            student=submission.student,
                            course=submission.product.course,
                            defaults={
                                'status': 'active'
                            }
                        )
                        if not created and enrollment.status != 'active':
                            enrollment.status = 'active'
                            enrollment.save(update_fields=['status'])

                        CourseApplication.objects.filter(
                            student=submission.student,
                            course=submission.product.course,
                            status='pending'
                        ).update(
                            status='approved',
                            reviewed_at=timezone.now(),
                            reviewed_by=request.user
                        )
            
            return Response(PaymentSubmissionSerializer(submission).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Purchase.objects.all().order_by('-created_at')
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminUser]

# --- STUDENT VIEWS ---

class StudentProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(is_published=True).order_by('-created_at')

class StudentPaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(is_active=True)

class StudentPaymentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentSubmission.objects.filter(student=self.request.user).order_by('-submitted_at')

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        
        # Prevent multiple pending submissions
        pending = PaymentSubmission.objects.filter(student=self.request.user, product=product, status='PENDING').exists()
        if pending:
            raise serializers.ValidationError({"detail": "You already have a pending payment verification for this product."})
            
        if product.category == 'COURSE' and not product.course:
            raise serializers.ValidationError({"detail": "This course product is missing a valid course linkage. Please contact support."})
            
        # Prevent duplicate purchase
        purchased = Purchase.objects.filter(student=self.request.user, product=product, status='ACTIVE').exists()
        if purchased:
            raise serializers.ValidationError({"detail": "You have already purchased this product."})
            
        expected_amount = product.discount_price if product.discount_price is not None else product.price
        
        submission = serializer.save(
            student=self.request.user,
            expected_amount=expected_amount
        )
        
        # If product is a course, automatically create a pending CourseApplication
        if product.category == 'COURSE' and product.course:
            from courses.models import CourseApplication
            CourseApplication.objects.update_or_create(
                student=self.request.user,
                course=product.course,
                defaults={
                    'status': 'pending',
                    'marketplace_payment': submission
                }
            )

class StudentPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(student=self.request.user, status='ACTIVE').order_by('-created_at')
