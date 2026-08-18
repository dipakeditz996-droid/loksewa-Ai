import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from courses.models import Course, TeacherCourseAssignment
from exams.models import Exam
from core.models import User

# Get the existing exam from the seed
exam = Exam.objects.filter(name="Section Officer Preparation").first()
if not exam:
    print("Exam not found!")
else:
    # Create the Central Course
    course, created = Course.objects.get_or_create(
        slug="section-officer-complete-course",
        defaults={
            "title": "Section Officer Complete Preparation",
            "description": "Comprehensive preparation course for the Section Officer exam.",
            "status": "published",
            "exam": exam,
            "featured": True
        }
    )
    if not created:
        course.exam = exam
        course.save()

    print(f"Course created/updated: {course.title}")

    # Assign it to the teacher
    teacher = User.objects.filter(username="teacher@loksewa.ai").first()
    if teacher:
        TeacherCourseAssignment.objects.get_or_create(teacher=teacher, course=course)
        print(f"Assigned course to teacher {teacher.username}")
    else:
        print("Teacher not found!")

