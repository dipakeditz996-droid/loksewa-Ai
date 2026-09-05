import os

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser

from administration.permissions import IsAdminUser
from .models import WebsitePage
from .website_page_serializers import AdminWebsitePageSerializer

_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB - same cap as TeacherAvatarUploadView


class AdminWebsitePageViewSet(viewsets.ModelViewSet):
    """CRUD for admins managing public/legal page content (Contact, Privacy,
    Terms, Refund). Looked up by slug, not id, so admin URLs read the same
    way the public route does (/admin/website-pages/privacy/ <-> /privacy).

    Only the fixed set of pages seeded by the initial migration exist today -
    create/delete are left enabled (consistent with every other admin
    ModelViewSet) but nothing in the frontend calls them yet.
    """
    queryset = WebsitePage.objects.all()
    serializer_class = AdminWebsitePageSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'slug'

    def perform_update(self, serializer):
        page = serializer.save(updated_by=self.request.user)
        self._log(page, 'WEBSITE_PAGE_UPDATED')

    def perform_create(self, serializer):
        page = serializer.save(updated_by=self.request.user)
        self._log(page, 'WEBSITE_PAGE_CREATED')

    def perform_destroy(self, instance):
        slug = instance.slug
        instance.delete()
        self._log_raw(slug, 'WEBSITE_PAGE_DELETED')

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def upload_image(self, request):
        """POST /api/admin/website-pages/upload_image/ - multipart 'image'
        field. Not tied to any single page (an admin may reuse one image
        across pages), so it lives on the collection route rather than a
        specific slug. Returns a URL the editor inserts into the content
        textarea as ![alt](url) - the same http(s)-only image syntax
        LegalContent.tsx already restricts links to."""
        image = request.FILES.get('image')
        if not image:
            return Response({'detail': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if image.content_type not in _ALLOWED_IMAGE_TYPES:
            return Response({'detail': 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'}, status=status.HTTP_400_BAD_REQUEST)
        if image.size > _MAX_IMAGE_BYTES:
            return Response({'detail': 'Image too large. Maximum allowed size is 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile

        ext = os.path.splitext(image.name)[1].lower() or '.jpg'
        filename = f"website-pages/{request.user.id}_{os.urandom(4).hex()}{ext}"
        saved_path = default_storage.save(filename, ContentFile(image.read()))
        url = default_storage.url(saved_path)
        if not url.startswith('http'):
            url = request.build_absolute_uri(url)

        return Response({'url': url}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        page = self.get_object()
        page.status = 'published'
        page.updated_by = request.user
        page.save(update_fields=['status', 'updated_by', 'updated_at'])
        self._log(page, 'WEBSITE_PAGE_PUBLISHED')
        return Response(AdminWebsitePageSerializer(page).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, slug=None):
        page = self.get_object()
        page.status = 'draft'
        page.updated_by = request.user
        page.save(update_fields=['status', 'updated_by', 'updated_at'])
        self._log(page, 'WEBSITE_PAGE_UNPUBLISHED')
        return Response(AdminWebsitePageSerializer(page).data)

    def _log(self, page, action_name):
        self._log_raw(page.slug, action_name, page.id)

    def _log_raw(self, slug, action_name, page_id=None):
        from administration.models import AuditLog
        AuditLog.objects.create(
            actor=self.request.user, action=action_name,
            entity_type='WebsitePage', entity_id=str(page_id) if page_id else slug,
            details={'slug': slug},
        )
