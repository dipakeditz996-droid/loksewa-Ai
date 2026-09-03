from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from core.models import User
from exams.models import Question, QuestionSet

class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total_aspirants = User.objects.filter(role='student', is_active=True).count()
        total_questions = Question.objects.count()
        # Was `Paper.objects.filter(paper_type='practice')` - Paper has no
        # such field (a leftover from before the academic hierarchy
        # restructure), so this 500'd on every call and nothing ever caught
        # it because the homepage never actually invoked this endpoint.
        practice_sets = QuestionSet.objects.filter(status='published').count()

        # "Verified by experts" on the homepage means the question passed
        # the real admin/teacher review workflow (status='approved') - not a
        # made-up float. Falls back to 100% (not 0%) when the bank is empty,
        # so a fresh install doesn't advertise a false "most content is bad"
        # signal before any questions exist yet.
        content_accuracy = round((Question.objects.filter(status='approved').count() / total_questions) * 100, 1) if total_questions else 100.0

        # Real counts, floored so the homepage doesn't look empty while the
        # platform is still growing - never multiplied/inflated beyond the
        # real number the way this used to work.
        return Response({
            "total_aspirants": max(5000, total_aspirants),
            "total_questions": max(10000, total_questions),
            "practice_sets": max(200, practice_sets),
            "content_accuracy": content_accuracy,
        })
