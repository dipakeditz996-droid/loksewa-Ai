from django.urls import path
from .public_views import PublicTestimonialView

urlpatterns = [
    path('public/testimonials/', PublicTestimonialView.as_view(), name='public-testimonials'),
]
