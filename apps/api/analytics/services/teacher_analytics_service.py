from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    PracticeSession,
    QuestionAttempt,
    UserTopicProgress,
    ExaminationAttempt,
    StudentAnswer
)
from courses.models import TeacherCourseAssignment, Enrollment
from core.models import User

class TeacherAnalyticsService:
    @staticmethod
    def get_assigned_students(teacher):
        """Returns a queryset of students assigned to the teacher through courses."""
        course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        student_ids = Enrollment.objects.filter(course_id__in=course_ids).values_list('student_id', flat=True)
        return User.objects.filter(id__in=student_ids).distinct()
        
    @staticmethod
    def get_assigned_courses(teacher):
        """Returns a queryset of course IDs assigned to the teacher."""
        return TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)

    @staticmethod
    def get_overview(teacher, course_id=None, days=None):
        """Returns overall metrics for students assigned to the teacher."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = students.values_list('id', flat=True)
        
        # Base queries
        practice_sessions = PracticeSession.objects.filter(user_id__in=student_ids, completed=True)
        exam_attempts = ExaminationAttempt.objects.filter(student_id__in=student_ids, status='submitted')

        # Apply course filter if provided
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            course_student_ids = set(student_ids).intersection(set(enrollments))
            practice_sessions = practice_sessions.filter(user_id__in=course_student_ids)
            exam_attempts = exam_attempts.filter(student_id__in=course_student_ids)
            total_students = len(course_student_ids)
        else:
            total_students = students.count()

        # Apply date filter
        if days and days != 'all':
            start_date = timezone.now() - timedelta(days=int(days))
            practice_sessions = practice_sessions.filter(created_at__gte=start_date)
            exam_attempts = exam_attempts.filter(started_at__gte=start_date)

        # Total Attempts
        total_practice_attempts = practice_sessions.count()
        total_exam_attempts = exam_attempts.count()
        total_attempts = total_practice_attempts + total_exam_attempts

        # Active Students (students with an attempt in the given date range, or last 30 days if no range)
        active_days = int(days) if (days and days != 'all') else 30
        active_date = timezone.now() - timedelta(days=active_days)
        active_practice_users = PracticeSession.objects.filter(
            user_id__in=student_ids, created_at__gte=active_date
        ).values_list('user_id', flat=True).distinct()
        active_exam_users = ExaminationAttempt.objects.filter(
            student_id__in=student_ids, started_at__gte=active_date
        ).values_list('student_id', flat=True).distinct()

        active_students_count = len(set(list(active_practice_users) + list(active_exam_users)))

        # Average Score & Accuracy (combining practice and exam)
        practice_stats = practice_sessions.aggregate(
            avg_acc=Avg('accuracy'),
            total_q=Sum('total_questions'),
            correct_q=Sum('correct_count')
        )
        exam_stats = exam_attempts.aggregate(
            avg_acc=Avg('percentage'),
            avg_score=Avg('score'),
            total_q=Sum('examination__total_questions')
        )
        exam_correct_q = StudentAnswer.objects.filter(attempt__in=exam_attempts, is_correct=True).count()

        avg_accuracy = 0
        total_q = (practice_stats['total_q'] or 0) + (exam_stats['total_q'] or 0)
        correct_q = (practice_stats['correct_q'] or 0) + exam_correct_q

        avg_score = exam_stats['avg_score'] or 0

        if total_q > 0:
            avg_accuracy = (correct_q / total_q) * 100
            
        return {
            "total_students": total_students,
            "average_score": round(avg_score, 1),
            "average_accuracy": round(avg_accuracy, 1),
            "total_attempts": total_attempts,
            "active_students": active_students_count,
        }

    @staticmethod
    def get_performance_trend(teacher, course_id=None, days=30):
        """Returns accuracy trend over the last N days."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = students.values_list('id', flat=True)
        
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            student_ids = list(set(student_ids).intersection(set(enrollments)))
        
        if days == 'all':
            days = 365 # reasonable limit
        
        start_date = timezone.now() - timedelta(days=int(days))
        
        sessions = PracticeSession.objects.filter(
            user_id__in=student_ids, completed=True, created_at__gte=start_date
        ).extra({'date':"date(created_at)"}).values('date').annotate(
            avg_acc=Avg('accuracy'),
            attempts=Count('id')
        ).order_by('date')
        
        exams = ExaminationAttempt.objects.filter(
            student_id__in=student_ids, status='submitted', started_at__gte=start_date
        ).extra({'date':"date(started_at)"}).values('date').annotate(
            avg_acc=Avg('percentage'),
            attempts=Count('id')
        ).order_by('date')

        # Combine trends (simple merging by date)
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
        
        for item in sorted_trend:
            item['accuracy'] = round(item['accuracy'], 1)
            
        return sorted_trend

    @staticmethod
    def get_course_performance(teacher):
        """Returns performance metrics grouped by assigned courses without N+1 queries."""
        # 1. Get all assigned courses
        assigned_courses = TeacherCourseAssignment.objects.filter(teacher=teacher).select_related('course')
        course_dict = {ac.course.id: {"name": ac.course.title, "students": 0, "active_students": 0, "attempts": 0, "acc_sum": 0, "score_sum": 0, "exam_attempts": 0, "completion": 0} for ac in assigned_courses}
        course_ids = list(course_dict.keys())

        if not course_ids:
            return []

        # 2. Map student -> [courses] via Enrollment
        enrollments = Enrollment.objects.filter(course_id__in=course_ids).values('course_id', 'student_id')
        student_courses = {}
        student_counts = {cid: 0 for cid in course_ids}
        for e in enrollments:
            cid = e['course_id']
            sid = e['student_id']
            if sid not in student_courses:
                student_courses[sid] = []
            student_courses[sid].append(cid)
            student_counts[cid] += 1

        for cid, count in student_counts.items():
            course_dict[cid]['students'] = count

        student_ids = list(student_courses.keys())
        if not student_ids:
            return []

        active_date = timezone.now() - timedelta(days=30)
        
        # 3. Aggregate Practice Sessions per student
        sessions = PracticeSession.objects.filter(user_id__in=student_ids, completed=True).values('user_id').annotate(
            avg_acc=Avg('accuracy'),
            total=Count('id'),
            active_count=Count('id', filter=Q(created_at__gte=active_date))
        )
        
        # 4. Aggregate Examination Attempts per student
        exams = ExaminationAttempt.objects.filter(student_id__in=student_ids, status='submitted').values('student_id').annotate(
            avg_acc=Avg('percentage'),
            avg_score=Avg('score'),
            total=Count('id'),
            active_count=Count('id', filter=Q(started_at__gte=active_date))
        )

        active_students_per_course = {cid: set() for cid in course_ids}

        # 6. Apply student stats to all their enrolled courses
        def apply_stats(qs, user_field, is_exam=False):
            for stat in qs:
                uid = stat[user_field]
                total = stat['total']
                avg_acc = float(stat['avg_acc'] or 0)
                active_count = stat['active_count'] or 0
                avg_score = float(stat.get('avg_score', 0) or 0)
                
                for cid in student_courses.get(uid, []):
                    c_data = course_dict[cid]
                    c_data['attempts'] += total
                    c_data['acc_sum'] += avg_acc * total
                    if is_exam:
                        c_data['exam_attempts'] += total
                        c_data['score_sum'] += avg_score * total
                    if active_count > 0:
                        active_students_per_course[cid].add(uid)

        apply_stats(sessions, 'user_id', is_exam=False)
        apply_stats(exams, 'student_id', is_exam=True)

        course_stats = []
        for cid, data in course_dict.items():
            total_att = data['attempts']
            exam_att = data['exam_attempts']
            total_students = data['students']
            
            avg_acc = data['acc_sum'] / total_att if total_att > 0 else 0
            avg_score = data['score_sum'] / exam_att if exam_att > 0 else 0
            
            course_stats.append({
                "id": cid,
                "name": data["name"],
                "students": total_students,
                "active_students": len(active_students_per_course[cid]),
                "average_score": round(avg_score, 1),
                "accuracy": round(avg_acc, 1),
                "attempts": total_att,
                "completion": round((exam_att / total_students * 100) if total_students > 0 else 0, 1)
            })
            
        return course_stats

    @staticmethod
    def get_subject_performance(teacher, course_id=None):
        """Returns performance metrics grouped by subject using DB aggregation."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = students.values_list('id', flat=True)
        
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            student_ids = list(set(student_ids).intersection(set(enrollments)))
            
        subject_stats = PracticeSession.objects.filter(
            user_id__in=student_ids, completed=True, subject__isnull=False
        ).values('subject__id', 'subject__name').annotate(
            correct=Sum('correct_count'),
            total=Sum('total_questions'),
            attempts_count=Count('id'),
            users_count=Count('user_id', distinct=True)
        )
                
        results = []
        for stat in subject_stats:
            sub_id = stat['subject__id']
            name = stat['subject__name']
            correct = stat['correct'] or 0
            total = stat['total'] or 0
            acc = (correct / total * 100) if total > 0 else 0
            
            results.append({
                "id": sub_id,
                "subject": name,
                "accuracy": round(acc, 1),
                "questions_attempted": total,
                "attempts": stat['attempts_count'],
                "students": stat['users_count']
            })
            
        return sorted(results, key=lambda x: x["accuracy"], reverse=True)

    @staticmethod
    def get_topic_performance(teacher, course_id=None):
        """Calculates strong and weak topics based on actual attempts using DB aggregation."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = students.values_list('id', flat=True)
        
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            student_ids = list(set(student_ids).intersection(set(enrollments)))
            
        topic_stats = UserTopicProgress.objects.filter(
            user_id__in=student_ids, status__in=['in-progress', 'completed']
        ).values('topic__id', 'topic__name').annotate(
            sum_acc=Sum('accuracy'),
            count=Count('id')
        )
        
        strong_topics = []
        needs_improvement = []
        
        for stat in topic_stats:
            count = stat['count']
            if count > 0:
                sum_acc = stat['sum_acc'] or 0
                avg_acc = sum_acc / count
                topic_data = {
                    "id": stat['topic__id'],
                    "topic": stat['topic__name'],
                    "accuracy": round(avg_acc, 1)
                }
                if avg_acc < 60:
                    needs_improvement.append(topic_data)
                else:
                    strong_topics.append(topic_data)
                    
        needs_improvement = sorted(needs_improvement, key=lambda x: x["accuracy"])
        strong_topics = sorted(strong_topics, key=lambda x: x["accuracy"], reverse=True)
        
        return {
            "needs_improvement": needs_improvement[:10],
            "strong_topics": strong_topics[:10]
        }

    @staticmethod
    def get_student_ranking(teacher, course_id=None):
        """Ranks students based on their performance."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = list(students.values_list('id', flat=True))
        
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            student_ids = list(set(student_ids).intersection(set(enrollments)))
            
        enrollments = Enrollment.objects.filter(student_id__in=student_ids).select_related('course')
        student_courses = {}
        for e in enrollments:
            if e.student_id not in student_courses:
                student_courses[e.student_id] = []
            student_courses[e.student_id].append(e.course.title)
            
        sessions = PracticeSession.objects.filter(user_id__in=student_ids, completed=True).values('user_id').annotate(
            avg_acc=Avg('accuracy'),
            attempts=Count('id')
        )
        exams = ExaminationAttempt.objects.filter(student_id__in=student_ids, status='submitted').values('student_id').annotate(
            avg_acc=Avg('percentage'),
            avg_score=Avg('score'),
            attempts=Count('id')
        )
        
        student_stats = {}
        for s in sessions:
            uid = s['user_id']
            student_stats[uid] = {
                "attempts": s['attempts'],
                "acc_sum": float(s['avg_acc'] or 0) * s['attempts'],
                "score_sum": 0,
                "exam_attempts": 0
            }
            
        def apply_exam_stats(qs):
            for e in qs:
                uid = e['student_id']
                if uid not in student_stats:
                    student_stats[uid] = {"attempts": 0, "acc_sum": 0, "score_sum": 0, "exam_attempts": 0}
                student_stats[uid]["attempts"] += e['attempts']
                student_stats[uid]["acc_sum"] += float(e['avg_acc'] or 0) * e['attempts']
                student_stats[uid]["score_sum"] += float(e['avg_score'] or 0) * e['attempts']
                student_stats[uid]["exam_attempts"] += e['attempts']
                
        apply_exam_stats(exams)
            
        ranking = []
        for student in students:
            uid = student.id
            if uid in student_stats and student_stats[uid]["attempts"] > 0:
                stats = student_stats[uid]
                avg_acc = stats["acc_sum"] / stats["attempts"]
                avg_score = stats["score_sum"] / stats["exam_attempts"] if stats["exam_attempts"] > 0 else 0
                
                ranking.append({
                    "id": uid,
                    "name": f"{student.first_name} {student.last_name}".strip() or student.username,
                    "courses": ", ".join(student_courses.get(uid, [])),
                    "average_score": round(avg_score, 1),
                    "accuracy": round(avg_acc, 1),
                    "attempts": stats["attempts"]
                })
                
        ranking = sorted(ranking, key=lambda x: x["accuracy"], reverse=True)
        for i, r in enumerate(ranking):
            r["rank"] = i + 1
            
        return ranking[:50]

    @staticmethod
    def get_needs_attention(teacher, course_id=None):
        """Identifies students needing attention based on real data signals without N+1 queries."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        student_ids = list(students.values_list('id', flat=True))
        
        if course_id and course_id != 'all':
            enrollments = Enrollment.objects.filter(course_id=course_id).values_list('student_id', flat=True)
            student_ids = list(set(student_ids).intersection(set(enrollments)))
            students = students.filter(id__in=student_ids)

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # Bulk fetch recent attempts for these students
        recent_practices = PracticeSession.objects.filter(
            user_id__in=student_ids, completed=True, created_at__gte=thirty_days_ago
        ).order_by('-created_at').values('user_id', 'accuracy', 'created_at')
        
        recent_exams_qs = ExaminationAttempt.objects.filter(
            student_id__in=student_ids, status='submitted', started_at__gte=thirty_days_ago
        ).order_by('-started_at').values('student_id', 'percentage', 'score', 'started_at')

        student_practices = {uid: [] for uid in student_ids}
        student_exams = {uid: [] for uid in student_ids}

        for p in recent_practices:
            student_practices[p['user_id']].append(p)

        for e in recent_exams_qs:
            student_exams[e['student_id']].append({'accuracy': e['percentage'], 'score': e['score'], 'date': e['started_at']})
            
        for uid in student_ids:
            # Sort combined exams by date descending
            student_exams[uid] = sorted(student_exams[uid], key=lambda x: x['date'], reverse=True)

        needs_attention = []
        
        for student in students:
            uid = student.id
            issues = []
            current_performance = 0
            
            practices = student_practices[uid]
            exams = student_exams[uid]
            
            last_active_date = None
            if practices and exams:
                last_active_date = max(practices[0]['created_at'], exams[0]['date'])
            elif practices:
                last_active_date = practices[0]['created_at']
            elif exams:
                last_active_date = exams[0]['date']
                
            if last_active_date:
                days_inactive = (now - last_active_date).days
                if days_inactive > 7:
                    issues.append(f"Inactive for {days_inactive} days")
            else:
                issues.append("No activity yet")
                    
            if len(practices) >= 3:
                recent_5_p = practices[:5]
                avg_recent_acc = sum(s['accuracy'] for s in recent_5_p) / len(recent_5_p)
                current_performance = avg_recent_acc
                if avg_recent_acc < 50:
                    issues.append(f"Low recent accuracy")
                    
            if len(exams) >= 2:
                recent_3_e = exams[:3]
                # Check for declining scores
                if recent_3_e[0]['score'] < recent_3_e[1]['score']:
                     issues.append("Declining mock exam score")
                     if not current_performance:
                         current_performance = recent_3_e[0]['accuracy']
                    
            if issues:
                needs_attention.append({
                    "id": uid,
                    "name": f"{student.first_name} {student.last_name}".strip() or student.username,
                    "issue": " | ".join(issues),
                    "current_performance": f"{round(current_performance)}%" if current_performance else "N/A",
                    "last_active": last_active_date.strftime('%Y-%m-%d') if last_active_date else "Never",
                    "recommended_action": "Message student" if "Inactive" in issues[0] else "Recommend review"
                })
                
        return needs_attention

    @staticmethod
    def get_student_detail(teacher, student_id):
        """Returns full analytics for a specific student, checking permissions."""
        students = TeacherAnalyticsService.get_assigned_students(teacher)
        if not students.filter(id=student_id).exists():
            return None
            
        student = User.objects.get(id=student_id)
        
        from analytics.services.analytics_service import AnalyticsService
        
        overview = AnalyticsService.get_overview(student)
        trend = AnalyticsService.get_performance_trend(student)
        subject_perf = AnalyticsService.get_subject_performance(student)
        topic_perf = AnalyticsService.get_topic_performance(student)
        
        recent_practice = PracticeSession.objects.filter(user=student, completed=True).order_by('-created_at')[:10]
        practice_history = [{
            "id": p.id,
            "subject": p.subject.name if p.subject else "Mixed",
            "score": round(p.score, 1),
            "accuracy": round(p.accuracy, 1),
            "date": p.created_at.strftime('%Y-%m-%d')
        } for p in recent_practice]
        
        recent_exams = ExaminationAttempt.objects.filter(student=student, status='submitted').order_by('-started_at')[:10]

        exam_history = [{
            "id": e.id,
            "exam": e.examination.title,
            "score": round(e.score, 1),
            "percentage": round(e.percentage, 1),
            "passed": e.passed,
            "date": e.started_at.strftime('%Y-%m-%d'),
        } for e in recent_exams]
            
        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}".strip() or student.username,
                "email": student.email,
            },
            "overview": overview,
            "trend": trend,
            "subject_performance": subject_perf,
            "topic_performance": topic_perf,
            "practice_history": practice_history,
            "exam_history": exam_history
        }
