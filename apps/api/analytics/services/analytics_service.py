from django.core.cache import cache
from django.db.models import Sum, Count, Avg, F, Q, Subquery, OuterRef, IntegerField
from django.db.models.functions import Coalesce
from core.models import User
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    PracticeSession,
    SubjectiveAttempt,
    QuestionAttempt,
    SubjectiveAnswer,
    UserTopicProgress,
    ExaminationAttempt,
    StudentAnswer,
)
from gamification.models import GamificationProfile

def _grouped(qs, group_field, **agg):
    """Correlated one-row scalar subquery: aggregate `qs` grouped by the
    field that ties it to the outer user, so several unrelated aggregates
    can be selected in ONE round trip."""
    (name, expr), = agg.items()
    return Subquery(
        qs.order_by().values(group_field).annotate(**{name: expr}).values(name)[:1],
        output_field=IntegerField(),
    )


class AnalyticsService:
    @staticmethod
    def _scalar_stats(user):
        """The student's simple counts/sums, fetched with a single query.

        These used to be six-plus separate aggregate queries (one per
        table). Against the remote database every round trip costs ~200ms
        regardless of query complexity, so they are selected together as
        correlated subqueries on the user row. Semantics are identical to
        the former per-table aggregates."""
        uid = OuterRef('pk')
        obj = QuestionAttempt.objects.filter(session__user=uid, session__completed=True)
        exam_answers = StudentAnswer.objects.filter(attempt__student=uid, attempt__status='submitted')
        row = (
            User.objects.filter(pk=user.pk)
            .annotate(
                obj_total=Coalesce(_grouped(obj, 'session__user', n=Count('id')), 0),
                obj_correct=Coalesce(_grouped(obj.filter(is_correct=True), 'session__user', n=Count('id')), 0),
                exam_total=Coalesce(_grouped(exam_answers, 'attempt__student', n=Count('id')), 0),
                exam_correct=Coalesce(_grouped(exam_answers.filter(is_correct=True), 'attempt__student', n=Count('id')), 0),
                subjective_evaluated=Coalesce(_grouped(
                    SubjectiveAnswer.objects.filter(attempt__student=uid, status='evaluated'),
                    'attempt__student', n=Count('id')), 0),
                exams_taken=Coalesce(_grouped(
                    ExaminationAttempt.objects.filter(student=uid, status='submitted'),
                    'student', n=Count('id')), 0),
                study_seconds=Coalesce(_grouped(
                    PracticeSession.objects.filter(user=uid, completed=True),
                    'user', n=Sum('time_taken_seconds')), 0),
                streak=Coalesce(Subquery(
                    GamificationProfile.objects.filter(user=uid).values('study_current_streak')[:1],
                    output_field=IntegerField()), 0),
                best_streak=Coalesce(Subquery(
                    GamificationProfile.objects.filter(user=uid).values('study_highest_streak')[:1],
                    output_field=IntegerField()), 0),
            )
            .values('obj_total', 'obj_correct', 'exam_total', 'exam_correct',
                    'subjective_evaluated', 'exams_taken', 'study_seconds',
                    'streak', 'best_streak')
            .first()
        )
        return row
    @staticmethod
    def get_overview(user, course_id=None):
        """
        Returns overall metrics for the student.

        Cached for a short window (per user) because a single dashboard page
        load calls this twice from two independent requests - the critical
        StudentDashboardView and the background /analytics/overview/ fetch -
        and the underlying queries run against a remote Supabase instance
        where each round trip costs ~250-400ms regardless of complexity.
        Collapsing the duplicate computation is a straight latency win with
        no correctness cost: this is summary/display data, not the
        authoritative source for any exam result, submission or payment
        status (those stay uncached and are read fresh at their own views).
        """
        cache_key = f'analytics_overview:{user.id}:{course_id or "default"}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        result = AnalyticsService._compute_overview(user, course_id=course_id)
        cache.set(cache_key, result, 20)
        return result

    @staticmethod
    def _compute_overview(user, course_id=None):
        stats = AnalyticsService._scalar_stats(user)
        obj_solved, obj_correct = stats['obj_total'], stats['obj_correct']
        exam_solved, exam_correct = stats['exam_total'], stats['exam_correct']
        total_solved = obj_solved + exam_solved
        subjective_evaluated = stats['subjective_evaluated']

        # ── Active course: read from canonical course context or authorized course ──
        active_course = None
        journey_progress = 0
        total_available_exams = 0
        try:
            from courses.access import authorized_courses, get_student_course_context
            from courses.models import Course

            auth_courses = authorized_courses(user)
            course = None

            if course_id:
                try:
                    course = auth_courses.filter(id=int(course_id)).select_related('exam').first()
                except (ValueError, TypeError):
                    course = None
            else:
                ctx = get_student_course_context(user)
                active_c = ctx.get('active_course')
                if active_c:
                    course = auth_courses.filter(id=active_c['id']).select_related('exam').first()

            if course:
                active_course = {
                    "name": course.title,
                    "id": course.id,
                    "slug": course.slug,
                }

                # ── Real journey progress scoped to this course's syllabus topics ──
                if course.exam:
                    try:
                        from exams.models import Topic
                        course_topic_ids = list(Topic.objects.filter(
                            chapter__subject__paper__exam=course.exam
                        ).values_list('id', flat=True))

                        if not course_topic_ids:
                            course_topic_ids = list(Topic.objects.filter(
                                chapter__subject__exam=course.exam
                            ).values_list('id', flat=True))

                        total_topics = len(course_topic_ids)
                        if total_topics > 0:
                            completed_topics = UserTopicProgress.objects.filter(
                                user=user, topic_id__in=course_topic_ids, status='completed'
                            ).count()
                            journey_progress = min(100, round((completed_topics / total_topics) * 100, 1))
                        else:
                            journey_progress = 0
                    except Exception:
                        journey_progress = 0

                # Calculate Total Available Exams for this course
                from exams.models import Examination
                exam_q = Q(course=course)
                if course.exam_id:
                    exam_q |= Q(course__isnull=True, exam_id=course.exam_id)
                total_available_exams = Examination.objects.filter(status='published').filter(exam_q).count()

        except Exception:
            pass

        streak = stats['streak']
        best_streak = stats['best_streak']
        total_correct = obj_correct + exam_correct
        overall_accuracy = (total_correct / total_solved * 100) if total_solved > 0 else 0
        total_study_time_mins = stats['study_seconds'] // 60

        return {
            "overall_accuracy": round(overall_accuracy, 1),
            "questions_solved": total_solved,
            "model_exams_taken": stats['exams_taken'],
            "subjective_evaluated": subjective_evaluated,
            "study_streak": streak,
            "best_streak": best_streak,
            "active_course": active_course,
            "journey_progress": journey_progress,
            "total_available_exams": total_available_exams,
            "total_study_time_mins": total_study_time_mins
        }


    @staticmethod
    def get_performance_trend(user, days=30):
        """Returns accuracy trend over the last N days"""
        start_date = timezone.now() - timedelta(days=days)
        
        sessions = PracticeSession.objects.filter(
            user=user, completed=True, created_at__gte=start_date
        ).extra({'date': "date(created_at)"}).values('date').annotate(
            avg_acc=Avg('accuracy'),
            attempts=Count('id')
        )
        
        exams = ExaminationAttempt.objects.filter(
            student=user, status='submitted', started_at__gte=start_date
        ).extra({'date': "date(started_at)"}).values('date').annotate(
            avg_acc=Avg('percentage'),
            attempts=Count('id')
        )
        
        trend_dict = {}
        def merge_stats(qs):
            for item in qs:
                d = str(item['date'])
                if d not in trend_dict:
                    trend_dict[d] = {'date': d, 'accuracy': float(item['avg_acc'] or 0), 'attempts': item['attempts']}
                else:
                    curr_acc = trend_dict[d]['accuracy']
                    curr_att = trend_dict[d]['attempts']
                    new_acc = float(item['avg_acc'] or 0)
                    new_att = item['attempts']
                    total_att = curr_att + new_att
                    if total_att > 0:
                        trend_dict[d]['accuracy'] = ((curr_acc * curr_att) + (new_acc * new_att)) / total_att
                    trend_dict[d]['attempts'] = total_att

        merge_stats(sessions)
        merge_stats(exams)
        
        sorted_trend = sorted(trend_dict.values(), key=lambda x: x['date'])
        
        # Format response
        trend = []
        for item in sorted_trend:
            trend.append({
                "date": item["date"],
                "accuracy": round(item["accuracy"], 1)
            })
            
        return trend

    @staticmethod
    def get_subject_performance(user):
        """Returns accuracy per subject"""
        # Optimize using database aggregation
        subject_stats = PracticeSession.objects.filter(
            user=user, completed=True, subject__isnull=False
        ).values('subject__name').annotate(
            correct=Sum('correct_count'),
            total=Sum('total_questions')
        )
                
        results = []
        for stat in subject_stats:
            name = stat["subject__name"]
            correct = stat["correct"] or 0
            total = stat["total"] or 0
            acc = (correct / total * 100) if total > 0 else 0
            
            if acc >= 80:
                status = "Strong"
            elif acc >= 60:
                status = "Good"
            elif acc >= 40:
                status = "Needs Improvement"
            else:
                status = "Weak"
                
            results.append({
                "subject": name,
                "accuracy": round(acc, 1),
                "total_attempted": total,
                "status": status
            })
            
        return sorted(results, key=lambda x: x["accuracy"], reverse=True)

    @staticmethod
    def get_topic_performance(user):
        """Returns detailed topic analysis for priority areas"""
        progress = UserTopicProgress.objects.filter(user=user, status='completed').select_related('topic', 'topic__chapter__subject')
        
        topics = []
        for p in progress:
            acc = p.accuracy or 0
            if acc >= 80:
                status = "Strong"
            elif acc >= 60:
                status = "Good"
            elif acc >= 40:
                status = "Needs Improvement"
            else:
                status = "Weak"
                
            topics.append({
                "topic_id": p.topic.id,
                "topic": p.topic.name,
                "subject": p.topic.chapter.subject.name,
                "accuracy": round(acc, 1),
                "progress": p.progress,
                "status": status
            })
            
        return topics
