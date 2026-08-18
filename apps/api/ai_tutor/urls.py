from django.urls import path
from .views import (
    ConversationListView, 
    ConversationDetailView, 
    MessageListView, 
    SendMessageView
)

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:conversation_id>/messages/', MessageListView.as_view(), name='message-list'),
    path('conversations/<int:conversation_id>/send/', SendMessageView.as_view(), name='send-message'),
]
