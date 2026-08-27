"""Admin Ranking & Leaderboard.

Reads the platform's existing canonical sources — no new ranking models:

    XP / level / streak   GamificationProfile
    dated XP              XPTransaction
    exam performance      ExaminationAttempt
    course membership     Enrollment
    identity              User

Ranking and aggregation are done by the database. Rank is derived from the
page offset over a fully deterministic ORDER BY, so it is stable across pages
and never computed in the browser.
"""
from django.core.paginator import Paginator
from django.db.models import Avg, Count, F, Max, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import User
from exams.models import ExaminationAttempt
from gamification.models import GamificationProfile, XPTransaction
from .permissions import IsAdminUser

CATEGORIES = ('overall', 'exam', 'streak')
PERIODS = ('all', 'monthly', 'weekly')


def _period_start(period):
    """Start of the window, or None for all-time."""
    if period == 'weekly':
        return timezone.now() - timedelta(days=7)
    if period == 'monthly':
        return timezone.now() - timedelta(days=30)
    return None


class AdminLeaderboardView(APIView):
    """GET /api/admin/gamification/leaderboard/

    Query params:
        category   overall | exam | streak      (default: overall)
        period     all | monthly | weekly       (default: all)
        search     matches username, email, first/last name
        course_id  restrict to students actively enrolled in that course
        page, page_size
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        category = (request.query_params.get('category') or 'overall').lower()
        if category not in CATEGORIES:
            return Response(
                {'error': f"Unsupported category '{category}'. Use one of: {', '.join(CATEGORIES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period = (request.query_params.get('period') or 'all').lower()
        if period not in PERIODS:
            return Response(
                {'error': f"Unsupported period '{period}'. Use one of: {', '.join(PERIODS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # A streak is a single current value, not something that can be
        # recomputed for a past window — say so rather than inventing a number.
        if category == 'streak' and period != 'all':
            return Response(
                {'error': "The streak ranking only supports period=all; a streak has no historical window."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        since = _period_start(period)

        qs = User.objects.filter(role='student').select_related('gamification_profile')

        course_id = request.query_params.get('course_id')
        if course_id:
            try:
                course_id = int(course_id)
            except (TypeError, ValueError):
                return Response({'error': 'course_id must be a number.'},
                                status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(enrollments__course_id=course_id, enrollments__status='active')

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        # ── Annotations, all computed in SQL ──────────────────────────────────
        attempt_filter = Q(examination_attempts__status__in=['submitted', 'evaluated'])
        if since:
            attempt_filter &= Q(examination_attempts__submitted_at__gte=since)

        qs = qs.annotate(
            exams_completed=Count('examination_attempts', filter=attempt_filter, distinct=True),
            average_score=Coalesce(
                Avg('examination_attempts__percentage', filter=attempt_filter),
                Value(0.0),
            ),
            best_score=Coalesce(
                Max('examination_attempts__percentage', filter=attempt_filter),
                Value(0.0),
            ),
        )

        if since:
            # Period XP is the sum of transactions inside the window — real
            # dated data, not a proportion of the lifetime total.
            qs = qs.annotate(
                ranking_xp=Coalesce(
                    Sum('xp_transactions__amount',
                        filter=Q(xp_transactions__created_at__gte=since)),
                    Value(0),
                )
            )
        else:
            qs = qs.annotate(
                ranking_xp=Coalesce(F('gamification_profile__xp'), Value(0))
            )

        qs = qs.annotate(
            profile_level=Coalesce(F('gamification_profile__level'), Value(1)),
            current_streak=Coalesce(F('gamification_profile__study_current_streak'), Value(0)),
        )

        # ── Deterministic ordering; rank follows from position ────────────────
        # Tie-break chain is explicit so two runs never disagree.
        if category == 'exam':
            order = ('-average_score', '-exams_completed', '-ranking_xp', 'id')
        elif category == 'streak':
            order = ('-current_streak', '-ranking_xp', '-average_score', 'id')
        else:
            order = ('-ranking_xp', '-average_score', '-exams_completed', 'id')
        qs = qs.order_by(*order).distinct()

        # ── Summary over the whole filtered set, not just this page ───────────
        # Postgres cannot aggregate over an alias that is itself an aggregate
        # (AVG(AVG(...))), so each figure is computed directly against the base
        # tables, scoped to the same students by subquery. Still a fixed number
        # of queries regardless of how many students match.
        student_ids = qs.values('id')

        total_students = qs.count()

        if since:
            xp_rows = XPTransaction.objects.filter(
                user_id__in=student_ids, created_at__gte=since
            ).values('user_id').annotate(total=Sum('amount')).values_list('total', flat=True)
            xp_values = list(xp_rows)
            # Students with no transactions in the window count as 0 XP.
            xp_values += [0] * max(0, total_students - len(xp_values))
        else:
            profile_rows = GamificationProfile.objects.filter(
                user_id__in=student_ids
            ).values_list('xp', flat=True)
            xp_values = list(profile_rows)
            xp_values += [0] * max(0, total_students - len(xp_values))

        top_xp = max(xp_values) if xp_values else 0
        average_xp = (sum(xp_values) / len(xp_values)) if xp_values else 0.0

        score_filter = {'student_id__in': student_ids,
                        'status__in': ['submitted', 'evaluated']}
        if since:
            score_filter['submitted_at__gte'] = since
        average_score = ExaminationAttempt.objects.filter(**score_filter).aggregate(
            value=Coalesce(Avg('percentage'), Value(0.0))
        )['value']

        # "Active" means the student has actually done something measurable.
        active_students = qs.filter(
            Q(current_streak__gt=0) | Q(exams_completed__gt=0)
        ).count()

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
        offset = (page.number - 1) * page_size

        results = []
        for index, user in enumerate(page.object_list):
            results.append({
                'rank': offset + index + 1,
                'student': {
                    'id': user.id,
                    'name': user.get_full_name() or user.username,
                    'username': user.username,
                    'email': user.email,
                    'avatar': user.avatar,
                },
                'xp': user.ranking_xp,
                'level': user.profile_level,
                'streak': user.current_streak,
                'exams_completed': user.exams_completed,
                'average_score': round(user.average_score or 0, 2),
                'best_score': round(user.best_score or 0, 2),
            })

        return Response({
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'category': category,
            'period': period,
            'summary': {
                'total_students': total_students,
                'top_xp': top_xp,
                'average_xp': round(average_xp or 0, 2),
                'average_score': round(average_score or 0, 2),
                'active_students': active_students,
            },
            'results': results,
        })
