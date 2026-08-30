from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
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
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ['admin', 'super-admin']
        )

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ['admin', 'super-admin']
        )

class PublicProductListView(APIView):
    """GET /api/marketplace/public/products/ - a small, anonymous-friendly
    preview of published products for the homepage. Purchase-only fields
    (product_file) are never included."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 6)), 100)
        except (TypeError, ValueError):
            limit = 6
        products = Product.objects.filter(is_published=True).select_related('target_exam').order_by('-created_at')[:limit]

        data = [{
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'category': p.category,
            'category_display': p.get_category_display(),
            'target_exam_name': p.target_exam.name if p.target_exam else None,
            'is_free': p.is_free,
            'price': str(p.price),
            'discount_price': str(p.discount_price) if p.discount_price is not None else None,
            'final_price': str(p.final_price),
            'cover_image': request.build_absolute_uri(p.cover_image.url) if p.cover_image else None,
        } for p in products]
        return Response(data)


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
            
            # Placed after the atomic block so it only fires once the review
            # decision (and, on approval, the purchase/enrollment it grants)
            # has actually committed.
            from core.notification_service import NotificationService
            if new_status == 'APPROVED':
                NotificationService.notify_admins(
                    notif_type='payment',
                    title='Marketplace Order Approved',
                    message=f"{request.user.get_full_name() or request.user.username} approved {submission.student.get_full_name() or submission.student.username}'s order for '{submission.product.title}'.",
                    action_url='/admin-dashboard/marketplace/payments',
                )
            elif new_status == 'REJECTED':
                NotificationService.notify_admins(
                    notif_type='payment',
                    title='Marketplace Order Rejected',
                    message=f"{request.user.get_full_name() or request.user.username} rejected {submission.student.get_full_name() or submission.student.username}'s order for '{submission.product.title}'. Reason: {rejection_reason}",
                    action_url='/admin-dashboard/marketplace/payments',
                )

            return Response(PaymentSubmissionSerializer(submission).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Purchase.objects.all().order_by('-created_at')
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revokes access. If the product is a course, the student's enrollment
        is also deactivated so revocation actually removes access, not just
        flips a label."""
        purchase = self.get_object()
        if purchase.status == 'REVOKED':
            return Response({"detail": "Purchase is already revoked."}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        from courses.models import Enrollment

        with transaction.atomic():
            purchase.status = 'REVOKED'
            purchase.save(update_fields=['status'])

            if purchase.product.category == 'COURSE' and purchase.product.course:
                Enrollment.objects.filter(
                    student=purchase.student, course=purchase.product.course
                ).update(status='suspended')

        return Response(PurchaseSerializer(purchase).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Restores a revoked purchase and, for course products, re-activates
        the underlying enrollment."""
        purchase = self.get_object()
        if purchase.status == 'ACTIVE':
            return Response({"detail": "Purchase is already active."}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        from courses.models import Enrollment

        with transaction.atomic():
            purchase.status = 'ACTIVE'
            purchase.save(update_fields=['status'])

            if purchase.product.category == 'COURSE' and purchase.product.course:
                Enrollment.objects.filter(
                    student=purchase.student, course=purchase.product.course
                ).update(status='active')

        return Response(PurchaseSerializer(purchase).data)

# --- STUDENT VIEWS ---

def _marketplace_enabled():
    from core.models import AdminSettings
    return AdminSettings.get_settings().enable_marketplace


class StudentProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled by the administrator.")
        return Product.objects.filter(is_published=True).order_by('-created_at')

class StudentPaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled by the administrator.")
        return PaymentMethod.objects.filter(is_active=True)

class StudentPaymentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentSubmission.objects.filter(student=self.request.user).order_by('-submitted_at')

    def perform_create(self, serializer):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled by the administrator.")
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

        # The checkout flow has no "amount you paid" field - the student
        # scans the QR and pays the exact listed price, then just uploads
        # proof. So submitted_amount is the same server-computed price, not
        # client input (see PaymentSubmissionSerializer.read_only_fields).
        submission = serializer.save(
            student=self.request.user,
            expected_amount=expected_amount,
            submitted_amount=expected_amount,
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

        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='payment',
            title='New Payment Awaiting Verification',
            message=f"{self.request.user.get_full_name() or self.request.user.username} submitted payment proof for '{product.title}' (NPR {expected_amount}).",
            action_url='/admin-dashboard/marketplace/payments',
        )

class StudentPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(student=self.request.user, status='ACTIVE').order_by('-created_at')
