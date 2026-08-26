from django.urls import path
from .public_views import PublicPackageListView

urlpatterns = [
    path('packages/public/', PublicPackageListView.as_view(), name='public-packages'),
]
