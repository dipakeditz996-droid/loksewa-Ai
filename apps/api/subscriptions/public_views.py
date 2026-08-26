from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import SubscriptionPlan

class PublicPackageListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(status='ACTIVE').order_by('display_order')
        
        results = []
        for plan in plans:
            # Map Django model to frontend PublicPackage shape
            duration_days = plan.duration
            if plan.duration_unit == 'WEEKS':
                duration_days = plan.duration * 7
            elif plan.duration_unit == 'MONTHS':
                duration_days = plan.duration * 30
            elif plan.duration_unit == 'YEAR':
                duration_days = plan.duration * 365
                
            duration_label = f"{plan.duration} {plan.duration_unit.title()}"
            
            # Use badge to determine if it's popular
            is_popular = plan.badge in ['POPULAR', 'BEST_VALUE', 'RECOMMENDED']
            
            # Map features
            features = plan.features if isinstance(plan.features, list) else []
            
            color_accent = "#3b82f6" # Default blue
            if is_popular:
                color_accent = "#8b5cf6" # Purple for popular
                
            results.append({
                "id": plan.id,
                "name": plan.name,
                "slug": plan.name.lower().replace(" ", "-"),
                "description": plan.description,
                "price": str(plan.price),
                "duration_days": duration_days,
                "duration_label": duration_label,
                "features": features,
                "is_popular": is_popular,
                "is_active": True,
                "course_access": True if plan.course else False,
                "practice_access": True,  # Defaulting to True for now, can be adjusted based on features
                "mock_exam_access": True,
                "notes_access": True,
                "ai_features": "ai" in str(features).lower(),
                "color_accent": color_accent
            })
            
        return Response(results)
