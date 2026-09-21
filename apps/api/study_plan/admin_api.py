"""Admin Study Plan monitoring endpoints (mounted under /api/admin/study-plan/).

    preparations/                     the course/preparation filter, with student counts
    overview/                         whole-scope numbers, revision/practice/exam analytics, exam dates
    students/                         the monitoring table (filter / search / order / paginate on the server)
    students/<id>/                    one student's status, warnings and activity
    students/<id>/<plan|progress|week>/   exactly what the student sees, via the student page's own code
    topics/                           syllabus / topic performance for one preparation

Admin and super-admin only (administration.permissions.IsAdminUser). Every number
is computed by study_plan.admin_analytics from the platform's real records.
"""
import datetime

from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.permissions import IsAdminUser

from . import admin_analytics as aa
from . import engine, overview_views

MAX_PAGE_SIZE = 100


def _int(request, name):
    raw = request.query_params.get(name)
    if raw in (None, '', 'all'):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise ValidationError({name: 'Must be a whole number.'})


def _date(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    try:
        return datetime.date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({name: 'Use YYYY-MM-DD.'})


def _choice(request, name, allowed):
    raw = request.query_params.get(name)
    if raw in (None, '', 'all'):
        return None
    if raw not in allowed:
        raise ValidationError({name: f'Must be one of: {", ".join(allowed)}.'})
    return raw


class AdminStudyPlanView(APIView):
    permission_classes = [IsAdminUser]


class PreparationsView(AdminStudyPlanView):
    """Filter options: every preparation that has students, with how many."""

    def get(self, request):
        exams = engine._active_exams()
        names = aa.display_names(exams)
        by_id = {e.id: e for e in exams}
        pairs = aa.load_roster(exams=exams)
        counts = {}
        for p in pairs:
            row = counts.setdefault(p['exam_id'], {'id': p['exam_id'], 'name': by_id[p['exam_id']].name,
                                                   'display_name': names[p['exam_id']], 'students': 0, 'courses': []})
            row['students'] += 1
            for c in p['courses']:
                if c not in row['courses']:
                    row['courses'].append(c)
        prep_rows = sorted(counts.values(), key=lambda r: (-r['students'], r['display_name']))
        return Response({'preparations': prep_rows, 'students': len(pairs)})


class OverviewView(AdminStudyPlanView):
    def get(self, request):
        exam = _int(request, 'exam')
        rows, bulk, exams = aa.compute_all(exam=exam, with_tasks=True)
        names = aa.display_names(exams)
        summary = aa.summarise(rows, bulk)
        summary['schedules'] = aa.schedule_overview(rows, bulk['exams'], names) if rows else []
        summary['rules'] = aa.rules()
        summary['exam'] = exam
        return Response(summary)


class StudentsView(AdminStudyPlanView):
    ORDERINGS = ('attention', 'name', 'progress', 'accuracy', 'activity')

    def get(self, request):
        exam = _int(request, 'exam')
        status = _choice(request, 'status', aa.STATUS_ORDER)
        activity = _choice(request, 'activity', ('active_recently', 'low_activity', 'no_recent_activity'))
        progress = _choice(request, 'progress', tuple(aa.PROGRESS_BUCKETS))
        ordering = request.query_params.get('ordering') or 'attention'
        if ordering.lstrip('-') not in self.ORDERINGS:
            raise ValidationError({'ordering': f'Must be one of: {", ".join(self.ORDERINGS)} (optionally prefixed with -).'})
        page = max(1, _int(request, 'page') or 1)
        page_size = min(MAX_PAGE_SIZE, max(1, _int(request, 'page_size') or 20))
        search = (request.query_params.get('search') or '').strip()[:100] or None

        rows, bulk, exams = aa.compute_all(exam=exam, search=search, with_tasks=True)
        rows = aa.apply_filters(rows, status=status, activity=activity, progress=progress,
                                active_from=_date(request, 'active_from'), active_to=_date(request, 'active_to'))
        rows = aa.order_rows(rows, ordering)
        total = len(rows)
        names = aa.display_names(exams)
        start = (page - 1) * page_size
        page_rows = []
        for r in rows[start:start + page_size]:
            out = aa.public_row(r)
            out['preparation'] = names.get(r['exam_id'])
            page_rows.append(out)
        return Response({'results': page_rows, 'total': total, 'page': page, 'page_size': page_size,
                         'total_pages': (total + page_size - 1) // page_size})


def _student_pairs(student_id):
    # The task list itself is served by the plan section (students/<id>/plan/), so the summary skips it.
    rows, bulk, exams = aa.compute_all(student_id=student_id)
    if not rows:
        raise NotFound('This student has no active course enrolment, so there is no study plan to show.')
    return rows, bulk, exams


class StudentDetailView(AdminStudyPlanView):
    def get(self, request, student_id):
        from django.db.models import BooleanField, Case, Exists, OuterRef, Q, Value, When
        from exams.models import ExaminationAttempt, Question, StudentAnswer

        rows, bulk, exams = _student_pairs(student_id)
        names = aa.display_names(exams)
        exam = _int(request, 'exam')
        chosen = next((r for r in rows if r['exam_id'] == exam), None) if exam else rows[0]
        if chosen is None:
            raise NotFound('This student is not enrolled in that preparation.')
        subjective_kind = Q(has_subjective=True) | Q(examination__exam_type='subjective')
        attempts = (
            ExaminationAttempt.objects.filter(student_id=student_id, status__in=('submitted', 'evaluated'),
                                              examination__exam_id__in=bulk['subtree'][chosen['exam_id']])
            .annotate(has_subjective=Exists(StudentAnswer.objects.filter(
                attempt=OuterRef('pk'), question__question_type__in=Question.SUBJECTIVE_TYPES)))
            .annotate(is_subjective=Case(When(subjective_kind, then=Value(True)), default=Value(False),
                                         output_field=BooleanField()))
            .select_related('examination').order_by('-submitted_at')[:5]
        )
        preparations = [{'id': r['exam_id'], 'display_name': names[r['exam_id']], 'course': r['course'],
                         'status': r['status'], 'status_label': r['status_label']} for r in rows]
        detail = aa.public_row(chosen)
        detail['preparation'] = names[chosen['exam_id']]
        # Objective attempts are scored on submission; subjective ones only once graded.
        detail['recent_exams'] = [{
            'id': a.id, 'title': a.examination.title, 'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
            'kind': 'subjective' if a.is_subjective else 'objective',
            'state': ('scored' if not a.is_subjective else 'evaluated' if a.status == 'evaluated' else 'awaiting_evaluation'),
            'percentage': None if (a.is_subjective and a.status != 'evaluated') else round(a.percentage),
            'passed': None if a.is_subjective else a.passed,
        } for a in attempts]
        detail['joined'] = chosen['student']['joined']
        return Response({'student': chosen['student'], 'selected': chosen['exam_id'], 'preparations': preparations,
                         'detail': detail, 'rules': {'warnings': aa.rules()['warnings'], 'weak_topic': aa.rules()['weak_topic']}})


class StudentSectionView(AdminStudyPlanView):
    """The student's own plan / progress / week, built by the very code the
    student's page uses, for the preparation the student is enrolled in."""
    builders = {
        'plan': (overview_views.plan_payload, True),
        'progress': (overview_views.progress_payload, True),
        'week': (overview_views.week_payload, False),
    }

    def get(self, request, student_id, section):
        from core.models import User

        if section not in self.builders:
            raise NotFound('Unknown section.')
        builder, need_since = self.builders[section]
        rows = aa.load_roster(student_id=student_id)
        if not rows:
            raise NotFound('This student has no active course enrolment, so there is no study plan to show.')
        exam = _int(request, 'exam') or rows[0]['exam_id']
        if exam not in {r['exam_id'] for r in rows}:
            raise NotFound('This student is not enrolled in that preparation.')
        user = User.objects.get(pk=student_id)
        try:
            prep, _exams = engine.resolve_preparation(user, str(exam), need_since=need_since)
        except engine.PreparationDenied:
            raise NotFound('This student is not authorised for that preparation.')
        if prep is None:
            raise NotFound('No preparation.')
        return Response(builder(prep))


class TopicsView(AdminStudyPlanView):
    def get(self, request):
        exam = _int(request, 'exam')
        if not exam:
            raise ValidationError({'exam': 'Choose a preparation to see its syllabus performance.'})
        rows, bulk, _exams = aa.compute_all(exam=exam)
        if not rows:
            return Response({'students': 0, 'subjects': [], 'strong': [], 'needs_improvement': [], 'rule': aa.rules()['topic']})
        return Response(aa.topic_analytics(rows, bulk, exam))
