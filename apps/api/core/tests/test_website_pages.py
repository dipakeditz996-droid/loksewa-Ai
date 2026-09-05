"""Admin-managed public/legal page content (Contact, Privacy, Terms, Refund).

Covers: the real WebsitePage model + admin CRUD (core.website_page_views.
AdminWebsitePageViewSet, mounted at /api/admin/website-pages/{slug}/), the
publish/unpublish actions, and that the public endpoint
(core.public_views.PublicWebsitePageView) only ever returns published rows -
draft content and admin metadata (updated_by, internal id) are never exposed
publicly.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, WebsitePage
from administration.models import AuditLog


class PublicWebsitePageTests(APITestCase):
    def setUp(self):
        # update_or_create, not create: migration 0026 already seeds these
        # slugs as drafts, so tests reuse (and override) that row rather
        # than colliding on the unique slug constraint.
        WebsitePage.objects.update_or_create(slug='privacy', defaults={'title': 'Privacy Policy', 'content': 'We respect your data.', 'status': 'published'})
        WebsitePage.objects.update_or_create(slug='terms', defaults={'title': 'Terms & Conditions', 'content': 'Use the platform responsibly.', 'status': 'draft'})

    def test_published_page_is_publicly_readable(self):
        response = self.client.get('/api/public/pages/privacy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Privacy Policy')
        self.assertEqual(response.data['content'], 'We respect your data.')

    def test_public_response_excludes_admin_metadata(self):
        response = self.client.get('/api/public/pages/privacy/')
        self.assertNotIn('updated_by', response.data)
        self.assertNotIn('updated_by_name', response.data)
        self.assertNotIn('id', response.data)
        self.assertNotIn('status', response.data)

    def test_draft_page_is_not_publicly_accessible(self):
        response = self.client.get('/api/public/pages/terms/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_slug_returns_404_not_fabricated_content(self):
        response = self.client.get('/api/public/pages/nonexistent/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('detail', response.data)


class AdminWebsitePageCrudTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin1', email='a1@test.com', password='pass123', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(username='teach1', email='t1@test.com', password='pass123', role='teacher')
        self.student = User.objects.create_user(username='stud1', email='s1@test.com', password='pass123', role='student')
        self.page, _ = WebsitePage.objects.update_or_create(slug='contact', defaults={'title': 'Contact Us', 'content': 'Email us.', 'status': 'draft'})

    def test_admin_can_read_content(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/website-pages/contact/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], 'contact')

    def test_admin_can_update_content(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch('/api/admin/website-pages/contact/', {
            'title': 'Get In Touch', 'content': 'New contact details.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.page.refresh_from_db()
        self.assertEqual(self.page.title, 'Get In Touch')
        self.assertEqual(self.page.content, 'New contact details.')
        self.assertEqual(self.page.updated_by, self.admin)

    def test_update_persists_after_reload(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch('/api/admin/website-pages/contact/', {'content': 'Persisted content.'}, format='json')
        # Simulate a fresh request cycle - re-fetch from the DB, not the same in-memory instance.
        reloaded = WebsitePage.objects.get(slug='contact')
        self.assertEqual(reloaded.content, 'Persisted content.')

    def test_slug_is_not_editable(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch('/api/admin/website-pages/contact/', {'slug': 'hacked'}, format='json')
        self.page.refresh_from_db()
        self.assertEqual(self.page.slug, 'contact')

    def test_admin_can_publish(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/website-pages/contact/publish/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.page.refresh_from_db()
        self.assertEqual(self.page.status, 'published')
        # And it's now genuinely publicly visible.
        public = self.client.get('/api/public/pages/contact/')
        self.assertEqual(public.status_code, status.HTTP_200_OK)

    def test_admin_can_unpublish(self):
        self.page.status = 'published'
        self.page.save(update_fields=['status'])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/website-pages/contact/unpublish/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.page.refresh_from_db()
        self.assertEqual(self.page.status, 'draft')
        public = self.client.get('/api/public/pages/contact/')
        self.assertEqual(public.status_code, status.HTTP_404_NOT_FOUND)

    def test_publish_writes_audit_log(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/admin/website-pages/contact/publish/')
        log = AuditLog.objects.filter(action='WEBSITE_PAGE_PUBLISHED', entity_type='WebsitePage').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.details.get('slug'), 'contact')

    def test_update_writes_audit_log(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch('/api/admin/website-pages/contact/', {'content': 'Changed.'}, format='json')
        log = AuditLog.objects.filter(action='WEBSITE_PAGE_UPDATED', entity_type='WebsitePage').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.admin)

    def test_invalid_slug_returns_404(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/website-pages/does-not-exist/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_content_stored_verbatim_no_html_interpretation(self):
        """The backend never interprets/executes content - it's an opaque
        TextField. XSS safety is enforced on the frontend (LegalContent.tsx
        renders parsed React elements, never dangerouslySetInnerHTML), but
        the backend must still round-trip arbitrary text unmodified rather
        than silently stripping or escaping it into something else."""
        self.client.force_authenticate(user=self.admin)
        payload = "<script>alert('xss')</script>"
        self.client.patch('/api/admin/website-pages/contact/', {'content': payload}, format='json')
        self.page.refresh_from_db()
        self.assertEqual(self.page.content, payload)


class AdminWebsitePagePermissionTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teach1', email='t1@test.com', password='pass123', role='teacher')
        self.student = User.objects.create_user(username='stud1', email='s1@test.com', password='pass123', role='student')
        WebsitePage.objects.update_or_create(slug='refund', defaults={'title': 'Refund Policy', 'content': 'Refunds within 7 days.', 'status': 'draft'})

    def test_student_cannot_read_admin_endpoint(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/admin/website-pages/refund/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_update_content(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch('/api/admin/website-pages/refund/', {'content': 'Hacked.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(WebsitePage.objects.get(slug='refund').content, 'Refunds within 7 days.')

    def test_teacher_cannot_update_content(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch('/api/admin/website-pages/refund/', {'content': 'Hacked.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(WebsitePage.objects.get(slug='refund').content, 'Refunds within 7 days.')

    def test_teacher_cannot_publish(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/admin/website-pages/refund/publish/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_admin_endpoint(self):
        response = self.client.get('/api/admin/website-pages/refund/')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_anonymous_cannot_update_content(self):
        response = self.client.patch('/api/admin/website-pages/refund/', {'content': 'Hacked.'}, format='json')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        self.assertEqual(WebsitePage.objects.get(slug='refund').content, 'Refunds within 7 days.')


class SeedDataTests(APITestCase):
    """The 4 required pages exist (migration 0026) and start correctly as drafts."""

    def test_four_pages_seeded_as_drafts(self):
        for slug in ('contact', 'privacy', 'terms', 'refund'):
            page = WebsitePage.objects.get(slug=slug)
            self.assertEqual(page.status, 'draft', f"{slug} should start as draft, not auto-published")

    def test_seeded_pages_not_publicly_visible_until_published(self):
        for slug in ('contact', 'privacy', 'terms', 'refund'):
            response = self.client.get(f'/api/public/pages/{slug}/')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, f"{slug} should not be public yet")
