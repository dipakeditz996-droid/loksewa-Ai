import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from study_plan.models import StudyPlan
from study_plan.serializers import StudyPlanSerializer

plans = StudyPlan.objects.all()
for plan in plans:
    try:
        serializer = StudyPlanSerializer(plan)
        print(f"Plan {plan.id} serialized successfully: {list(serializer.data.keys())}")
    except Exception as e:
        import traceback
        print(f"Error serializing Plan {plan.id}:")
        traceback.print_exc()

if not plans:
    print("No study plans found in database.")
