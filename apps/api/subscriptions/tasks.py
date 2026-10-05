import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def _notify_manual_review(payment, detail):
    from core.notification_service import NotificationService

    NotificationService.notify_admins(
        notif_type='payment',
        title='Subscription Payment Needs Manual Review',
        message=(
            f"Payment #{payment.id} for {payment.student.get_full_name() or payment.student.username} "
            f"({payment.plan.name}, NPR {payment.amount}) needs manual review. {detail}"
        ),
        action_url='/admin-dashboard/applications',
        priority='important',
    )
    NotificationService.notify_student_payment_manual_review(
        student=payment.student,
        title_ref=payment.plan.name,
        action_url='/student/purchases',
    )


def _mark_verification_failed(payment_id, error):
    from .models import SubscriptionPayment

    payment = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
        verification_status='VERIFICATION_IN_PROGRESS',
    ).select_related('student', 'plan').first()
    if not payment:
        return

    payment.verification_status = 'VERIFICATION_FAILED'
    payment.verification_result = {'error_message': str(error)[:500]}
    payment.ai_verification_at = timezone.now()
    payment.save(update_fields=[
        'verification_status', 'verification_result', 'ai_verification_at',
    ])
    logger.error(
        "Payment proof verification failed for payment_id=%s: %s",
        payment_id,
        error,
        exc_info=(type(error), error, error.__traceback__),
    )
    _notify_manual_review(payment, 'Automatic verification was unavailable.')


def enqueue_payment_verification(payment_id):
    """Queue verification after the payment transaction has committed."""
    try:
        verify_payment_proof.delay(payment_id)
    except Exception as exc:
        _mark_verification_failed(payment_id, exc)


@shared_task(name='subscriptions.tasks.verify_payment_proof')
def verify_payment_proof(payment_id):
    """Verify receipt evidence asynchronously without approving or rejecting payments."""
    from .models import SubscriptionPayment
    from .payment_verification import PaymentProofVerificationService

    payment = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
        verification_status='VERIFICATION_IN_PROGRESS',
    ).select_related('student', 'plan').first()
    if not payment:
        return {'status': 'skipped'}

    try:
        result = PaymentProofVerificationService().verify(payment)
    except Exception as exc:
        _mark_verification_failed(payment_id, exc)
        return {'status': 'failed'}

    # The administrator may have completed a decision while the provider was
    # processing; never update verification metadata after that decision.
    updated = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
        verification_status='VERIFICATION_IN_PROGRESS',
    ).update(
        verification_status=(
            'VERIFIED_CONFIDENT'
            if result.get('outcome') == 'confident_match'
            else 'VERIFIED_UNCERTAIN'
        ),
        verification_result=result,
        ai_verification_at=timezone.now(),
    )
    if not updated:
        return {'status': 'skipped'}

    if result.get('outcome') != 'confident_match':
        _notify_manual_review(payment, 'The receipt did not match all submitted payment details.')
    return {'status': 'verified' if result.get('outcome') == 'confident_match' else 'manual_review'}


@shared_task(name='subscriptions.tasks.notify_expiring_and_expired_subscriptions')
def notify_expiring_and_expired_subscriptions():
    """Beat-scheduled wrapper - see NotificationService.notify_subscription_expiring_soon
    and .notify_subscription_expired for what this actually does. Also
    callable directly via the `notify_expiring_subscriptions` management
    command, without Celery."""
    from core.notification_service import NotificationService

    expiring_sent = NotificationService.notify_subscription_expiring_soon()
    expired_sent = NotificationService.notify_subscription_expired()
    if expiring_sent or expired_sent:
        logger.info(
            "Sent %d 'package expiring soon' and %d 'package expired' notification(s).",
            expiring_sent, expired_sent,
        )
    return {'expiring_soon': expiring_sent, 'expired': expired_sent}
