from io import StringIO
from django.core.management import call_command
from django.test import TestCase
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, ExaminationAttempt, Examination
from courses.models import Course, Enrollment
from marketplace.models import Product, Purchase, PaymentSubmission, PaymentMethod
from subscriptions.models import SubscriptionPlan
from core.models import User
from decimal import Decimal
from django.utils import timezone

class CleanupDevDataTest(TestCase):
    
    def setUp(self):
        # Create DEV data
        self.dev_category = ExamCategory.objects.create(name="[DEV] Kharidar Preparation")
        self.dev_exam = Exam.objects.create(category=self.dev_category, name="[DEV] Kharidar First Paper")
        self.dev_paper = Paper.objects.create(exam=self.dev_exam, name="[DEV] General Knowledge and Basic Office Skills Test")
        self.dev_subject = Subject.objects.create(paper=self.dev_paper, name="[DEV] General Knowledge")
        self.dev_chapter = Chapter.objects.create(subject=self.dev_subject, title="[DEV] Geography of Nepal")
        self.dev_topic1 = Topic.objects.create(chapter=self.dev_chapter, name="[DEV] Rivers and Lakes")
        self.dev_topic2 = Topic.objects.create(chapter=self.dev_chapter, name="[DEV] Mountains")
        
        self.dev_course = Course.objects.create(title="[DEV] Kharidar Complete Course", slug="dev-kharidar-complete-course", is_open_for_enrollment=True)
        self.dev_product = Product.objects.create(title="[DEV] Kharidar Complete Course", category="COURSE", price=2000.00, course=self.dev_course)
        self.dev_sub_plan = SubscriptionPlan.objects.create(name="[DEV] Basic Monthly Plan", price=500.00, duration=1)
        
        # Create Real data (not DEV)
        self.real_course = Course.objects.create(title="Real Course", slug="real-course", is_open_for_enrollment=True)
        self.real_product = Product.objects.create(title="Real Course Product", category="COURSE", price=100.00, course=self.real_course)
        
        # Create user for relations
        self.student = User.objects.create_user(username="teststudent", email="teststudent@example.com", password="password", role="student", first_name="Test", last_name="Student")
        self.payment_method = PaymentMethod.objects.create(method_type="esewa", display_name="eSewa", is_active=True)

    def run_command(self):
        out = StringIO()
        call_command('cleanup_dev_data', dry_run=True, stdout=out)
        return out.getvalue()

    def test_1_development_candidate_detected(self):
        output = self.run_command()
        self.assertIn("[DEV] Kharidar Preparation", output)
        self.assertIn("SAFE: 2", output) # Topic has 2 safe
        self.assertIn("SAFE: 1", output) # Product and SubPlan are safe initially

    def test_2_real_record_not_classified_as_safe(self):
        output = self.run_command()
        self.assertNotIn("Real Course Product", output)
        self.assertNotIn("Real Course", output)

    def test_3_candidate_with_enrollment_is_unsafe(self):
        # Create an enrollment for dev_course
        Enrollment.objects.create(student=self.student, course=self.dev_course, status="active", expires_at=timezone.now())
        
        output = self.run_command()
        self.assertIn("Course | ID: %s | Title: [DEV] Kharidar Complete Course | Status: UNSAFE | Reason: marketplace_products (1), enrollments (1)" % self.dev_course.id, output)

    def test_4_candidate_with_purchase_is_unsafe(self):
        # Create purchase for dev_product
        submission = PaymentSubmission.objects.create(
            student=self.student, 
            product=self.dev_product,
            payment_method=self.payment_method, 
            expected_amount=Decimal("2000.00"), 
            submitted_amount=Decimal("2000.00"), 
            status="approved"
        )
        Purchase.objects.create(
            student=self.student,
            product=self.dev_product,
            payment_submission=submission,
            amount_paid=Decimal("2000.00"),
            status="completed"
        )
        output = self.run_command()
        self.assertIn("Product | ID: %s | Title: [DEV] Kharidar Complete Course | Status: UNSAFE | Reason: payment_submissions (1), purchases (1)" % self.dev_product.id, output)

    def test_5_candidate_with_dependent_attempt_is_unsafe(self):
        # Create attempt depending on Exam
        exam = Examination.objects.create(title="Test Exam", category=self.dev_category, exam=self.dev_exam)
        ExaminationAttempt.objects.create(student=self.student, examination=exam, status="submitted")
        
        output = self.run_command()
        # Dev category should have examinationeligibility_set and targeted_students but in this case examinations(1) will make it unsafe
        self.assertIn("ExamCategory | ID: %s | Name: [DEV] Kharidar Preparation | Status: UNSAFE | Reason: exams (1), examinations (1)" % self.dev_category.id, output)

    def test_6_dry_run_performs_no_deletion(self):
        count_before = Topic.objects.count()
        self.run_command()
        count_after = Topic.objects.count()
        self.assertEqual(count_before, count_after)

    def test_7_dry_run_is_repeatable(self):
        out1 = self.run_command()
        out2 = self.run_command()
        self.assertEqual(out1, out2)

