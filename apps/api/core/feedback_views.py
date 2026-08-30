from django.core.paginator import Paginator
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudentFeedback


class StudentFeedbackListView(APIView):
    """GET /api/student/feedback/ — the authenticated student's own feedback,
    newest first. Scoped strictly to request.user; there is no id parameter,
    so one student can never read another's feedback."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = StudentFeedback.objects.filter(student=request.user).select_related('given_by')

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

        results = [{
            'id': f.id,
            'message': f.message,
            'youtube_url': f.youtube_url,
            'given_by': (
                f.given_by.get_full_name() or f.given_by.username
            ) if f.given_by else None,
            'created_at': f.created_at.isoformat(),
        } for f in page.object_list]

        return Response({
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'results': results,
        })
