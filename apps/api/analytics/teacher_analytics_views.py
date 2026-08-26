from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services.teacher_analytics_service import TeacherAnalyticsService

# We'll just check if they are a teacher in the view or rely on service logic.
# For now, let's enforce a simple permission check in get().

def is_teacher(user):
    return getattr(user, 'role', '') == 'teacher' or user.is_staff

class TeacherAnalyticsOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        days = request.query_params.get('days', '30')
        
        data = TeacherAnalyticsService.get_overview(request.user, course_id, days)
        return Response(data)

class TeacherAnalyticsTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        days = request.query_params.get('days', '30')
        
        data = TeacherAnalyticsService.get_performance_trend(request.user, course_id, days)
        return Response(data)

class TeacherCoursePerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        data = TeacherAnalyticsService.get_course_performance(request.user)
        return Response(data)

class TeacherSubjectPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        data = TeacherAnalyticsService.get_subject_performance(request.user, course_id)
        return Response(data)

class TeacherTopicPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        data = TeacherAnalyticsService.get_topic_performance(request.user, course_id)
        return Response(data)

class TeacherStudentRankingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        data = TeacherAnalyticsService.get_student_ranking(request.user, course_id)
        return Response(data)

class TeacherNeedsAttentionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        course_id = request.query_params.get('course', 'all')
        data = TeacherAnalyticsService.get_needs_attention(request.user, course_id)
        return Response(data)

class TeacherStudentDetailAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        if not is_teacher(request.user):
            return Response({"error": "Unauthorized"}, status=403)
            
        data = TeacherAnalyticsService.get_student_detail(request.user, student_id)
        if not data:
            return Response({"error": "Student not found or not assigned"}, status=404)
            
        return Response(data)
