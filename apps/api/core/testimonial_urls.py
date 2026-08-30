from django.urls import path

from .testimonial_views import MyTestimonialView

urlpatterns = [
    path('testimonials/mine/', MyTestimonialView.as_view(), name='my-testimonial'),
]
