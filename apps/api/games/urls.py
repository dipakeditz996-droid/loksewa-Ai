from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    MatchmakingView,
    MatchCancelView,
    InviteMatchView,
    JoinMatchView,
    MatchStateView,
    MatchAnswerView,
    SurvivalStartView,
    SurvivalActiveView,
    SurvivalAnswerView,
    GameHistoryView,
    LeaderboardView,
    WeeklyQuizCurrentView,
    WeeklyQuizStartView,
    WeeklyQuizSubmitView,
    WeeklyQuizAttemptDetailView,
    DailyDrillTodayView,
    DailyDrillStartView,
    DailyDrillAnswerView,
    DailyDrillCompleteView,
    DailyDrillDetailView,
    AdminGameMatchesView,
    AdminSurvivalGamesView,
    AdminGameStatsView,
    AdminPlayerGameActivityView,
)

router = DefaultRouter()

urlpatterns = [
    # Daily Drill
    path('daily-drill/today/', DailyDrillTodayView.as_view(), name='daily_drill_today'),
    path('daily-drill/start/', DailyDrillStartView.as_view(), name='daily_drill_start'),
    path('daily-drill/<int:session_id>/', DailyDrillDetailView.as_view(), name='daily_drill_detail'),
    path('daily-drill/<int:session_id>/answer/', DailyDrillAnswerView.as_view(), name='daily_drill_answer'),
    path('daily-drill/<int:session_id>/complete/', DailyDrillCompleteView.as_view(), name='daily_drill_complete'),
    # 1v1
    path('matchmaking/random/', MatchmakingView.as_view(), name='random_matchmaking'),
    path('matchmaking/cancel/', MatchCancelView.as_view(), name='matchmaking_cancel'),
    path('matchmaking/invite/', InviteMatchView.as_view(), name='invite_match'),
    path('matchmaking/join/', JoinMatchView.as_view(), name='join_match'),
    path('matches/<int:match_id>/state/', MatchStateView.as_view(), name='match_state'),
    path('matches/<int:match_id>/answer/', MatchAnswerView.as_view(), name='match_answer'),
    path('matches/<int:match_id>/cancel/', MatchCancelView.as_view(), name='match_cancel'),

    # Survival
    path('survival/start/', SurvivalStartView.as_view(), name='survival_start'),
    path('survival/active/', SurvivalActiveView.as_view(), name='survival_active'),
    path('survival/<int:survival_id>/answer/', SurvivalAnswerView.as_view(), name='survival_answer'),

    # Weekly Quiz
    path('weekly-quiz/current/', WeeklyQuizCurrentView.as_view(), name='weekly_quiz_current'),
    path('weekly-quiz/start/', WeeklyQuizStartView.as_view(), name='weekly_quiz_start'),
    path('weekly-quiz/submit/', WeeklyQuizSubmitView.as_view(), name='weekly_quiz_submit'),
    path('weekly-quiz/attempts/<int:attempt_id>/', WeeklyQuizAttemptDetailView.as_view(), name='weekly_quiz_attempt_detail'),

    # General
    path('history/', GameHistoryView.as_view(), name='game_history'),
    path('leaderboard/', LeaderboardView.as_view(), name='game_leaderboard'),

    # Admin
    path('admin/stats/', AdminGameStatsView.as_view(), name='admin_game_stats'),
    path('admin/matches/', AdminGameMatchesView.as_view(), name='admin_game_matches'),
    path('admin/survival-games/', AdminSurvivalGamesView.as_view(), name='admin_survival_games'),
    path('admin/players/<int:player_id>/activity/', AdminPlayerGameActivityView.as_view(), name='admin_player_activity'),
] + router.urls

