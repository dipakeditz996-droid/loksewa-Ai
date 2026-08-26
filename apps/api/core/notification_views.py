from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.utils import timezone
from .models import Notification
from support.models import NotificationPreference
from .notification_serializers import NotificationSerializer, TeacherNotificationPreferenceSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = Notification.objects.filter(recipient=request.user)
        
        # Filtering
        filter_type = request.query_params.get('type')
        if filter_type:
            queryset = queryset.filter(type=filter_type)
            
        filter_unread = request.query_params.get('unread')
        if filter_unread == 'true':
            queryset = queryset.filter(is_read=False)
            
        filter_priority = request.query_params.get('priority')
        if filter_priority:
            queryset = queryset.filter(priority=filter_priority)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = NotificationSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        serializer = NotificationSerializer(queryset, many=True)
        return Response(serializer.data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        latest = Notification.objects.filter(recipient=request.user).order_by('-created_at')[:5]
        serializer = NotificationSerializer(latest, many=True)
        return Response({
            'unread_count': unread_count,
            'latest': serializer.data
        })


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response(status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, 
            read_at=timezone.now()
        )
        return Response(status=status.HTTP_200_OK)


class TeacherNotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = TeacherNotificationPreferenceSerializer(prefs)
        return Response(serializer.data)
        
    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = TeacherNotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
