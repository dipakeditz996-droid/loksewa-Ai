"""
Tests for Admin Add Student: Package Assignment + Admin-Granted Access
(Admin -> User Management -> Add User -> Role = Student + Package Assignment).

Covers:
- SINGLE, MULTI, BUNDLE, and ALL_ACCESS package assignment
- Admin-granted access: canonical Subscription with source='ADMIN_GRANT'
- Enrollment generation with correct expiry
- SubscriptionCourseSelection records
- StudentProfile active course context (target_course)
- AuditLog recording without sensitive data
- Preserved free/basic student creation when no package is selected
- Security & Permission checks (Teacher, Student, Anonymous cannot grant)
- Negative validation tests (ineligible courses, count overflow, invalid packages, duplicate email)
- Student login & course context verification after admin grant
"""
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from support.models import StudentProfile
from exams.models import ExamCategory, Exam
from courses.models import Course, Enrollment, CourseApplication
from subscriptions.models import SubscriptionPlan, Subscription, SubscriptionCourseSelection
from administration.models import AuditLog

CREATE_URL = '/api/admin/users/'


def _student_payload(**overrides):
    payload = {
        'username': 'adminstudent',
        'email': 'adminstudent@test.com',
        'password': 'StrongPassword123!',
        'role': 'student',
        'name': 'Rajesh Hamal',
        'mobile': '9841234567',
        'permanent_district': 'Kathmandu',
        'permanent_local_level': 'Kathmandu Metropolitan',
    }
    payload.update(overrides)
    return payload


class AdminGrantStudentPackageTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='superadmin', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(username='teacher1', password='pw', role='teacher')
        self.student = User.objects.create_user(username='existing_student', password='pw', role='student')

        # Academic hierarchy
        self.category = ExamCategory.objects.create(name='PSC Engineering', is_active=True)
        self.level5 = Exam.objects.create(category=self.category, name='5th Level', is_active=True)
        self.level7 = Exam.objects.create(category=self.category, name='7th Level', is_active=True)

        self.course_civil5 = Course.objects.create(
            title='PSC 5th Level Civil Engineering',
            slug='psc-5th-civil',
            status='published',
            exam=self.level5,
        )
        self.course_civil7 = Course.objects.create(
            title='PSC 7th Level Civil Engineer',
            slug='psc-7th-civil',
            status='published',
            exam=self.level7,
        )
        self.course_electrical = Course.objects.create(
            title='PSC 5th Level Electrical',
            slug='psc-5th-elec',
            status='published',
            exam=self.level5,
        )

        # 1. SINGLE Plan
        self.single_plan = SubscriptionPlan.objects.create(
            name='PSC 5th Level Civil Special',
            package_type='SINGLE',
            duration=30,
            duration_unit='DAYS',
            price=1500.00,
            status='ACTIVE',
            course=self.course_civil5,
        )

        # 2. MULTI Plan (pick up to 2)
        self.multi_plan = SubscriptionPlan.objects.create(
            name='PSC Engineering Multi Course',
            package_type='MULTI',
            duration=60,
            duration_unit='DAYS',
            price=3000.00,
            status='ACTIVE',
            allowed_preparation_count=2,
        )
        self.multi_plan.eligible_courses.add(self.course_civil5, self.course_civil7, self.course_electrical)

        # 3. BUNDLE Plan (all included)
        self.bundle_plan = SubscriptionPlan.objects.create(
            name='PSC Engineering Complete Bundle',
            package_type='BUNDLE',
            duration=1,
            duration_unit='YEAR',
            price=6000.00,
            status='ACTIVE',
        )
        self.bundle_plan.eligible_courses.add(self.course_civil5, self.course_civil7)

        # 4. ALL_ACCESS Plan
        self.all_access_plan = SubscriptionPlan.objects.create(
            name='Loksewa All Access Pass',
            package_type='ALL_ACCESS',
            duration=6,
            duration_unit='MONTHS',
            price=10000.00,
            status='ACTIVE',
        )

    # ---- 1. Single Package Grant --------------------------------------------

    def test_admin_grant_single_package_success(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.single_plan.id,
            grant_reason='Full scholarship awarded by Admin',
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data['packageGranted'])
        self.assertEqual(response.data['packageName'], self.single_plan.name)

        user = User.objects.get(username='adminstudent')
        self.assertEqual(user.role, 'student')

        # Check StudentProfile
        profile = StudentProfile.objects.get(user=user)
        self.assertEqual(profile.access_origin, 'ADMIN_GRANTED')
        self.assertEqual(profile.admin_granted_by, self.admin)
        self.assertEqual(profile.admin_access_note, 'Full scholarship awarded by Admin')
        self.assertIsNotNone(profile.admin_access_expiry)
        # Course context is automatically set to the assigned course
        self.assertEqual(profile.target_course, self.course_civil5)

        # Check canonical Subscription record
        sub = Subscription.objects.get(student=user, plan=self.single_plan)
        self.assertEqual(sub.status, 'ACTIVE')
        self.assertEqual(sub.source, 'ADMIN_GRANT')
        self.assertEqual(sub.granted_by, self.admin)
        self.assertEqual(sub.admin_grant_reason, 'Full scholarship awarded by Admin')
        self.assertTrue(sub.is_active)
        expected_expiry = sub.start_date + timedelta(days=30)
        self.assertAlmostEqual(sub.expiry_date.timestamp(), expected_expiry.timestamp(), delta=10)

        # Check Course Selection & Enrollment
        selection = SubscriptionCourseSelection.objects.get(subscription=sub, course=self.course_civil5)
        self.assertIsNone(selection.payment)
        enrollment = Enrollment.objects.get(student=user, course=self.course_civil5)
        self.assertEqual(enrollment.status, 'active')

        # Check Audit Log
        log = AuditLog.objects.get(action='ADMIN_STUDENT_GRANTED_PACKAGE', entity_id=str(user.id))
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.details['package_name'], self.single_plan.name)
        self.assertEqual(log.details['grant_reason'], 'Full scholarship awarded by Admin')
        self.assertNotIn('password', log.details)

    # ---- 2. Multi Package Grant ---------------------------------------------

    def test_admin_grant_multi_package_success(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.multi_plan.id,
            course_ids=[self.course_civil5.id, self.course_civil7.id],
            grant_reason='Selected 2 engineering preparations',
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username='adminstudent')
        sub = Subscription.objects.get(student=user, plan=self.multi_plan)
        self.assertEqual(sub.source, 'ADMIN_GRANT')

        # Verify exactly 2 course selections and 2 enrollments
        selections = SubscriptionCourseSelection.objects.filter(subscription=sub)
        self.assertEqual(selections.count(), 2)
        enrolled_ids = set(Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True))
        self.assertEqual(enrolled_ids, {self.course_civil5.id, self.course_civil7.id})

    # ---- 3. Bundle Package Grant --------------------------------------------

    def test_admin_grant_bundle_package_success(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.bundle_plan.id,
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username='adminstudent')
        sub = Subscription.objects.get(student=user, plan=self.bundle_plan)
        self.assertEqual(sub.source, 'ADMIN_GRANT')

        enrolled_ids = set(Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True))
        self.assertEqual(enrolled_ids, {self.course_civil5.id, self.course_civil7.id})

    # ---- 4. All Access Package Grant ----------------------------------------

    def test_admin_grant_all_access_package_success(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.all_access_plan.id,
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username='adminstudent')
        sub = Subscription.objects.get(student=user, plan=self.all_access_plan)
        self.assertEqual(sub.source, 'ADMIN_GRANT')

        from courses.access import authorized_courses
        auth_courses = authorized_courses(user)
        self.assertEqual(auth_courses.count(), Course.objects.filter(status='published').count())

    # ---- 5. Preserved Free / Basic Student Creation -------------------------

    def test_admin_create_student_without_package_preserves_free_behavior(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            course_id=self.course_civil5.id,
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(response.data['packageGranted'])

        user = User.objects.get(username='adminstudent')
        self.assertFalse(Subscription.objects.filter(student=user).exists())
        self.assertFalse(Enrollment.objects.filter(student=user).exists())
        # Legacy CourseApplication created as pending
        self.assertTrue(CourseApplication.objects.filter(student=user, course=self.course_civil5, status='pending').exists())

    # ---- 6. User Detail Page Displays Admin Grant Access --------------------

    def test_admin_user_detail_displays_package_access_info(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.single_plan.id,
            grant_reason='Scholarship note',
        )
        create_res = self.client.post(CREATE_URL, payload, format='json')
        student_id = create_res.data['id']

        detail_res = self.client.get(f'/api/admin/users/{student_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        sub_data = detail_res.data['subscription']
        self.assertIsNotNone(sub_data)
        self.assertEqual(sub_data['planName'], self.single_plan.name)
        self.assertEqual(sub_data['source'], 'ADMIN_GRANT')
        self.assertEqual(sub_data['accessSource'], 'Admin Granted')
        self.assertEqual(sub_data['adminGrantReason'], 'Scholarship note')
        self.assertEqual(sub_data['grantedBy'], 'superadmin')

    # ---- 7. Negative Validation Tests ---------------------------------------

    def test_negative_inactive_package_rejected(self):
        self.single_plan.status = 'INACTIVE'
        self.single_plan.save()

        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.single_plan.id,
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not exist or is inactive', response.data['error'])

    def test_negative_multi_exceeds_allowed_count(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.multi_plan.id,
            course_ids=[self.course_civil5.id, self.course_civil7.id, self.course_electrical.id],
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('allows at most 2', response.data['error'])

    def test_negative_course_not_eligible_for_package(self):
        unrelated_course = Course.objects.create(title='Unrelated Course', slug='unrelated', status='published')

        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.multi_plan.id,
            course_ids=[unrelated_course.id],
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not eligible', response.data['error'])

    def test_negative_duplicate_email_rejected_with_exact_message(self):
        User.objects.create_user(username='someone', email='adminstudent@test.com', password='pw')
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id)
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'An account with this email already exists.')

    # ---- 8. Permission Tests ------------------------------------------------

    def test_teacher_cannot_grant_package(self):
        self.client.force_authenticate(user=self.teacher)
        payload = _student_payload(exam_category_id=self.category.id, package_id=self.single_plan.id)
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_grant_package(self):
        self.client.force_authenticate(user=self.student)
        payload = _student_payload(exam_category_id=self.category.id, package_id=self.single_plan.id)
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_grant_package(self):
        payload = _student_payload(exam_category_id=self.category.id, package_id=self.single_plan.id)
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # ---- 9. Student Login & Course Context Verification ----------------------

    def test_student_login_and_course_context_after_admin_grant(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            package_id=self.single_plan.id,
            grant_reason='Special Grant',
        )
        res = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Login as student
        self.client.force_authenticate(user=None)
        login_res = self.client.post('/api/token/', {
            'username': 'adminstudent',
            'password': 'StrongPassword123!',
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        # Verify package status in login payload
        package_status = login_res.data.get('package')
        self.assertIsNotNone(package_status)
        self.assertTrue(package_status['hasActivePackage'])
        self.assertTrue(package_status['isAdminGranted'])
        self.assertEqual(package_status['status'], 'ACTIVE')

        # Check student context endpoint (/api/student/context/)
        created_user = User.objects.get(username='adminstudent')
        self.client.force_authenticate(user=created_user)
        ctx_res = self.client.get('/api/student/context/')
        self.assertEqual(ctx_res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(ctx_res.data.get('active_course'))
        self.assertEqual(ctx_res.data['active_course']['id'], self.course_civil5.id)
        self.assertEqual(ctx_res.data['active_course']['title'], self.course_civil5.title)

    # ---- 10. Multi-Package Grant Tests --------------------------------------

    def test_admin_grant_multiple_packages_success(self):
        """Admin can assign 2 distinct packages in a single creation request."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='multipackage_student',
            email='multi.student@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [self.course_civil7.id, self.course_electrical.id],
                }
            ],
            grant_reason='Double sponsorship by Admin',
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data['packageGranted'])
        self.assertEqual(response.data['packagesCount'], 2)
        self.assertEqual(len(response.data['packagesGranted']), 2)

        user = User.objects.get(username='multipackage_student')
        self.assertEqual(user.subscriptions.count(), 2)

        subs = list(user.subscriptions.order_by('plan_id'))
        # Both subscriptions are active and admin granted
        for s in subs:
            self.assertEqual(s.status, 'ACTIVE')
            self.assertEqual(s.source, 'ADMIN_GRANT')
            self.assertEqual(s.granted_by, self.admin)
            self.assertEqual(s.admin_grant_reason, 'Double sponsorship by Admin')

        # Distinct enrollments created for all courses
        enrollment_courses = set(user.enrollments.values_list('course_id', flat=True))
        self.assertEqual(enrollment_courses, {self.course_civil5.id, self.course_civil7.id, self.course_electrical.id})

        # SubscriptionCourseSelection rows created for both subscriptions
        single_sub = user.subscriptions.get(plan=self.single_plan)
        self.assertEqual(list(single_sub.course_selections.values_list('course_id', flat=True)), [self.course_civil5.id])
        multi_sub = user.subscriptions.get(plan=self.multi_plan)
        self.assertEqual(
            set(multi_sub.course_selections.values_list('course_id', flat=True)),
            {self.course_civil7.id, self.course_electrical.id}
        )

    def test_admin_grant_three_packages_success(self):
        """Admin can assign 3 packages in a single creation request."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='three_pack_student',
            email='threepack@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [self.course_civil7.id, self.course_electrical.id],
                },
                {'package_id': self.bundle_plan.id},
            ],
            grant_reason='Triple package scholarship',
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['packagesCount'], 3)

        user = User.objects.get(username='three_pack_student')
        self.assertEqual(user.subscriptions.count(), 3)
        self.assertTrue(user.subscriptions.filter(plan=self.single_plan).exists())
        self.assertTrue(user.subscriptions.filter(plan=self.multi_plan).exists())
        self.assertTrue(user.subscriptions.filter(plan=self.bundle_plan).exists())

    def test_admin_grant_duplicate_package_rejected(self):
        """Selecting the same package twice must be rejected."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='dup_pkg_student',
            email='dup.pkg@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {'package_id': self.single_plan.id},
            ],
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Duplicate package selection', response.data['error'])
        self.assertFalse(User.objects.filter(username='dup_pkg_student').exists())

    def test_admin_grant_multi_package_invalid_course_rejected(self):
        """If one package contains an ineligible course, request is rejected."""
        unrelated_course = Course.objects.create(title='Forestry', slug='forestry', status='published')
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='bad_course_student',
            email='badcourse@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [unrelated_course.id],
                },
            ],
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not eligible', response.data['error'])
        # Atomic rollback verification
        self.assertFalse(User.objects.filter(username='bad_course_student').exists())
        self.assertEqual(Subscription.objects.count(), 0)

    def test_admin_grant_multi_package_exceeds_allowed_courses_rejected(self):
        """Selecting more courses than allowed in a package is rejected."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='overflow_student',
            email='overflow@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [self.course_civil5.id, self.course_civil7.id, self.course_electrical.id],
                },
            ],
        )
        response = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('allows at most 2', response.data['error'])
        self.assertFalse(User.objects.filter(username='overflow_student').exists())

    def test_admin_user_detail_shows_multiple_subscriptions(self):
        """Admin user detail page returns all active subscriptions in subscriptions array."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='detail_multi_student',
            email='detail.multi@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [self.course_civil7.id],
                },
            ],
        )
        res = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        student_id = res.data['id']

        detail_res = self.client.get(f'/api/admin/users/{student_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        subs = detail_res.data.get('subscriptions')
        self.assertIsNotNone(subs)
        self.assertEqual(len(subs), 2)
        plan_names = {s['planName'] for s in subs}
        self.assertEqual(plan_names, {self.single_plan.name, self.multi_plan.name})
        for s in subs:
            self.assertEqual(s['accessSource'], 'Admin Granted')
            self.assertTrue(s['isActive'])

    def test_multi_package_student_can_login_and_access_all_courses(self):
        """Student with multiple packages can log in and sees all authorized courses."""
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            username='login_multi_student',
            email='login.multi@test.com',
            exam_category_id=self.category.id,
            packages=[
                {'package_id': self.single_plan.id},
                {
                    'package_id': self.multi_plan.id,
                    'course_ids': [self.course_civil7.id, self.course_electrical.id],
                },
            ],
        )
        res = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Login
        self.client.force_authenticate(user=None)
        login_res = self.client.post('/api/token/', {
            'username': 'login_multi_student',
            'password': 'StrongPassword123!',
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertTrue(login_res.data['package']['hasActivePackage'])

        # Context
        user = User.objects.get(username='login_multi_student')
        self.client.force_authenticate(user=user)
        ctx_res = self.client.get('/api/student/context/')
        self.assertEqual(ctx_res.status_code, status.HTTP_200_OK)
        authorized = ctx_res.data.get('authorized_courses', [])
        authorized_ids = {c['id'] for c in authorized}
        self.assertEqual(authorized_ids, {self.course_civil5.id, self.course_civil7.id, self.course_electrical.id})

