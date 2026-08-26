from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from administration.permissions import IsAdminUser
from study_plan.models import StudyPlanTemplate, StudyPlanTemplateTask
from study_plan.serializers import StudyPlanTemplateSerializer

class AdminStudyPlanTemplateViewSet(viewsets.ModelViewSet):
    queryset = StudyPlanTemplate.objects.all().order_by('-created_at')
    serializer_class = StudyPlanTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        template = self.get_object()
        
        # Clone template
        template.pk = None
        template.name = f"Copy of {template.name}"
        template.is_active = False # default to draft
        template.save()
        
        # Clone tasks
        original_tasks = StudyPlanTemplateTask.objects.filter(template_id=pk)
        for task in original_tasks:
            task.pk = None
            task.template = template
            task.save()
            
        serializer = self.get_serializer(template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
