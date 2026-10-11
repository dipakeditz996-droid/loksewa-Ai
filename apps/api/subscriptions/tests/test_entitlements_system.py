import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from subscriptions.models import (
    SubscriptionPlan, Subscription, StudentEntitlement, UsageLedger
)
from subscriptions.entitlements import EntitlementService
from exams.models import Examination, ExaminationAttempt

User = get_user_model()


class EntitlementSystemTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="adminpassword123",
            role="admin"
        )
        self.student = User.objects.create_user(
            username="student_user",
            email="student@example.com",
            password="studentpassword123",
            role="student"
        )

        from exams.models import ExamCategory, Exam
        self.cat = ExamCategory.objects.create(name="Civil Services")
        self.exam_pos = Exam.objects.create(name="Section Officer", category=self.cat)

        # Create an examination
        self.exam = Examination.objects.create(
            title="Loksewa Model Exam 1",
            category=self.cat,
            exam=self.exam_pos,
            objective_category="model",
            exam_type="mock",
            time_limit=45,
            total_marks=50,
            passing_marks=20,
            status="published",
            is_free=False
        )

        # Create a free mock exam
        self.free_exam = Examination.objects.create(
            title="Loksewa Free Mock Exam",
            category=self.cat,
            exam=self.exam_pos,
            objective_category="model",
            exam_type="mock",
            time_limit=45,
            total_marks=50,
            passing_marks=20,
            status="published",
            is_free=True
        )

        # Create a dynamic package with quotas and NO expiry (Lifetime quota-driven)
        self.plan = SubscriptionPlan.objects.create(
            name="Pro Master Quota Plan",
            slug="pro-master-quota-plan",
            price=Decimal("1500.00"),
            package_type="ALL_ACCESS",
            has_expiry=False,
            course_access_type="ALL",
            exam_quotas={
                "MODEL": 3,
                "TOPICWISE": 10
            },
            free_mock_attempts=2,
            notes_access_type="ALL",
            can_download_notes=True,
            practice_enabled=True,
            practice_question_limit=500,
            ai_tutor_enabled=True,
            ai_credits=5000,
            ai_daily_limit=500,
            is_published=True,
            status="ACTIVE"
        )

    def test_grant_and_effective_entitlements(self):
        """Verify granting plan creates entitlements and returns accurate payload."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            expiry_date=None,
            source="STUDENT_PAYMENT"
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, subscription=sub)

        eff = EntitlementService.get_effective_entitlements(self.student)
        self.assertTrue(eff["has_active_package"])
        self.assertEqual(eff["plan"]["name"], "Pro Master Quota Plan")
        self.assertFalse(eff["subscription"]["has_expiry"])
        self.assertIsNone(eff["subscription"]["expiry_date"])

        # Check quotas
        model_q = eff["exams"]["model"]
        self.assertEqual(model_q["total_allowed"], 3)
        self.assertEqual(model_q["remaining"], 3)
        self.assertEqual(model_q["consumed"], 0)
        self.assertFalse(model_q["is_unlimited"])

        # Check AI Tutor
        self.assertEqual(eff["ai_tutor"]["total_credits"], 5000)
        self.assertEqual(eff["ai_tutor"]["remaining_credits"], 5000)
        self.assertEqual(eff["ai_tutor"]["daily_limit"], 500)

    def test_free_mock_exam_access(self):
        """Free exams are accessible without consuming paid category quota."""
        has_access, reason, ent = EntitlementService.check_exam_access(self.student, self.free_exam)
        self.assertTrue(has_access)
        self.assertIn("Free exam", reason)

    def test_exam_quota_reservation_and_consumption(self):
        """Test atomic reservation and subsequent finalization consumption."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            expiry_date=None
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, subscription=sub)

        # Create attempt
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam,
            student=self.student,
            status="IN_PROGRESS"
        )

        # Reserve
        ok, reason, details = EntitlementService.check_and_reserve_exam_attempt(
            self.student, self.exam, attempt_id=attempt.id
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "Attempt reserved.")

        # Effective quota now shows 2 remaining (since 1 is reserved/used)
        eff = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(eff["exams"]["model"]["remaining"], 2)
        self.assertEqual(eff["exams"]["model"]["reserved"], 1)

        # Consume on finish
        EntitlementService.consume_exam_attempt(attempt)
        eff2 = EntitlementService.get_effective_entitlements(self.student)
        self.assertEqual(eff2["exams"]["model"]["remaining"], 2)
        self.assertEqual(eff2["exams"]["model"]["consumed"], 1)

    def test_quota_exhaustion(self):
        """When quota reaches 0, further attempts are blocked."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            expiry_date=None
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, subscription=sub)

        ent = StudentEntitlement.objects.get(student=self.student, feature="exam:model")
        ent.total_allowed = 1
        ent.consumed = 1
        ent.save()

        # Check access
        has_access, reason, details = EntitlementService.check_exam_access(self.student, self.exam)
        self.assertFalse(has_access)
        self.assertIn("exhausted", reason.lower())

        # Reserve should fail
        ok, res_reason, res_details = EntitlementService.check_and_reserve_exam_attempt(self.student, self.exam)
        self.assertFalse(ok)
        self.assertIn("exhausted", res_reason.lower())

    def test_admin_quota_adjustment_and_auditing(self):
        """Admin can grant quota and the adjustment is recorded in UsageLedger."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            expiry_date=None
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, subscription=sub)

        # Admin grants 5 additional Model attempts
        ent = EntitlementService.admin_adjust_quota(
            student=self.student,
            feature="exam:model",
            delta=5,
            admin_user=self.admin_user,
            reason="Bonus granted per scholarship support #101"
        )
        self.assertEqual(ent.total_allowed, 8)  # 3 initial + 5 bonus

        # Verify audit ledger
        ledger_entry = UsageLedger.objects.filter(
            student=self.student,
            event_type="ADMIN_ADJUST",
            feature="exam:model"
        ).first()
        self.assertIsNotNone(ledger_entry)
        self.assertEqual(ledger_entry.amount, 5)
        self.assertEqual(ledger_entry.admin_user, self.admin_user)
        self.assertIn("Bonus granted", ledger_entry.reason)

    def test_ai_credits_allowance_and_consumption(self):
        """AI allowance checks and token settlement."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            expiry_date=None
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, subscription=sub)

        can_use, reason, details = EntitlementService.check_ai_allowance(self.student)
        self.assertTrue(can_use)

        # Consume 150 tokens
        EntitlementService.consume_ai_credits(self.student, tokens_used=150)

        ent = StudentEntitlement.objects.get(student=self.student, feature="ai_credits")
        self.assertEqual(ent.consumed, 150)
        self.assertEqual(ent.remaining, 4850)
