import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import User
from administration.views import (
    AdminStudyMaterialsHierarchyView,
    AdminPreparationAcademicTreeView,
    AdminStudyMaterialsView,
)
from notes.views import StudentPortalSyllabusNotesView, StudyMaterialViewSet

admin_user = User.objects.filter(role__in=['admin', 'super-admin']).first()
factory = APIRequestFactory()

# 1. Test Admin Hierarchy
req = factory.get('/api/admin/study-materials/hierarchy/')
force_authenticate(req, user=admin_user)
resp = AdminStudyMaterialsHierarchyView.as_view()(req)
print('Hierarchy status:', resp.status_code)
for cat in resp.data:
    print(f"Category {cat['id']}: {cat['name']}")
    for lvl in cat['levels']:
        print(f"  Level {lvl['id']}: {lvl['name']}")
        for prep in lvl['preparations']:
            print(f"    Prep {prep['id']}: {prep['name']} - Counts: {prep['counts']}")

# 2. Test Academic Tree for Civil (id 22)
req2 = factory.get('/api/admin/study-materials/academic-tree/?exam_id=22')
force_authenticate(req2, user=admin_user)
resp2 = AdminPreparationAcademicTreeView.as_view()(req2)
print('Academic tree status:', resp2.status_code)
print('Civil Subjects count:', len(resp2.data))
for s in resp2.data:
    print(f"  Subject: {s['name']} ({len(s['chapters'])} chapters)")

# 3. Test Student Portal View as Admin
req3 = factory.get('/api/notes/student/portal/?exam_id=22')
force_authenticate(req3, user=admin_user)
resp3 = StudentPortalSyllabusNotesView.as_view()(req3)
print('Student portal view status:', resp3.status_code)
print('Selected prep:', resp3.data.get('selectedPreparation', {}).get('name'))
print('Sections:', list(resp3.data.get('sections', {}).keys()))
print('Counts:', resp3.data.get('counts', {}))
