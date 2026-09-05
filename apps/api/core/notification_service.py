import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import Notification
from support.models import NotificationPreference

logger = logging.getLogger(__name__)

User = get_user_model()

# Audiences an admin broadcast can target. Each maps to a concrete queryset in
# resolve_audience(); nothing here can address a group the backend cannot build.
AUDIENCE_CHOICES = (
    ('all', 'Everyone'),
    ('students', 'All Students'),
    ('teachers', 'All Teachers'),
    ('admins', 'Admins'),
    ('course', 'Students Enrolled in a Course'),
    ('individual', 'Specific Users'),
)


class NotificationBroadcastError(Exception):
    """Raised when an audience cannot be resolved into real recipients."""


# Student notification center filter tabs -> the underlying Notification.type
# values each bucket covers. Deliberately just the tabs the student UI needs
# (All / Unread / Important / Exam / Learning / Achievement / System) rather
# than one tab per `type` — "Important" is priority-based, not type-based,
# and is handled separately by the view. Anything not explicitly bucketed
# below (payment, support, announcement, feedback, account, ...) falls under
# 'system', which doubles as the catch-all tab.
NOTIFICATION_CATEGORY_MAP = {
    'exam': ['exam', 'result', 'evaluation'],
    'learning': ['practice', 'course', 'study_plan'],
    'achievement': ['gamification'],
    'payments': ['payment'],
    'orders': ['order', 'marketplace'],
    'community': ['community'],
}


# notif_type -> the NotificationPreference boolean that gates it, for the
# student-facing event types added alongside this map. Teacher-facing types
# keep using their own preference_key argument passed explicitly, as before.
_STUDENT_PREFERENCE_KEY = {
    'exam': 'exam_reminders',
    'result': 'result_published',
    'study_plan': 'study_plan_reminders',
    'practice': 'practice_reminders',
    'gamification': 'daily_progress',
}


class NotificationService:
    @staticmethod
    def _student_notify_once(recipient, notif_type, related_id, title, message, action_url=None, priority='normal'):
        """Create a student-facing notification exactly once per (recipient,
        type, related_id) — the idempotency key event-triggered notifications
        need so a retried request or a re-run job never duplicates a row.

        Also gated on the two AdminSettings kill switches and the student's
        own NotificationPreference for this category, same as
        _create_if_allowed. Returns the created Notification, or None if it
        was skipped (already exists, or the recipient opted out).
        """
        from .models import AdminSettings

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return None

        related_id = str(related_id) if related_id is not None else None
        if related_id and Notification.objects.filter(
            recipient=recipient, type=notif_type, related_id=related_id
        ).exists():
            return None

        preference_key = _STUDENT_PREFERENCE_KEY.get(notif_type)
        if preference_key:
            prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)
            if not getattr(prefs, preference_key, True):
                return None

        return Notification.objects.create(
            recipient=recipient,
            type=notif_type,
            related_id=related_id,
            title=title,
            message=message,
            action_url=action_url,
            priority=priority,
        )

    @staticmethod
    def _create_if_allowed(recipient, notif_type, preference_key, title, message, action_url, priority='normal'):
        """Helper to check preferences and create a notification."""
        from .models import AdminSettings
        admin_settings = AdminSettings.get_settings()

        # Global admin kill switches, checked before the per-user preference.
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return

        prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)

        # Check if in-app notification is enabled for this category
        is_allowed = getattr(prefs, preference_key, True)

        if is_allowed:
            Notification.objects.create(
                recipient=recipient,
                type=notif_type,
                title=title,
                message=message,
                action_url=action_url,
                priority=priority
            )
            # Real email dispatch (gated on admin_settings.enable_email_notifications)
            # lands with the email-sending setup - there is no email backend yet.

    @classmethod
    def notify_question_review(cls, teacher, question_title, status, feedback=None, action_url=None):
        title = "Question Requires Changes" if status == 'rejected' else "Question Approved"
        priority = 'important' if status == 'rejected' else 'normal'
        message = f"Your question '{question_title}' was {status}."
        if feedback:
            message += f" Feedback: {feedback}"
            
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='question_review',
            preference_key='question_reviews_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )

    @classmethod
    def notify_material_review(cls, teacher, material_title, status, feedback=None, action_url=None):
        title = "Study Material Requires Changes" if status == 'rejected' else "Study Material Approved"
        priority = 'important' if status == 'rejected' else 'normal'
        message = f"Your material '{material_title}' was {status}."
        if feedback:
            message += f" Feedback: {feedback}"
            
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='material_review',
            preference_key='study_material_reviews_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )

    @classmethod
    def notify_student_activity(cls, teacher, student_name, activity_type, action_url=None):
        title = "New Student Activity"
        message = f"Student {student_name} recently completed a {activity_type}."
        
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='student_activity',
            preference_key='student_activity_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal'
        )

    @classmethod
    def notify_order_status(cls, student, order_id, status_display, action_url=None):
        title = "Order Status Updated"
        message = f"Your order #{order_id} is now {status_display}."
        
        cls._create_if_allowed(
            recipient=student,
            notif_type='order',
            preference_key='system_alerts_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal'
        )

    @classmethod
    def notify_student_payment_submitted(cls, student, title_ref, amount, action_url=None):
        title = "Payment Submitted"
        message = f"Your payment of Rs. {amount} for '{title_ref}' has been submitted and is awaiting verification."
        
        cls._create_if_allowed(
            recipient=student,
            notif_type='payment',
            preference_key='system_alerts_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal'
        )

    @classmethod
    def notify_student_payment_approved(cls, student, title_ref, action_url=None):
        title = "Payment Verified"
        message = f"Your payment for '{title_ref}' has been verified successfully. Your order is confirmed."
        
        cls._create_if_allowed(
            recipient=student,
            notif_type='payment',
            preference_key='system_alerts_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='important'
        )

    @classmethod
    def notify_student_payment_rejected(cls, student, title_ref, reason, action_url=None):
        title = "Payment Verification Failed"
        message = f"Your payment for '{title_ref}' was rejected. Reason: {reason}"
        
        cls._create_if_allowed(
            recipient=student,
            notif_type='payment',
            preference_key='system_alerts_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='critical'
        )

    @classmethod
    def notify_subscription_expiring_soon(cls, days_ahead=7):
        """Periodic job (see subscriptions/tasks.py + backend/celery.py):
        one notification per ACTIVE Subscription whose expiry_date falls
        within the next `days_ahead` days. Mirrors notify_exams_starting_soon's
        shape - the related_id dedupe means running this daily as an
        expiry approaches never sends more than one row per subscription."""
        from .models import AdminSettings
        from subscriptions.models import Subscription

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return 0

        now = timezone.now()
        soon = now + timedelta(days=days_ahead)
        expiring = Subscription.objects.filter(
            status='ACTIVE', expiry_date__gt=now, expiry_date__lte=soon,
        ).select_related('student', 'plan')

        sent = 0
        for subscription in expiring:
            result = cls._student_notify_once(
                recipient=subscription.student,
                notif_type='payment',
                related_id=f'subscription-expiring:{subscription.id}',
                title='Package Expiring Soon',
                message=(
                    f'Your "{subscription.plan.name}" package expires on '
                    f'{timezone.localtime(subscription.expiry_date).strftime("%B %d, %Y")}. '
                    f'Renew to keep your access.'
                ),
                action_url='/student/purchases',
                priority='important',
            )
            if result:
                sent += 1
        return sent

    @classmethod
    def notify_subscription_expired(cls):
        """Periodic job counterpart to notify_subscription_expiring_soon:
        one notification per ACTIVE Subscription whose expiry_date has
        already passed. Does not mutate Subscription.status - is_active /
        subscriptions.access.has_active_subscription already do a live date
        comparison, so status is never a second source of truth to drift."""
        from .models import AdminSettings
        from subscriptions.models import Subscription

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return 0

        now = timezone.now()
        expired = Subscription.objects.filter(
            status='ACTIVE', expiry_date__lte=now,
        ).select_related('student', 'plan')

        sent = 0
        for subscription in expired:
            result = cls._student_notify_once(
                recipient=subscription.student,
                notif_type='payment',
                related_id=f'subscription-expired:{subscription.id}',
                title='Package Expired',
                message=f'Your "{subscription.plan.name}" package has expired. Renew to restore your access.',
                action_url='/student/purchases',
                priority='important',
            )
            if result:
                sent += 1
        return sent

    @classmethod
    def notify_admins_schedule_change(cls, schedule, event_type="updated"):
        """Notify administrators when an official exam schedule is published/changed."""
        admins = User.objects.filter(is_staff=True, is_active=True)
        title = f"Official Exam Schedule {event_type.capitalize()}"
        message = f"Loksewa schedule '{schedule.title}' set for {schedule.exam_date} has been {event_type}."
        for admin in admins:
            cls._create_if_allowed(
                recipient=admin,
                notif_type='system',
                preference_key='system_alerts_inapp',
                title=title,
                message=message,
                action_url='/admin-dashboard/exams/schedules',
                priority='normal'
            )

    @classmethod
    def notify_admins_mock_exam_schedule(cls, examination, event_type="published"):
        """Notify administrators when a mock exam schedule is updated or published."""
        admins = User.objects.filter(is_staff=True, is_active=True)
        title = f"Mock Exam {event_type.capitalize()}"
        start_str = examination.start_time.strftime('%Y-%m-%d %H:%M') if examination.start_time else 'immediate'
        message = f"Mock Exam '{examination.title}' scheduled for {start_str} has been {event_type}."
        for admin in admins:
            cls._create_if_allowed(
                recipient=admin,
                notif_type='system',
                preference_key='system_alerts_inapp',
                title=title,
                message=message,
                action_url='/admin-dashboard/exams',
                priority='normal'
            )


    @classmethod
    def notify_system_alert(cls, teacher, title, message, action_url=None, priority='critical'):
        # System alerts in-app are required, no preference check for creation
        Notification.objects.create(
            recipient=teacher,
            type='system',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )

    @classmethod
    def notify_admins(cls, notif_type, title, message, action_url=None, priority='normal', dedupe_minutes=None):
        """Fan a real system event (a payment to verify, content to review, an
        answer to grade...) out to every active admin. Still gated on the two
        platform-wide kill switches, but - like system alerts - not on a
        per-admin preference row, since these are the events an admin
        dashboard's own "Pending" queues are built from.

        dedupe_minutes: if set, skip creating this notification when an
        identical one (same type + title) was already sent to admins within
        that many minutes. Meant for events that can repeat on every request
        during an outage (e.g. an external provider going down) so admins get
        one alert per incident, not one row per failed request.
        """
        from .models import AdminSettings

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return

        if dedupe_minutes is not None:
            cutoff = timezone.now() - timedelta(minutes=dedupe_minutes)
            already_alerted = Notification.objects.filter(
                type=notif_type, title=title, created_at__gte=cutoff,
                recipient__role__in=['admin', 'super-admin'],
            ).exists()
            if already_alerted:
                return

        admins = resolve_audience('admins')
        Notification.objects.bulk_create([
            Notification(
                recipient=admin,
                type=notif_type,
                title=title,
                message=message,
                action_url=action_url,
                priority=priority,
            )
            for admin in admins
        ])

    @classmethod
    def notify_system_failure(cls, component, detail, action_url=None, priority='critical', dedupe_minutes=15):
        """Throttled admin alert for a genuine backend/infrastructure failure
        (a storage provider erroring out, the AI provider going down...).

        Deliberately reuses notify_admins' dedupe_minutes rather than
        introducing a queue or aggregation table: the first failure in a
        window reaches admins immediately, repeats of the *same* failure
        within the window are silently absorbed, and the next window's first
        occurrence alerts again - so an ongoing outage stays visible without
        flooding the inbox with one row per failed request.
        """
        title = f"{component} Failure"
        cls.notify_admins(
            notif_type='system',
            title=title,
            message=detail[:500],
            action_url=action_url,
            priority=priority,
            dedupe_minutes=dedupe_minutes,
        )

    # ── Student-facing event notifications ──────────────────────────────
    # Priority mapping note: the product spec asks for a 4-tier LOW/NORMAL/
    # HIGH/URGENT scale, but Notification.PRIORITY_CHOICES (already used by
    # the teacher/admin side) only has normal/important/critical. Rather than
    # add a 4th value nothing else uses, these methods reuse the existing
    # scale: LOW and NORMAL both map to 'normal', HIGH maps to 'important',
    # URGENT maps to 'critical'.

    EXAM_UPDATE_COPY = {
        'published': (
            'normal',
            'New Mock Exam Available',
            lambda exam: f'"{exam.title}" is now available. Test your preparation.',
        ),
        'cancelled': (
            'critical',
            'Exam Cancelled',
            lambda exam: f'"{exam.title}" has been cancelled. We apologize for the inconvenience.',
        ),
        'schedule_changed': (
            'important',
            'Exam Schedule Changed',
            lambda exam: (
                f'The schedule for "{exam.title}" has changed'
                + (f", it is now set for {exam.start_time.strftime('%Y-%m-%d %H:%M')}." if exam.start_time else '.')
            ),
        ),
    }

    @classmethod
    def notify_students_exam_update(cls, examination, event_type):
        """Notify the students an exam is relevant to that it was published,
        cancelled, or had its schedule changed. Audience is the exam's
        enrolled course when it has one, otherwise every active student —
        deliberately simpler than full ExaminationEligibility resolution,
        which the admin exam list itself doesn't consult for audience either.

        One row per (student, event_type, examination) — re-publishing or a
        retried request never duplicates a delivered notification.
        """
        from .models import AdminSettings

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return 0

        copy = cls.EXAM_UPDATE_COPY.get(event_type)
        if not copy:
            return 0
        priority, title, message_fn = copy

        if examination.course_id:
            students = resolve_audience('course', course_id=examination.course_id)
        else:
            students = resolve_audience('students')

        student_ids = list(students.values_list('id', flat=True))
        if not student_ids:
            return 0

        related_id = f'exam-{event_type}:{examination.id}'
        if event_type == 'schedule_changed':
            # Each distinct new start_time is its own event — a second,
            # different reschedule must still notify students — while a
            # retried request with the same new start_time stays deduped.
            stamp = examination.start_time.isoformat() if examination.start_time else 'none'
            related_id = f'{related_id}:{stamp}'
        already = set(
            Notification.objects.filter(
                type='exam', related_id=related_id, recipient_id__in=student_ids
            ).values_list('recipient_id', flat=True)
        )
        opted_out = set(
            NotificationPreference.objects.filter(
                user_id__in=student_ids, exam_reminders=False
            ).values_list('user_id', flat=True)
        )

        rows = [
            Notification(
                recipient_id=sid,
                type='exam',
                related_id=related_id,
                title=title,
                message=message_fn(examination),
                action_url=f'/student/exams/{examination.id}',
                priority=priority,
            )
            for sid in student_ids
            if sid not in already and sid not in opted_out
        ]
        Notification.objects.bulk_create(rows, batch_size=500)
        return len(rows)

    @classmethod
    def notify_exams_starting_soon(cls, window_minutes=30):
        """Periodic job: one "starting soon" notification per (student, exam)
        for every published exam whose start_time falls within the next
        `window_minutes`. Meant to be called every few minutes by Celery beat
        (see exams/tasks.py) — the related_id dedupe means running it
        repeatedly as an exam approaches never sends more than one row per
        student per exam.
        """
        from .models import AdminSettings
        from exams.models import Examination

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return 0

        now = timezone.now()
        soon = now + timedelta(minutes=window_minutes)
        exams = Examination.objects.filter(
            status='published', start_time__gt=now, start_time__lte=soon,
        ).exclude(objective_category='old_past')

        total = 0
        for examination in exams:
            if examination.course_id:
                students = resolve_audience('course', course_id=examination.course_id)
            else:
                students = resolve_audience('students')
            student_ids = list(students.values_list('id', flat=True))
            if not student_ids:
                continue

            related_id = f'exam-starting-soon:{examination.id}'
            already = set(
                Notification.objects.filter(
                    type='exam', related_id=related_id, recipient_id__in=student_ids
                ).values_list('recipient_id', flat=True)
            )
            opted_out = set(
                NotificationPreference.objects.filter(
                    user_id__in=student_ids, exam_starting_soon=False
                ).values_list('user_id', flat=True)
            )
            rows = [
                Notification(
                    recipient_id=sid,
                    type='exam',
                    related_id=related_id,
                    title='Exam Starting Soon',
                    message=(
                        f'"{examination.title}" starts at '
                        f'{timezone.localtime(examination.start_time).strftime("%H:%M")} today. Be ready!'
                    ),
                    action_url=f'/student/exams/{examination.id}',
                    priority='important',
                )
                for sid in student_ids
                if sid not in already and sid not in opted_out
            ]
            Notification.objects.bulk_create(rows, batch_size=500)
            total += len(rows)
        return total

    @classmethod
    def notify_result_published(cls, attempt):
        """Objective exam result ready. Skipped for result_visibility='manual'
        exams — nothing in the codebase currently transitions an
        ExaminationAttempt to 'evaluated' (manual review isn't wired up for
        objective exams yet), so firing here would be premature."""
        examination = attempt.examination
        if examination.result_visibility == 'manual':
            return None

        message = f'Your result for "{examination.title}" is ready — you scored {attempt.percentage}%.'
        if attempt.passed:
            message += ' Congratulations, you passed!'

        return cls._student_notify_once(
            recipient=attempt.student,
            notif_type='result',
            related_id=f'result:{attempt.id}',
            title='Result Published',
            message=message,
            action_url=f'/student/exams/{examination.id}/result/{attempt.id}',
            priority='important',
        )

    @classmethod
    def notify_subjective_evaluated(cls, evaluation):
        """A teacher/admin finished grading one subjective answer."""
        student = evaluation.answer.attempt.student
        return cls._student_notify_once(
            recipient=student,
            notif_type='result',
            related_id=f'subjective-eval:{evaluation.id}',
            title='Answer Evaluated',
            message='One of your subjective answers has been evaluated. Your feedback and marks are ready.',
            action_url=f'/student/subjective/evaluation/{evaluation.id}',
            priority='important',
        )

    @classmethod
    def notify_study_plan_created(cls, plan):
        return cls._student_notify_once(
            recipient=plan.student,
            notif_type='study_plan',
            related_id=f'plan-created:{plan.id}',
            title='Study Plan Created',
            message="Your personalized study plan is ready. Check today's tasks to get started.",
            action_url='/student/study-plan',
            priority='normal',
        )

    STREAK_MILESTONES = (3, 7, 14, 30, 60, 100, 180, 365)

    @classmethod
    def notify_streak_milestone(cls, user, streak_days):
        """Only fires on an exact milestone value — never on every day of a
        streak, so a 45-day streak stays silent between the 30 and 60 marks."""
        if streak_days not in cls.STREAK_MILESTONES:
            return None
        return cls._student_notify_once(
            recipient=user,
            notif_type='gamification',
            related_id=f'streak:{streak_days}',
            title=f'{streak_days}-Day Streak!',
            message=f"You've studied for {streak_days} consecutive days. Keep the momentum going!",
            action_url='/student/study-plan',
            priority='normal',
        )

    @classmethod
    def notify_level_up(cls, user, level):
        return cls._student_notify_once(
            recipient=user,
            notif_type='gamification',
            related_id=f'level:{level}',
            title='Level Up!',
            message=f'You reached Level {level}. Keep going!',
            action_url='/student',
            priority='normal',
        )

    # ── S2S Marketplace notifications ────────────────────────────────────────

    @classmethod
    def notify_listing_submitted(cls, seller, product):
        """Seller submitted a listing — awaiting admin review."""
        return cls._student_notify_once(
            recipient=seller,
            notif_type='system',
            related_id=f'listing-submitted:{product.id}',
            title='Listing Submitted for Review',
            message=f'Your listing "{product.title}" has been submitted and is awaiting admin review.',
            action_url='/student/marketplace-listings',
            priority='normal',
        )

    @classmethod
    def notify_listing_approved(cls, seller, product):
        """Admin approved the seller's listing — it is now live."""
        return cls._student_notify_once(
            recipient=seller,
            notif_type='system',
            related_id=f'listing-approved:{product.id}',
            title='Listing Approved — Now Live!',
            message=f'Your listing "{product.title}" has been approved and is now visible in the marketplace.',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_listing_rejected(cls, seller, product, reason=''):
        """Admin rejected the seller's listing."""
        msg = f'Your listing "{product.title}" was rejected.'
        if reason:
            msg += f' Reason: {reason}'
        return cls._student_notify_once(
            recipient=seller,
            notif_type='system',
            related_id=f'listing-rejected:{product.id}',
            title='Listing Needs Changes',
            message=msg,
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_book_sold(cls, seller, order):
        """A buyer placed an order containing the seller's product."""
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Your Book Was Purchased!',
            message=(
                f'A buyer has ordered one of your listings (Order #{order.id}). '
                f'Payment is awaiting verification.'
            ),
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_seller_payment_confirmed(cls, seller, order_id):
        """Payment for a seller's book has been confirmed by admin."""
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payment Confirmed — Prepare Shipment',
            message=(
                f'Payment for Order #{order_id} has been verified. '
                f'Please prepare the book for shipment.'
            ),
            action_url='/student/marketplace-listings',
            priority='important',
        )


    @classmethod
    def notify_review_received(cls, seller, product, rating):
        """Seller received a review from a buyer."""
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='New Review Received',
            message=f'A buyer left a {rating}-star review on "{product.title}".',
            action_url='/student/marketplace-listings',
            priority='normal',
        )

    @classmethod
    def notify_dispute_opened(cls, seller, product):
        """Buyer opened a dispute against a seller's item."""
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Dispute Opened on Your Sale',
            message=f'A buyer opened a dispute for "{product.title}". Payout is currently ON HOLD pending admin review.',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_dispute_status_changed(cls, student, product, status):
        """Admin changed dispute status."""
        return cls._create_if_allowed(
            recipient=student,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Dispute Status Updated',
            message=f'The dispute for "{product.title}" is now: {status}.',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_payout_held(cls, seller, order_id):
        """Seller payout held due to a dispute."""
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout On Hold',
            message=f'Your payout for Order #{order_id} is on hold due to an open dispute.',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_payout_requested(cls, seller, amount):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Request Submitted',
            message=f'Your payout request for Rs. {amount} has been submitted and is pending admin review.',
            action_url='/student/marketplace-listings',
            priority='normal',
        )

    @classmethod
    def notify_payout_approved(cls, seller, amount):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Request Approved',
            message=f'Your payout request for Rs. {amount} has been approved and will be processed soon.',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_payout_processing(cls, seller, amount):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Processing',
            message=f'Your payout for Rs. {amount} is being processed.',
            action_url='/student/marketplace-listings',
            priority='normal',
        )

    @classmethod
    def notify_payout_paid(cls, seller, amount, method, reference):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Completed',
            message=f'Your payout of Rs. {amount} via {method} has been completed. Ref: {reference}',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_payout_rejected(cls, seller, amount, reason):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Request Rejected',
            message=f'Your payout request for Rs. {amount} was rejected. Reason: {reason}',
            action_url='/student/marketplace-listings',
            priority='important',
        )

    @classmethod
    def notify_payout_failed(cls, seller, amount, reason):
        return cls._create_if_allowed(
            recipient=seller,
            notif_type='system',
            preference_key='system_alerts_inapp',
            title='Payout Failed',
            message=f'We encountered an issue processing your payout of Rs. {amount}. Reason: {reason}',
            action_url='/student/marketplace-listings',
            priority='critical',
        )

    # ── Community Q&A notifications ──────────────────────────────────────

    @classmethod
    def notify_community_reply(cls, post, reply):
        """A new reply landed on someone's post. Never fires for a
        self-reply (asking your own question a follow-up doesn't need a
        notification), and is deduped per (post author, reply) so a retried
        request can't double-notify."""
        if post.author_id == reply.author_id:
            return None
        return cls._student_notify_once(
            recipient=post.author,
            notif_type='community',
            related_id=f'community-reply:{reply.id}',
            title='New Reply to Your Post',
            message=f'{reply.author.get_full_name() or reply.author.username} replied to "{post.title}".',
            action_url=f'/student/community/{post.id}',
            priority='normal',
        )

    @classmethod
    def notify_community_best_answer(cls, reply):
        """The reply author's answer was marked Best Answer."""
        return cls._student_notify_once(
            recipient=reply.author,
            notif_type='community',
            related_id=f'community-best-answer:{reply.id}',
            title='Your Answer Was Marked Best Answer!',
            message=f'Your reply on "{reply.post.title}" was marked as the best answer.',
            action_url=f'/student/community/{reply.post_id}',
            priority='important',
        )

    @classmethod
    def notify_community_content_removed(cls, user, title, action_url):
        """Transparency notice when a moderator removes a user's post/reply."""
        return cls._create_if_allowed(
            recipient=user,
            notif_type='community',
            preference_key='system_alerts_inapp',
            title='Community Content Removed',
            message=f'Your post/reply "{title}" was removed by a moderator for violating community guidelines.',
            action_url=action_url,
            priority='important',
        )


# ── Admin broadcast fan-out ──────────────────────────────────────────────────
# AdminNotification is the campaign record; core.Notification is the per-user
# delivery row the Student Portal already reads. These helpers connect the two,
# which previously nothing did.

def resolve_audience(audience, *, course_id=None, user_ids=None):
    """Turn an audience choice into the queryset of real recipients.

    Recipient selection happens here, in the database — never in the client.
    """
    audience = (audience or '').strip().lower()
    active = User.objects.filter(is_active=True)

    if audience == 'all':
        return active
    if audience == 'students':
        return active.filter(role='student')
    if audience == 'teachers':
        return active.filter(role='teacher')
    if audience == 'admins':
        return active.filter(role__in=['admin', 'super-admin'])

    if audience == 'course':
        if not course_id:
            raise NotificationBroadcastError('Select a course for a course audience.')
        return active.filter(
            role='student',
            enrollments__course_id=course_id,
            enrollments__status='active',
        ).distinct()

    if audience == 'individual':
        if not user_ids:
            raise NotificationBroadcastError('Select at least one recipient.')
        return active.filter(id__in=user_ids)

    raise NotificationBroadcastError(f"Unsupported audience: {audience}")


# AdminNotification.type -> core.Notification.type, so a delivered row carries a
# category the student UI already understands.
_ADMIN_TYPE_MAP = {
    'alert': 'system',
    'system': 'system',
    'announcement': 'announcement',
}


@transaction.atomic
def broadcast_admin_notification(admin_notification, *, course_id=None, user_ids=None):
    """Fan an AdminNotification out to its recipients and mark it sent.

    Returns the number of delivery rows created. Runs in one transaction so a
    campaign is never left half-delivered.
    """
    recipients = resolve_audience(
        admin_notification.target_role, course_id=course_id, user_ids=user_ids
    )

    # Re-sending would duplicate rows, so skip anyone already delivered to.
    already = set(
        Notification.objects.filter(source_admin_notification=admin_notification)
        .values_list('recipient_id', flat=True)
    )

    notif_type = _ADMIN_TYPE_MAP.get(admin_notification.type, 'announcement')

    # values_list + iterator keeps a large broadcast off the Python heap.
    rows = [
        Notification(
            recipient_id=user_id,
            source_admin_notification=admin_notification,
            type=notif_type,
            title=admin_notification.title,
            message=admin_notification.content,
            priority='important' if admin_notification.type == 'alert' else 'normal',
        )
        for user_id in recipients.values_list('id', flat=True).iterator()
        if user_id not in already
    ]

    # One INSERT rather than one per recipient.
    Notification.objects.bulk_create(rows, batch_size=500)

    admin_notification.recipient_count = (
        Notification.objects.filter(source_admin_notification=admin_notification).count()
    )
    admin_notification.status = 'sent'
    admin_notification.sent_at = timezone.now()
    admin_notification.save(update_fields=['recipient_count', 'status', 'sent_at', 'updated_at'])

    return len(rows)


def delivery_stats(admin_notification):
    """Real read/unread counts for a campaign, from its delivery rows."""
    deliveries = Notification.objects.filter(source_admin_notification=admin_notification)
    total = deliveries.count()
    read = deliveries.filter(is_read=True).count()
    return {
        'recipient_count': total,
        'read_count': read,
        'unread_count': total - read,
        'read_rate': round((read / total) * 100, 2) if total else 0.0,
    }


def dispatch_due_scheduled_notifications():
    """Delivers every AdminNotification whose scheduled_for time has arrived.

    Scheduling one (AdminNotificationsCreateView with delivery='schedule')
    only ever stored status='scheduled' + scheduled_for - nothing delivered
    it automatically, so an admin had to remember to come back and press
    "Send" themselves at the right time, which defeats the point of
    scheduling. This is the periodic job that actually closes that loop;
    see backend/celery.py's beat schedule and core/tasks.py for where it's
    invoked from.

    Returns a list of {id, title, delivered} for whatever it just sent, and
    logs (not raises) anything that fails to broadcast - one bad campaign
    must not block the rest of the batch.
    """
    from .models import AdminNotification

    due = AdminNotification.objects.filter(
        status='scheduled', scheduled_for__lte=timezone.now()
    )

    results = []
    for notification in due:
        try:
            delivered = broadcast_admin_notification(notification)
            results.append({'id': notification.id, 'title': notification.title, 'delivered': delivered})
        except NotificationBroadcastError:
            logger.exception(
                "Scheduled notification %s could not be delivered - its audience no longer resolves.",
                notification.id,
            )
            notification.status = 'failed'
            notification.save(update_fields=['status', 'updated_at'])
        except Exception:
            logger.exception("Scheduled notification %s failed to send.", notification.id)
            notification.status = 'failed'
            notification.save(update_fields=['status', 'updated_at'])

    return results
