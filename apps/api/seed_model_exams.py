import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from exams.models import Exam, Question, ModelExam

def seed_model_exams():
    # Delete existing
    ModelExam.objects.all().delete()
    
    exam = Exam.objects.first()
    if not exam:
        print("No Exam found.")
        return
        
    questions = list(Question.objects.all()[:10])
    if len(questions) < 10:
        print("Not enough questions, creating some mock questions...")
        topic = exam.subjects.first().chapters.first().topics.first() if exam.subjects.exists() else None
        if not topic:
            from exams.models import Subject, Chapter, Topic
            subject = Subject.objects.create(exam=exam, name="Test Subject", code="TS")
            Chapter = Chapter.objects.create(subject=subject, title="Test Chapter")
            topic = Topic.objects.create(Chapter=Chapter, name="Test Topic")
        
        for i in range(10 - len(questions)):
            q = Question.objects.create(
                topic=topic,
                text=f"This is mock question {i+1} for model exams.",
                option_a="Option A",
                option_b="Option B",
                option_c="Option C",
                option_d="Option D",
                correct_option="A",
                explanation="Explanation for mock question.",
                difficulty="medium"
            )
            questions.append(q)

    me1 = ModelExam.objects.create(
        title="Section Officer Full Model Examination - 01",
        description="This is a comprehensive full model examination simulating the Loksewa Section Officer level exam.",
        exam=exam,
        duration_minutes=90, # 90 minutes
        total_questions=10, # 10 questions for testing
        total_marks=10,
        passing_marks=4,
        negative_marking=0.2,
        status='published'
    )
    me1.questions.set(questions)

    me2 = ModelExam.objects.create(
        title="Section Officer Mock Test - 02",
        description="A challenging mock test focusing on Constitution and Public Administration.",
        exam=exam,
        duration_minutes=45,
        total_questions=10,
        total_marks=10,
        passing_marks=5,
        negative_marking=0.2,
        status='published'
    )
    me2.questions.set(questions)
    
    # Create a 2 minute exam for testing auto-submit easily
    me3 = ModelExam.objects.create(
        title="Quick 1 Minute Test (Auto-Submit test)",
        description="Use this to test the auto-submit functionality quickly.",
        exam=exam,
        duration_minutes=1,
        total_questions=5,
        total_marks=5,
        passing_marks=2,
        negative_marking=0.2,
        status='published'
    )
    me3.questions.set(questions[:5])

    print("Model exams seeded successfully.")

if __name__ == "__main__":
    seed_model_exams()
