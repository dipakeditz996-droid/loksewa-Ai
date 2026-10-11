"""Central Entitlement Service: Canonical service determining effective
package benefits, course access, exam quotas, AI tutor allowances,
and auditable consumption tracking for LoksewaAI.
"""

from typing import Dict, Any, Optional, Tuple
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from core.models import User, AdminSettings
from courses.services.course_access_service import CourseAccessService
from .models import (
    Subscription, SubscriptionPlan, StudentEntitlement, UsageLedger
)
from .access import has_admin_granted_access


class EntitlementService:
    """The authoritative engine for package entitlement and quota enforcement."""

    @classmethod
    def get_active_subscription(cls, user: User) -> Optional[Subscription]:
        """Returns the student's active Subscription, supporting both optional
        duration-based expiry and quota-based / lifetime subscriptions."""
        if not user or not user.is_authenticated:
            return None

        now = timezone.now()
        # Find active subscriptions: either expiry_date is null (quota-only) or expiry_date > now
        subs = (
            Subscription.objects.filter(student=user, status='ACTIVE')
            .filter(expiry_date__isnull=True)
            .select_related('plan')
            .order_by('-created_at')
        )
        first_sub = subs.first()
        if first_sub:
            return first_sub

        # Or duration-based active subscription
        return (
            Subscription.objects.filter(
                student=user, status='ACTIVE', expiry_date__gt=now
            )
            .select_related('plan')
            .order_by('-expiry_date')
            .first()
        )

    @classmethod
    def _parse_cat_quota(cls, quotas: Optional[dict], cat: str) -> Tuple[bool, int]:
        """Safely extracts (enabled, attempts) for exam categories from diverse JSON structures."""
        if not quotas or not isinstance(quotas, dict):
            return True, -1
        raw = quotas.get(cat)
        if raw is None:
            raw = quotas.get(cat.lower())
        if raw is None:
            raw = quotas.get(cat.upper())
        if raw is None:
            return True, -1
        if isinstance(raw, dict):
            enabled = raw.get('enabled', True)
            attempts = raw.get('attempts', -1) if enabled else 0
            return enabled, attempts
        elif isinstance(raw, (int, float)):
            return raw != 0, int(raw)
        return True, -1

    @classmethod
    def get_effective_entitlements(cls, user: User) -> Dict[str, Any]:
        """Resolves the complete, real-time entitlement state for `user`."""
        if not user or not user.is_authenticated:
            return {
                "has_active_package": False,
                "is_admin_granted": False,
                "plan": None,
                "subscription": None,
                "courses": [],
                "notes": {"access_type": "NONE", "can_download": False},
                "exams": {},
                "ai_tutor": {"enabled": False, "remaining_credits": 0, "daily_remaining": 0},
                "practice": {"enabled": False, "remaining": 0},
                "usage_history": [],
            }

        is_admin_granted = has_admin_granted_access(user)
        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None

        # Accessible courses via CourseAccessService
        accessible_courses = CourseAccessService.get_accessible_courses(user)
        courses_data = [
            {"id": c.id, "title": c.title, "slug": c.slug, "exam_id": c.exam_id}
            for c in accessible_courses
        ]

        # Entitlements map from StudentEntitlement table
        entitlements_qs = StudentEntitlement.objects.filter(student=user)
        entitlements_by_feature = {e.feature: e for e in entitlements_qs}

        # Categories
        exam_categories = ['past_year', 'model', 'live', 'topicwise', 'mock']
        exams_status = {}
        for cat in exam_categories:
            key = f"exam:{cat}"
            ent = entitlements_by_feature.get(key)
            if ent:
                exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": ent.total_allowed,
                    "consumed": ent.consumed,
                    "reserved": ent.reserved,
                    "remaining": ent.remaining,
                    "is_unlimited": ent.is_unlimited,
                }
            elif plan:
                enabled, attempts = cls._parse_cat_quota(plan.exam_quotas, cat)
                exams_status[cat] = {
                    "enabled": enabled,
                    "total_allowed": attempts,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": attempts,
                    "is_unlimited": attempts == -1,
                }
            elif is_admin_granted:
                exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": -1,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": -1,
                    "is_unlimited": True,
                }
            else:
                exams_status[cat] = {
                    "enabled": False,
                    "total_allowed": 0,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": 0,
                    "is_unlimited": False,
                }

        # AI Tutor status
        ai_ent = entitlements_by_feature.get('ai_credits')
        from ai_tutor.models import TutorUsage
        import datetime
        today_usage = TutorUsage.objects.filter(student=user, date=datetime.date.today()).first()
        today_reqs = today_usage.request_count if today_usage else 0

        admin_settings = AdminSettings.get_settings()
        daily_limit = plan.ai_daily_limit if (plan and plan.ai_daily_limit > 0) else getattr(admin_settings, 'ai_tutor_daily_message_limit', 20)
        daily_remaining = max(0, daily_limit - today_reqs)

        ai_status = {
            "enabled": (plan.ai_tutor_enabled if plan else True) and admin_settings.enable_ai_tutor,
            "total_credits": ai_ent.total_allowed if ai_ent else (plan.ai_credits if plan else -1 if is_admin_granted else 0),
            "consumed_credits": ai_ent.consumed if ai_ent else 0,
            "remaining_credits": ai_ent.remaining if ai_ent else (plan.ai_credits if plan else -1 if is_admin_granted else 0),
            "is_unlimited": (ai_ent.is_unlimited if ai_ent else (plan.ai_credits == -1 if plan else is_admin_granted)),
            "daily_limit": daily_limit,
            "daily_consumed": today_reqs,
            "daily_remaining": daily_remaining,
        }

        # Practice
        prac_ent = entitlements_by_feature.get('practice_questions')
        practice_status = {
            "enabled": plan.practice_enabled if plan else True,
            "total_allowed": prac_ent.total_allowed if prac_ent else (plan.practice_question_limit if plan else -1),
            "consumed": prac_ent.consumed if prac_ent else 0,
            "remaining": prac_ent.remaining if prac_ent else (plan.practice_question_limit if plan else -1),
            "is_unlimited": (prac_ent.is_unlimited if prac_ent else (plan.practice_question_limit == -1 if plan else True)),
        }

        # Notes access
        notes_access = {
            "access_type": plan.notes_access_type if plan else ("ALL" if is_admin_granted else "NONE"),
            "can_download": plan.can_download_notes if plan else (True if is_admin_granted else False),
        }

        # Subscription metadata
        sub_data = None
        if active_sub:
            remaining_days = None
            if active_sub.expiry_date:
                diff = (active_sub.expiry_date - timezone.now()).days
                remaining_days = max(diff, 0)

            sub_data = {
                "id": active_sub.id,
                "plan_id": active_sub.plan_id,
                "plan_name": active_sub.plan.name,
                "status": active_sub.status,
                "source": active_sub.source,
                "has_expiry": active_sub.has_expiry,
                "expiry_date": active_sub.expiry_date.isoformat() if active_sub.expiry_date else None,
                "remaining_days": remaining_days,
            }

        plan_data = None
        if plan:
            plan_data = {
                "id": plan.id,
                "name": plan.name,
                "slug": plan.slug,
                "price": str(plan.price),
                "badge": plan.badge,
                "package_type": plan.package_type,
                "course_access_type": plan.course_access_type,
                "has_expiry": plan.has_expiry,
                "duration": plan.duration,
                "duration_unit": plan.duration_unit,
                "features": plan.features or [],
            }

        # Recent ledger history (last 10 events)
        recent_ledger = list(
            UsageLedger.objects.filter(student=user)
            .values('id', 'feature', 'event_type', 'amount', 'reference_id', 'reason', 'created_at')[:10]
        )

        return {
            "has_active_package": active_sub is not None or is_admin_granted,
            "is_admin_granted": is_admin_granted,
            "subscription": sub_data,
            "plan": plan_data,
            "courses": courses_data,
            "notes": notes_access,
            "exams": exams_status,
            "ai_tutor": ai_status,
            "practice": practice_status,
            "usage_history": recent_ledger,
        }

    # =========================================================================
    # EXAM ACCESS & QUOTA OPERATIONS
    # =========================================================================

    @classmethod
    def check_exam_access(cls, user: User, examination) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Determines whether `user` can take `examination`.
        Returns (is_allowed, reason, quota_info).
        """
        if not user or not user.is_authenticated:
            return False, "Authentication required.", {}

        if CourseAccessService.is_privileged(user):
            return True, "Privileged user access granted.", {"is_unlimited": True, "remaining": -1}

        # 1. Global Platform-wide Free Exam
        if getattr(examination, 'is_free', False):
            return True, "Free exam available to all students.", {"is_unlimited": True, "remaining": -1}

        is_admin_granted = has_admin_granted_access(user)
        active_sub = cls.get_active_subscription(user)

        if not active_sub and not is_admin_granted:
            # Check platform enforcement
            if not AdminSettings.get_settings().enforce_subscription_access:
                return True, "Subscription access enforcement currently disabled.", {"is_unlimited": True, "remaining": -1}
            return False, "An active preparation package is required to attempt this exam.", {
                "upgrade_url": "/student/plans", "feature": "subscription_required"
            }

        plan = active_sub.plan if active_sub else None

        # 2. Check if this specific exam is configured as a Free Mock Exam in the student's plan
        if plan and plan.free_mock_exams.filter(id=examination.id).exists():
            return True, "Exam is included free in your package.", {"is_unlimited": True, "remaining": -1}

        # 3. Check Course Access for course-specific examinations
        if examination.course_id:
            if not CourseAccessService.has_course_access(user, examination.course_id):
                return False, "This examination requires enrollment in the associated course.", {
                    "upgrade_url": "/student/plans", "feature": "course_access"
                }

        # 4. Resolve Category Quota
        cat = examination.effective_category or 'mock'
        feature_key = f"exam:{cat}"

        enabled, default_attempts = cls._parse_cat_quota(plan.exam_quotas if plan else None, cat)
        if not enabled:
            default_attempts = 0

        entitlement, _ = StudentEntitlement.objects.get_or_create(
            student=user,
            feature=feature_key,
            defaults={
                'subscription': active_sub,
                'total_allowed': default_attempts if plan else (-1 if is_admin_granted else 0),
                'consumed': 0,
                'reserved': 0,
            }
        )

        if entitlement.is_unlimited:
            return True, "Unlimited attempts configured.", {"is_unlimited": True, "remaining": -1}

        if entitlement.remaining <= 0:
            return False, f"Attempt quota for {cat.replace('_', ' ').title()} Exams has been exhausted.", {
                "feature": feature_key,
                "remaining": 0,
                "total_allowed": entitlement.total_allowed,
                "upgrade_url": "/student/plans"
            }

        return True, "Quota available.", {
            "is_unlimited": False,
            "remaining": entitlement.remaining,
            "total_allowed": entitlement.total_allowed
        }

    @classmethod
    def check_and_reserve_exam_attempt(cls, user: User, examination, attempt_id: Optional[int] = None) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Concurrency-safe atomic check and attempt reservation.
        Prevents multiple simultaneous browser requests from exceeding quota.
        """
        if CourseAccessService.is_privileged(user) or getattr(examination, 'is_free', False):
            return True, "Exempt from quota consumption.", {}

        cat = examination.effective_category or 'mock'
        feature_key = f"exam:{cat}"

        with transaction.atomic():
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=feature_key)
                .first()
            )
            active_sub = cls.get_active_subscription(user)

            if not entitlement:
                plan = active_sub.plan if active_sub else None
                default_quota = (
                    plan.exam_quotas.get(cat, {}).get('attempts', -1)
                    if plan and plan.exam_quotas else -1 if has_admin_granted_access(user) else 0
                )
                entitlement = StudentEntitlement.objects.create(
                    student=user,
                    subscription=active_sub,
                    feature=feature_key,
                    total_allowed=default_quota,
                    consumed=0,
                    reserved=0,
                )

            if not entitlement.is_unlimited:
                if entitlement.remaining <= 0:
                    return False, f"Attempt quota for {cat.replace('_', ' ').title()} Exams exhausted.", {
                        "feature": feature_key, "remaining": 0, "upgrade_url": "/student/plans"
                    }

                # Reserve 1 attempt
                entitlement.reserved = F('reserved') + 1
                entitlement.save(update_fields=['reserved'])

            # Log to audit ledger
            UsageLedger.objects.create(
                student=user,
                subscription=active_sub,
                feature=feature_key,
                event_type='RESERVE',
                amount=1,
                reference_id=str(attempt_id) if attempt_id else f"exam_{examination.id}",
                reason=f"Reserved attempt for {examination.title}"
            )

        return True, "Attempt reserved.", {"feature": feature_key}

    @classmethod
    def consume_exam_attempt(cls, attempt) -> None:
        """
        Settles a reserved attempt upon exam submission.
        """
        examination = attempt.examination
        if getattr(examination, 'is_free', False):
            return

        cat = examination.effective_category or 'mock'
        feature_key = f"exam:{cat}"
        user = attempt.student

        with transaction.atomic():
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=feature_key)
                .first()
            )
            if not entitlement:
                return

            if not entitlement.is_unlimited:
                # Settle: reduce reserved, increment consumed
                new_reserved = max(0, entitlement.reserved - 1)
                entitlement.reserved = new_reserved
                entitlement.consumed = F('consumed') + 1
                entitlement.save(update_fields=['reserved', 'consumed'])
            else:
                entitlement.consumed = F('consumed') + 1
                entitlement.save(update_fields=['consumed'])

            UsageLedger.objects.create(
                student=user,
                subscription=entitlement.subscription,
                feature=feature_key,
                event_type='CONSUME',
                amount=1,
                reference_id=str(attempt.id),
                reason=f"Consumed attempt for {examination.title}"
            )

    @classmethod
    def release_exam_attempt(cls, attempt) -> None:
        """
        Releases a reservation if an attempt is cancelled or invalidated.
        """
        examination = attempt.examination
        cat = examination.effective_category or 'mock'
        feature_key = f"exam:{cat}"
        user = attempt.student

        with transaction.atomic():
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=feature_key)
                .first()
            )
            if not entitlement or entitlement.is_unlimited:
                return

            new_reserved = max(0, entitlement.reserved - 1)
            entitlement.reserved = new_reserved
            entitlement.save(update_fields=['reserved'])

            UsageLedger.objects.create(
                student=user,
                subscription=entitlement.subscription,
                feature=feature_key,
                event_type='RELEASE',
                amount=-1,
                reference_id=str(attempt.id),
                reason=f"Released reservation for {examination.title}"
            )

    # =========================================================================
    # AI TUTOR QUOTA & SETTLEMENT
    # =========================================================================

    @classmethod
    def check_ai_allowance(cls, user: User) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Verifies student has remaining AI Tutor credits and has not hit daily limits.
        """
        if CourseAccessService.is_privileged(user):
            return True, "Privileged access.", {"is_unlimited": True}

        admin_settings = AdminSettings.get_settings()
        if not admin_settings.enable_ai_tutor:
            return False, "AI Tutor is currently disabled by administrator.", {}

        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None

        if plan and not plan.ai_tutor_enabled:
            return False, "Your package does not include AI Tutor access.", {
                "upgrade_url": "/student/plans", "feature": "ai_tutor"
            }

        # Daily message / credit limit
        daily_limit = plan.ai_daily_limit if (plan and plan.ai_daily_limit > 0) else getattr(admin_settings, 'ai_tutor_daily_message_limit', 20)
        from ai_tutor.models import TutorUsage
        import datetime
        usage, _ = TutorUsage.objects.get_or_create(student=user, date=datetime.date.today())

        if usage.request_count >= daily_limit:
            return False, "Daily AI message limit reached. Please try again tomorrow.", {
                "remaining": 0, "daily_limit": daily_limit
            }

        # Total credit check if plan specifies non-unlimited credits
        if plan and plan.ai_credits > 0:
            ent = StudentEntitlement.objects.filter(student=user, feature='ai_credits').first()
            if ent and not ent.is_unlimited and ent.remaining <= 0:
                return False, "Your AI Tutor credits are exhausted.", {
                    "remaining": 0, "upgrade_url": "/student/plans"
                }

        return True, "AI allowance valid.", {"daily_remaining": max(0, daily_limit - usage.request_count)}

    @classmethod
    def consume_ai_credits(cls, user: User, tokens_used: int = 1, conversation_id: Optional[int] = None) -> None:
        """
        Records actual tokens / credit usage in ledger and increments daily count.
        """
        active_sub = cls.get_active_subscription(user)
        with transaction.atomic():
            ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature='ai_credits')
                .first()
            )
            if ent:
                ent.consumed = F('consumed') + tokens_used
                ent.save(update_fields=['consumed'])

            UsageLedger.objects.create(
                student=user,
                subscription=active_sub,
                feature='ai_credits',
                event_type='CONSUME',
                amount=tokens_used,
                reference_id=str(conversation_id) if conversation_id else '',
                reason=f"Consumed {tokens_used} AI tokens/credits"
            )

    # =========================================================================
    # ENTITLEMENT INITIALIZATION ON PACKAGE PURCHASE / GRANT
    # =========================================================================

    @classmethod
    def grant_plan_entitlements(cls, student: User, plan: SubscriptionPlan, subscription: Optional[Subscription] = None, admin_user: Optional[User] = None, reason: str = "") -> None:
        """
        Initializes or upgrades student's entitlements when a plan is purchased
        or granted by an administrator.
        """
        with transaction.atomic():
            # 1. Exam categories
            quotas = plan.exam_quotas or {}
            for cat in ['past_year', 'model', 'live', 'topicwise']:
                enabled, attempts = cls._parse_cat_quota(quotas, cat)
                if not enabled:
                    attempts = 0

                ent, created = StudentEntitlement.objects.get_or_create(
                    student=student,
                    feature=f"exam:{cat}",
                    defaults={
                        'subscription': subscription,
                        'total_allowed': attempts,
                        'consumed': 0,
                        'reserved': 0,
                        'reset_frequency': plan.reset_frequency,
                    }
                )
                if not created:
                    # Upgrade / update quota
                    ent.subscription = subscription
                    if attempts == -1 or ent.total_allowed == -1:
                        ent.total_allowed = -1
                    else:
                        ent.total_allowed = max(ent.total_allowed, attempts)
                    ent.save(update_fields=['subscription', 'total_allowed'])

                UsageLedger.objects.create(
                    student=student,
                    subscription=subscription,
                    feature=f"exam:{cat}",
                    event_type='GRANT',
                    amount=attempts,
                    reason=reason or f"Granted {plan.name} package",
                    admin_user=admin_user
                )

            # 2. AI Tutor credits
            ai_credits = plan.ai_credits
            ai_ent, created = StudentEntitlement.objects.get_or_create(
                student=student,
                feature='ai_credits',
                defaults={
                    'subscription': subscription,
                    'total_allowed': ai_credits,
                    'consumed': 0,
                    'reserved': 0,
                    'reset_frequency': plan.reset_frequency,
                }
            )
            if not created:
                ai_ent.subscription = subscription
                if ai_credits == -1 or ai_ent.total_allowed == -1:
                    ai_ent.total_allowed = -1
                else:
                    ai_ent.total_allowed = max(ai_ent.total_allowed, ai_credits)
                ai_ent.save(update_fields=['subscription', 'total_allowed'])

            UsageLedger.objects.create(
                student=student,
                subscription=subscription,
                feature='ai_credits',
                event_type='GRANT',
                amount=ai_credits,
                reason=reason or f"Granted {plan.name} AI credits",
                admin_user=admin_user
            )

            # 3. Practice questions
            prac_limit = plan.practice_question_limit
            prac_ent, created = StudentEntitlement.objects.get_or_create(
                student=student,
                feature='practice_questions',
                defaults={
                    'subscription': subscription,
                    'total_allowed': prac_limit,
                    'consumed': 0,
                    'reserved': 0,
                    'reset_frequency': plan.reset_frequency,
                }
            )
            if not created:
                prac_ent.subscription = subscription
                if prac_limit == -1 or prac_ent.total_allowed == -1:
                    prac_ent.total_allowed = -1
                else:
                    prac_ent.total_allowed = max(prac_ent.total_allowed, prac_limit)
                prac_ent.save(update_fields=['subscription', 'total_allowed'])

    @classmethod
    def admin_adjust_quota(cls, student: User, feature: str, delta: int, admin_user: User, reason: str) -> StudentEntitlement:
        """
        Allows administrator to adjust a student's quota with an auditable entry.
        """
        with transaction.atomic():
            ent, _ = StudentEntitlement.objects.select_for_update().get_or_create(
                student=student,
                feature=feature,
                defaults={'total_allowed': 0, 'consumed': 0, 'reserved': 0}
            )
            if ent.total_allowed != -1:
                ent.total_allowed = max(0, ent.total_allowed + delta)
                ent.save(update_fields=['total_allowed'])

            UsageLedger.objects.create(
                student=student,
                subscription=ent.subscription,
                feature=feature,
                event_type='ADMIN_ADJUST',
                amount=delta,
                reason=reason,
                admin_user=admin_user
            )

            return ent
