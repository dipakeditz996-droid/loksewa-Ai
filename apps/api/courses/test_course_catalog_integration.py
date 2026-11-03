from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from datetime import timedelta

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject
from courses.models import Course, Enrollment
from subscriptions.models import SubscriptionPlan, Subscription, SubscriptionCourseSelection
from notes.models import StudyMaterial, MaterialCategory
from courses.services.course_sync_service import sync_course_for_exam, is_preparation_exam


class CentralCourseCatalogIntegrationTests(APITestCase):
    def setUp(self):
        # Create Admin User
        self.admin = User.objects.create_superuser(
            username='admin_test', email='admin@test.com', password='adminpassword123'
        )
        # Create Student User
        self.student = User.objects.create_user(
            username='student_test', email='student@test.com', password='studentpassword123', role='student'
        )

        # Build Academic Hierarchy:
        # Category: License Exams
        self.category = ExamCategory.objects.create(name='License Exams', order=1, is_active=True)
        # Level: Diploma License (parent=None)
        self.level = Exam.objects.create(
            name='Diploma License', category=self.category, parent=None, is_active=True, order=1
        )
        # Preparation: Civil Sub Engineering License (parent=Diploma License)
        self.prep_civil = Exam.objects.create(
            name='Civil Sub Engineering License', category=self.category, parent=self.level, is_active=True, order=1
        )
        # Preparation: Amin/Surveyor License (parent=Diploma License)
        self.prep_amin = Exam.objects.create(
            name='Amin/Surveyor License', category=self.category, parent=self.level, is_active=True, order=2
        )

    def test_01_creating_exam_makes_canonical_course_available(self):
        """1. Creating an exam preparation makes canonical course available in catalog & package creation."""
        # Preparation exams must be recognized
        self.assertTrue(is_preparation_exam(self.prep_civil))
        self.assertTrue(is_preparation_exam(self.prep_amin))

        # Sync course for exam
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        self.assertIsNotNone(course)
        self.assertEqual(course.exam, self.prep_civil)
        self.assertEqual(course.title, 'Civil Sub Engineering License')

        # Check public course list API
        response = self.client.get('/api/courses/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        course_ids = [c['id'] for c in response.data]
        self.assertIn(course.id, course_ids)

    def test_02_selecting_course_saves_correct_canonical_course_id(self):
        """2. Selecting a course saves the correct canonical course ID in SubscriptionPlan."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        self.client.force_authenticate(user=self.admin)

        payload = {
            "name": "Civil Sub Engineering Premium Pack",
            "slug": "civil-sub-eng-pack",
            "description": "Comprehensive preparation package",
            "price": "1500.00",
            "duration": 60,
            "duration_unit": "DAYS",
            "package_type": "SINGLE",
            "course": course.id,
            "eligible_courses": [course.id],
            "status": "ACTIVE",
            "is_published": True,
        }

        response = self.client.post('/api/subscriptions/plans/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_plan_id = response.data['id']

        plan = SubscriptionPlan.objects.get(id=created_plan_id)
        self.assertEqual(plan.course_id, course.id)
        self.assertEqual(list(plan.eligible_courses.values_list('id', flat=True)), [course.id])

    def test_03_editing_package_restores_selected_courses(self):
        """3. Editing a package restores its selected courses and canonical IDs."""
        course_civil = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        course_amin = sync_course_for_exam(self.prep_amin, create_if_missing=True)

        plan = SubscriptionPlan.objects.create(
            name="Engineering Multi Bundle",
            slug="eng-multi-bundle",
            price="2500.00",
            duration=90,
            duration_unit="DAYS",
            package_type="MULTI",
            allowed_preparation_count=2,
            status="ACTIVE",
        )
        plan.eligible_courses.set([course_civil, course_amin])

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/subscriptions/plans/{plan.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data['eligible_courses']), {course_civil.id, course_amin.id})
        details_ids = {d['id'] for d in response.data['eligible_courses_details']}
        self.assertEqual(details_ids, {course_civil.id, course_amin.id})

    def test_04_course_filtering_by_category_and_level_works(self):
        """4. Course filtering by category and level works via PublicCourseListView."""
        course_civil = sync_course_for_exam(self.prep_civil, create_if_missing=True)

        # Another category and course
        cat_tech = ExamCategory.objects.create(name='Technical Services', order=2, is_active=True)
        level_tech = Exam.objects.create(name='Level 5 Tech', category=cat_tech, parent=None, is_active=True)
        prep_tech = Exam.objects.create(name='IT Officer', category=cat_tech, parent=level_tech, is_active=True)
        course_tech = sync_course_for_exam(prep_tech, create_if_missing=True)

        # Filter by category License Exams
        res_cat = self.client.get(f'/api/courses/public/?category_id={self.category.id}')
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        res_cat_ids = [c['id'] for c in res_cat.data]
        self.assertIn(course_civil.id, res_cat_ids)
        self.assertNotIn(course_tech.id, res_cat_ids)

        # Filter by level Diploma License
        res_lvl = self.client.get(f'/api/courses/public/?level_id={self.level.id}')
        self.assertEqual(res_lvl.status_code, status.HTTP_200_OK)
        res_lvl_ids = [c['id'] for c in res_lvl.data]
        self.assertIn(course_civil.id, res_lvl_ids)
        self.assertNotIn(course_tech.id, res_lvl_ids)

    def test_05_inactive_courses_cannot_be_newly_purchased(self):
        """5. Inactive/draft courses are not returned for new student purchase."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        course.status = 'draft'
        course.save()

        # Available plans for that inactive course shouldn't be accessible by student
        plan = SubscriptionPlan.objects.create(
            name="Civil Pack",
            price="1000.00",
            package_type="SINGLE",
            course=course,
            status="ACTIVE",
            is_published=True,
        )

        self.client.force_authenticate(user=self.student)
        # Course public catalog excludes drafts
        res_courses = self.client.get('/api/courses/public/')
        self.assertNotIn(course.id, [c['id'] for c in res_courses.data])

    def test_06_existing_subscriptions_remain_valid(self):
        """6. Existing subscriptions remain valid and preserve access."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        plan = SubscriptionPlan.objects.create(
            name="Civil Standard Pack",
            price="1000.00",
            package_type="SINGLE",
            course=course,
            duration=30,
            duration_unit="DAYS",
            status="ACTIVE",
        )

        sub = Subscription.objects.create(
            student=self.student,
            plan=plan,
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=30),
            status="ACTIVE",
        )
        selection = SubscriptionCourseSelection.objects.create(
            subscription=sub,
            course=course,
        )

        self.assertTrue(sub.is_active)
        self.assertEqual(sub.plan.course_id, course.id)
        self.assertEqual(selection.course_id, course.id)
        self.assertEqual(sub.plan_id, plan.id)

    def test_07_existing_packages_retain_their_course_relationships(self):
        """7. Existing packages retain their foreign key and M2M course relationships."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        plan = SubscriptionPlan.objects.create(
            name="Legacy Active Package",
            price="1200.00",
            package_type="SINGLE",
            course=course,
            status="ACTIVE",
        )
        plan.eligible_courses.add(course)

        refetched = SubscriptionPlan.objects.get(id=plan.id)
        self.assertEqual(refetched.course_id, course.id)
        self.assertEqual(list(refetched.eligible_courses.all()), [course])

    def test_08_student_buy_another_course_flow_filters_packages(self):
        """8. Student Buy Another Course flow filters packages for selected course/exam."""
        course_civil = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        course_amin = sync_course_for_exam(self.prep_amin, create_if_missing=True)

        plan_civil = SubscriptionPlan.objects.create(
            name="Civil Special Plan",
            price="1000.00",
            package_type="SINGLE",
            course=course_civil,
            status="ACTIVE",
            is_published=True,
        )
        plan_amin = SubscriptionPlan.objects.create(
            name="Amin Special Plan",
            price="1200.00",
            package_type="SINGLE",
            course=course_amin,
            status="ACTIVE",
            is_published=True,
        )
        plan_all_access = SubscriptionPlan.objects.create(
            name="Universal All Access",
            price="5000.00",
            package_type="ALL_ACCESS",
            status="ACTIVE",
            is_published=True,
        )

        self.client.force_authenticate(user=self.student)
        # Query available plans for prep_civil by exam_id
        res_exam = self.client.get(f'/api/subscriptions/plans/available/?exam_id={self.prep_civil.id}')
        self.assertEqual(res_exam.status_code, status.HTTP_200_OK)
        returned_plan_ids = [p['id'] for p in res_exam.data['plans']]

        self.assertIn(plan_civil.id, returned_plan_ids)
        self.assertIn(plan_all_access.id, returned_plan_ids)
        self.assertNotIn(plan_amin.id, returned_plan_ids)

        # Query by course_id
        res_course = self.client.get(f'/api/subscriptions/plans/available/?course_id={course_civil.id}')
        self.assertEqual(res_course.status_code, status.HTTP_200_OK)
        course_plan_ids = [p['id'] for p in res_course.data['plans']]
        self.assertIn(plan_civil.id, course_plan_ids)
        self.assertIn(plan_all_access.id, course_plan_ids)
        self.assertNotIn(plan_amin.id, course_plan_ids)

    def test_09_renaming_course_updates_displayed_name_everywhere(self):
        """9. Renaming a course updates its displayed name everywhere via canonical record."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        plan = SubscriptionPlan.objects.create(
            name="Civil Pack",
            price="1000.00",
            package_type="SINGLE",
            course=course,
            status="ACTIVE",
        )

        # Rename exam preparation
        self.prep_civil.name = "Civil Sub Engineering License (Updated 2026)"
        self.prep_civil.save()
        sync_course_for_exam(self.prep_civil)

        course.refresh_from_db()
        self.assertEqual(course.title, "Civil Sub Engineering License (Updated 2026)")

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/subscriptions/plans/{plan.id}/')
        self.assertEqual(res.data['course_details']['title'], "Civil Sub Engineering License (Updated 2026)")

    def test_10_existing_notes_and_exam_relationships_remain_intact(self):
        """10. Existing notes and academic hierarchy relationships remain intact."""
        course = sync_course_for_exam(self.prep_civil, create_if_missing=True)
        paper = Paper.objects.create(exam=self.prep_civil, name="Technical Paper")
        subject = Subject.objects.create(paper=paper, name="Surveying & Leveling")
        cat = MaterialCategory.objects.create(name="Handwritten Notes", slug="handwritten-notes")

        note = StudyMaterial.objects.create(
            title="Surveying Comprehensive Notes",
            category=cat,
            course=course,
            subject=subject,
            exam=self.prep_civil,
            status='published',
        )

        self.assertEqual(note.course_id, course.id)
        self.assertEqual(note.exam_id, self.prep_civil.id)
        self.assertEqual(note.subject_id, subject.id)
        self.assertEqual(note.category_id, cat.id)
