import os

filepath = 'apps/api/administration/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "from .study_plan_views import AdminStudyPlanTemplateViewSet\n"
if "AdminStudyPlanTemplateViewSet" not in content:
    content = content.replace(
        "from .exam_views import ExaminationViewSet",
        "from .exam_views import ExaminationViewSet\n" + import_line
    )

    content = content.replace(
        "router.register(r'exams', ExaminationViewSet, basename='admin-examination')",
        "router.register(r'exams', ExaminationViewSet, basename='admin-examination')\nrouter.register(r'study-plan-templates', AdminStudyPlanTemplateViewSet, basename='admin-study-plan-templates')"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated admin urls")
