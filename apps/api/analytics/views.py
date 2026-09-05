from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from subscriptions.permissions import HasActiveSubscription
from django.core.cache import cache
from .services.analytics_service import AnalyticsService
from .services.ai_service import AIService

class OverviewView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        data = AnalyticsService.get_overview(request.user)
        return Response(data)

class PerformanceTrendView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        data = AnalyticsService.get_performance_trend(request.user, days)
        return Response(data)

class SubjectPerformanceView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        data = AnalyticsService.get_subject_performance(request.user)
        return Response(data)

class TopicPerformanceView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get(self, request):
        data = AnalyticsService.get_topic_performance(request.user)
        return Response(data)

class AIInsightView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request):
        cache_key = f"ai_insight_{request.user.id}"
        cached_insight = cache.get(cache_key)
        
        force_refresh = request.data.get('force_refresh', False)

        if cached_insight and not force_refresh:
            return Response(cached_insight)

        # Build context
        topics = AnalyticsService.get_topic_performance(request.user)
        weak_topics = [t for t in topics if t['status'] in ['Weak', 'Needs Improvement']]
        
        overview = AnalyticsService.get_overview(request.user)
        trend = AnalyticsService.get_performance_trend(request.user, 7) # last 7 days

        context = {
            "overall_accuracy": overview['overall_accuracy'],
            "weak_topics": weak_topics[:5], # Top 5 weak
            "recent_trend": trend,
            "study_streak": overview['study_streak']
        }

        insight = AIService.generate_study_plan(context)
        
        # Cache for 24 hours
        cache.set(cache_key, insight, 60 * 60 * 24)

        return Response(insight)
