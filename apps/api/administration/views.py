from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta, date
from core.models import User
from exams.models import Exam, Question, ModelExam, ModelExamAttempt, PracticeSession, ExaminationAttempt
from notes.models import StudyMaterial
from marketplace.models import Product, PaymentSubmission, Purchase
from games.models import GameMatch, SurvivalGame
from ai_tutor.models import Conversation, TutorUsage
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
