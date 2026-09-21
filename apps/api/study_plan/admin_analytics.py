"""Admin Study Plan monitoring: how the Study Plan system is doing across
students, courses and the syllabus - computed from the same real records, with
the same rules, as the student's own Study Plan page.

Nothing here is stored. The student page computes one student at a time
(`engine.load_stats` and friends); an admin needs every student at once, so this
module runs the same evidence queries GROUPED BY STUDENT (about fifteen queries
for any number of students - never per student) and then applies the very same
pure functions the student page uses:

  engine.topic_state       a topic's progress            (one definition)
  engine.overall_percent   overall syllabus progress     (one definition)
  engine.countdown_and_pace  exam date and On Track / Slightly Behind / Needs
                           Attention against the admin's ExamSchedule
  QuestionMastery.last_due_review_at  revision completion (due AND reviewed)

`test_admin_analytics.py` proves the two paths agree for the same student.

Who is in scope: a (student, preparation) pair exists when the student holds an
ACTIVE, unexpired Enrollment in a PUBLISHED course that has an exam - exactly the
purchase-backed part of courses.access.authorized_exam_ids. Students without one
have no Study Plan to monitor.
"""
import datetime
from collections import defaultdict
from types import SimpleNamespace

from django.core.exceptions import EmptyResultSet
from django.db import connection
from django.db.models import Count, Exists, F, Max, Min, OuterRef, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from . import engine
from .engine import NEPAL, day_bounds, local_today

# ---- rules (also returned to the admin UI so every label is explainable) -----
LOW_ACTIVITY_DAYS = 7          # last activity within this many days -> "Active recently"
INACTIVE_DAYS = 14             # no activity for this many days -> "Inactive"
MIN_ATTEMPTS_FOR_ACCURACY = 20   # answers needed before low accuracy is a flag
OVERDUE_REVISION_MIN = 10      # overdue revision questions that trigger a flag
FAILED_EXAMS_MIN = 2           # failed mock exams that trigger a flag
MIN_TOPIC_ATTEMPTS = 10        # answers needed before a topic gets an accuracy
STRONG_ACCURACY = 75           # topic accuracy at or above this is "strong"
RARELY_STUDIED_SHARE = 25      # <25% of students started the topic -> "rarely studied"

STATUS_ORDER = ['inactive', 'needs_attention', 'slightly_behind', 'on_track', 'no_schedule']
STATUS_LABELS = {
    'on_track': 'On Track', 'slightly_behind': 'Slightly Behind', 'needs_attention': 'Needs Attention',
    'inactive': 'Inactive', 'no_schedule': 'No pace data',
}
PRACTICE_MODES = ('study', 'revision', 'daily')


def rules():
    return {
        'status': [
            f'Inactive: no activity for {INACTIVE_DAYS} days (or none since enrolling {INACTIVE_DAYS} days ago).',
            'Needs Attention: any warning below, or more than '
            f'{engine.SLIGHTLY_BEHIND_TOLERANCE} points behind the expected pace.',
            f'Slightly Behind: {engine.ON_TRACK_TOLERANCE + 1}-{engine.SLIGHTLY_BEHIND_TOLERANCE} points behind the expected pace.',
            f'On Track: at most {engine.ON_TRACK_TOLERANCE} points behind the expected pace.',
            'No pace data: no published exam date applies to the course ("No exam date"), or the syllabus has no content yet ("Pace not measurable").',
        ],
        'pace': ('Expected progress = share of the preparation window (enrolment to the scheduled exam date) that '
                 'has passed. Actual progress = the same syllabus progress the student sees.'),
        'warnings': [
            f'Inactive for {INACTIVE_DAYS}+ days.',
            f'Behind pace by more than {engine.SLIGHTLY_BEHIND_TOLERANCE} points.',
            f'Practice accuracy below {engine.WEAK_TOPIC_ACCURACY_THRESHOLD}% over at least {MIN_ATTEMPTS_FOR_ACCURACY} answers.',
            f'{OVERDUE_REVISION_MIN}+ revision questions overdue (due before today, not yet reviewed).',
            f'{FAILED_EXAMS_MIN}+ failed scored (objective) mock exams.',
        ],
        'activity': (f'Active recently: activity within {LOW_ACTIVITY_DAYS} days. Low activity: {LOW_ACTIVITY_DAYS + 1}-'
                     f'{INACTIVE_DAYS} days. No recent activity: more than {INACTIVE_DAYS} days or none yet.'),
        'topic': (f'A topic gets an accuracy only after {MIN_TOPIC_ATTEMPTS} answers across the selected students. '
                  f'Strong: {STRONG_ACCURACY}% or more. Weak: below {engine.WEAK_TOPIC_ACCURACY_THRESHOLD}%. Rarely studied: '
                  f'started by fewer than {RARELY_STUDIED_SHARE}% of students.'),
        'daily_target': "A student meets today's target when the questions answered today (practice and mock exams) reach their daily question target.",
        'revision': ('Due today = questions whose review date is today or earlier that were reviewed today or are still '
                     'waiting. Completed = questions that were due and answered today. Answering a question that was not '
                     'due is practice, not revision. Overdue = due before today and not yet reviewed.'),
        'recommendations': [
            'Practice: the student\'s weakest topic (below the weak-topic accuracy after enough answers), else the least-covered topic.',
            'Revision: questions whose review date has arrived (spaced repetition).',
            'Study: notes for topics that have published notes and are not finished.',
            f'Mock exam: a published, authorised mock is suggested once the exam is {engine.MOCK_WINDOW_DAYS} days away.',
        ],
        'recommendation_events': 'Recommendation engagement data is not available yet.',
        'recommendation_events_detail': ('Recommendations are computed when a student opens the Study Plan and no view or '
                                         'click is recorded, so nothing about how often they are shown or followed can be '
                                         'reported. The platform has no event-tracking model to reuse.'),
        'weak_topic': (f'Weak topic: at least {engine.WEAK_TOPIC_MIN_ANSWERED} answers (practice and mock exams) and '
                       f'below {engine.WEAK_TOPIC_ACCURACY_THRESHOLD}% correct.'),
        'tasks': ("Today's tasks are built for each student by the Study Plan rules (weak-topic practice, revision, "
                  'notes, top-up practice, a mock exam close to the exam date) and completed by real activity today. '
                  'The counts here are the same tasks the student sees.'),
        'exams': ('Objective mock exams are scored on submission. A mock containing subjective answers, and subjective '
                  'exams, wait for a grader: they count as awaiting evaluation and never as passed or failed.'),
        'task_types': ['Study', 'Practice', 'Revision', 'Mock Exam'],
        'defaults': {'daily_minutes': 60, 'daily_questions': 20, 'max_tasks_per_day': engine.MAX_TASKS,
                     'study_days': engine.WEEKDAYS},
    }


# --------------------------------------------------------------------------
# Roster: which (student, preparation) pairs exist
# --------------------------------------------------------------------------
def display_names(exams):
    from collections import Counter

    from exams.serializers import ExamSerializer
    dupes = {n for n, c in Counter(e.name for e in exams).items() if c > 1}
    namer = ExamSerializer(context={'duplicate_exam_names': dupes})
    return {e.id: namer.get_display_name(e) for e in exams}


def _subtrees(exams):
    children = defaultdict(list)
    for e in exams:
        children[e.parent_id].append(e.id)
    out = {}
    for e in exams:
        ids, stack = set(), [e.id]
        while stack:
            node = stack.pop()
            if node not in ids:
                ids.add(node)
                stack.extend(children.get(node, []))
        out[e.id] = ids
    return out


def load_roster(exam=None, search=None, student_id=None, exams=None):
    """[{'user', 'exam_id', 'courses', 'enrolled_at'}], one per (student, preparation)."""
    exams = exams if exams is not None else engine._active_exams()
    live = {e.id for e in exams if e.status == 'active'}
    qs = (
        active_enrollments_all()
        .filter(course__status='published', course__exam_id__in=live, student__role='student', student__is_active=True)
        .select_related('student', 'course')
    )
    if exam:
        qs = qs.filter(course__exam_id=exam)
    if student_id:
        qs = qs.filter(student_id=student_id)
    if search:
        qs = qs.filter(
            Q(student__username__icontains=search) | Q(student__email__icontains=search)
            | Q(student__first_name__icontains=search) | Q(student__last_name__icontains=search)
        )
    pairs = {}
    for e in qs.order_by('enrolled_at', 'id'):
        key = (e.student_id, e.course.exam_id)
        p = pairs.get(key)
        if p is None:
            pairs[key] = {'user': e.student, 'exam_id': e.course.exam_id, 'courses': [e.course.title],
                          'enrolled_at': e.enrolled_at}
        else:
            if e.course.title not in p['courses']:
                p['courses'].append(e.course.title)
            if e.enrolled_at < p['enrolled_at']:
                p['enrolled_at'] = e.enrolled_at
    return list(pairs.values())


def active_enrollments_all():
    """Every student's live enrollments (courses.access.active_enrollments, without the per-user filter)."""
    from courses.models import Enrollment
    now = timezone.now()
    return Enrollment.objects.filter(status='active').filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))


# --------------------------------------------------------------------------
# Bulk evidence, grouped by student
# --------------------------------------------------------------------------
def _distinct_answered(practice_qs, exam_qs):
    """{(user, topic): number of DIFFERENT questions answered in practice or
    mock exams} - a question answered in both counts once, as on the student page."""
    p = practice_qs.order_by().values(u=F('session__user_id'), t=F('question__topic_id'), q=F('question_id'))
    e = exam_qs.order_by().values(u=F('attempt__student_id'), t=F('question__topic_id'), q=F('question_id'))
    parts, params = [], []
    for qs in (p, e):
        try:
            sql, sql_params = qs.query.sql_with_params()
        except EmptyResultSet:            # nothing can match on this side (e.g. no topics)
            continue
        parts.append(sql)
        params += list(sql_params)
    if not parts:
        return {}
    sql = f'SELECT u, t, COUNT(*) FROM ({" UNION ".join(parts)}) AS answered GROUP BY u, t'
    with connection.cursor() as cur:
        cur.execute(sql, params)
        return {(u, t): n for u, t, n in cur.fetchall()}


def load_bulk(pairs, exams, with_tasks=False):
    """Everything the metrics need for every pair, in a fixed number of queries.
    `with_tasks` adds the few extra queries needed to work out each student's
    task list for today (see compute_tasks)."""
    from exams.models import (ExamSchedule, Examination, ExaminationAttempt, PracticeSession, Question, QuestionAttempt,
                              QuestionMastery, StudentAnswer, SubjectiveAnswer, SubjectiveAttempt, Topic,
                              UserTopicProgress)
    from exams.selection_service import QuestionSelectionService
    from gamification.models import GamificationProfile
    from notes.models import StudentMaterialProgress, StudyMaterial
    from .models import StudyPlan

    today = local_today()
    today_start, tomorrow_start = day_bounds(today)
    by_id = {e.id: e for e in exams}
    subtree = _subtrees(exams)
    roots = {p['exam_id'] for p in pairs}
    user_ids = {p['user'].id for p in pairs}
    all_exam_ids = set().union(*(subtree[r] for r in roots)) if roots else set()
    bulk = {'today': today, 'today_start': today_start, 'subtree': {r: subtree[r] for r in roots}, 'exams': by_id,
            'with_tasks': with_tasks, 'now': timezone.now()}
    if not pairs:
        bulk.update(topics={}, topics_by_root={}, avail={}, agg={}, distinct={}, distinct_b={}, mats={}, mprog={},
                    mprog_b={}, explicit={}, user_courses={}, revision={}, exam_att={}, subj_sets={}, sessions={},
                    plans={}, streaks={}, today_q={}, practice_today={}, touched_today=set(), finished_today={},
                    mock_candidates=[], mock_attempts={}, schedules=[])
        return bulk

    trows = list(
        Topic.objects.filter(chapter__subject__paper__exam_id__in=all_exam_ids)
        .order_by('chapter__subject__paper__paper_number', 'chapter__subject_id', 'chapter_id', 'id')
        .values('id', 'name', 'chapter_id', 'chapter__title', 'chapter__subject_id', 'chapter__subject__name',
                'chapter__subject__paper__exam_id')
    )
    topics = {r['id']: r for r in trows}
    topic_ids = list(topics)
    topics_by_root = {r: [t['id'] for t in trows if t['chapter__subject__paper__exam_id'] in subtree[r]] for r in roots}
    bulk['topics'], bulk['topics_by_root'] = topics, topics_by_root

    svc = QuestionSelectionService()
    pool = svc.apply_filters(svc.get_base_queryset(), exam_ids=list(all_exam_ids), question_type='objective').order_by()
    bulk['avail'] = dict(pool.values_list('topic_id').annotate(n=Count('id', distinct=True)))

    practice_qs = (
        QuestionAttempt.objects.filter(session__user_id__in=user_ids, question__topic_id__in=topic_ids,
                                       selected_option__isnull=False)
        .exclude(selected_option='')
        .filter(Q(session__mode__in=PRACTICE_MODES) | Q(session__completed=True))
        .annotate(at=Coalesce('viewed_at', 'session__created_at'))
    )
    exam_qs = (
        StudentAnswer.objects.filter(attempt__student_id__in=user_ids, attempt__status__in=('submitted', 'evaluated'),
                                     question__topic_id__in=topic_ids, selected_option__isnull=False)
        .exclude(selected_option='')
    )
    agg = defaultdict(lambda: {'p_n': 0, 'p_ok': 0, 'p_nb': 0, 'p_okb': 0, 'e_n': 0, 'e_ok': 0, 'e_nb': 0, 'e_okb': 0,
                               'last': None, 'last_b': None, 'first': None, 'e_today': 0})

    def stamp(a, last, last_b, first):
        a['last'] = _later(a['last'], last)
        a['last_b'] = _later(a['last_b'], last_b)
        if first and (a['first'] is None or first < a['first']):
            a['first'] = first

    for r in practice_qs.order_by().values('session__user_id', 'question__topic_id').annotate(
            n=Count('id'), ok=Count('id', filter=Q(is_correct=True)),
            nb=Count('id', filter=Q(at__lt=today_start)), okb=Count('id', filter=Q(is_correct=True, at__lt=today_start)),
            last=Max('at'), last_b=Max('at', filter=Q(at__lt=today_start)), first=Min('at')):
        a = agg[(r['session__user_id'], r['question__topic_id'])]
        a['p_n'] += r['n']
        a['p_ok'] += r['ok']
        a['p_nb'] += r['nb']
        a['p_okb'] += r['okb']
        stamp(a, r['last'], r['last_b'], r['first'])
    sub_at = 'attempt__submitted_at'
    before = Q(**{f'{sub_at}__lt': today_start})
    for r in exam_qs.order_by().values('attempt__student_id', 'question__topic_id').annotate(
            n=Count('id'), ok=Count('id', filter=Q(is_correct=True)),
            nb=Count('id', filter=before), okb=Count('id', filter=Q(is_correct=True) & before),
            today=Count('id', filter=Q(**{f'{sub_at}__gte': today_start, f'{sub_at}__lt': tomorrow_start})),
            last=Max(sub_at), last_b=Max(sub_at, filter=before), first=Min(sub_at)):
        a = agg[(r['attempt__student_id'], r['question__topic_id'])]
        a['e_n'] += r['n']
        a['e_ok'] += r['ok']
        a['e_nb'] += r['nb']
        a['e_okb'] += r['okb']
        a['e_today'] += r['today']
        stamp(a, r['last'], r['last_b'], r['first'])
    bulk['agg'] = dict(agg)
    bulk['distinct'] = _distinct_answered(practice_qs, exam_qs)

    # Practice answers given today, counted the way the student's week view counts them (no mode filter).
    practice_today = defaultdict(int)
    for r in (QuestionAttempt.objects.filter(session__user_id__in=user_ids, question__topic_id__in=topic_ids,
                                             selected_option__isnull=False).exclude(selected_option='')
              .annotate(at=Coalesce('viewed_at', 'session__created_at'))
              .filter(at__gte=today_start, at__lt=tomorrow_start)
              .order_by().values('session__user_id', 'question__topic_id').annotate(n=Count('id'))):
        practice_today[(r['session__user_id'], r['question__topic_id'])] += r['n']
    bulk['practice_today'] = dict(practice_today)
    today_q = defaultdict(int, practice_today)
    for k, v in agg.items():
        if v['e_today']:
            today_q[k] += v['e_today']
    bulk['today_q'] = dict(today_q)

    user_courses = defaultdict(set)
    for uid, cid in active_enrollments_all().filter(student_id__in=user_ids).values_list('student_id', 'course_id'):
        user_courses[uid].add(cid)
    bulk['user_courses'] = user_courses
    mats = defaultdict(dict)                    # topic -> {course_id | None: (count, first material id)}
    for r in (StudyMaterial.objects.filter(status='published', exam_id__in=all_exam_ids, topic_id__in=topic_ids)
              .order_by().values('topic_id', 'course_id').annotate(total=Count('id'), first_id=Min('id'))):
        mats[r['topic_id']][r['course_id']] = (r['total'], r['first_id'])
    bulk['mats'] = mats

    def material_progress(only_before):
        qs = StudentMaterialProgress.objects.filter(
            student_id__in=user_ids, material__status='published', material__exam_id__in=all_exam_ids,
            material__topic_id__in=topic_ids)
        if only_before:
            qs = qs.filter(last_viewed_at__lt=today_start)
        return {(r['student_id'], r['material__topic_id'], r['material__course_id']):
                {'touched': r['touched'], 'sum': r['total'] or 0, 'last': r['last']}
                for r in qs.order_by().values('student_id', 'material__topic_id', 'material__course_id')
                .annotate(touched=Count('material_id', distinct=True), total=Sum('progress'), last=Max('last_viewed_at'))}

    bulk['mprog'] = material_progress(False)
    bulk['explicit'] = {
        (p.user_id, p.topic_id): p for p in UserTopicProgress.objects.filter(user_id__in=user_ids, topic_id__in=topic_ids)
    }

    rev_pool = pool.values('id')
    revision = defaultdict(lambda: defaultdict(int))     # (user, exam) -> counts
    for r in (QuestionMastery.objects.filter(user_id__in=user_ids, question_id__in=rev_pool, times_answered__gt=0,
                                             next_review_at__isnull=False)
              .order_by().values('user_id', 'question__topic__chapter__subject__paper__exam_id')
              .annotate(total=Count('id'),
                        due_today=Count('id', filter=Q(next_review_at__lt=tomorrow_start)),
                        overdue=Count('id', filter=Q(next_review_at__lt=today_start)),
                        reviewed=Count('id', filter=Q(last_due_review_at__gte=today_start,
                                                      last_due_review_at__lt=tomorrow_start)))):
        d = revision[(r['user_id'], r['question__topic__chapter__subject__paper__exam_id'])]
        for k in ('total', 'due_today', 'overdue', 'reviewed'):
            d[k] += r[k]
    bulk['revision'] = revision

    # Mock exams. A mock is "scored" the moment it is submitted unless it contains subjective
    # answers - those wait for a human grader (status stays 'submitted' until every one is graded),
    # so they are reported as awaiting evaluation, never as passed/failed.
    subj_answers = StudentAnswer.objects.filter(attempt=OuterRef('pk'), question__question_type__in=Question.SUBJECTIVE_TYPES)
    subjective_kind = Q(has_subjective=True) | Q(examination__exam_type='subjective')
    exam_att = defaultdict(lambda: defaultdict(float))
    for r in (ExaminationAttempt.objects.filter(student_id__in=user_ids, status__in=('submitted', 'evaluated'),
                                                examination__exam_id__in=all_exam_ids)
              .annotate(has_subjective=Exists(subj_answers))
              .order_by().values('student_id', 'examination__exam_id')
              .annotate(obj_n=Count('id', filter=~subjective_kind),
                        obj_pct=Sum('percentage', filter=~subjective_kind),
                        obj_passed=Count('id', filter=~subjective_kind & Q(passed=True)),
                        obj_failed=Count('id', filter=~subjective_kind & Q(passed=False)),
                        subj_n=Count('id', filter=subjective_kind),
                        subj_awaiting=Count('id', filter=subjective_kind & ~Q(status='evaluated')),
                        subj_evaluated=Count('id', filter=subjective_kind & Q(status='evaluated')),
                        subj_pct=Sum('percentage', filter=subjective_kind & Q(status='evaluated')),
                        last=Max('submitted_at'))):
        d = exam_att[(r['student_id'], r['examination__exam_id'])]
        for k in ('obj_n', 'obj_passed', 'obj_failed', 'subj_n', 'subj_awaiting', 'subj_evaluated'):
            d[k] += r[k] or 0
        d['obj_pct'] += r['obj_pct'] or 0
        d['subj_pct'] += r['subj_pct'] or 0
        d['last'] = _later(d.get('last') or None, r['last'])
    bulk['exam_att'] = exam_att

    # Subjective practice sets (a separate flow with its own Evaluation records).
    has_ans = Exists(SubjectiveAnswer.objects.filter(attempt=OuterRef('pk')))
    unmarked = Exists(SubjectiveAnswer.objects.filter(attempt=OuterRef('pk'), evaluation__isnull=True))
    subj_sets = defaultdict(lambda: defaultdict(float))
    for r in (SubjectiveAttempt.objects.filter(student_id__in=user_ids, status='submitted')
              .annotate(set_exam_id=Coalesce('practice_set__exam_id', 'model_exam__exam_id'))
              .filter(set_exam_id__in=all_exam_ids)
              .annotate(has_answers=has_ans, awaiting=unmarked,
                        marks=Sum('answers__evaluation__marks_obtained'), total=Sum('answers__question__marks'))
              .values('student_id', 'set_exam_id', 'has_answers', 'awaiting', 'marks', 'total')):
        d = subj_sets[(r['student_id'], r['set_exam_id'])]
        d['n'] += 1
        if r['awaiting']:
            d['awaiting'] += 1
        elif r['has_answers']:
            d['evaluated'] += 1
            if r['total']:
                d['pct_sum'] += (r['marks'] or 0) * 100.0 / r['total']
                d['pct_n'] += 1
    bulk['subj_sets'] = subj_sets

    sessions = defaultdict(lambda: {'n': 0, 'done': 0})
    for r in (PracticeSession.objects.filter(user_id__in=user_ids, exam_id__in=all_exam_ids)
              .order_by().values('user_id', 'exam_id').annotate(n=Count('id'), done=Count('id', filter=Q(completed=True)))):
        sessions[(r['user_id'], r['exam_id'])]['n'] += r['n']
        sessions[(r['user_id'], r['exam_id'])]['done'] += r['done']
    bulk['sessions'] = sessions

    bulk['plans'] = {p.student_id: p for p in StudyPlan.objects.filter(student_id__in=user_ids)}
    bulk['streaks'] = {
        r['user_id']: r for r in GamificationProfile.objects.filter(user_id__in=user_ids)
        .values('user_id', 'study_current_streak', 'study_highest_streak', 'last_study_date')
    }
    bulk['schedules'] = list(ExamSchedule.objects.filter(is_published=True, exam_date__gte=today).select_related('exam'))

    bulk.update(distinct_b={}, mprog_b={}, touched_today=set(), finished_today={}, mock_candidates=[], mock_attempts={})
    if with_tasks:
        bulk['distinct_b'] = _distinct_answered(practice_qs.filter(at__lt=today_start),
                                                exam_qs.filter(attempt__submitted_at__lt=today_start))
        bulk['mprog_b'] = material_progress(True)
        bulk['touched_today'] = set(
            StudentMaterialProgress.objects.filter(
                student_id__in=user_ids, last_viewed_at__gte=today_start, last_viewed_at__lt=tomorrow_start,
                material__topic_id__in=topic_ids).values_list('student_id', 'material__topic_id'))
        finished = defaultdict(set)
        for uid, eid, exam_id in (ExaminationAttempt.objects.filter(
                student_id__in=user_ids, submitted_at__gte=today_start, submitted_at__lt=tomorrow_start,
                examination__exam_id__in=all_exam_ids).values_list('student_id', 'examination_id', 'examination__exam_id')):
            finished[uid].add((eid, exam_id))
        bulk['finished_today'] = finished
        candidates = list(
            Examination.objects.filter(status__in=('published', 'live'), exam_id__in=all_exam_ids,
                                       exam_type__in=('mock', 'full', 'position'))
            .filter(Q(end_time__isnull=True) | Q(end_time__gt=bulk['now'])).order_by('start_time', 'id'))
        bulk['mock_candidates'] = candidates
        if candidates:
            bulk['mock_attempts'] = {
                (r['student_id'], r['examination_id']): r['n']
                for r in ExaminationAttempt.objects.filter(student_id__in=user_ids,
                                                           examination_id__in=[c.id for c in candidates])
                .order_by().values('student_id', 'examination_id').annotate(n=Count('id'))}
    return bulk


# --------------------------------------------------------------------------
# Per-student metrics
# --------------------------------------------------------------------------
def _later(a, b):
    return b if a is None or (b is not None and b > a) else a


def _topic_rows(uid, root, bulk, before=False):
    """The student's topic rows for one preparation, in the engine's own format."""
    courses = bulk['user_courses'].get(uid, set())
    mprog = bulk['mprog_b'] if before else bulk['mprog']
    distinct = bulk['distinct_b'] if before else bulk['distinct']
    rows = []
    for tid in bulk['topics_by_root'][root]:
        a = bulk['agg'].get((uid, tid))
        n_mats = prog_sum = touched = 0
        first_id = None
        last = None
        for course_id, (total, first) in bulk['mats'].get(tid, {}).items():
            if course_id is None or course_id in courses:
                n_mats += total
                first_id = first if first_id is None else min(first_id, first)
                mp = mprog.get((uid, tid, course_id))
                if mp:
                    prog_sum += mp['sum']
                    touched += mp['touched']
                    last = _later(last, mp['last'])
        if a:
            practice = (a['p_nb'], a['p_okb']) if before else (a['p_n'], a['p_ok'])
            exam = (a['e_nb'], a['e_okb']) if before else (a['e_n'], a['e_ok'])
            last = _later(last, a['last_b'] if before else a['last'])
        else:
            practice = exam = (0, 0)
        rows.append(engine.build_topic(
            bulk['topics'][tid], available=bulk['avail'].get(tid, 0), answered=distinct.get((uid, tid), 0),
            n_materials=n_mats, first_material_id=first_id if n_mats else None, materials_sum=prog_sum,
            materials_touched=touched, explicit=bulk['explicit'].get((uid, tid)), practice=practice, exam=exam,
            last=last, first=a['first'] if a else None))
    return rows


def compute_tasks(prep, uid, root, topics_before, revision, countdown, bulk):
    """Today's task list for one student, built with the student page's own
    functions (build_tasks / apply_activity), so "3 of 5 tasks" here is exactly
    the plan the student sees."""
    stats_before = {'topics': topics_before}
    weak = engine.weak_topics(prep, stats_before, with_repeated=False)
    mock = None
    days_left = countdown['days_remaining'] if countdown else None
    exam_ids = bulk['subtree'][root]
    if days_left is not None and days_left <= engine.MOCK_WINDOW_DAYS:
        courses = bulk['user_courses'].get(uid, set())
        mock = engine.pick_mock(
            (e for e in bulk['mock_candidates']
             if e.exam_id in exam_ids and (e.course_id is None or e.course_id in courses)),
            lambda e: bulk['mock_attempts'].get((uid, e.id), 0), bulk['now'])
    tasks = engine.build_tasks(prep, stats_before, weak, revision, mock, countdown)
    topic_set = set(bulk['topics_by_root'][root])
    answers = {tid: bulk['practice_today'].get((uid, tid), 0) for tid in topic_set}
    touched = {tid for (u, tid) in bulk['touched_today'] if u == uid and tid in topic_set}
    finished = {eid for eid, exam_id in bulk['finished_today'].get(uid, ()) if exam_id in exam_ids}
    return engine.apply_activity(tasks, answers, touched, finished)


def compute_pair(pair, bulk):
    uid, root = pair['user'].id, pair['exam_id']
    exam = bulk['exams'][root]
    exam_ids = bulk['subtree'][root]
    today = bulk['today']

    topics = _topic_rows(uid, root, bulk)
    attempts = sum(t['attempts'] for t in topics)
    correct = sum(t['correct'] for t in topics)
    today_q = sum(bulk['today_q'].get((uid, t['id']), 0) for t in topics)
    last = None
    for t in topics:
        last = _later(last, t['last_activity'])
    overall = engine.overall_percent(topics)
    contentful = [t for t in topics if t['has_content']]

    plan = bulk['plans'].get(uid)
    enrolled_day = pair['enrolled_at'].astimezone(NEPAL).date()
    prep = engine.Prep(pair['user'], exam, exam_ids, None, enrolled_day, plan, None)
    countdown, pace = engine.countdown_and_pace(prep, {'topics': topics}, overall, schedules=bulk['schedules'])

    revision = defaultdict(int)
    for eid in exam_ids:
        for name, n in bulk['revision'].get((uid, eid), {}).items():
            revision[name] += n
    reviewed = revision['reviewed']
    due_total = revision['due_today'] + reviewed          # what was due when today began

    obj, subj, sets = defaultdict(float), defaultdict(float), defaultdict(float)
    sess = {'n': 0, 'done': 0}
    exam_last = None
    for eid in exam_ids:
        v = bulk['exam_att'].get((uid, eid))
        if v:
            for k in ('obj_n', 'obj_pct', 'obj_passed', 'obj_failed'):
                obj[k] += v[k]
            for k in ('subj_n', 'subj_awaiting', 'subj_evaluated', 'subj_pct'):
                subj[k] += v[k]
            exam_last = _later(exam_last, v.get('last') or None)
        v = bulk['subj_sets'].get((uid, eid))
        if v:
            for k in ('n', 'awaiting', 'evaluated', 'pct_sum', 'pct_n'):
                sets[k] += v[k]
        v = bulk['sessions'].get((uid, eid))
        if v:
            sess['n'] += v['n']
            sess['done'] += v['done']
    last = _later(last, exam_last)

    target = prep.preferences['daily_questions']
    study_day_today = prep.is_study_day(today)
    idle_from = last.astimezone(NEPAL).date() if last else enrolled_day
    idle_days = max(0, (today - idle_from).days)
    if last is None:
        activity = 'no_recent_activity'
    elif idle_days <= LOW_ACTIVITY_DAYS:
        activity = 'active_recently'
    elif idle_days <= INACTIVE_DAYS:
        activity = 'low_activity'
    else:
        activity = 'no_recent_activity'

    accuracy = round(correct * 100.0 / attempts) if attempts else None
    flags = []
    if idle_days >= INACTIVE_DAYS:
        flags.append({
            'code': 'inactive',
            'label': f'No activity for {idle_days} days' if last else f'No activity since enrolling {idle_days} days ago',
            'action': 'Review study activity and reach out to the student.'})
    if pace.get('status') == 'needs_attention':
        flags.append({'code': 'behind_pace',
                      'label': f"Behind pace: {pace['actual_percent']}% completed, about {pace['expected_percent']}% expected",
                      'action': 'Compare syllabus progress with the exam date and help re-plan.'})
    if attempts >= MIN_ATTEMPTS_FOR_ACCURACY and accuracy is not None and accuracy < engine.WEAK_TOPIC_ACCURACY_THRESHOLD:
        flags.append({'code': 'low_accuracy', 'label': f'Low practice accuracy: {accuracy}% over {attempts} answers',
                      'action': "Review the student's weak topics."})
    if revision['overdue'] >= OVERDUE_REVISION_MIN:
        flags.append({'code': 'overdue_revision', 'label': f"{revision['overdue']} revision questions overdue",
                      'action': 'Encourage the student to clear their revision backlog.'})
    if obj['obj_failed'] >= FAILED_EXAMS_MIN:
        flags.append({'code': 'failed_exams', 'label': f"Failed {int(obj['obj_failed'])} scored mock exams",
                      'action': "Review the student's exam performance."})

    if any(f['code'] == 'inactive' for f in flags):
        status = 'inactive'
    elif flags:
        status = 'needs_attention'
    elif pace.get('status') in ('slightly_behind', 'on_track'):
        status = pace['status']
    else:
        status = 'no_schedule'

    tasks = None
    if bulk['with_tasks']:
        rev = {'due_today': revision['due_today'], 'reviewed_today': reviewed}
        done = compute_tasks(prep, uid, root, _topic_rows(uid, root, bulk, before=True), rev, countdown, bulk)
        completed = len([t for t in done if t['completed']])
        tasks = {'completed': completed, 'total': len(done),
                 'percent': round(completed * 100 / len(done)) if done else None}

    streak = bulk['streaks'].get(uid) or {}
    user = pair['user']
    obj_n = int(obj['obj_n'])
    return {
        'student': {'id': user.id, 'name': user.get_full_name() or user.username, 'username': user.username,
                    'email': user.email, 'joined': user.date_joined.isoformat() if user.date_joined else None},
        'exam_id': root, 'course': ', '.join(pair['courses']), 'enrolled_at': pair['enrolled_at'].isoformat(),
        'progress': overall, 'topics_with_content': len(contentful),
        'topics_started': len([t for t in contentful if t['started']]),
        'attempts': attempts, 'correct': correct, 'accuracy': accuracy,
        'today_questions': today_q, 'daily_target': target, 'study_day_today': study_day_today,
        'target_met': bool(target) and today_q >= target,
        'tasks': tasks,
        'revision': {'due_today': due_total, 'reviewed_today': reviewed, 'remaining': revision['due_today'],
                     'overdue': revision['overdue'], 'total': revision['total']},
        'exams': {
            'objective': {'attempts': obj_n, 'passed': int(obj['obj_passed']), 'failed': int(obj['obj_failed']),
                          'average': round(obj['obj_pct'] / obj_n) if obj_n else None},
            'subjective': {'submitted': int(subj['subj_n']), 'awaiting_evaluation': int(subj['subj_awaiting']),
                           'evaluated': int(subj['subj_evaluated']),
                           'average': round(subj['subj_pct'] / subj['subj_evaluated']) if subj['subj_evaluated'] else None},
            'subjective_sets': {'submitted': int(sets['n']), 'awaiting_evaluation': int(sets['awaiting']),
                                'evaluated': int(sets['evaluated']),
                                'average': round(sets['pct_sum'] / sets['pct_n']) if sets['pct_n'] else None},
        },
        'practice_sessions': sess['n'], 'practice_sessions_completed': sess['done'],
        'last_activity': last.isoformat() if last else None, 'idle_days': idle_days if last else None,
        'activity': activity, 'streak': streak.get('study_current_streak', 0),
        'pace': pace, 'countdown': countdown,
        'flags': flags, 'status': status,
        'status_label': (('No exam date' if not countdown else 'Pace not measurable') if status == 'no_schedule'
                         else STATUS_LABELS[status]),
        '_topics': topics,          # dropped before serialising; used for topic analytics
    }


def compute_all(exam=None, search=None, student_id=None, with_tasks=False):
    exams = engine._active_exams()
    pairs = load_roster(exam=exam, search=search, student_id=student_id, exams=exams)
    bulk = load_bulk(pairs, exams, with_tasks=with_tasks)
    rows = [compute_pair(p, bulk) for p in pairs]
    return rows, bulk, exams


# --------------------------------------------------------------------------
# Filtering, ordering, aggregation
# --------------------------------------------------------------------------
PROGRESS_BUCKETS = {'0-25': (0, 25), '26-50': (26, 50), '51-75': (51, 75), '76-100': (76, 100)}


def apply_filters(rows, status=None, activity=None, progress=None, active_from=None, active_to=None):
    out = rows
    if status:
        out = [r for r in out if r['status'] == status]
    if activity:
        out = [r for r in out if r['activity'] == activity]
    if progress in PROGRESS_BUCKETS:
        lo, hi = PROGRESS_BUCKETS[progress]
        out = [r for r in out if r['progress'] is not None and lo <= r['progress'] <= hi]
    if active_from or active_to:
        def in_range(r):
            if not r['last_activity']:
                return False
            d = datetime.datetime.fromisoformat(r['last_activity']).astimezone(NEPAL).date()
            return (not active_from or d >= active_from) and (not active_to or d <= active_to)
        out = [r for r in out if in_range(r)]
    return out


ORDERINGS = {
    'attention': lambda r: (STATUS_ORDER.index(r['status']), -(r['idle_days'] or 0), r['student']['name'].lower()),
    'name': lambda r: r['student']['name'].lower(),
    'progress': lambda r: (r['progress'] is None, r['progress'] or 0),
    'accuracy': lambda r: (r['accuracy'] is None, r['accuracy'] or 0),
    'activity': lambda r: r['last_activity'] or '',
}


def order_rows(rows, ordering):
    desc = ordering.startswith('-')
    key = ORDERINGS.get(ordering.lstrip('-'), ORDERINGS['attention'])
    return sorted(rows, key=key, reverse=desc)


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values)) if values else None


def summarise(rows, bulk):
    """Every number on the overview: whole-scope aggregates, never a page of results."""
    total = len(rows)
    status = {s: 0 for s in STATUS_ORDER}
    for r in rows:
        status[r['status']] += 1
    activity = defaultdict(int)
    for r in rows:
        activity[r['activity']] += 1
    with_attempts = [r for r in rows if r['attempts']]
    attempts = sum(r['attempts'] for r in rows)
    correct = sum(r['correct'] for r in rows)
    eligible = [r for r in rows if r['study_day_today']]
    obj_n = sum(r['exams']['objective']['attempts'] for r in rows)
    obj_pct = sum((r['exams']['objective']['average'] or 0) * r['exams']['objective']['attempts'] for r in rows)
    subj_eval = sum(r['exams']['subjective']['evaluated'] for r in rows)
    subj_pct = sum((r['exams']['subjective']['average'] or 0) * r['exams']['subjective']['evaluated'] for r in rows)
    with_tasks = [r for r in rows if r['tasks'] and r['tasks']['total']]
    tasks_total = sum(r['tasks']['total'] for r in with_tasks)
    tasks_done = sum(r['tasks']['completed'] for r in with_tasks)
    due = sum(r['revision']['due_today'] for r in rows)
    done = sum(r['revision']['reviewed_today'] for r in rows)
    return {
        'students': total,
        'status': {'counts': status, 'labels': STATUS_LABELS, 'order': STATUS_ORDER},
        'activity': {'active_recently': activity['active_recently'], 'low_activity': activity['low_activity'],
                     'no_recent_activity': activity['no_recent_activity']},
        'average_progress': _avg([r['progress'] for r in rows]),
        'students_with_progress': len([r for r in rows if r['progress'] is not None]),
        'accuracy': {'percent': round(correct * 100.0 / attempts) if attempts else None, 'attempts': attempts,
                     'students': len(with_attempts)},
        'daily_target': {'met': len([r for r in eligible if r['target_met']]), 'eligible': len(eligible),
                         'percent': round(len([r for r in eligible if r['target_met']]) * 100.0 / len(eligible))
                         if eligible else None},
        'practice': {'active_today': len([r for r in rows if r['today_questions']]),
                     'questions_today': sum(r['today_questions'] for r in rows), 'answers': attempts,
                     'correct': correct, 'sessions': sum(r['practice_sessions'] for r in rows),
                     'sessions_completed': sum(r['practice_sessions_completed'] for r in rows),
                     'students_with_practice': len(with_attempts)},
        'revision': {'due_today': due, 'completed': done, 'remaining': sum(r['revision']['remaining'] for r in rows),
                     'overdue': sum(r['revision']['overdue'] for r in rows),
                     'percent': round(done * 100.0 / due) if due else None,
                     'students_with_revision': len([r for r in rows if r['revision']['total']])},
        'tasks': {'completed': tasks_done, 'total': tasks_total,
                  'percent': round(tasks_done * 100.0 / tasks_total) if tasks_total else None,
                  'students_with_tasks': len(with_tasks),
                  'students_all_done': len([r for r in with_tasks if r['tasks']['completed'] == r['tasks']['total']])},
        'exams': {
            'objective': {'attempts': obj_n, 'average': round(obj_pct / obj_n) if obj_n else None,
                          'passed': sum(r['exams']['objective']['passed'] for r in rows),
                          'failed': sum(r['exams']['objective']['failed'] for r in rows),
                          'students': len([r for r in rows if r['exams']['objective']['attempts']])},
            'subjective': {'submitted': sum(r['exams']['subjective']['submitted'] for r in rows),
                           'awaiting_evaluation': sum(r['exams']['subjective']['awaiting_evaluation'] for r in rows),
                           'evaluated': subj_eval,
                           'average': round(subj_pct / subj_eval) if subj_eval else None},
            'subjective_sets': {'submitted': sum(r['exams']['subjective_sets']['submitted'] for r in rows),
                                'awaiting_evaluation': sum(r['exams']['subjective_sets']['awaiting_evaluation'] for r in rows),
                                'evaluated': sum(r['exams']['subjective_sets']['evaluated'] for r in rows)},
        },
        'flagged': len([r for r in rows if r['flags']]),
    }


def schedule_overview(rows, exams_by_id, names):
    """Per preparation: the exam date its students count down to (the admin's
    ExamSchedule) and how many are preparing."""
    groups = defaultdict(list)
    for r in rows:
        groups[r['exam_id']].append(r)
    out = []
    for exam_id, members in groups.items():
        cds = [m['countdown'] for m in members if m['countdown']]
        cd = next((c for c in cds if c['source'] == 'schedule'), None)
        out.append({
            'exam_id': exam_id, 'name': names.get(exam_id, exams_by_id[exam_id].name), 'students': len(members),
            'countdown': cd,
            'without_schedule': len([m for m in members if not m['countdown'] or m['countdown']['source'] != 'schedule']),
        })
    out.sort(key=lambda g: (g['countdown'] is None, g['countdown']['days_remaining'] if g['countdown'] else 0, g['name']))
    return out


# --------------------------------------------------------------------------
# Topic / syllabus analytics for one preparation
# --------------------------------------------------------------------------
def topic_analytics(rows, bulk, exam_id):
    """Subjects -> chapters -> topics with pooled real numbers across the
    preparation's students. A topic with too few answers gets no accuracy."""
    students = [r for r in rows if r['exam_id'] == exam_id]
    n_students = len(students)
    per_topic = {}
    for tid in bulk['topics_by_root'].get(exam_id, []):
        per_topic[tid] = {'attempts': 0, 'correct': 0, 'attempted_students': 0, 'started': 0, 'percents': []}
    for r in students:
        uid = r['student']['id']
        for t in r['_topics']:
            d = per_topic[t['id']]
            a = bulk['agg'].get((uid, t['id']))
            if a and (a['p_n'] + a['e_n']):
                d['attempts'] += a['p_n'] + a['e_n']
                d['correct'] += a['p_ok'] + a['e_ok']
                d['attempted_students'] += 1
            if t['has_content']:
                if t['started']:
                    d['started'] += 1
                d['percents'].append(t['percent'] or 0)

    def classify(d, has_content):
        if not has_content:
            return 'no_content'
        acc = round(d['correct'] * 100.0 / d['attempts']) if d['attempts'] >= MIN_TOPIC_ATTEMPTS else None
        share = d['started'] * 100.0 / n_students if n_students else 0
        if acc is not None and acc < engine.WEAK_TOPIC_ACCURACY_THRESHOLD:
            return 'weak'
        if share < RARELY_STUDIED_SHARE:
            return 'rarely_studied'
        if acc is not None and acc >= STRONG_ACCURACY:
            return 'strong'
        return 'moderate'

    def figures(items):
        attempts = sum(i['attempts'] for i in items)
        correct = sum(i['correct'] for i in items)
        percents = [p for i in items for p in i['_percents']]
        return {
            'attempts': attempts,
            'accuracy': round(correct * 100.0 / attempts) if attempts >= MIN_TOPIC_ATTEMPTS else None,
            'insufficient_data': attempts < MIN_TOPIC_ATTEMPTS,
            'average_completion': _avg(percents),
        }

    subjects, s_idx, c_idx = [], {}, {}
    for tid in bulk['topics_by_root'].get(exam_id, []):
        meta = bulk['topics'][tid]
        d = per_topic[tid]
        has_content = bool(bulk['avail'].get(tid, 0) or bulk['mats'].get(tid))
        s = s_idx.get(meta['chapter__subject_id'])
        if s is None:
            s = {'id': meta['chapter__subject_id'], 'name': meta['chapter__subject__name'], 'chapters': []}
            s_idx[meta['chapter__subject_id']] = s
            subjects.append(s)
        c = c_idx.get(meta['chapter_id'])
        if c is None:
            c = {'id': meta['chapter_id'], 'title': meta['chapter__title'], 'topics': []}
            c_idx[meta['chapter_id']] = c
            s['chapters'].append(c)
        acc = round(d['correct'] * 100.0 / d['attempts']) if d['attempts'] >= MIN_TOPIC_ATTEMPTS else None
        c['topics'].append({
            'id': tid, 'name': meta['name'], 'attempts': d['attempts'], 'accuracy': acc,
            'insufficient_data': d['attempts'] < MIN_TOPIC_ATTEMPTS,
            'students_attempted': d['attempted_students'], 'students_started': d['started'],
            'average_completion': _avg(d['percents']), 'class': classify(d, has_content),
            'available_questions': bulk['avail'].get(tid, 0), '_percents': d['percents'],
            'attempts_raw': d['attempts'], 'correct_raw': d['correct'],
        })
    for s in subjects:
        s_items = []
        for c in s['chapters']:
            items = [{'attempts': t['attempts_raw'], 'correct': t['correct_raw'], '_percents': t['_percents']}
                     for t in c['topics']]
            c.update(figures(items))
            s_items += items
        s.update(figures(s_items))
        for c in s['chapters']:
            for t in c['topics']:
                for k in ('_percents', 'attempts_raw', 'correct_raw'):
                    t.pop(k, None)

    ranked = [s for s in subjects if s['accuracy'] is not None]
    ranked.sort(key=lambda s: -s['accuracy'])
    slim = lambda s: {'id': s['id'], 'name': s['name'], 'accuracy': s['accuracy'], 'attempts': s['attempts']}
    return {
        'students': n_students, 'subjects': subjects,
        'strong': [slim(s) for s in ranked if s['accuracy'] >= STRONG_ACCURACY][:5],
        'needs_improvement': [slim(s) for s in reversed(ranked) if s['accuracy'] < engine.WEAK_TOPIC_ACCURACY_THRESHOLD][:5],
        'rule': rules()['topic'],
    }


def public_row(r):
    return {k: v for k, v in r.items() if k != '_topics'}
