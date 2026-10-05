"""
Views for the Question Issue Report system.

Student endpoints  → /api/student/question-reports/
Admin endpoints    → /api/admin-api/question-reports/   (administration app urlconf)
"""
import logging

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from exams.models import QuestionIssueReport
from .issue_serializers import (
    AdminQuestionIssueReportDetailSerializer,
    AdminQuestionIssueReportListSerializer,
    AdminQuestionIssueReportPatchSerializer,
    StudentQuestionIssueReportCreateSerializer,
    StudentQuestionIssueReportListSerializer,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Student ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class StudentQuestionIssueReportViewSet(viewsets.GenericViewSet):
    """
    Student can:
      POST   /student/question-reports/          — submit a report
      GET    /student/question-reports/          — list own reports
      GET    /student/question-reports/{id}/     — retrieve own report detail
    """
    permission_classes = [IsAuthenticated]
    # Support multipart for evidence file upload.
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return (
            QuestionIssueReport.objects
            .filter(student=self.request.user)
            .select_related('question', 'question__subject', 'question__topic')
            .order_by('-created_at')
        )

    def list(self, request):
        qs = self.get_queryset()
        serializer = StudentQuestionIssueReportListSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = StudentQuestionIssueReportCreateSerializer(
            data=request.data, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        report = serializer.save()
        out = StudentQuestionIssueReportListSerializer(report)
        return Response(out.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        try:
            report = self.get_queryset().get(pk=pk)
        except QuestionIssueReport.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StudentQuestionIssueReportListSerializer(report)
        return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# Admin ViewSet  (registered under administration URLs)
# ─────────────────────────────────────────────────────────────────────────────

class AdminQuestionIssueReportViewSet(viewsets.GenericViewSet):
    """
    Admin can:
      GET    /admin-api/question-reports/        — paginated list with filters
      GET    /admin-api/question-reports/{id}/   — full detail
      PATCH  /admin-api/question-reports/{id}/   — change status / add admin note
    """

    def get_permissions(self):
        from administration.permissions import IsAdminUser
        return [IsAdminUser()]

    def get_queryset(self):
        qs = (
            QuestionIssueReport.objects
            .select_related(
                'question', 'question__subject', 'question__topic',
                'student', 'reviewed_by',
                'examination', 'examination_attempt',
            )
            .annotate(_reports_count=Count(
                'question__issue_reports',
                distinct=True,
            ))
            .order_by('-created_at')
        )

        params = self.request.query_params

        # Filter by status
        s = params.get('status')
        if s:
            qs = qs.filter(status=s)

        # Filter by issue_type
        it = params.get('issue_type')
        if it:
            qs = qs.filter(issue_type=it)

        # Filter by course via examination (best proxy available)
        course_id = params.get('course_id')
        if course_id:
            qs = qs.filter(examination__course_id=course_id)

        # Full-text search: question text, student name/email
        q = params.get('search', '').strip()
        if q:
            qs = qs.filter(
                Q(question__text__icontains=q)
                | Q(question__question_id__icontains=q)
                | Q(student__first_name__icontains=q)
                | Q(student__last_name__icontains=q)
                | Q(student__username__icontains=q)
                | Q(student__email__icontains=q)
            )

        return qs

    def list(self, request):
        qs = self.get_queryset()

        # Simple cursor-free pagination: page / page_size query params.
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        except (ValueError, TypeError):
            page, page_size = 1, 25

        total = qs.count()
        offset = (page - 1) * page_size
        page_qs = qs[offset: offset + page_size]

        serializer = AdminQuestionIssueReportListSerializer(
            page_qs, many=True, context={'request': request}
        )
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })

    def retrieve(self, request, pk=None):
        try:
            report = self.get_queryset().get(pk=pk)
        except QuestionIssueReport.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminQuestionIssueReportDetailSerializer(
            report, context={'request': request}
        )
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        try:
            report = self.get_queryset().get(pk=pk)
        except QuestionIssueReport.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminQuestionIssueReportPatchSerializer(
            report, data=request.data, partial=True, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        out = AdminQuestionIssueReportDetailSerializer(updated, context={'request': request})
        return Response(out.data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Quick counts per status — used by the admin dashboard badge."""
        qs = QuestionIssueReport.objects.values('status').annotate(count=Count('id'))
        return Response({row['status']: row['count'] for row in qs})
