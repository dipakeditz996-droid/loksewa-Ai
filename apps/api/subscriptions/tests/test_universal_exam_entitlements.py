from decimal import Decimal
from datetime import timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from subscriptions.models import (
    SubscriptionPlan,
    Subscription,
    StudentEntitlement,
    PackageExamAccess,
    UsageLedger,
)
from subscriptions.entitlements import EntitlementService
from subscriptions.universal_exam_access import resolve_exam_type
from subscriptions.serializers import SubscriptionPlanSerializer
from exams.models import ExamCategory, Exam, Examination, ExaminationAttempt

User = get_user_model()


class UniversalExamEntitlementsTests(TestCase):
    def setUp(self):
        from core.models import AdminSettings
        admin_settings = AdminSettings.get_settings()
        admin_settings.enforce_subscription_access = True
        admin_settings.save()

        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username="admin_ent",
            email="admin_ent@example.com",
            password="AdminPassword123!",
            role="admin",
        )

        # Student user
        self.student = User.objects.create_user(
            username="student_ent",
            email="student_ent@example.com",
            password="StudentPassword123!",
            role="student",
        )

        from courses.models import Course
        self.course = Course.objects.create(
            title="Loksewa General Course",
            slug="loksewa-general-course",
            status="published",
        )

        # Base exam category and node
        self.exam_cat = ExamCategory.objects.create(name="Public Service Commission")
        self.exam_node = Exam.objects.create(name="Section Officer", category=self.exam_cat)

        # Create sample examinations for various categories
        self.mock_exam_1 = Examination.objects.create(
            title="Full Mock Exam 1",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="mock",
            objective_category="model",
            status="published",
            total_questions=10,
            time_limit=30,
            total_marks=50,
            passing_marks=20,
            marks_per_question=2,
        )

        self.mock_exam_2 = Examination.objects.create(
            title="Full Mock Exam 2",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="mock",
            objective_category="model",
            status="published",
            total_questions=10,
            time_limit=30,
            total_marks=50,
            passing_marks=20,
            marks_per_question=2,
        )

        self.model_exam_1 = Examination.objects.create(
            title="Officer Model Question 1",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="full",
            objective_category="model",
            status="published",
            total_questions=10,
            time_limit=30,
            total_marks=50,
            passing_marks=20,
            marks_per_question=2,
        )

        self.model_exam_2 = Examination.objects.create(
            title="Officer Model Question 2",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="full",
            objective_category="model",
            status="published",
            total_questions=10,
            time_limit=30,
            total_marks=50,
            passing_marks=20,
            marks_per_question=2,
        )

        self.practice_exam_1 = Examination.objects.create(
            title="Daily Practice Set 1",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="practice",
            status="published",
            total_questions=5,
            time_limit=15,
            total_marks=25,
            passing_marks=10,
            marks_per_question=2,
        )

        self.practice_exam_2 = Examination.objects.create(
            title="Daily Practice Set 2",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="practice",
            status="published",
            total_questions=5,
            time_limit=15,
            total_marks=25,
            passing_marks=10,
            marks_per_question=2,
        )

        self.live_exam = Examination.objects.create(
            title="Saturday Live Competition Exam",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="full",
            objective_category="live",
            status="published",
            total_questions=20,
            time_limit=45,
            total_marks=100,
            passing_marks=40,
            marks_per_question=2,
        )

        self.topicwise_exam = Examination.objects.create(
            title="Geography Topicwise Drill",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="subject",
            objective_category="topicwise",
            status="published",
            total_questions=10,
            time_limit=20,
            total_marks=40,
            passing_marks=16,
            marks_per_question=2,
        )

    def _subscribe_student_to_plan(self, plan, is_active=True, expired=False):
        now = timezone.now()
        start = now - timedelta(days=40) if expired else now - timedelta(days=2)
        exp = now - timedelta(days=10) if expired else now + timedelta(days=30)
        status_val = "EXPIRED" if expired else ("ACTIVE" if is_active else "CANCELLED")

        sub = Subscription.objects.create(
            student=self.student,
            plan=plan,
            status=status_val,
            source="ADMIN_GRANT",
            start_date=start,
            expiry_date=exp,
        )
        if not expired and is_active:
            EntitlementService.grant_plan_entitlements(self.student, plan, sub)
        return sub

    def test_mode_a_any_available_exams_within_quota(self):
        """Mode A: Student can attempt any published exam in category within total quota."""
        plan = SubscriptionPlan.objects.create(
            name="Mock Pass Mode A",
            slug="mock-pass-mode-a",
            price=Decimal("499.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        PackageExamAccess.objects.create(
            plan=plan,
            exam_type="mock",
            is_enabled=True,
            access_mode="ANY",
            total_attempts=2,
        )

        self._subscribe_student_to_plan(plan)

        # Attempt 1 on mock_exam_1
        res1, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.mock_exam_1)
        self.assertTrue(res1)

        # Attempt 2 on mock_exam_2 (different mock exam, same category)
        res2, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.mock_exam_2)
        self.assertTrue(res2)

        # Attempt 3 exceeds quota of 2
        res3, reason3, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.mock_exam_1)
        self.assertFalse(res3)
        self.assertIn("exhausted", reason3.lower())

    def test_mode_b_specific_selected_exams_allowed_only(self):
        """Mode B: Only explicitly selected exams can be accessed."""
        plan = SubscriptionPlan.objects.create(
            name="Curated Model Exams",
            slug="curated-model-exams",
            price=Decimal("699.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        access = PackageExamAccess.objects.create(
            plan=plan,
            exam_type="model",
            is_enabled=True,
            access_mode="SPECIFIC",
            total_attempts=10,
        )
        access.selected_exams.add(self.model_exam_1)

        self._subscribe_student_to_plan(plan)

        # Selected exam 1 should be allowed
        check1, _, _ = EntitlementService.check_exam_access(self.student, self.model_exam_1)
        self.assertTrue(check1)

        # Unselected model exam 2 should be rejected
        check2, reason2, _ = EntitlementService.check_exam_access(self.student, self.model_exam_2)
        self.assertFalse(check2)
        self.assertIn("not included in your preparation package", reason2)

    def test_mode_b_per_exam_attempt_limit(self):
        """Mode B: attempts_per_exam limits attempts per individual exam."""
        plan = SubscriptionPlan.objects.create(
            name="Practice Bundle with Per-Exam Limit",
            slug="practice-bundle-limit",
            price=Decimal("299.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        access = PackageExamAccess.objects.create(
            plan=plan,
            exam_type="practice",
            is_enabled=True,
            access_mode="SPECIFIC",
            total_attempts=10,
            attempts_per_exam=1,
        )
        access.selected_exams.add(self.practice_exam_1, self.practice_exam_2)

        self._subscribe_student_to_plan(plan)

        # Attempt practice_exam_1 first time
        res1, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.practice_exam_1)
        self.assertTrue(res1)

        # Record attempt completion in DB so attempts count is registered
        ExaminationAttempt.objects.create(
            student=self.student,
            examination=self.practice_exam_1,
            status="submitted",
            score=20,
            passed=True,
        )

        # Second attempt on practice_exam_1 should be blocked because attempts_per_exam == 1
        res2, reason2, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.practice_exam_1)
        self.assertFalse(res2)
        self.assertIn("Maximum attempts reached for this exam", reason2)

        # But practice_exam_2 is still allowed because it has 0 attempts
        res3, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.practice_exam_2)
        self.assertTrue(res3)

    def test_disabled_exam_category_denies_access(self):
        """When an exam category is disabled in package, attempts are blocked."""
        plan = SubscriptionPlan.objects.create(
            name="No Live Exams Plan",
            slug="no-live-exams",
            price=Decimal("199.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        PackageExamAccess.objects.create(
            plan=plan,
            exam_type="live",
            is_enabled=False,
            access_mode="ANY",
            total_attempts=5,
        )

        self._subscribe_student_to_plan(plan)

        check, reason, _ = EntitlementService.check_exam_access(self.student, self.live_exam)
        self.assertFalse(check)
        self.assertIn("not included in your preparation package", reason)

    def test_unlimited_attempts_does_not_deplete_quota(self):
        """total_attempts == -1 grants unlimited attempts without consuming quota."""
        plan = SubscriptionPlan.objects.create(
            name="Unlimited Topicwise Pass",
            slug="unlimited-topicwise",
            price=Decimal("999.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        PackageExamAccess.objects.create(
            plan=plan,
            exam_type="topicwise",
            is_enabled=True,
            access_mode="ANY",
            total_attempts=-1,
        )

        self._subscribe_student_to_plan(plan)

        for _ in range(5):
            res, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.topicwise_exam)
            self.assertTrue(res)

    def test_expired_subscription_denies_access(self):
        """Expired subscriptions immediately block access."""
        plan = SubscriptionPlan.objects.create(
            name="Expired Exam Plan",
            slug="expired-plan",
            price=Decimal("300.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        PackageExamAccess.objects.create(
            plan=plan,
            exam_type="mock",
            is_enabled=True,
            access_mode="ANY",
            total_attempts=5,
        )

        self._subscribe_student_to_plan(plan, expired=True)

        check, reason, _ = EntitlementService.check_exam_access(self.student, self.mock_exam_1)
        self.assertFalse(check)
        self.assertIn("preparation package is required", reason.lower())

    def test_direct_api_bypass_blocked_at_viewset_level(self):
        """Student cannot bypass package restrictions by calling student exam endpoints directly."""
        plan = SubscriptionPlan.objects.create(
            name="Model Only Plan",
            slug="model-only-plan",
            price=Decimal("499.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        # Only model_exam_1 is allowed
        acc = PackageExamAccess.objects.create(
            plan=plan,
            exam_type="model",
            is_enabled=True,
            access_mode="SPECIFIC",
            total_attempts=2,
        )
        acc.selected_exams.add(self.model_exam_1)

        self._subscribe_student_to_plan(plan)
        self.client.force_authenticate(user=self.student)

        # GET detail on unselected model_exam_2 should return 403 or 404
        res_detail = self.client.get(f"/api/student/exams/{self.model_exam_2.id}/")
        self.assertIn(res_detail.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # POST start on unselected model_exam_2 should return 403 or 404
        res_start = self.client.post(f"/api/student/exams/{self.model_exam_2.id}/start/")
        self.assertIn(res_start.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # POST start on selected model_exam_1 should succeed
        res_allowed = self.client.post(f"/api/student/exams/{self.model_exam_1.id}/start/")
        self.assertIn(res_allowed.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_serializer_validates_selected_exam_category_match(self):
        """Serializer rejects exams in specific access mode if they don't match the category."""
        payload = {
            "name": "Invalid Category Mismatch Plan",
            "slug": "mismatch-plan",
            "price": "500.00",
            "package_type": "ALL_ACCESS",
            "course_access_type": "ALL_ACCESS",
            "exam_access_configs": [
                {
                    "exam_type": "mock",
                    "is_enabled": True,
                    "access_mode": "SPECIFIC",
                    "total_attempts": 5,
                    "selected_exam_ids": [self.practice_exam_1.id],  # Practice exam, not mock!
                }
            ],
        }

        serializer = SubscriptionPlanSerializer(data=payload)
        is_valid = serializer.is_valid()
        self.assertFalse(is_valid)
        self.assertIn("exam_access_configs", serializer.errors)

    def test_backward_compatibility_with_legacy_plans(self):
        """Legacy plans without PackageExamAccess fallback to exam_quotas and free_mock_attempts."""
        legacy_plan = SubscriptionPlan.objects.create(
            name="Legacy Package Plan",
            slug="legacy-package-plan",
            price=Decimal("199.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
            free_mock_attempts=4,
            exam_quotas={"model": {"enabled": True, "attempts": 3}},
        )

        self._subscribe_student_to_plan(legacy_plan)

        # Legacy mock check
        check_mock, _, _ = EntitlementService.check_exam_access(self.student, self.mock_exam_1)
        self.assertTrue(check_mock)

        # Legacy model check
        check_model, _, _ = EntitlementService.check_exam_access(self.student, self.model_exam_1)
        self.assertTrue(check_model)


class ConcurrentAttemptSafetyTests(TransactionTestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student_conc",
            email="student_conc@example.com",
            password="StudentPassword123!",
            role="student",
        )

        from core.models import AdminSettings
        admin_settings = AdminSettings.get_settings()
        admin_settings.enforce_subscription_access = True
        admin_settings.save()

        from courses.models import Course
        self.course = Course.objects.create(
            title="Loksewa Concurrent Course",
            slug="loksewa-concurrent-course",
            status="published",
        )

        self.exam_cat = ExamCategory.objects.create(name="Public Service Commission")
        self.exam_node = Exam.objects.create(name="Section Officer", category=self.exam_cat)

        self.mock_exam = Examination.objects.create(
            title="Full Mock Exam Concurrent",
            category=self.exam_cat,
            exam=self.exam_node,
            course=self.course,
            exam_type="mock",
            objective_category="model",
            status="published",
            total_questions=10,
            time_limit=30,
            total_marks=50,
            passing_marks=20,
            marks_per_question=2,
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Concurrent Test Plan",
            slug="concurrent-test-plan",
            price=Decimal("100.00"),
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )
        PackageExamAccess.objects.create(
            plan=self.plan,
            exam_type="mock",
            is_enabled=True,
            access_mode="ANY",
            total_attempts=1,  # Only 1 attempt allowed
        )

        self.sub = Subscription.objects.create(
            student=self.student,
            plan=self.plan,
            status="ACTIVE",
            source="ADMIN_GRANT",
            start_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=30),
        )
        EntitlementService.grant_plan_entitlements(self.student, self.plan, self.sub)

    def test_atomic_quota_reservation_prevents_overuse(self):
        """Under atomic reservation, quota is decremented and second attempt is blocked."""
        # First reservation succeeds
        first_res, _, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.mock_exam)
        self.assertTrue(first_res)

        # Check entitlement balance was safely decremented
        ent = StudentEntitlement.objects.get(student=self.student, feature="exam:mock")
        self.assertEqual(ent.remaining, 0)

        # Immediate second reservation fails
        second_res, reason2, _ = EntitlementService.check_and_reserve_exam_attempt(self.student, self.mock_exam)
        self.assertFalse(second_res)
        self.assertIn("exhausted", reason2.lower())
