from rest_framework.routers import DefaultRouter

from .views import (
    CommunityPostViewSet, CommunityReplyViewSet, CommunityBookmarkListView, CommunityReportViewSet,
)

router = DefaultRouter()
router.register(r'posts', CommunityPostViewSet, basename='community-post')
router.register(r'replies', CommunityReplyViewSet, basename='community-reply')
router.register(r'bookmarks', CommunityBookmarkListView, basename='community-bookmark')
router.register(r'reports', CommunityReportViewSet, basename='community-report')

urlpatterns = router.urls
