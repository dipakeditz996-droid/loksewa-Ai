from django.db import transaction
from django.db.models import Count, Q, Prefetch, Exists, OuterRef
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.notification_service import NotificationService
from .models import CommunityPost, CommunityReply, CommunityHelpfulVote, CommunityBookmark, CommunityReport
from .permissions import IsOwnerOrAdmin, IsAdminUser, is_admin
from .serializers import (
    CommunityPostListSerializer, CommunityPostDetailSerializer, CommunityPostWriteSerializer,
    CommunityReplySerializer, CommunityBookmarkSerializer, CommunityReportSerializer,
)


class CommunityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _search_posts(queryset, query):
    """Real Postgres full-text search over title+body, ranked by relevance.
    Falls back to a plain icontains match if the DB backend isn't Postgres
    (e.g. a contributor's sqlite dev fallback), so the feature degrades
    gracefully instead of hard-erroring outside production."""
    from django.conf import settings as dj_settings

    engine = dj_settings.DATABASES['default']['ENGINE']
    if 'postgresql' in engine:
        from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
        vector = SearchVector('title', weight='A') + SearchVector('body', weight='B')
        search_query = SearchQuery(query)
        return (
            queryset.annotate(rank=SearchRank(vector, search_query))
            .filter(Q(title__icontains=query) | Q(body__icontains=query) | Q(rank__gt=0))
            .order_by('-rank', '-is_pinned', '-created_at')
        )
    return queryset.filter(Q(title__icontains=query) | Q(body__icontains=query)).order_by('-is_pinned', '-created_at')


class CommunityPostViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    pagination_class = CommunityPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return CommunityPostListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CommunityPostWriteSerializer
        return CommunityPostDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CommunityPost.objects.select_related('author', 'topic__chapter__subject', 'source_question')
        qs = qs.annotate(
            reply_count_annotated=Count('replies', filter=Q(replies__status='published'), distinct=True),
            has_best_answer_annotated=Exists(
                CommunityReply.objects.filter(post=OuterRef('pk'), status='published', is_best_answer=True)
            ),
        )

        # Non-admins never see moderator-removed posts, except their own.
        if not is_admin(user):
            qs = qs.filter(Q(status='published') | Q(author=user))
        else:
            # Admins can filter by status
            status_filter = self.request.query_params.get('status')
            if status_filter and status_filter != 'all':
                qs = qs.filter(status=status_filter)

        params = self.request.query_params
        topic_id = params.get('topic')
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        subject_id = params.get('subject')
        if subject_id:
            qs = qs.filter(topic__chapter__subject_id=subject_id)
        post_type = params.get('post_type')
        if post_type:
            qs = qs.filter(post_type=post_type)
        if params.get('unanswered') == 'true':
            qs = qs.exclude(replies__is_best_answer=True, replies__status='published')
        if params.get('mine') == 'true':
            qs = qs.filter(author=user)
        if params.get('bookmarked') == 'true':
            qs = qs.filter(bookmarked_by__user=user)

        search = params.get('search', '').strip()
        if search:
            qs = _search_posts(qs, search)

        ordering = params.get('ordering')
        if ordering == 'most_replies':
            qs = qs.order_by('-is_pinned', '-reply_count_annotated', '-created_at')
        elif not search:
            qs = qs.order_by('-is_pinned', '-created_at')

        return qs.distinct()

    def get_serializer(self, *args, **kwargs):
        # reply_count / has_best_answer are declared as plain fields on the
        # serializers (not SerializerMethodField) so they read straight off
        # the model properties - which already exist and do the real work.
        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        CommunityPost.objects.filter(pk=instance.pk).update(view_count=instance.view_count + 1)
        instance.refresh_from_db(fields=['view_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        if serializer.instance.is_locked and not is_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('This discussion is locked.')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_bookmark(self, request, pk=None):
        post = self.get_object()
        bookmark, created = CommunityBookmark.objects.get_or_create(user=request.user, post=post)
        if not created:
            bookmark.delete()
            return Response({'bookmarked': False})
        return Response({'bookmarked': True})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        post = self.get_object()
        report = CommunityReport.objects.create(
            reporter=request.user, post=post,
            reason=request.data.get('reason', 'other'),
            detail=request.data.get('detail', ''),
        )
        NotificationService.notify_admins(
            notif_type='community',
            title='New Community Report',
            message=f'"{post.title}" was reported by {request.user.username}.',
            action_url='/admin-dashboard/community?tab=reports',
        )
        return Response(CommunityReportSerializer(report).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def pin(self, request, pk=None):
        post = self.get_object()
        post.is_pinned = not post.is_pinned
        post.save(update_fields=['is_pinned'])
        return Response({'is_pinned': post.is_pinned})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def lock(self, request, pk=None):
        post = self.get_object()
        post.is_locked = not post.is_locked
        post.save(update_fields=['is_locked'])
        return Response({'is_locked': post.is_locked})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def moderate_remove(self, request, pk=None):
        post = self.get_object()
        post.status = 'removed'
        post.save(update_fields=['status'])
        NotificationService.notify_community_content_removed(post.author, post.title, '/student/community')
        return Response({'status': 'removed'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def moderate_restore(self, request, pk=None):
        post = self.get_object()
        post.status = 'published'
        post.save(update_fields=['status'])
        return Response({'status': 'published'})


class CommunityReplyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    serializer_class = CommunityReplySerializer

    def get_queryset(self):
        user = self.request.user
        qs = CommunityReply.objects.select_related('author', 'post').prefetch_related(
            Prefetch(
                'helpful_votes',
                queryset=CommunityHelpfulVote.objects.filter(user=user) if user.is_authenticated else CommunityHelpfulVote.objects.none(),
                to_attr='_my_helpful_votes',
            )
        )
        if not is_admin(user):
            qs = qs.filter(Q(status='published') | Q(author=user))
        else:
            status_filter = self.request.query_params.get('status')
            if status_filter and status_filter != 'all':
                qs = qs.filter(status=status_filter)
        post_id = self.request.query_params.get('post')
        if post_id:
            qs = qs.filter(post_id=post_id, parent_reply__isnull=True)
        return qs

    def perform_create(self, serializer):
        post = serializer.validated_data['post']
        if post.is_locked and not is_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('This discussion is locked.')
        reply = serializer.save(author=self.request.user)
        NotificationService.notify_community_reply(post, reply)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_helpful(self, request, pk=None):
        reply = self.get_object()
        vote, created = CommunityHelpfulVote.objects.get_or_create(user=request.user, reply=reply)
        if not created:
            vote.delete()
            return Response({'is_helpful': False, 'helpful_count': reply.helpful_votes.count()})
        return Response({'is_helpful': True, 'helpful_count': reply.helpful_votes.count()})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_best(self, request, pk=None):
        reply = self.get_object()
        post = reply.post
        if not (post.author_id == request.user.id or is_admin(request.user)):
            return Response({'detail': 'Only the post author or a moderator can mark the best answer.'}, status=403)
        with transaction.atomic():
            CommunityReply.objects.filter(post=post, is_best_answer=True).update(is_best_answer=False)
            reply.is_best_answer = True
            reply.save(update_fields=['is_best_answer'])
        NotificationService.notify_community_best_answer(reply)
        return Response(CommunityReplySerializer(reply, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unmark_best(self, request, pk=None):
        reply = self.get_object()
        post = reply.post
        if not (post.author_id == request.user.id or is_admin(request.user)):
            return Response({'detail': 'Only the post author or a moderator can unmark the best answer.'}, status=403)
        reply.is_best_answer = False
        reply.save(update_fields=['is_best_answer'])
        return Response(CommunityReplySerializer(reply, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        reply = self.get_object()
        report = CommunityReport.objects.create(
            reporter=request.user, reply=reply,
            reason=request.data.get('reason', 'other'),
            detail=request.data.get('detail', ''),
        )
        NotificationService.notify_admins(
            notif_type='community',
            title='New Community Report',
            message=f'A reply on "{reply.post.title}" was reported by {request.user.username}.',
            action_url='/admin-dashboard/community?tab=reports',
        )
        return Response(CommunityReportSerializer(report).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def moderate_remove(self, request, pk=None):
        reply = self.get_object()
        reply.status = 'removed'
        reply.save(update_fields=['status'])
        NotificationService.notify_community_content_removed(
            reply.author, f'reply on {reply.post.title}', f'/student/community/{reply.post_id}'
        )
        return Response({'status': 'removed'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def moderate_restore(self, request, pk=None):
        reply = self.get_object()
        reply.status = 'published'
        reply.save(update_fields=['status'])
        return Response({'status': 'published'})


class CommunityBookmarkListView(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CommunityBookmarkSerializer

    def get_queryset(self):
        return CommunityBookmark.objects.filter(user=self.request.user).select_related('post', 'post__author')


class CommunityReportViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin moderation queue - reports are created via the post/reply
    `report` actions above, this is read+resolve only."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = CommunityReportSerializer

    def get_queryset(self):
        qs = CommunityReport.objects.select_related('reporter', 'post', 'reply', 'reply__post')
        status_filter = self.request.query_params.get('status', 'open')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        report = self.get_object()
        report.status = 'resolved'
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save(update_fields=['status', 'resolved_by', 'resolved_at'])
        return Response(CommunityReportSerializer(report).data)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        report = self.get_object()
        report.status = 'dismissed'
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save(update_fields=['status', 'resolved_by', 'resolved_at'])
        return Response(CommunityReportSerializer(report).data)
