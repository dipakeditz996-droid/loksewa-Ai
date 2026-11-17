from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.core.cache import cache
from django.db.models import Avg
from administration.cache_service import (
    CACHE_KEY_PUBLIC_TESTIMONIALS,
    CACHE_KEY_PUBLIC_TESTIMONIAL_STATS,
)


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


class PublicWebsitePageView(APIView):
    """GET /api/public/pages/<slug>/ - published admin-managed page content
    (Contact, Privacy, Terms, Refund). Only ever returns status='published'
    rows, and only the fields safe to show a visitor - never updated_by,
    never the internal id, never a draft. A missing/unpublished slug returns
    404 with an honest message rather than any fallback content, so the
    frontend never has to choose between showing nothing and showing
    something fabricated."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        from .models import WebsitePage
        from .website_page_serializers import PublicWebsitePageSerializer

        try:
            page = WebsitePage.objects.get(slug=slug, status='published')
        except WebsitePage.DoesNotExist:
            return Response({'detail': 'This page has not been published yet.'}, status=404)
        return Response(PublicWebsitePageSerializer(page).data)


class PublicTestimonialView(APIView):
    """GET /api/public/testimonials/ - real, admin-authored testimonials
    (core.Testimonial), not a hardcoded list. Returns an empty array until an
    admin publishes at least one - the homepage falls back to curated static
    copy in that case rather than showing nothing."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = cache.get(CACHE_KEY_PUBLIC_TESTIMONIALS)
        if cached is not None:
            return Response(cached)

        from .models import Testimonial
        from .testimonial_serializers import PublicTestimonialSerializer

        testimonials = Testimonial.objects.filter(is_published=True)
        serializer = PublicTestimonialSerializer(testimonials, many=True)
        data = serializer.data
        cache.set(CACHE_KEY_PUBLIC_TESTIMONIALS, data, timeout=300)
        return Response(data)


class PublicTestimonialStatsView(APIView):
    """GET /api/public/testimonials/stats/ - aggregate count and average rating
    of published testimonials."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = cache.get(CACHE_KEY_PUBLIC_TESTIMONIAL_STATS)
        if cached is not None:
            return Response(cached)

        from .models import Testimonial

        published_qs = Testimonial.objects.filter(is_published=True)
        count = published_qs.count()
        avg_rating = published_qs.aggregate(avg=Avg('rating'))['avg']
        avg_val = round(float(avg_rating), 1) if avg_rating is not None and count > 0 else 5.0

        payload = {
            'total_reviews': count,
            'average_rating': avg_val,
        }
        cache.set(CACHE_KEY_PUBLIC_TESTIMONIAL_STATS, payload, timeout=300)
        return Response(payload)
