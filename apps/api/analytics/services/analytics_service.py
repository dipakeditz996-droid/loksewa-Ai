from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    PracticeSession, 
    ModelExamAttempt, 
    SubjectiveAttempt,
    QuestionAttempt,
    SubjectiveAnswer,
    UserTopicProgress,
    ExaminationAttempt,
    StudentAnswer,
    ModelExamAttemptAnswer
)

class AnalyticsService:
    @staticmethod
    def get_overview(user):
        """Returns overall metrics for the student"""
        # Objective Practice
        completed_sessions = PracticeSession.objects.filter(user=user, completed=True)

        # Let's count from QuestionAttempt for precise objective metrics
        obj_attempts = QuestionAttempt.objects.filter(session__user=user, session__completed=True)
        me_attempts = ModelExamAttempt.objects.filter(student=user, status='submitted')
        exam_attempts = ExaminationAttempt.objects.filter(student=user, status='submitted')

        obj_solved = obj_attempts.count()
        me_solved = ModelExamAttemptAnswer.objects.filter(attempt__in=me_attempts).count()
        exam_solved = StudentAnswer.objects.filter(attempt__in=exam_attempts).count()
        
        total_solved = obj_solved + me_solved + exam_solved

        # Subjective
        subjective_evaluated = SubjectiveAnswer.objects.filter(
            attempt__student=user, status='evaluated'
        ).count()

        # ── Active course: read from Enrollment (real enrolled course), not SubscriptionPlan ──
        active_course = None
        journey_progress = 0
        try:
            from courses.models import Enrollment
            active_enrollment = Enrollment.objects.filter(
                student=user, status='active'
            ).select_related('course', 'course__exam').first()

            if active_enrollment and active_enrollment.course:
                course = active_enrollment.course
                active_course = {
                    "name": course.title,
                    "id": course.id,
                    "slug": course.slug,
                }

                # ── Real journey progress ──
                # Numerator: topics the student has actually completed
                completed_topics = UserTopicProgress.objects.filter(
                    user=user, status='completed'
                ).count()

                # Denominator: topics in the exam linked to this course
                total_topics = 0
                if course.exam:
                    try:
                        from exams.models import Topic
                        # Paper-based hierarchy
                        total_topics = Topic.objects.filter(
                            chapter__subject__paper__exam=course.exam
                        ).distinct().count()
                        if total_topics == 0:
                            # Legacy flat subject → chapter → topic
                            total_topics = Topic.objects.filter(
                                chapter__subject__exam=course.exam
                            ).distinct().count()
                    except Exception:
                        total_topics = 0

                if total_topics > 0:
                    journey_progress = min(100, round((completed_topics / total_topics) * 100, 1))
                elif completed_topics > 0:
                    # No topic structure configured yet — use study-plan task progress as fallback
                    journey_progress = 0  # honest zero until syllabus is seeded
            else:
                # No enrollment — fall back to subscription plan name if student has active sub
                from subscriptions.models import Subscription
                active_sub = Subscription.objects.filter(
                    student=user, status='ACTIVE'
                ).select_related('plan').first()
                if active_sub:
                    active_course = {
                        "name": active_sub.plan.name,
                        "id": active_sub.plan.id,
                        "slug": None,
                    }
        except Exception:
            pass

        # Get Streak from GamificationProfile
        streak = 0
        best_streak = 0
        try:
            from gamification.models import GamificationProfile
            profile = GamificationProfile.objects.get(user=user)
            streak = profile.study_current_streak
            best_streak = profile.study_highest_streak
        except Exception:
            pass

        # Overall Accuracy calculation (Objective only)
        obj_correct = obj_attempts.filter(is_correct=True).count()
        me_correct = me_attempts.aggregate(Sum('correct_count'))['correct_count__sum'] or 0
        exam_correct = StudentAnswer.objects.filter(attempt__in=exam_attempts, is_correct=True).count()
        
        total_correct = obj_correct + me_correct + exam_correct
        overall_accuracy = (total_correct / total_solved * 100) if total_solved > 0 else 0

        # Calculate Total Available Exams
        total_available_exams = 0
        try:
            if active_course and active_course.get('id'):
                from exams.models import Examination
                total_available_exams = Examination.objects.filter(course_id=active_course['id'], is_published=True).count()
        except Exception:
            pass

        # Calculate Study Time (from PracticeSession durations)
        total_study_time_mins = 0
        try:
            total_time_seconds = completed_sessions.aggregate(Sum('time_taken_seconds'))['time_taken_seconds__sum'] or 0
            total_study_time_mins = total_time_seconds // 60
        except Exception:
            pass

        return {
            "overall_accuracy": round(overall_accuracy, 1),
            "questions_solved": total_solved,
            "model_exams_taken": me_attempts.count() + exam_attempts.count(),
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
        
        me_exams = ModelExamAttempt.objects.filter(
            student=user, status='submitted', started_at__gte=start_date
        ).extra({'date': "date(started_at)"}).values('date').annotate(
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
        merge_stats(me_exams)
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
                "subject": p.topic.Chapter.subject.name,
                "accuracy": round(acc, 1),
                "progress": p.progress,
                "status": status
            })
            
        return topics
