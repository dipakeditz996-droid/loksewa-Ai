import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice
from .models import SubscriptionCourseSelection
from core.models import Notification
from administration.models import AuditLog
from courses.models import Course, CourseApplication, Enrollment
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
        if self.action in ['list', 'retrieve', 'available']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = SubscriptionPlan.objects.select_related(
            'course', 'course__exam', 'course__exam__parent', 'course__exam__category'
        ).prefetch_related(
            'eligible_courses', 'eligible_courses__exam', 'eligible_courses__exam__parent', 'eligible_courses__exam__category'
        ).order_by('display_order')
        user = self.request.user
        if not (user and user.is_authenticated and user.role in ('admin', 'super-admin')):
            qs = qs.filter(status='ACTIVE')
        return qs

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        course_ids = set(plan.eligible_courses.values_list('id', flat=True))
        if plan.course_id:
            course_ids.add(plan.course_id)

        dependencies = {
            'subscriptions': Subscription.objects.filter(plan=plan).count(),
            'payments': SubscriptionPayment.objects.filter(plan=plan).count(),
            'course_selections': SubscriptionCourseSelection.objects.filter(
                Q(payment__plan=plan) | Q(subscription__plan=plan)
            ).count(),
            'enrollments': Enrollment.objects.filter(course_id__in=course_ids).count(),
            'course_applications': CourseApplication.objects.filter(
                subscription_payment__plan=plan
            ).count(),
            'audit_records': AuditLog.objects.filter(entity_id=str(plan.pk)).filter(
                Q(entity_type__icontains='package')
                | Q(entity_type__icontains='subscriptionplan')
                | Q(entity_type__icontains='subscription plan')
            ).count(),
        }

        from administration.safe_delete_service import SafeDeleteService
        trash_item = SafeDeleteService.soft_delete(plan, request.user, reason="Deleted by Admin")
        return Response({
            'deleted': False,
            'archived': True,
            'message': f"Package '{trash_item.title}' has been moved to Trash.",
            'trash_item_id': trash_item.id,
            'dependencies': dependencies,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request):
        user = request.user if (request.user and request.user.is_authenticated) else None
        profile = getattr(user, 'student_profile', None) if user else None

        target_category = profile.target_category if profile else None
        target_position = profile.target_position if profile else None
        target_course = profile.target_course if profile else None

        # Check for query overrides (e.g. if student clicks "Buy Another Course" or explores specific preparation)
        course_id_param = request.query_params.get('course_id')
        exam_id_param = request.query_params.get('exam_id')

        from courses.models import Course, Enrollment

        if course_id_param:
            try:
                tc = Course.objects.filter(id=course_id_param).first()
                if tc:
                    target_course = tc
                    if tc.exam:
                        target_position = tc.exam
                        target_category = tc.exam.category
            except (ValueError, TypeError):
                pass
        elif exam_id_param:
            from exams.models import Exam
            try:
                tp = Exam.objects.filter(id=exam_id_param).first()
                if tp:
                    target_position = tp
                    target_category = tp.category
            except (ValueError, TypeError):
                pass

        # Identify candidate course IDs for this student's preparation
        candidate_courses_qs = Course.objects.filter(status='published')
        if target_course:
            candidate_course_ids = {target_course.id}
        elif target_position:
            child_exam_ids = list(target_position.children.values_list('id', flat=True))
            relevant_exam_ids = [target_position.id] + child_exam_ids
            if target_position.parent_id:
                relevant_exam_ids.append(target_position.parent_id)
            candidate_courses_qs = candidate_courses_qs.filter(exam_id__in=relevant_exam_ids)
            candidate_course_ids = set(candidate_courses_qs.values_list('id', flat=True))
        elif target_category:
            candidate_courses_qs = candidate_courses_qs.filter(exam__category=target_category)
            candidate_course_ids = set(candidate_courses_qs.values_list('id', flat=True))
        else:
            candidate_course_ids = set(candidate_courses_qs.values_list('id', flat=True))

        # Active enrollments student already owns
        owned_course_ids = set()
        if user:
            owned_course_ids = set(Enrollment.objects.filter(
                student=user,
                status='active'
            ).values_list('course_id', flat=True))

        all_active_plans = (
            SubscriptionPlan.objects.filter(status='ACTIVE')
            .select_related('course', 'course__exam', 'course__exam__parent', 'course__exam__category')
            .prefetch_related(
                'eligible_courses',
                'eligible_courses__exam',
                'eligible_courses__exam__parent',
                'eligible_courses__exam__category',
            )
            .order_by('display_order')
        )

        matching_plans = []
        for plan in all_active_plans:
            is_compatible = False
            eligible_ids = {c.id for c in plan.eligible_courses.all()}

            if plan.package_type == 'ALL_ACCESS':
                is_compatible = True
            elif plan.package_type == 'SINGLE':
                if plan.course_id and plan.course_id in candidate_course_ids:
                    is_compatible = True
                elif not plan.course_id and not eligible_ids:
                    is_compatible = True
                elif bool(eligible_ids & candidate_course_ids):
                    is_compatible = True
            elif plan.package_type in ('MULTI', 'BUNDLE'):
                if bool(eligible_ids & candidate_course_ids):
                    is_compatible = True
                elif not eligible_ids:
                    is_compatible = True
            else:
                if plan.course_id in candidate_course_ids or not plan.course_id:
                    is_compatible = True

            if is_compatible:
                matching_plans.append(plan)

        has_matched_specific = bool(matching_plans)
        if not matching_plans:
            matching_plans = list(all_active_plans)

        prep_info = {
            "has_preference": bool(target_category or target_position or target_course),
            "category_name": target_category.name if target_category else None,
            "category_id": target_category.id if target_category else None,
            "level_name": target_position.parent.name if (target_position and target_position.parent) else (target_position.name if target_position else None),
            "service_name": target_position.name if (target_position and target_position.parent) else None,
            "exam_id": target_position.id if target_position else None,
            "exam_name": target_position.name if target_position else None,
            "course_id": target_course.id if target_course else None,
            "course_title": target_course.title if target_course else None,
            "owned_course_ids": list(owned_course_ids),
            "has_matched_specific": has_matched_specific,
        }

        serializer = self.get_serializer(matching_plans, many=True)
        return Response({
            "preparation": prep_info,
            "plans": serializer.data,
        })

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

    @transaction.atomic
    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        plan = serializer.validated_data['plan']
        if plan.status != 'ACTIVE':
            raise ValidationError({'plan': 'This package is no longer available for purchase.'})

        # Prevent duplicate pending payment for the same plan
        existing_pending = SubscriptionPayment.objects.filter(
            student=self.request.user,
            plan=plan,
            status='PENDING'
        ).first()
        if existing_pending:
            raise ValidationError({"detail": "You already have a pending payment under review for this package."})

        # Parse course_ids safely from FormData or JSON
        course_ids = self.request.data.getlist('course_ids') if hasattr(self.request.data, 'getlist') else self.request.data.get('course_ids', [])
        if not course_ids:
            raw = self.request.data.get('course_ids')
            if isinstance(raw, str):
                course_ids = [c.strip() for c in raw.split(',') if c.strip()]
            elif isinstance(raw, list):
                course_ids = raw
            else:
                course_ids = []

        if plan.package_type == 'MULTI':
            if not course_ids:
                raise ValidationError({"course_ids": "Please select your preparation(s) for this package."})
            if len(course_ids) > plan.allowed_preparation_count:
                raise ValidationError({"course_ids": f"This plan allows up to {plan.allowed_preparation_count} preparation(s)."})
            eligible_ids = list(plan.eligible_courses.values_list('id', flat=True))
            if eligible_ids:
                invalid_courses = [cid for cid in course_ids if int(cid) not in eligible_ids]
                if invalid_courses:
                    raise ValidationError({"course_ids": "Some selected preparations are not eligible for this package."})

        payment = serializer.save(student=self.request.user, amount=plan.price)
        payment.verification_status = 'VERIFICATION_IN_PROGRESS'
        payment.save(update_fields=['verification_status'])

        from courses.models import Course, CourseApplication
        from .models import SubscriptionCourseSelection
        if plan.package_type == 'MULTI':
            for course_id in course_ids:
                CourseApplication.objects.update_or_create(
                    student=self.request.user,
                    course_id=course_id,
                    defaults={
                        'subscription_payment': payment,
                        'status': 'pending',
                        'reviewed_at': None,
                        'reviewed_by': None
                    }
                )
                SubscriptionCourseSelection.objects.get_or_create(
                    payment=payment,
                    course_id=course_id,
                )
        elif plan.package_type == 'BUNDLE':
            for course in plan.eligible_courses.all():
                CourseApplication.objects.update_or_create(
                    student=self.request.user,
                    course=course,
                    defaults={
                        'subscription_payment': payment,
                        'status': 'pending',
                        'reviewed_at': None,
                        'reviewed_by': None
                    }
                )
                SubscriptionCourseSelection.objects.get_or_create(
                    payment=payment,
                    course=course,
                )
        elif plan.package_type == 'SINGLE':
            single_course = plan.course
            if not single_course and plan.eligible_courses.count() == 1:
                single_course = plan.eligible_courses.first()
            elif not single_course and course_ids:
                single_course = Course.objects.filter(id=course_ids[0]).first()
            if single_course:
                CourseApplication.objects.update_or_create(
                    student=self.request.user,
                    course=single_course,
                    defaults={
                        'subscription_payment': payment,
                        'status': 'pending',
                        'reviewed_at': None,
                        'reviewed_by': None
                    }
                )
                SubscriptionCourseSelection.objects.get_or_create(
                    payment=payment,
                    course=single_course,
                )
        elif plan.course:
            CourseApplication.objects.update_or_create(
                student=self.request.user,
                course=plan.course,
                defaults={
                    'subscription_payment': payment,
                    'status': 'pending',
                    'reviewed_at': None,
                    'reviewed_by': None
                }
            )
            SubscriptionCourseSelection.objects.get_or_create(
                payment=payment,
                course=plan.course,
            )

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
        from functools import partial
        from .tasks import enqueue_payment_verification
        transaction.on_commit(partial(enqueue_payment_verification, payment.id))

    @action(detail=True, methods=['get'], url_path='status')
    def status_check(self, request, pk=None):
        payment = self.get_object()
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response({'detail': 'Payment is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        verification_result = payment.verification_result or {}
        manual_review_requested = bool(verification_result.get('manual_review_requested'))

        # Allow approval only after verification has reached a clear state. When
        # the proof is uncertain, failed, or still running, admin approval must be
        # preceded by an explicit manual-review step to avoid silently activating
        # a payment without complete evidence.
        if payment.verification_status == 'VERIFICATION_IN_PROGRESS':
            return Response(
                {'detail': 'Payment verification is still in progress. Please wait for it to finish before approving.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.verification_status in ('VERIFIED_UNCERTAIN', 'VERIFICATION_FAILED'):
            logger.warning(
                "Admin user_id=%s approved payment_id=%s with verification_status=%s after manual review.",
                request.user.id, payment.id, payment.verification_status,
            )

        from .services import approve_payment_logic
        approve_payment_logic(payment, admin_user=request.user)
        return Response({'status': 'approved'})


    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response({'detail': 'Payment is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        if not reason:
            return Response({'detail': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log rejection reason type for audit trail
        rejection_context = {
            'admin_id': request.user.id,
            'admin_name': request.user.get_full_name() or request.user.username,
            'rejected_at': timezone.now().isoformat(),
        }
        
        # If this is a rejection of an uncertain verification, include context
        if payment.verification_status in (
            'VERIFIED_UNCERTAIN', 'VERIFICATION_FAILED', 'VERIFICATION_IN_PROGRESS',
        ):
            logger.info(
                "Admin user_id=%s rejected payment_id=%s with verification_status=%s. "
                "Verification result: %s. Rejection reason: %s",
                request.user.id, payment.id, payment.verification_status,
                payment.verification_result, reason
            )
            rejection_context['verification_status'] = payment.verification_status
            rejection_context['ai_verification_result'] = payment.verification_result

        payment.status = 'REJECTED'
        payment.rejection_reason = reason
        payment.verified_by = request.user
        payment.verified_at = timezone.now()
        payment.verification_result = {
            **(payment.verification_result or {}),
            'admin_decision': {
                **rejection_context,
                'action': 'rejected',
                'reason': reason,
            },
        }
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


    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def revoke(self, request, pk=None):
        """Revoke an already-approved payment (e.g., when admin overrides an auto-verified payment).
        This deactivates the subscription and enrollment and notifies the student."""
        from courses.models import Enrollment
        from django.db import transaction as db_transaction

        payment = self.get_object()
        if payment.status != 'APPROVED':
            return Response({'detail': 'Only approved payments can be revoked.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        if not reason:
            return Response({'detail': 'Revocation reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            # Deactivate subscription
            if payment.subscription:
                payment.subscription.status = 'CANCELLED'
                payment.subscription.save(update_fields=['status'])

            # Deactivate enrollments linked to this payment's courses
            from courses.models import CourseApplication
            apps = CourseApplication.objects.filter(subscription_payment=payment)
            for app in apps:
                Enrollment.objects.filter(
                    student=payment.student, course=app.course
                ).update(status='cancelled')
                app.status = 'rejected'
                app.reviewed_by = request.user
                app.reviewed_at = timezone.now()
                app.save()

            if payment.plan and payment.plan.course:
                Enrollment.objects.filter(
                    student=payment.student, course=payment.plan.course
                ).update(status='cancelled')

            payment.status = 'REJECTED'
            payment.rejection_reason = reason
            payment.verified_by = request.user
            payment.verified_at = timezone.now()
            payment.verification_result = {
                **(payment.verification_result or {}),
                'admin_decision': {
                    'action': 'revoked',
                    'admin_id': request.user.id,
                    'admin_name': request.user.get_full_name() or request.user.username,
                    'revoked_at': timezone.now().isoformat(),
                    'reason': reason,
                },
            }
            payment.save()

        logger.warning(
            "Admin user_id=%s REVOKED payment_id=%s (was auto-verified). Reason: %s",
            request.user.id, payment.id, reason
        )

        from core.notification_service import NotificationService
        NotificationService.notify_student_payment_rejected(
            student=payment.student,
            title_ref=payment.plan.name,
            reason=reason,
            action_url='/student/purchases',
        )
        return Response({'status': 'revoked'})


    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def request_manual_verification_review(self, request, pk=None):
        """
        Admin manually requests verification review for a payment with uncertain verification status.
        This is typically used when admin wants to see full details and make a decision on payments
        where AI verification returned VERIFIED_UNCERTAIN.
        """
        payment = self.get_object()
        
        if payment.verification_status not in ('VERIFIED_UNCERTAIN', 'VERIFICATION_FAILED'):
            return Response(
                {'detail': 'Payment verification must be uncertain or failed to request manual review.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Flag for manual review (admin has acknowledged and is reviewing)
        # Store the review request in verification_result metadata
        review_metadata = payment.verification_result or {}
        review_metadata['manual_review_requested_by'] = {
            'user_id': request.user.id,
            'username': request.user.username,
            'full_name': request.user.get_full_name(),
            'requested_at': timezone.now().isoformat(),
        }
        review_metadata['manual_review_requested'] = True
        
        payment.verification_result = review_metadata
        payment.save(update_fields=['verification_result'])
        
        # Notify admin team about the manual review request
        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='payment',
            title='Payment Verification Requested for Manual Review',
            message=f"{request.user.get_full_name() or request.user.username} has flagged payment_id={payment.id} for manual verification review. "
                    f"Student: {payment.student.get_full_name() or payment.student.username}, "
                    f"Amount: NPR {payment.amount}, "
                    f"Plan: {payment.plan.name}",
            action_url='/admin-dashboard/applications',
        )
        
        return Response({
            'status': 'manual_review_requested',
            'payment_id': payment.id,
            'verification_status': payment.verification_status,
            'verification_result': payment.verification_result,
        })


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
