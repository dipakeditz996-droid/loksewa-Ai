from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from subscriptions.models import Subscription, SubscriptionPlan, SubscriptionPayment
from subscriptions.serializers import SubscriptionSerializer
from subscriptions.access import get_active_subscription, has_active_subscription
from courses.models import Course, Enrollment

User = get_user_model()


class SubscriptionExpiryAndPurchasesTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="expiry_test_student",
            email="expiry@test.com",
            password="password123",
            role="student"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.student)

        # Plan 1: Free plan with no expiry
        self.free_plan_no_expiry = SubscriptionPlan.objects.create(
            name="Free Lifetime Tier",
            price=Decimal("0.00"),
            duration=None,
            duration_unit=None,
            has_expiry=False,
            is_default_free=False,
            status="ACTIVE",
            is_published=True
        )

        # Plan 2: Free plan with explicitly configured expiry (e.g. 14 days promotional trial)
        self.free_plan_with_expiry = SubscriptionPlan.objects.create(
            name="14-Day Free Trial",
            price=Decimal("0.00"),
            duration=14,
            duration_unit="DAYS",
            has_expiry=True,
            is_default_free=False,
            status="ACTIVE",
            is_published=True
        )

        # Plan 3: Paid plan with future expiry
        self.paid_plan = SubscriptionPlan.objects.create(
            name="PSC Civil Engineering 30-Days",
            price=Decimal("1500.00"),
            duration=30,
            duration_unit="DAYS",
            has_expiry=True,
            is_default_free=False,
            status="ACTIVE",
            is_published=True
        )

    def test_scenario_1_free_plan_no_expiry(self):
        """Scenario 1: Free plan with no expiry has has_expiry=False, expiry_date=None, remaining_days=None."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.free_plan_no_expiry,
            status="ACTIVE",
            source="FREE_PLAN",
            start_date=timezone.now(),
            expiry_date=None
        )

        self.assertTrue(sub.is_active)
        self.assertFalse(sub.has_expiry)

        serializer = SubscriptionSerializer(sub)
        data = serializer.data
        self.assertFalse(data["has_expiry"])
        self.assertIsNone(data["expiry_date"])
        self.assertIsNone(data["remaining_days"])
        self.assertEqual(data["computed_status"], "ACTIVE")

    def test_scenario_2_paid_plan_valid_future_expiry(self):
        """Scenario 2: Paid plan with valid future expiry has real date and positive remaining days."""
        now = timezone.now()
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="CUSTOMER_PAYMENT",
            start_date=now,
            expiry_date=now + timedelta(days=30)
        )

        self.assertTrue(sub.is_active)
        self.assertTrue(sub.has_expiry)

        serializer = SubscriptionSerializer(sub)
        data = serializer.data
        self.assertTrue(data["has_expiry"])
        self.assertIsNotNone(data["expiry_date"])
        self.assertGreaterEqual(data["remaining_days"], 29)
        self.assertEqual(data["computed_status"], "ACTIVE")

    def test_scenario_3_expired_subscription(self):
        """Scenario 3: Expired subscription evaluates as not active with EXPIRED computed status."""
        now = timezone.now()
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="CUSTOMER_PAYMENT",
            start_date=now - timedelta(days=40),
            expiry_date=now - timedelta(days=10)
        )

        self.assertFalse(sub.is_active)
        self.assertTrue(sub.has_expiry)

        serializer = SubscriptionSerializer(sub)
        data = serializer.data
        self.assertEqual(data["computed_status"], "EXPIRED")
        self.assertEqual(data["remaining_days"], 0)

    def test_scenario_4_epoch_corrupted_date_guard(self):
        """Scenario 4: 1970 Unix epoch timestamp is guarded and treated as non-expiring."""
        import datetime
        epoch = datetime.datetime(1970, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.free_plan_no_expiry,
            status="ACTIVE",
            source="FREE_PLAN",
            start_date=timezone.now(),
            expiry_date=epoch
        )

        # Model properties guard year < 2000
        self.assertFalse(sub.has_expiry)
        self.assertTrue(sub.is_active)

        serializer = SubscriptionSerializer(sub)
        data = serializer.data
        self.assertFalse(data["has_expiry"])
        self.assertIsNone(data["remaining_days"])
        self.assertEqual(data["computed_status"], "ACTIVE")

    def test_scenario_5_free_plan_with_explicit_expiry(self):
        """Scenario 5: Admin-configured expiry on a free plan is respected."""
        now = timezone.now()
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.free_plan_with_expiry,
            status="ACTIVE",
            source="FREE_PLAN",
            start_date=now,
            expiry_date=now + timedelta(days=14)
        )

        self.assertTrue(sub.has_expiry)
        self.assertTrue(sub.is_active)

        serializer = SubscriptionSerializer(sub)
        data = serializer.data
        self.assertTrue(data["has_expiry"])
        self.assertIsNotNone(data["expiry_date"])
        self.assertGreaterEqual(data["remaining_days"], 13)
        self.assertEqual(data["computed_status"], "ACTIVE")

    def test_scenario_6_my_subscriptions_api_endpoint(self):
        """Scenario 6: /api/subscriptions/my-subscriptions/ returns properly serialized fields."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.free_plan_no_expiry,
            status="ACTIVE",
            source="FREE_PLAN",
            start_date=timezone.now(),
            expiry_date=None
        )

        resp = self.client.get("/api/subscriptions/my-subscriptions/")
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["id"], sub.id)
        self.assertFalse(item["has_expiry"])
        self.assertIsNone(item["expiry_date"])
        self.assertIsNone(item["remaining_days"])
        self.assertEqual(item["computed_status"], "ACTIVE")

    def test_scenario_7_active_subscription_precedence_and_access(self):
        """Scenario 7: get_active_subscription prioritizes active paid over free, and active check is reliable."""
        free_sub = Subscription.objects.create(
            student=self.student,
            plan=self.free_plan_no_expiry,
            status="ACTIVE",
            source="FREE_PLAN",
            start_date=timezone.now(),
            expiry_date=None
        )
        self.assertEqual(get_active_subscription(self.student), free_sub)

        now = timezone.now()
        paid_sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="CUSTOMER_PAYMENT",
            start_date=now,
            expiry_date=now + timedelta(days=30)
        )
        self.assertEqual(get_active_subscription(self.student), paid_sub)
        self.assertTrue(has_active_subscription(self.student))
