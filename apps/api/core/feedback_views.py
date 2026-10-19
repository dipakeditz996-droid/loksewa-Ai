from datetime import timedelta
from django.core.cache import cache
from django.core.paginator import Paginator
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, StudentFeedback, User


class StudentFeedbackListView(APIView):
    """
    GET /api/student/feedback/ — the authenticated student's own feedback notes
    (from teachers/evaluators or submitted by the student), newest first.
    
    POST /api/student/feedback/ — submit a student feedback note, request, or inquiry
    to teachers and evaluators. Includes duplicate submission protection, validation,
    and automatic staff notification.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            page_size = min(max(int(request.query_params.get('page_size', 20)), 1), 100)
        except (TypeError, ValueError):
            page_size = 20
        try:
            page_number = max(int(request.query_params.get('page', 1)), 1)
        except (TypeError, ValueError):
            page_number = 1

        cache_key = f"std_feedback:{request.user.id}:p{page_number}_s{page_size}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        qs = StudentFeedback.objects.filter(student=request.user).select_related('given_by')
        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_number)

        results = []
        for f in page.object_list:
            is_from_student = bool(f.given_by_id and f.given_by_id == request.user.id)
            given_by_name = None
            if f.given_by:
                given_by_name = (
                    "You" if is_from_student else (f.given_by.get_full_name() or f.given_by.username)
                )

            results.append({
                'id': f.id,
                'message': f.message,
                'youtube_url': f.youtube_url,
                'given_by': given_by_name,
                'is_from_student': is_from_student,
                'created_at': f.created_at.isoformat(),
            })

        response_data = {
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'results': results,
        }

        # Cache for 60 seconds
        try:
            cache.set(cache_key, response_data, 60)
        except Exception:
            pass

        return Response(response_data)

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response(
                {'error': 'Please provide a feedback message.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(message) < 5:
            return Response(
                {'error': 'Feedback message must be at least 5 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(message) > 2500:
            return Response(
                {'error': 'Feedback message cannot exceed 2500 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Accidental duplicate submission protection (within 60 seconds)
        cutoff = timezone.now() - timedelta(seconds=60)
        if StudentFeedback.objects.filter(student=request.user, message=message, created_at__gte=cutoff).exists():
            return Response(
                {'error': 'You have already submitted this feedback note recently. Please wait a moment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        feedback = StudentFeedback.objects.create(
            student=request.user,
            given_by=request.user,
            message=message,
            youtube_url='',
        )

        # Clear cached pages for this student
        for p in range(1, 5):
            cache.delete(f"std_feedback:{request.user.id}:p{p}_s20")

        # Notify administrator / evaluators
        try:
            admins = list(User.objects.filter(role__in=['admin', 'superadmin'], is_active=True)[:3])
            sender_name = request.user.get_full_name() or request.user.username
            for adm in admins:
                Notification.objects.create(
                    recipient=adm,
                    type='feedback',
                    title=f'New Student Feedback from {sender_name}',
                    message=message[:400],
                    action_url=f'/admin/students/{request.user.id}',
                    priority='normal',
                )
        except Exception:
            pass

        serialized = {
            'id': feedback.id,
            'message': feedback.message,
            'youtube_url': feedback.youtube_url,
            'given_by': "You",
            'is_from_student': True,
            'created_at': feedback.created_at.isoformat(),
        }

        return Response(serialized, status=status.HTTP_201_CREATED)
