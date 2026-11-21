from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from exams.models import ExamCategory, Exam, Examination
from exams.public_views import PublicExaminationListView
from exams.student_serializers import StudentExaminationSerializer
from administration.exam_serializers import ExaminationSerializer

User = get_user_model()


class DynamicExamStatusTests(TestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name="Engineering", order=1)
        self.exam_level = Exam.objects.create(name="Civil Sub Engineer", category=self.category, order=1)
        self.now = timezone.now()
        self.factory = APIRequestFactory()

    def test_effective_end_time_calculation(self):
        # 1. With explicit end_time
        exam1 = Examination.objects.create(
            title="Exam with explicit end",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now,
            end_time=self.now + timedelta(hours=3),
            time_limit=60,
            status="published",
        )
        self.assertEqual(exam1.effective_end_time, exam1.end_time)

        # 2. Without explicit end_time, using time_limit
        exam2 = Examination.objects.create(
            title="Exam with duration only",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now,
            end_time=None,
            time_limit=90,
            status="published",
        )
        expected_end = self.now + timedelta(minutes=90)
        self.assertEqual(exam2.effective_end_time, expected_end)

        # 3. Always open on-demand exam (no start_time)
        exam3 = Examination.objects.create(
            title="On-demand exam",
            category=self.category,
            exam=self.exam_level,
            start_time=None,
            end_time=None,
            time_limit=60,
            status="published",
        )
        self.assertIsNone(exam3.effective_end_time)

    def test_computed_status_lifecycle(self):
        # Draft exam
        exam_draft = Examination.objects.create(
            title="Draft Exam",
            category=self.category,
            exam=self.exam_level,
            status="draft",
        )
        self.assertEqual(exam_draft.computed_status, "DRAFT")

        # Upcoming exam: start_time in future
        exam_upcoming = Examination.objects.create(
            title="Upcoming Exam",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now + timedelta(hours=2),
            time_limit=60,
            status="published",
        )
        self.assertEqual(exam_upcoming.computed_status, "UPCOMING")

        # Live exam: started 30 mins ago, 60 mins duration (ends in 30 mins)
        exam_live = Examination.objects.create(
            title="Live Exam",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(minutes=30),
            time_limit=60,
            status="published",
        )
        self.assertEqual(exam_live.computed_status, "LIVE")

        # Completed exam: started 2 hours ago, 60 mins duration (ended 1 hour ago)
        exam_completed = Examination.objects.create(
            title="Completed Exam",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(hours=2),
            time_limit=60,
            status="published",
        )
        self.assertEqual(exam_completed.computed_status, "COMPLETED")

        # On-demand published exam with no schedule is LIVE
        exam_ondemand = Examination.objects.create(
            title="On Demand Practice Exam",
            category=self.category,
            exam=self.exam_level,
            status="published",
        )
        self.assertEqual(exam_ondemand.computed_status, "LIVE")

    def test_public_api_priority_sorting(self):
        # Create examinations across all 3 lifecycle statuses
        live1 = Examination.objects.create(
            title="Live Exam 1",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(minutes=20),
            time_limit=60,
            status="published",
        )
        live2 = Examination.objects.create(
            title="Live Exam 2",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(minutes=10),
            time_limit=60,
            status="published",
        )
        upcoming_near = Examination.objects.create(
            title="Upcoming Soonest",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now + timedelta(hours=1),
            time_limit=60,
            status="published",
        )
        upcoming_far = Examination.objects.create(
            title="Upcoming Later",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now + timedelta(hours=5),
            time_limit=60,
            status="published",
        )
        completed_recent = Examination.objects.create(
            title="Completed Recently",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(hours=2),
            time_limit=60,
            status="published",
        )
        completed_old = Examination.objects.create(
            title="Completed Long Ago",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(days=5),
            time_limit=60,
            status="published",
        )

        request = self.factory.get("/api/public/exams/")
        view = PublicExaminationListView.as_view()
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Server-Time", response)
        self.assertIn("max-age=15", response["Cache-Control"])

        results = response.data
        ids = [item["id"] for item in results]
        statuses = [item["status"] for item in results]

        # Verify priority buckets
        # All LIVE must come first
        live_indices = [i for i, s in enumerate(statuses) if s == "LIVE"]
        upcoming_indices = [i for i, s in enumerate(statuses) if s == "UPCOMING"]
        completed_indices = [i for i, s in enumerate(statuses) if s == "COMPLETED"]

        self.assertTrue(max(live_indices) < min(upcoming_indices), "LIVE exams must precede UPCOMING exams")
        self.assertTrue(max(upcoming_indices) < min(completed_indices), "UPCOMING exams must precede COMPLETED exams")

        # Verify upcoming sorting: soonest start first
        upcoming_ids = [item["id"] for item in results if item["status"] == "UPCOMING"]
        self.assertEqual(upcoming_ids[0], upcoming_near.id)
        self.assertEqual(upcoming_ids[1], upcoming_far.id)

        # Verify completed sorting: most recently ended first
        completed_ids = [item["id"] for item in results if item["status"] == "COMPLETED"]
        self.assertEqual(completed_ids[0], completed_recent.id)
        self.assertEqual(completed_ids[1], completed_old.id)

    def test_student_serializer_access_block(self):
        student = User.objects.create_user(username="student_test", password="password123", role="student")

        # Upcoming exam cannot be started
        exam_upcoming = Examination.objects.create(
            title="Upcoming Exam",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now + timedelta(hours=2),
            time_limit=60,
            status="published",
        )
        serializer = StudentExaminationSerializer(exam_upcoming, context={"request": type("Req", (), {"user": student})()})
        self.assertFalse(serializer.data["can_start"])
        self.assertEqual(serializer.data["start_blocked_reason"], "This exam has not opened yet.")

        # Completed exam cannot be started
        exam_completed = Examination.objects.create(
            title="Expired Exam",
            category=self.category,
            exam=self.exam_level,
            start_time=self.now - timedelta(hours=3),
            time_limit=60,
            status="published",
        )
        serializer = StudentExaminationSerializer(exam_completed, context={"request": type("Req", (), {"user": student})()})
        self.assertFalse(serializer.data["can_start"])
        self.assertEqual(serializer.data["start_blocked_reason"], "This exam window has closed.")

    def test_admin_serializer_validation(self):
        # time_limit <= 0 must fail
        s1 = ExaminationSerializer(data={
            "title": "Invalid duration",
            "category": self.category.id,
            "exam": self.exam_level.id,
            "time_limit": 0,
        })
        self.assertFalse(s1.is_valid())
        self.assertIn("time_limit", s1.errors)

        # end_time <= start_time must fail
        s2 = ExaminationSerializer(data={
            "title": "Invalid schedule",
            "category": self.category.id,
            "exam": self.exam_level.id,
            "time_limit": 60,
            "start_time": (self.now + timedelta(hours=2)).isoformat(),
            "end_time": (self.now + timedelta(hours=1)).isoformat(),
        })
        self.assertFalse(s2.is_valid())
        self.assertIn("end_time", s2.errors)
