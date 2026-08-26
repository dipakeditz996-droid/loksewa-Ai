import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from study_plan.views import StudyPlanViewSet
from core.models import User

user, _ = User.objects.get_or_create(username="test_study_plan", email="test@study.com")

factory = APIRequestFactory()
request = factory.get('/api/study-plan/plans/')
force_authenticate(request, user=user)

view = StudyPlanViewSet.as_view({'get': 'list'})

try:
    response = view(request)
    print("STATUS:", response.status_code)
    print("DATA:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
