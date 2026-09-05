import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice
from core.models import Notification
from .serializers import (
    SubscriptionPlanSerializer, SubscriptionSerializer,
    SubscriptionPaymentSerializer, NotificationSerializer, InvoiceSerializer
)

logger = logging.getLogger(__name__)

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'super-admin']

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = SubscriptionPlan.objects.all().order_by('display_order')
        # Draft/inactive plans are admin-management data, not something a
        # student (or an anonymous visitor - list/retrieve are AllowAny so
        # the pre-login pricing section can call this) should ever see.
        user = self.request.user
        if not (user and user.is_authenticated and user.role in ('admin', 'super-admin')):
            qs = qs.filter(status='ACTIVE')
        return qs

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
        # amount must never come from the client - a student could submit
        # amount=1 against a premium plan and, if an admin approves without
        # manually cross-checking, get the full plan activated. Compute it
        # server-side from the plan's real price, same pattern marketplace
        # checkout already uses for its own submitted_amount.
        plan = serializer.validated_data['plan']
        payment = serializer.save(student=self.request.user, amount=plan.price)

        from core.notification_service import NotificationService
        NotificationService.notify_student_payment_submitted(
            student=self.request.user,
            title_ref=plan.name,
            amount=payment.amount,
            action_url='/student/purchases',
        )
        NotificationService.notify_admins(
            notif_type='payment',
            title='New Subscription Payment Awaiting Verification',
            message=f"{self.request.user.get_full_name() or self.request.user.username} submitted a payment of NPR {payment.amount} for '{payment.plan.name}'.",
            action_url='/admin-dashboard/applications',
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response({'detail': 'Payment is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        # Everything below is one admin action with several dependent writes
        # (payment, subscription, enrollment, invoice, notification) — wrap
        # it so a failure partway through rolls back cleanly instead of
        # leaving e.g. an APPROVED payment with no subscription/enrollment.
        with transaction.atomic():
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

            # ── AUTO-ENROLL: if plan has a linked Course, create/activate Enrollment ──
            enrolled_course_title = plan.name  # fallback notification text
            if plan.course:
                try:
                    from courses.models import Enrollment, CourseApplication
                    enrollment, created = Enrollment.objects.get_or_create(
                        student=payment.student,
                        course=plan.course,
                        defaults={
                            'status': 'active',
                            'expires_at': expiry_date,
                        }
                    )
                    if not created:
                        # Reactivate if previously cancelled/suspended
                        enrollment.status = 'active'
                        enrollment.expires_at = expiry_date
                        enrollment.save(update_fields=['status', 'expires_at'])

                    enrolled_course_title = plan.course.title

                    # Approve any CourseApplication linked to this payment or this student+course
                    CourseApplication.objects.filter(
                        student=payment.student,
                        course=plan.course,
                        status='pending'
                    ).update(
                        status='approved',
                        reviewed_at=now,
                        reviewed_by=request.user,
                    )
                except Exception:
                    # Deliberately not re-raised: a bug in the auto-enroll
                    # step shouldn't block the payment approval itself, but
                    # it must not fail silently either.
                    logger.exception(
                        "Auto-enroll failed for payment_id=%s student_id=%s course_id=%s",
                        payment.id, payment.student_id, plan.course_id,
                    )

            # Create invoice
            Invoice.objects.create(
                student=payment.student,
                payment=payment,
                receipt_number=f"LKAI-{now.year}-{str(uuid.uuid4())[:8].upper()}",
                amount=payment.amount
            )

            # Notify student
            from core.notification_service import NotificationService
            NotificationService.notify_student_payment_approved(
                student=payment.student,
                title_ref=enrolled_course_title,
                action_url='/student/purchases',
            )

        # Placed after the atomic block so it only fires once the approval
        # (payment + subscription + enrollment + invoice) has actually
        # committed - a rollback partway through never leaves this orphaned.
        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='payment',
            title='Subscription Payment Approved',
            message=f"{request.user.get_full_name() or request.user.username} approved {payment.student.get_full_name() or payment.student.username}'s payment for '{plan.name}' — subscription activated.",
            action_url='/admin-dashboard/applications',
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
        
        from core.notification_service import NotificationService
        NotificationService.notify_student_payment_rejected(
            student=payment.student,
            title_ref=payment.plan.name,
            reason=reason,
            action_url='/student/purchases',
        )
        NotificationService.notify_admins(
            notif_type='payment',
            title='Subscription Payment Rejected',
            message=f"{request.user.get_full_name() or request.user.username} rejected {payment.student.get_full_name() or payment.student.username}'s payment for '{payment.plan.name}'. Reason: {reason}",
            action_url='/admin-dashboard/applications',
        )

        return Response({'status': 'rejected'})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all_read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})
