"""Admin — Individual Student Performance Feedback.

Sent from Rankings & Leaderboards: a freeform note (text and/or a YouTube
video) an admin gives one specific student. Distinct from exams.Evaluation,
which is scored feedback tied to one subjective answer.

Reuses the existing core.Notification pipeline the Student Portal already
reads (see core/notification_service.py) so the student is actually told a
new feedback entry exists, rather than only living in a list they'd have to
think to check.
"""
import re

from django.core.paginator import Paginator
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Notification, StudentFeedback, User
from .models import AuditLog
from .permissions import IsAdminUser

# Accepts youtube.com/watch, youtu.be, youtube.com/shorts, embed links — the
# forms a student would actually paste from their browser or the app.
_YOUTUBE_HOST_RE = re.compile(
    r'^https?://(www\.|m\.)?(youtube\.com|youtu\.be)/', re.IGNORECASE
)


def _is_youtube_url(url):
    return bool(_YOUTUBE_HOST_RE.match(url.strip()))


def _serialize(feedback):
    return {
        'id': feedback.id,
        'message': feedback.message,
        'youtube_url': feedback.youtube_url,
        'given_by': (
            feedback.given_by.get_full_name() or feedback.given_by.username
        ) if feedback.given_by else None,
        'created_at': feedback.created_at.isoformat(),
    }


class AdminStudentFeedbackView(APIView):
    """GET/POST /api/admin/students/<student_id>/feedback/"""
    permission_classes = [IsAdminUser]

    def _get_student(self, student_id):
        return User.objects.get(pk=student_id, role='student')

    def get(self, request, student_id):
        try:
            student = self._get_student(student_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = StudentFeedback.objects.filter(student=student).select_related('given_by')

        try:
            page_size = min(max(int(request.query_params.get('page_size', 20)), 1), 100)
        except (TypeError, ValueError):
            page_size = 20
        try:
            page_number = max(int(request.query_params.get('page', 1)), 1)
        except (TypeError, ValueError):
            page_number = 1

        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_number)

        return Response({
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'results': [_serialize(f) for f in page.object_list],
        })

    def post(self, request, student_id):
        try:
            student = self._get_student(student_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        message = (request.data.get('message') or '').strip()
        youtube_url = (request.data.get('youtube_url') or '').strip()

        if not message and not youtube_url:
            return Response(
                {'error': 'Provide feedback text, a YouTube link, or both.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if youtube_url and not _is_youtube_url(youtube_url):
            return Response(
                {'error': 'That does not look like a valid YouTube link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feedback = StudentFeedback.objects.create(
            student=student,
            given_by=request.user,
            message=message,
            youtube_url=youtube_url,
        )

        notif_message = message or 'Your evaluator shared a new video for you.'
        Notification.objects.create(
            recipient=student,
            type='feedback',
            title='New Feedback From Admin',
            message=notif_message[:500],
            action_url='/student/feedback',
            priority='important',
        )

        AuditLog.objects.create(
            actor=request.user,
            action='STUDENT_FEEDBACK_SENT',
            entity_type='StudentFeedback',
            entity_id=str(feedback.id),
            details={'student_id': student.id, 'has_video': bool(youtube_url)},
        )

        return Response(_serialize(feedback), status=status.HTTP_201_CREATED)
