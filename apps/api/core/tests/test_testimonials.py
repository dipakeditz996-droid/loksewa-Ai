"""Testimonials shown on the public homepage used to be a hardcoded list in
core/public_views.py. Covers: the real Testimonial model + admin CRUD
(core.testimonial_views.AdminTestimonialViewSet, mounted at
/api/admin/testimonials/), and that the public endpoint only ever returns
published, real, admin-authored rows.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Testimonial


class AdminTestimonialCrudTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student')

    def test_admin_can_create_testimonial(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/testimonials/', {
            'name': 'Ramesh Karki',
            'role_title': 'Section Officer (Recommended)',
            'quote': 'This platform helped me pass on my first attempt.',
            'rating': 5,
            'is_published': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        testimonial = Testimonial.objects.get(name='Ramesh Karki')
        self.assertEqual(testimonial.created_by, self.admin)

    def test_student_cannot_create_testimonial(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/admin/testimonials/', {
            'name': 'Fake Student', 'quote': 'Not allowed.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_admin_endpoint(self):
        response = self.client.get('/api/admin/testimonials/')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_admin_can_update_and_delete(self):
        testimonial = Testimonial.objects.create(name='Sita Sharma', quote='Great app.')
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f'/api/admin/testimonials/{testimonial.id}/', {'is_published': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        testimonial.refresh_from_db()
        self.assertTrue(testimonial.is_published)

        response = self.client.delete(f'/api/admin/testimonials/{testimonial.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Testimonial.objects.filter(id=testimonial.id).exists())


class PublicTestimonialViewTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def test_only_published_testimonials_are_returned(self):
        Testimonial.objects.create(name='Published One', quote='Visible.', is_published=True, display_order=1)
        Testimonial.objects.create(name='Draft One', quote='Hidden.', is_published=False)

        response = self.client.get('/api/public/testimonials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [t['name'] for t in response.data]
        self.assertEqual(names, ['Published One'])

    def test_response_shape_matches_frontend_type(self):
        Testimonial.objects.create(
            name='Prakash Thapa', role_title='Kharidar', quote='Best platform.',
            avatar_url='https://example.com/a.jpg', rating=4, is_published=True,
        )
        response = self.client.get('/api/public/testimonials/')
        row = response.data[0]
        self.assertEqual(set(row.keys()), {'id', 'name', 'position', 'avatar', 'review', 'rating'})
        self.assertEqual(row['position'], 'Kharidar')
        self.assertEqual(row['review'], 'Best platform.')

    def test_ordering_respects_display_order(self):
        Testimonial.objects.create(name='Second', quote='q', is_published=True, display_order=2)
        Testimonial.objects.create(name='First', quote='q', is_published=True, display_order=1)
        response = self.client.get('/api/public/testimonials/')
        self.assertEqual([t['name'] for t in response.data], ['First', 'Second'])

    def test_empty_when_nothing_published(self):
        response = self.client.get('/api/public/testimonials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


class MyTestimonialViewTests(APITestCase):
    """/api/testimonials/mine/ - a logged-in student writes their own review
    using the same access token every other authenticated request already
    uses, so there is no separate login step for an already-authenticated
    student. Covers: create, edit-in-place (no duplicate rows), moderation
    (a student can never publish their own review), and per-account isolation.
    """

    def setUp(self):
        self.student = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student', first_name='Anisha')
        self.other_student = User.objects.create_user(
            username='stud2', email='s2@test.com', password='pass123', role='student')

    def test_anonymous_cannot_submit(self):
        response = self.client.post('/api/testimonials/mine/', {'quote': 'Great app.'}, format='json')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_logged_in_student_can_submit_without_re_authenticating(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/testimonials/mine/', {
            'role_title': 'Kharidar (Recommended)',
            'quote': "Mock exams felt harder than the real thing.",
            'rating': 5,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        testimonial = Testimonial.objects.get(created_by=self.student)
        self.assertEqual(testimonial.quote, "Mock exams felt harder than the real thing.")
        self.assertEqual(testimonial.name, 'Anisha')  # defaulted from the account, none was given

    def test_submission_is_never_self_published(self):
        self.client.force_authenticate(user=self.student)
        self.client.post('/api/testimonials/mine/', {
            'quote': 'Great app.', 'is_published': True,  # attempted, must be ignored
        }, format='json')
        testimonial = Testimonial.objects.get(created_by=self.student)
        self.assertFalse(testimonial.is_published)

    def test_writing_again_edits_in_place_not_duplicates(self):
        self.client.force_authenticate(user=self.student)
        self.client.post('/api/testimonials/mine/', {'quote': 'First draft.'}, format='json')
        self.client.post('/api/testimonials/mine/', {'quote': 'Revised draft.'}, format='json')

        self.assertEqual(Testimonial.objects.filter(created_by=self.student).count(), 1)
        self.assertEqual(Testimonial.objects.get(created_by=self.student).quote, 'Revised draft.')

    def test_editing_a_published_review_takes_it_back_out_of_public_view(self):
        Testimonial.objects.create(
            created_by=self.student, name='Anisha', quote='Original.', is_published=True)
        self.client.force_authenticate(user=self.student)
        self.client.post('/api/testimonials/mine/', {'quote': 'Edited.'}, format='json')

        testimonial = Testimonial.objects.get(created_by=self.student)
        self.assertFalse(testimonial.is_published)
        self.assertEqual(testimonial.quote, 'Edited.')

    def test_get_returns_only_the_requesting_students_own_review(self):
        Testimonial.objects.create(created_by=self.student, name='Anisha', quote='Mine.')
        Testimonial.objects.create(created_by=self.other_student, name='Other', quote='Not mine.')

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/testimonials/mine/')
        self.assertEqual(response.data['testimonial']['quote'], 'Mine.')

    def test_get_returns_null_when_nothing_submitted_yet(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/testimonials/mine/')
        self.assertIsNone(response.data['testimonial'])

    def test_wire_format_is_unambiguous_json_null_not_empty_body(self):
        """response.data above is the pre-render Python object — this checks
        the actual rendered bytes a browser's fetch() receives. A bare
        `Response(None)` renders to zero bytes (DRF's JSONRenderer special
        case), which a generic client normalizes to `{}`, indistinguishable
        from "found a blank testimonial". This is what the {"testimonial": ...}
        wrapper exists to prevent."""
        import json

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/testimonials/mine/')
        self.assertGreater(len(response.content), 0)
        self.assertEqual(json.loads(response.content), {'testimonial': None})

    def test_blank_quote_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/testimonials/mine/', {'quote': '   '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_can_delete_their_own_review(self):
        Testimonial.objects.create(created_by=self.student, name='Anisha', quote='Mine.')
        self.client.force_authenticate(user=self.student)
        response = self.client.delete('/api/testimonials/mine/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Testimonial.objects.filter(created_by=self.student).exists())

    def test_rating_out_of_range_is_clamped_not_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/testimonials/mine/', {'quote': 'q', 'rating': 99}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Testimonial.objects.get(created_by=self.student).rating, 5)


class AdminTestimonialModerationViewTests(APITestCase):
    """Admin-facing visibility into which rows are student-submitted vs
    admin-authored, so a real moderation queue is distinguishable from the
    admin's own curated entries."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stud1', email='s1@test.com', password='pass123', role='student', first_name='Anisha')

    def test_student_submission_flagged_in_admin_list(self):
        Testimonial.objects.create(created_by=self.student, name='Anisha', quote='Mine.')
        Testimonial.objects.create(created_by=self.admin, name='Admin Written', quote='Curated.')

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/testimonials/')
        rows = {row['name']: row for row in response.data}
        self.assertTrue(rows['Anisha']['submitted_by_student'])
        self.assertFalse(rows['Admin Written']['submitted_by_student'])
        self.assertEqual(rows['Anisha']['submitted_by_name'], 'Anisha')

    def test_admin_can_publish_a_student_submission(self):
        testimonial = Testimonial.objects.create(created_by=self.student, name='Anisha', quote='Mine.')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/admin/testimonials/{testimonial.id}/', {'is_published': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        testimonial.refresh_from_db()
        self.assertTrue(testimonial.is_published)


class ReviewDeletionAndCacheSyncRegressionTests(APITestCase):
    """Regression suite verifying review deletion, cache invalidation, authorization,
    and aggregate metric synchronization."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.admin = User.objects.create_user(
            username='admin_sync', email='admin_sync@test.com', password='pass', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='student_sync', email='student_sync@test.com', password='pass', role='student')

    def test_admin_successfully_deletes_review(self):
        t = Testimonial.objects.create(name='Reviewer 1', quote='Pass exam', rating=5, is_published=True)
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/admin/testimonials/{t.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Testimonial.objects.filter(id=t.id).exists())

    def test_unauthorized_user_cannot_delete_review(self):
        t = Testimonial.objects.create(name='Reviewer 2', quote='Pass exam', rating=5, is_published=True)
        # 1. Anonymous user
        res_anon = self.client.delete(f'/api/admin/testimonials/{t.id}/')
        self.assertIn(res_anon.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        # 2. Student user
        self.client.force_authenticate(user=self.student)
        res_stud = self.client.delete(f'/api/admin/testimonials/{t.id}/')
        self.assertEqual(res_stud.status_code, status.HTTP_403_FORBIDDEN)
        # Ensure still exists in DB
        self.assertTrue(Testimonial.objects.filter(id=t.id).exists())

    def test_deleted_review_absent_from_public_review_api(self):
        t1 = Testimonial.objects.create(name='Active Review', quote='Visible review', rating=5, is_published=True)
        t2 = Testimonial.objects.create(name='Review To Delete', quote='Will be removed', rating=4, is_published=True)

        # Before deletion: both in public API
        res = self.client.get('/api/public/testimonials/')
        names = [x['name'] for x in res.data]
        self.assertIn('Active Review', names)
        self.assertIn('Review To Delete', names)

        # Delete t2
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t2.id}/')

        # After deletion: excluded immediately from public API
        self.client.logout()
        res_after = self.client.get('/api/public/testimonials/')
        names_after = [x['name'] for x in res_after.data]
        self.assertIn('Active Review', names_after)
        self.assertNotIn('Review To Delete', names_after)

    def test_deleted_review_disappears_from_homepage(self):
        t = Testimonial.objects.create(name='Featured Aspirant', quote='Great', rating=5, is_published=True)
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t.id}/')

        res = self.client.get('/api/public/testimonials/')
        self.assertEqual(len(res.data), 0)

    def test_review_count_and_average_rating_update_correctly(self):
        # Create two reviews: 5 stars and 3 stars -> count 2, avg 4.0
        t1 = Testimonial.objects.create(name='R1', quote='Q1', rating=5, is_published=True)
        t2 = Testimonial.objects.create(name='R2', quote='Q2', rating=3, is_published=True)

        res = self.client.get('/api/public/testimonials/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_reviews'], 2)
        self.assertEqual(res.data['average_rating'], 4.0)

        # Delete 3-star review -> remaining: 1 review, avg 5.0
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t2.id}/')

        res_after = self.client.get('/api/public/testimonials/stats/')
        self.assertEqual(res_after.data['total_reviews'], 1)
        self.assertEqual(res_after.data['average_rating'], 5.0)

    def test_redis_cache_does_not_return_deleted_review(self):
        from django.core.cache import cache
        from administration.cache_service import CACHE_KEY_PUBLIC_TESTIMONIALS

        t = Testimonial.objects.create(name='Cached Review', quote='Cache test', rating=5, is_published=True)

        # Prime the public cache
        res = self.client.get('/api/public/testimonials/')
        self.assertEqual(len(res.data), 1)
        self.assertIsNotNone(cache.get(CACHE_KEY_PUBLIC_TESTIMONIALS))

        # Admin deletes review
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t.id}/')

        # Cache must have been invalidated
        self.assertIsNone(cache.get(CACHE_KEY_PUBLIC_TESTIMONIALS))

        # Subsequent GET yields empty list and repopulates fresh cache
        res_fresh = self.client.get('/api/public/testimonials/')
        self.assertEqual(len(res_fresh.data), 0)

    def test_audit_trail_recorded_on_review_deletion(self):
        from administration.models import AuditLog
        t = Testimonial.objects.create(name='Audit Target', quote='Quote', rating=5, is_published=True)

        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t.id}/')

        log = AuditLog.objects.filter(action='DELETE_TESTIMONIAL', entity_id=str(t.id)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.details.get('name'), 'Audit Target')

    def test_page_refresh_does_not_restore_deleted_review(self):
        t = Testimonial.objects.create(name='Refresh Test', quote='Quote', rating=5, is_published=True)
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/admin/testimonials/{t.id}/')

        # Simulate 3 consecutive page refreshes
        for _ in range(3):
            res = self.client.get('/api/public/testimonials/')
            self.assertEqual(len(res.data), 0)

    def test_failed_deletion_does_not_falsely_show_success(self):
        self.client.force_authenticate(user=self.admin)
        # Attempt deleting nonexistent ID 99999
        res = self.client.delete('/api/admin/testimonials/99999/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

