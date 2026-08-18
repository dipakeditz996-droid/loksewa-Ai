from rest_framework import views, permissions
from rest_framework.response import Response
from exams.models import Question
from ai_tutor.services import AdminAILogic
import json

class AIGenerateOptionsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, format=None):
        try:
            question = Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            return Response({"error": "Question not found"}, status=404)

        if question.question_type != 'mcq':
            return Response({"error": "Can only generate options for MCQ questions"}, status=400)

        subject = "General"
        if question.topic and question.topic.Chapter and question.topic.Chapter.subject:
            subject = question.topic.Chapter.subject.name

        ai_logic = AdminAILogic()
        generated_options = ai_logic.generate_options(question.text, subject)
        
        if not generated_options:
            return Response({"error": "Failed to generate options"}, status=500)

        return Response(generated_options)

class AIApproveOptionsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, format=None):
        try:
            question = Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            return Response({"error": "Question not found"}, status=404)

        data = request.data
        if 'option_a' not in data or 'correct_answer' not in data:
            return Response({"error": "Missing options or correct_answer"}, status=400)

        question.option_a = data.get('option_a')
        question.option_b = data.get('option_b')
        question.option_c = data.get('option_c')
        question.option_d = data.get('option_d')
        question.correct_option = data.get('correct_answer')
        question.ai_status = 'approved'
        question.ai_generate_options = False
        question.save()

        return Response({"success": True, "message": "Options approved and saved"})

class AIBulkGenerateContentView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, format=None):
        data = request.data
        subject = data.get('subject', 'General')
        generate_options = data.get('generate_options', False)
        generate_explanations = data.get('generate_explanations', False)
        questions = data.get('questions', [])

        if not questions:
            return Response({"error": "No questions provided"}, status=400)

        ai_logic = AdminAILogic()
        result_questions = ai_logic.generate_bulk_content(questions, generate_options, generate_explanations, subject)
        
        if not result_questions:
            return Response({"error": "Failed to generate AI content"}, status=500)

        return Response({"success": True, "questions": result_questions})
