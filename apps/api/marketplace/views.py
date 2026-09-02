from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db import transaction
from decimal import Decimal

from .models import (
    Product, PaymentMethod, PaymentSubmission, Purchase,
    Cart, CartItem, Order, OrderItem, DeliveryAddress, DeliveryFeeRule,
    OrderStatusHistory, MarketplaceSettings, MarketplaceListingReport,
    ProductImage, Review, Dispute, DisputeEvidence,
)
from .serializers import (
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
)


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ['admin', 'super-admin']
        )


class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ['admin', 'super-admin']
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _marketplace_enabled():
    from core.models import AdminSettings
    return AdminSettings.get_settings().enable_marketplace


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

class PublicProductListView(APIView):
    """GET /api/marketplace/public/products/ — anonymous-friendly preview for homepage."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 6)), 100)
        except (TypeError, ValueError):
            limit = 6
        products = (
            Product.objects
            .filter(is_published=True, listing_status='ACTIVE')
            .select_related('target_exam', 'seller')
            .prefetch_related('images')
            .order_by('-created_at')[:limit]
        )

        def _cover(p, req):
            # Prefer primary ProductImage, fall back to cover_image field
            primary = next((img for img in p.images.all() if img.is_primary), None)
            if primary and primary.image:
                return req.build_absolute_uri(primary.image.url)
            if p.cover_image:
                return req.build_absolute_uri(p.cover_image.url)
            return None

        data = [{
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'category': p.category,
            'category_display': p.get_category_display(),
            'target_exam_name': p.target_exam.name if p.target_exam else None,
            'price': str(p.price),
            'discount_price': str(p.discount_price) if p.discount_price is not None else None,
            'final_price': str(p.final_price),
            'cover_image': _cover(p, request),
            'condition': p.condition,
            'condition_display': p.get_condition_display() if p.condition else None,
            'stock': p.stock,
            'listing_status': p.listing_status,
            'author': p.author,
            'publisher': p.publisher,
            'location': p.location,
            'is_seller_listing': p.is_seller_listing,
            'seller_details': {
                'id': p.seller.id,
                'first_name': p.seller.first_name,
                'member_since': p.seller.date_joined.strftime('%b %Y') if p.seller.date_joined else None,
            } if p.seller else None,
        } for p in products]
        return Response(data)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('seller').prefetch_related('images').order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('listing_status')
        is_seller = self.request.query_params.get('is_seller_listing')
        if status_filter:
            qs = qs.filter(listing_status=status_filter)
        if is_seller == 'true':
            qs = qs.exclude(seller=None)
        elif is_seller == 'false':
            qs = qs.filter(seller=None)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Admin approves a PENDING_REVIEW student listing."""
        product = self.get_object()
        if product.listing_status not in ('PENDING_REVIEW', 'REJECTED'):
            return Response(
                {'detail': f'Cannot approve a listing in status {product.listing_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            product.listing_status = 'ACTIVE'
            product.is_published = True
            product.rejection_reason = ''
            product.save(update_fields=['listing_status', 'is_published', 'rejection_reason', 'updated_at'])

        if product.seller:
            from core.notification_service import NotificationService
            NotificationService.notify_listing_approved(product.seller, product)

        return Response(ProductSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Admin rejects a student listing with an optional reason."""
        product = self.get_object()
        if product.listing_status not in ('PENDING_REVIEW', 'ACTIVE'):
            return Response(
                {'detail': f'Cannot reject a listing in status {product.listing_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get('reason', '').strip()
        with transaction.atomic():
            product.listing_status = 'REJECTED'
            product.is_published = False
            product.rejection_reason = reason
            product.save(update_fields=['listing_status', 'is_published', 'rejection_reason', 'updated_at'])

        if product.seller:
            from core.notification_service import NotificationService
            NotificationService.notify_listing_rejected(product.seller, product, reason)

        return Response(ProductSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Admin archives a listing."""
        product = self.get_object()
        with transaction.atomic():
            product.listing_status = 'ARCHIVED'
            product.is_published = False
            product.save(update_fields=['listing_status', 'is_published', 'updated_at'])
        return Response(ProductSerializer(product, context={'request': request}).data)


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
            return Response(
                {"detail": "Submission is already processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentSubmissionAdminReviewSerializer(submission, data=request.data, partial=True)
        if serializer.is_valid():
            new_status = serializer.validated_data.get('status')
            rejection_reason = serializer.validated_data.get('rejection_reason', '')

            if new_status == 'REJECTED' and not rejection_reason:
                return Response(
                    {"rejection_reason": ["Required when rejecting."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                submission.status = new_status
                submission.rejection_reason = rejection_reason if new_status == 'REJECTED' else ''
                submission.verified_at = timezone.now()
                submission.verified_by = request.user
                submission.save()

                if new_status == 'APPROVED':
                    if submission.order:
                        submission.order.status = 'CONFIRMED'
                        submission.order.save()
                    elif submission.product:
                        Purchase.objects.update_or_create(
                            student=submission.student,
                            product=submission.product,
                            defaults={
                                'payment_submission': submission,
                                'amount_paid': submission.submitted_amount,
                                'status': 'ACTIVE',
                                'approved_at': timezone.now(),
                            }
                        )
                elif new_status == 'REJECTED':
                    if submission.order:
                        submission.order.status = 'PENDING_PAYMENT'
                        submission.order.save()

            from core.notification_service import NotificationService
            title = f"Order #{submission.order.id}" if submission.order else (
                submission.product.title if submission.product else "your item"
            )

            if new_status == 'APPROVED':
                NotificationService.notify_admins(
                    notif_type='payment',
                    title='Marketplace Order Approved',
                    message=(
                        f"{request.user.get_full_name() or request.user.username} approved "
                        f"{submission.student.get_full_name() or submission.student.username}'s "
                        f"order for '{title}'."
                    ),
                    action_url='/admin-dashboard/marketplace/payments',
                )
                # Notify seller if S2S order
                if submission.order:
                    seller_ids = set(
                        submission.order.items
                        .filter(product__seller__isnull=False)
                        .values_list('product__seller_id', flat=True)
                    )
                    from core.models import User as UserModel
                    for seller in UserModel.objects.filter(id__in=seller_ids):
                        NotificationService.notify_seller_payment_confirmed(seller, submission.order.id)
            elif new_status == 'REJECTED':
                NotificationService.notify_admins(
                    notif_type='payment',
                    title='Marketplace Order Rejected',
                    message=(
                        f"{request.user.get_full_name() or request.user.username} rejected "
                        f"{submission.student.get_full_name() or submission.student.username}'s "
                        f"order for '{title}'. Reason: {rejection_reason}"
                    ),
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
        purchase = self.get_object()
        if purchase.status == 'REVOKED':
            return Response({"detail": "Purchase is already revoked."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            purchase.status = 'REVOKED'
            purchase.save(update_fields=['status'])
        return Response(PurchaseSerializer(purchase).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        purchase = self.get_object()
        if purchase.status == 'ACTIVE':
            return Response({"detail": "Purchase is already active."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            purchase.status = 'ACTIVE'
            purchase.save(update_fields=['status'])
        return Response(PurchaseSerializer(purchase).data)


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.all().select_related('student', 'delivery_address_ref').prefetch_related('items__product').order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        if old_status == new_status:
            return Response({"detail": "Order is already in this status"}, status=status.HTTP_400_BAD_REQUEST)

        if old_status in ['DELIVERED', 'CANCELLED', 'REFUNDED'] and new_status not in ['CANCELLED', 'REFUNDED']:
            return Response(
                {"detail": f"Cannot transition from {old_status} to {new_status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from core.notification_service import NotificationService

        with transaction.atomic():
            order.status = new_status
            order.save()

            OrderStatusHistory.objects.create(
                order=order,
                previous_status=old_status,
                new_status=new_status,
                changed_by=request.user,
                note=note,
            )

            # Return stock on cancellation (but not after delivery)
            if new_status == 'CANCELLED' and old_status not in ['DELIVERED']:
                for item in order.items.all():
                    item.product.stock += item.quantity
                    item.product.save(update_fields=['stock'])
                    # Un-SOLD the listing if stock was restored
                    if item.product.listing_status == 'SOLD' and item.product.stock > 0:
                        item.product.listing_status = 'ACTIVE'
                        item.product.save(update_fields=['listing_status'])

        # Buyer notification
        status_display = dict(Order.STATUS_CHOICES).get(new_status, new_status)
        NotificationService.notify_order_status(
            student=order.student,
            order_id=order.id,
            status_display=status_display,
            action_url='/student/marketplace/orders',
        )
        # Seller notifications for shipped/delivered
        if new_status == 'SHIPPED':
            seller_ids = set(
                order.items.filter(product__seller__isnull=False)
                .values_list('product__seller_id', flat=True)
            )
            from core.models import User as UserModel
            for seller in UserModel.objects.filter(id__in=seller_ids):
                NotificationService._create_if_allowed(
                    recipient=seller,
                    notif_type='system',
                    preference_key='system_alerts_inapp',
                    title='Your book has been shipped',
                    message=f"Order #{order.id} has been marked as shipped.",
                    action_url='/student/marketplace-listings',
                )

        return Response(OrderSerializer(order).data)


class AdminDeliveryFeeRuleViewSet(viewsets.ModelViewSet):
    queryset = DeliveryFeeRule.objects.all().order_by('-priority', '-created_at')
    serializer_class = DeliveryFeeRuleSerializer
    permission_classes = [IsAdminUser]


class AdminMarketplaceSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings = MarketplaceSettings.get_settings()
        return Response(MarketplaceSettingsSerializer(settings).data)

    def patch(self, request):
        settings = MarketplaceSettings.get_settings()
        serializer = MarketplaceSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminListingReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MarketplaceListingReport.objects.all().select_related('listing', 'reporter').order_by('-created_at')
    serializer_class = MarketplaceListingReportSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        report = self.get_object()
        new_status = request.data.get('status')
        admin_response = request.data.get('admin_response', '').strip()

        if new_status not in ('REVIEWED', 'DISMISSED'):
            return Response({'detail': 'status must be REVIEWED or DISMISSED.'}, status=status.HTTP_400_BAD_REQUEST)

        report.status = new_status
        report.admin_response = admin_response
        report.save(update_fields=['status', 'admin_response', 'updated_at'])
        return Response(MarketplaceListingReportSerializer(report).data)


# ---------------------------------------------------------------------------
# Student — Products (read-only browsing)
# ---------------------------------------------------------------------------

class StudentProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled by the administrator.")

        qs = (
            Product.objects
            .filter(is_published=True, listing_status='ACTIVE')
            .select_related('seller', 'target_exam')
            .prefetch_related('images')
            .order_by('-created_at')
        )
        # Filtering
        category = self.request.query_params.get('category')
        condition = self.request.query_params.get('condition')
        seller_type = self.request.query_params.get('seller_type')
        location = self.request.query_params.get('location')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        search = self.request.query_params.get('search')

        if category:
            qs = qs.filter(category=category)
        if condition:
            qs = qs.filter(condition=condition)
        if seller_type == 'student':
            qs = qs.exclude(seller=None)
        elif seller_type == 'platform':
            qs = qs.filter(seller=None)
        if location:
            qs = qs.filter(location__icontains=location)
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(author__icontains=search) |
                Q(description__icontains=search) |
                Q(publisher__icontains=search)
            )

        # Sorting
        sort = self.request.query_params.get('sort', '-created_at')
        allowed_sorts = ['price', '-price', 'created_at', '-created_at', 'condition', 'title']
        if sort in allowed_sorts:
            qs = qs.order_by(sort)

        return qs


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

        product = serializer.validated_data.get('product')
        order = serializer.validated_data.get('order')

        if not product and not order:
            raise ValidationError({"detail": "Either product or order must be provided."})

        if product:
            pending = PaymentSubmission.objects.filter(
                student=self.request.user, product=product, status='PENDING'
            ).exists()
        else:
            pending = PaymentSubmission.objects.filter(
                student=self.request.user, order=order, status='PENDING'
            ).exists()

        if pending:
            raise ValidationError({"detail": "You already have a pending payment verification for this."})

        if product:
            purchased = Purchase.objects.filter(
                student=self.request.user, product=product, status='ACTIVE'
            ).exists()
            if purchased:
                raise ValidationError({"detail": "You have already purchased this product."})
            expected_amount = product.discount_price if product.discount_price is not None else product.price
            title = product.title
        else:
            if order.status not in ['PENDING_PAYMENT', 'PAYMENT_REJECTED', 'PAYMENT_SUBMITTED']:
                raise ValidationError({"detail": "Order is not in a payable state."})
            expected_amount = order.total_amount + order.delivery_fee
            title = f"Order #{order.id}"

        serializer.save(
            student=self.request.user,
            expected_amount=expected_amount,
            submitted_amount=expected_amount,
        )

        if order:
            order.status = 'PAYMENT_SUBMITTED'
            order.save()

        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='payment',
            title='New Payment Awaiting Verification',
            message=(
                f"{self.request.user.get_full_name() or self.request.user.username} submitted "
                f"payment proof for '{title}' (NPR {expected_amount})."
            ),
            action_url='/admin-dashboard/marketplace/payments',
        )


class StudentPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(student=self.request.user, status='ACTIVE').order_by('-created_at')


# ---------------------------------------------------------------------------
# Cart & Order
# ---------------------------------------------------------------------------

class StudentDeliveryAddressViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeliveryAddress.objects.filter(student=self.request.user).order_by('-is_default', '-created_at')

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            DeliveryAddress.objects.filter(student=self.request.user).update(is_default=False)
        serializer.save(student=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            DeliveryAddress.objects.filter(student=self.request.user).update(is_default=False)
        serializer.save()


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(student=self.request.user)

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(student=self.request.user)
        return cart

    def list(self, request, *args, **kwargs):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart = self.get_object()
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response({"detail": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only published + ACTIVE listings can be purchased
        if not product.is_published or product.listing_status != 'ACTIVE':
            return Response({"detail": "This product is not available for purchase."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent self-purchase (seller cannot buy own listing)
        if product.seller and product.seller == request.user:
            return Response(
                {"detail": "You cannot purchase your own listing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if product.stock < quantity:
            return Response({"detail": "Not enough stock"}, status=status.HTTP_400_BAD_REQUEST)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
        cart_item.save()

        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart = self.get_object()
        item_id = request.data.get('item_id')
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
            item.delete()
        except CartItem.DoesNotExist:
            pass
        return Response(CartSerializer(cart).data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(student=self.request.user).prefetch_related(
            'items__product', 'status_history'
        ).order_by('-created_at')

    def _calculate_delivery_fee(self, delivery_address):
        rules = DeliveryFeeRule.objects.filter(is_active=True).order_by('-priority', '-created_at')
        for rule in rules:
            if (rule.municipality
                    and rule.municipality.lower() == delivery_address.municipality.lower()
                    and rule.district.lower() == delivery_address.district.lower()
                    and rule.province.lower() == delivery_address.province.lower()):
                return rule.fee
            if (rule.district
                    and rule.district.lower() == delivery_address.district.lower()
                    and rule.province.lower() == delivery_address.province.lower()
                    and not rule.municipality):
                return rule.fee
            if (rule.province
                    and rule.province.lower() == delivery_address.province.lower()
                    and not rule.district and not rule.municipality):
                return rule.fee
            if not rule.province and not rule.district and not rule.municipality:
                return rule.fee
        return 100.00

    @action(detail=False, methods=['post'])
    def calculate_fee(self, request):
        delivery_address_id = request.data.get('delivery_address_id')
        if not delivery_address_id:
            return Response({"detail": "Delivery address is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            delivery_address = DeliveryAddress.objects.get(id=delivery_address_id, student=request.user)
        except DeliveryAddress.DoesNotExist:
            return Response({"detail": "Delivery address not found"}, status=status.HTTP_404_NOT_FOUND)
        fee = self._calculate_delivery_fee(delivery_address)
        return Response({"delivery_fee": fee})

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled by the administrator.")

        cart = Cart.objects.filter(student=request.user).first()
        if not cart or not cart.items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        delivery_address_id = request.data.get('delivery_address_id')
        shipping_address_raw = request.data.get('shipping_address')
        contact_number_raw = request.data.get('contact_number')

        delivery_address = None
        delivery_fee = Decimal('0.00')

        if delivery_address_id:
            try:
                delivery_address = DeliveryAddress.objects.get(id=delivery_address_id, student=request.user)
            except DeliveryAddress.DoesNotExist:
                return Response({"detail": "Delivery address not found"}, status=status.HTTP_404_NOT_FOUND)

            delivery_fee = self._calculate_delivery_fee(delivery_address)
            shipping_address_str = (
                f"{delivery_address.full_name}\n{delivery_address.phone_number}\n"
                f"{delivery_address.province}, {delivery_address.district}, "
                f"{delivery_address.municipality}-{delivery_address.ward_number}\n"
                f"{delivery_address.tole_area}"
            )
            if delivery_address.street_landmark:
                shipping_address_str += f"\nLandmark: {delivery_address.street_landmark}"
            if delivery_address.delivery_note:
                shipping_address_str += f"\nNote: {delivery_address.delivery_note}"
            
            contact_number_str = delivery_address.phone_number
        else:
            if not shipping_address_raw or not contact_number_raw:
                return Response({"detail": "Delivery address or shipping details are required"}, status=status.HTTP_400_BAD_REQUEST)
            shipping_address_str = shipping_address_raw
            contact_number_str = contact_number_raw

        from core.notification_service import NotificationService

        with transaction.atomic():
            # Lock products for update and validate
            cart_items = list(cart.items.select_related('product').all())
            for item in cart_items:
                # Prevent self-purchase (double-check at checkout)
                if item.product.seller and item.product.seller == request.user:
                    raise ValidationError(f"You cannot purchase your own listing: {item.product.title}")
                # Stock check
                product = Product.objects.select_for_update().get(pk=item.product.pk)
                if product.stock < item.quantity:
                    raise ValidationError(f"Not enough stock for {product.title}")
                if not product.is_published or product.listing_status not in ('ACTIVE',):
                    raise ValidationError(f"{product.title} is no longer available.")
                product.stock -= item.quantity
                # Auto-mark as SOLD when stock reaches 0 (especially important for single-copy used books)
                if product.stock == 0:
                    product.listing_status = 'SOLD'
                    product.is_published = False
                product.save(update_fields=['stock', 'listing_status', 'is_published'])

            total_amount = sum(item.product.final_price * item.quantity for item in cart_items)

            order = Order.objects.create(
                student=request.user,
                total_amount=total_amount,
                delivery_fee=delivery_fee,
                delivery_address_ref=delivery_address,
                shipping_address=shipping_address_str,
                contact_number=contact_number_str,
                status='PENDING_PAYMENT',
            )

            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    price=item.product.final_price,
                )

            OrderStatusHistory.objects.create(
                order=order,
                previous_status='',
                new_status='PENDING_PAYMENT',
                changed_by=request.user,
                note='Order created via Checkout',
            )

            # Clear cart
            cart.items.all().delete()

        # Notify sellers that their book was purchased
        seller_ids = set(
            order.items.filter(product__seller__isnull=False)
            .values_list('product__seller_id', flat=True)
        )
        from core.models import User as UserModel
        for seller in UserModel.objects.filter(id__in=seller_ids):
            NotificationService.notify_book_sold(seller, order)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Seller Listing ViewSet (student creates/manages their own listings)
# ---------------------------------------------------------------------------

# Fields that trigger re-review if changed on an ACTIVE listing
_REreview_FIELDS = {
    'price', 'condition', 'description', 'title',
    'author', 'publisher', 'isbn', 'edition', 'condition_details',
}

MAX_IMAGES_DEFAULT = 6


class SellerListingViewSet(viewsets.ModelViewSet):
    serializer_class = SellerListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Product.objects
            .filter(seller=self.request.user)
            .prefetch_related('images')
            .order_by('-created_at')
        )

    def _check_marketplace_open(self):
        if not _marketplace_enabled():
            raise PermissionDenied("The marketplace is currently disabled.")
        settings = MarketplaceSettings.get_settings()
        if not settings.allow_student_listings:
            raise PermissionDenied("Student listings are currently disabled by the administrator.")

    def perform_create(self, serializer):
        self._check_marketplace_open()
        product = serializer.save(
            seller=self.request.user,
            listing_status='PENDING_REVIEW',
            is_published=False,
        )
        self._handle_images(product)

        from core.notification_service import NotificationService
        NotificationService.notify_listing_submitted(self.request.user, product)
        NotificationService.notify_admins(
            notif_type='system',
            title='New Student Listing Pending Review',
            message=(
                f"{self.request.user.get_full_name() or self.request.user.username} "
                f"submitted a new listing: \"{product.title}\" — Rs. {product.price}."
            ),
            action_url='/admin-dashboard/marketplace',
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        # Determine if re-review is needed
        needs_rereview = (
            instance.listing_status == 'ACTIVE'
            and any(field in serializer.validated_data for field in _REVIEW_FIELDS)
        )
        extra = {}
        if needs_rereview:
            extra = {'listing_status': 'PENDING_REVIEW', 'is_published': False}
        product = serializer.save(**extra)
        self._handle_images(product)

    def _handle_images(self, product):
        """Process uploaded images from the request."""
        request = self.request
        settings = MarketplaceSettings.get_settings()
        max_images = settings.max_listing_images

        existing_count = product.images.count()

        # Support multiple image files: images[0], images[1], ...
        # Also support labels: image_labels[0], image_labels[1], ...
        uploaded = request.FILES.getlist('images')
        labels = request.POST.getlist('image_labels')

        if uploaded:
            remaining_slots = max(0, max_images - existing_count)
            for i, img_file in enumerate(uploaded[:remaining_slots]):
                label = labels[i] if i < len(labels) else 'other'
                is_primary = (existing_count == 0 and i == 0)
                ProductImage.objects.create(
                    product=product,
                    image=img_file,
                    label=label,
                    is_primary=is_primary,
                )

        # Allow deletion of specific images
        delete_ids = request.data.getlist('delete_image_ids')
        if delete_ids:
            product.images.filter(id__in=delete_ids, product__seller=request.user).delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Only allow deletion of PENDING_REVIEW, REJECTED, DRAFT, ARCHIVED listings
        if instance.listing_status in ('ACTIVE', 'SOLD'):
            return Response(
                {"detail": "Cannot delete an active or sold listing. Archive it instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        product = self.get_object()
        if product.listing_status == 'SOLD':
            return Response({"detail": "Sold listings cannot be archived."}, status=status.HTTP_400_BAD_REQUEST)
        product.listing_status = 'ARCHIVED'
        product.is_published = False
        product.save(update_fields=['listing_status', 'is_published', 'updated_at'])
        return Response(SellerListingSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """Re-submit a REJECTED listing for admin review after making corrections."""
        product = self.get_object()
        if product.listing_status != 'REJECTED':
            return Response(
                {"detail": "Only rejected listings can be resubmitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product.listing_status = 'PENDING_REVIEW'
        product.rejection_reason = ''
        product.save(update_fields=['listing_status', 'rejection_reason', 'updated_at'])

        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='system',
            title='Listing Resubmitted for Review',
            message=(
                f"{request.user.get_full_name() or request.user.username} "
                f"resubmitted \"{product.title}\" for review."
            ),
            action_url='/admin-dashboard/marketplace',
        )
        return Response(SellerListingSerializer(product, context={'request': request}).data)


# ---------------------------------------------------------------------------
# Seller Sales ViewSet
# ---------------------------------------------------------------------------

class SellerSalesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/marketplace/student/my-sales/
    Returns orders that contain at least one item sold by the current user.
    Only shows the seller's own items within each order, not full order detail.
    """
    serializer_class = SellerSaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(items__product__seller=self.request.user)
            .distinct()
            .prefetch_related('items__product', 'student')
            .order_by('-created_at')
        )


# ---------------------------------------------------------------------------
# Student Listing Report
# ---------------------------------------------------------------------------

class StudentListingReportViewSet(viewsets.ModelViewSet):
    serializer_class = MarketplaceListingReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # no update/delete for students

    def get_queryset(self):
        return MarketplaceListingReport.objects.filter(reporter=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        listing = serializer.validated_data['listing']
        # Cannot report own listing
        if listing.seller == self.request.user:
            raise ValidationError({"detail": "You cannot report your own listing."})
        # Already reported?
        if MarketplaceListingReport.objects.filter(listing=listing, reporter=self.request.user).exists():
            raise ValidationError({"detail": "You have already reported this listing."})
        serializer.save(reporter=self.request.user)
        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='system',
            title='Listing Reported',
            message=(
                f"\"{listing.title}\" was reported by "
                f"{self.request.user.get_full_name() or self.request.user.username}. "
                f"Reason: {serializer.validated_data.get('reason')}"
            ),
            action_url='/admin-dashboard/marketplace',
        )


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
