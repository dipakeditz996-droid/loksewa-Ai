from django.urls import path
from .public_views import PublicTestimonialView, PublicPlatformSettingsView, PublicWebsitePageView

urlpatterns = [
    path('public/testimonials/', PublicTestimonialView.as_view(), name='public-testimonials'),
    path('public/platform-settings/', PublicPlatformSettingsView.as_view(), name='public-platform-settings'),
    path('public/pages/<slug:slug>/', PublicWebsitePageView.as_view(), name='public-website-page'),
]
