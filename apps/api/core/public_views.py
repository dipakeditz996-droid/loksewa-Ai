from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions


class PublicPlatformSettingsView(APIView):
    """GET /api/public/platform-settings/ - the subset of AdminSettings.platform
    safe to expose pre-login, so the app's own branding (name/logo) actually
    reflects what an admin configures instead of being hardcoded everywhere."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import AdminSettings
        settings = AdminSettings.get_settings()
        return Response({
            'name': settings.platform_name,
            'logoUrl': settings.platform_logo_url,
            'description': settings.platform_description,
        })


class PublicTestimonialView(APIView):
    """GET /api/public/testimonials/ - real, admin-authored testimonials
    (core.Testimonial), not a hardcoded list. Returns an empty array until an
    admin publishes at least one - the homepage falls back to curated static
    copy in that case rather than showing nothing."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Testimonial
        from .testimonial_serializers import PublicTestimonialSerializer

        testimonials = Testimonial.objects.filter(is_published=True)
        serializer = PublicTestimonialSerializer(testimonials, many=True)
        return Response(serializer.data)
