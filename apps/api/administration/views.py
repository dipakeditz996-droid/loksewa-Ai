from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.db import transaction
from django.core.paginator import Paginator
from datetime import timedelta, date
from core.models import User, Position, Tag
from exams.models import Exam, Question, ModelExam, ModelExamAttempt, PracticeSession, ExaminationAttempt
from notes.models import StudyMaterial
from marketplace.models import Product, PaymentSubmission, Purchase
from games.models import GameMatch, SurvivalGame
from ai_tutor.models import Conversation, TutorUsage
from .models import AuditLog
from .permissions import IsAdminUser


def _format_time_ago(dt):
    """Return a human-readable 'time ago' string."""
    now = timezone.now()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Users
        total_students = User.objects.filter(role='student').count()
        active_students = User.objects.filter(role='student', is_active=True).count()
        evaluators = User.objects.filter(role='teacher').count()

        # Academic
        published_exams = Exam.objects.filter(is_active=True).count()
        questions = Question.objects.count()
        study_materials = StudyMaterial.objects.filter(status='published').count()

        # Evaluations
        from exams.models import Evaluation, SubjectiveAnswer
        pending_evaluations = SubjectiveAnswer.objects.filter(status='submitted').count()

        # Marketplace
        marketplace_listings = Product.objects.filter(is_published=True).count()
        order_requests = PaymentSubmission.objects.filter(status='PENDING').count()
        total_orders = Purchase.objects.count()
        revenue = float(
            Purchase.objects.filter(status='ACTIVE')
            .aggregate(total=Sum('amount_paid'))['total'] or 0
        )

        # Games
        games_played = (
            GameMatch.objects.filter(status='COMPLETED').count() +
            SurvivalGame.objects.filter(status='COMPLETED').count()
        )

        # AI Tutor
        total_ai_sessions = Conversation.objects.count()
        today = timezone.now().date()
        ai_sessions_today = TutorUsage.objects.filter(date=today).aggregate(
            total=Sum('request_count')
        )['total'] or 0

        # Build real recent activity from DB
        recent_activity = []
        activity_id = 1

        # Recent registrations
        recent_users = User.objects.order_by('-date_joined')[:3]
        for u in recent_users:
            recent_activity.append({
                "id": activity_id,
                "type": "registration",
                "description": f"New student '{u.get_full_name() or u.username}' registered",
                "user": u.get_full_name() or u.username,
                "time": _format_time_ago(u.date_joined),
                "status": "success",
            })
            activity_id += 1

        # Recent exam attempts (legacy + new)
        legacy_attempts = list(ModelExamAttempt.objects.select_related('student', 'model_exam').order_by('-started_at')[:3])
        new_attempts = list(ExaminationAttempt.objects.select_related('student', 'examination').order_by('-started_at')[:3])
        
        all_recent = sorted(legacy_attempts + new_attempts, key=lambda x: x.started_at, reverse=True)[:3]
        
        for a in all_recent:
            is_legacy = isinstance(a, ModelExamAttempt)
            title = a.model_exam.title if is_legacy else a.examination.title
            recent_activity.append({
                "id": activity_id,
                "type": "exam_attempt",
                "description": f"'{a.student.get_full_name() or a.student.username}' attempted '{title}'",
                "user": a.student.get_full_name() or a.student.username,
                "time": _format_time_ago(a.started_at),
                "status": a.status,
            })
            activity_id += 1

        # Recent marketplace orders
        recent_orders = Purchase.objects.select_related('student', 'product').order_by('-created_at')[:3]
        for o in recent_orders:
            recent_activity.append({
                "id": activity_id,
                "type": "order",
                "description": f"Purchase of '{o.product.title}' by {o.student.get_full_name() or o.student.username}",
                "user": o.student.get_full_name() or o.student.username,
                "time": _format_time_ago(o.created_at),
                "status": o.status.lower(),
            })
            activity_id += 1

        # Sort by most recent (best effort since time is formatted)
        recent_activity = recent_activity[:10]

        return Response({
            "users": {
                "totalStudents": total_students,
                "activeStudents": active_students,
                "evaluators": evaluators,
            },
            "academic": {
                "publishedExams": published_exams,
                "questions": questions,
                "studyMaterials": study_materials,
            },
            "evaluations": {
                "pending": pending_evaluations,
            },
            "marketplace": {
                "activeListings": marketplace_listings,
                "orderRequests": order_requests,
                "totalOrders": total_orders,
                "revenue": revenue,
            },
            "aiTutor": {
                "totalSessions": total_ai_sessions,
                "sessionsToday": ai_sessions_today,
            },
            "games": {
                "totalPlayed": games_played,
            },
            "recentActivity": recent_activity,
        })


class AdminAnalyticsView(APIView):
    """Time-series analytics for the admin analytics page."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        period_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
        days = period_map.get(period, 30)

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)

        # Generate date series
        date_series = [start_date + timedelta(days=i) for i in range(days)]

        # Student registrations per day
        reg_qs = (
            User.objects.filter(
                role='student',
                date_joined__date__gte=start_date,
                date_joined__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(date_joined)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        reg_map = {str(r['day']): r['count'] for r in reg_qs}

        # Exam attempts per day (Legacy ModelExamAttempt + new ExaminationAttempt)
        legacy_qs = (
            ModelExamAttempt.objects.filter(
                started_at__date__gte=start_date,
                started_at__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(started_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        
        new_qs = (
            ExaminationAttempt.objects.filter(
                started_at__date__gte=start_date,
                started_at__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(started_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        
        attempts_map = {}
        for a in legacy_qs:
            attempts_map[str(a['day'])] = attempts_map.get(str(a['day']), 0) + a['count']
        for a in new_qs:
            attempts_map[str(a['day'])] = attempts_map.get(str(a['day']), 0) + a['count']


        # AI tutor usage per day
        ai_qs = (
            TutorUsage.objects.filter(date__gte=start_date, date__lte=end_date)
            .values('date')
            .annotate(count=Sum('request_count'))
        )
        ai_map = {str(a['date']): a['count'] for a in ai_qs}

        # Practice sessions per day
        practice_qs = (
            PracticeSession.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
                completed=True,
            )
            .extra(select={'day': 'DATE(created_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        practice_map = {str(p['day']): p['count'] for p in practice_qs}

        chart_data = []
        for d in date_series:
            ds = str(d)
            chart_data.append({
                "date": ds,
                "registrations": reg_map.get(ds, 0),
                "examAttempts": attempts_map.get(ds, 0),
                "aiSessions": ai_map.get(ds, 0),
                "practiceSessions": practice_map.get(ds, 0),
            })

        # Summary totals
        return Response({
            "period": period,
            "days": days,
            "chartData": chart_data,
            "totals": {
                "registrations": sum(r["registrations"] for r in chart_data),
                "examAttempts": sum(r["examAttempts"] for r in chart_data),
                "aiSessions": sum(r["aiSessions"] for r in chart_data),
                "practiceSessions": sum(r["practiceSessions"] for r in chart_data),
            }
        })


class AdminUsersView(APIView):
    """Paginated user list with filters."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        role = request.query_params.get('role', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        qs = User.objects.all().order_by('-date_joined')
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        users = qs[start:start + page_size]

        data = []
        for u in users:
            data.append({
                "id": u.id,
                "name": u.get_full_name() or u.username,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "isActive": u.is_active,
                "dateJoined": u.date_joined.isoformat(),
                "avatar": u.avatar,
            })

        return Response({
            "users": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'student')
        
        if not username or not email or not password:
            return Response({'error': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(username=username, email=email, password=password, role=role)
        
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "message": "User created successfully."
        }, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    """View, update, or suspend a specific user."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = is_active
            
        role = request.data.get('role')
        if role:
            user.role = role
            
        user.save()
        
        return Response({
            "id": user.id,
            "username": user.username,
            "isActive": user.is_active,
            "role": user.role,
            "message": "User updated successfully."
        })


class AdminRolesView(APIView):
    """Get list of system roles and their usage statistics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        # System roles and their usage
        roles_data = [
            {
                "id": "super-admin",
                "name": "Super Administrator",
                "description": "Full platform access with all permissions",
                "users": User.objects.filter(role='super-admin').count(),
                "color": "red",
                "type": "system"
            },
            {
                "id": "admin",
                "name": "Administrator",
                "description": "Can manage users, content, and settings",
                "users": User.objects.filter(role='admin').count(),
                "color": "blue",
                "type": "system"
            },
            {
                "id": "teacher",
                "name": "Teacher",
                "description": "Can create content and manage students",
                "users": User.objects.filter(role='teacher').count(),
                "color": "purple",
                "type": "system"
            },
            {
                "id": "student",
                "name": "Student",
                "description": "Can access learning materials and take exams",
                "users": User.objects.filter(role='student').count(),
                "color": "green",
                "type": "system"
            },
        ]

        return Response({
            "roles": roles_data,
            "total": len(roles_data),
            "totalUsers": User.objects.count(),
        })


class AdminAdministratorsView(APIView):
    """Get list of all administrators (admin and super-admin users)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Filter for admin and super-admin users only
        qs = User.objects.filter(
            Q(role='admin') | Q(role='super-admin')
        ).order_by('-date_joined')

        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        admins = qs[start:start + page_size]

        data = []
        for admin in admins:
            data.append({
                "id": admin.id,
                "name": admin.get_full_name() or admin.username,
                "username": admin.username,
                "email": admin.email,
                "role": admin.role,
                "isActive": admin.is_active,
                "dateJoined": admin.date_joined.isoformat(),
                "avatar": admin.avatar,
            })

        return Response({
            "users": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })


class AdminExamsOverviewView(APIView):
    """Exams overview for admin dashboard."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_exams = Exam.objects.count()
        active_exams = Exam.objects.filter(is_active=True).count()

        total_model_exams = ModelExam.objects.count()
        published_model_exams = ModelExam.objects.filter(status='published').count()
        draft_model_exams = ModelExam.objects.filter(status='draft').count()
        total_attempts = ModelExamAttempt.objects.count()

        recent_model_exams = ModelExam.objects.select_related('exam').order_by('-created_at')[:5]
        recent_data = []
        for me in recent_model_exams:
            attempt_count = me.attempts.count()
            recent_data.append({
                "id": me.id,
                "title": me.title,
                "exam": me.exam.name,
                "status": me.status,
                "totalQuestions": me.total_questions,
                "attempts": attempt_count,
                "createdAt": me.created_at.isoformat(),
            })

        return Response({
            "totalExams": total_exams,
            "activeExams": active_exams,
            "totalModelExams": total_model_exams,
            "publishedModelExams": published_model_exams,
            "draftModelExams": draft_model_exams,
            "totalAttempts": total_attempts,
            "recentExams": recent_data,
        })


class AdminAITutorOverviewView(APIView):
    """AI Tutor overview for admin dashboard."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_sessions = Conversation.objects.count()
        today = timezone.now().date()
        sessions_today = TutorUsage.objects.filter(date=today).aggregate(
            total=Sum('request_count')
        )['total'] or 0

        # Usage trend for last 7 days
        trend_data = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            count = TutorUsage.objects.filter(date=d).aggregate(
                total=Sum('request_count')
            )['total'] or 0
            trend_data.append({"date": str(d), "sessions": count})

        # Most used modes (subjects proxy)
        mode_counts = (
            Conversation.objects.values('mode')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        top_modes = [{"mode": m['mode'], "count": m['count']} for m in mode_counts]

        # Active students using AI tutor
        active_students = Conversation.objects.values('student').distinct().count()

        return Response({
            "totalSessions": total_sessions,
            "sessionsToday": sessions_today,
            "activeStudents": active_students,
            "topModes": top_modes,
            "trend": trend_data,
        })


class AdminMarketplaceOverviewView(APIView):
    """Marketplace overview for admin dashboard."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_published=True).count()
        total_orders = PaymentSubmission.objects.count()
        pending_orders = PaymentSubmission.objects.filter(status='PENDING').count()
        completed_orders = PaymentSubmission.objects.filter(status='APPROVED').count()
        revenue = float(
            Purchase.objects.filter(status='ACTIVE')
            .aggregate(total=Sum('amount_paid'))['total'] or 0
        )

        recent_orders = PaymentSubmission.objects.select_related(
            'student', 'product'
        ).order_by('-submitted_at')[:5]

        recent_data = []
        for o in recent_orders:
            recent_data.append({
                "id": o.id,
                "product": o.product.title,
                "buyer": o.student.get_full_name() or o.student.username,
                "seller": "LoksewaAI",  # We don't have individual sellers anymore based on the models
                "price": float(o.submitted_amount),
                "status": o.status,
                "createdAt": o.submitted_at.isoformat(),
            })

        return Response({
            "totalProducts": total_products,
            "activeProducts": active_products,
            "totalOrders": total_orders,
            "pendingOrders": pending_orders,
            "completedOrders": completed_orders,
            "revenue": revenue,
            "recentOrders": recent_data,
        })


# ============================================================
# EVALUATOR MANAGEMENT VIEWS
# ============================================================

def _evaluator_stats(user):
    """Compute evaluation statistics for a single evaluator user."""
    from exams.models import Evaluation, SubjectiveAnswer
    from django.db.models import Avg

    total_evals = Evaluation.objects.filter(evaluator=user).count()
    avg_marks = Evaluation.objects.filter(evaluator=user).aggregate(
        avg=Avg('marks_obtained')
    )['avg']

    # Derive subjects from evaluated answers
    subject_names = list(
        Evaluation.objects.filter(evaluator=user)
        .select_related('answer__question__topic__unit__subject')
        .values_list('answer__question__topic__unit__subject__name', flat=True)
        .distinct()
    )

    # Pending = submitted answers not yet evaluated
    pending = SubjectiveAnswer.objects.filter(
        status='submitted'
    ).exclude(
        id__in=Evaluation.objects.values_list('answer_id', flat=True)
    ).count()

    # Recent evaluations by this evaluator
    recent_evals = (
        Evaluation.objects.filter(evaluator=user)
        .select_related('answer__question', 'answer__attempt__student')
        .order_by('-evaluated_at')[:5]
    )
    recent = []
    for e in recent_evals:
        q_text = e.answer.question.text[:80] if e.answer.question else ''
        student = e.answer.attempt.student
        recent.append({
            "id": e.id,
            "student": student.get_full_name() or student.username,
            "question": q_text,
            "marks": float(e.marks_obtained),
            "evaluatedAt": e.evaluated_at.isoformat(),
        })

    return {
        "totalEvaluations": total_evals,
        "pendingEvaluations": pending,
        "completedEvaluations": total_evals,
        "avgScore": round(float(avg_marks), 2) if avg_marks else None,
        "assignedSubjects": subject_names,
        "recentEvaluations": recent,
    }


class AdminEvaluatorListView(APIView):
    """Paginated list of evaluators with per-evaluator stats."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')  # 'active' | 'inactive'
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        qs = User.objects.filter(role='teacher').order_by('-date_joined')

        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'inactive':
            qs = qs.filter(is_active=False)

        total = qs.count()
        start = (page - 1) * page_size
        evaluators = qs[start:start + page_size]

        from exams.models import Evaluation, SubjectiveAnswer
        from django.db.models import Avg

        data = []
        for u in evaluators:
            total_evals = Evaluation.objects.filter(evaluator=u).count()
            avg_marks = Evaluation.objects.filter(evaluator=u).aggregate(
                avg=Avg('marks_obtained')
            )['avg']
            subjects = list(
                Evaluation.objects.filter(evaluator=u)
                .select_related('answer__question__topic__unit__subject')
                .values_list('answer__question__topic__unit__subject__name', flat=True)
                .distinct()
            )
            data.append({
                "id": u.id,
                "name": u.get_full_name() or u.username,
                "username": u.username,
                "email": u.email,
                "isActive": u.is_active,
                "dateJoined": u.date_joined.isoformat(),
                "avatar": u.avatar,
                "totalEvaluations": total_evals,
                "completedEvaluations": total_evals,
                "avgScore": round(float(avg_marks), 2) if avg_marks else None,
                "assignedSubjects": subjects,
            })

        return Response({
            "evaluators": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })


class AdminEvaluatorDetailView(APIView):
    """Full evaluator profile with stats and recent activity."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            u = User.objects.get(pk=pk, role='teacher')
        except User.DoesNotExist:
            return Response({'detail': 'Evaluator not found.'}, status=404)

        stats = _evaluator_stats(u)
        return Response({
            "id": u.id,
            "name": u.get_full_name() or u.username,
            "username": u.username,
            "email": u.email,
            "firstName": u.first_name,
            "lastName": u.last_name,
            "isActive": u.is_active,
            "dateJoined": u.date_joined.isoformat(),
            "avatar": u.avatar,
            **stats,
        })


class AdminEvaluatorCreateView(APIView):
    """Create a new evaluator user."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        first_name = request.data.get('firstName', '').strip()
        last_name = request.data.get('lastName', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()

        errors = {}
        if not first_name:
            errors['firstName'] = 'First name is required.'
        if not email:
            errors['email'] = 'Email is required.'
        if not password or len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters.'
        if User.objects.filter(email=email).exists():
            errors['email'] = 'A user with this email already exists.'
        if errors:
            return Response({'errors': errors}, status=400)

        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='teacher',
            is_active=True,
        )

        return Response({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "isActive": user.is_active,
            "dateJoined": user.date_joined.isoformat(),
        }, status=201)


class AdminEvaluatorUpdateView(APIView):
    """Edit evaluator profile or toggle active status."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            u = User.objects.get(pk=pk, role='teacher')
        except User.DoesNotExist:
            return Response({'detail': 'Evaluator not found.'}, status=404)

        first_name = request.data.get('firstName')
        last_name = request.data.get('lastName')
        email = request.data.get('email')
        is_active = request.data.get('isActive')

        errors = {}
        if email is not None:
            if not email.strip():
                errors['email'] = 'Email cannot be empty.'
            elif User.objects.filter(email=email).exclude(pk=pk).exists():
                errors['email'] = 'Another user already has this email.'

        if errors:
            return Response({'errors': errors}, status=400)

        if first_name is not None:
            u.first_name = first_name
        if last_name is not None:
            u.last_name = last_name
        if email is not None:
            u.email = email
        if is_active is not None:
            u.is_active = bool(is_active)

        u.save()

        return Response({
            "id": u.id,
            "name": u.get_full_name() or u.username,
            "email": u.email,
            "firstName": u.first_name,
            "lastName": u.last_name,
            "isActive": u.is_active,
        })


class AdminEvaluatorsSubjectsView(APIView):
    """List all subjects available for the evaluator subject filter."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from exams.models import Subject
        subjects = Subject.objects.select_related('exam').all().order_by('name')
        data = [{"id": s.id, "name": s.name, "exam": s.exam.name} for s in subjects]
        return Response(data)


class AdminEvaluationAssignmentsView(APIView):
    """Paginated list of all subjective answers with evaluation status."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from exams.models import SubjectiveAnswer

        status_filter = request.query_params.get('status', '')  # 'submitted' | 'evaluated'
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        qs = SubjectiveAnswer.objects.select_related(
            'attempt__student',
            'question__topic__unit__subject',
        ).order_by('-submitted_at')

        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            # Exclude drafts by default
            qs = qs.exclude(status='draft')

        total = qs.count()
        start = (page - 1) * page_size
        answers = qs[start:start + page_size]

        data = []
        for a in answers:
            student = a.attempt.student
            subject = None
            try:
                subject = a.question.topic.Chapter.subject.name
            except Exception:
                pass

            evaluator_name = None
            try:
                evaluator_name = (
                    a.evaluation.evaluator.get_full_name()
                    or a.evaluation.evaluator.username
                ) if a.evaluation.evaluator else None
            except Exception:
                pass

            data.append({
                "id": a.id,
                "student": student.get_full_name() or student.username,
                "studentEmail": student.email,
                "subject": subject or "—",
                "question": a.question.text[:100] if a.question else "—",
                "submittedAt": a.submitted_at.isoformat() if a.submitted_at else None,
                "status": a.status,
                "evaluator": evaluator_name,
                "wordCount": a.word_count,
            })

        return Response({
            "assignments": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })


# ============================================================
# ADMIN COURSE APPLICATION MANAGEMENT
# ============================================================

class AdminCourseApplicationView(APIView):
    """
    GET /api/admin/course-applications/

    Returns all course applications with full enrollment/payment context.
    Admin can see: student, applied course, payment status, enrollment status.

    Query params:
      status  = pending | approved | rejected | cancelled
      page    = int (default 1)
      per_page = int (default 20)
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from courses.models import CourseApplication, Enrollment
        from subscriptions.models import SubscriptionPayment

        status_filter = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 20))

        qs = CourseApplication.objects.select_related(
            'student', 'course', 'subscription_payment', 'subscription_payment__plan',
            'marketplace_payment', 'marketplace_payment__product',
            'reviewed_by'
        ).order_by('-applied_at')

        if status_filter:
            qs = qs.filter(status=status_filter)

        total = qs.count()
        start = (page - 1) * per_page
        applications = qs[start:start + per_page]

        data = []
        for app in applications:
            # Enrollment status for this student+course
            enrollment = Enrollment.objects.filter(
                student=app.student, course=app.course
            ).first()

            payment = app.subscription_payment

            data.append({
                'id': app.id,
                'student': {
                    'id': app.student.id,
                    'name': app.student.get_full_name() or app.student.username,
                    'username': app.student.username,
                    'email': app.student.email,
                },
                'course': {
                    'id': app.course.id,
                    'title': app.course.title,
                },
                'application_status': app.status,
                'applied_at': app.applied_at,
                'reviewed_at': app.reviewed_at,
                'reviewed_by': app.reviewed_by.get_full_name() if app.reviewed_by else None,
                'note': app.note,
                'payment': {
                    'id': app.subscription_payment.id,
                    'status': app.subscription_payment.status,
                    'amount': str(app.subscription_payment.amount),
                    'plan_name': app.subscription_payment.plan.name,
                    'submitted_at': app.subscription_payment.submitted_at,
                    'type': 'subscription'
                } if app.subscription_payment else ({
                    'id': app.marketplace_payment.id,
                    'status': app.marketplace_payment.status,
                    'amount': str(app.marketplace_payment.submitted_amount),
                    'plan_name': app.marketplace_payment.product.title,
                    'submitted_at': app.marketplace_payment.submitted_at,
                    'type': 'marketplace'
                } if app.marketplace_payment else None),
                'enrollment': {
                    'id': enrollment.id,
                    'status': enrollment.status,
                    'enrolled_at': enrollment.enrolled_at,
                    'expires_at': enrollment.expires_at,
                } if enrollment else None,
            })

        return Response({
            'results': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })

    def post(self, request):
        """
        POST /api/admin/course-applications/
        Manually enroll a student in a course (admin action — no payment required).
        Body: { student_id, course_id, note }
        """
        from courses.models import CourseApplication, Enrollment, Course
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()

        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        note = request.data.get('note', 'Manually enrolled by admin.')

        if not student_id or not course_id:
            return Response({'error': 'student_id and course_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = UserModel.objects.get(id=student_id, role='student')
        except UserModel.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone as tz
        now = tz.now()

        app, _ = CourseApplication.objects.update_or_create(
            student=student,
            course=course,
            defaults={
                'status': 'approved',
                'note': note,
                'reviewed_at': now,
                'reviewed_by': request.user,
            }
        )

        enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            course=course,
            defaults={'status': 'active'}
        )
        if not created:
            enrollment.status = 'active'
            enrollment.save(update_fields=['status'])

        return Response({
            'application_id': app.id,
            'enrollment_id': enrollment.id,
            'created': created,
            'message': f'{student.username} enrolled in {course.title}.',
        }, status=status.HTTP_201_CREATED)


class AdminCourseApplicationDetailView(APIView):
    """
    PATCH /api/admin/course-applications/<id>/
    Body: { status: 'approved' | 'rejected', note?: str }

    Approves or rejects a single CourseApplication directly. This covers
    applications that have no linked SubscriptionPayment (e.g. free
    courses applied to via POST /api/courses/apply/) — payment-linked
    applications are still approved/rejected through
    SubscriptionPaymentViewSet.approve/reject, which also handles the
    subscription + invoice side and keeps this record in sync.
    """
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from django.db import transaction
        from courses.models import CourseApplication, Enrollment

        try:
            app = CourseApplication.objects.select_related('student', 'course').get(pk=pk)
        except CourseApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ('approved', 'rejected'):
            return Response(
                {'error': "status must be 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if app.status not in ('pending',):
            return Response(
                {'error': f'Application is already {app.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note = request.data.get('note', '')
        now = timezone.now()

        with transaction.atomic():
            app.status = new_status
            app.note = note
            app.reviewed_at = now
            app.reviewed_by = request.user
            app.save(update_fields=['status', 'note', 'reviewed_at', 'reviewed_by'])

            if new_status == 'approved':
                enrollment, created = Enrollment.objects.get_or_create(
                    student=app.student,
                    course=app.course,
                    defaults={'status': 'active'},
                )
                if not created and enrollment.status != 'active':
                    enrollment.status = 'active'
                    enrollment.save(update_fields=['status'])

        return Response({
            'application_id': app.id,
            'status': app.status,
            'reviewed_at': app.reviewed_at,
        })


# ============================================================
# EVALUATIONS MANAGEMENT VIEW
# ============================================================

class AdminEvaluationsView(APIView):
    """List pending evaluations (submitted subjective answers) with pagination and filtering."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from exams.models import SubjectiveAnswer, Evaluation

        status_filter = request.query_params.get('status', 'submitted')  # 'submitted', 'under-review', 'evaluated', 'all'
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Start with pending evaluations
        qs = SubjectiveAnswer.objects.select_related(
            'attempt__student', 'question'
        ).order_by('-submitted_at')

        if status_filter != 'all':
            qs = qs.filter(status=status_filter)

        if search:
            qs = qs.filter(
                Q(attempt__student__username__icontains=search) |
                Q(attempt__student__email__icontains=search) |
                Q(attempt__student__first_name__icontains=search) |
                Q(attempt__student__last_name__icontains=search) |
                Q(question__text__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        answers = qs[start:start + page_size]

        data = []
        for answer in answers:
            # Check if evaluation exists for this answer
            evaluation = Evaluation.objects.filter(answer=answer).first()

            data.append({
                "id": answer.id,
                "student": answer.attempt.student.get_full_name() or answer.attempt.student.username,
                "studentId": answer.attempt.student.id,
                "email": answer.attempt.student.email,
                "question": answer.question.text[:100] if answer.question else '',
                "questionId": answer.question.id if answer.question else None,
                "marks": float(answer.question.marks) if answer.question else 0,
                "status": answer.status,
                "submittedAt": answer.submitted_at.isoformat() if answer.submitted_at else None,
                "wordCount": answer.word_count,
                "evaluator": evaluation.evaluator.get_full_name() or evaluation.evaluator.username if evaluation else None,
                "marksObtained": float(evaluation.marks_obtained) if evaluation else None,
                "evaluatedAt": evaluation.evaluated_at.isoformat() if evaluation else None,
            })

        return Response({
            "evaluations": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })


# ============================================================
# STUDY MATERIALS MANAGEMENT VIEW
# ============================================================

class AdminStudyMaterialsView(APIView):
    """List study materials with pagination and filtering."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from notes.models import StudyMaterial

        status_filter = request.query_params.get('status', 'published')  # 'draft', 'pending_review', 'published', 'all'
        material_type = request.query_params.get('type', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Start with all materials ordered by creation date
        qs = StudyMaterial.objects.select_related(
            'teacher', 'subject', 'exam'
        ).order_by('-created_at')

        if status_filter != 'all':
            qs = qs.filter(status=status_filter)

        if material_type:
            qs = qs.filter(material_type=material_type)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(teacher__username__icontains=search) |
                Q(subject__name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        materials = qs[start:start + page_size]

        data = []
        for material in materials:
            data.append({
                "id": material.id,
                "title": material.title,
                "description": material.description[:100] if material.description else '',
                "teacher": material.teacher.get_full_name() or material.teacher.username if material.teacher else 'Unknown',
                "subject": material.subject.name if material.subject else 'N/A',
                "exam": material.exam.name if material.exam else 'N/A',
                "materialType": material.material_type,
                "difficulty": material.difficulty,
                "status": material.status,
                "accessType": material.access_type,
                "estimatedReadingTime": material.estimated_reading_time,
                "createdAt": material.created_at.isoformat(),
                "updatedAt": material.updated_at.isoformat(),
            })

        return Response({
            "materials": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })

    def post(self, request):
        """Create a study material.

        Accepts JSON or multipart (when an actual file is attached).
        """
        from notes.models import StudyMaterial

        title = (request.data.get('title') or '').strip()
        exam_id = request.data.get('exam')
        subject_id = request.data.get('subject')

        missing = [f for f, v in (
            ('title', title), ('exam', exam_id), ('subject', subject_id)
        ) if not v]
        if missing:
            return Response(
                {"error": f"Missing required field(s): {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exam = Exam.objects.get(pk=exam_id)
        except (Exam.DoesNotExist, ValueError, TypeError):
            return Response({"error": "That exam does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        from exams.models import Subject as SubjectModel, Topic as TopicModel
        try:
            subject = SubjectModel.objects.get(pk=subject_id)
        except (SubjectModel.DoesNotExist, ValueError, TypeError):
            return Response({"error": "That subject does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        topic = None
        topic_id = request.data.get('topic')
        if topic_id:
            try:
                topic = TopicModel.objects.get(pk=topic_id)
            except (TopicModel.DoesNotExist, ValueError, TypeError):
                return Response({"error": "That topic does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        material_type = (request.data.get('material_type') or 'notes').strip().lower()
        if material_type not in dict(StudyMaterial.MATERIAL_TYPES):
            return Response({"error": f"Unsupported material_type: {material_type}"}, status=status.HTTP_400_BAD_REQUEST)

        difficulty = (request.data.get('difficulty') or 'beginner').strip().lower()
        if difficulty not in dict(StudyMaterial.DIFFICULTY_CHOICES):
            return Response({"error": f"Unsupported difficulty: {difficulty}"}, status=status.HTTP_400_BAD_REQUEST)

        access_type = (request.data.get('access_type') or 'free').strip().lower()
        if access_type not in dict(StudyMaterial.ACCESS_TYPES):
            return Response({"error": f"Unsupported access_type: {access_type}"}, status=status.HTTP_400_BAD_REQUEST)

        material_status = (request.data.get('status') or 'draft').strip().lower()
        if material_status not in dict(StudyMaterial.STATUS_CHOICES):
            return Response({"error": f"Unsupported status: {material_status}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reading_time = int(request.data.get('estimated_reading_time', 10))
        except (TypeError, ValueError):
            return Response({"error": "estimated_reading_time must be a number."}, status=status.HTTP_400_BAD_REQUEST)

        # A material has to carry something a student can actually open.
        upload = request.FILES.get('file')
        external_url = (request.data.get('external_url') or '').strip()
        content = request.data.get('content') or ''
        if not upload and not external_url and not content.strip():
            return Response(
                {"error": "Add file content, an external link, or written content."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from notes.models import MaterialCategory
        category = None
        category_id = request.data.get('category')
        if category_id:
            try:
                category = MaterialCategory.objects.get(pk=category_id)
            except (MaterialCategory.DoesNotExist, ValueError, TypeError):
                return Response({"error": "That category does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        material = StudyMaterial.objects.create(
            title=title,
            teacher=request.user,
            exam=exam,
            subject=subject,
            topic=topic,
            category=category,
            description=request.data.get('description') or '',
            content=content,
            material_type=material_type,
            difficulty=difficulty,
            access_type=access_type,
            status=material_status,
            external_url=external_url or None,
            estimated_reading_time=reading_time,
        )
        if upload:
            material.file = upload
            material.save(update_fields=['file'])

        AuditLog.objects.create(
            actor=request.user, action='CREATE_STUDY_MATERIAL',
            entity_type='StudyMaterial', entity_id=str(material.id),
            details={"title": material.title, "status": material.status},
        )

        return Response({
            "id": material.id,
            "title": material.title,
            "slug": material.slug,
            "status": material.status,
            "materialType": material.material_type,
            "subject": subject.name,
            "exam": exam.name,
        }, status=status.HTTP_201_CREATED)


class AdminStudyMaterialDetailView(APIView):
    """Retrieve, update or delete a single study material."""
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        from notes.models import StudyMaterial
        return StudyMaterial.objects.select_related(
            'teacher', 'subject', 'exam', 'topic'
        ).filter(pk=pk).first()

    def get(self, request, pk):
        material = self._get(pk)
        if not material:
            return Response({"error": "Study material not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": material.id,
            "title": material.title,
            "slug": material.slug,
            "description": material.description,
            "content": material.content,
            "teacher": (material.teacher.get_full_name() or material.teacher.username) if material.teacher else None,
            "exam": material.exam.name if material.exam else None,
            "examId": material.exam_id,
            "subject": material.subject.name if material.subject else None,
            "subjectId": material.subject_id,
            "topic": material.topic.name if material.topic else None,
            "topicId": material.topic_id,
            "materialType": material.material_type,
            "difficulty": material.difficulty,
            "accessType": material.access_type,
            "status": material.status,
            "reviewNote": material.review_note,
            "externalUrl": material.external_url,
            "fileUrl": material.file.url if material.file else None,
            "estimatedReadingTime": material.estimated_reading_time,
            "createdAt": material.created_at.isoformat(),
            "updatedAt": material.updated_at.isoformat(),
        })

    def patch(self, request, pk):
        from notes.models import StudyMaterial

        material = self._get(pk)
        if not material:
            return Response({"error": "Study material not found."}, status=status.HTTP_404_NOT_FOUND)

        simple_fields = ['title', 'description', 'content', 'review_note']
        for field in simple_fields:
            if field in request.data:
                setattr(material, field, request.data[field] or '')

        choice_fields = {
            'material_type': StudyMaterial.MATERIAL_TYPES,
            'difficulty': StudyMaterial.DIFFICULTY_CHOICES,
            'access_type': StudyMaterial.ACCESS_TYPES,
            'status': StudyMaterial.STATUS_CHOICES,
        }
        for field, choices in choice_fields.items():
            if field in request.data:
                value = str(request.data[field]).strip().lower()
                if value not in dict(choices):
                    return Response({"error": f"Unsupported {field}: {value}"}, status=status.HTTP_400_BAD_REQUEST)
                setattr(material, field, value)

        if 'estimated_reading_time' in request.data:
            try:
                material.estimated_reading_time = int(request.data['estimated_reading_time'])
            except (TypeError, ValueError):
                return Response({"error": "estimated_reading_time must be a number."}, status=status.HTTP_400_BAD_REQUEST)

        if 'external_url' in request.data:
            material.external_url = (request.data['external_url'] or '').strip() or None

        if request.FILES.get('file'):
            material.file = request.FILES['file']

        material.save()

        AuditLog.objects.create(
            actor=request.user, action='UPDATE_STUDY_MATERIAL',
            entity_type='StudyMaterial', entity_id=str(material.id),
            details={"title": material.title, "status": material.status},
        )
        return Response({"success": True, "id": material.id, "status": material.status})

    def delete(self, request, pk):
        material = self._get(pk)
        if not material:
            return Response({"error": "Study material not found."}, status=status.HTTP_404_NOT_FOUND)

        title = material.title
        material.delete()
        AuditLog.objects.create(
            actor=request.user, action='DELETE_STUDY_MATERIAL',
            entity_type='StudyMaterial', entity_id=str(pk),
            details={"title": title},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# STUDY PLANS MANAGEMENT VIEW
# ============================================================

class AdminStudyPlansView(APIView):
    """List study plans with pagination and filtering."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from study_plan.models import StudyPlan

        search = request.query_params.get('search', '')
        level_filter = request.query_params.get('level', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Start with all study plans ordered by creation date
        qs = StudyPlan.objects.select_related(
            'student', 'exam', 'template'
        ).order_by('-created_at')

        if level_filter:
            qs = qs.filter(level=level_filter)

        if search:
            qs = qs.filter(
                Q(student__username__icontains=search) |
                Q(student__email__icontains=search) |
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(exam__name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        study_plans = qs[start:start + page_size]

        data = []
        for plan in study_plans:
            data.append({
                "id": plan.id,
                "student": plan.student.get_full_name() or plan.student.username,
                "studentId": plan.student.id,
                "email": plan.student.email,
                "exam": plan.exam.name if plan.exam else 'N/A',
                "examId": plan.exam.id if plan.exam else None,
                "template": plan.template.name if plan.template else None,
                "targetDate": plan.target_date.isoformat(),
                "dailyMinutes": plan.daily_minutes,
                "level": plan.level,
                "isPaused": plan.is_paused,
                "studyDays": plan.study_days,
                "preferredTime": plan.preferred_time,
                "createdAt": plan.created_at.isoformat(),
                "updatedAt": plan.updated_at.isoformat(),
            })

        return Response({
            "plans": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })

    def post(self, request):
        """Create study plans for one or more students and generate their tasks.

        Accepts either `student` (a single id) or `students` (a list). Students
        who already hold a plan are reported as skipped rather than failing the
        whole batch, so assigning to "all students" stays useful as the roster
        grows.
        """
        from study_plan.models import StudyPlan, StudyPlanTemplate
        from study_plan.services import generate_study_plan_tasks

        raw_students = request.data.get('students')
        if raw_students is None:
            single = request.data.get('student')
            raw_students = [single] if single else []
        if not isinstance(raw_students, list):
            return Response({"error": "students must be a list of student ids."},
                            status=status.HTTP_400_BAD_REQUEST)

        exam_id = request.data.get('exam')
        target_date = request.data.get('target_date')

        missing = [f for f, v in (
            ('students', raw_students), ('exam', exam_id), ('target_date', target_date)
        ) if not v]
        if missing:
            return Response(
                {"error": f"Missing required field(s): {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exam = Exam.objects.get(pk=exam_id)
        except (Exam.DoesNotExist, ValueError, TypeError):
            return Response({"error": "That exam does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        template = None
        template_id = request.data.get('template')
        if template_id:
            try:
                template = StudyPlanTemplate.objects.get(pk=template_id)
            except (StudyPlanTemplate.DoesNotExist, ValueError, TypeError):
                return Response({"error": "That template does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        parsed_date = parse_date(str(target_date))
        if not parsed_date:
            return Response({"error": "target_date must be in YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
        if parsed_date <= timezone.now().date():
            return Response({"error": "target_date must be in the future."}, status=status.HTTP_400_BAD_REQUEST)

        level = (request.data.get('level') or 'BEGINNER').upper()
        if level not in dict(StudyPlan.LEVEL_CHOICES):
            return Response({"error": f"Unsupported level: {level}"}, status=status.HTTP_400_BAD_REQUEST)

        preferred_time = request.data.get('preferred_time') or None
        if preferred_time:
            preferred_time = preferred_time.upper()
            if preferred_time not in dict(StudyPlan.TIME_CHOICES):
                return Response({"error": f"Unsupported preferred_time: {preferred_time}"}, status=status.HTTP_400_BAD_REQUEST)

        study_days = request.data.get('study_days') or []
        if not isinstance(study_days, list):
            return Response({"error": "study_days must be a list of day names."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            daily_minutes = int(request.data.get('daily_minutes', 120))
        except (TypeError, ValueError):
            return Response({"error": "daily_minutes must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if daily_minutes < 1:
            return Response({"error": "daily_minutes must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve every requested student up front, then walk the list in the
        # order it was given so the report lines up with what the admin picked.
        found = {u.pk: u for u in User.objects.filter(pk__in=[
            s for s in raw_students if str(s).isdigit()
        ])}
        already_planned = set(
            StudyPlan.objects.filter(student_id__in=found.keys())
            .values_list('student_id', flat=True)
        )

        created, skipped, warnings = [], [], []

        for raw_id in raw_students:
            student = found.get(int(raw_id)) if str(raw_id).isdigit() else None
            if not student:
                skipped.append({"student": str(raw_id), "reason": "Student not found."})
                continue

            # StudyPlan.student is a OneToOneField, so a student can only ever
            # hold one plan.
            if student.pk in already_planned:
                skipped.append({
                    "student": student.get_full_name() or student.username,
                    "reason": "Already has a study plan.",
                })
                continue

            plan = StudyPlan.objects.create(
                student=student,
                exam=exam,
                template=template,
                target_date=parsed_date,
                daily_minutes=daily_minutes,
                study_days=study_days,
                preferred_time=preferred_time,
                level=level,
            )

            # Fill the calendar straight away so the plan is usable on creation.
            task_count = 0
            try:
                generate_study_plan_tasks(plan)
                task_count = plan.tasks.count()
            except Exception as exc:  # A generation failure must not lose the plan.
                warnings.append(
                    f"{student.get_full_name() or student.username}: tasks could not be generated ({exc})."
                )

            created.append({
                "id": plan.id,
                "student": plan.student.get_full_name() or plan.student.username,
                "task_count": task_count,
            })

        payload = {
            "created": created,
            "skipped": skipped,
            "created_count": len(created),
            "skipped_count": len(skipped),
            "task_count": sum(c["task_count"] for c in created),
            "exam": exam.name,
            "targetDate": parsed_date.isoformat(),
        }
        if warnings:
            payload["warning"] = " ".join(warnings)

        if not created:
            # Nothing was created, so tell the caller why rather than reporting
            # a hollow success.
            reasons = "; ".join(f"{s['student']} — {s['reason']}" for s in skipped)
            payload["error"] = reasons or "No study plans could be created."
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        return Response(payload, status=status.HTTP_201_CREATED)


class AdminStudyPlanDetailView(APIView):
    """Retrieve, update or delete a single study plan."""
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        from study_plan.models import StudyPlan
        return StudyPlan.objects.select_related('student', 'exam', 'template').filter(pk=pk).first()

    def get(self, request, pk):
        plan = self._get(pk)
        if not plan:
            return Response({"error": "Study plan not found."}, status=status.HTTP_404_NOT_FOUND)

        tasks = plan.tasks.order_by('date', 'id')
        return Response({
            "id": plan.id,
            "student": plan.student.get_full_name() or plan.student.username,
            "studentId": plan.student.id,
            "email": plan.student.email,
            "exam": plan.exam.name if plan.exam else None,
            "examId": plan.exam_id,
            "template": plan.template.name if plan.template else None,
            "templateId": plan.template_id,
            "targetDate": plan.target_date.isoformat(),
            "dailyMinutes": plan.daily_minutes,
            "studyDays": plan.study_days,
            "preferredTime": plan.preferred_time,
            "level": plan.level,
            "isPaused": plan.is_paused,
            "taskCount": tasks.count(),
            "completedTasks": tasks.filter(status='COMPLETED').count(),
            "tasks": [{
                "id": t.id,
                "date": t.date.isoformat(),
                "title": t.title,
                "taskType": t.task_type,
                "durationMinutes": t.duration_minutes,
                "status": t.status,
            } for t in tasks[:200]],
        })

    def patch(self, request, pk):
        from study_plan.models import StudyPlan

        plan = self._get(pk)
        if not plan:
            return Response({"error": "Study plan not found."}, status=status.HTTP_404_NOT_FOUND)

        if 'target_date' in request.data:
            parsed = parse_date(str(request.data['target_date']))
            if not parsed:
                return Response({"error": "target_date must be in YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
            plan.target_date = parsed

        if 'daily_minutes' in request.data:
            try:
                plan.daily_minutes = int(request.data['daily_minutes'])
            except (TypeError, ValueError):
                return Response({"error": "daily_minutes must be a number."}, status=status.HTTP_400_BAD_REQUEST)

        if 'level' in request.data:
            level = str(request.data['level']).upper()
            if level not in dict(StudyPlan.LEVEL_CHOICES):
                return Response({"error": f"Unsupported level: {level}"}, status=status.HTTP_400_BAD_REQUEST)
            plan.level = level

        if 'preferred_time' in request.data:
            value = request.data['preferred_time']
            if value:
                value = str(value).upper()
                if value not in dict(StudyPlan.TIME_CHOICES):
                    return Response({"error": f"Unsupported preferred_time: {value}"}, status=status.HTTP_400_BAD_REQUEST)
            plan.preferred_time = value or None

        if 'study_days' in request.data:
            if not isinstance(request.data['study_days'], list):
                return Response({"error": "study_days must be a list of day names."}, status=status.HTTP_400_BAD_REQUEST)
            plan.study_days = request.data['study_days']

        if 'is_paused' in request.data:
            plan.is_paused = bool(request.data['is_paused'])

        plan.save()
        return Response({"success": True, "id": plan.id})

    def delete(self, request, pk):
        plan = self._get(pk)
        if not plan:
            return Response({"error": "Study plan not found."}, status=status.HTTP_404_NOT_FOUND)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# AUDIT LOGS MANAGEMENT VIEW
# ============================================================

class AdminAuditLogsView(APIView):
    """Aggregate audit logs from system activities."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from exams.models import Question, Evaluation, SubjectiveAnswer

        action_filter = request.query_params.get('action', '')  # 'user', 'content', 'evaluation', 'all'
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Collect audit events from various sources
        events = []

        # User registration events
        if action_filter in ('user', 'all', ''):
            users = User.objects.all().order_by('-date_joined')[:100]
            for user in users:
                events.append({
                    'timestamp': user.date_joined,
                    'action': 'user_registration',
                    'actionLabel': 'User Registration',
                    'user': user.get_full_name() or user.username,
                    'email': user.email,
                    'details': f'{user.get_full_name() or user.username} ({user.role}) registered',
                    'severity': 'info',
                })

        # Question creation/modification events
        if action_filter in ('content', 'all', ''):
            questions = Question.objects.all().order_by('-created_at')[:50]
            for q in questions:
                creator = q.created_by.get_full_name() or q.created_by.username if q.created_by else 'Unknown'
                events.append({
                    'timestamp': q.created_at,
                    'action': 'content_created',
                    'actionLabel': 'Content Created',
                    'user': creator,
                    'email': q.created_by.email if q.created_by else 'N/A',
                    'details': f'Question "{q.text[:50]}..." created by {creator}',
                    'severity': 'info',
                })

        # Evaluation events
        if action_filter in ('evaluation', 'all', ''):
            evaluations = Evaluation.objects.select_related(
                'evaluator', 'answer__attempt__student'
            ).order_by('-evaluated_at')[:50]
            for eval in evaluations:
                student = eval.answer.attempt.student
                evaluator = eval.evaluator.get_full_name() or eval.evaluator.username if eval.evaluator else 'Unknown'
                events.append({
                    'timestamp': eval.evaluated_at,
                    'action': 'evaluation_submitted',
                    'actionLabel': 'Evaluation Submitted',
                    'user': evaluator,
                    'email': eval.evaluator.email if eval.evaluator else 'N/A',
                    'details': f'Answer by {student.get_full_name() or student.username} evaluated with {eval.marks_obtained} marks',
                    'severity': 'info',
                })

        # Sort all events by timestamp descending
        events.sort(key=lambda e: e['timestamp'], reverse=True)

        # Apply search filter
        if search:
            events = [e for e in events if (
                search.lower() in e['user'].lower() or
                search.lower() in e['email'].lower() or
                search.lower() in e['details'].lower()
            )]

        total = len(events)
        start = (page - 1) * page_size
        paginated_events = events[start:start + page_size]

        # Format for response
        data = []
        for event in paginated_events:
            data.append({
                "timestamp": event['timestamp'].isoformat(),
                "action": event['action'],
                "actionLabel": event['actionLabel'],
                "user": event['user'],
                "email": event['email'],
                "details": event['details'],
                "severity": event['severity'],
            })

        return Response({
            "logs": data,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size,
        })


class AdminNotificationsListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from core.models import AdminNotification

        # Get filter parameters
        status_filter = request.query_params.get('status', '')
        type_filter = request.query_params.get('type', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        audience_filter = request.query_params.get('audience', '')
        date_from = request.query_params.get('date_from', '')
        date_to = request.query_params.get('date_to', '')

        # Read counts come from the delivery rows, annotated so the list stays
        # a single query no matter how many campaigns are shown.
        query = AdminNotification.objects.select_related('created_by').annotate(
            delivered_count=Count('deliveries', distinct=True),
            read_total=Count('deliveries', filter=Q(deliveries__is_read=True), distinct=True),
        )

        if status_filter:
            query = query.filter(status=status_filter)
        if type_filter:
            query = query.filter(type=type_filter)
        if audience_filter:
            query = query.filter(target_role=audience_filter)
        if date_from:
            query = query.filter(created_at__date__gte=date_from)
        if date_to:
            query = query.filter(created_at__date__lte=date_to)
        if search:
            query = query.filter(Q(title__icontains=search) | Q(content__icontains=search))

        total = query.count()
        start = (page - 1) * page_size
        notifications = query[start:start + page_size]

        data = []
        for notif in notifications:
            data.append({
                'id': notif.id,
                'title': notif.title,
                'content': notif.content,
                'type': notif.type,
                'targetRole': notif.target_role,
                'status': notif.status,
                'recipientCount': notif.delivered_count,
                'readCount': notif.read_total,
                'unreadCount': max(0, notif.delivered_count - notif.read_total),
                'scheduledFor': notif.scheduled_for.isoformat() if notif.scheduled_for else None,
                'sentAt': notif.sent_at.isoformat() if notif.sent_at else None,
                'createdBy': notif.created_by.get_full_name() or notif.created_by.username if notif.created_by else 'N/A',
                'createdAt': notif.created_at.isoformat(),
                'updatedAt': notif.updated_at.isoformat(),
            })

        # Status counts span every campaign, not just this page — deriving them
        # from the page would understate them as soon as pagination kicks in.
        status_counts = dict(
            AdminNotification.objects.values_list('status')
            .annotate(n=Count('id')).values_list('status', 'n')
        )

        return Response({
            'notifications': data,
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total + page_size - 1) // page_size,
            'summary': {
                'total': AdminNotification.objects.count(),
                'sent': status_counts.get('sent', 0),
                'draft': status_counts.get('draft', 0),
                'scheduled': status_counts.get('scheduled', 0),
                'failed': status_counts.get('failed', 0),
            },
        })


class AdminNotificationsCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        """Create an admin notification and, for send-now, deliver it.

        delivery = 'now'      → fan out to recipients, status becomes 'sent'
        delivery = 'schedule' → stored with scheduled_for, status 'scheduled'
        delivery = 'draft'    → stored only
        """
        from core.models import AdminNotification
        from core.notification_service import (
            AUDIENCE_CHOICES, NotificationBroadcastError,
            broadcast_admin_notification, resolve_audience,
        )

        title = (request.data.get('title') or '').strip()
        content = (request.data.get('content') or '').strip()
        notif_type = (request.data.get('type') or 'announcement').strip().lower()
        audience = (request.data.get('targetRole') or 'all').strip().lower()
        delivery = (request.data.get('delivery') or 'draft').strip().lower()
        scheduled_for = request.data.get('scheduledFor')
        course_id = request.data.get('courseId')
        user_ids = request.data.get('userIds') or []

        errors = {}
        if not title:
            errors['title'] = 'Title is required.'
        if not content:
            errors['content'] = 'Message is required.'
        if notif_type not in dict(AdminNotification.TYPE_CHOICES):
            errors['type'] = f'Unsupported type: {notif_type}'
        if audience not in dict(AUDIENCE_CHOICES):
            errors['targetRole'] = f'Unsupported audience: {audience}'
        if delivery not in ('now', 'schedule', 'draft'):
            errors['delivery'] = f'Unsupported delivery: {delivery}'
        if delivery == 'schedule':
            if not scheduled_for:
                errors['scheduledFor'] = 'Pick a date and time to schedule for.'
            else:
                parsed = parse_datetime(str(scheduled_for))
                if not parsed:
                    errors['scheduledFor'] = 'scheduledFor must be an ISO-8601 datetime.'
                elif parsed <= timezone.now():
                    errors['scheduledFor'] = 'The scheduled time must be in the future.'
        if user_ids and not isinstance(user_ids, list):
            errors['userIds'] = 'userIds must be a list.'

        if errors:
            return Response({'error': 'Validation failed.', 'details': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        # Confirm the audience resolves before writing anything.
        try:
            recipients = resolve_audience(audience, course_id=course_id, user_ids=user_ids)
            recipient_preview = recipients.count()
        except NotificationBroadcastError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if delivery == 'now' and recipient_preview == 0:
            return Response(
                {'error': 'That audience currently has no active recipients.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            notification = AdminNotification.objects.create(
                title=title,
                content=content,
                type=notif_type,
                target_role=audience,
                scheduled_for=parse_datetime(str(scheduled_for)) if scheduled_for else None,
                created_by=request.user,
                status='scheduled' if delivery == 'schedule' else 'draft',
            )

            delivered = 0
            if delivery == 'now':
                delivered = broadcast_admin_notification(
                    notification, course_id=course_id, user_ids=user_ids
                )

        AuditLog.objects.create(
            actor=request.user, action='CREATE_NOTIFICATION',
            entity_type='AdminNotification', entity_id=str(notification.id),
            details={'title': title, 'audience': audience, 'delivery': delivery,
                     'delivered': delivered},
        )

        return Response({
            'id': notification.id,
            'title': notification.title,
            'content': notification.content,
            'type': notification.type,
            'targetRole': notification.target_role,
            'status': notification.status,
            'scheduledFor': notification.scheduled_for.isoformat() if notification.scheduled_for else None,
            'recipientCount': notification.recipient_count,
            # 'created' and 'delivered' are reported separately on purpose — a
            # draft or scheduled notification has been stored, not delivered.
            'created': True,
            'delivered': delivered,
            'audiencePreview': recipient_preview,
        }, status=status.HTTP_201_CREATED)


class AdminNotificationsDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        from core.models import AdminNotification

        notification = AdminNotification.objects.filter(id=pk).first()
        if not notification:
            return Response({'error': 'Notification not found'},
                            status=status.HTTP_404_NOT_FOUND)

        # A sent notification is a historical record: students already have it
        # in their feed, so deleting the campaign would misrepresent what
        # happened. Drafts and scheduled ones are still safe to remove.
        if notification.status == 'sent':
            return Response(
                {'error': 'A sent notification cannot be deleted. Students have already received it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = notification.title
        notification.delete()
        AuditLog.objects.create(
            actor=request.user, action='DELETE_NOTIFICATION',
            entity_type='AdminNotification', entity_id=str(pk),
            details={'title': title},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminNotificationDetailView(APIView):
    """GET /api/admin/notifications/{id}/ — campaign detail with real read stats."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from core.models import AdminNotification
        from core.notification_service import delivery_stats

        notification = AdminNotification.objects.select_related('created_by').filter(pk=pk).first()
        if not notification:
            return Response({'error': 'Notification not found'},
                            status=status.HTTP_404_NOT_FOUND)

        stats = delivery_stats(notification)
        return Response({
            'id': notification.id,
            'title': notification.title,
            'content': notification.content,
            'type': notification.type,
            'targetRole': notification.target_role,
            'status': notification.status,
            'scheduledFor': notification.scheduled_for.isoformat() if notification.scheduled_for else None,
            'sentAt': notification.sent_at.isoformat() if notification.sent_at else None,
            'createdBy': (
                notification.created_by.get_full_name() or notification.created_by.username
            ) if notification.created_by else None,
            'createdAt': notification.created_at.isoformat(),
            'updatedAt': notification.updated_at.isoformat(),
            **stats,
        })


class AdminNotificationSendView(APIView):
    """POST /api/admin/notifications/{id}/send/ — deliver a draft or scheduled campaign."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from core.models import AdminNotification
        from core.notification_service import (
            NotificationBroadcastError, broadcast_admin_notification,
        )

        notification = AdminNotification.objects.filter(pk=pk).first()
        if not notification:
            return Response({'error': 'Notification not found'},
                            status=status.HTTP_404_NOT_FOUND)
        if notification.status == 'sent':
            return Response({'error': 'This notification has already been sent.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            delivered = broadcast_admin_notification(
                notification,
                course_id=request.data.get('courseId'),
                user_ids=request.data.get('userIds') or [],
            )
        except NotificationBroadcastError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        AuditLog.objects.create(
            actor=request.user, action='SEND_NOTIFICATION',
            entity_type='AdminNotification', entity_id=str(notification.id),
            details={'title': notification.title, 'delivered': delivered},
        )
        return Response({
            'id': notification.id,
            'status': notification.status,
            'delivered': delivered,
            'recipientCount': notification.recipient_count,
            'sentAt': notification.sent_at.isoformat() if notification.sent_at else None,
        })


class AdminNotificationCancelView(APIView):
    """POST /api/admin/notifications/{id}/cancel/ — revert a scheduled campaign to draft."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from core.models import AdminNotification

        notification = AdminNotification.objects.filter(pk=pk).first()
        if not notification:
            return Response({'error': 'Notification not found'},
                            status=status.HTTP_404_NOT_FOUND)
        if notification.status != 'scheduled':
            return Response(
                {'error': 'Only a scheduled notification can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notification.status = 'draft'
        notification.scheduled_for = None
        notification.save(update_fields=['status', 'scheduled_for', 'updated_at'])
        return Response({'id': notification.id, 'status': notification.status})


class AdminSupportTicketsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from support.models import SupportTicket
        from django.db.models import Q

        # Get filter parameters
        status_filter = request.query_params.get('status', '')
        priority_filter = request.query_params.get('priority', '')
        category_filter = request.query_params.get('category', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        base_query = SupportTicket.objects.select_related('student').all()

        # Calculate global summary metrics before filtering
        summary = {
            'total': base_query.count(),
            'open': base_query.filter(status='open').count(),
            'in_progress': base_query.filter(status='in_progress').count(),
            'resolved': base_query.filter(status='resolved').count(),
            'closed': base_query.filter(status='closed').count(),
            'high_priority': base_query.filter(priority__in=['high', 'urgent']).count(),
        }

        # Build query
        query = base_query

        if status_filter:
            query = query.filter(status=status_filter)
        if priority_filter:
            query = query.filter(priority=priority_filter)
        if category_filter:
            query = query.filter(category=category_filter)
        if search:
            query = query.filter(
                Q(ticket_number__icontains=search) |
                Q(student__email__icontains=search) |
                Q(subject__icontains=search)
            )

        total = query.count()
        start = (page - 1) * page_size
        tickets = query.order_by('-updated_at')[start:start + page_size]

        data = []
        for ticket in tickets:
            message_count = ticket.messages.count()
            data.append({
                'id': ticket.id,
                'ticketNumber': ticket.ticket_number,
                'subject': ticket.subject,
                'studentName': ticket.student.get_full_name() or ticket.student.username,
                'studentEmail': ticket.student.email,
                'category': ticket.category,
                'priority': ticket.priority,
                'status': ticket.status,
                'messageCount': message_count,
                'lastUpdated': ticket.updated_at.isoformat(),
                'createdAt': ticket.created_at.isoformat(),
            })

        return Response({
            'tickets': data,
            'summary': summary,
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total + page_size - 1) // page_size,
        })


class AdminTicketDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from support.models import SupportTicket, SupportMessage

        try:
            ticket = SupportTicket.objects.select_related('student').get(id=pk)
            messages = SupportMessage.objects.select_related('sender').filter(
                ticket=ticket
            ).order_by('created_at')

            messages_data = []
            for msg in messages:
                messages_data.append({
                    'id': msg.id,
                    'sender': msg.sender.get_full_name() or msg.sender.username,
                    'senderEmail': msg.sender.email,
                    'isStaffReply': msg.is_staff_reply,
                    'message': msg.message,
                    'createdAt': msg.created_at.isoformat(),
                })

            return Response({
                'ticket': {
                    'id': ticket.id,
                    'ticketNumber': ticket.ticket_number,
                    'subject': ticket.subject,
                    'studentName': ticket.student.get_full_name() or ticket.student.username,
                    'studentEmail': ticket.student.email,
                    'category': ticket.category,
                    'priority': ticket.priority,
                    'status': ticket.status,
                    'relatedExam': ticket.related_exam or '',
                    'relatedQuestion': ticket.related_question or '',
                    'relatedPage': ticket.related_page or '',
                    'createdAt': ticket.created_at.isoformat(),
                    'updatedAt': ticket.updated_at.isoformat(),
                    'closedAt': ticket.closed_at.isoformat() if ticket.closed_at else None,
                },
                'messages': messages_data,
            })
        except SupportTicket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminTicketReplyView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from support.models import SupportTicket, SupportMessage

        try:
            ticket = SupportTicket.objects.get(id=pk)
            message_text = request.data.get('message', '').strip()

            if not message_text:
                return Response(
                    {'error': 'Message cannot be empty'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            message = SupportMessage.objects.create(
                ticket=ticket,
                sender=request.user,
                message=message_text,
                is_staff_reply=True,
            )

            return Response({
                'id': message.id,
                'message': message.message,
                'createdAt': message.created_at.isoformat(),
                'message': 'Reply added successfully',
            }, status=status.HTTP_201_CREATED)

        except SupportTicket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminTicketUpdateStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from support.models import SupportTicket

        try:
            ticket = SupportTicket.objects.get(id=pk)
            new_status = request.data.get('status')
            new_priority = request.data.get('priority')
            updated = False

            if new_status:
                if new_status not in dict(SupportTicket.STATUS_CHOICES):
                    return Response(
                        {'error': 'Invalid status'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ticket.status = new_status
                updated = True
                if new_status == 'closed' and not ticket.closed_at:
                    ticket.closed_at = timezone.now()

            if new_priority:
                if new_priority not in dict(SupportTicket.PRIORITY_CHOICES):
                    return Response(
                        {'error': 'Invalid priority'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ticket.priority = new_priority
                updated = True

            if updated:
                ticket.save()

            return Response({
                'id': ticket.id,
                'status': ticket.status,
                'priority': ticket.priority,
                'message': 'Ticket updated successfully',
            })

        except SupportTicket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminPermissionsView(APIView):
    """Get all roles with their permissions (RBAC)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Define permission structure for each role
        permissions_structure = {
            'super-admin': {
                'id': 'super-admin',
                'name': 'Super Administrator',
                'description': 'Full platform access with all permissions',
                'isCustom': False,
                'permissionCount': 0,  # Will calculate below
                'permissions': [
                    # Users Management
                    {'id': 'users_create', 'name': 'Create User', 'category': 'Users Management', 'description': 'Create new users'},
                    {'id': 'users_edit', 'name': 'Edit User', 'category': 'Users Management', 'description': 'Edit user information'},
                    {'id': 'users_delete', 'name': 'Delete User', 'category': 'Users Management', 'description': 'Delete user accounts'},
                    {'id': 'users_view', 'name': 'View Users', 'category': 'Users Management', 'description': 'View all users'},
                    {'id': 'users_export', 'name': 'Export Users', 'category': 'Users Management', 'description': 'Export user data'},
                    # Academic Management
                    {'id': 'academic_create_exam', 'name': 'Create Exam', 'category': 'Academic Management', 'description': 'Create new exams'},
                    {'id': 'academic_edit_exam', 'name': 'Edit Exam', 'category': 'Academic Management', 'description': 'Edit exam details'},
                    {'id': 'academic_publish_exam', 'name': 'Publish Exam', 'category': 'Academic Management', 'description': 'Publish exams for students'},
                    {'id': 'academic_delete_exam', 'name': 'Delete Exam', 'category': 'Academic Management', 'description': 'Delete exams'},
                    {'id': 'academic_manage_questions', 'name': 'Manage Questions', 'category': 'Academic Management', 'description': 'Create, edit, delete questions'},
                    # Evaluations
                    {'id': 'eval_view', 'name': 'View Evaluations', 'category': 'Evaluations', 'description': 'View all evaluations'},
                    {'id': 'eval_assign', 'name': 'Assign Evaluator', 'category': 'Evaluations', 'description': 'Assign evaluators to submissions'},
                    {'id': 'eval_approve', 'name': 'Approve Evaluation', 'category': 'Evaluations', 'description': 'Approve evaluation results'},
                    {'id': 'eval_reject', 'name': 'Reject Evaluation', 'category': 'Evaluations', 'description': 'Reject evaluation results'},
                    # Marketplace
                    {'id': 'market_view_products', 'name': 'View Products', 'category': 'Marketplace', 'description': 'View all marketplace products'},
                    {'id': 'market_approve_product', 'name': 'Approve Product', 'category': 'Marketplace', 'description': 'Approve products for listing'},
                    {'id': 'market_remove_product', 'name': 'Remove Product', 'category': 'Marketplace', 'description': 'Remove products from marketplace'},
                    {'id': 'market_view_orders', 'name': 'View Orders', 'category': 'Marketplace', 'description': 'View all orders'},
                    {'id': 'market_process_payment', 'name': 'Process Payment', 'category': 'Marketplace', 'description': 'Process payments and refunds'},
                    # Analytics
                    {'id': 'analytics_view', 'name': 'View Analytics', 'category': 'Analytics', 'description': 'View platform analytics'},
                    {'id': 'analytics_export', 'name': 'Export Reports', 'category': 'Analytics', 'description': 'Export analytics reports'},
                    {'id': 'analytics_audit_logs', 'name': 'View Audit Logs', 'category': 'Analytics', 'description': 'View system audit logs'},
                    # Settings
                    {'id': 'settings_view', 'name': 'View Settings', 'category': 'Settings', 'description': 'View system settings'},
                    {'id': 'settings_modify', 'name': 'Modify Settings', 'category': 'Settings', 'description': 'Modify system settings'},
                    {'id': 'settings_manage_notif', 'name': 'Manage Notifications', 'category': 'Settings', 'description': 'Manage system notifications'},
                    # Administrators
                    {'id': 'admin_create', 'name': 'Create Admin', 'category': 'Administrators', 'description': 'Create new admin users'},
                    {'id': 'admin_edit', 'name': 'Edit Admin', 'category': 'Administrators', 'description': 'Edit admin information'},
                    {'id': 'admin_delete', 'name': 'Delete Admin', 'category': 'Administrators', 'description': 'Delete admin accounts'},
                    {'id': 'admin_assign_roles', 'name': 'Assign Roles', 'category': 'Administrators', 'description': 'Assign roles to users'},
                    # Support
                    {'id': 'support_view_tickets', 'name': 'View Tickets', 'category': 'Support', 'description': 'View support tickets'},
                    {'id': 'support_assign_ticket', 'name': 'Assign Ticket', 'category': 'Support', 'description': 'Assign tickets to staff'},
                    {'id': 'support_close_ticket', 'name': 'Close Ticket', 'category': 'Support', 'description': 'Close support tickets'},
                    {'id': 'support_respond', 'name': 'Respond to Ticket', 'category': 'Support', 'description': 'Respond to ticket messages'},
                ]
            },
            'admin': {
                'id': 'admin',
                'name': 'Administrator',
                'description': 'Can manage users, content, and settings',
                'isCustom': False,
                'permissionCount': 0,  # Will calculate below
                'permissions': [
                    # Users Management
                    {'id': 'users_create', 'name': 'Create User', 'category': 'Users Management', 'description': 'Create new users'},
                    {'id': 'users_edit', 'name': 'Edit User', 'category': 'Users Management', 'description': 'Edit user information'},
                    {'id': 'users_delete', 'name': 'Delete User', 'category': 'Users Management', 'description': 'Delete user accounts'},
                    {'id': 'users_view', 'name': 'View Users', 'category': 'Users Management', 'description': 'View all users'},
                    # Academic Management
                    {'id': 'academic_create_exam', 'name': 'Create Exam', 'category': 'Academic Management', 'description': 'Create new exams'},
                    {'id': 'academic_edit_exam', 'name': 'Edit Exam', 'category': 'Academic Management', 'description': 'Edit exam details'},
                    {'id': 'academic_manage_questions', 'name': 'Manage Questions', 'category': 'Academic Management', 'description': 'Create, edit, delete questions'},
                    # Evaluations
                    {'id': 'eval_view', 'name': 'View Evaluations', 'category': 'Evaluations', 'description': 'View all evaluations'},
                    {'id': 'eval_assign', 'name': 'Assign Evaluator', 'category': 'Evaluations', 'description': 'Assign evaluators to submissions'},
                    # Marketplace
                    {'id': 'market_view_products', 'name': 'View Products', 'category': 'Marketplace', 'description': 'View all marketplace products'},
                    {'id': 'market_approve_product', 'name': 'Approve Product', 'category': 'Marketplace', 'description': 'Approve products for listing'},
                    {'id': 'market_view_orders', 'name': 'View Orders', 'category': 'Marketplace', 'description': 'View all orders'},
                    # Analytics
                    {'id': 'analytics_view', 'name': 'View Analytics', 'category': 'Analytics', 'description': 'View platform analytics'},
                    # Settings
                    {'id': 'settings_view', 'name': 'View Settings', 'category': 'Settings', 'description': 'View system settings'},
                    # Support
                    {'id': 'support_view_tickets', 'name': 'View Tickets', 'category': 'Support', 'description': 'View support tickets'},
                    {'id': 'support_respond', 'name': 'Respond to Ticket', 'category': 'Support', 'description': 'Respond to ticket messages'},
                ]
            },
            'teacher': {
                'id': 'teacher',
                'name': 'Teacher',
                'description': 'Can create content and manage students',
                'isCustom': False,
                'permissionCount': 0,  # Will calculate below
                'permissions': [
                    # Academic Management
                    {'id': 'academic_create_exam', 'name': 'Create Exam', 'category': 'Academic Management', 'description': 'Create new exams'},
                    {'id': 'academic_edit_exam', 'name': 'Edit Exam', 'category': 'Academic Management', 'description': 'Edit exam details'},
                    {'id': 'academic_manage_questions', 'name': 'Manage Questions', 'category': 'Academic Management', 'description': 'Create, edit, delete questions'},
                    # Evaluations
                    {'id': 'eval_view', 'name': 'View Evaluations', 'category': 'Evaluations', 'description': 'View all evaluations'},
                ]
            },
            'student': {
                'id': 'student',
                'name': 'Student',
                'description': 'Can access learning materials and take exams',
                'isCustom': False,
                'permissionCount': 0,  # Will calculate below
                'permissions': [
                    # Academic Management (view only)
                    {'id': 'academic_view_exam', 'name': 'View Exam', 'category': 'Academic Management', 'description': 'View available exams'},
                    {'id': 'academic_take_exam', 'name': 'Take Exam', 'category': 'Academic Management', 'description': 'Take exams'},
                ]
            }
        }

        # Calculate permission counts
        for role_key in permissions_structure:
            permissions_structure[role_key]['permissionCount'] = len(permissions_structure[role_key]['permissions'])

        # Get all permission categories
        categories = set()
        for role_key in permissions_structure:
            for perm in permissions_structure[role_key]['permissions']:
                categories.add(perm['category'])

        roles = list(permissions_structure.values())

        return Response({
            'roles': roles,
            'totalRoles': len(roles),
            'totalPermissions': sum(r['permissionCount'] for r in roles),
            'categories': sorted(list(categories)),
        })


class AdminSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from core.models import AdminSettings

        try:
            settings = AdminSettings.get_settings()

            return Response({
                'settings': {
                    'platform': {
                        'name': settings.platform_name,
                        'logoUrl': settings.platform_logo_url,
                        'description': settings.platform_description,
                        'timezone': settings.timezone,
                        'language': settings.language,
                    },
                    'email': {
                        'smtpHost': settings.email_smtp_host,
                        'smtpPort': settings.email_smtp_port,
                        'smtpUser': settings.email_smtp_user,
                        'fromAddress': settings.email_from_address,
                        'fromName': settings.email_from_name,
                    },
                    'notifications': {
                        'enabled': settings.notifications_enabled,
                        'enableEmail': settings.enable_email_notifications,
                        'enableInApp': settings.enable_in_app_notifications,
                        'enablePush': settings.enable_push_notifications,
                    },
                    'security': {
                        'passwordMinLength': settings.password_min_length,
                        'passwordRequireUppercase': settings.password_require_uppercase,
                        'passwordRequireNumbers': settings.password_require_numbers,
                        'passwordRequireSpecialChars': settings.password_require_special_chars,
                        'sessionTimeoutMinutes': settings.session_timeout_minutes,
                        'enableTwoFactorAuth': settings.enable_two_factor_auth,
                        'maxLoginAttempts': settings.max_login_attempts,
                    },
                    'features': {
                        'enableAiTutor': settings.enable_ai_tutor,
                        'enableMarketplace': settings.enable_marketplace,
                        'enableGamification': settings.enable_gamification,
                        'enableStudyPlans': settings.enable_study_plans,
                    },
                },
                'updatedAt': settings.updated_at.isoformat(),
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        from core.models import AdminSettings

        try:
            settings = AdminSettings.get_settings()

            # Platform settings
            if 'platform' in request.data:
                platform = request.data['platform']
                settings.platform_name = platform.get('name', settings.platform_name)
                settings.platform_logo_url = platform.get('logoUrl', settings.platform_logo_url)
                settings.platform_description = platform.get('description', settings.platform_description)
                settings.timezone = platform.get('timezone', settings.timezone)
                settings.language = platform.get('language', settings.language)

            # Email settings
            if 'email' in request.data:
                email = request.data['email']
                settings.email_smtp_host = email.get('smtpHost', settings.email_smtp_host)
                settings.email_smtp_port = email.get('smtpPort', settings.email_smtp_port)
                settings.email_smtp_user = email.get('smtpUser', settings.email_smtp_user)
                settings.email_from_address = email.get('fromAddress', settings.email_from_address)
                settings.email_from_name = email.get('fromName', settings.email_from_name)

            # Notification settings
            if 'notifications' in request.data:
                notif = request.data['notifications']
                settings.notifications_enabled = notif.get('enabled', settings.notifications_enabled)
                settings.enable_email_notifications = notif.get('enableEmail', settings.enable_email_notifications)
                settings.enable_in_app_notifications = notif.get('enableInApp', settings.enable_in_app_notifications)
                settings.enable_push_notifications = notif.get('enablePush', settings.enable_push_notifications)

            # Security settings
            if 'security' in request.data:
                security = request.data['security']
                settings.password_min_length = security.get('passwordMinLength', settings.password_min_length)
                settings.password_require_uppercase = security.get('passwordRequireUppercase', settings.password_require_uppercase)
                settings.password_require_numbers = security.get('passwordRequireNumbers', settings.password_require_numbers)
                settings.password_require_special_chars = security.get('passwordRequireSpecialChars', settings.password_require_special_chars)
                settings.session_timeout_minutes = security.get('sessionTimeoutMinutes', settings.session_timeout_minutes)
                settings.enable_two_factor_auth = security.get('enableTwoFactorAuth', settings.enable_two_factor_auth)
                settings.max_login_attempts = security.get('maxLoginAttempts', settings.max_login_attempts)

            # Feature flags
            if 'features' in request.data:
                features = request.data['features']
                settings.enable_ai_tutor = features.get('enableAiTutor', settings.enable_ai_tutor)
                settings.enable_marketplace = features.get('enableMarketplace', settings.enable_marketplace)
                settings.enable_gamification = features.get('enableGamification', settings.enable_gamification)
                settings.enable_study_plans = features.get('enableStudyPlans', settings.enable_study_plans)

            settings.updated_by = request.user
            settings.save()

            return Response({
                'message': 'Settings updated successfully',
                'updatedAt': settings.updated_at.isoformat(),
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminPositionsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            positions = Position.objects.filter(is_active=True).values(
                'id', 'name', 'code', 'description', 'category', 'order', 'is_active', 'created_at', 'updated_at'
            ).order_by('order', 'name')

            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            search = request.query_params.get('search', '')

            if search:
                positions = positions.filter(
                    Q(name__icontains=search) | Q(code__icontains=search) | Q(category__icontains=search)
                )

            paginator = Paginator(list(positions), page_size)
            page_obj = paginator.get_page(page)

            return Response({
                'results': list(page_obj.object_list),
                'count': paginator.count,
                'page': page,
                'page_size': page_size,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request):
        try:
            name = request.data.get('name', '').strip()
            if not name:
                return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)

            position = Position.objects.create(
                name=name,
                code=request.data.get('code', '').strip(),
                category=request.data.get('category', '').strip(),
                order=int(request.data.get('order', 0)),
                is_active=True
            )

            return Response({
                'id': position.id,
                'name': position.name,
                'code': position.code,
                'category': position.category,
                'order': position.order,
                'is_active': position.is_active,
                'created_at': position.created_at,
                'updated_at': position.updated_at,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminTagsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            tags = Tag.objects.filter(is_active=True).values(
                'id', 'name', 'slug', 'description', 'color', 'is_active', 'created_at', 'updated_at'
            ).order_by('name')

            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            search = request.query_params.get('search', '')

            if search:
                tags = tags.filter(
                    Q(name__icontains=search) | Q(slug__icontains=search)
                )

            paginator = Paginator(list(tags), page_size)
            page_obj = paginator.get_page(page)

            return Response({
                'results': list(page_obj.object_list),
                'count': paginator.count,
                'page': page,
                'page_size': page_size,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request):
        try:
            from django.utils.text import slugify
            name = request.data.get('name', '').strip()
            if not name:
                return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)

            tag = Tag.objects.create(
                name=name,
                slug=slugify(name),
                color=request.data.get('color', '#6366f1'),
                is_active=True
            )

            return Response({
                'id': tag.id,
                'name': tag.name,
                'slug': tag.slug,
                'color': tag.color,
                'is_active': tag.is_active,
                'created_at': tag.created_at,
                'updated_at': tag.updated_at,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
