"""Central Entitlement Service: Canonical service determining effective
package benefits, course access, exam quotas, AI tutor allowances,
and auditable consumption tracking for LoksewaAI.
"""

import logging
from datetime import timedelta
from typing import Dict, Any, Optional, Tuple
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from core.models import User, AdminSettings
from courses.services.course_access_service import CourseAccessService
from .models import (
    Subscription, SubscriptionPlan, StudentEntitlement, UsageLedger
)
from .access import has_admin_granted_access

logger = logging.getLogger(__name__)


class EntitlementService:
    """The authoritative engine for package entitlement and quota enforcement."""

    @classmethod
    def get_active_subscription(cls, user: User, force_refresh: bool = False) -> Optional[Subscription]:
        """Returns the student's active Subscription, supporting both optional
        duration-based expiry and quota-based / lifetime subscriptions.
        Active PAID subscriptions strictly take priority over Free subscriptions."""
        if not user or not user.is_authenticated:
            return None

        if not force_refresh and hasattr(user, '_cached_active_subscription'):
            cached = getattr(user, '_cached_active_subscription')
            return None if cached == '__none__' else cached

        now = timezone.now()
        # 1. First look for active PAID subscriptions (plan__price > 0)
        paid_subs = (
            Subscription.objects.filter(
                student=user,
                status='ACTIVE',
                plan__price__gt=0,
            )
            .filter(Q(expiry_date__isnull=True) | Q(expiry_date__gt=now))
            .select_related('plan')
            .order_by(F('expiry_date').desc(nulls_first=True), '-created_at')
        )
        first_paid = paid_subs.first()
        if first_paid:
            setattr(user, '_cached_active_subscription', first_paid)
            return first_paid

        # 2. If no active paid subscription, look for active FREE subscriptions
        free_subs = (
            Subscription.objects.filter(
                student=user,
                status='ACTIVE',
            )
            .filter(Q(expiry_date__isnull=True) | Q(expiry_date__gt=now))
            .select_related('plan')
            .order_by('-created_at')
        )
        res = free_subs.first()
        setattr(user, '_cached_active_subscription', res or '__none__')
        return res

    @classmethod
    def get_default_free_plan(cls) -> Optional[SubscriptionPlan]:
        """Finds the configured default Free Plan, ensuring it is published and active."""
        plan = SubscriptionPlan.objects.filter(
            is_default_free=True,
            status='ACTIVE',
            is_published=True,
            price=0
        ).first()
        if not plan:
            # Fallback to any published, active plan with price 0
            plan = SubscriptionPlan.objects.filter(
                price=0,
                status='ACTIVE',
                is_published=True
            ).order_by('id').first()
        return plan

    @classmethod
    def ensure_free_plan_entitlement(cls, user: User) -> Optional[Subscription]:
        """
        Idempotently assigns the default Free Plan to an eligible student.
        - Preserves existing paid subscriptions (does not replace them).
        - Preserves Admin-granted access.
        - Does not grant to suspended/inactive students.
        - Safe under concurrent calls.
        """
        if not user or not user.is_authenticated or not user.is_active:
            return None
        if getattr(user, 'role', None) != 'student':
            return None

        # 1. Check if user already has an active subscription
        active_sub = cls.get_active_subscription(user)
        if active_sub:
            if active_sub.plan.price > 0:
                # Student already has an active paid entitlement - do NOT override
                return active_sub
            if active_sub.plan.price == 0 or getattr(active_sub.plan, 'is_default_free', False):
                # Student already has an active free entitlement - reuse it
                return active_sub

        # 2. Check if student has admin-granted access
        if has_admin_granted_access(user):
            return None

        default_plan = cls.get_default_free_plan()
        if not default_plan:
            logger.warning("No default Free Plan configured. Cannot auto-grant free access for user %s", user.id)
            return None

        return cls.activate_free_plan(user, default_plan)

    @classmethod
    def activate_free_plan(cls, user: User, plan: SubscriptionPlan) -> Subscription:
        """
        Activates a genuinely free plan for a student with transactional safety.
        """
        if plan.price > 0:
            raise ValueError("Only zero-cost packages can be activated as Free Plans.")
        if plan.status != 'ACTIVE' or not plan.is_published:
            raise ValueError("Package is not active or published.")

        with transaction.atomic():
            # Check existing active free subscription for this user
            existing_free = Subscription.objects.select_for_update().filter(
                student=user,
                status='ACTIVE',
                plan=plan
            ).first()

            if existing_free and existing_free.is_active:
                sub = existing_free
            else:
                expiry = None
                if plan.has_expiry and plan.duration:
                    expiry = timezone.now() + timedelta(days=plan.duration)

                sub = Subscription.objects.create(
                    student=user,
                    plan=plan,
                    status='ACTIVE',
                    source='FREE_PLAN',
                    admin_grant_reason='Automatic Free Plan Activation',
                    start_date=timezone.now(),
                    expiry_date=expiry,
                )

            # Auto-enroll in plan course if SINGLE or BUNDLE
            if plan.course_id and plan.course and plan.course.status == 'published':
                from courses.models import Enrollment
                Enrollment.objects.get_or_create(
                    student=user,
                    course=plan.course,
                    defaults={'status': 'active'}
                )

            # Initialize entitlements & quotas
            cls.grant_plan_entitlements(
                student=user,
                plan=plan,
                subscription=sub,
                reason="Activated Free Plan"
            )

            # Invalidate cached context
            from courses.access import invalidate_student_course_context
            invalidate_student_course_context(user.id)

        return sub

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
        if raw is None and cat == 'model':
            raw = quotas.get('mock') or quotas.get('MOCK')
        elif raw is None and cat == 'mock':
            raw = quotas.get('model') or quotas.get('MODEL')
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

        cache_key = f'student_entitlements:{user.id}'
        try:
            from django.core.cache import cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
        except Exception:
            pass

        is_admin_granted = has_admin_granted_access(user)
        active_sub = cls.get_active_subscription(user)
        if not active_sub and not is_admin_granted and user.is_active and getattr(user, 'role', None) == 'student':
            active_sub = cls.ensure_free_plan_entitlement(user)
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

        # Objective Exam Categories
        obj_categories = ['total', 'past_year', 'model', 'live', 'topicwise', 'mock', 'free_mock']
        obj_exams_status = {}
        for cat in obj_categories:
            key = f"exam:objective:{cat}" if cat != 'total' else "exam:objective:total"
            legacy_key = f"exam:{cat}" if cat not in ('total', 'free_mock') else ("exam:free_mock" if cat == 'free_mock' else None)
            ent = entitlements_by_feature.get(key) or (entitlements_by_feature.get(legacy_key) if legacy_key else None)
            if ent:
                obj_exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": ent.total_allowed,
                    "consumed": ent.consumed,
                    "reserved": ent.reserved,
                    "remaining": ent.remaining,
                    "is_unlimited": ent.is_unlimited,
                }
            elif plan:
                fl = (plan.feature_limits or {}).get(key, {})
                if isinstance(fl, dict) and 'enabled' in fl:
                    en = fl.get('enabled', True)
                    att = fl.get('quota', 0) if en else 0
                else:
                    en, att = cls._parse_cat_quota(plan.exam_quotas, cat)
                    if cat == 'free_mock':
                        en = bool(plan.free_mock_attempts != 0)
                        att = plan.free_mock_attempts
                    elif cat == 'total':
                        en = True
                        att = -1 if plan.package_type == 'BUNDLE' else 20
                obj_exams_status[cat] = {
                    "enabled": en,
                    "total_allowed": att,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": att,
                    "is_unlimited": att == -1,
                }
            elif is_admin_granted:
                obj_exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": -1,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": -1,
                    "is_unlimited": True,
                }
            else:
                obj_exams_status[cat] = {
                    "enabled": False,
                    "total_allowed": 0,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": 0,
                    "is_unlimited": False,
                }

        # Subjective Exam Categories
        subj_categories = ['total', 'past_year', 'model', 'live', 'topicwise', 'mock', 'evaluation']
        subj_exams_status = {}
        for cat in subj_categories:
            key = f"exam:subjective:{cat}" if cat not in ('total', 'evaluation') else ("exam:subjective:total" if cat == 'total' else "evaluation:subjective")
            ent = entitlements_by_feature.get(key)
            if ent:
                subj_exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": ent.total_allowed,
                    "consumed": ent.consumed,
                    "reserved": ent.reserved,
                    "remaining": ent.remaining,
                    "is_unlimited": ent.is_unlimited,
                }
            elif plan:
                fl = (plan.feature_limits or {}).get(key, {})
                if isinstance(fl, dict) and 'enabled' in fl:
                    en = fl.get('enabled', True)
                    att = fl.get('quota', 0) if en else 0
                else:
                    en = True
                    att = -1 if plan.package_type == 'BUNDLE' else (3 if cat == 'evaluation' else 5)
                subj_exams_status[cat] = {
                    "enabled": en,
                    "total_allowed": att,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": att,
                    "is_unlimited": att == -1,
                }
            elif is_admin_granted:
                subj_exams_status[cat] = {
                    "enabled": True,
                    "total_allowed": -1,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": -1,
                    "is_unlimited": True,
                }
            else:
                subj_exams_status[cat] = {
                    "enabled": False,
                    "total_allowed": 0,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": 0,
                    "is_unlimited": False,
                }

        # Legacy exams_status mapping for full backward compatibility with older tests/pages
        exams_status = {}
        for cat in ['past_year', 'model', 'live', 'topicwise', 'mock', 'free_mock']:
            exams_status[cat] = obj_exams_status.get(cat, {
                "enabled": False, "total_allowed": 0, "consumed": 0, "reserved": 0, "remaining": 0, "is_unlimited": False
            })

        # Games Status
        games_list = ['1v1', 'survival', 'weekly_quiz', 'daily_drill']
        games_status = {}
        for g in games_list:
            key = f"game:{g}"
            ent = entitlements_by_feature.get(key)
            if ent:
                games_status[g] = {
                    "enabled": True,
                    "total_allowed": ent.total_allowed,
                    "consumed": ent.consumed,
                    "reserved": ent.reserved,
                    "remaining": ent.remaining,
                    "is_unlimited": ent.is_unlimited,
                }
            elif plan:
                fl = (plan.feature_limits or {}).get(key, {})
                if isinstance(fl, dict) and 'enabled' in fl:
                    en = fl.get('enabled', True)
                    quota = fl.get('quota', 0) if en else 0
                else:
                    en = True
                    quota = -1 if plan.package_type == 'BUNDLE' else (2 if g == 'weekly_quiz' else 10)
                games_status[g] = {
                    "enabled": en,
                    "total_allowed": quota,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": quota,
                    "is_unlimited": quota == -1,
                }
            elif is_admin_granted:
                games_status[g] = {
                    "enabled": True,
                    "total_allowed": -1,
                    "consumed": 0,
                    "reserved": 0,
                    "remaining": -1,
                    "is_unlimited": True,
                }
            else:
                games_status[g] = {
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

        # Platform Modules Access
        modules_status = {
            "study_plans": {
                "enabled": (is_admin_granted or (plan and (plan.feature_limits or {}).get('module:study_plans', {}).get('enabled', True) if plan else False))
            },
            "analytics": {
                "enabled": (is_admin_granted or (plan and (plan.feature_limits or {}).get('module:analytics', {}).get('enabled', True) if plan else False))
            }
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
                "feature_limits": getattr(plan, "feature_limits", {}) or {},
                "is_default_free": getattr(plan, "is_default_free", False),
                "is_free": getattr(plan, "is_free", False),
                "free_mock_attempts": getattr(plan, "free_mock_attempts", 0),
                "notes_access_type": getattr(plan, "notes_access_type", "COURSE_NOTES"),
                "can_download_notes": getattr(plan, "can_download_notes", False),
                "ai_credits": getattr(plan, "ai_credits", 0),
                "ai_daily_limit": getattr(plan, "ai_daily_limit", 0),
                "reset_frequency": getattr(plan, "reset_frequency", "NEVER"),
            }

        # Recent ledger history (last 10 events)
        recent_ledger = list(
            UsageLedger.objects.filter(student=user)
            .values('id', 'feature', 'event_type', 'amount', 'reference_id', 'reason', 'created_at')[:10]
        )

        result = {
            "has_active_package": active_sub is not None or is_admin_granted,
            "is_admin_granted": is_admin_granted,
            "subscription": sub_data,
            "plan": plan_data,
            "courses": courses_data,
            "notes": notes_access,
            "exams": exams_status,
            "objective_exams": obj_exams_status,
            "subjective_exams": subj_exams_status,
            "games": games_status,
            "ai_tutor": ai_status,
            "practice": practice_status,
            "modules": modules_status,
            "usage_history": recent_ledger,
        }

        try:
            from django.core.cache import cache
            cache.set(cache_key, result, 30)
        except Exception:
            pass

        return result

    @classmethod
    def invalidate_user_entitlements_cache(cls, user_id):
        if not user_id:
            return
        try:
            from django.core.cache import cache
            cache.delete(f'student_entitlements:{user_id}')
        except Exception:
            pass

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
        is_free_mock = bool(plan and plan.free_mock_exams.filter(id=examination.id).exists())
        if is_free_mock:
            if plan.free_mock_attempts == -1:
                return True, "Exam is included free in your package.", {"is_unlimited": True, "remaining": -1}
            elif plan.free_mock_attempts > 0:
                ent, _ = StudentEntitlement.objects.get_or_create(
                    student=user,
                    feature='exam:free_mock',
                    defaults={
                        'subscription': active_sub,
                        'total_allowed': plan.free_mock_attempts,
                        'consumed': 0,
                        'reserved': 0,
                    }
                )
                if not ent.is_unlimited and ent.remaining <= 0:
                    return False, "You've used all your included Free Mock Exam attempts. Upgrade your package to unlock more attempts.", {
                        "feature": "exam:free_mock",
                        "remaining": 0,
                        "total_allowed": ent.total_allowed,
                        "upgrade_url": "/student/plans"
                    }
                return True, "Free mock attempt available.", {
                    "is_unlimited": False,
                    "remaining": ent.remaining,
                    "total_allowed": ent.total_allowed
                }

        # 3. Check Course Access for course-specific examinations
        if examination.course_id:
            if not CourseAccessService.has_course_access(user, examination.course_id):
                return False, "This examination requires enrollment in the associated course.", {
                    "upgrade_url": "/student/plans", "feature": "course_access"
                }

        # 4. Resolve Objective vs Subjective Category & Overall Quotas
        is_subj = getattr(examination, 'exam_type', None) == 'subjective'
        cat = examination.effective_category or ('model' if is_subj else 'mock')
        exam_type_label = "Subjective" if is_subj else "Objective"

        if is_free_mock and plan and plan.free_mock_attempts > 0:
            cat_feature_key = "exam:free_mock"
            alt_cat_key = None
        elif is_subj:
            cat_feature_key = f"exam:subjective:{cat}"
            alt_cat_key = None
        else:
            cat_feature_key = f"exam:objective:{cat}"
            alt_cat_key = f"exam:{cat}"

        total_feature_key = "exam:subjective:total" if is_subj else "exam:objective:total"

        # If student is on a free plan, and this is a mock/model exam not in free_mock_exams, and free_mock_exams are configured:
        if plan and getattr(plan, 'is_free', False) and cat in ('model', 'mock') and plan.free_mock_exams.exists() and not is_free_mock:
            return False, f"This {exam_type_label} Mock Exam is not included in your Free Plan. Upgrade your package to unlock all Mock Exams.", {
                "feature": cat_feature_key,
                "remaining": 0,
                "upgrade_url": "/student/plans"
            }

        # Check category entitlement
        entitlement = StudentEntitlement.objects.filter(student=user, feature=cat_feature_key).first()
        alt_ent = StudentEntitlement.objects.filter(student=user, feature=alt_cat_key).first() if alt_cat_key else None
        if entitlement and alt_ent:
            if not alt_ent.is_unlimited and (entitlement.is_unlimited or alt_ent.remaining < entitlement.remaining):
                entitlement = alt_ent
        elif not entitlement and alt_ent:
            entitlement = alt_ent

        if not entitlement:
            if plan and plan.feature_limits and cat_feature_key in plan.feature_limits:
                fl = plan.feature_limits[cat_feature_key]
                default_attempts = fl.get('quota', 0) if fl.get('enabled', True) else 0
            elif plan:
                enabled, attempts = cls._parse_cat_quota(plan.exam_quotas, cat)
                default_attempts = attempts if enabled else 0
            elif is_admin_granted:
                default_attempts = -1
            else:
                default_attempts = 0

            entitlement, _ = StudentEntitlement.objects.get_or_create(
                student=user,
                feature=cat_feature_key,
                defaults={
                    'subscription': active_sub,
                    'total_allowed': default_attempts,
                    'consumed': 0,
                    'reserved': 0,
                }
            )

        if not entitlement.is_unlimited and entitlement.remaining <= 0:
            return False, f"Attempt quota for {cat.replace('_', ' ').title()} {exam_type_label} Exams has been exhausted.", {
                "feature": cat_feature_key,
                "remaining": 0,
                "total_allowed": entitlement.total_allowed,
                "upgrade_url": "/student/plans"
            }

        # Check overall category limit if configured
        total_ent = StudentEntitlement.objects.filter(student=user, feature=total_feature_key).first()
        if total_ent and not total_ent.is_unlimited and total_ent.remaining <= 0:
            return False, f"Overall attempt quota for {exam_type_label} Exams has been exhausted. Upgrade your package for more attempts.", {
                "feature": total_feature_key,
                "remaining": 0,
                "total_allowed": total_ent.total_allowed,
                "upgrade_url": "/student/plans"
            }

        rem = min(entitlement.remaining, total_ent.remaining) if (total_ent and not total_ent.is_unlimited and not entitlement.is_unlimited) else entitlement.remaining
        return True, "Quota available.", {
            "is_unlimited": entitlement.is_unlimited and (not total_ent or total_ent.is_unlimited),
            "remaining": rem,
            "total_allowed": entitlement.total_allowed
        }

    @classmethod
    def check_and_reserve_exam_attempt(cls, user: User, examination, attempt_id: Optional[int] = None) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Concurrency-safe atomic check and attempt reservation.
        Prevents multiple simultaneous browser requests from exceeding quota.
        Enforces both category-specific and overall exam limits without double counting.
        """
        if CourseAccessService.is_privileged(user) or getattr(examination, 'is_free', False):
            return True, "Exempt from quota consumption.", {}

        # If examination requires admin approval and student has an approved request, permit start
        if getattr(examination, 'requires_admin_request', False):
            from exams.models import ExaminationRequest
            if ExaminationRequest.objects.filter(student=user, examination=examination, status='approved').exists():
                return True, "Approved by admin for this examination.", {}

        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None

        is_free_mock = bool(plan and plan.free_mock_exams.filter(id=examination.id).exists())
        if is_free_mock and plan.free_mock_attempts == -1:
            return True, "Exempt from quota consumption (unlimited free mock).", {}

        is_subj = getattr(examination, 'exam_type', None) == 'subjective'
        cat = examination.effective_category or ('model' if is_subj else 'mock')
        exam_type_label = "Subjective" if is_subj else "Objective"

        if is_free_mock and plan and plan.free_mock_attempts > 0:
            cat_feature_key = "exam:free_mock"
            alt_cat_key = None
        elif is_subj:
            cat_feature_key = f"exam:subjective:{cat}"
            alt_cat_key = None
        else:
            cat_feature_key = f"exam:objective:{cat}"
            alt_cat_key = f"exam:{cat}"

        total_feature_key = "exam:subjective:total" if is_subj else "exam:objective:total"

        # If student is on a free plan, and this is a mock/model exam not in free_mock_exams:
        if plan and getattr(plan, 'is_free', False) and cat in ('model', 'mock') and not is_free_mock:
            return False, f"This {exam_type_label} Mock Exam requires a paid package upgrade.", {
                "feature": cat_feature_key,
                "remaining": 0,
                "upgrade_url": "/student/plans"
            }

        with transaction.atomic():
            # 1. Fetch & lock category entitlement
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=cat_feature_key)
                .first()
            )
            alt_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=alt_cat_key)
                .first()
            ) if alt_cat_key else None

            active_sub = cls.get_active_subscription(user)
            plan = active_sub.plan if active_sub else None

            if not entitlement and not alt_ent:
                if is_free_mock and plan and plan.free_mock_attempts > 0:
                    default_quota = plan.free_mock_attempts
                elif plan and plan.feature_limits and cat_feature_key in plan.feature_limits:
                    fl = plan.feature_limits[cat_feature_key]
                    default_quota = fl.get('quota', 0) if fl.get('enabled', True) else 0
                elif plan:
                    enabled, attempts = cls._parse_cat_quota(plan.exam_quotas, cat)
                    default_quota = attempts if enabled else 0
                elif has_admin_granted_access(user):
                    default_quota = -1
                else:
                    default_quota = 0

                entitlement = StudentEntitlement.objects.create(
                    student=user,
                    subscription=active_sub,
                    feature=cat_feature_key,
                    total_allowed=default_quota,
                    consumed=0,
                    reserved=0,
                )
            elif not entitlement and alt_ent:
                entitlement = alt_ent

            # Check stricter of the two if both exist
            ent_to_check = entitlement
            if entitlement and alt_ent:
                if not alt_ent.is_unlimited and (entitlement.is_unlimited or alt_ent.remaining < entitlement.remaining):
                    ent_to_check = alt_ent

            if not ent_to_check.is_unlimited and ent_to_check.remaining <= 0:
                return False, f"Attempt quota for {cat.replace('_', ' ').title()} {exam_type_label} Exams exhausted.", {
                    "feature": cat_feature_key, "remaining": 0, "upgrade_url": "/student/plans"
                }

            # 2. Fetch & lock total category entitlement if configured
            total_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=total_feature_key)
                .first()
            )
            if total_ent and not total_ent.is_unlimited and total_ent.remaining <= 0:
                return False, f"Overall attempt quota for {exam_type_label} Exams exhausted. Upgrade your package for more attempts.", {
                    "feature": total_feature_key, "remaining": 0, "upgrade_url": "/student/plans"
                }

            # 3. Reserve 1 attempt on category entitlement (and alt_ent if present)
            if entitlement and not entitlement.is_unlimited:
                entitlement.reserved = F('reserved') + 1
                entitlement.save(update_fields=['reserved'])
            if alt_ent and alt_ent.id != getattr(entitlement, 'id', None) and not alt_ent.is_unlimited:
                alt_ent.reserved = F('reserved') + 1
                alt_ent.save(update_fields=['reserved'])

            # 4. Reserve 1 attempt on total entitlement if present and not unlimited
            if total_ent and not total_ent.is_unlimited:
                total_ent.reserved = F('reserved') + 1
                total_ent.save(update_fields=['reserved'])

            # Log to audit ledger
            UsageLedger.objects.create(
                student=user,
                subscription=active_sub,
                feature=cat_feature_key,
                event_type='RESERVE',
                amount=1,
                reference_id=str(attempt_id) if attempt_id else f"exam_{examination.id}",
                reason=f"Reserved attempt for {examination.title}"
            )

        return True, "Attempt reserved.", {"feature": cat_feature_key, "total_feature": total_feature_key}

    @classmethod
    def consume_exam_attempt(cls, attempt) -> None:
        """
        Settles a reserved attempt upon exam submission.
        """
        examination = attempt.examination
        if getattr(examination, 'is_free', False):
            return

        is_subj = getattr(examination, 'exam_type', None) == 'subjective'
        cat = examination.effective_category or ('model' if is_subj else 'mock')
        user = attempt.student
        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None
        is_free_mock = bool(plan and plan.free_mock_exams.filter(id=examination.id).exists())
        if is_free_mock and plan.free_mock_attempts == -1:
            return

        if is_free_mock and plan and plan.free_mock_attempts > 0:
            cat_feature_key = "exam:free_mock"
            alt_cat_key = None
        elif is_subj:
            cat_feature_key = f"exam:subjective:{cat}"
            alt_cat_key = None
        else:
            cat_feature_key = f"exam:objective:{cat}"
            alt_cat_key = f"exam:{cat}"

        total_feature_key = "exam:subjective:total" if is_subj else "exam:objective:total"

        with transaction.atomic():
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=cat_feature_key)
                .first()
            )
            alt_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=alt_cat_key)
                .first()
            ) if alt_cat_key else None

            total_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=total_feature_key)
                .first()
            )

            if entitlement:
                if not entitlement.is_unlimited:
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
                    feature=entitlement.feature,
                    event_type='CONSUME',
                    amount=1,
                    reference_id=str(attempt.id),
                    reason=f"Consumed attempt for {examination.title}"
                )

            if alt_ent and alt_ent.id != getattr(entitlement, 'id', None):
                if not alt_ent.is_unlimited:
                    new_alt_res = max(0, alt_ent.reserved - 1)
                    alt_ent.reserved = new_alt_res
                    alt_ent.consumed = F('consumed') + 1
                    alt_ent.save(update_fields=['reserved', 'consumed'])
                else:
                    alt_ent.consumed = F('consumed') + 1
                    alt_ent.save(update_fields=['consumed'])

            if total_ent:
                if not total_ent.is_unlimited:
                    new_tot_res = max(0, total_ent.reserved - 1)
                    total_ent.reserved = new_tot_res
                    total_ent.consumed = F('consumed') + 1
                    total_ent.save(update_fields=['reserved', 'consumed'])
                else:
                    total_ent.consumed = F('consumed') + 1
                    total_ent.save(update_fields=['consumed'])

    @classmethod
    def release_exam_attempt(cls, attempt) -> None:
        """
        Releases a reservation if an attempt is cancelled or invalidated.
        """
        examination = attempt.examination
        is_subj = getattr(examination, 'exam_type', None) == 'subjective'
        cat = examination.effective_category or ('model' if is_subj else 'mock')
        user = attempt.student
        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None
        is_free_mock = bool(plan and plan.free_mock_exams.filter(id=examination.id).exists())
        if is_free_mock and plan.free_mock_attempts == -1:
            return

        if is_free_mock and plan and plan.free_mock_attempts > 0:
            cat_feature_key = "exam:free_mock"
            alt_cat_key = None
        elif is_subj:
            cat_feature_key = f"exam:subjective:{cat}"
            alt_cat_key = None
        else:
            cat_feature_key = f"exam:objective:{cat}"
            alt_cat_key = f"exam:{cat}"

        total_feature_key = "exam:subjective:total" if is_subj else "exam:objective:total"

        with transaction.atomic():
            entitlement = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=cat_feature_key)
                .first()
            )
            alt_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=alt_cat_key)
                .first()
            ) if alt_cat_key else None

            total_ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature=total_feature_key)
                .first()
            )

            if entitlement and not entitlement.is_unlimited:
                new_reserved = max(0, entitlement.reserved - 1)
                entitlement.reserved = new_reserved
                entitlement.save(update_fields=['reserved'])

                UsageLedger.objects.create(
                    student=user,
                    subscription=entitlement.subscription,
                    feature=entitlement.feature,
                    event_type='RELEASE',
                    amount=-1,
                    reference_id=str(attempt.id),
                    reason=f"Released reservation for {examination.title}"
                )

            if alt_ent and alt_ent.id != getattr(entitlement, 'id', None) and not alt_ent.is_unlimited:
                alt_ent.reserved = max(0, alt_ent.reserved - 1)
                alt_ent.save(update_fields=['reserved'])

            if total_ent and not total_ent.is_unlimited:
                total_ent.reserved = max(0, total_ent.reserved - 1)
                total_ent.save(update_fields=['reserved'])

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
    def _grant_single_entitlement(cls, student: User, subscription: Optional[Subscription], feature: str, total_allowed: int, reset_frequency: str = 'NEVER', admin_user: Optional[User] = None, reason: str = ""):
        ent, created = StudentEntitlement.objects.get_or_create(
            student=student,
            feature=feature,
            defaults={
                'subscription': subscription,
                'total_allowed': total_allowed,
                'consumed': 0,
                'reserved': 0,
                'reset_frequency': reset_frequency,
            }
        )
        if not created:
            ent.subscription = subscription
            if total_allowed == -1 or ent.total_allowed == -1:
                ent.total_allowed = -1
            else:
                ent.total_allowed = max(ent.total_allowed, total_allowed)
            ent.reset_frequency = reset_frequency
            ent.save(update_fields=['subscription', 'total_allowed', 'reset_frequency'])

        UsageLedger.objects.create(
            student=student,
            subscription=subscription,
            feature=feature,
            event_type='GRANT',
            amount=total_allowed,
            reason=reason or f"Granted {feature} quota",
            admin_user=admin_user
        )
        return ent

    @classmethod
    def grant_plan_entitlements(cls, student: User, plan: SubscriptionPlan, subscription: Optional[Subscription] = None, admin_user: Optional[User] = None, reason: str = "") -> None:
        """
        Initializes or upgrades student's entitlements across ALL platform modules
        when a plan is purchased, activated, or granted by an administrator.
        """
        with transaction.atomic():
            fl = plan.feature_limits or {}
            reset_freq = plan.reset_frequency

            # 1. Objective Exam categories
            quotas = plan.exam_quotas or {}
            for cat in ['past_year', 'model', 'live', 'topicwise']:
                key = f"exam:objective:{cat}"
                legacy_key = f"exam:{cat}"
                if key in fl:
                    cfg = fl[key]
                    attempts = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else (int(cfg) if isinstance(cfg, (int, float)) else 0)
                else:
                    enabled, attempts = cls._parse_cat_quota(quotas, cat)
                    if not enabled:
                        attempts = 0

                cls._grant_single_entitlement(student, subscription, key, attempts, reset_freq, admin_user, reason or f"Granted {plan.name} {cat} objective quota")
                cls._grant_single_entitlement(student, subscription, legacy_key, attempts, reset_freq, admin_user, reason or f"Granted {plan.name} {cat} quota")

            # 1b. Total Objective Exam attempts
            tot_obj_key = "exam:objective:total"
            if tot_obj_key in fl:
                cfg = fl[tot_obj_key]
                tot_obj_attempts = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
            else:
                tot_obj_attempts = -1 if plan.package_type == 'BUNDLE' else 25
            cls._grant_single_entitlement(student, subscription, tot_obj_key, tot_obj_attempts, reset_freq, admin_user, reason or f"Granted {plan.name} total objective exam quota")

            # 1c. Free Mock Exams quota
            free_mock_attempts = getattr(plan, 'free_mock_attempts', 0)
            if free_mock_attempts != 0:
                cls._grant_single_entitlement(student, subscription, "exam:free_mock", free_mock_attempts, reset_freq, admin_user, reason or f"Granted {plan.name} free mock quota")

            # 2. Subjective Exam categories
            for cat in ['past_year', 'model', 'live', 'topicwise']:
                key = f"exam:subjective:{cat}"
                if key in fl:
                    cfg = fl[key]
                    attempts = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else (int(cfg) if isinstance(cfg, (int, float)) else 0)
                else:
                    attempts = -1 if plan.package_type == 'BUNDLE' else 5
                cls._grant_single_entitlement(student, subscription, key, attempts, reset_freq, admin_user, reason or f"Granted {plan.name} {cat} subjective quota")

            # 2b. Total Subjective Exam attempts
            tot_subj_key = "exam:subjective:total"
            if tot_subj_key in fl:
                cfg = fl[tot_subj_key]
                tot_subj_attempts = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
            else:
                tot_subj_attempts = -1 if plan.package_type == 'BUNDLE' else 10
            cls._grant_single_entitlement(student, subscription, tot_subj_key, tot_subj_attempts, reset_freq, admin_user, reason or f"Granted {plan.name} total subjective exam quota")

            # 2c. Subjective Evaluation Checking requests
            eval_key = "evaluation:subjective"
            if eval_key in fl:
                cfg = fl[eval_key]
                eval_quota = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
            else:
                eval_quota = -1 if plan.package_type == 'BUNDLE' else 3
            cls._grant_single_entitlement(student, subscription, eval_key, eval_quota, reset_freq, admin_user, reason or f"Granted {plan.name} subjective evaluation quota")

            # 3. Games Quotas
            games_defaults = {'1v1': 10, 'survival': 10, 'weekly_quiz': 2, 'daily_drill': 30}
            for g, def_q in games_defaults.items():
                key = f"game:{g}"
                if key in fl:
                    cfg = fl[key]
                    g_quota = cfg.get('quota', 0) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
                else:
                    g_quota = -1 if plan.package_type == 'BUNDLE' else def_q
                cls._grant_single_entitlement(student, subscription, key, g_quota, reset_freq, admin_user, reason or f"Granted {plan.name} {g} game quota")

            # 4. AI Tutor credits
            ai_credits = plan.ai_credits
            if "ai_credits" in fl:
                cfg = fl["ai_credits"]
                ai_credits = cfg.get('quota', ai_credits) if isinstance(cfg, dict) else int(cfg)
            cls._grant_single_entitlement(student, subscription, "ai_credits", ai_credits, reset_freq, admin_user, reason or f"Granted {plan.name} AI credits")

            if "ai:study_plan" in fl:
                cfg = fl["ai:study_plan"]
                sp_q = cfg.get('quota', 2) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
                cls._grant_single_entitlement(student, subscription, "ai:study_plan", sp_q, reset_freq, admin_user, reason or f"Granted {plan.name} AI study plan quota")

            # 5. Practice questions
            prac_limit = plan.practice_question_limit
            if "practice_questions" in fl:
                cfg = fl["practice_questions"]
                prac_limit = cfg.get('quota', prac_limit) if isinstance(cfg, dict) else int(cfg)
            cls._grant_single_entitlement(student, subscription, "practice_questions", prac_limit, reset_freq, admin_user, reason or f"Granted {plan.name} practice questions")
            cls._grant_single_entitlement(student, subscription, "practice:questions", prac_limit, reset_freq, admin_user, reason or f"Granted {plan.name} practice questions")

            if "practice:sessions" in fl:
                cfg = fl["practice:sessions"]
                ps_q = cfg.get('quota', -1) if (isinstance(cfg, dict) and cfg.get('enabled', True)) else 0
                cls._grant_single_entitlement(student, subscription, "practice:sessions", ps_q, reset_freq, admin_user, reason or f"Granted {plan.name} practice sessions quota")

            # 6. Notes Downloads
            dl_quota = -1 if plan.can_download_notes else 0
            if "notes:downloads" in fl:
                cfg = fl["notes:downloads"]
                dl_quota = cfg.get('quota', dl_quota) if isinstance(cfg, dict) else int(cfg)
            cls._grant_single_entitlement(student, subscription, "notes:downloads", dl_quota, reset_freq, admin_user, reason or f"Granted {plan.name} notes downloads")

            # 7. Learning Modules
            for mod in ['study_plans', 'analytics']:
                mod_key = f"module:{mod}"
                mod_en = 1 if (mod_key not in fl or (isinstance(fl[mod_key], dict) and fl[mod_key].get('enabled', True))) else 0
                cls._grant_single_entitlement(student, subscription, mod_key, mod_en, reset_freq, admin_user, reason or f"Granted {plan.name} {mod} access")

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

    @classmethod
    def can_download_notes(cls, user: User, course=None) -> bool:
        """Determines whether student has permission to download notes PDF."""
        if CourseAccessService.is_privileged(user):
            return True
        sub = cls.get_active_subscription(user)
        if not sub or not sub.plan:
            return False
        if not sub.plan.can_download_notes:
            return False
        ent = StudentEntitlement.objects.filter(student=user, feature='notes:downloads').first()
        if ent and not ent.is_unlimited and ent.remaining <= 0:
            return False
        return True

    @classmethod
    def check_practice_access(cls, user: User, count: int = 1, mode: Optional[str] = None) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Determines whether student can start practice session.
        Checks practice_enabled and practice_question_limit.
        """
        if CourseAccessService.is_privileged(user):
            return True, "Privileged access.", {"is_unlimited": True}

        active_sub = cls.get_active_subscription(user)
        plan = active_sub.plan if active_sub else None

        if plan and not plan.practice_enabled:
            return False, "Your package does not include Practice mode. Please upgrade to unlock Practice.", {
                "upgrade_url": "/student/plans", "feature": "practice_questions", "remaining": 0
            }

        ent = StudentEntitlement.objects.filter(student=user, feature='practice_questions').first()
        if not ent:
            ent = StudentEntitlement.objects.filter(student=user, feature='practice:questions').first()

        if ent and not ent.is_unlimited and ent.remaining < count and ent.remaining <= 0:
            return False, "You've used all your included Practice questions. Upgrade your package for more questions.", {
                "upgrade_url": "/student/plans", "feature": "practice_questions", "remaining": 0
            }

        remaining = ent.remaining if ent and not ent.is_unlimited else -1
        return True, "Practice allowed.", {
            "is_unlimited": ent.is_unlimited if ent else (plan.practice_question_limit == -1 if plan else True),
            "remaining": remaining
        }

    @classmethod
    def consume_practice_questions(cls, user: User, count: int = 1) -> None:
        """Records consumed practice questions in StudentEntitlement and UsageLedger."""
        if count <= 0:
            return
        active_sub = cls.get_active_subscription(user)
        with transaction.atomic():
            ent = (
                StudentEntitlement.objects
                .select_for_update()
                .filter(student=user, feature__in=['practice_questions', 'practice:questions'])
                .first()
            )
            if ent:
                ent.consumed = F('consumed') + count
                ent.save(update_fields=['consumed'])

            UsageLedger.objects.create(
                student=user,
                subscription=active_sub,
                feature='practice_questions',
                event_type='CONSUME',
                amount=count,
                reason=f"Practiced {count} questions"
            )

    # =========================================================================
    # GAMES ENTITLEMENTS (1v1, SURVIVAL, WEEKLY QUIZ, DAILY DRILL)
    # =========================================================================

    @classmethod
    def check_game_access(cls, user: User, game_mode: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Determines whether `user` can participate in `game_mode` ('1v1', 'survival', 'weekly_quiz', 'daily_drill').
        """
        if not user or not user.is_authenticated:
            return False, "Authentication required.", {}

        if CourseAccessService.is_privileged(user):
            return True, "Privileged user access granted.", {"is_unlimited": True, "remaining": -1}

        is_admin_granted = has_admin_granted_access(user)
        active_sub = cls.get_active_subscription(user)
        if not active_sub and not is_admin_granted and user.is_active and getattr(user, 'role', None) == 'student':
            active_sub = cls.ensure_free_plan_entitlement(user)

        feature_key = f"game:{game_mode}"
        game_names = {
            '1v1': '1v1 Multiplayer Battles',
            'survival': 'Solo Survival Quiz',
            'weekly_quiz': 'Weekly Grand Quiz',
            'daily_drill': 'Daily Drill Challenge',
        }
        game_label = game_names.get(game_mode, f"{game_mode.title()} Games")

        entitlement = StudentEntitlement.objects.filter(student=user, feature=feature_key).first()
        if not entitlement and active_sub and active_sub.plan:
            plan = active_sub.plan
            fl = (plan.feature_limits or {}).get(feature_key, {})
            if isinstance(fl, dict) and not fl.get('enabled', True):
                return False, f"Your package does not include access to {game_label}. Please upgrade to play.", {
                    "feature": feature_key, "remaining": 0, "upgrade_url": "/student/plans"
                }
            quota = fl.get('quota', -1 if plan.package_type == 'BUNDLE' else 10) if isinstance(fl, dict) else int(fl)
            entitlement = StudentEntitlement.objects.create(
                student=user,
                subscription=active_sub,
                feature=feature_key,
                total_allowed=quota,
                consumed=0,
                reserved=0,
                reset_frequency=plan.reset_frequency,
            )

        if not entitlement:
            if is_admin_granted:
                return True, "Admin-granted unlimited games access.", {"is_unlimited": True, "remaining": -1}
            return False, f"Your package does not include access to {game_label}. Please upgrade your package.", {
                "feature": feature_key, "remaining": 0, "upgrade_url": "/student/plans"
            }

        if entitlement.is_unlimited:
            return True, "Unlimited game matches allowed.", {"is_unlimited": True, "remaining": -1, "feature": feature_key}

        if entitlement.remaining <= 0:
            return False, f"You have exhausted your included matches for {game_label}. Please upgrade your package for more games.", {
                "feature": feature_key, "remaining": 0, "total_allowed": entitlement.total_allowed, "upgrade_url": "/student/plans"
            }

        return True, "Game access allowed.", {
            "is_unlimited": False,
            "remaining": entitlement.remaining,
            "total_allowed": entitlement.total_allowed,
            "feature": feature_key
        }

    @classmethod
    def consume_game_match(cls, user: User, game_mode: str, reference_id: Any = None) -> None:
        """
        Atomically charges 1 game match/session for `game_mode`.
        """
        if CourseAccessService.is_privileged(user):
            return

        feature_key = f"game:{game_mode}"
        with transaction.atomic():
            ent = StudentEntitlement.objects.select_for_update().filter(student=user, feature=feature_key).first()
            if ent:
                ent.consumed = F('consumed') + 1
                ent.save(update_fields=['consumed'])
                UsageLedger.objects.create(
                    student=user,
                    subscription=ent.subscription,
                    feature=feature_key,
                    event_type='CONSUME',
                    amount=1,
                    reference_id=str(reference_id) if reference_id else '',
                    reason=f"Played {game_mode} match/session #{reference_id or ''}"
                )

    # =========================================================================
    # SUBJECTIVE EVALUATION CHECKING REQUESTS
    # =========================================================================

    @classmethod
    def check_evaluation_access(cls, user: User) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Verifies student has remaining subjective evaluation/checking request allowance.
        """
        if CourseAccessService.is_privileged(user):
            return True, "Privileged user access.", {"is_unlimited": True, "remaining": -1}

        is_admin_granted = has_admin_granted_access(user)
        active_sub = cls.get_active_subscription(user)
        feature_key = "evaluation:subjective"

        ent = StudentEntitlement.objects.filter(student=user, feature=feature_key).first()
        if not ent and active_sub and active_sub.plan:
            plan = active_sub.plan
            fl = (plan.feature_limits or {}).get(feature_key, {})
            quota = fl.get('quota', 3) if isinstance(fl, dict) else int(fl)
            ent = StudentEntitlement.objects.create(
                student=user,
                subscription=active_sub,
                feature=feature_key,
                total_allowed=quota,
                consumed=0,
                reserved=0,
                reset_frequency=plan.reset_frequency,
            )

        if not ent:
            if is_admin_granted:
                return True, "Admin-granted evaluation access.", {"is_unlimited": True, "remaining": -1}
            return False, "Your package does not include Subjective Exam Checking. Please upgrade your package.", {
                "feature": feature_key, "remaining": 0, "upgrade_url": "/student/plans"
            }

        if ent.is_unlimited:
            return True, "Unlimited evaluation requests allowed.", {"is_unlimited": True, "remaining": -1}

        if ent.remaining <= 0:
            return False, "You have used all your included Subjective Evaluation requests. Upgrade to a package with more evaluation quota.", {
                "feature": feature_key, "remaining": 0, "total_allowed": ent.total_allowed, "upgrade_url": "/student/plans"
            }

        return True, "Evaluation quota available.", {"is_unlimited": False, "remaining": ent.remaining, "total_allowed": ent.total_allowed}

    @classmethod
    def consume_evaluation(cls, user: User, request_id: Any = None) -> None:
        """
        Records consumption of 1 subjective evaluation request.
        """
        feature_key = "evaluation:subjective"
        with transaction.atomic():
            ent = StudentEntitlement.objects.select_for_update().filter(student=user, feature=feature_key).first()
            if ent:
                ent.consumed = F('consumed') + 1
                ent.save(update_fields=['consumed'])
                UsageLedger.objects.create(
                    student=user,
                    subscription=ent.subscription,
                    feature=feature_key,
                    event_type='CONSUME',
                    amount=1,
                    reference_id=str(request_id) if request_id else '',
                    reason=f"Requested manual checking for subjective submission #{request_id or ''}"
                )

    # =========================================================================
    # OPTIONAL PLATFORM MODULES (STUDY PLANS, ANALYTICS)
    # =========================================================================

    @classmethod
    def check_module_access(cls, user: User, module_key: str) -> bool:
        """
        Checks whether student has access to an optional platform module.
        """
        if CourseAccessService.is_privileged(user):
            return True
        if not AdminSettings.is_subscription_enforced():
            return True
        if has_admin_granted_access(user):
            return True
        active_sub = cls.get_active_subscription(user)
        if not active_sub or not active_sub.plan:
            return False
        plan = active_sub.plan
        feature_key = f"module:{module_key}" if not module_key.startswith("module:") else module_key
        fl = (plan.feature_limits or {}).get(feature_key)
        if isinstance(fl, dict):
            return fl.get('enabled', True) and fl.get('quota', 1) != 0
        return True
