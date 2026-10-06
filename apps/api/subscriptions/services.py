import logging
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from .models import Subscription, Invoice, SubscriptionCourseSelection

logger = logging.getLogger(__name__)

def approve_payment_logic(payment, admin_user=None):
    from courses.models import Enrollment, CourseApplication
    from core.notification_service import NotificationService
    
    with transaction.atomic():
        payment.status = 'APPROVED'
        if admin_user:
            payment.verified_by = admin_user
        payment.verified_at = timezone.now()
        if payment.verification_status in (
            'VERIFIED_UNCERTAIN', 'VERIFICATION_FAILED', 'VERIFICATION_IN_PROGRESS',
        ):
            admin_dict = {
                'action': 'approved',
                'decided_at': payment.verified_at.isoformat(),
            }
            if admin_user:
                admin_dict['admin_id'] = admin_user.id
                admin_dict['admin_name'] = admin_user.get_full_name() or admin_user.username
            else:
                admin_dict['admin_name'] = 'System (Auto-Verified)'

            payment.verification_result = {
                **(payment.verification_result or {}),
                'admin_decision': admin_dict,
            }
        # For VERIFIED_CONFIDENT (auto-approved), just note it was system-approved
        elif payment.verification_status == 'VERIFIED_CONFIDENT' and not admin_user:
            payment.verification_result = {
                **(payment.verification_result or {}),
                'admin_decision': {
                    'action': 'approved',
                    'admin_name': 'System (Auto-Verified)',
                    'decided_at': payment.verified_at.isoformat(),
                },
            }

        plan = payment.plan
        now = timezone.now()
        start_date = now

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

        subscription = Subscription.objects.create(
            student=payment.student,
            plan=plan,
            status='ACTIVE',
            start_date=start_date,
            expiry_date=expiry_date
        )

        payment.subscription = subscription
        # Use update_fields so we don't accidentally overwrite verification_status
        # that was already set to VERIFIED_CONFIDENT by the background task.
        update_fields = ['status', 'verified_by', 'verified_at', 'subscription', 'verification_result']
        payment.save(update_fields=update_fields)

        enrolled_course_title = plan.name
        try:
            applications = CourseApplication.objects.filter(subscription_payment=payment)
            
            for app in applications:
                enrollment, created = Enrollment.objects.get_or_create(
                    student=payment.student,
                    course=app.course,
                    defaults={'status': 'active', 'expires_at': expiry_date}
                )
                if not created:
                    enrollment.status = 'active'
                    enrollment.expires_at = expiry_date
                    enrollment.save(update_fields=['status', 'expires_at'])

                app.status = 'approved'
                app.reviewed_at = now
                if admin_user:
                    app.reviewed_by = admin_user
                app.save()

            if plan.course:
                enrollment, created = Enrollment.objects.get_or_create(
                    student=payment.student,
                    course=plan.course,
                    defaults={'status': 'active', 'expires_at': expiry_date}
                )
                if not created:
                    enrollment.status = 'active'
                    enrollment.expires_at = expiry_date
                    enrollment.save(update_fields=['status', 'expires_at'])
                enrolled_course_title = plan.course.title
            elif plan.package_type == 'BUNDLE':
                for c in plan.eligible_courses.all():
                    enrollment, created = Enrollment.objects.get_or_create(
                        student=payment.student,
                        course=c,
                        defaults={'status': 'active', 'expires_at': expiry_date}
                    )
                    if not created:
                        enrollment.status = 'active'
                        enrollment.expires_at = expiry_date
                        enrollment.save(update_fields=['status', 'expires_at'])
            elif applications.exists():
                if applications.count() == 1:
                    enrolled_course_title = applications.first().course.title
                else:
                    enrolled_course_title = f"{applications.count()} Preparations"

            selections = SubscriptionCourseSelection.objects.filter(payment=payment)
            for sel in selections:
                if not sel.subscription:
                    sel.subscription = subscription
                    sel.save(update_fields=['subscription'])

            if not selections.exists():
                for app in applications:
                    SubscriptionCourseSelection.objects.get_or_create(
                        subscription=subscription,
                        course=app.course,
                        defaults={'payment': payment}
                    )
                if plan.course:
                    SubscriptionCourseSelection.objects.get_or_create(
                        subscription=subscription,
                        course=plan.course,
                        defaults={'payment': payment}
                    )
                elif plan.package_type == 'BUNDLE':
                    for c in plan.eligible_courses.all():
                        SubscriptionCourseSelection.objects.get_or_create(
                            subscription=subscription,
                            course=c,
                            defaults={'payment': payment}
                        )

            from courses.access import invalidate_student_course_context
            invalidate_student_course_context(payment.student_id)
        except Exception:
            logger.exception("Auto-enroll failed for payment_id=%s student_id=%s", payment.id, payment.student_id)

        Invoice.objects.create(
            student=payment.student,
            payment=payment,
            receipt_number=f"LKAI-{now.year}-{str(uuid.uuid4())[:8].upper()}",
            amount=payment.amount
        )

        NotificationService.notify_student_payment_approved(
            student=payment.student,
            title_ref=enrolled_course_title,
            action_url='/student/purchases',
        )

    admin_name = admin_user.get_full_name() or admin_user.username if admin_user else "System"
    NotificationService.notify_admins(
        notif_type='payment',
        title='Subscription Payment Approved',
        message=f"{admin_name} approved {payment.student.get_full_name() or payment.student.username}'s payment for '{plan.name}' — subscription activated.",
        action_url='/admin-dashboard/applications',
    )
