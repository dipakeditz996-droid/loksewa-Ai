"""
Routes mounted under /api/student/.

Only student-scoped preference endpoints live here; the wider support/profile
surface keeps its existing /api/support/ mount, so no current route changes.
"""
from django.urls import path

from .views import FocusModePreferenceView

urlpatterns = [
    path(
        'preferences/focus-mode/',
        FocusModePreferenceView.as_view(),
        name='student-focus-mode-preference',
    ),
]
