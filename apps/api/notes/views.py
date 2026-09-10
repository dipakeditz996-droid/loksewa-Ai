from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark
from .serializers import StudyMaterialListSerializer, StudyMaterialDetailSerializer
from subscriptions.access import has_active_subscription


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
        } for m in materials]

        return Response(data)


class StudyMaterialViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = StudyMaterial.objects.filter(status='published').select_related(
            'subject', 'chapter', 'topic', 'exam', 'exam__parent', 'exam__category', 'course'
        )

        user = self.request.user
        is_privileged = user.is_staff or user.is_superuser or user.role in ('admin', 'super-admin', 'teacher')

        # Enforce Enrollment & Preparation Access Control for students
        if not is_privileged:
            from courses.models import Enrollment
            active_enrollments = Enrollment.objects.filter(student=user, status='active').select_related('course', 'course__exam')
            authorized_course_ids = set(e.course_id for e in active_enrollments)
            authorized_exam_ids = set(e.course.exam_id for e in active_enrollments if e.course and e.course.exam_id)

            profile = getattr(user, 'student_profile', None)
            if profile:
                if profile.target_course_id:
                    authorized_course_ids.add(profile.target_course_id)
                if profile.target_position_id:
                    authorized_exam_ids.add(profile.target_position_id)
                    for child in profile.target_position.children.all():
                        authorized_exam_ids.add(child.id)

            exam_param = self.request.query_params.get('exam')
            if exam_param:
                try:
                    requested_exam_id = int(exam_param)
                    if requested_exam_id not in authorized_exam_ids:
                        from exams.models import Exam
                        req_exam = Exam.objects.filter(pk=requested_exam_id).first()
                        if not req_exam or not req_exam.courses.filter(id__in=authorized_course_ids).exists():
                            return queryset.none()
                except (ValueError, TypeError):
                    return queryset.none()
            else:
                # If no specific exam requested, filter to authorized preparations
                if authorized_exam_ids or authorized_course_ids:
                    queryset = queryset.filter(Q(exam_id__in=authorized_exam_ids) | Q(course_id__in=authorized_course_ids))
                else:
                    return queryset.none()

        # Package access control - premium materials require an active subscription
        from core.models import AdminSettings
        if AdminSettings.get_settings().enforce_subscription_access and not is_privileged:
            if not has_active_subscription(user):
                queryset = queryset.filter(access_type='free')

        # Filtering
        exam = self.request.query_params.get('exam')
        subject = self.request.query_params.get('subject')
        chapter = self.request.query_params.get('chapter')
        topic = self.request.query_params.get('topic')
        course = self.request.query_params.get('course')
        material_type = self.request.query_params.get('material_type')
        content_category = self.request.query_params.get('content_category')
        note_type = self.request.query_params.get('note_type')
        search = self.request.query_params.get('search')

        if exam:
            queryset = queryset.filter(exam_id=exam)
        if subject:
            queryset = queryset.filter(subject_id=subject)
        if chapter:
            queryset = queryset.filter(chapter_id=chapter)
        if topic:
            queryset = queryset.filter(topic_id=topic)
        if course:
            queryset = queryset.filter(course_id=course)
        if material_type:
            queryset = queryset.filter(material_type=material_type)
        if content_category:
            queryset = queryset.filter(content_category=content_category)
        if note_type:
            queryset = queryset.filter(note_type=note_type)
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

        user = request.user
        if not (user.is_staff or user.is_superuser or user.role in ('admin', 'super-admin', 'teacher')):
            from courses.models import Enrollment
            active_courses = Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True)
            queryset = queryset.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_progress = StudentMaterialProgress.objects.filter(student=request.user).order_by('-last_viewed_at')[:5]
        material_ids = [rp.material_id for rp in recent_progress]

        queryset = StudyMaterial.objects.filter(id__in=material_ids, status='published')
        user = request.user
        if not (user.is_staff or user.is_superuser or user.role in ('admin', 'super-admin', 'teacher')):
            from courses.models import Enrollment
            active_courses = Enrollment.objects.filter(student=user, status='active').values_list('course_id', flat=True)
            queryset = queryset.filter(Q(course__isnull=True) | Q(course_id__in=active_courses))

        materials_dict = {m.id: m for m in queryset}
        ordered_materials = [materials_dict[mid] for mid in material_ids if mid in materials_dict]

        serializer = self.get_serializer(ordered_materials, many=True)
        return Response(serializer.data)


class StudentPortalSyllabusNotesView(APIView):
    """GET /api/notes/student/portal/
    Returns the student's authorized preparations and full structured content
    for the selected preparation:
      - Syllabus (PDFs)
      - Subjective Topicwise Notes [Detailed] (Standard, AI)
      - Objective Topicwise Notes [Detailed] (Standard, AI)
      - Revision Notes (Subjective, Objective)
    Enforces strict preparation isolation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from exams.models import Exam
        from courses.models import Enrollment

        user = request.user
        is_staff_or_teacher = user.is_staff or user.is_superuser or user.role in ('admin', 'super-admin', 'teacher')

        authorized_prep_dict = {}

        if is_staff_or_teacher:
            all_preps = Exam.objects.filter(
                parent__isnull=False, is_active=True
            ).select_related('parent', 'category')
            for prep in all_preps:
                c = prep.courses.first() if hasattr(prep, 'courses') else None
                authorized_prep_dict[prep.id] = {
                    'exam': prep,
                    'course': c
                }
        else:
            enrollments = Enrollment.objects.filter(student=user, status='active').select_related(
                'course', 'course__exam', 'course__exam__parent', 'course__exam__category'
            )
            for e in enrollments:
                if e.course and e.course.exam:
                    prep = e.course.exam
                    authorized_prep_dict[prep.id] = {
                        'exam': prep,
                        'course': e.course
                    }

            profile = getattr(user, 'student_profile', None)
            if profile:
                if profile.target_position:
                    target_exam = profile.target_position
                    if target_exam.parent_id:
                        c = profile.target_course or target_exam.courses.first()
                        authorized_prep_dict[target_exam.id] = {
                            'exam': target_exam,
                            'course': c
                        }
                    else:
                        for ch in target_exam.children.filter(is_active=True):
                            c = ch.courses.first()
                            authorized_prep_dict[ch.id] = {
                                'exam': ch,
                                'course': c
                            }
                elif profile.target_course and profile.target_course.exam:
                    prep = profile.target_course.exam
                    authorized_prep_dict[prep.id] = {
                        'exam': prep,
                        'course': profile.target_course
                    }

        authorized_preps_list = []
        for prep_id, info in authorized_prep_dict.items():
            prep = info['exam']
            c = info['course']
            authorized_preps_list.append({
                "id": prep.id,
                "name": prep.name,
                "levelId": prep.parent_id,
                "levelName": prep.parent.name if prep.parent else None,
                "categoryId": prep.category_id,
                "categoryName": prep.category.name if prep.category else None,
                "courseId": c.id if c else None,
                "courseTitle": c.title if c else None,
            })

        req_exam_id = request.query_params.get('exam') or request.query_params.get('exam_id')
        selected_prep_id = None

        if req_exam_id:
            try:
                candidate_id = int(req_exam_id)
                if candidate_id in authorized_prep_dict or is_staff_or_teacher:
                    selected_prep_id = candidate_id
                else:
                    return Response(
                        {"error": "You are not authorized to view content for this preparation."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except (ValueError, TypeError):
                return Response({"error": "Invalid exam_id"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if authorized_preps_list:
                selected_prep_id = authorized_preps_list[0]['id']

        if not selected_prep_id:
            return Response({
                "authorizedPreparations": [],
                "selectedPreparation": None,
                "counts": {"syllabus": 0, "subjective_topicwise": 0, "objective_topicwise": 0, "revision_notes": 0, "total": 0},
                "sections": {
                    "syllabus": [],
                    "subjective_topicwise": {"standard": [], "ai": []},
                    "objective_topicwise": {"standard": [], "ai": []},
                    "revision_notes": {"subjective": [], "objective": []}
                }
            })

        selected_info = authorized_prep_dict.get(selected_prep_id)
        if not selected_info:
            prep_obj = Exam.objects.filter(pk=selected_prep_id).select_related('parent', 'category').first()
            if not prep_obj:
                return Response({"error": "Preparation not found"}, status=status.HTTP_404_NOT_FOUND)
            c = prep_obj.courses.first()
            selected_info = {'exam': prep_obj, 'course': c}

        selected_exam = selected_info['exam']
        selected_course = selected_info['course']

        materials_qs = StudyMaterial.objects.filter(
            exam=selected_exam, status='published'
        ).select_related('subject', 'chapter', 'topic', 'exam', 'exam__parent', 'exam__category').order_by('-created_at')

        from core.models import AdminSettings
        if AdminSettings.get_settings().enforce_subscription_access and not is_staff_or_teacher:
            if not has_active_subscription(user):
                materials_qs = materials_qs.filter(access_type='free')

        serializer = StudyMaterialListSerializer(materials_qs, many=True, context={'request': request})
        all_materials = serializer.data

        syllabus_list = []
        subj_standard = []
        subj_ai = []
        obj_standard = []
        obj_ai = []
        rev_subjective = []
        rev_objective = []

        for m in all_materials:
            cat = m.get('content_category')
            nt = m.get('note_type')

            if cat == 'syllabus':
                syllabus_list.append(m)
            elif cat == 'subjective_topicwise':
                if nt == 'ai':
                    subj_ai.append(m)
                else:
                    subj_standard.append(m)
            elif cat == 'objective_topicwise':
                if nt == 'ai':
                    obj_ai.append(m)
                else:
                    obj_standard.append(m)
            elif cat == 'revision_notes':
                if nt == 'objective':
                    rev_objective.append(m)
                else:
                    rev_subjective.append(m)
            else:
                if m.get('material_type') == 'pdf':
                    syllabus_list.append(m)
                else:
                    subj_standard.append(m)

        counts = {
            "syllabus": len(syllabus_list),
            "subjective_topicwise": len(subj_standard) + len(subj_ai),
            "objective_topicwise": len(obj_standard) + len(obj_ai),
            "revision_notes": len(rev_subjective) + len(rev_objective),
            "total": len(all_materials)
        }

        return Response({
            "authorizedPreparations": authorized_preps_list,
            "selectedPreparation": {
                "id": selected_exam.id,
                "name": selected_exam.name,
                "levelId": selected_exam.parent_id if selected_exam.parent else None,
                "levelName": selected_exam.parent.name if selected_exam.parent else None,
                "categoryId": selected_exam.category_id if selected_exam.category else None,
                "categoryName": selected_exam.category.name if selected_exam.category else None,
                "courseId": selected_course.id if selected_course else None,
                "courseTitle": selected_course.title if selected_course else None,
            },
            "counts": counts,
            "sections": {
                "syllabus": syllabus_list,
                "subjective_topicwise": {
                    "standard": subj_standard,
                    "ai": subj_ai
                },
                "objective_topicwise": {
                    "standard": obj_standard,
                    "ai": obj_ai
                },
                "revision_notes": {
                    "subjective": rev_subjective,
                    "objective": rev_objective
                }
            }
        })


# TEACHER / ADMIN WORKFLOW VIEWS
# ==========================================
from .serializers import TeacherStudyMaterialSerializer, AdminStudyMaterialSerializer

class TeacherStudyMaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TeacherStudyMaterialSerializer

    def get_queryset(self):
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
        material.slug = ""
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
