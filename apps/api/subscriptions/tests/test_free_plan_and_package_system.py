import io
import json
from decimal import Decimal
from datetime import timedelta
from PIL import Image
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from subscriptions.models import (
    SubscriptionPlan,
    Subscription,
    SubscriptionPayment,
    StudentEntitlement,
    UsageLedger,
)
from marketplace.models import PaymentMethod
from subscriptions.entitlements import EntitlementService
from exams.models import ExamCategory, Exam, Examination, ExaminationAttempt
from courses.models import Course

User = get_user_model()


def get_test_image():
    file = io.BytesIO()
    image = Image.new('RGB', (100, 100), color='blue')
    image.save(file, 'jpeg')
    file.seek(0)
    return SimpleUploadedFile("receipt.jpg", file.read(), content_type="image/jpeg")


class FreePlanAndPackageSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create_superuser(
            username="admin_pkg",
            email="admin_pkg@example.com",
            password="AdminPassword123!",
            role="admin",
        )

        # Regular student
        self.student = User.objects.create_user(
            username="student_one",
            email="student_one@example.com",
            password="StudentPassword123!",
            role="student",
        )

        # Course for testing
        self.course = Course.objects.create(
            title="General Knowledge 2026",
            slug="gk-2026",
            status="published",
        )

        # Exam Academic Taxonomy
        self.exam_cat = ExamCategory.objects.create(name="Public Service Commission")
        self.exam_node = Exam.objects.create(name="PSC General", category=self.exam_cat)

        # Payment Method
        self.payment_method = PaymentMethod.objects.create(
            display_name="eSewa Official",
            method_type="ESEWA",
            account_number="9800000000",
            account_name="Loksewa AI Pvt Ltd",
            is_active=True,
        )

        # Setup Default Free Plan
        self.free_plan = SubscriptionPlan.objects.create(
            name="Free Preparation Tier",
            slug="free-prep-tier",
            description="Free access to Loksewa preparation",
            price=Decimal("0.00"),
            is_default_free=True,
            status="ACTIVE",
            is_published=True,
            has_expiry=False,
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            free_mock_attempts=3,
            notes_access_type="COURSE_NOTES",
            can_download_notes=False,
            ai_tutor_enabled=True,
            ai_credits=500,
            ai_daily_limit=10,
        )

        # Setup Paid Plan
        self.paid_plan = SubscriptionPlan.objects.create(
            name="Premium Preparation Package",
            slug="premium-prep",
            description="Full premium access",
            price=Decimal("1999.00"),
            is_default_free=False,
            status="ACTIVE",
            is_published=True,
            has_expiry=True,
            duration=90,
            duration_unit="DAYS",
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            free_mock_attempts=15,
            notes_access_type="ALL",
            can_download_notes=True,
            ai_tutor_enabled=True,
            ai_credits=5000,
            ai_daily_limit=50,
        )

    def test_auto_activate_free_plan_on_student(self):
        """Student gets default free plan automatically and idempotently."""
        sub = EntitlementService.ensure_free_plan_entitlement(self.student)
        self.assertIsNotNone(sub)
        self.assertEqual(sub.plan, self.free_plan)
        self.assertEqual(sub.source, "FREE_PLAN")
        self.assertEqual(sub.status, "ACTIVE")
        self.assertFalse(sub.has_expiry)

        # Verify no payment submission was created
        self.assertEqual(SubscriptionPayment.objects.filter(student=self.student).count(), 0)

        # Repeated call does not duplicate subscription
        sub2 = EntitlementService.ensure_free_plan_entitlement(self.student)
        self.assertEqual(sub.id, sub2.id)
        self.assertEqual(Subscription.objects.filter(student=self.student).count(), 1)

    def test_paid_subscriber_retains_priority_over_free_plan(self):
        """Existing paid subscription takes precedence over free plan."""
        # Grant paid subscription
        paid_sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="PURCHASE",
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=90),
        )
        EntitlementService.grant_plan_entitlements(
            student=self.student,
            plan=self.paid_plan,
            subscription=paid_sub,
            reason="Purchased Plan",
        )
        self.assertEqual(paid_sub.plan, self.paid_plan)

        # Auto-activation check must NOT overwrite or supersede paid plan
        active_sub = EntitlementService.get_active_subscription(self.student)
        self.assertEqual(active_sub.id, paid_sub.id)
        self.assertEqual(active_sub.plan.price, Decimal("1999.00"))

        # ensure_free_plan_entitlement should recognize existing paid access
        result_sub = EntitlementService.ensure_free_plan_entitlement(self.student)
        self.assertEqual(result_sub.id, paid_sub.id)
        self.assertEqual(result_sub.plan, self.paid_plan)

    def test_zero_value_payment_submission_rejected(self):
        """Backend strictly rejects zero-value payment submissions for free plans."""
        self.client.force_authenticate(user=self.student)
        screenshot = get_test_image()

        response = self.client.post(
            "/api/subscriptions/payments/",
            {
                "plan": self.free_plan.id,
                "payment_method": self.payment_method.id,
                "amount": "0.00",
                "transaction_id": "FREE-TX-123",
                "screenshot": screenshot,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Free packages do not require payment", str(response.data))
        self.assertEqual(SubscriptionPayment.objects.count(), 0)

    def test_activate_free_plan_endpoint(self):
        """Authenticated student can activate or retrieve Free Plan via dedicated endpoint."""
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/subscriptions/plans/{self.free_plan.id}/activate-free/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        # Check effective entitlements endpoint
        ent_res = self.client.get("/api/subscriptions/my-subscriptions/my-entitlements/")
        self.assertEqual(ent_res.status_code, status.HTTP_200_OK)
        self.assertTrue(ent_res.data["has_active_package"])
        self.assertEqual(ent_res.data["plan"]["id"], self.free_plan.id)

    def test_single_active_default_free_plan_constraint(self):
        """Only one plan can be designated as the default Free Plan at any time."""
        new_free = SubscriptionPlan(
            name="Another Free Plan",
            slug="another-free",
            description="Conflicting free plan",
            price=Decimal("0.00"),
            is_default_free=True,
            status="ACTIVE",
            is_published=True,
        )
        new_free.save()

        # Previous free plan must have is_default_free flipped to False
        self.free_plan.refresh_from_db()
        self.assertFalse(self.free_plan.is_default_free)
        self.assertTrue(new_free.is_default_free)

    def test_admin_set_default_free_action(self):
        """Admin can designate a plan as default free via API action."""
        self.client.force_authenticate(user=self.admin_user)
        free_candidate = SubscriptionPlan.objects.create(
            name="Trial Tier",
            slug="trial-tier",
            price=Decimal("0.00"),
            is_default_free=False,
            status="ACTIVE",
            is_published=True,
        )
        response = self.client.post(
            f"/api/subscriptions/plans/{free_candidate.id}/set-default-free/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        free_candidate.refresh_from_db()
        self.assertTrue(free_candidate.is_default_free)

    def test_duplicate_plan_resets_is_default_free(self):
        """Duplicating a default free plan resets is_default_free to False on the clone."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f"/api/subscriptions/plans/{self.free_plan.id}/duplicate/",
            {},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        clone_id = response.data["id"]
        clone = SubscriptionPlan.objects.get(id=clone_id)
        self.assertFalse(clone.is_default_free)

    def test_free_mock_exam_access_and_quota_consumption(self):
        """Enforces mock exam quota tracking and reservation."""
        EntitlementService.ensure_free_plan_entitlement(self.student)

        # Examination
        exam = Examination.objects.create(
            title="Loksewa Model Exam Set 1",
            category=self.exam_cat,
            exam=self.exam_node,
            exam_type="mock",
            objective_category="model",
            total_questions=50,
            time_limit=45,
            total_marks=100,
            passing_marks=40,
            marks_per_question=2,
            status="published",
        )
        self.free_plan.free_mock_exams.add(exam)

        # 1. Initial check: can attempt
        can_attempt, reason, remaining = EntitlementService.check_exam_access(self.student, exam)
        self.assertTrue(can_attempt)

        # 2. Reserve and consume attempts
        for i in range(3):
            allowed, _, reservation_id = EntitlementService.check_and_reserve_exam_attempt(self.student, exam)
            self.assertTrue(allowed)
            attempt = ExaminationAttempt.objects.create(
                student=self.student,
                examination=exam,
                status="in-progress",
            )
            EntitlementService.consume_exam_attempt(attempt)

        # 3. Quota exhausted: 4th attempt must be blocked
        allowed, reason, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, exam)
        self.assertFalse(allowed)
        self.assertIn("exhausted", reason.lower())

    def test_notes_download_permission_enforcement(self):
        """Free plan student cannot download notes PDF when can_download_notes=False."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        can_download = EntitlementService.can_download_notes(self.student, self.course)
        self.assertFalse(can_download)

        # Paid subscriber can download
        paid_sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="PURCHASE",
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=90),
        )
        EntitlementService.grant_plan_entitlements(
            student=self.student,
            plan=self.paid_plan,
            subscription=paid_sub,
        )
        can_download_paid = EntitlementService.can_download_notes(self.student, self.course)
        self.assertTrue(can_download_paid)

    def test_management_command_assign_default_free_plan(self):
        """Management command safely assigns free plan only to eligible students without active packages."""
        # Create a new student with no subscriptions
        new_student = User.objects.create_user(
            username="unassigned_student",
            email="unassigned@example.com",
            password="Pass123!",
            role="student",
        )

        call_command("assign_default_free_plan")

        sub = Subscription.objects.filter(student=new_student, plan=self.free_plan).first()
        self.assertIsNotNone(sub)
        self.assertEqual(sub.status, "ACTIVE")
        self.assertEqual(sub.source, "FREE_PLAN")
