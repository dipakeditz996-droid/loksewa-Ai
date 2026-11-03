import logging
import sys
import threading
from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from celery import shared_task

from .models import CoinTopUp
from .services import WalletService
from subscriptions.payment_verification import PaymentProofVerificationService

logger = logging.getLogger(__name__)


def process_topup_payment_verification(topup_id: int):
    """
    Executes authoritative payment verification for a CoinTopUp submission
    by reusing the existing OCR and provider verification pipeline.
    Enforces atomic credit, ledger immutability, and state transitions:
      - AUTO_VERIFIED -> status='VERIFIED', verification_status='VERIFIED_CONFIDENT', credits coins.
      - REJECTED -> status='REJECTED', verification_status='VERIFICATION_FAILED', no credit.
      - NEEDS_ADMIN_REVIEW -> status='SUBMITTED', verification_status='VERIFIED_UNCERTAIN', no credit.
    """
    topup = CoinTopUp.objects.filter(pk=topup_id).select_related('user', 'payment_method').first()

    if not topup:
        logger.info("Top-up #%s not found; skipping verification.", topup_id)
        return {'status': 'skipped'}

    if topup.status == 'VERIFIED' or topup.wallet_transaction_id is not None:
        logger.info("Top-up #%s is already verified and credited; ignoring duplicate trigger.", topup_id)
        return {'status': 'already_verified', 'outcome': 'AUTO_VERIFIED'}

    if topup.status not in ('PENDING', 'SUBMITTED'):
        logger.info("Top-up #%s status is %s; skipping verification.", topup_id, topup.status)
        return {'status': 'skipped'}

    try:
        verification_service = PaymentProofVerificationService()
        result = verification_service.verify(topup)
    except Exception as exc:
        logger.exception("Unexpected exception during top-up #%s verification: %s", topup_id, exc)
        with transaction.atomic():
            topup_row = CoinTopUp.objects.select_for_update().filter(pk=topup_id).first()
            if topup_row and topup_row.status in ('PENDING', 'SUBMITTED'):
                topup_row.verification_status = 'VERIFICATION_FAILED'
                topup_row.verification_notes = f"Verification engine error: {exc}"
                topup_row.ai_verification_at = timezone.now()
                topup_row.save(update_fields=['verification_status', 'verification_notes', 'ai_verification_at', 'updated_at'])
        return {'status': 'failed', 'error': str(exc)}

    outcome = result.get('outcome')
    failure_reasons = result.get('failure_reasons', [])

    with transaction.atomic():
        topup_row = CoinTopUp.objects.select_for_update().get(pk=topup_id)

        # Idempotency guard: never re-verify or double-credit
        if topup_row.status == 'VERIFIED' or topup_row.wallet_transaction_id is not None:
            logger.info("Top-up #%s is already verified and credited; ignoring duplicate trigger.", topup_id)
            return {'status': 'already_verified', 'outcome': outcome}

        if outcome == 'AUTO_VERIFIED':
            total_coins = topup_row.coins_expected + topup_row.bonus_coins
            clean_ref = (topup_row.payment_reference or "").strip().upper()
            tx_key = f"topup_ref_{clean_ref}" if clean_ref else f"topup_credit_{topup_row.id}"

            wallet_tx = WalletService.credit_wallet(
                user=topup_row.user,
                amount=total_coins,
                reference_type='TOPUP',
                reference_id=str(topup_row.id),
                description=f"Coin Top-up #{topup_row.id} auto-verified (NPR {topup_row.amount_npr})",
                idempotency_key=tx_key,
                metadata={
                    'topup_id': topup_row.id,
                    'amount_npr': str(topup_row.amount_npr),
                    'payment_reference': topup_row.payment_reference,
                    'auto_verified': True,
                    'ocr_engine': result.get('ocr_engine'),
                    'provider': result.get('detected_provider')
                }
            )

            topup_row.status = 'VERIFIED'
            topup_row.verification_status = 'VERIFIED_CONFIDENT'
            topup_row.verification_result = result
            topup_row.ai_verification_at = timezone.now()
            topup_row.verified_at = timezone.now()
            topup_row.verified_by = None
            topup_row.wallet_transaction = wallet_tx
            topup_row.verification_notes = result.get('notes', 'Auto-verified via OCR engine.')
            topup_row.save(update_fields=[
                'status',
                'verification_status',
                'verification_result',
                'ai_verification_at',
                'verified_at',
                'verified_by',
                'wallet_transaction',
                'verification_notes',
                'updated_at'
            ])

            # Student notification
            try:
                from core.notification_service import NotificationService
                NotificationService.notify_student_payment_approved(
                    student=topup_row.user,
                    title_ref=f"{total_coins} Coins Top-up",
                    action_url='/student/wallet'
                )
            except Exception as n_err:
                logger.warning("Could not dispatch top-up approval notification: %s", n_err)

            return {'status': 'verified', 'outcome': outcome}

        elif outcome == 'REJECTED':
            topup_row.status = 'REJECTED'
            topup_row.verification_status = 'VERIFICATION_FAILED'
            topup_row.verification_result = result
            topup_row.ai_verification_at = timezone.now()
            topup_row.rejection_reason = "; ".join(failure_reasons) or "Payment verification rejected."
            topup_row.verification_notes = result.get('notes', '')
            topup_row.save(update_fields=[
                'status',
                'verification_status',
                'verification_result',
                'ai_verification_at',
                'rejection_reason',
                'verification_notes',
                'updated_at'
            ])

            # Student notification
            try:
                from core.notification_service import NotificationService
                NotificationService.notify_student_payment_rejected(
                    student=topup_row.user,
                    title_ref=f"Coin Top-up #{topup_row.id}",
                    reason=topup_row.rejection_reason,
                    action_url='/student/wallet'
                )
            except Exception as n_err:
                logger.warning("Could not dispatch top-up rejection notification: %s", n_err)

            return {'status': 'rejected', 'outcome': outcome}

        else:
            # outcome == 'NEEDS_ADMIN_REVIEW'
            topup_row.status = 'SUBMITTED'
            topup_row.verification_status = 'VERIFIED_UNCERTAIN'
            topup_row.verification_result = result
            topup_row.ai_verification_at = timezone.now()
            topup_row.verification_notes = result.get('notes', 'Pending administrator review.')
            topup_row.save(update_fields=[
                'status',
                'verification_status',
                'verification_result',
                'ai_verification_at',
                'verification_notes',
                'updated_at'
            ])

            # Admin notification
            try:
                from core.notification_service import NotificationService
                NotificationService.notify_admins(
                    notif_type='payment',
                    title='Coin Top-up Awaiting Review',
                    message=f"Coin Top-up #{topup_row.id} by {topup_row.user.username} (NPR {topup_row.amount_npr}) requires manual review.",
                    action_url=f"/admin/wallet/topups/{topup_row.id}"
                )
            except Exception as n_err:
                logger.warning("Could not dispatch top-up review notification: %s", n_err)

            return {'status': 'manual_review', 'outcome': outcome}


@shared_task(bind=True, name='wallet.tasks.verify_topup_proof', max_retries=3, default_retry_delay=60)
def verify_topup_proof(self, topup_id: int):
    """Celery task wrapper with safe retry and idempotency."""
    try:
        return process_topup_payment_verification(topup_id)
    except Exception as exc:
        logger.warning("Retrying top-up verification #%s due to transient error: %s", topup_id, exc)
        try:
            self.retry(exc=exc)
        except Exception:
            raise exc


def recover_stuck_topup_verifications(max_age_minutes: int = 15) -> int:
    """
    Recovers CoinTopUp submissions stuck in VERIFICATION_IN_PROGRESS due to
    worker crashes, restarts, or timeouts. Safely resets them to VERIFIED_UNCERTAIN
    so they appear in the Admin Review interface and are never permanently lost.
    """
    cutoff = timezone.now() - timezone.timedelta(minutes=max_age_minutes)
    stuck_topups = CoinTopUp.objects.filter(
        status='SUBMITTED',
        verification_status='VERIFICATION_IN_PROGRESS',
        updated_at__lt=cutoff
    )
    recovered_count = 0
    for topup in stuck_topups:
        with transaction.atomic():
            topup_locked = CoinTopUp.objects.select_for_update().filter(pk=topup.pk).first()
            if topup_locked and topup_locked.verification_status == 'VERIFICATION_IN_PROGRESS':
                topup_locked.verification_status = 'VERIFIED_UNCERTAIN'
                topup_locked.verification_notes = (
                    "Background verification timed out or process was restarted; "
                    "safely recovered and routed to manual administrator review."
                )
                topup_locked.save(update_fields=['verification_status', 'verification_notes', 'updated_at'])
                recovered_count += 1
                logger.warning("Recovered stuck top-up verification #%d and routed to admin review.", topup.pk)
    return recovered_count


def enqueue_topup_verification(topup_id: int):
    """
    Enqueues or executes top-up verification safely:
    1. If testing or eager execution configured, runs synchronously.
    2. If Celery is active, dispatches Celery task.
    3. Fallback: spawns a background thread with dedicated database connection cleanup.
    """
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) or 'test' in sys.argv:
        try:
            res = verify_topup_proof.apply(args=[topup_id])
            logger.info("Executed top-up verification #%d synchronously/eagerly.", topup_id)
            return str(res.id)
        except Exception as exc:
            logger.warning("Eager task invocation failed, running process directly: %s", exc)
            process_topup_payment_verification(topup_id)
            return "sync-executed"

    celery_dispatched = False
    broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
    if broker_url and 'redis' in broker_url:
        try:
            from backend.celery import app as celery_app
            pings = celery_app.control.ping(timeout=0.2)
            if pings:
                res = verify_topup_proof.apply_async(args=[topup_id])
                logger.info("Enqueued top-up #%d to active Celery worker %s", topup_id, res.id)
                celery_dispatched = True
                return str(res.id)
        except Exception as ping_err:
            logger.debug("Celery worker ping failed: %s. Using thread worker.", ping_err)

    if not celery_dispatched:
        def _thread_worker(tid: int):
            connection.close()
            try:
                process_topup_payment_verification(tid)
            except Exception as thread_err:
                logger.exception("Top-up background thread error for #%d: %s", tid, thread_err)
            finally:
                connection.close()

        thread = threading.Thread(
            target=_thread_worker,
            args=(topup_id,),
            name=f"topup-verify-{topup_id}",
            daemon=True,
        )
        thread.start()
        logger.info("Started background thread worker for top-up #%d", topup_id)
        return f"thread-{topup_id}"

