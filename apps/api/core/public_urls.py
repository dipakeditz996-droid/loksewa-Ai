from django.urls import path
from .public_views import PublicTestimonialView, PublicPlatformSettingsView

urlpatterns = [
    path('public/testimonials/', PublicTestimonialView.as_view(), name='public-testimonials'),
    path('public/platform-settings/', PublicPlatformSettingsView.as_view(), name='public-platform-settings'),
]
