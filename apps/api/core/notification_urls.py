from django.urls import path
from .notification_views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationReadView,
    NotificationMarkAllReadView,
    TeacherNotificationPreferencesView
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('preferences/teacher/', TeacherNotificationPreferencesView.as_view(), name='teacher-notification-preferences'),
]
