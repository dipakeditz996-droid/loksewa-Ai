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
