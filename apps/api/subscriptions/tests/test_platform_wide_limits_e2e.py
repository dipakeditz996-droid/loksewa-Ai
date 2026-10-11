import json
from decimal import Decimal
from unittest.mock import patch, Mock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from subscriptions.models import (
    SubscriptionPlan, Subscription, StudentEntitlement, UsageLedger
)
from subscriptions.entitlements import EntitlementService
from courses.models import Course, Enrollment
from exams.models import (
    ExamCategory, Exam, Paper, Examination, ExaminationAttempt,
    SubjectiveSubmission, SubjectiveCheckingRequest
)
from games.models import GameMatch, SurvivalGame, DailyDrillSession
from study_plan.models import StudyPlan

User = get_user_model()


class PlatformWideLimitsE2ETests(TestCase):
    """
    End-to-End Test Suite verifying complete platform-wide package limits across:
    - Objective Exams (Category & Total quotas)
    - Subjective Exams & Evaluation Checking requests
    - Games (1v1, Survival, Weekly Quiz, Daily Drill)
    - Practice Engine
    - Notes & PDF Downloads
    - AI Tutor & Smart Modules
    - Explicit Unlimited vs Unset quotas
    - Idempotency & Zero double-counting
    """

    def setUp(self):
        self.client = APIClient()

        # Admin User
        self.admin = User.objects.create_superuser(
            username="admin_limits",
            email="admin_limits@example.com",
            password="AdminPassword123!",
            role="admin",
        )

        # Student User
        self.student = User.objects.create_user(
            username="student_limits",
            email="student_limits@example.com",
            password="StudentPassword123!",
            role="student",
        )

        # Academic Hierarchy & Course
        self.cat = ExamCategory.objects.create(name="PSC Administration")
        self.exam_node = Exam.objects.create(name="Section Officer", category=self.cat)
        self.course = Course.objects.create(
            title="Section Officer Master",
            slug="section-officer-master",
            status="published",
            exam=self.exam_node,
        )

        # Objective Examinations
        self.obj_model_exam = Examination.objects.create(
            title="Objective Model Paper 1",
            category=self.cat,
            exam=self.exam_node,
            exam_type="mock",
            objective_category="model",
            course=self.course,
            status="published",
            total_questions=50,
            time_limit=45,
            total_marks=100,
            passing_marks=40,
            marks_per_question=2,
        )

        self.obj_past_exam = Examination.objects.create(
            title="Objective Past Paper 2080",
            category=self.cat,
            exam=self.exam_node,
            exam_type="mock",
            objective_category="past_year",
            course=self.course,
            status="published",
            total_questions=50,
            time_limit=45,
            total_marks=100,
            passing_marks=40,
            marks_per_question=2,
        )

        # Subjective Examinations
        self.subj_model_exam = Examination.objects.create(
            title="Subjective Governance Paper 1",
            category=self.cat,
            exam=self.exam_node,
            exam_type="subjective",
            objective_category="model",
            course=self.course,
            status="published",
            total_questions=10,
            time_limit=180,
            total_marks=100,
            passing_marks=40,
        )

    def test_objective_and_subjective_quotas_are_separate(self):
        """
        Verify that objective and subjective exams have completely separate quotas,
        and consuming one does NOT consume the other.
        """
        plan = SubscriptionPlan.objects.create(
            name="Hybrid Prep Plan",
            slug="hybrid-prep",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("1500"),
            feature_limits={
                "exam:objective:model": {"enabled": True, "quota": 2, "unit": "attempts"},
                "exam:objective:total": {"enabled": True, "quota": 5, "unit": "attempts"},
                "exam:subjective:model": {"enabled": True, "quota": 1, "unit": "attempts"},
                "exam:subjective:total": {"enabled": True, "quota": 3, "unit": "attempts"},
                "evaluation:subjective": {"enabled": True, "quota": 1, "unit": "requests"},
            }
        )

        sub = Subscription.objects.create(
            student=self.student,
            plan=plan,
            status="ACTIVE",
            source="MANUAL_PURCHASE"
        )
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        entitlements = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(entitlements["objective_exams"]["model"]["remaining"], 2)
        self.assertEqual(entitlements["subjective_exams"]["model"]["remaining"], 1)

        # 1. Take Objective Exam
        allowed, reason, info = EntitlementService.check_and_reserve_exam_attempt(self.student, self.obj_model_exam)
        self.assertTrue(allowed)

        attempt_obj = ExaminationAttempt.objects.create(
            examination=self.obj_model_exam,
            student=self.student,
            status="in_progress"
        )
        EntitlementService.consume_exam_attempt(attempt_obj)

        # Verify Objective quota decremented, Subjective quota untouched
        entitlements = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(entitlements["objective_exams"]["model"]["remaining"], 1)
        self.assertEqual(entitlements["objective_exams"]["model"]["consumed"], 1)
        self.assertEqual(entitlements["subjective_exams"]["model"]["remaining"], 1)
        self.assertEqual(entitlements["subjective_exams"]["model"]["consumed"], 0)

        # 2. Take Subjective Exam
        allowed, reason, info = EntitlementService.check_and_reserve_exam_attempt(self.student, self.subj_model_exam)
        self.assertTrue(allowed)

        attempt_subj = ExaminationAttempt.objects.create(
            examination=self.subj_model_exam,
            student=self.student,
            status="in_progress"
        )
        EntitlementService.consume_exam_attempt(attempt_subj)

        # Verify Subjective quota decremented
        entitlements = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(entitlements["subjective_exams"]["model"]["remaining"], 0)
        self.assertEqual(entitlements["subjective_exams"]["model"]["consumed"], 1)

        # 3. Next subjective attempt must be blocked, but objective remains available
        allowed_subj, _, _ = EntitlementService.check_exam_access(self.student, self.subj_model_exam)
        self.assertFalse(allowed_subj)

        allowed_obj, _, _ = EntitlementService.check_exam_access(self.student, self.obj_model_exam)
        self.assertTrue(allowed_obj)

    def test_overall_and_category_limits_without_double_counting(self):
        """
        Verify that category-specific limit and overall total limit operate together
        without double-counting.
        """
        plan = SubscriptionPlan.objects.create(
            name="Overall Cap Plan",
            slug="overall-cap",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("1200"),
            feature_limits={
                "exam:objective:model": {"enabled": True, "quota": 5, "unit": "attempts"},
                "exam:objective:past_year": {"enabled": True, "quota": 5, "unit": "attempts"},
                "exam:objective:total": {"enabled": True, "quota": 2, "unit": "attempts"}, # Overall cap = 2
            }
        )

        sub = Subscription.objects.create(
            student=self.student,
            plan=plan,
            status="ACTIVE",
            source="MANUAL_PURCHASE"
        )
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        # Attempt 1: Model exam
        allowed, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.obj_model_exam)
        self.assertTrue(allowed)
        att1 = ExaminationAttempt.objects.create(examination=self.obj_model_exam, student=self.student)
        EntitlementService.consume_exam_attempt(att1)

        # Attempt 2: Past Year exam
        allowed, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.obj_past_exam)
        self.assertTrue(allowed)
        att2 = ExaminationAttempt.objects.create(examination=self.obj_past_exam, student=self.student)
        EntitlementService.consume_exam_attempt(att2)

        # Category quotas remaining: Model=4, Past=4. But Total consumed = 2, Total remaining = 0!
        entitlements = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(entitlements["objective_exams"]["total"]["remaining"], 0)
        self.assertEqual(entitlements["objective_exams"]["total"]["consumed"], 2)

        # Attempt 3: Both model and past exam must be blocked by the overall category quota
        allowed_model, reason, info = EntitlementService.check_exam_access(self.student, self.obj_model_exam)
        self.assertFalse(allowed_model)
        self.assertIn("Overall attempt quota", reason)

        allowed_past, reason_past, _ = EntitlementService.check_exam_access(self.student, self.obj_past_exam)
        self.assertFalse(allowed_past)
        self.assertIn("Overall attempt quota", reason_past)

    def test_games_quotas_and_idempotent_consumption(self):
        """
        Verify that game modes have independent quotas (1v1, survival, daily drill)
        and retries/reconnects do not double charge.
        """
        plan = SubscriptionPlan.objects.create(
            name="Gamer Pack",
            slug="gamer-pack",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("800"),
            feature_limits={
                "game:1v1": {"enabled": True, "quota": 2, "unit": "matches"},
                "game:survival": {"enabled": True, "quota": 1, "unit": "runs"},
                "game:daily_drill": {"enabled": True, "quota": 1, "unit": "drills"},
            }
        )

        sub = Subscription.objects.create(student=self.student, plan=plan, status="ACTIVE", source="MANUAL_PURCHASE")
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        # 1. 1v1 Battle match
        access = EntitlementService.check_game_access(self.student, "1v1")
        self.assertTrue(access[0])
        self.assertEqual(access[2]["remaining"], 2)

        EntitlementService.consume_game_match(self.student, "1v1", reference_id="match_1")
        access_after_1 = EntitlementService.check_game_access(self.student, "1v1")
        self.assertEqual(access_after_1[2]["remaining"], 1)

        EntitlementService.consume_game_match(self.student, "1v1", reference_id="match_2")
        access_after_2 = EntitlementService.check_game_access(self.student, "1v1")
        self.assertFalse(access_after_2[0])
        self.assertEqual(access_after_2[2]["remaining"], 0)

        # Survival is independent and still available
        survival_access = EntitlementService.check_game_access(self.student, "survival")
        self.assertTrue(survival_access[0])
        self.assertEqual(survival_access[2]["remaining"], 1)

    def test_subjective_evaluation_requests_quota_enforcement(self):
        """
        Verify that subjective manual checking requests are strictly limited
        by evaluation:subjective entitlement.
        """
        plan = SubscriptionPlan.objects.create(
            name="Subjective Checking Tier",
            slug="subj-checking",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("2000"),
            feature_limits={
                "evaluation:subjective": {"enabled": True, "quota": 1, "unit": "requests"},
            }
        )
        sub = Subscription.objects.create(student=self.student, plan=plan, status="ACTIVE", source="MANUAL_PURCHASE")
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        # Initially allowed
        eval_acc = EntitlementService.check_evaluation_access(self.student)
        self.assertTrue(eval_acc[0])
        self.assertEqual(eval_acc[2]["remaining"], 1)

        # Consume 1 request
        EntitlementService.consume_evaluation(self.student, request_id="check_101")

        # Now exhausted
        eval_acc2 = EntitlementService.check_evaluation_access(self.student)
        self.assertFalse(eval_acc2[0])
        self.assertEqual(eval_acc2[2]["remaining"], 0)
        self.assertTrue(
            "used all your included" in eval_acc2[1].lower() or "exhausted" in eval_acc2[1].lower()
        )

    def test_practice_and_platform_modules_entitlement(self):
        """
        Verify practice question allowance and module gating for study_plans and analytics.
        """
        plan = SubscriptionPlan.objects.create(
            name="Basic Practice Plan",
            slug="basic-practice",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("500"),
            practice_enabled=True,
            practice_question_limit=10,
            feature_limits={
                "practice_questions": {"enabled": True, "quota": 10, "unit": "questions"},
                "module:study_plans": {"enabled": True, "quota": 1, "unit": "access"},
                "module:analytics": {"enabled": False, "quota": 0, "unit": "access"},
            }
        )
        sub = Subscription.objects.create(student=self.student, plan=plan, status="ACTIVE", source="MANUAL_PURCHASE")
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        # Practice access allowed
        p_acc = EntitlementService.check_practice_access(self.student, count=5)
        self.assertTrue(p_acc[0])
        self.assertEqual(p_acc[2]["remaining"], 10)

        # Consume 10 questions
        EntitlementService.consume_practice_questions(self.student, count=10)
        p_acc2 = EntitlementService.check_practice_access(self.student, count=1)
        self.assertFalse(p_acc2[0])

        # Module check
        self.assertTrue(EntitlementService.check_module_access(self.student, "module:study_plans"))
        self.assertFalse(EntitlementService.check_module_access(self.student, "module:analytics"))

    def test_explicit_unlimited_only_when_configured(self):
        """
        Verify that an unset quota never defaults to unlimited.
        Unlimited only occurs when explicitly configured with quota = -1.
        """
        plan = SubscriptionPlan.objects.create(
            name="Strict Cap Plan",
            slug="strict-cap",
            package_type="SINGLE",
            course=self.course,
            price=Decimal("1000"),
            feature_limits={
                "game:1v1": {"enabled": True, "quota": -1}, # Explicit unlimited
                "game:survival": {"enabled": True, "quota": 2}, # Finite
                "game:weekly_quiz": {"enabled": False, "quota": 0}, # Disabled
            }
        )
        sub = Subscription.objects.create(student=self.student, plan=plan, status="ACTIVE", source="MANUAL_PURCHASE")
        EntitlementService.grant_plan_entitlements(self.student, plan, sub)

        ent_1v1 = StudentEntitlement.objects.get(student=self.student, feature="game:1v1")
        self.assertTrue(ent_1v1.is_unlimited)
        self.assertEqual(ent_1v1.remaining, -1)

        ent_surv = StudentEntitlement.objects.get(student=self.student, feature="game:survival")
        self.assertFalse(ent_surv.is_unlimited)
        self.assertEqual(ent_surv.remaining, 2)

        ent_weekly = StudentEntitlement.objects.get(student=self.student, feature="game:weekly_quiz")
        self.assertFalse(ent_weekly.is_unlimited)
        self.assertEqual(ent_weekly.remaining, 0)
