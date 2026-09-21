"""The Study Plan engine: everything the Study Plan page shows is computed
here, on demand, from the platform's real records - never stored as a second
copy and never invented.

Sources (all existing models):
  syllabus            exams.Exam -> Paper -> Subject -> Chapter -> Topic
  what the student owns  courses.access.authorized_exam_ids / Enrollment
  questions           exams.Question through QuestionSelectionService
  practice answers    exams.QuestionAttempt (+ PracticeSession)
  exam answers        exams.StudentAnswer (+ ExaminationAttempt)
  notes               notes.StudyMaterial / StudentMaterialProgress
  revision            exams.QuestionMastery
  exam date           exams.ExamSchedule (admin-configured)
  streak              gamification.GamificationProfile
  preferences         study_plan.StudyPlan (daily minutes / questions / days)

Rules are deliberately simple and are also returned to the client in each
response so the student can see WHY something is recommended.
"""
import datetime
from collections import defaultdict
from zoneinfo import ZoneInfo

from django.db.models import Count, Max, Min, Q, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

NEPAL = ZoneInfo('Asia/Kathmandu')     # the platform's students live here; days are Nepal days

# A topic is "weak" once the student has answered at least this many of its
# questions AND is right less than this percent of the time. The same numbers
# Revision Mode already uses for its "weak topics" signal.
from exams.views import WEAK_TOPIC_ACCURACY_THRESHOLD, WEAK_TOPIC_MIN_ANSWERED  # noqa: E402

ON_TRACK_TOLERANCE = 5        # points behind the expected pace still counted "On Track"
SLIGHTLY_BEHIND_TOLERANCE = 20  # further than this behind -> "Needs Attention"
MOCK_WINDOW_DAYS = 14         # a mock exam is suggested once the exam is this close
MINUTES_PER_QUESTION = 1      # planning estimate for time budgeting only
STUDY_NOTE_MINUTES = 20
MAX_TASKS = 5
WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


class PreparationDenied(Exception):
    """The requested preparation is not one the student is authorised for."""


def local_today():
    return timezone.localtime(timezone.now(), NEPAL).date()


def day_bounds(day):
    start = datetime.datetime.combine(day, datetime.time.min, tzinfo=NEPAL)
    return start, start + datetime.timedelta(days=1)


# --------------------------------------------------------------------------
# Preparations (what the student may plan for)
# --------------------------------------------------------------------------
class Prep:
    def __init__(self, user, exam, exam_ids, course, start_date, plan, display_name):
        self.user = user
        self.exam = exam
        self.exam_ids = exam_ids
        self.course = course
        self.start_date = start_date      # when the student's access began (for pace), or None
        self.plan = plan
        self.display_name = display_name

    @property
    def preferences(self):
        plan = self.plan
        return {
            'configured': plan is not None,
            'daily_minutes': plan.daily_minutes if plan else 60,
            'daily_questions': plan.daily_questions if plan else 20,
            'study_days': list(plan.study_days) if plan and plan.study_days else list(WEEKDAYS),
            'target_date': plan.target_date.isoformat() if plan and plan.target_date else None,
        }

    def is_study_day(self, day):
        return WEEKDAYS[day.weekday()] in self.preferences['study_days']


def _plan_for(user):
    from .models import StudyPlan
    return StudyPlan.objects.filter(student=user).first()


def _active_exams():
    """Every active exam once (the table is tiny), with the parent chain and
    category the labels and the countdown need - no per-exam queries."""
    from exams.models import Exam
    return list(Exam.objects.filter(is_active=True).select_related('parent__parent', 'category')
                .order_by('category_id', 'order', 'id'))


def resolve_preparation(user, exam_param=None, need_since=False):
    """(prep, authorised_exams) - the preparation the page is about, or
    (None, []) when the student has none. A requested exam that is not in the
    student's authorised set is refused: the id is never trusted.
    Authorisation is exactly Practice's: courses.access.authorized_exam_ids."""
    from collections import Counter

    from courses.access import active_enrollments, authorized_exam_ids
    from exams.serializers import ExamSerializer

    rows = _active_exams()
    scope = authorized_exam_ids(user, exams=rows)
    exams = [e for e in rows if e.status == 'active' and (scope is None or e.id in scope)]
    if not exams:
        return None, []
    plan = _plan_for(user)
    by_id = {e.id: e for e in exams}

    chosen = None
    if exam_param not in (None, '', 'null'):
        try:
            chosen = by_id.get(int(exam_param))
        except (TypeError, ValueError):
            chosen = None
        if chosen is None:
            raise PreparationDenied()
    if chosen is None and plan and plan.exam_id in by_id:
        chosen = by_id[plan.exam_id]
    if chosen is None:
        # No choice yet: the exam the student most recently enrolled in / bought,
        # else the first authorised one.
        owned = (active_enrollments(user).filter(course__status='published', course__exam_id__in=list(by_id))
                 .order_by('-enrolled_at').values_list('course__exam_id', flat=True).first())
        chosen = by_id.get(owned) or exams[0]

    # A level with services under it plans for all of them together.
    children = defaultdict(list)
    for e in exams:
        children[e.parent_id].append(e.id)
    exam_ids, stack = set(), [chosen.id]
    while stack:
        node = stack.pop()
        if node not in exam_ids:
            exam_ids.add(node)
            stack.extend(children.get(node, []))

    dupes = {n for n, c in Counter(e.name for e in exams).items() if c > 1}
    display = ExamSerializer(context={'duplicate_exam_names': dupes}).get_display_name(chosen)

    start = None
    if need_since:
        first = active_enrollments(user).filter(
            course__status='published', course__exam_id__in=exam_ids
        ).aggregate(m=Min('enrolled_at'))['m']
        start = first.astimezone(NEPAL).date() if first else (plan.created_at.astimezone(NEPAL).date() if plan else None)
    return Prep(user, chosen, exam_ids, None, start, plan, display), exams


def preparation_choices(user, exams):
    """The switcher: each authorised exam with its published course (if any)
    and whether the student is enrolled in it. Two small queries."""
    from collections import Counter

    from courses.access import active_enrollments
    from courses.models import Course
    from exams.serializers import ExamSerializer

    ids = [e.id for e in exams]
    courses = {}
    for c in Course.objects.filter(exam_id__in=ids, status='published').order_by('id'):
        courses.setdefault(c.exam_id, c)
    enrolled = set(active_enrollments(user).filter(course__status='published', course__exam_id__in=ids)
                   .values_list('course__exam_id', flat=True))
    dupes = {n for n, c in Counter(e.name for e in exams).items() if c > 1}
    namer = ExamSerializer(context={'duplicate_exam_names': dupes})
    choices = [{
        'id': e.id, 'display_name': namer.get_display_name(e),
        'course': ({'id': courses[e.id].id, 'title': courses[e.id].title} if e.id in courses else None),
        'enrolled': e.id in enrolled,
    } for e in exams]
    choices.sort(key=lambda c: not c['enrolled'])          # purchased first; stable for the rest
    return choices


# --------------------------------------------------------------------------
# Real per-topic evidence
# --------------------------------------------------------------------------
def topic_state(available, answered, n_materials, materials_progress_sum, materials_touched, explicit=None):
    """The one definition of a topic's progress, shared by the student's page
    and the admin monitoring views so the two can never disagree.

    `available`  approved objective questions in the topic
    `answered`   how many of them the student has answered (practice + exams, each once)
    `explicit`   an optional exams.UserTopicProgress-like row (.progress, .status)
    Returns (percent | None, has_content, started, status).
    """
    parts = []
    if available:
        parts.append(min(100.0, answered * 100.0 / available))
    if n_materials:
        parts.append(min(100.0, materials_progress_sum / n_materials))
    pct = sum(parts) / len(parts) if parts else None
    if explicit is not None and explicit.progress and (pct is None or explicit.progress > pct):
        pct = float(explicit.progress)
    has_content = bool(available or n_materials or explicit is not None)
    started = bool(answered or materials_touched or (explicit is not None and (explicit.progress or explicit.status != 'not-started')))
    if not has_content:
        status = 'no_content'
    elif not started:
        status = 'not_started'
    elif pct is not None and pct >= 100:
        status = 'completed'
    else:
        status = 'in_progress'
    return pct, has_content, started, status


def build_topic(meta, *, available, answered, n_materials, first_material_id, materials_sum, materials_touched,
                explicit, practice, exam, last, first):
    """One syllabus topic with a student's real evidence - the single place a
    topic row is put together (used for the student page and the admin summary).
    `practice` / `exam` are (answers, correct) pairs."""
    pct, has_content, started, status = topic_state(available, answered, n_materials, materials_sum,
                                                    materials_touched, explicit)
    attempts, correct = practice[0] + exam[0], practice[1] + exam[1]
    return {
        'id': meta['id'], 'name': meta['name'],
        'chapter_id': meta['chapter_id'], 'chapter': meta['chapter__title'],
        'subject_id': meta['chapter__subject_id'], 'subject': meta['chapter__subject__name'],
        'available_questions': available, 'answered_questions': answered, 'materials': n_materials,
        'first_material_id': first_material_id,
        'materials_done_pct': round(min(100.0, materials_sum / n_materials)) if n_materials else None,
        'attempts': attempts, 'correct': correct,
        'accuracy': round(correct * 100.0 / attempts) if attempts else None,
        'exam_attempts': exam[0],
        'exam_accuracy': round(exam[1] * 100.0 / exam[0]) if exam[0] else None,
        # "Not started" / "no content" carry no percentage - none is invented.
        'percent': round(pct) if pct is not None and status in ('in_progress', 'completed') else None,
        'status': status, 'has_content': has_content, 'started': started,
        'last_activity': last, 'first_activity': first,
    }


def load_stats(prep):
    """One row per syllabus topic of the preparation, with the student's real
    evidence: questions answered (practice + mock exams), accuracy, notes
    progress, and any explicit progress row. ~6 queries, none per topic.

    Returns {'topics': ..., 'before': ...}: `topics` is the evidence right now
    (for progress); `before` is the same evidence as it stood when today began.
    Today's plan is chosen from `before`, so a task the student finishes stays
    on the list (completed) instead of vanishing because the finished work
    changed the numbers it was picked from.
    """
    from courses.access import active_enrollments
    from exams.models import QuestionAttempt, StudentAnswer, Topic, UserTopicProgress
    from exams.selection_service import QuestionSelectionService
    from notes.models import StudyMaterial

    user = prep.user
    day_start, _ = day_bounds(local_today())
    rows = list(
        Topic.objects.filter(chapter__subject__paper__exam_id__in=prep.exam_ids)
        .order_by('chapter__subject__paper__paper_number', 'chapter__subject_id', 'chapter_id', 'id')
        .values('id', 'name', 'chapter_id', 'chapter__title', 'chapter__subject_id', 'chapter__subject__name')
    )
    topic_ids = [r['id'] for r in rows]
    if not topic_ids:
        return {'topics': [], 'before': [], 'by_id': {}}

    svc = QuestionSelectionService()
    avail = dict(
        svc.apply_filters(svc.get_base_queryset(), exam_ids=prep.exam_ids, question_type='objective')
        .order_by().values_list('topic_id').annotate(n=Count('id', distinct=True))
    )

    def blank():
        return {'q': set(), 'q_b': set(), 'n': 0, 'ok': 0, 'n_b': 0, 'ok_b': 0, 'en': 0, 'eok': 0, 'en_b': 0,
                'eok_b': 0, 'last': None, 'last_b': None, 'first': None}
    agg = defaultdict(blank)

    def later(a, b):
        return b if a is None or (b is not None and b > a) else a

    def fold(r, exam):
        a = agg[r['question__topic_id']]
        a['q'].add(r['question_id'])
        if r['n_b']:
            a['q_b'].add(r['question_id'])
        a['en' if exam else 'n'] += r['n']
        a['eok' if exam else 'ok'] += r['ok']
        a['en_b' if exam else 'n_b'] += r['n_b']
        a['eok_b' if exam else 'ok_b'] += r['ok_b']
        a['last'] = later(a['last'], r['last'])
        a['last_b'] = later(a['last_b'], r['last_b'])
        if r['first'] and (a['first'] is None or r['first'] < a['first']):
            a['first'] = r['first']

    practice = (
        QuestionAttempt.objects.filter(session__user=user, question__topic_id__in=topic_ids,
                                       selected_option__isnull=False)
        .exclude(selected_option='')
        .filter(Q(session__mode__in=('study', 'revision', 'daily')) | Q(session__completed=True))
        .annotate(at=Coalesce('viewed_at', 'session__created_at'))
        .values('question__topic_id', 'question_id')
        .annotate(n=Count('id'), ok=Count('id', filter=Q(is_correct=True)),
                  n_b=Count('id', filter=Q(at__lt=day_start)), ok_b=Count('id', filter=Q(is_correct=True, at__lt=day_start)),
                  last=Max('at'), last_b=Max('at', filter=Q(at__lt=day_start)), first=Min('at'))
    )
    for r in practice:
        fold(r, False)
    exams = (
        StudentAnswer.objects.filter(attempt__student=user, attempt__status__in=('submitted', 'evaluated'),
                                     question__topic_id__in=topic_ids, selected_option__isnull=False)
        .exclude(selected_option='')
        .values('question__topic_id', 'question_id')
        .annotate(n=Count('id'), ok=Count('id', filter=Q(is_correct=True)),
                  n_b=Count('id', filter=Q(attempt__submitted_at__lt=day_start)),
                  ok_b=Count('id', filter=Q(is_correct=True, attempt__submitted_at__lt=day_start)),
                  last=Max('attempt__submitted_at'),
                  last_b=Max('attempt__submitted_at', filter=Q(attempt__submitted_at__lt=day_start)),
                  first=Min('attempt__submitted_at'))
    )
    for r in exams:
        fold(r, True)

    mine = Q(progress__student=user)
    mine_b = Q(progress__student=user, progress__last_viewed_at__lt=day_start)
    mats = {
        m['topic_id']: m for m in
        StudyMaterial.objects.filter(status='published', exam_id__in=prep.exam_ids, topic_id__in=topic_ids)
        .filter(Q(course__isnull=True) | Q(course_id__in=active_enrollments(user).values('course_id')))
        .values('topic_id')
        .annotate(total=Count('id', distinct=True), first_id=Min('id'),
                  touched=Count('id', filter=mine, distinct=True), touched_b=Count('id', filter=mine_b, distinct=True),
                  prog_sum=Sum('progress__progress', filter=mine), prog_sum_b=Sum('progress__progress', filter=mine_b),
                  last=Max('progress__last_viewed_at', filter=mine),
                  last_b=Max('progress__last_viewed_at', filter=mine_b))
    }
    explicit = {p.topic_id: p for p in UserTopicProgress.objects.filter(user=user, topic_id__in=topic_ids)}

    def make(mode):
        b = mode == 'before'
        topics = []
        for r in rows:
            tid = r['id']
            a = agg.get(tid)
            m = mats.get(tid)
            n_mats = m['total'] if m else 0
            topics.append(build_topic(
                r, available=avail.get(tid, 0), answered=len(a['q_b' if b else 'q']) if a else 0,
                n_materials=n_mats, first_material_id=m['first_id'] if m and n_mats else None,
                materials_sum=((m['prog_sum_b'] if b else m['prog_sum']) or 0) if m else 0,
                materials_touched=(m['touched_b'] if b else m['touched']) if m else 0,
                explicit=explicit.get(tid),
                practice=(a['n_b'], a['ok_b']) if a and b else ((a['n'], a['ok']) if a else (0, 0)),
                exam=(a['en_b'], a['eok_b']) if a and b else ((a['en'], a['eok']) if a else (0, 0)),
                last=later(a['last_b' if b else 'last'] if a else None, (m['last_b'] if b else m['last']) if m else None),
                first=a['first'] if a else None))
        return topics

    now_topics, before_topics = make('now'), make('before')
    return {'topics': now_topics, 'before': before_topics, 'by_id': {t['id']: t for t in now_topics}}


def _mean(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values)) if values else None


def overall_percent(topics):
    """Overall syllabus progress: the plain average of the topics that have content."""
    return _mean([(t['percent'] or 0) for t in topics if t['has_content']])


def build_tree(stats):
    """Subjects -> chapters -> topics with real percentages. A percentage is the
    plain average of the topics beneath it THAT HAVE CONTENT (questions or
    notes); topics without any content are listed but never counted."""
    subjects, s_index, c_index = [], {}, {}
    for t in stats['topics']:
        s = s_index.get(t['subject_id'])
        if s is None:
            s = {'id': t['subject_id'], 'name': t['subject'], 'chapters': []}
            s_index[t['subject_id']] = s
            subjects.append(s)
        c = c_index.get(t['chapter_id'])
        if c is None:
            c = {'id': t['chapter_id'], 'title': t['chapter'], 'topics': []}
            c_index[t['chapter_id']] = c
            s['chapters'].append(c)
        c['topics'].append({
            k: t[k] for k in ('id', 'name', 'percent', 'status', 'accuracy', 'attempts',
                              'available_questions', 'answered_questions', 'materials')
        })
    for s in subjects:
        s_vals = []
        for c in s['chapters']:
            vals = [(t['percent'] if t['percent'] is not None else 0) for t in c['topics'] if t['status'] != 'no_content']
            c['percent'] = _mean(vals)
            live = [t for t in c['topics'] if t['status'] != 'no_content']
            c['status'] = ('no_content' if not live
                           else 'not_started' if all(t['status'] == 'not_started' for t in live) else 'in_progress')
            s_vals += vals
        s['percent'] = _mean(s_vals)
        contentful = [t for c in s['chapters'] for t in c['topics'] if t['status'] != 'no_content']
        s['topics_with_content'] = len(contentful)
        s['topics_started'] = len([t for t in contentful if t['status'] in ('in_progress', 'completed')])
        s['status'] = ('no_content' if not contentful else 'not_started' if not s['topics_started'] else 'in_progress')
    contentful = [t for t in stats['topics'] if t['has_content']]
    overall = overall_percent(stats['topics'])
    return {
        'overall': {
            'percent': overall,
            'topics_with_content': len(contentful),
            'topics_started': len([t for t in contentful if t['started']]),
            'topics_completed': len([t for t in contentful if t['status'] == 'completed']),
            'basis': 'Average of your progress in each topic that has questions or notes. A topic\'s progress '
                     'combines the share of its questions you have answered and the share of its notes you have read.',
        },
        'subjects': subjects,
    }


# --------------------------------------------------------------------------
# Exam countdown and pace
# --------------------------------------------------------------------------
def countdown_and_pace(prep, stats, overall_percent, schedules=None):
    """The next ExamSchedule that applies to this preparation and whether the
    student's syllabus progress keeps pace with it."""
    from exams.models import ExamSchedule

    today = local_today()
    chain, node = set(), prep.exam
    while node is not None and node.id not in chain:
        chain.add(node.id)
        node = node.parent
    category_id = prep.exam.category_id

    best = None
    # `schedules` lets a caller that evaluates many students load the schedules once
    for s in (schedules if schedules is not None
              else ExamSchedule.objects.filter(is_published=True, exam_date__gte=today).select_related('exam')):
        if s.exam_id == prep.exam.id:
            rank = 0
        elif s.exam_id in chain:
            rank = 1
        elif s.exam_id is None and s.exam_category_id == category_id and category_id is not None:
            rank = 2
        elif s.exam_id is None and s.exam_category_id is None:
            rank = 3
        else:
            continue
        key = (rank, s.exam_date, s.exam_time or datetime.time.min)
        if best is None or key < best[0]:
            best = (key, s)

    source, exam_date, title = None, None, None
    if best:
        s = best[1]
        source, exam_date, title = 'schedule', s.exam_date, s.title
        scope = {0: 'exam', 1: 'level', 2: 'category', 3: 'all'}[best[0][0]]
        tz = ZoneInfo(s.timezone) if s.timezone else NEPAL
        today_in_tz = timezone.localtime(timezone.now(), tz).date()
        days_remaining = (exam_date - today_in_tz).days
        countdown = {
            'source': 'schedule', 'schedule_id': s.id, 'scope': scope, 'title': title, 'exam_date': exam_date.isoformat(),
            'exam_time': s.exam_time.isoformat() if s.exam_time else None,
            'days_remaining': days_remaining, 'notice_url': s.official_notice_url or None,
        }
    elif prep.plan and prep.plan.target_date and prep.plan.target_date >= today and prep.plan.exam_id in prep.exam_ids:
        exam_date = prep.plan.target_date
        countdown = {
            'source': 'student_target', 'scope': 'student', 'title': 'Your own target date', 'exam_date': exam_date.isoformat(),
            'exam_time': None, 'days_remaining': (exam_date - today).days, 'notice_url': None,
        }
    else:
        return None, {
            'status': None, 'label': None,
            'reason': 'No upcoming exam schedule configured.',
            'admin_reason': 'No exam date configured for this course.',
        }

    # ---- pace: expected progress by today vs actual
    start = prep.start_date
    first_activity = min((t['first_activity'] for t in stats['topics'] if t['first_activity']), default=None)
    if start is None and first_activity:
        start = first_activity.astimezone(NEPAL).date()
    if start is None:
        return countdown, {'status': None, 'label': None,
                           'reason': 'Not enough history yet - start studying and your pace will appear here.',
                           'admin_reason': 'Not enough history to measure pace yet.'}
    if overall_percent is None:
        # A syllabus with no questions or notes cannot be "behind" - nothing measurable exists yet.
        return countdown, {'status': None, 'label': None,
                           'reason': 'This syllabus has no questions or notes yet, so progress cannot be compared with the exam date.',
                           'admin_reason': 'The syllabus has no questions or notes yet, so pace cannot be measured.'}
    total_days = (exam_date - start).days
    if total_days <= 0:
        return countdown, {'status': None, 'label': None, 'reason': 'The preparation window is too short to compare progress.',
                           'admin_reason': 'The preparation window is too short to compare progress.'}
    elapsed = max(0, min(total_days, (today - start).days))
    expected = round(elapsed * 100.0 / total_days)
    actual = overall_percent or 0
    gap = expected - actual
    if gap <= ON_TRACK_TOLERANCE:
        status, label = 'on_track', 'On Track'
    elif gap <= SLIGHTLY_BEHIND_TOLERANCE:
        status, label = 'slightly_behind', 'Slightly Behind'
    else:
        status, label = 'needs_attention', 'Needs Attention'
    return countdown, {
        'status': status, 'label': label,
        'expected_percent': expected, 'actual_percent': actual, 'elapsed_days': elapsed, 'total_days': total_days,
        'start_date': start.isoformat(),
        'reason': (f'{elapsed} of {total_days} days of your preparation window have passed, so about {expected}% of the '
                   f'syllabus should be covered. You are at {actual}%.'),
        'admin_reason': (f'{elapsed} of {total_days} days of the preparation window have passed: about {expected}% expected, '
                         f'{actual}% completed.'),
        'rule': (f'On Track: at most {ON_TRACK_TOLERANCE} points behind the expected pace. Slightly Behind: '
                 f'{ON_TRACK_TOLERANCE + 1}-{SLIGHTLY_BEHIND_TOLERANCE} points behind. Needs Attention: more than '
                 f'{SLIGHTLY_BEHIND_TOLERANCE} points behind.'),
    }


# --------------------------------------------------------------------------
# Weak topics, revision, recommendations
# --------------------------------------------------------------------------
def weak_topics(prep, stats, limit=5, with_repeated=True):
    from exams.models import QuestionMastery
    weak = [t for t in stats['topics']
            if t['attempts'] >= WEAK_TOPIC_MIN_ANSWERED and t['accuracy'] is not None
            and t['accuracy'] < WEAK_TOPIC_ACCURACY_THRESHOLD]
    weak.sort(key=lambda t: (t['accuracy'], -t['attempts']))
    weak = weak[:limit]
    repeated = {}
    if weak and with_repeated:
        repeated = dict(
            QuestionMastery.objects.filter(user=prep.user, question__topic_id__in=[t['id'] for t in weak],
                                           consecutive_incorrect__gte=2)
            .order_by().values_list('question__topic_id').annotate(n=Count('id'))
        )
    out = []
    for t in weak:
        out.append({
            'id': t['id'], 'name': t['name'], 'subject': t['subject'], 'chapter': t['chapter'],
            'accuracy': t['accuracy'], 'attempts': t['attempts'],
            'exam_accuracy': t['exam_accuracy'], 'exam_attempts': t['exam_attempts'],
            'repeated_incorrect': repeated.get(t['id'], 0),
            'available_questions': t['available_questions'],
            'practice_url': practice_url(prep, t, min(prep.preferences['daily_questions'], 20)) if t['available_questions'] else None,
            'notes_url': f"/student/notes/{t['first_material_id']}" if t['first_material_id'] else None,
            'review_url': '/student/practice/revision?focus=weak_topics',
        })
    return {
        'topics': out,
        'rule': f'A topic is weak once you have answered at least {WEAK_TOPIC_MIN_ANSWERED} of its questions '
                f'(practice and mock exams) and got fewer than {WEAK_TOPIC_ACCURACY_THRESHOLD}% right.',
    }


def revision_queue(prep):
    from exams.models import QuestionMastery
    from exams.selection_service import QuestionSelectionService

    svc = QuestionSelectionService()
    pool = svc.apply_filters(svc.get_base_queryset(), exam_ids=prep.exam_ids, question_type='objective') \
        .order_by().values('id')
    today_start, tomorrow_start = day_bounds(local_today())
    after_tomorrow = tomorrow_start + datetime.timedelta(days=1)
    agg = QuestionMastery.objects.filter(
        user=prep.user, question_id__in=pool, times_answered__gt=0, next_review_at__isnull=False
    ).aggregate(
        total=Count('id'),
        due_today=Count('id', filter=Q(next_review_at__lt=tomorrow_start)),
        due_tomorrow=Count('id', filter=Q(next_review_at__gte=tomorrow_start, next_review_at__lt=after_tomorrow)),
        later=Count('id', filter=Q(next_review_at__gte=after_tomorrow)),
        # A completed revision is a question that was DUE and was answered today
        # (recorded by QuestionMastery.record_answer). Answering a question that
        # was not due - or for the first time - is practice, not revision.
        reviewed_today=Count('id', filter=Q(last_due_review_at__gte=today_start, last_due_review_at__lt=tomorrow_start)),
    )
    # Reviewing moves a question out of "due", so what was due when today
    # began is what is still due plus what has been reviewed since.
    agg['due_total_today'] = agg['due_today'] + agg['reviewed_today']
    return agg


def practice_url(prep, topic, n):
    return (f"/student/practice/session?exam={prep.exam.id}&subject={topic['subject_id']}&topic={topic['id']}"
            f"&diff=all&q={max(1, n)}&mode=flexible")


def recommended_mock(prep):
    from courses.access import active_enrollments
    from exams.models import Examination

    now = timezone.now()
    qs = (
        Examination.objects.filter(status__in=('published', 'live'), exam_id__in=prep.exam_ids,
                                   exam_type__in=('mock', 'full', 'position'))
        .filter(Q(course__isnull=True) | Q(course_id__in=active_enrollments(prep.user).values('course_id')))
        .filter(Q(end_time__isnull=True) | Q(end_time__gt=now))
        .annotate(mine=Count('attempts', filter=Q(attempts__student=prep.user)))
    )
    return pick_mock(qs.order_by('start_time', 'id'), lambda e: e.mine, now)


def pick_mock(examinations, attempts_of, now):
    """The first candidate (already in the platform's order) the student can still
    attempt. Shared by the student page and the admin task summary."""
    for e in examinations:
        if e.max_attempts and attempts_of(e) >= e.max_attempts:
            continue
        started = e.start_time is None or e.start_time <= now
        return {
            'id': e.id, 'title': e.title, 'total_questions': e.total_questions, 'time_limit': e.time_limit,
            'total_marks': e.total_marks, 'available_now': started,
            'starts_at': None if started else e.start_time.isoformat(),
            'url': f'/student/exams/{e.id}',
        }
    return None


def recommended_practice(prep, stats, weak):
    """One practice suggestion. Questions come from the normal Practice flow
    (QuestionSelectionService via the practice session the link opens)."""
    n_pref = prep.preferences['daily_questions']
    if weak['topics']:
        t = weak['topics'][0]
        if t['practice_url']:
            return {'topic_id': t['id'], 'topic': t['name'], 'subject': t['subject'],
                    'questions': min(n_pref, t['available_questions'], 20), 'url': t['practice_url'],
                    'reason': f"Your accuracy here is {t['accuracy']}% over {t['attempts']} answers."}
    candidates = [t for t in stats['topics'] if t['available_questions']]
    started = [t for t in candidates if t['started'] and (t['percent'] or 0) < 100]
    pool = started or [t for t in candidates if not t['started']]
    if not pool:
        return None
    # least covered first
    t = min(pool, key=lambda x: (x['percent'] or 0))
    return {'topic_id': t['id'], 'topic': t['name'], 'subject': t['subject'],
            'questions': min(n_pref, t['available_questions'], 20), 'url': practice_url(prep, t, min(n_pref, t['available_questions'], 20)),
            'reason': ("You have answered %d%% of this topic's questions so far." % (t['percent'] or 0)) if t['started']
            else 'You have not started this topic yet.'}


# --------------------------------------------------------------------------
# Today's plan
# --------------------------------------------------------------------------
def apply_activity(tasks, practice_answers, touched_topics, finished_exams):
    """The one rule for task completion, shared by the student page (one
    student, `activity_today`) and the admin summary (many students):

      PRACTICE  done when the student answered the task's target number of
                questions in that topic today
      STUDY     done when notes of the topic were opened today
      MOCK_EXAM done when that exam was submitted today
      REVISION  already set from the revision queue in build_tasks
    """
    for t in tasks:
        if t['type'] == 'PRACTICE':
            n = practice_answers.get(t['topic']['id'], 0)
            t['done'] = min(n, t['target'])
            t['completed'] = n >= t['target']
        elif t['type'] == 'STUDY':
            t['completed'] = t['topic']['id'] in touched_topics
        elif t['type'] == 'MOCK_EXAM':
            t['completed'] = int(t['id'].split(':')[1]) in finished_exams
    return tasks


def activity_today(prep, stats, tasks):
    """Fill in real completion for `tasks` from today's activity - each kind
    of activity is only looked up if a task of that kind exists."""
    from exams.models import ExaminationAttempt, QuestionAttempt
    from notes.models import StudentMaterialProgress

    start, end = day_bounds(local_today())
    topic_ids = [t['id'] for t in stats['topics']]
    types = {t['type'] for t in tasks}
    answers, touched, finished = {}, set(), set()

    if 'PRACTICE' in types:
        when = Coalesce('viewed_at', 'session__created_at')
        answers = {r['question__topic_id']: r['n'] for r in (
            QuestionAttempt.objects.filter(session__user=prep.user, question__topic_id__in=topic_ids,
                                           selected_option__isnull=False).exclude(selected_option='')
            .annotate(at=when).filter(at__gte=start, at__lt=end)
            .values('question__topic_id').annotate(n=Count('id')))}
    if 'STUDY' in types:
        touched = set(StudentMaterialProgress.objects.filter(
            student=prep.user, last_viewed_at__gte=start, last_viewed_at__lt=end,
            material__topic_id__in=topic_ids).values_list('material__topic_id', flat=True))
    if 'MOCK_EXAM' in types:
        finished = set(ExaminationAttempt.objects.filter(
            student=prep.user, submitted_at__gte=start, submitted_at__lt=end,
            examination__exam_id__in=prep.exam_ids).values_list('examination_id', flat=True))
    return apply_activity(tasks, answers, touched, finished)


def plan_stats(stats):
    """The evidence as it stood when today began (see load_stats)."""
    return {'topics': stats['before'], 'by_id': {t['id']: t for t in stats['before']}}


def build_tasks(prep, stats, weak, revision, mock, countdown, skip_topics=()):
    """Deterministic, explainable task list, in priority order:

      1  Weak topic            practice it (sooner if the exam is close)
      2  Revision due          answers waiting in your revision queue
      3  Continue             the topic you last worked on
      4  Not started           the next syllabus topic with notes or questions
      5  General practice      top up to your daily question target
      +  Mock exam             suggested once the exam is <= 14 days away

    Tasks are added in that order until the daily minutes are used (a
    question is estimated at 1 minute, a notes task at 20). Completion is
    read from real activity today - nothing is ticked manually.
    """
    prefs = prep.preferences
    budget = prefs['daily_minutes']
    nq = prefs['daily_questions']
    days_left = countdown['days_remaining'] if countdown else None
    close = days_left is not None and days_left <= 30
    tasks, used, practice_total = [], 0, 0
    topics = {t['id']: t for t in stats['topics']}
    skip = set(skip_topics)

    def add(task, minutes, counts_toward_budget=True):
        nonlocal used
        if counts_toward_budget and tasks and used + minutes > budget:
            return False
        if len(tasks) >= MAX_TASKS:
            return False
        task['minutes'] = minutes
        task['priority'] = len(tasks) + 1
        tasks.append(task)
        if counts_toward_budget:
            used += minutes
        return True

    def practice_task(t, n, reason, ptype='PRACTICE', admin_reason=None):
        return {
            'id': f"practice:{t['id']}", 'type': ptype, 'title': f"Practice {n} MCQs — {t['name']}",
            'detail': f"{t['subject']} › {t['chapter']}", 'reason': reason, 'admin_reason': admin_reason or reason,
            'topic': {'id': t['id'], 'name': t['name']}, 'target': n, 'done': 0,
            'completed': False,
            'action': {'label': 'Start Practice', 'url': practice_url(prep, t, n)},
        }

    # 1. weak topics
    for w in weak['topics'][:2]:
        t = topics.get(w['id'])
        if not t or t['id'] in skip or not t['available_questions']:
            continue
        n = min(nq, t['available_questions'], 20)
        why = f"Weak topic: {w['accuracy']}% correct over {w['attempts']} answers"
        admin_why = why
        if close:
            why += f", and your exam is in {days_left} days"
            admin_why += f"; exam in {days_left} days"
        if add(practice_task(t, n, why, admin_reason=admin_why), n * MINUTES_PER_QUESTION):
            practice_total += n

    # 2. revision due
    reviewed = revision.get('reviewed_today', 0)
    due = revision['due_today'] + reviewed        # everything that was due today, reviewed or not
    if due:
        n = min(due, 10)
        add({
            'id': 'revision', 'type': 'REVISION', 'title': f'Revise {n} question{"s" if n != 1 else ""} due for revision today',
            'detail': f'{due} due today · {reviewed} reviewed',
            'reason': 'These are questions from your revision queue whose review date is today or earlier',
            'admin_reason': 'Revision questions due today',
            'topic': None, 'target': n, 'done': min(reviewed, n), 'completed': reviewed >= n,
            'action': {'label': 'Start Revision', 'url': '/student/practice/revision'},
        }, n * MINUTES_PER_QUESTION)

    # 3. continue where you left off
    active = [t for t in stats['topics'] if t['status'] == 'in_progress' and t['last_activity'] and t['id'] not in skip]
    active.sort(key=lambda t: t['last_activity'], reverse=True)
    if active:
        t = active[0]
        if t['materials'] and (t['materials_done_pct'] or 0) < 100 and t['first_material_id']:
            add({
                'id': f"study:{t['id']}", 'type': 'STUDY', 'title': f"Continue notes — {t['name']}",
                'detail': f"{t['subject']} › {t['chapter']}", 'reason': 'The topic you worked on most recently',
                'admin_reason': 'Most recently studied topic',
                'topic': {'id': t['id'], 'name': t['name']}, 'target': None, 'done': None, 'completed': False,
                'action': {'label': 'Continue', 'url': f"/student/notes/{t['first_material_id']}"},
            }, STUDY_NOTE_MINUTES)
        elif t['available_questions'] and t['id'] not in {w['id'] for w in weak['topics'][:2]}:
            n = min(nq, t['available_questions'], 20)
            if add(practice_task(t, n, 'The topic you worked on most recently', admin_reason='Most recently studied topic'), n * MINUTES_PER_QUESTION):
                practice_total += n

    # 4. next not-started topic
    fresh = [t for t in stats['topics'] if t['status'] == 'not_started' and t['id'] not in skip]
    if fresh:
        t = fresh[0]
        if t['materials'] and t['first_material_id']:
            add({
                'id': f"study:{t['id']}", 'type': 'STUDY', 'title': f"Study notes — {t['name']}",
                'detail': f"{t['subject']} › {t['chapter']}", 'reason': 'Next topic in your syllabus you have not started',
                'admin_reason': 'Next unstarted topic in the syllabus',
                'topic': {'id': t['id'], 'name': t['name']}, 'target': None, 'done': None,
                'completed': False,
                'action': {'label': 'Open Notes', 'url': f"/student/notes/{t['first_material_id']}"},
            }, STUDY_NOTE_MINUTES)
        elif t['available_questions']:
            n = min(nq, t['available_questions'], 20)
            if add(practice_task(t, n, 'Next topic in your syllabus you have not started', admin_reason='Next unstarted topic in the syllabus'), n * MINUTES_PER_QUESTION):
                practice_total += n

    # 5. top up to the daily question target
    remaining = nq - practice_total
    if remaining >= 5:
        used_topics = {tk['topic']['id'] for tk in tasks if tk['topic']}
        pool = [t for t in stats['topics'] if t['available_questions'] and t['id'] not in used_topics and t['id'] not in skip]
        if pool:
            t = min(pool, key=lambda x: (x['percent'] or 0))
            n = min(remaining, t['available_questions'], 20)
            add(practice_task(t, n, 'Tops up your daily target of %d questions' % nq, admin_reason='Tops up the daily question target (%d)' % nq), n * MINUTES_PER_QUESTION)

    # mock exam close to the exam
    if mock and mock['available_now'] and days_left is not None and days_left <= MOCK_WINDOW_DAYS:
        add({
            'id': f"mock:{mock['id']}", 'type': 'MOCK_EXAM', 'title': f"Take a mock exam — {mock['title']}",
            'detail': f"{mock['total_questions']} questions · {mock['time_limit']} minutes",
            'reason': f'Your exam is {days_left} days away', 'admin_reason': f'Exam is {days_left} days away', 'topic': None, 'target': None, 'done': None,
            'completed': False,
            'action': {'label': 'Start Mock', 'url': mock['url']},
        }, mock['time_limit'] or 0, counts_toward_budget=False)
    return tasks


def today_plan(prep, stats, weak_before, weak_now, revision, mock, countdown):
    tasks = activity_today(prep, stats, build_tasks(prep, plan_stats(stats), weak_before, revision, mock, countdown))
    done_topics = {t['topic']['id'] for t in tasks if t['completed'] and t['topic']}
    tomorrow_rev = dict(revision, due_today=revision['due_today'] + revision['due_tomorrow'], reviewed_today=0)
    tomorrow_tasks = build_tasks(prep, stats, weak_now, tomorrow_rev, mock, countdown, skip_topics=done_topics)[:3]
    today = local_today()
    completed = len([t for t in tasks if t['completed']])
    return {
        'date': today.isoformat(),
        'is_study_day': prep.is_study_day(today),
        'tasks': tasks,
        'progress': {'completed': completed, 'total': len(tasks),
                     'percent': round(completed * 100 / len(tasks)) if tasks else 0},
        'tomorrow': [{'id': t['id'], 'type': t['type'], 'title': t['title'], 'action': t['action']} for t in tomorrow_tasks],
        'budget_minutes': prep.preferences['daily_minutes'],
        'planned_minutes': sum(t['minutes'] for t in tasks if t['type'] != 'MOCK_EXAM'),
        'rules': [
            'Weak topics come first (sooner still when your exam is within 30 days).',
            'Then revision questions that are due, the topic you last worked on, and the next topic you have not started.',
            'Then practice to reach your daily question target.',
            f'A mock exam is suggested once your exam is {MOCK_WINDOW_DAYS} days away or closer.',
            'Time is estimated at 1 minute per question and 20 minutes per notes task. '
            'A task is complete when the real activity happens - you never tick it yourself.',
        ],
    }


def continue_learning(prep, stats):
    latest = [t for t in stats['topics'] if t['last_activity']]
    if not latest:
        return None
    t = max(latest, key=lambda x: x['last_activity'])
    if t['materials'] and t['first_material_id'] and (t['materials_done_pct'] or 0) < 100:
        action = {'label': 'Continue', 'url': f"/student/notes/{t['first_material_id']}"}
    elif t['available_questions']:
        action = {'label': 'Practice', 'url': practice_url(prep, t, min(prep.preferences['daily_questions'], t['available_questions'], 20))}
    else:
        action = {'label': 'Open Syllabus', 'url': '/student/syllabus'}
    return {'topic_id': t['id'], 'topic': t['name'], 'chapter': t['chapter'], 'subject': t['subject'],
            'percent': t['percent'], 'last_activity': t['last_activity'].isoformat(), 'action': action}


# --------------------------------------------------------------------------
# Week
# --------------------------------------------------------------------------
def week_overview(prep):
    from exams.models import ExaminationAttempt, PracticeSession, QuestionAttempt, StudentAnswer
    from gamification.models import GamificationProfile

    today = local_today()
    monday = today - datetime.timedelta(days=today.weekday())
    start, _ = day_bounds(monday)
    end = start + datetime.timedelta(days=7)
    from exams.models import Topic
    topic_ids = list(Topic.objects.filter(chapter__subject__paper__exam_id__in=prep.exam_ids).values_list('id', flat=True))
    per_day = defaultdict(int)
    if topic_ids:
        when = Coalesce('viewed_at', 'session__created_at')
        for r in (QuestionAttempt.objects.filter(session__user=prep.user, question__topic_id__in=topic_ids,
                                                 selected_option__isnull=False).exclude(selected_option='')
                  .annotate(at=when).filter(at__gte=start, at__lt=end)
                  .annotate(d=TruncDate('at', tzinfo=NEPAL)).values('d').annotate(n=Count('id'))):
            per_day[r['d']] += r['n']
        for r in (StudentAnswer.objects.filter(attempt__student=prep.user, question__topic_id__in=topic_ids,
                                               attempt__submitted_at__gte=start, attempt__submitted_at__lt=end,
                                               selected_option__isnull=False).exclude(selected_option='')
                  .annotate(d=TruncDate('attempt__submitted_at', tzinfo=NEPAL)).values('d').annotate(n=Count('id'))):
            per_day[r['d']] += r['n']
    target = prep.preferences['daily_questions']
    days = []
    for i in range(7):
        d = monday + datetime.timedelta(days=i)
        study_day = prep.is_study_day(d)
        n = per_day.get(d, 0)
        if d > today or not study_day and n == 0:
            state, pct = 'none', None
        else:
            pct = min(100, round(n * 100 / target)) if target else None
            state = 'done' if pct is not None and pct >= 100 else ('partial' if n else 'missed' if d < today else 'open')
        days.append({'date': d.isoformat(), 'label': WEEKDAYS[i][:3], 'is_today': d == today, 'is_study_day': study_day,
                     'questions': n, 'percent': pct, 'state': state})

    tests = ExaminationAttempt.objects.filter(
        student=prep.user, submitted_at__gte=start, submitted_at__lt=end, examination__exam_id__in=prep.exam_ids
    ).aggregate(s=Sum('time_taken_seconds'))['s'] or 0
    timed = PracticeSession.objects.filter(
        user=prep.user, created_at__gte=start, created_at__lt=end, exam_id__in=prep.exam_ids, time_taken_seconds__gt=0
    ).aggregate(s=Sum('time_taken_seconds'))['s'] or 0
    recorded = tests + timed
    profile = GamificationProfile.objects.filter(user=prep.user).values('study_current_streak', 'study_highest_streak').first()
    return {
        'days': days,
        'questions_this_week': sum(per_day.values()),
        'streak': {'current': profile['study_current_streak'] if profile else 0,
                   'highest': profile['study_highest_streak'] if profile else 0},
        'study_time': {
            'label': 'Tracked Practice & Exam Time',
            'recorded_minutes': round(recorded / 60) if recorded else 0,
            'available': bool(recorded),
            'note': ('Time recorded in timed practice sessions and mock exams. Time spent reading notes, watching '
                     'lessons or in untimed practice is not measured, so this is not your total study time.'),
        },
    }
