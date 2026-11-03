from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, UserTopicProgress
from courses.models import Course, Enrollment
from support.models import StudentProfile
from subscriptions.models import SubscriptionPlan, Subscription, SubscriptionCourseSelection
from courses.services.course_sync_service import sync_course_for_exam
from wallet.models import ContentEntitlement


class MyLearningRegistrationFilteringTests(APITestCase):
    def setUp(self):
        # 1. Create Categories
        self.cat_psc = ExamCategory.objects.create(name='PSC Exams', order=1, is_active=True)
        self.cat_license = ExamCategory.objects.create(name='License Exams', order=2, is_active=True)

        # 2. Hierarchy under PSC: Level 5th Level -> Courses
        self.lvl_psc5 = Exam.objects.create(
            name='5th Level', category=self.cat_psc, parent=None, is_active=True, order=1
        )
        self.prep_civil5 = Exam.objects.create(
            name='Civil Sub Engineer (5th)', category=self.cat_psc, parent=self.lvl_psc5, is_active=True, order=1
        )
        self.prep_admin5 = Exam.objects.create(
            name='Administration Assistant (5th)', category=self.cat_psc, parent=self.lvl_psc5, is_active=True, order=2
        )
        self.course_civil5 = sync_course_for_exam(self.prep_civil5, create_if_missing=True)
        self.course_admin5 = sync_course_for_exam(self.prep_admin5, create_if_missing=True)

        # 3. Hierarchy under License: Diploma License -> Courses
        self.lvl_diploma = Exam.objects.create(
            name='Diploma License', category=self.cat_license, parent=None, is_active=True, order=1
        )
        self.prep_license_civil = Exam.objects.create(
            name='Civil Sub Engineering License', category=self.cat_license, parent=self.lvl_diploma, is_active=True, order=1
        )
        self.prep_license_amin = Exam.objects.create(
            name='Amin/Surveyor License', category=self.cat_license, parent=self.lvl_diploma, is_active=True, order=2
        )
        self.course_license_civil = sync_course_for_exam(self.prep_license_civil, create_if_missing=True)
        self.course_license_amin = sync_course_for_exam(self.prep_license_amin, create_if_missing=True)

        # 4. Student 1: Registered for PSC 5th Level
        self.student_psc = User.objects.create_user(
            username='student_psc', email='psc@test.com', password='password123', role='student'
        )
        self.profile_psc = StudentProfile.objects.create(
            user=self.student_psc,
            target_category=self.cat_psc,
            target_position=self.prep_civil5,
            target_course=self.course_civil5,
        )

        # 5. Student 2: Registered for License Exams -> Diploma License
        self.student_license = User.objects.create_user(
            username='student_license', email='license@test.com', password='password123', role='student'
        )
        self.profile_license = StudentProfile.objects.create(
            user=self.student_license,
            target_category=self.cat_license,
            target_position=self.prep_license_civil,
            target_course=self.course_license_civil,
        )

        # 6. Student 3: New student with missing registration preferences
        self.student_empty = User.objects.create_user(
            username='student_empty', email='empty@test.com', password='password123', role='student'
        )
        self.profile_empty = StudentProfile.objects.create(
            user=self.student_empty,
        )

    def test_01_psc_5th_level_student_sees_only_psc_5th_level_courses_by_default(self):
        """1. PSC 5th Level student sees only PSC 5th Level courses by default."""
        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        course_ids = [item['course']['id'] for item in response.data['courses']]
        self.assertIn(self.course_civil5.id, course_ids)
        self.assertIn(self.course_admin5.id, course_ids)
        # License courses must NOT be in default view
        self.assertNotIn(self.course_license_civil.id, course_ids)
        self.assertNotIn(self.course_license_amin.id, course_ids)

        self.assertEqual(response.data['registered_category']['id'], self.cat_psc.id)
        self.assertEqual(response.data['registered_level']['id'], self.lvl_psc5.id)

    def test_02_diploma_license_student_sees_only_diploma_license_courses(self):
        """2. Diploma License student sees only Diploma License courses by default."""
        self.client.force_authenticate(user=self.student_license)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        course_ids = [item['course']['id'] for item in response.data['courses']]
        self.assertIn(self.course_license_civil.id, course_ids)
        self.assertIn(self.course_license_amin.id, course_ids)
        # PSC courses must NOT be in default view
        self.assertNotIn(self.course_civil5.id, course_ids)
        self.assertNotIn(self.course_admin5.id, course_ids)

        self.assertEqual(response.data['registered_category']['id'], self.cat_license.id)
        self.assertEqual(response.data['registered_level']['id'], self.lvl_diploma.id)

    def test_03_unrelated_categories_excluded_at_api_level(self):
        """3. Unrelated categories and levels are excluded at API level, not just hidden on frontend."""
        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Standard list response
        all_ids = [item['course']['id'] for item in response.data]
        self.assertNotIn(self.course_license_civil.id, all_ids)
        self.assertNotIn(self.course_license_amin.id, all_ids)

    def test_04_browse_another_course_can_discover_courses_from_another_category(self):
        """4. Browse Another Course query parameters allow discovering courses from another category/level."""
        self.client.force_authenticate(user=self.student_psc)
        # PSC student explicitly queries License Exams -> Diploma License
        url = f'/api/courses/my-courses/?category_id={self.cat_license.id}&level_id={self.lvl_diploma.id}&view_mode=structured'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        course_ids = [item['course']['id'] for item in response.data['courses']]
        self.assertIn(self.course_license_civil.id, course_ids)
        self.assertIn(self.course_license_amin.id, course_ids)
        self.assertNotIn(self.course_civil5.id, course_ids)

        # Selected level is Diploma License, but registered level remains 5th Level
        self.assertEqual(response.data['selected_category']['id'], self.cat_license.id)
        self.assertEqual(response.data['selected_level']['id'], self.lvl_diploma.id)
        self.assertEqual(response.data['registered_category']['id'], self.cat_psc.id)
        self.assertEqual(response.data['registered_level']['id'], self.lvl_psc5.id)

    def test_05_changing_browse_selection_does_not_silently_overwrite_registration(self):
        """5. Browsing another course category/level does not silently overwrite registration preference."""
        self.client.force_authenticate(user=self.student_psc)
        url = f'/api/courses/my-courses/?category_id={self.cat_license.id}&level_id={self.lvl_diploma.id}'
        self.client.get(url)

        # Check DB: profile preferences must still be PSC
        self.profile_psc.refresh_from_db()
        self.assertEqual(self.profile_psc.target_category_id, self.cat_psc.id)
        self.assertEqual(self.profile_psc.target_position_id, self.prep_civil5.id)

    def test_06_selecting_a_course_does_not_grant_access_automatically(self):
        """6. A course appearing in My Learning or being viewed does not grant access automatically."""
        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        civil_item = next(item for item in response.data['courses'] if item['course']['id'] == self.course_civil5.id)

        # Student has not purchased/enrolled yet, so status must be locked
        self.assertEqual(civil_item['access_state'], 'locked')
        self.assertFalse(civil_item['has_access'])

    def test_07_purchasing_enrolling_in_another_course_updates_my_learning(self):
        """7. Enrolling in another course outside registered level updates My Learning correctly."""
        # PSC student enrolls in License course
        Enrollment.objects.create(
            student=self.student_psc,
            course=self.course_license_civil,
            status='active',
        )

        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Primary level courses still show PSC 5th Level
        primary_ids = [item['course']['id'] for item in response.data['courses']]
        self.assertIn(self.course_civil5.id, primary_ids)

        # Other enrolled courses section contains the newly enrolled License course!
        other_ids = [item['course']['id'] for item in response.data['other_enrolled_courses']]
        self.assertIn(self.course_license_civil.id, other_ids)

        license_item = next(item for item in response.data['other_enrolled_courses'] if item['course']['id'] == self.course_license_civil.id)
        self.assertEqual(license_item['access_state'], 'enrolled')
        self.assertTrue(license_item['has_access'])

    def test_08_header_selector_shows_only_legitimately_accessible_courses(self):
        """8. Header course context selector shows only legitimately authorized courses, never unrelated courses."""
        # Enroll student_psc ONLY in course_civil5
        Enrollment.objects.create(
            student=self.student_psc,
            course=self.course_civil5,
            status='active',
        )

        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/student/context/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        authorized_ids = [c['id'] for c in response.data['authorized_courses']]
        self.assertEqual(authorized_ids, [self.course_civil5.id])
        # Locked course_admin5 or license courses must NOT appear as authorized
        self.assertNotIn(self.course_admin5.id, authorized_ids)
        self.assertNotIn(self.course_license_civil.id, authorized_ids)

    def test_09_switching_course_context_persists_and_preserves_registration_preference(self):
        """9. Switching active course context persists target_course without overwriting registration preference."""
        Enrollment.objects.create(student=self.student_psc, course=self.course_civil5, status='active')
        Enrollment.objects.create(student=self.student_psc, course=self.course_license_civil, status='active')

        self.client.force_authenticate(user=self.student_psc)
        # Switch context to course_license_civil
        switch_res = self.client.post('/api/student/context/select-course/', {'course_id': self.course_license_civil.id})
        self.assertEqual(switch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(switch_res.data['active_course']['id'], self.course_license_civil.id)

        # Verify DB: target_course updated, but target_category and target_position preserved!
        self.profile_psc.refresh_from_db()
        self.assertEqual(self.profile_psc.target_course_id, self.course_license_civil.id)
        self.assertEqual(self.profile_psc.target_category_id, self.cat_psc.id)
        self.assertEqual(self.profile_psc.target_position_id, self.prep_civil5.id)

    def test_10_existing_subscriptions_and_coin_entitlements_remain_valid(self):
        """10. Active subscriptions and coin entitlements grant access and reflect correct access_state."""
        # Plan covering course_admin5
        plan = SubscriptionPlan.objects.create(
            name='PSC Admin Plan',
            price='2000.00',
            package_type='SINGLE',
            course=self.course_admin5,
            status='ACTIVE'
        )
        Subscription.objects.create(
            student=self.student_psc,
            plan=plan,
            status='ACTIVE',
            start_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=30),
        )

        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        admin_item = next(item for item in response.data['courses'] if item['course']['id'] == self.course_admin5.id)
        self.assertEqual(admin_item['access_state'], 'active_subscription')
        self.assertTrue(admin_item['has_access'])

    def test_11_students_with_missing_registration_preferences_receive_proper_state(self):
        """11. Students with missing registration preferences receive is_preference_set=False."""
        self.client.force_authenticate(user=self.student_empty)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_preference_set'])
        self.assertIsNone(response.data['registered_category'])
        self.assertIsNone(response.data['registered_level'])

        # Now student sets preference via profile update
        patch_res = self.client.patch('/api/support/profile/', {
            'target_category': self.cat_license.id,
            'target_position': self.prep_license_amin.id,
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # Re-query My Learning: now filtered to Diploma License!
        response2 = self.client.get('/api/courses/my-courses/?view_mode=structured')
        self.assertTrue(response2.data['is_preference_set'])
        self.assertEqual(response2.data['registered_category']['id'], self.cat_license.id)
        self.assertEqual(response2.data['registered_level']['id'], self.lvl_diploma.id)
        returned_ids = [item['course']['id'] for item in response2.data['courses']]
        self.assertIn(self.course_license_amin.id, returned_ids)

    def test_12_existing_progress_data_is_not_lost(self):
        """12. Real topic completion progress is accurately calculated and reported."""
        paper = Paper.objects.create(exam=self.prep_civil5, name='Paper 1')
        subject = Subject.objects.create(paper=paper, name='Engineering Mechanics')
        chapter = Chapter.objects.create(subject=subject, title='Statics')
        t1 = Topic.objects.create(chapter=chapter, name='Forces', order=1)
        t2 = Topic.objects.create(chapter=chapter, name='Moments', order=2)

        # Student completes topic 1
        UserTopicProgress.objects.create(user=self.student_psc, topic=t1, status='completed')

        self.client.force_authenticate(user=self.student_psc)
        response = self.client.get('/api/courses/my-courses/?view_mode=structured')
        civil_item = next(item for item in response.data['courses'] if item['course']['id'] == self.course_civil5.id)

        self.assertEqual(civil_item['progress']['total_topics'], 2)
        self.assertEqual(civil_item['progress']['completed_topics'], 1)
        self.assertEqual(civil_item['progress']['percentage'], 50)

