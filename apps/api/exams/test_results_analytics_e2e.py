from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User
from exams.models import (
    ExamCategory,
    Exam as AcademicExam,
    Paper,
    Subject,
    Chapter,
    Topic,
    Question,
    Examination,
    ExaminationQuestion,
    ExaminationAttempt,
    StudentAnswer,
    PracticeSession,
    QuestionAttempt,
    SubjectiveSubmission,
    SubjectiveQuestionScore,
)
from exams.attempt_timing import finalize_attempt
from courses.models import Course, Enrollment
from subscriptions.models import SubscriptionPlan, Subscription
from gamification.models import GamificationProfile
from analytics.services.analytics_service import AnalyticsService


class ResultsAnalyticsE2ETests(TestCase):
    def setUp(self):
        # 1. Setup Academic hierarchy
        self.category = ExamCategory.objects.create(name="Civil Services")
        self.academic_exam = AcademicExam.objects.create(
            name="Section Officer",
            category=self.category,
            is_active=True,
        )
        self.paper = Paper.objects.create(exam=self.academic_exam, name="Paper 1", paper_number="P1")
        self.subject = Subject.objects.create(paper=self.paper, name="Governance & Management")
        self.chapter = Chapter.objects.create(subject=self.subject, title="Public Administration")
        self.topic = Topic.objects.create(chapter=self.chapter, name="Bureaucracy")

        # 2. Setup Course
        self.course = Course.objects.create(
            exam=self.academic_exam,
            title="Loksewa Officer Masterclass",
            slug="officer-masterclass",
            status="published",
        )

        # 3. Setup Students
        self.student_a = User.objects.create_user(
            username="student_a",
            email="student_a@example.com",
            password="password123",
            role="student",
        )
        self.student_b = User.objects.create_user(
            username="student_b",
            email="student_b@example.com",
            password="password123",
            role="student",
        )

        # 4. Enroll Student A and Student B
        self.enrollment_a = Enrollment.objects.create(
            student=self.student_a,
            course=self.course,
            status="active",
        )
        self.enrollment_b = Enrollment.objects.create(
            student=self.student_b,
            course=self.course,
            status="active",
        )

        # 5. Create Questions
        self.questions = []
        for i in range(1, 11):
            q = Question.objects.create(
                topic=self.topic,
                text=f"Question {i}: What is the core principle of civil service?",
                option_a="Neutrality",
                option_b="Favoritism",
                option_c="Incompetence",
                option_d="Delay",
                correct_option="A",
                marks=2.0,
                difficulty="medium",
                question_type="mcq",
                explanation="Neutrality is a pillar of civil service.",
            )
            self.questions.append(q)

        # 6. Create Examination
        self.examination = Examination.objects.create(
            title="Loksewa Paper 1 Mock Exam",
            category=self.category,
            exam=self.academic_exam,
            course=self.course,
            exam_type="mock",
            objective_category="model",
            total_marks=20.0,
            passing_marks=8.0,
            status="published",
            time_limit=30,
            show_correct_answers=True,
            result_visibility="immediate",
        )
        for idx, q in enumerate(self.questions):
            ExaminationQuestion.objects.create(
                examination=self.examination,
                question=q,
                order=idx + 1,
                marks=2.0,
            )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.student_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.student_b)

    def test_result_consistency_answered_unanswered_and_scoring(self):
        """
        Student answers 6 out of 10 questions:
        - 4 correct (options='A')
        - 2 wrong (options='B')
        - 4 unanswered (skipped)
        Verifies:
        total = 10
        attempted = 6
        correct = 4
        wrong = 2
        unanswered = 4 (attempted + unanswered == total)
        correct + wrong == attempted
        score = 4 * 2.0 = 8.0 / 20.0
        percentage = 40.0%
        accuracy = 4 / 6 * 100 = 66.7%
        """
        attempt = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=self.examination,
            status="in-progress",
            started_at=timezone.now() - timedelta(minutes=15),
        )

        # Answer 6 questions
        for idx, q in enumerate(self.questions[:6]):
            # Questions 0..3: option A (correct)
            # Questions 4..5: option B (wrong)
            selected = "A" if idx < 4 else "B"
            is_corr = (selected == "A")
            StudentAnswer.objects.create(
                attempt=attempt,
                question=q,
                selected_option=selected,
                is_correct=is_corr,
                marks_awarded=q.marks if is_corr else 0.0,
            )

        # Finalize attempt (as occurs on submit or timeout)
        finalize_attempt(attempt)
        attempt.refresh_from_db()

        self.assertEqual(attempt.status, "submitted")
        self.assertEqual(attempt.score, 8.0)
        self.assertEqual(attempt.percentage, 40.0)
        self.assertTrue(attempt.passed)

        # Verify through the authoritative Result API
        resp = self.client_a.get(f"/api/student/exam-attempts/{attempt.id}/result/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        self.assertEqual(data["total_questions"], 10)
        self.assertEqual(data["attempted_questions"], 6)
        self.assertEqual(data["correct_answers"], 4)
        self.assertEqual(data["wrong_answers"], 2)
        self.assertEqual(data["unanswered"], 4)
        self.assertEqual(data["score"], 8.0)
        self.assertEqual(data["total_marks"], 20.0)
        self.assertEqual(data["percentage"], 40.0)
        self.assertEqual(data["accuracy"], 66.7)

        # Identity consistency checks
        self.assertEqual(data["attempted_questions"] + data["unanswered"], data["total_questions"])
        self.assertEqual(data["correct_answers"] + data["wrong_answers"], data["attempted_questions"])

        # finalize_attempt() pads unanswered questions with blank StudentAnswer rows,
        # so all 10 assigned questions appear in the answers list (unanswered ones
        # have selected_option=None). The serializer returns all 10.
        self.assertEqual(len(data["answers"]), 10)
        for ans in data["answers"]:
            self.assertIsNotNone(ans["question_text"])
            # correct_option is exposed because show_correct_answers=True on this exam
            self.assertEqual(ans["correct_option"], "A")
            self.assertTrue(bool(ans["explanation"]))

        # Verify subject breakdown for this attempt
        # 'questions' = count of StudentAnswer rows recorded for this subject (6 answered)
        self.assertGreaterEqual(len(data["subject_breakdown"]), 1)
        sub_stat = next(
            (s for s in data["subject_breakdown"] if "Governance" in s["subject"]),
            None,
        )
        self.assertIsNotNone(sub_stat, "Expected subject 'Governance & Management' in breakdown")
        self.assertEqual(sub_stat["correct"], 4)
        # 'questions' counts ALL StudentAnswer rows in this subject;
        # finalize_attempt pads all 10 assigned questions (unanswered = selected_option=None)
        self.assertEqual(sub_stat["questions"], 10)

        # Verify topic breakdown for this attempt
        self.assertGreaterEqual(len(data["topic_breakdown"]), 1)
        top_stat = next(
            (t for t in data["topic_breakdown"] if "Bureaucracy" in t["topic"]),
            None,
        )
        self.assertIsNotNone(top_stat, "Expected topic 'Bureaucracy' in breakdown")
        self.assertEqual(top_stat["correct"], 4)
        # Same padding applies: all 10 questions appear in topic breakdown
        self.assertEqual(top_stat["questions"], 10)

    def test_result_ownership_student_cannot_access_other_student_result(self):
        """
        Student B must be rejected when attempting to access Student A's attempt or result.
        """
        attempt_a = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=self.examination,
            status="submitted",
            score=10.0,
            percentage=50.0,
            submitted_at=timezone.now(),
        )

        # Student A can view their own attempt and result
        resp_a = self.client_a.get(f"/api/student/exam-attempts/{attempt_a.id}/result/")
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)

        # Student B tries to retrieve Student A's result
        resp_b_result = self.client_b.get(f"/api/student/exam-attempts/{attempt_a.id}/result/")
        self.assertIn(resp_b_result.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Student B tries to retrieve Student A's attempt
        resp_b_attempt = self.client_b.get(f"/api/student/exam-attempts/{attempt_a.id}/")
        self.assertIn(resp_b_attempt.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_historical_results_preserved_after_course_expiry(self):
        """
        When student's course enrollment expires, their historical submitted results
        must remain accessible, while any in-progress attempts are blocked.
        """
        # Create historical completed attempt
        past_attempt = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=self.examination,
            status="submitted",
            score=16.0,
            percentage=80.0,
            submitted_at=timezone.now() - timedelta(days=5),
        )

        # Expire student's course enrollment
        self.enrollment_a.status = "expired"
        self.enrollment_a.save()

        # Listing attempts: historical attempt must still appear
        resp_list = self.client_a.get("/api/student/exam-attempts/?status=results")
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        results = resp_list.json().get("results", [])
        attempt_ids = [r["id"] for r in results]
        self.assertIn(past_attempt.id, attempt_ids)

        # Detail result: historical result remains accessible
        resp_result = self.client_a.get(f"/api/student/exam-attempts/{past_attempt.id}/result/")
        self.assertEqual(resp_result.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_result.json()["score"], 16.0)

    def test_subjective_unpublished_result_hidden_and_published_visible(self):
        """
        Subjective exams must not expose draft/unpublished evaluations to students.
        Once published, the student can see their obtained marks and feedback.

        Architecture: SubjectiveSubmission stores upload status and evaluator feedback.
                      SubjectiveQuestionScore stores per-question marks.
                      attempt.score stores total marks (set by admin on evaluation).
        """
        subj_exam = Examination.objects.create(
            title="Subjective Governance Exam",
            category=self.category,
            exam=self.academic_exam,
            course=self.course,
            exam_type="subjective",
            total_marks=50.0,
            status="published",
            result_visibility="manual",  # Admin must publish
        )

        attempt = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=subj_exam,
            status="submitted",
            submitted_at=timezone.now(),
        )
        # SubjectiveSubmission has no marks_obtained field; marks live on SubjectiveQuestionScore
        submission = SubjectiveSubmission.objects.create(
            attempt=attempt,
            status="submitted",
            is_published=False,
            evaluator_feedback="Good analytical structure.",
        )

        # Student attempts to view unpublished result:
        # result_visibility='manual' + status='submitted' => 403 with detail message
        resp_unpub = self.client_a.get(f"/api/student/exam-attempts/{attempt.id}/result/")
        self.assertEqual(resp_unpub.status_code, status.HTTP_403_FORBIDDEN)
        body_unpub = resp_unpub.json()
        self.assertIn("detail", body_unpub)
        # Score must not be exposed before publishing
        self.assertNotIn("score", body_unpub)

        # Admin evaluates: publishes result and sets score on the attempt
        submission.is_published = True
        submission.status = "evaluated"
        submission.evaluator_feedback = "Good analytical structure."
        submission.save()
        attempt.status = "evaluated"
        attempt.score = 38.0
        attempt.percentage = 76.0
        attempt.passed = True
        attempt.save()

        # Create per-question score (the real marks store)
        SubjectiveQuestionScore.objects.create(
            submission=submission,
            question_number=1,
            marks_obtained=38.0,
            max_marks=50.0,
            feedback="Good analytical structure.",
        )

        # Student views published result => 200 OK
        resp_pub = self.client_a.get(f"/api/student/exam-attempts/{attempt.id}/result/")
        self.assertEqual(resp_pub.status_code, status.HTTP_200_OK)
        pub_data = resp_pub.json()
        self.assertEqual(pub_data["score"], 38.0)
        self.assertEqual(pub_data["percentage"], 76.0)
        self.assertEqual(pub_data["evaluator_feedback"], "Good analytical structure.")

    def test_analytics_service_aggregation_and_topic_performance(self):
        """
        Verifies that AnalyticsService accurately aggregates:
        - overview metrics (questions solved, accuracy, streak)
        - subject performance across exams and practice
        - topic performance with accuracy and performance badges ('Strong' / 'Average' / 'Needs Improvement')
        """
        attempt = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=self.examination,
            status="submitted",
            score=12.0,
            percentage=60.0,
            started_at=timezone.now() - timedelta(days=1),
            submitted_at=timezone.now() - timedelta(days=1),
        )

        # 6 questions: 4 correct, 2 wrong
        for idx, q in enumerate(self.questions[:6]):
            is_c = (idx < 4)
            StudentAnswer.objects.create(
                attempt=attempt,
                question=q,
                selected_option="A" if is_c else "B",
                is_correct=is_c,
                marks_awarded=2.0 if is_c else 0.0,
            )

        # Overview
        overview = AnalyticsService.get_overview(self.student_a)
        self.assertEqual(overview["questions_solved"], 6)
        self.assertEqual(overview["overall_accuracy"], 66.7)
        self.assertEqual(overview["model_exams_taken"], 1)

        # Subject Performance
        subject_perf = AnalyticsService.get_subject_performance(self.student_a)
        self.assertTrue(len(subject_perf) >= 1)
        sub = next((s for s in subject_perf if "Governance" in s["subject"]), None)
        self.assertIsNotNone(sub, "Expected 'Governance & Management' in subject performance")
        self.assertEqual(sub["correct"], 4)
        self.assertEqual(sub["questions"], 6)
        self.assertEqual(sub["accuracy"], 66.7)
        # 66.7% falls in the 60-80% band => 'Good'
        self.assertEqual(sub["status"], "Good")

        # Topic Performance
        topic_perf = AnalyticsService.get_topic_performance(self.student_a)
        self.assertTrue(len(topic_perf) >= 1)
        top = next((t for t in topic_perf if t["topic"] == "Bureaucracy"), None)
        self.assertIsNotNone(top, "Expected topic 'Bureaucracy' in topic performance")
        self.assertEqual(top["correct"], 4)
        self.assertEqual(top["questions"], 6)
        self.assertEqual(top["accuracy"], 66.7)
        # 66.7% => 'Good' for both status and performance fields
        self.assertEqual(top["status"], "Good")
        self.assertEqual(top["performance"], "Good")

        # Trend (last 14 days)
        trend = AnalyticsService.get_performance_trend(self.student_a, days=14)
        self.assertTrue(len(trend) >= 1)

    def test_xp_awarded_once_on_finalize(self):
        """
        Verifies XP is awarded only once upon attempt completion and not duplicated
        on refresh, reload, or duplicate finalize.
        """
        GamificationProfile.objects.create(user=self.student_a, xp=100)

        attempt = ExaminationAttempt.objects.create(
            student=self.student_a,
            examination=self.examination,
            status="in-progress",
            started_at=timezone.now() - timedelta(minutes=10),
        )

        for q in self.questions[:5]:
            StudentAnswer.objects.create(
                attempt=attempt,
                question=q,
                selected_option="A",
                is_correct=True,
                marks_awarded=2.0,
            )

        # First finalize
        finalize_attempt(attempt)
        profile_after_first = GamificationProfile.objects.get(user=self.student_a)
        xp_first = profile_after_first.xp
        # Base 10 + 10 * 50% / 10 = 15 XP
        self.assertGreater(xp_first, 100)

        # Second finalize attempt (e.g. page reload or duplicate submit)
        finalize_attempt(attempt)
        profile_after_second = GamificationProfile.objects.get(user=self.student_a)
        self.assertEqual(profile_after_second.xp, xp_first)
