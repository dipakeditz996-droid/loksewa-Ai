"""Admin CRUD for study-material categories and collections.

Categories are reusable labels attached to a material; collections are
hand-curated bundles of materials. Both are managed from the
"Categories & Collections" screen.
"""
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notes.models import MaterialCategory, MaterialCollection, StudyMaterial
from .models import AuditLog
from .permissions import IsAdminUser


class MaterialCategorySerializer(serializers.ModelSerializer):
    material_count = serializers.SerializerMethodField()

    class Meta:
        model = MaterialCategory
        fields = [
            'id', 'name', 'slug', 'description', 'color', 'is_active',
            'order', 'material_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['slug']

    def get_material_count(self, obj):
        return obj.materials.count()


class CollectionMaterialSerializer(serializers.ModelSerializer):
    """Compact view of a material as it appears inside a collection."""
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = ['id', 'title', 'material_type', 'difficulty', 'status', 'subject_name']

    def get_subject_name(self, obj):
        try:
            return obj.subject.name
        except AttributeError:
            return ''


class MaterialCollectionSerializer(serializers.ModelSerializer):
    material_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MaterialCollection
        fields = [
            'id', 'name', 'description', 'color', 'is_active',
            'material_count', 'created_by_name', 'created_at', 'updated_at',
        ]

    def get_material_count(self, obj):
        return obj.materials.count()

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username


class AdminMaterialCategoryViewSet(viewsets.ModelViewSet):
    queryset = MaterialCategory.objects.all()
    serializer_class = MaterialCategorySerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        qs = MaterialCategory.objects.all()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        # Materials outlive their category; clearing the link is kinder than
        # blocking the delete or cascading into real content.
        detached = category.materials.count()
        name = category.name
        response = super().destroy(request, *args, **kwargs)
        AuditLog.objects.create(
            actor=request.user, action='DELETE_MATERIAL_CATEGORY',
            entity_type='MaterialCategory', entity_id=str(kwargs.get('pk')),
            details={"name": name, "materials_detached": detached},
        )
        return response


class AdminMaterialCollectionViewSet(viewsets.ModelViewSet):
    queryset = MaterialCollection.objects.all()
    serializer_class = MaterialCollectionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        qs = MaterialCollection.objects.select_related('created_by').all()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        """List the materials inside this collection."""
        collection = self.get_object()
        materials = collection.materials.select_related('subject').all()
        return Response(CollectionMaterialSerializer(materials, many=True).data)

    @action(detail=True, methods=['post'], url_path='add-materials')
    def add_materials(self, request, pk=None):
        collection = self.get_object()
        ids = request.data.get('material_ids') or []
        if not isinstance(ids, list) or not ids:
            return Response({"error": "material_ids must be a non-empty list."}, status=400)

        found = list(StudyMaterial.objects.filter(id__in=ids))
        collection.materials.add(*found)

        missing = len(ids) - len(found)
        AuditLog.objects.create(
            actor=request.user, action='ADD_MATERIALS_TO_COLLECTION',
            entity_type='MaterialCollection', entity_id=str(collection.id),
            details={"added": len(found), "requested": len(ids)},
        )
        return Response({
            "success": True,
            "added_count": len(found),
            "missing_count": missing,
            "material_count": collection.materials.count(),
        })

    @action(detail=True, methods=['post'], url_path='remove-materials')
    def remove_materials(self, request, pk=None):
        collection = self.get_object()
        ids = request.data.get('material_ids') or []
        if not isinstance(ids, list) or not ids:
            return Response({"error": "material_ids must be a non-empty list."}, status=400)

        found = list(StudyMaterial.objects.filter(id__in=ids))
        collection.materials.remove(*found)
        return Response({
            "success": True,
            "removed_count": len(found),
            "material_count": collection.materials.count(),
        })
