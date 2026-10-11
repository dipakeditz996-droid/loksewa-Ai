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
    payment.verification_result = {
        'outcome': 'NEEDS_ADMIN_REVIEW',
        'error_type': 'verification_engine_failure',
        'error_message': str(error)[:500],
        'receipt_legible': False,
        'notes': 'Automatic verification engine encountered an unexpected error; forwarded for administrator review.',
        'failure_reasons': [f'Verification engine error: {str(error)[:200]}'],
    }
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


def dispatch_payment_verification_sync(payment_id: int):
    """Executes verification and updates payment status."""
    from .models import SubscriptionPayment
    from .payment_verification import PaymentProofVerificationService

    payment = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
    ).select_related('student', 'plan').first()
    if not payment:
        return {'status': 'skipped'}

    try:
        result = PaymentProofVerificationService().verify(payment)
    except Exception as exc:
        _mark_verification_failed(payment_id, exc)
        return {'status': 'failed'}

    updated = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
    ).update(
        verification_status=(
            'VERIFIED_CONFIDENT'
            if result.get('outcome') in ('AUTO_VERIFIED', 'confident_match')
            else 'VERIFIED_UNCERTAIN'
        ),
        verification_result=result,
        ai_verification_at=timezone.now(),
    )
    if not updated:
        return {'status': 'skipped'}

    if result.get('outcome') in ('AUTO_VERIFIED', 'confident_match'):
        from .services import approve_payment_logic
        payment.refresh_from_db()
        try:
            approve_payment_logic(payment, admin_user=None)
        except Exception as e:
            logger.exception("Auto-approval failed for payment_id=%s: %s", payment.id, e)
            _notify_manual_review(payment, 'Auto-verification succeeded but auto-approval failed.')
            return {'status': 'manual_review'}
        return {'status': 'verified'}

    return {'status': 'manual_review'}


def enqueue_payment_verification(payment_id: int):
    """
    Guarantees asynchronous execution of payment verification:
    1. If Celery is configured and an active worker is reachable, enqueues via Celery task.
    2. If Celery is eager (testing or CELERY_TASK_ALWAYS_EAGER), executes synchronously.
    3. Otherwise (broker unreachable, no worker, connection refused), spawns a background
       daemon thread with proper database connection cleanup.
    Never lets an unavailable Celery broker cause VERIFICATION_FAILED or 'OCR Unavailable'!
    """
    import sys
    import threading
    from django.conf import settings
    from django.db import connection

    # Eager mode (tests / local eager config)
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) or 'test' in sys.argv:
        try:
            res = verify_payment_proof.apply(args=[payment_id])
            logger.info("Executed payment verification #%d via eager task %s", payment_id, res.id)
            return str(res.id)
        except Exception as exc:
            logger.warning("Eager task execution failed, running directly: %s", exc)
            dispatch_payment_verification_sync(payment_id)
            return "sync-executed"

    # Live Celery worker check
    celery_dispatched = False
    broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
    if broker_url and 'redis' in broker_url:
        try:
            from backend.celery import app as celery_app
            pings = celery_app.control.ping(timeout=0.2)
            if pings:
                res = verify_payment_proof.apply_async(args=[payment_id])
                logger.info("Enqueued payment #%d to active Celery worker %s", payment_id, res.id)
                celery_dispatched = True
                return str(res.id)
        except Exception as ping_err:
            logger.debug("Celery worker not available: %s. Using thread worker.", ping_err)

    if not celery_dispatched:
        def _thread_worker(pid: int):
            connection.close()  # clean per-thread connection
            try:
                dispatch_payment_verification_sync(pid)
            except Exception as thread_err:
                logger.exception("Background thread failed for payment #%d: %s", pid, thread_err)
                _mark_verification_failed(pid, thread_err)
            finally:
                connection.close()

        thread = threading.Thread(
            target=_thread_worker,
            args=(payment_id,),
            name=f"payment-verify-{payment_id}",
            daemon=True,
        )
        thread.start()
        logger.info("Started background thread worker for payment #%d", payment_id)
        return f"thread-{payment_id}"



@shared_task(name='subscriptions.tasks.verify_payment_proof')
def verify_payment_proof(payment_id):
    """Verify receipt evidence asynchronously without approving or rejecting payments."""
    from .models import SubscriptionPayment
    from .payment_verification import PaymentProofVerificationService

    payment = SubscriptionPayment.objects.filter(
        pk=payment_id,
        status='PENDING',
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
    ).update(
        verification_status=(
            'VERIFIED_CONFIDENT'
            if result.get('outcome') in ('AUTO_VERIFIED', 'confident_match')
            else 'VERIFIED_UNCERTAIN'
        ),
        verification_result=result,
        ai_verification_at=timezone.now(),
    )
    if not updated:
        return {'status': 'skipped'}

    if result.get('outcome') in ('AUTO_VERIFIED', 'confident_match'):
        from .services import approve_payment_logic
        # Refresh from DB so approve_payment_logic sees the updated verification_status
        # (VERIFIED_CONFIDENT) and doesn't overwrite it via update_fields.
        payment.refresh_from_db()
        try:
            approve_payment_logic(payment, admin_user=None)
        except Exception as e:
            logger.exception("Auto-approval failed for payment_id=%s: %s", payment.id, e)
            _notify_manual_review(payment, 'Auto-verification succeeded but auto-approval failed.')
            return {'status': 'manual_review'}
        return {'status': 'verified'}
    else:
        detail_msg = "; ".join(result.get('failure_reasons', [])) or 'The receipt did not match all submitted payment details.'
        _notify_manual_review(payment, detail_msg)
        return {'status': 'manual_review'}


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
