"""Loksewa Community: text-only Q&A + discussion, tightly scoped to exam prep.

Deliberately reuses the platform's existing architecture rather than
duplicating it:
  - core.models.User for authorship/roles (no separate community profile)
  - exams.models.Topic / exams.models.Question for curriculum linking, so a
    post created from "Ask Community" carries the REAL question/topic
  - Moderation here is deliberately NOT the Question/QuestionSet pre-publish
    review workflow (draft -> pending_review -> approved) - a Q&A community
    needs posts to go live immediately (that's the entire point of asking a
    question), moderated *after the fact* via reports, closer to how
    StackOverflow/Discourse work. Copying the exam-content review state
    machine here would kill the product.

Deliberately excluded by design (not a gap): no private messaging/chat/
conversation model of any kind, and no file/image/video attachments -
Community is public text discussion only, scoped tightly to Q&A rather than
a general social platform.
"""
from django.conf import settings
from django.db import models


class CommunityPost(models.Model):
    POST_TYPE_CHOICES = (
        ('question', 'Question'),
        ('discussion', 'Discussion'),
    )
    STATUS_CHOICES = (
        ('published', 'Published'),
        ('removed', 'Removed by Moderator'),
    )

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_posts')
    title = models.CharField(max_length=255)
    body = models.TextField()
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default='question')

    # Curriculum link - set directly when asking generally, or carried over
    # from source_question when the post originates from Practice/Mock Exam.
    topic = models.ForeignKey(
        'exams.Topic', on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts'
    )
    # The REAL question a student got stuck on - lets "Ask Community" prefill
    # the exact question text instead of the student retyping it, and lets
    # the thread stay discoverable from that question later.
    source_question = models.ForeignKey(
        'exams.Question', on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='published')
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['topic']),
        ]

    def __str__(self):
        return self.title

    @property
    def reply_count(self):
        return self.replies.filter(status='published').count()

    @property
    def has_best_answer(self):
        return self.replies.filter(status='published', is_best_answer=True).exists()


class CommunityReply(models.Model):
    STATUS_CHOICES = (
        ('published', 'Published'),
        ('removed', 'Removed by Moderator'),
    )

    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_replies')
    body = models.TextField()
    # One level of threading (reply-to-an-answer) - deliberately not a full
    # nested tree, which the "Students can reply to answers" requirement
    # doesn't ask for and a forum-style UI doesn't need.
    parent_reply = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='child_replies'
    )

    is_best_answer = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='published')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_best_answer', 'created_at']
        indexes = [
            models.Index(fields=['post', 'status']),
        ]

    def __str__(self):
        return f'Reply by {self.author.username} on post {self.post_id}'

    @property
    def helpful_count(self):
        return self.helpful_votes.count()


class CommunityHelpfulVote(models.Model):
    """A lightweight 'this answer helped me' tap on a reply - distinct from
    Best Answer, which is a single admin/author-chosen pick per post."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_helpful_votes')
    reply = models.ForeignKey(CommunityReply, on_delete=models.CASCADE, related_name='helpful_votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reply')


class CommunityBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_bookmarks')
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='bookmarked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        ordering = ['-created_at']


class CommunityReport(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    )
    REASON_CHOICES = (
        ('spam', 'Spam'),
        ('offensive', 'Offensive / Inappropriate'),
        ('wrong_info', 'Incorrect Information'),
        ('other', 'Other'),
    )

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_reports_filed')
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reply = models.ForeignKey(CommunityReply, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='other')
    detail = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='community_reports_resolved'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(post__isnull=False, reply__isnull=True)
                    | models.Q(post__isnull=True, reply__isnull=False)
                ),
                name='community_report_exactly_one_target',
            )
        ]

    def __str__(self):
        return f'Report #{self.id} ({self.status})'
