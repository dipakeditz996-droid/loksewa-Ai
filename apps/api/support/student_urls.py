"""
Routes mounted under /api/student/.

Only student-scoped preference endpoints live here; the wider support/profile
surface keeps its existing /api/support/ mount, so no current route changes.
"""
from django.urls import path

from .views import FocusModePreferenceView, StudentContextView, StudentSelectCourseView

urlpatterns = [
    path(
        'context/',
        StudentContextView.as_view(),
        name='student-context',
    ),
    path(
        'context/select-course/',
        StudentSelectCourseView.as_view(),
        name='student-context-select-course',
    ),
    path(
        'preferences/focus-mode/',
        FocusModePreferenceView.as_view(),
        name='student-focus-mode-preference',
    ),
]
