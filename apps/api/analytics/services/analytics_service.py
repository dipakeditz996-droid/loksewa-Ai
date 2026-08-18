from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    PracticeSession, 
    ModelExamAttempt, 
    SubjectiveAttempt,
    QuestionAttempt,
    SubjectiveAnswer,
    UserTopicProgress
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
        
        total_solved = obj_attempts.count() + sum([me.answers.count() for me in me_attempts])
        
        # Subjective
        subjective_evaluated = SubjectiveAnswer.objects.filter(
            attempt__student=user, status='evaluated'
        ).count()
        
        # Study Streak (very basic implementation)
        today = timezone.now().date()
        sessions = PracticeSession.objects.filter(user=user).order_by('-created_at')
        streak = 0
        current_date = today
        
        days = list(set([s.created_at.date() for s in sessions]))
        days.sort(reverse=True)
        
        for d in days:
            if d == current_date or d == current_date - timedelta(days=1):
                if d == current_date - timedelta(days=1):
                    current_date = d
                streak += 1
            else:
                break
                
        # Overall Accuracy calculation (Objective only)
        total_correct = obj_attempts.filter(is_correct=True).count() + sum([me.correct_count for me in me_attempts])
        overall_accuracy = (total_correct / total_solved * 100) if total_solved > 0 else 0
        
        return {
            "overall_accuracy": round(overall_accuracy, 1),
            "questions_solved": total_solved,
            "model_exams_taken": me_attempts.count(),
            "subjective_evaluated": subjective_evaluated,
            "study_streak": streak
        }

    @staticmethod
    def get_performance_trend(user, days=30):
        """Returns accuracy trend over the last N days"""
        start_date = timezone.now() - timedelta(days=days)
        sessions = PracticeSession.objects.filter(
            user=user, completed=True, created_at__gte=start_date
        ).order_by('created_at')
        
        trend = []
        for s in sessions:
            trend.append({
                "date": s.created_at.strftime('%Y-%m-%d'),
                "accuracy": s.accuracy
            })
            
        return trend

    @staticmethod
    def get_subject_performance(user):
        """Returns accuracy per subject"""
        sessions = PracticeSession.objects.filter(user=user, completed=True).select_related('subject')
        
        subject_stats = {}
        for s in sessions:
            if s.subject:
                sub_name = s.subject.name
                if sub_name not in subject_stats:
                    subject_stats[sub_name] = {"correct": 0, "total": 0}
                subject_stats[sub_name]["correct"] += s.correct_count
                subject_stats[sub_name]["total"] += s.total_questions
                
        results = []
        for name, stats in subject_stats.items():
            acc = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
            
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
                "total_attempted": stats["total"],
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
