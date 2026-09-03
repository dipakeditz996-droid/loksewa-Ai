"""Shared exam-attempt analytics computation, used by both the admin
Examination analytics endpoint (administration/exam_views.py) and the
teacher's own mock-exam analytics endpoint (exams/views.py) - one real
computation, not two copies that could silently drift apart."""
from django.db.models import Avg, Max, Min, Count, Q, F, IntegerField
from django.db.models.functions import Cast


def build_examination_analytics(exam):
    from .models import StudentAnswer

    attempts = exam.attempts.all()
    total_attempts = attempts.count()
    completed_attempts = attempts.filter(status='evaluated').count()
    in_progress = attempts.filter(status='in_progress').count()

    if total_attempts == 0:
        return {
            "exam": {
                "id": exam.id,
                "title": exam.title,
                "exam_type": exam.exam_type,
                "status": exam.status,
            },
            "summary": {
                "total_attempts": 0,
                "completed_attempts": 0,
                "in_progress_attempts": 0,
            },
            "message": "No examination attempts are available yet.",
        }

    stats = attempts.filter(status='evaluated').aggregate(
        avg_score=Avg('score'),
        avg_percentage=Avg('percentage'),
        high=Max('score'),
        low=Min('score'),
        avg_time=Avg('time_taken_seconds'),
        min_time=Min('time_taken_seconds'),
        max_time=Max('time_taken_seconds'),
    )

    pass_count = attempts.filter(status='evaluated', passed=True).count()
    fail_count = completed_attempts - pass_count

    q_stats = StudentAnswer.objects.filter(
        attempt__examination=exam, attempt__status='evaluated'
    ).values(
        'question__id', 'question__text', 'question__difficulty'
    ).annotate(
        total_responses=Count('id'),
        correct=Count('id', filter=Q(is_correct=True)),
        skipped=Count('id', filter=Q(selected_option__isnull=True)),
    )

    question_performance = []
    difficulty_aggregate = {'easy': {'attempts': 0, 'correct': 0}, 'medium': {'attempts': 0, 'correct': 0}, 'hard': {'attempts': 0, 'correct': 0}}

    for idx, q in enumerate(q_stats):
        incorrect = q['total_responses'] - q['correct'] - q['skipped']
        accuracy = round((q['correct'] / q['total_responses'] * 100), 2) if q['total_responses'] > 0 else 0

        question_performance.append({
            "question_id": q['question__id'],
            "question_number": idx + 1,
            "question_text": q['question__text'][:100] + ('...' if len(q['question__text']) > 100 else ''),
            "total_responses": q['total_responses'],
            "correct": q['correct'],
            "incorrect": incorrect,
            "skipped": q['skipped'],
            "accuracy": accuracy,
            "difficulty": q['question__difficulty'],
        })

        diff = q['question__difficulty']
        if diff in difficulty_aggregate:
            difficulty_aggregate[diff]['attempts'] += q['total_responses']
            difficulty_aggregate[diff]['correct'] += q['correct']

    difficulty_performance = []
    for diff, data in difficulty_aggregate.items():
        if data['attempts'] > 0:
            difficulty_performance.append({
                "level": diff.capitalize(),
                "attempts": data['attempts'],
                "accuracy": round((data['correct'] / data['attempts'] * 100), 2),
            })

    distribution = list(
        attempts.filter(status='evaluated')
        .annotate(bin=Cast(F('percentage') / 10, IntegerField()))
        .values('bin')
        .annotate(count=Count('id'))
        .order_by('bin')
    )

    score_distribution = []
    for d in distribution:
        bin_idx = d['bin'] or 0
        start = bin_idx * 10
        end = start + 10
        score_distribution.append({"range": f"{start}-{end}%", "count": d['count']})

    return {
        "exam": {
            "id": exam.id,
            "title": exam.title,
            "exam_type": exam.exam_type,
            "status": exam.status,
        },
        "summary": {
            "total_attempts": total_attempts,
            "completed_attempts": completed_attempts,
            "in_progress_attempts": in_progress,
            "average_score": round(stats['avg_score'] or 0, 2),
            "average_percentage": round(stats['avg_percentage'] or 0, 2),
            "highest_score": round(stats['high'] or 0, 2),
            "lowest_score": round(stats['low'] or 0, 2),
            "pass_count": pass_count,
            "fail_count": fail_count,
        },
        "time_statistics": {
            "average_duration_seconds": round(stats['avg_time'] or 0, 2),
            "min_duration_seconds": stats['min_time'],
            "max_duration_seconds": stats['max_time'],
        },
        "score_distribution": score_distribution,
        "question_performance": question_performance,
        "difficulty_performance": difficulty_performance,
    }
