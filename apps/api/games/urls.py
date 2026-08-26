from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    MatchmakingView,
    InviteMatchView,
    JoinMatchView,
    MatchStateView,
    MatchAnswerView,
    SurvivalStartView,
    SurvivalAnswerView,
    GameHistoryView,
    LeaderboardView,
    AdminGameMatchesView,
    AdminSurvivalGamesView
)

router = DefaultRouter()

urlpatterns = [
    # 1v1
    path('matchmaking/random/', MatchmakingView.as_view(), name='random_matchmaking'),
    path('matchmaking/invite/', InviteMatchView.as_view(), name='invite_match'),
    path('matchmaking/join/', JoinMatchView.as_view(), name='join_match'),
    path('matches/<int:match_id>/state/', MatchStateView.as_view(), name='match_state'),
    path('matches/<int:match_id>/answer/', MatchAnswerView.as_view(), name='match_answer'),

    # Survival
    path('survival/start/', SurvivalStartView.as_view(), name='survival_start'),
    path('survival/<int:survival_id>/answer/', SurvivalAnswerView.as_view(), name='survival_answer'),

    # General
    path('history/', GameHistoryView.as_view(), name='game_history'),
    path('leaderboard/', LeaderboardView.as_view(), name='game_leaderboard'),

    # Admin
    path('admin/matches/', AdminGameMatchesView.as_view(), name='admin_game_matches'),
    path('admin/survival-games/', AdminSurvivalGamesView.as_view(), name='admin_survival_games'),
] + router.urls
