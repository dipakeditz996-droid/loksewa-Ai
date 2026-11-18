from django.urls import path
from .public_views import (
    PublicTestimonialView,
    PublicTestimonialStatsView,
    PublicPlatformSettingsView,
    PublicWebsitePageView,
)
from .banner_views import PublicHomepageBannerView

urlpatterns = [
    path('public/banners/', PublicHomepageBannerView.as_view(), name='public-banners'),
    path('public/testimonials/', PublicTestimonialView.as_view(), name='public-testimonials'),
    path('public/testimonials/stats/', PublicTestimonialStatsView.as_view(), name='public-testimonials-stats'),
    path('public/platform-settings/', PublicPlatformSettingsView.as_view(), name='public-platform-settings'),
    path('public/pages/<slug:slug>/', PublicWebsitePageView.as_view(), name='public-website-page'),
]
