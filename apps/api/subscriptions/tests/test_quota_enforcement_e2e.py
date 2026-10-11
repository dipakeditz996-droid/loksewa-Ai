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
from exams.models import ExamCategory, Exam, Paper, Examination, ExaminationAttempt, PracticeSession, Subject, Chapter, Topic, Question
from notes.models import StudyMaterial
from ai_tutor.models import Conversation, Message, TutorUsage

User = get_user_model()


class QuotaEnforcementE2ETests(TestCase):
    """
    Comprehensive technical audit & E2E verification of package entitlements,
    usage accounting, and quota enforcement across Mock Exams, Topicwise Tests,
    Practice Quotas, Notes PDF Downloads, and AI Tutor.
    """

    def setUp(self):
        self.client = APIClient()

        # Admin User
        self.admin = User.objects.create_superuser(
            username="admin_e2e",
            email="admin_e2e@example.com",
            password="AdminPassword123!",
            role="admin",
        )

        # Student User
        self.student = User.objects.create_user(
            username="student_e2e",
            email="student_e2e@example.com",
            password="StudentPassword123!",
            role="student",
        )

        # Another student for IDOR checks
        self.other_student = User.objects.create_user(
            username="other_e2e",
            email="other_e2e@example.com",
            password="StudentPassword123!",
            role="student",
        )

        # Academic Taxonomy
        self.exam_cat = ExamCategory.objects.create(name="PSC Administration")
        self.exam_node = Exam.objects.create(name="Officer Grade", category=self.exam_cat)

        # Course
        self.course = Course.objects.create(
            title="Loksewa Officer Core Course",
            slug="officer-core-2026",
            status="published",
            exam=self.exam_node,
        )

        # Syllabus structure for practice & questions
        self.paper = Paper.objects.create(exam=self.exam_node, name="General Paper")
        self.subject = Subject.objects.create(name="General Governance", paper=self.paper)
        self.chapter = Chapter.objects.create(title="Constitution", subject=self.subject)
        self.topic = Topic.objects.create(name="Fundamental Rights", chapter=self.chapter)

        # Questions for practice
        for i in range(5):
            Question.objects.create(
                topic=self.topic,
                text=f"Sample Question {i+1} on Fundamental Rights?",
                option_a="Option A",
                option_b="Option B",
                option_c="Option C",
                option_d="Option D",
                correct_option="A",
                status="approved",
            )

        # Paid Mock Exam
        self.paid_mock_exam = Examination.objects.create(
            title="Officer Full Mock Exam 1",
            category=self.exam_cat,
            exam=self.exam_node,
            exam_type="mock",
            objective_category="model",
            course=self.course,
            total_questions=50,
            time_limit=45,
            total_marks=100,
            passing_marks=40,
            marks_per_question=2,
            max_attempts=0,
            status="published",
        )

        # Topicwise Test Exam
        self.topicwise_exam = Examination.objects.create(
            title="Topicwise Constitution Test",
            category=self.exam_cat,
            exam=self.exam_node,
            exam_type="subject",
            objective_category="topicwise",
            topic=self.topic,
            course=self.course,
            total_questions=20,
            time_limit=25,
            total_marks=40,
            passing_marks=16,
            marks_per_question=2,
            max_attempts=0,
            status="published",
        )

        # Designated Free Mock Exam
        self.free_mock_exam = Examination.objects.create(
            title="Free Orientation Mock Exam",
            category=self.exam_cat,
            exam=self.exam_node,
            exam_type="mock",
            objective_category="model",
            total_questions=30,
            time_limit=30,
            total_marks=60,
            passing_marks=24,
            marks_per_question=2,
            max_attempts=0,
            status="published",
        )

        # Default Free Plan (Price 0, no expiry)
        self.free_plan = SubscriptionPlan.objects.create(
            name="Default Free Preparation Plan",
            slug="default-free-plan",
            price=Decimal("0.00"),
            is_default_free=True,
            status="ACTIVE",
            is_published=True,
            has_expiry=False,
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            free_mock_attempts=2,
            notes_access_type="COURSE_NOTES",
            can_download_notes=False,
            practice_enabled=True,
            practice_question_limit=50,
            ai_tutor_enabled=True,
            ai_credits=500,
            ai_daily_limit=10,
        )
        self.free_plan.free_mock_exams.add(self.free_mock_exam)

        # Paid Package with Exam Quotas
        self.paid_plan = SubscriptionPlan.objects.create(
            name="Premium Officer Package",
            slug="premium-officer",
            price=Decimal("2500.00"),
            is_default_free=False,
            status="ACTIVE",
            is_published=True,
            has_expiry=True,
            duration=90,
            duration_unit="DAYS",
            package_type="ALL_ACCESS",
            course_access_type="ALL_ACCESS",
            exam_quotas={
                "model": {"attempts": 3, "enabled": True},
                "topicwise": {"attempts": 5, "enabled": True},
            },
            free_mock_attempts=5,
            notes_access_type="ALL",
            can_download_notes=True,
            practice_enabled=True,
            practice_question_limit=1000,
            ai_tutor_enabled=True,
            ai_credits=5000,
            ai_daily_limit=100,
        )

        # Notes / Study Materials
        dummy_pdf = SimpleUploadedFile("constitution.pdf", b"%PDF-1.4 dummy content", content_type="application/pdf")
        with patch('core.google_drive.upload_file', return_value={'id': 'testdrivefileid123'}):
            self.note = StudyMaterial.objects.create(
                title="Fundamental Rights Master Notes",
                slug="fundamental-rights-notes",
                course=self.course,
                subject=self.subject,
                topic=self.topic,
                exam=self.exam_node,
                status="published",
                file=dummy_pdf,
                is_downloadable=True,
            )

    # =========================================================================
    # 1. MOCK EXAM & TOPICWISE TEST QUOTA ENFORCEMENT
    # =========================================================================

    def test_free_mock_exam_quota_lifecycle(self):
        """Free student can take designated free mock exam up to quota, then blocked."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        self.client.force_authenticate(user=self.student)

        # First attempt: succeeds (reserves 1 attempt)
        resp1 = self.client.post(f"/api/student/exams/{self.free_mock_exam.id}/start/")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        attempt_id = resp1.data["id"]

        # Resuming the in-progress attempt does NOT consume another quota
        resp_resume = self.client.post(f"/api/student/exams/{self.free_mock_exam.id}/start/")
        self.assertEqual(resp_resume.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_resume.data.get("resumed"))
        self.assertEqual(resp_resume.data["id"], attempt_id)

        # Submit attempt 1
        attempt1 = ExaminationAttempt.objects.get(id=attempt_id)
        attempt1.status = "submitted"
        attempt1.save()
        EntitlementService.consume_exam_attempt(attempt1)

        # Second attempt: succeeds
        resp2 = self.client.post(f"/api/student/exams/{self.free_mock_exam.id}/start/")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        attempt2 = ExaminationAttempt.objects.get(id=resp2.data["id"])
        attempt2.status = "submitted"
        attempt2.save()
        EntitlementService.consume_exam_attempt(attempt2)

        # Third attempt: BLOCKED (quota of 2 exhausted)
        resp3 = self.client.post(f"/api/student/exams/{self.free_mock_exam.id}/start/")
        self.assertEqual(resp3.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("exhausted", resp3.data["detail"].lower())

    def test_paid_mock_exam_blocked_for_free_plan_student(self):
        """Free plan student cannot access paid-only mock exam not in free_mock_exams."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        self.client.force_authenticate(user=self.student)

        resp = self.client.post(f"/api/student/exams/{self.paid_mock_exam.id}/start/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("upgrade", resp.data["detail"].lower())

    def test_topicwise_quota_enforcement(self):
        """Paid student topicwise test quota is tracked and enforced when exhausted."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="PURCHASE",
            start_date=timezone.now(),
            expiry_date=timezone.now() + timezone.timedelta(days=90),
        )
        EntitlementService.grant_plan_entitlements(self.student, self.paid_plan, subscription=sub)
        self.client.force_authenticate(user=self.student)

        # Topicwise quota is 5
        ent = StudentEntitlement.objects.get(student=self.student, feature="exam:topicwise")
        self.assertEqual(ent.remaining, 5)

        # Simulate 5 consumed attempts
        ent.consumed = 5
        ent.save(update_fields=["consumed"])

        # 6th attempt must be blocked
        resp = self.client.post(f"/api/student/exams/{self.topicwise_exam.id}/start/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("exhausted", resp.data["detail"].lower())

    # =========================================================================
    # 2. NOTES & STUDY MATERIAL ACCESS ENFORCEMENT
    # =========================================================================

    def test_notes_viewing_allowed_but_pdf_download_blocked_on_free_plan(self):
        """Free student can view notes in-browser but cannot download PDF file."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        self.client.force_authenticate(user=self.student)

        # 1. Viewing note detail is allowed
        resp_view = self.client.get(f"/api/notes/materials/{self.note.id}/")
        self.assertEqual(resp_view.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_view.data["title"], self.note.title)

        # 2. Downloading note PDF is BLOCKED (can_download_notes=False)
        resp_dl = self.client.get(f"/api/notes/materials/{self.note.id}/download/")
        self.assertEqual(resp_dl.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("does not permit downloading notes as pdf", resp_dl.data["detail"].lower())

    def test_notes_pdf_download_allowed_for_paid_subscriber(self):
        """Paid subscriber with can_download_notes=True can download note PDF."""
        sub = Subscription.objects.create(
            student=self.student,
            plan=self.paid_plan,
            status="ACTIVE",
            source="PURCHASE",
            start_date=timezone.now(),
            expiry_date=timezone.now() + timezone.timedelta(days=90),
        )
        EntitlementService.grant_plan_entitlements(self.student, self.paid_plan, subscription=sub)
        self.client.force_authenticate(user=self.student)

        with patch('core.google_drive.download_file', return_value=b"%PDF-1.4 dummy pdf content"):
            resp_dl = self.client.get(f"/api/notes/materials/{self.note.id}/download/")
            self.assertEqual(resp_dl.status_code, status.HTTP_200_OK)
            self.assertEqual(resp_dl["Content-Type"], "application/pdf")

    # =========================================================================
    # 3. AI TUTOR CREDITS & USAGE ACCOUNTING
    # =========================================================================

    def test_ai_tutor_credits_exhaustion_blocks_further_requests(self):
        """When AI credits are exhausted, further chat messages are blocked."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        conv = Conversation.objects.create(student=self.student, mode="general")
        self.client.force_authenticate(user=self.student)

        # Manually set AI credits to 0
        ai_ent = StudentEntitlement.objects.get(student=self.student, feature="ai_credits")
        ai_ent.consumed = ai_ent.total_allowed
        ai_ent.save(update_fields=["consumed"])

        resp = self.client.post(
            f"/api/tutor/conversations/{conv.id}/send/",
            {"content": "Explain Article 16 of Nepal Constitution"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("exhausted", resp.data["error"].lower())

    def test_ai_tutor_failed_generation_does_not_consume_credits(self):
        """Provider failure does not increment usage counter or charge credits."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        conv = Conversation.objects.create(student=self.student, mode="general")
        self.client.force_authenticate(user=self.student)

        before_consumed = StudentEntitlement.objects.get(student=self.student, feature="ai_credits").consumed

        with patch("ai_tutor.services.AITutorService.generate_response", side_effect=Exception("Provider timeout")):
            resp = self.client.post(
                f"/api/tutor/conversations/{conv.id}/send/",
                {"content": "Explain fundamental rights"},
                format="json",
            )
            self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
            after_consumed = StudentEntitlement.objects.get(student=self.student, feature="ai_credits").consumed
            self.assertEqual(before_consumed, after_consumed)

    # =========================================================================
    # 4. PRACTICE QUOTAS & ENFORCEMENT
    # =========================================================================

    def test_practice_quota_enforcement_and_consumption(self):
        """Practice sessions respect practice_enabled and question limits."""
        EntitlementService.ensure_free_plan_entitlement(self.student)
        self.client.force_authenticate(user=self.student)

        # Free plan has practice_question_limit=50
        prac_ent = StudentEntitlement.objects.get(student=self.student, feature="practice_questions")
        self.assertEqual(prac_ent.remaining, 50)

        # Start practice session requesting 5 questions
        resp = self.client.post(
            "/api/practice-sessions/",
            {
                "topic": self.topic.id,
                "total_questions": 5,
                "mode": "study",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Verify consumed questions recorded in StudentEntitlement & UsageLedger
        prac_ent.refresh_from_db()
        self.assertEqual(prac_ent.consumed, 5)
        self.assertEqual(prac_ent.remaining, 45)

        ledger_entry = UsageLedger.objects.filter(student=self.student, feature="practice_questions").first()
        self.assertIsNotNone(ledger_entry)
        self.assertEqual(ledger_entry.amount, 5)

    # =========================================================================
    # 5. ADMIN AUDIT & MANUAL QUOTA ADJUSTMENTS
    # =========================================================================

    def test_admin_adjust_quota_endpoint(self):
        """Admin can adjust student quotas via API; non-admin is blocked."""
        EntitlementService.ensure_free_plan_entitlement(self.student)

        # 1. Non-admin student cannot call adjustment API (HTTP 403)
        self.client.force_authenticate(user=self.student)
        resp_unauth = self.client.post(
            "/api/subscriptions/my-subscriptions/admin-adjust-quota/",
            {"student_id": self.student.id, "feature": "ai_credits", "delta": 1000, "reason": "Self grant"},
            format="json",
        )
        self.assertEqual(resp_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin successfully adjusts quota
        self.client.force_authenticate(user=self.admin)
        resp_admin = self.client.post(
            "/api/subscriptions/my-subscriptions/admin-adjust-quota/",
            {
                "student_id": self.student.id,
                "feature": "ai_credits",
                "delta": 2500,
                "reason": "Scholarship bonus grant #2026",
            },
            format="json",
        )
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_admin.data["total_allowed"], 3000)  # 500 initial + 2500 delta

        # 3. Verified in UsageLedger
        ledger = UsageLedger.objects.filter(student=self.student, event_type="ADMIN_ADJUST").first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.amount, 2500)
        self.assertEqual(ledger.admin_user, self.admin)
