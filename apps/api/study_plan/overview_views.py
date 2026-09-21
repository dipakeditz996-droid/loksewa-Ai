"""Study Plan page endpoints.

The page loads four of these in parallel (preparations, plan, progress, week),
so it fills in progressively and one slow or failing part never blanks the
rest. `plan` bundles the sections that share the same evidence (today's tasks,
weak topics, revision queue, recommendations, continue-learning); each part is
computed independently and reports its own error, so the page can show
"Weak topics - could not load - Retry" while Today's Plan works.

Every endpoint: authenticated student behind the package gate, own data only
(request.user), and only for a preparation (exam) the student is authorised
for - the `exam` query parameter is checked against
courses.access.authorized_exam_ids and refused (403) when it is not theirs.
"""
import logging

from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.permissions import HasActiveSubscription

from . import engine

log = logging.getLogger(__name__)


def _section(fn):
    """Run one part of a bundled response; a failure becomes {'error': ...}
    for that part alone."""
    try:
        return fn()
    except Exception:  # noqa: BLE001 - isolate the section, log the cause
        log.exception('Study plan section failed')
        return {'error': 'Could not load this section.'}


class PreparationView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveSubscription]
    need_since = False

    def preparation(self, request):
        from core.models import AdminSettings
        if not AdminSettings.is_study_plans_enabled():
            raise PermissionDenied('Study plans are currently disabled by the administrator.')
        try:
            return engine.resolve_preparation(
                request.user, request.query_params.get('exam'), need_since=self.need_since)
        except engine.PreparationDenied:
            raise PermissionDenied("You don't have access to this preparation.")

    @staticmethod
    def header(prep):
        return {'id': prep.exam.id, 'name': prep.exam.name, 'display_name': prep.display_name}


class PreparationsView(PreparationView):
    """The switcher and the student's targets."""

    def get(self, request):
        prep, exams = self.preparation(request)
        if prep is None:
            return Response({'has_preparation': False, 'preparations': [], 'selected': None, 'preferences': None})
        return Response({
            'has_preparation': True,
            'selected': prep.exam.id,
            'preparations': engine.preparation_choices(request.user, exams),
            'preferences': prep.preferences,
        })


class PlanView(PreparationView):
    """Today's plan and everything derived from the same evidence."""
    need_since = True

    def get(self, request):
        prep, _exams = self.preparation(request)
        if prep is None:
            return Response({'has_preparation': False})
        stats = engine.load_stats(prep)
        overall = engine.build_tree(stats)['overall']['percent']
        countdown, pace = engine.countdown_and_pace(prep, stats, overall)
        weak = _section(lambda: engine.weak_topics(prep, stats))
        weak_before = _section(lambda: engine.weak_topics(prep, engine.plan_stats(stats), with_repeated=False))
        revision = _section(lambda: engine.revision_queue(prep))
        mock = _section(lambda: engine.recommended_mock(prep))
        weak_ok = weak if 'error' not in weak else {'topics': []}
        weak_before_ok = weak_before if 'error' not in weak_before else {'topics': []}
        revision_ok = revision if 'error' not in revision else {'total': 0, 'due_today': 0, 'due_tomorrow': 0, 'later': 0}
        mock_ok = mock if not (isinstance(mock, dict) and 'error' in mock) else None
        today = _section(lambda: engine.today_plan(prep, stats, weak_before_ok, weak_ok, revision_ok, mock_ok, countdown))
        return Response({
            'has_preparation': True,
            'exam': self.header(prep),
            'preferences': prep.preferences,
            'has_content': any(t['has_content'] for t in stats['topics']),
            'today': today,
            'continue_learning': _section(lambda: engine.continue_learning(prep, stats)),
            'weak_topics': weak,
            'revision': revision,
            'recommendations': _section(lambda: {
                'practice': engine.recommended_practice(prep, engine.plan_stats(stats), weak_before_ok),
                'mock': mock_ok,
            }),
            'countdown': countdown,
            'pace': pace,
        })


class ProgressView(PreparationView):
    need_since = True

    def get(self, request):
        prep, _exams = self.preparation(request)
        if prep is None:
            return Response({'has_preparation': False})
        stats = engine.load_stats(prep)
        tree = engine.build_tree(stats)
        countdown, pace = engine.countdown_and_pace(prep, stats, tree['overall']['percent'])
        return Response({'has_preparation': True, 'exam': self.header(prep), **tree,
                         'countdown': countdown, 'pace': pace})


class WeekView(PreparationView):
    def get(self, request):
        prep, _exams = self.preparation(request)
        if prep is None:
            return Response({'has_preparation': False})
        return Response({'has_preparation': True, 'exam': self.header(prep), **engine.week_overview(prep)})


class PreferencesView(PreparationView):
    """The student's daily targets. Stored on their StudyPlan (one per
    student); the plan's exam is kept to an authorised one."""

    def patch(self, request):
        from .models import StudyPlan
        prep, _exams = self.preparation(request)
        if prep is None:
            raise PermissionDenied('Choose a course to create your study plan.')
        data, errors, fields = request.data, {}, {}
        if 'daily_minutes' in data:
            try:
                v = int(data['daily_minutes'])
                if not 10 <= v <= 720:
                    raise ValueError
                fields['daily_minutes'] = v
            except (TypeError, ValueError):
                errors['daily_minutes'] = 'Choose between 10 and 720 minutes.'
        if 'daily_questions' in data:
            try:
                v = int(data['daily_questions'])
                if not 5 <= v <= 300:
                    raise ValueError
                fields['daily_questions'] = v
            except (TypeError, ValueError):
                errors['daily_questions'] = 'Choose between 5 and 300 questions.'
        if 'study_days' in data:
            days = data['study_days']
            if not isinstance(days, list) or not days or any(d not in engine.WEEKDAYS for d in days):
                errors['study_days'] = 'Choose at least one day.'
            else:
                fields['study_days'] = [d for d in engine.WEEKDAYS if d in days]
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        plan = prep.plan
        if plan is None:
            plan = StudyPlan(student=request.user, exam=prep.exam, study_days=list(engine.WEEKDAYS))
        for k, v in fields.items():
            setattr(plan, k, v)
        plan.save()
        prep.plan = plan
        return Response(prep.preferences)
