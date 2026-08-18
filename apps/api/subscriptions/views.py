from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Notification, Invoice
from .serializers import (
    SubscriptionPlanSerializer, SubscriptionSerializer,
    SubscriptionPaymentSerializer, NotificationSerializer, InvoiceSerializer
)

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'super-admin']

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all().order_by('display_order')
    serializer_class = SubscriptionPlanSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]

class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(student=self.request.user).order_by('-created_at')

class SubscriptionPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'super-admin']:
            return SubscriptionPayment.objects.all().order_by('-submitted_at')
        return SubscriptionPayment.objects.filter(student=self.request.user).order_by('-submitted_at')

    def perform_create(self, serializer):
        payment = serializer.save(student=self.request.user)
        # Notify user
        Notification.objects.create(
            student=self.request.user,
            type='PAYMENT_SUBMITTED',
            title='Payment Submitted',
            message='Your payment has been submitted and is awaiting verification.',
            related_id=str(payment.id)
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response({'detail': 'Payment is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        # Approve payment
        payment.status = 'APPROVED'
        payment.verified_by = request.user
        payment.verified_at = timezone.now()
        
        # Determine start and expiry dates
        plan = payment.plan
        now = timezone.now()
        start_date = now
        
        # Check if user has active subscription to extend
        active_sub = Subscription.objects.filter(student=payment.student, status='ACTIVE', expiry_date__gt=now).order_by('-expiry_date').first()
        if active_sub:
            start_date = active_sub.expiry_date
            
        if plan.duration_unit == 'DAYS':
            delta = timedelta(days=plan.duration)
        elif plan.duration_unit == 'WEEKS':
            delta = timedelta(weeks=plan.duration)
        elif plan.duration_unit == 'MONTHS':
            delta = timedelta(days=30 * plan.duration)
        elif plan.duration_unit == 'YEAR':
            delta = timedelta(days=365 * plan.duration)
        else:
            delta = timedelta(days=plan.duration)
            
        expiry_date = start_date + delta

        # Create subscription
        subscription = Subscription.objects.create(
            student=payment.student,
            plan=plan,
            status='ACTIVE',
            start_date=start_date,
            expiry_date=expiry_date
        )
        
        payment.subscription = subscription
        payment.save()
        
        # Create invoice
        Invoice.objects.create(
            student=payment.student,
            payment=payment,
            receipt_number=f"LKAI-{now.year}-{str(uuid.uuid4())[:8].upper()}",
            amount=payment.amount
        )
        
        # Create notification
        Notification.objects.create(
            student=payment.student,
            type='PAYMENT_APPROVED',
            title='Payment Approved',
            message='Your Premium plan has been activated successfully.',
            related_id=str(payment.id)
        )

        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response({'detail': 'Payment is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        if not reason:
            return Response({'detail': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        payment.status = 'REJECTED'
        payment.rejection_reason = reason
        payment.verified_by = request.user
        payment.verified_at = timezone.now()
        payment.save()
        
        # Create notification
        Notification.objects.create(
            student=payment.student,
            type='PAYMENT_REJECTED',
            title='Payment Rejected',
            message=f'Your payment was rejected. Reason: {reason}',
            related_id=str(payment.id)
        )

        return Response({'status': 'rejected'})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(student=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})
