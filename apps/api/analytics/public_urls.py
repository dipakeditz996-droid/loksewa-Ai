from django.urls import path
from .public_views import PublicStatsView

urlpatterns = [
    path('public/stats/', PublicStatsView.as_view(), name='public-stats'),
]
