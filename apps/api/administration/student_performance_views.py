"""Admin — Student Performance & Detailed Exam Review.

Every figure here is aggregated in the database from the canonical chain:

    Examination → ExaminationQuestion → Question
    Examination → ExaminationAttempt → StudentAnswer

Conventions reused from the existing codebase rather than reinvented:

  * skipped        StudentAnswer.selected_option IS NULL / ''
                   (administration/exam_views.py question performance)
  * weak area      accuracy < 60%
                   (analytics/services/teacher_analytics_service.py)
  * completed      attempt.status in ('submitted', 'evaluated')

A question that a student never touched may have no StudentAnswer row at all.
The per-attempt review enumerates ExaminationQuestion and left-joins the answer
so those still show as SKIPPED instead of vanishing.
"""
from django.core.paginator import Paginator
from django.db.models import Avg, Count, F, Max, Min, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import User
from courses.models import Enrollment
from exams.models import (
    ExaminationAttempt, ExaminationQuestion, PracticeSession, Question,
    QuestionAttempt, StudentAnswer,
)
from .permissions import IsAdminUser

COMPLETED_STATUSES = ('submitted', 'evaluated')
WEAK_ACCURACY_THRESHOLD = 60
# A single answer is too thin a basis to call an area weak.
MIN_ANSWERS_FOR_AREA = 3

# Reused everywhere so "skipped" means one thing across this module.
SKIPPED_Q = Q(selected_option__isnull=True) | Q(selected_option='')


def _pct(part, whole):
    return round((part / whole) * 100, 2) if whole else 0.0


def _get_student(pk):
    return User.objects.filter(pk=pk, role='student').select_related(
        'gamification_profile'
    ).first()


def _answer_breakdown(rows):
    """Turn an annotated aggregate row into the shared correct/incorrect/skipped shape."""
    attempted = rows.get('attempted', 0) or 0
    correct = rows.get('correct', 0) or 0
    skipped = rows.get('skipped', 0) or 0
    incorrect = max(0, attempted - correct - skipped)
    # Accuracy is measured against questions actually answered, so skipping
    # does not flatter the number.
    answered = attempted - skipped
    return {
        'questions_attempted': attempted,
        'correct': correct,
        'incorrect': incorrect,
        'skipped': skipped,
        'accuracy': _pct(correct, answered),
    }


class AdminStudentPerformanceView(APIView):
    """GET /api/admin/students/{id}/performance/"""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        student = _get_student(pk)
        if not student:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(student, 'gamification_profile', None)

        # ── Exam performance ─────────────────────────────────────────────────
        attempts = ExaminationAttempt.objects.filter(student=student)
        completed = attempts.filter(status__in=COMPLETED_STATUSES)

        exam_totals = completed.aggregate(
            total_completed=Count('id'),
            average_score=Coalesce(Avg('score'), Value(0.0)),
            average_percentage=Coalesce(Avg('percentage'), Value(0.0)),
            highest_score=Coalesce(Max('percentage'), Value(0.0)),
            lowest_score=Coalesce(Min('percentage'), Value(0.0)),
            average_time=Coalesce(Avg('time_taken_seconds'), Value(0.0)),
            total_time=Coalesce(Sum('time_taken_seconds'), Value(0)),
        )
        pass_count = completed.filter(passed=True).count()
        total_completed = exam_totals['total_completed']

        # ── Answer-level aggregates, one query each ──────────────────────────
        answers = StudentAnswer.objects.filter(
            attempt__student=student, attempt__status__in=COMPLETED_STATUSES
        )

        overall = answers.aggregate(
            attempted=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            skipped=Count('id', filter=SKIPPED_Q),
        )
        overall_breakdown = _answer_breakdown(overall)

        subject_rows = answers.values(
            subject_id=F('question__topic__chapter__subject__id'),
            subject_name=F('question__topic__chapter__subject__name'),
        ).annotate(
            attempted=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            skipped=Count('id', filter=SKIPPED_Q),
            marks_obtained=Coalesce(Sum('marks_awarded'), Value(0.0)),
            marks_possible=Coalesce(Sum('question__marks'), Value(0.0)),
        ).order_by()

        subjects = []
        for row in subject_rows:
            if row['subject_id'] is None:
                continue
            entry = _answer_breakdown(row)
            entry.update({
                'subject_id': row['subject_id'],
                'subject_name': row['subject_name'],
                'average_score': _pct(row['marks_obtained'], row['marks_possible']),
            })
            subjects.append(entry)
        subjects.sort(key=lambda s: s['accuracy'], reverse=True)

        topic_rows = answers.values(
            topic_id=F('question__topic__id'),
            topic_name=F('question__topic__name'),
            chapter_name=F('question__topic__chapter__title'),
            topic_subject=F('question__topic__chapter__subject__name'),
        ).annotate(
            attempted=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            skipped=Count('id', filter=SKIPPED_Q),
            marks_obtained=Coalesce(Sum('marks_awarded'), Value(0.0)),
            marks_possible=Coalesce(Sum('question__marks'), Value(0.0)),
        ).order_by()

        topics = []
        for row in topic_rows:
            if row['topic_id'] is None:
                continue
            entry = _answer_breakdown(row)
            entry.update({
                'topic_id': row['topic_id'],
                'topic_name': row['topic_name'],
                'chapter_name': row['chapter_name'],
                'subject_name': row['topic_subject'],
                'total_marks': row['marks_possible'],
                'marks_obtained': row['marks_obtained'],
            })
            topics.append(entry)
        topics.sort(key=lambda t: t['accuracy'], reverse=True)

        # Only areas with enough evidence are labelled strong or weak.
        judged = [t for t in topics
                  if (t['questions_attempted'] - t['skipped']) >= MIN_ANSWERS_FOR_AREA]
        weak_topics = [t for t in judged if t['accuracy'] < WEAK_ACCURACY_THRESHOLD]
        strong_topics = [t for t in judged if t['accuracy'] >= WEAK_ACCURACY_THRESHOLD]
        weak_topics.sort(key=lambda t: t['accuracy'])

        judged_subjects = [s for s in subjects
                           if (s['questions_attempted'] - s['skipped']) >= MIN_ANSWERS_FOR_AREA]
        # "Best" and "weakest" are comparisons, so they need at least two
        # subjects to compare. With one, naming it both would be nonsense.
        if len(judged_subjects) >= 2:
            best_subject, weakest_subject = judged_subjects[0], judged_subjects[-1]
        else:
            best_subject = weakest_subject = None

        # ── Mistake analysis, straight from wrong/skipped counts ─────────────
        difficulty_rows = answers.values('question__difficulty').annotate(
            attempted=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            skipped=Count('id', filter=SKIPPED_Q),
        ).order_by()
        by_difficulty = []
        for row in difficulty_rows:
            if not row['question__difficulty']:
                continue
            entry = _answer_breakdown(row)
            entry['difficulty'] = row['question__difficulty']
            by_difficulty.append(entry)
        by_difficulty.sort(key=lambda d: d['accuracy'])

        # ── Practice performance (PracticeSession is already aggregated) ──────
        sessions = PracticeSession.objects.filter(user=student)
        practice_totals = sessions.aggregate(
            total_sessions=Count('id'),
            completed_sessions=Count('id', filter=Q(completed=True)),
            average_score=Coalesce(Avg('score', filter=Q(completed=True)), Value(0.0)),
            average_accuracy=Coalesce(Avg('accuracy', filter=Q(completed=True)), Value(0.0)),
            questions_attempted=Coalesce(Sum('total_questions'), Value(0)),
            correct=Coalesce(Sum('correct_count'), Value(0)),
            incorrect=Coalesce(Sum('incorrect_count'), Value(0)),
            skipped=Coalesce(Sum('unanswered_count'), Value(0)),
            total_time=Coalesce(Sum('time_taken_seconds'), Value(0)),
        )

        # ── Trend: real completed attempts, oldest first ─────────────────────
        trend_rows = completed.select_related('examination').order_by('started_at')[:50]
        trend = [{
            'attempt_id': a.id,
            'exam_title': a.examination.title if a.examination else None,
            'percentage': round(a.percentage or 0, 2),
            'score': a.score,
            'passed': a.passed,
            'date': (a.submitted_at or a.started_at).isoformat(),
        } for a in trend_rows]

        # An improvement figure needs two halves to compare; below that, none.
        improvement = None
        if len(trend) >= 4:
            midpoint = len(trend) // 2
            first_half = [t['percentage'] for t in trend[:midpoint]]
            second_half = [t['percentage'] for t in trend[midpoint:]]
            improvement = round(
                (sum(second_half) / len(second_half)) - (sum(first_half) / len(first_half)), 2
            )

        recent = completed.select_related('examination').order_by('-started_at')[:5]

        active_courses = Enrollment.objects.filter(
            student=student, status='active'
        ).select_related('course')

        return Response({
            'student': {
                'id': student.id,
                'username': student.username,
                'full_name': student.get_full_name() or student.username,
                'email': student.email,
                'avatar': student.avatar,
                'xp': getattr(profile, 'xp', 0),
                'level': getattr(profile, 'level', 1),
                'streak': getattr(profile, 'study_current_streak', 0),
                'highest_streak': getattr(profile, 'study_highest_streak', 0),
                'joined_date': student.date_joined.isoformat(),
                'active_courses': [
                    {'id': e.course_id, 'title': e.course.title} for e in active_courses
                ],
            },
            'exam_performance': {
                'total_attempted': attempts.count(),
                'total_completed': total_completed,
                'in_progress': attempts.filter(status='in-progress').count(),
                'average_score': round(exam_totals['average_score'], 2),
                'average_percentage': round(exam_totals['average_percentage'], 2),
                'highest_score': round(exam_totals['highest_score'], 2),
                'lowest_score': round(exam_totals['lowest_score'], 2),
                'pass_count': pass_count,
                'fail_count': max(0, total_completed - pass_count),
                'average_time_seconds': int(exam_totals['average_time']),
                'total_time_seconds': exam_totals['total_time'],
                'recent_exams': [{
                    'attempt_id': a.id,
                    'exam_title': a.examination.title if a.examination else None,
                    'percentage': round(a.percentage or 0, 2),
                    'passed': a.passed,
                    'date': (a.submitted_at or a.started_at).isoformat(),
                } for a in recent],
                **overall_breakdown,
            },
            'practice_performance': {
                'total_sessions': practice_totals['total_sessions'],
                'completed_sessions': practice_totals['completed_sessions'],
                'average_score': round(practice_totals['average_score'], 2),
                'accuracy': round(practice_totals['average_accuracy'], 2),
                'questions_attempted': practice_totals['questions_attempted'],
                'correct': practice_totals['correct'],
                'incorrect': practice_totals['incorrect'],
                'skipped': practice_totals['skipped'],
                'total_time_seconds': practice_totals['total_time'],
            },
            'subjects': subjects,
            'topics': topics,
            'strong_topics': strong_topics[:10],
            'weak_topics': weak_topics[:10],
            'mistake_analysis': {
                'by_difficulty': by_difficulty,
                'weakest_subject': weakest_subject,
                'best_subject': best_subject,
                'weakest_topic': weak_topics[0] if weak_topics else None,
                'total_wrong': overall_breakdown['incorrect'],
                'total_skipped': overall_breakdown['skipped'],
            },
            'trend': {
                'points': trend,
                'improvement': improvement,
            },
            'meta': {
                'weak_accuracy_threshold': WEAK_ACCURACY_THRESHOLD,
                'min_answers_for_area': MIN_ANSWERS_FOR_AREA,
                # Stated so the UI never implies exam timing it does not have.
                'per_question_timing_available': {'exam': False, 'practice': True},
            },
        })


class AdminStudentExamHistoryView(APIView):
    """GET /api/admin/students/{id}/exam-history/

    Filters: status (completed|in-progress), result (passed|failed),
             exam_type, examination, date_from, date_to, page, page_size
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        student = _get_student(pk)
        if not student:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = ExaminationAttempt.objects.filter(student=student).select_related('examination')

        status_filter = (request.query_params.get('status') or '').strip()
        if status_filter == 'completed':
            qs = qs.filter(status__in=COMPLETED_STATUSES)
        elif status_filter == 'in-progress':
            qs = qs.filter(status='in-progress')

        result = (request.query_params.get('result') or '').strip()
        if result == 'passed':
            qs = qs.filter(status__in=COMPLETED_STATUSES, passed=True)
        elif result == 'failed':
            qs = qs.filter(status__in=COMPLETED_STATUSES, passed=False)

        exam_type = (request.query_params.get('exam_type') or '').strip()
        if exam_type:
            qs = qs.filter(examination__exam_type=exam_type)

        examination_id = request.query_params.get('examination')
        if examination_id:
            try:
                qs = qs.filter(examination_id=int(examination_id))
            except (TypeError, ValueError):
                return Response({'error': 'examination must be a number.'},
                                status=status.HTTP_400_BAD_REQUEST)

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(started_at__date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(started_at__date__lte=date_to)

        # Per-attempt answer counts, annotated so the list stays one query.
        qs = qs.annotate(
            answered=Count('answers'),
            correct=Count('answers', filter=Q(answers__is_correct=True)),
            skipped=Count('answers', filter=(
                Q(answers__selected_option__isnull=True) | Q(answers__selected_option='')
            )),
        ).order_by('-started_at')

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

        results = []
        for a in page.object_list:
            incorrect = max(0, a.answered - a.correct - a.skipped)
            results.append({
                'attempt_id': a.id,
                'examination_id': a.examination_id,
                'exam_title': a.examination.title if a.examination else None,
                'exam_type': a.examination.exam_type if a.examination else None,
                'status': a.status,
                'score': a.score,
                'percentage': round(a.percentage or 0, 2),
                'passed': a.passed,
                'correct': a.correct,
                'incorrect': incorrect,
                'skipped': a.skipped,
                'time_taken_seconds': a.time_taken_seconds,
                'started_at': a.started_at.isoformat(),
                'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
            })

        return Response({
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'results': results,
        })


class AdminExamAttemptReviewView(APIView):
    """GET /api/admin/exam-attempts/{id}/review/

    Question-by-question review. Enumerates the exam's questions so a question
    the student never opened still appears, marked SKIPPED.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        attempt = ExaminationAttempt.objects.filter(pk=pk).select_related(
            'examination', 'student'
        ).first()
        if not attempt:
            return Response({'error': 'Exam attempt not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        # One query for the exam's questions, one for the student's answers.
        exam_questions = ExaminationQuestion.objects.filter(
            examination_id=attempt.examination_id
        ).select_related(
            'question', 'question__topic', 'question__topic__chapter',
            'question__topic__chapter__subject',
        ).order_by('order', 'id')

        answers = {
            a.question_id: a
            for a in StudentAnswer.objects.filter(attempt=attempt)
        }

        questions = []
        tally = {'correct': 0, 'incorrect': 0, 'skipped': 0}

        for index, eq in enumerate(exam_questions, start=1):
            q = eq.question
            answer = answers.get(q.id)
            selected = (answer.selected_option or '').strip().upper() if answer else ''

            if not selected:
                verdict = 'skipped'
            elif answer.is_correct:
                verdict = 'correct'
            else:
                verdict = 'incorrect'
            tally[verdict] += 1

            topic = getattr(q, 'topic', None)
            chapter = getattr(topic, 'chapter', None)
            subject = getattr(chapter, 'subject', None)

            questions.append({
                'number': index,
                'question_id': q.id,
                'reference': q.question_id,
                'text': q.text,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'subject': subject.name if subject else None,
                'chapter': chapter.title if chapter else None,
                'topic': topic.name if topic else None,
                'options': {
                    'A': q.option_a, 'B': q.option_b,
                    'C': q.option_c, 'D': q.option_d,
                },
                'student_answer': selected or None,
                'answer_text': answer.answer_text if answer else '',
                'correct_answer': q.correct_option,
                'status': verdict,
                'marks': eq.marks,
                'marks_obtained': answer.marks_awarded if answer else 0,
                'explanation': q.explanation or '',
                # StudentAnswer stores no per-question duration, so this is
                # null rather than a fabricated figure.
                'time_spent_seconds': None,
            })

        total = len(questions)
        answered = total - tally['skipped']

        return Response({
            'attempt': {
                'id': attempt.id,
                'status': attempt.status,
                'score': attempt.score,
                'percentage': round(attempt.percentage or 0, 2),
                'passed': attempt.passed,
                'time_taken_seconds': attempt.time_taken_seconds,
                'started_at': attempt.started_at.isoformat(),
                'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            },
            'student': {
                'id': attempt.student_id,
                'username': attempt.student.username,
                'full_name': attempt.student.get_full_name() or attempt.student.username,
            },
            'examination': {
                'id': attempt.examination_id,
                'title': attempt.examination.title if attempt.examination else None,
                'exam_type': attempt.examination.exam_type if attempt.examination else None,
                'total_marks': attempt.examination.total_marks if attempt.examination else 0,
            },
            'summary': {
                'total_questions': total,
                'answered': answered,
                'correct': tally['correct'],
                'incorrect': tally['incorrect'],
                'skipped': tally['skipped'],
                'accuracy': _pct(tally['correct'], answered),
            },
            'questions': questions,
        })
