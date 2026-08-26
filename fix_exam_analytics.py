import os
import re

filepath = 'apps/api/administration/exam_views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

analytics_start = content.find("    @action(detail=True, methods=['get'])\n    def analytics(self, request, pk=None):")
if analytics_start != -1:
    content = content[:analytics_start]

new_methods = '''
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        from django.db.models import Avg, Max, Min, Count, Q, F
        exam = self.get_object()
        attempts = exam.attempts.all()
        
        total_attempts = attempts.count()
        completed_attempts = attempts.filter(status='evaluated').count()
        in_progress = attempts.filter(status='in_progress').count()
        
        if total_attempts == 0:
            return Response({
                "total_attempts": 0,
                "completed_attempts": 0,
                "in_progress": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_count": 0,
                "fail_count": 0,
                "average_time_seconds": 0,
            })
            
        stats = attempts.filter(status='evaluated').aggregate(
            avg_score=Avg('score'),
            high=Max('score'),
            low=Min('score'),
            avg_time=Avg('time_taken_seconds')
        )
        
        pass_count = attempts.filter(status='evaluated', passed=True).count()
        fail_count = completed_attempts - pass_count
        
        # Trend (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        trends = list(attempts.filter(started_at__gte=thirty_days_ago)
                      .extra(select={'day': 'date(started_at)'})
                      .values('day')
                      .annotate(count=Count('id'))
                      .order_by('day'))
                      
        return Response({
            "total_attempts": total_attempts,
            "completed_attempts": completed_attempts,
            "in_progress": in_progress,
            "average_score": round(stats['avg_score'] or 0, 2),
            "highest_score": round(stats['high'] or 0, 2),
            "lowest_score": round(stats['low'] or 0, 2),
            "pass_count": pass_count,
            "fail_count": fail_count,
            "average_time_seconds": round(stats['avg_time'] or 0, 2),
            "trends": trends,
        })

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        from django.core.paginator import Paginator
        exam = self.get_object()
        attempts = exam.attempts.select_related('student', 'student__student_profile').order_by('-score', 'time_taken_seconds')
        
        # Filtering
        status_filter = request.query_params.get('status')
        if status_filter:
            attempts = attempts.filter(status=status_filter)
            
        search = request.query_params.get('search')
        if search:
            attempts = attempts.filter(
                Q(student__first_name__icontains=search) | 
                Q(student__last_name__icontains=search) |
                Q(student__email__icontains=search)
            )
            
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        paginator = Paginator(attempts, page_size)
        
        try:
            current_page = paginator.page(page)
        except Exception:
            return Response({"results": [], "count": 0})
            
        results = []
        for i, attempt in enumerate(current_page.object_list):
            results.append({
                "id": attempt.id,
                "student_id": attempt.student.id,
                "student_name": f"{attempt.student.first_name} {attempt.student.last_name}".strip() or attempt.student.username,
                "started_at": attempt.started_at,
                "submitted_at": attempt.submitted_at,
                "status": attempt.status,
                "score": attempt.score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "time_taken_seconds": attempt.time_taken_seconds,
                "rank": (page - 1) * page_size + i + 1 if attempt.status == 'evaluated' else None
            })
            
        return Response({
            "count": paginator.count,
            "num_pages": paginator.num_pages,
            "current_page": page,
            "results": results
        })
'''
content += new_methods

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated exams view")
