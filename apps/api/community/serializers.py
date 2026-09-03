from rest_framework import serializers

from core.models import User
from exams.models import Question, Topic
from .models import CommunityPost, CommunityReply, CommunityHelpfulVote, CommunityBookmark, CommunityReport


class CommunityAuthorSerializer(serializers.ModelSerializer):
    """Minimal author info + role, so the frontend can render the
    Teacher/Admin badge without a second lookup."""
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'role', 'avatar']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class CommunityTopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='chapter.subject.name', read_only=True)

    class Meta:
        model = Topic
        fields = ['id', 'name', 'subject_name']


class CommunitySourceQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_id', 'text', 'option_a', 'option_b', 'option_c', 'option_d']


class CommunityReplySerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    helpful_count = serializers.IntegerField(read_only=True)
    is_helpful_by_me = serializers.SerializerMethodField()
    child_replies = serializers.SerializerMethodField()

    class Meta:
        model = CommunityReply
        fields = [
            'id', 'post', 'author', 'body', 'parent_reply', 'is_best_answer',
            'status', 'helpful_count', 'is_helpful_by_me', 'child_replies',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['author', 'is_best_answer', 'status']

    def get_is_helpful_by_me(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        # Prefetched via Prefetch(..., to_attr='_my_helpful_votes') in the
        # view; falls back to a query only if that wasn't set up.
        if hasattr(obj, '_my_helpful_votes'):
            return len(obj._my_helpful_votes) > 0
        return obj.helpful_votes.filter(user_id=user.id).exists()

    def get_child_replies(self, obj):
        # Only one level deep - top-level reply serialization includes its
        # direct children inline so the frontend can render a simple thread
        # without N+1 follow-up requests.
        if obj.parent_reply_id is not None:
            return []
        children = [r for r in obj.post.replies.all() if r.parent_reply_id == obj.id and r.status == 'published']
        return CommunityReplySerializer(children, many=True, context=self.context).data


class CommunityPostListSerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    topic = CommunityTopicSerializer(read_only=True)
    # Read from the queryset annotations (see CommunityPostViewSet.get_queryset)
    # instead of the model properties, which would otherwise issue two extra
    # queries per post (an N+1) when serializing a list.
    reply_count = serializers.IntegerField(source='reply_count_annotated', read_only=True)
    has_best_answer = serializers.BooleanField(source='has_best_answer_annotated', read_only=True)

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'title', 'post_type', 'author', 'topic', 'status',
            'is_pinned', 'is_locked', 'view_count', 'reply_count',
            'has_best_answer', 'created_at',
        ]


class CommunityPostDetailSerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    topic = CommunityTopicSerializer(read_only=True)
    source_question = CommunitySourceQuestionSerializer(read_only=True)
    reply_count = serializers.IntegerField(source='reply_count_annotated', read_only=True)
    has_best_answer = serializers.BooleanField(source='has_best_answer_annotated', read_only=True)
    is_bookmarked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'title', 'body', 'post_type', 'author', 'topic', 'source_question',
            'status', 'is_pinned', 'is_locked', 'view_count',
            'reply_count', 'has_best_answer', 'is_bookmarked_by_me',
            'created_at', 'updated_at',
        ]

    def get_is_bookmarked_by_me(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        return obj.bookmarked_by.filter(user_id=user.id).exists()


class CommunityPostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPost
        fields = ['id', 'title', 'body', 'post_type', 'topic', 'source_question']

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Title must be at least 5 characters.')
        return value.strip()

    def validate_body(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError('Please describe your question or discussion in more detail (10+ characters).')
        return value.strip()


class CommunityBookmarkSerializer(serializers.ModelSerializer):
    post = CommunityPostListSerializer(read_only=True)

    class Meta:
        model = CommunityBookmark
        fields = ['id', 'post', 'created_at']


class CommunityReportSerializer(serializers.ModelSerializer):
    reporter = CommunityAuthorSerializer(read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True, default=None)
    reply_excerpt = serializers.SerializerMethodField()
    reply_post_id = serializers.IntegerField(source='reply.post_id', read_only=True, default=None)

    class Meta:
        model = CommunityReport
        fields = [
            'id', 'reporter', 'post', 'post_title', 'reply', 'reply_excerpt', 'reply_post_id',
            'reason', 'detail', 'status', 'resolved_by', 'resolved_at', 'created_at',
        ]
        read_only_fields = ['reporter', 'status', 'resolved_by', 'resolved_at']

    def get_reply_excerpt(self, obj):
        return (obj.reply.body[:120] if obj.reply else None)

    def validate(self, attrs):
        post = attrs.get('post')
        reply = attrs.get('reply')
        if bool(post) == bool(reply):
            raise serializers.ValidationError('Report exactly one of post or reply.')
        return attrs
