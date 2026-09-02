import os

with open('recovered_views_full.py', 'r', encoding='utf-8') as f:
    content = f.read()

import_replacement = '''from .models import (
    Product, PaymentMethod, PaymentSubmission, Purchase,
    Cart, CartItem, Order, OrderItem, DeliveryAddress, DeliveryFeeRule,
    OrderStatusHistory, MarketplaceSettings, MarketplaceListingReport,
    ProductImage, Review, Dispute, DisputeEvidence,
)'''

old_imports = '''from .models import (
    Product, PaymentMethod, PaymentSubmission, Purchase,
    Cart, CartItem, Order, OrderItem, DeliveryAddress, DeliveryFeeRule,
    OrderStatusHistory, MarketplaceSettings, MarketplaceListingReport,
    ProductImage,
)'''

if old_imports in content:
    content = content.replace(old_imports, import_replacement)
else:
    print("Warning: Could not replace models import")

ser_replacement = '''from .serializers import (
    ProductSerializer, SellerListingSerializer,
    PaymentMethodSerializer,
    PaymentSubmissionSerializer, PaymentSubmissionAdminReviewSerializer,
    PurchaseSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer,
    DeliveryAddressSerializer, DeliveryFeeRuleSerializer,
    MarketplaceSettingsSerializer, MarketplaceListingReportSerializer,
    SellerSaleSerializer,
    ReviewSerializer, DisputeSerializer, DisputeEvidenceSerializer,
)'''

old_ser_imports = '''from .serializers import (
    ProductSerializer, SellerListingSerializer,
    PaymentMethodSerializer,
    PaymentSubmissionSerializer, PaymentSubmissionAdminReviewSerializer,
    PurchaseSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer,
    DeliveryAddressSerializer, DeliveryFeeRuleSerializer,
    MarketplaceSettingsSerializer, MarketplaceListingReportSerializer,
    SellerSaleSerializer,
)'''

if old_ser_imports in content:
    content = content.replace(old_ser_imports, ser_replacement)
else:
    print("Warning: Could not replace serializers import")

trust_code = '''
# ---------------------------------------------------------------------------
# Trust & Safety (Student)
# ---------------------------------------------------------------------------

class StudentReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(buyer=self.request.user)

    def perform_create(self, serializer):
        order_item = serializer.validated_data['order_item']
        
        if order_item.order.student != self.request.user:
            raise PermissionDenied("You can only review your own purchases.")
        
        if order_item.fulfillment_status != 'DELIVERED':
            raise ValidationError("You can only review items that have been delivered.")
            
        if order_item.product.seller == self.request.user:
            raise ValidationError("You cannot review your own product.")

        if Review.objects.filter(order_item=order_item).exists():
            raise ValidationError("A review already exists for this item.")
            
        review = serializer.save(
            buyer=self.request.user,
            seller=order_item.product.seller,
            product=order_item.product
        )
        from core.notification_service import NotificationService
        NotificationService.notify_review_received(review.seller, review.product, review.rating)


class StudentDisputeViewSet(viewsets.ModelViewSet):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        return Dispute.objects.filter(Q(buyer=self.request.user) | Q(seller=self.request.user))

    def perform_create(self, serializer):
        order_item = serializer.validated_data['order_item']
        
        if order_item.order.student != self.request.user:
            raise PermissionDenied("You can only open disputes for your own purchases.")

        if Dispute.objects.filter(order_item=order_item).exists():
            raise ValidationError("A dispute already exists for this item.")

        with transaction.atomic():
            dispute = serializer.save(
                buyer=self.request.user,
                seller=order_item.product.seller
            )
            order_item.payout_status = 'ON_HOLD'
            order_item.save(update_fields=['payout_status'])

        from core.notification_service import NotificationService
        NotificationService.notify_dispute_opened(dispute.seller, dispute.order_item.product)
        NotificationService.notify_payout_held(dispute.seller, dispute.order_item.order.id)
        NotificationService.notify_admins(
            notif_type='system',
            title='New Dispute Opened',
            message=f"Dispute #{dispute.id} was opened for Order #{dispute.order_item.order.id}",
            action_url='/admin-dashboard/marketplace/trust',
        )

# ---------------------------------------------------------------------------
# Trust & Safety (Admin)
# ---------------------------------------------------------------------------

class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminUser]


class AdminDisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all().order_by('-created_at')
    serializer_class = DisputeSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        dispute = self.get_object()
        new_status = request.data.get('status')
        resolution = request.data.get('resolution', '')
        
        if new_status not in ['RESOLVED', 'REJECTED']:
            return Response({"detail": "Invalid status."}, status=400)
            
        with transaction.atomic():
            dispute.status = new_status
            dispute.resolution = resolution
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
            dispute.save()
            
            if new_status == 'RESOLVED':
                dispute.order_item.payout_status = 'ELIGIBLE'
                dispute.order_item.save(update_fields=['payout_status'])
            elif new_status == 'REJECTED':
                dispute.order_item.payout_status = 'ELIGIBLE'
                dispute.order_item.save(update_fields=['payout_status'])
                
        from core.notification_service import NotificationService
        NotificationService.notify_dispute_status_changed(dispute.buyer, dispute.order_item.product, dispute.get_status_display())
        NotificationService.notify_dispute_status_changed(dispute.seller, dispute.order_item.product, dispute.get_status_display())
        
        return Response(DisputeSerializer(dispute).data)
'''

content += '\n' + trust_code

with open('apps/api/marketplace/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Recovered views.py successfully!")
