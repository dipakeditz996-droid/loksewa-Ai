from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark
from .serializers import StudyMaterialListSerializer, StudyMaterialDetailSerializer


class PublicStudyMaterialListView(APIView):
    """GET /api/notes/public/ - a small, anonymous-friendly preview of free
    published study materials for the homepage. Unlike StudyMaterialViewSet,
    this deliberately excludes premium/course-locked materials and never
    checks enrollment, since there is no logged-in student to check it against."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 6)), 100)
        except (TypeError, ValueError):
            limit = 6
        materials = StudyMaterial.objects.filter(
            status='published', access_type='free', course__isnull=True,
        ).select_related('subject', 'exam').order_by('-created_at')[:limit]

        data = [{
            'id': m.id,
            'title': m.title,
            'description': m.description,
            'material_type': m.material_type,
            'difficulty': m.difficulty,
            'estimated_reading_time': m.estimated_reading_time,
            'subject_name': m.subject.name if m.subject else None,
            'exam_name': m.exam.name if m.exam else None,
            'created_at': m.created_at.isoformat() if m.created_at else None,
        } for m in materials]
        return Response(data)

class StudyMaterialViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = StudyMaterial.objects.filter(status='published')
        
        # Enforce Enrollment Access Control
        # Students can only see materials belonging to courses they are enrolled in, 
        # or materials not explicitly linked to a course.
        from courses.models import Enrollment
        active_courses = Enrollment.objects.filter(student=self.request.user, status='active').values_list('course_id', flat=True)
        queryset = queryset.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))
        
        # Filtering
        exam = self.request.query_params.get('exam')
        subject = self.request.query_params.get('subject')
        topic = self.request.query_params.get('topic')
        course = self.request.query_params.get('course')
        material_type = self.request.query_params.get('material_type')
        search = self.request.query_params.get('search')
        
        if exam:
            queryset = queryset.filter(exam_id=exam)
        if subject:
            queryset = queryset.filter(subject_id=subject)
        if topic:
            queryset = queryset.filter(topic_id=topic)
        if course:
            queryset = queryset.filter(course_id=course)
        if material_type:
            queryset = queryset.filter(material_type=material_type)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(content__icontains=search)
            )
            
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudyMaterialDetailSerializer
        return StudyMaterialListSerializer

    @action(detail=True, methods=['post', 'delete'])
    def bookmark(self, request, pk=None):
        material = self.get_object()
        if request.method == 'POST':
            StudentMaterialBookmark.objects.get_or_create(student=request.user, material=material)
            return Response({"status": "bookmarked"})
        elif request.method == 'DELETE':
            StudentMaterialBookmark.objects.filter(student=request.user, material=material).delete()
            return Response({"status": "unbookmarked"})

    @action(detail=True, methods=['post'])
    def progress(self, request, pk=None):
        material = self.get_object()
        progress_val = request.data.get('progress', 0)
        
        try:
            progress_val = int(progress_val)
        except ValueError:
            return Response({"error": "Invalid progress value"}, status=status.HTTP_400_BAD_REQUEST)
            
        prog, _ = StudentMaterialProgress.objects.get_or_create(student=request.user, material=material)
        
        # Only update if new progress is higher or it's a specific manual update
        if progress_val > prog.progress:
            prog.progress = progress_val
            if progress_val >= 100:
                prog.completed = True
            prog.save()
            
        return Response({"status": "progress updated", "progress": prog.progress})

    @action(detail=False, methods=['get'])
    def bookmarks(self, request):
        bookmarks = StudentMaterialBookmark.objects.filter(student=request.user).values_list('material_id', flat=True)
        queryset = StudyMaterial.objects.filter(id__in=bookmarks, status='published')
        
        from courses.models import Enrollment
        active_courses = Enrollment.objects.filter(student=self.request.user, status='active').values_list('course_id', flat=True)
        queryset = queryset.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_progress = StudentMaterialProgress.objects.filter(student=request.user).order_by('-last_viewed_at')[:5]
        material_ids = [rp.material_id for rp in recent_progress]
        
        queryset = StudyMaterial.objects.filter(id__in=material_ids, status='published')
        from courses.models import Enrollment
        active_courses = Enrollment.objects.filter(student=self.request.user, status='active').values_list('course_id', flat=True)
        queryset = queryset.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))
        
        # Sort in Python to keep the recent order
        materials_dict = {m.id: m for m in queryset}
        ordered_materials = [materials_dict[mid] for mid in material_ids if mid in materials_dict]
        
        serializer = self.get_serializer(ordered_materials, many=True)
        return Response(serializer.data)

# ==========================================
# TEACHER / ADMIN WORKFLOW VIEWS
# ==========================================
from .serializers import TeacherStudyMaterialSerializer, AdminStudyMaterialSerializer

class TeacherStudyMaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TeacherStudyMaterialSerializer

    def get_queryset(self):
        # Teachers only see their own materials
        queryset = StudyMaterial.objects.filter(teacher=self.request.user)
        
        status_filter = self.request.query_params.get('status')
        exam = self.request.query_params.get('exam')
        subject = self.request.query_params.get('subject')
        course = self.request.query_params.get('course')
        search = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if exam:
            queryset = queryset.filter(exam_id=exam)
        if subject:
            queryset = queryset.filter(subject_id=subject)
        if course:
            queryset = queryset.filter(course_id=course)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
            
        return queryset.order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user, status='draft')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns material count grouped by status for the requesting teacher."""
        from django.db.models import Count
        qs = StudyMaterial.objects.filter(teacher=request.user)
        counts = qs.values('status').annotate(count=Count('id'))
        result = {item['status']: item['count'] for item in counts}
        return Response({
            'total': qs.count(),
            'draft': result.get('draft', 0),
            'pending_review': result.get('pending_review', 0),
            'published': result.get('published', 0),
            'changes_requested': result.get('changes_requested', 0),
            'rejected': result.get('rejected', 0),
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        material = self.get_object()
        if material.status in ['draft', 'changes_requested', 'rejected']:
            material.status = 'pending_review'
            material.save()

            from core.notification_service import NotificationService
            NotificationService.notify_admins(
                notif_type='material_review',
                title='Study Material Submitted for Review',
                message=f"{request.user.get_full_name() or request.user.username} submitted '{material.title}' for review.",
                action_url='/admin-dashboard/study-materials',
            )

            return Response({"status": "Submitted for review"})
        return Response({"error": "Invalid status for submission"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        material = self.get_object()
        material.pk = None
        material.title = f"{material.title} (Copy)"
        material.status = 'draft'
        material.slug = "" # Will be regenerated
        material.save()
        return Response(TeacherStudyMaterialSerializer(material).data)


class AdminStudyMaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminStudyMaterialSerializer
    queryset = StudyMaterial.objects.all().order_by('-updated_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        material = self.get_object()
        if material.teacher == request.user:
            return Response({"detail": "You cannot approve your own material."}, status=status.HTTP_403_FORBIDDEN)
        material.status = 'published'
        material.save()
        return Response({"status": "Approved and published"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        material = self.get_object()
        material.status = 'rejected'
        material.review_note = request.data.get('note', '')
        material.save()
        return Response({"status": "Rejected"})

    @action(detail=True, methods=['post'])
    def request_changes(self, request, pk=None):
        material = self.get_object()
        material.status = 'changes_requested'
        material.review_note = request.data.get('note', 'Please update the material and resubmit.')
        material.save()
        return Response({"status": "Changes requested"})

        material.save()
        return Response({"status": "Changes requested"})
