from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark
from .serializers import StudyMaterialListSerializer, StudyMaterialDetailSerializer

class StudyMaterialViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = StudyMaterial.objects.filter(status='published')
        
        # Filtering
        exam = self.request.query_params.get('exam')
        subject = self.request.query_params.get('subject')
        topic = self.request.query_params.get('topic')
        material_type = self.request.query_params.get('material_type')
        search = self.request.query_params.get('search')
        
        if exam:
            queryset = queryset.filter(exam_id=exam)
        if subject:
            queryset = queryset.filter(subject_id=subject)
        if topic:
            queryset = queryset.filter(topic_id=topic)
        if material_type:
            queryset = queryset.filter(material_type=material_type)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(content__icontains=search)
            )
            
        return queryset.order_by('-updated_at')

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
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_progress = StudentMaterialProgress.objects.filter(student=request.user).order_by('-last_viewed_at')[:5]
        material_ids = [rp.material_id for rp in recent_progress]
        
        # Preserve ordering based on last_viewed_at
        queryset = StudyMaterial.objects.filter(id__in=material_ids, status='published')
        
        # Sort in Python to keep the recent order
        materials_dict = {m.id: m for m in queryset}
        ordered_materials = [materials_dict[mid] for mid in material_ids if mid in materials_dict]
        
        serializer = self.get_serializer(ordered_materials, many=True)
        return Response(serializer.data)
