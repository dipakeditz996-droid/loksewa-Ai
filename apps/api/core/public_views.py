from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

class PublicTestimonialView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        testimonials = [
            {
                "id": 1,
                "name": "Ramesh Karki",
                "position": "Section Officer (Recommended)",
                "avatar": None,
                "review": "The AI tutor feature identified exactly where I was making mistakes in GK. The mock exams are harder than the real exams, which made the actual Loksewa exam feel easy.",
                "rating": 5
            },
            {
                "id": 2,
                "name": "Sita Sharma",
                "position": "Nayab Subba Aspirant",
                "avatar": None,
                "review": "I love the leaderboard and gamification. It keeps me motivated to practice every single day. The study notes are incredibly concise and to the point.",
                "rating": 5
            },
            {
                "id": 3,
                "name": "Prakash Thapa",
                "position": "Kharidar",
                "avatar": None,
                "review": "Best platform for Loksewa preparation. I could study on my phone while commuting. The customized practice sets based on my weak chapters were game changers.",
                "rating": 4.5
            }
        ]
        return Response(testimonials)
