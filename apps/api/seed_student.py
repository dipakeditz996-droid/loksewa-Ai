import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import User
from courses.models import Course, CourseApplication
from exams.models import Examination, Exam, ExamCategory
from study_plan.models import StudyPlan, StudyTask
from gamification.models import GamificationProfile
from exams.models import PracticeSession

def seed():
    print("Creating test student...")
    
    # 1. Create or get user
    user, created = User.objects.get_or_create(
        username='demostudent',
        defaults={
            'email': 'demo@example.com',
            'first_name': 'Demo',
            'last_name': 'Student',
            'role': 'student'
        }
    )
    if created:
        user.set_password('demo1234')
        user.save()
        print("Created new user: demostudent / demo1234")
    else:
        print("User demostudent already exists.")
        
    # 2. Get or create course and category
    category, _ = ExamCategory.objects.get_or_create(name="Public Service")
    exam, _ = Exam.objects.get_or_create(name="Section Officer", category=category)
    course, _ = Course.objects.get_or_create(title="Section Officer Prep Course", slug="section-officer")
    
    # 3. Enroll student
    CourseApplication.objects.get_or_create(
        student=user,
        course=course,
        defaults={'status': 'approved'}
    )
    
    # 4. Create Examination
    examination, _ = Examination.objects.get_or_create(
        title="Mock Test 1",
        category=category,
        exam=exam,
        course=course,
        status='published'
    )
    
    # 5. Create Gamification Profile
    profile, _ = GamificationProfile.objects.get_or_create(user=user)
    profile.study_current_streak = 5
    profile.study_highest_streak = 10
    profile.save()
    
    # 6. Create Study Plan
    study_plan, _ = StudyPlan.objects.get_or_create(
        student=user,
        exam=exam,
        defaults={
            'target_date': timezone.localdate() + timezone.timedelta(days=60),
            'daily_minutes': 120
        }
    )
    
    # 7. Create Study Tasks for today
    today = timezone.localdate()
    StudyTask.objects.get_or_create(
        study_plan=study_plan,
        date=today,
        title="Read Chapter: Public Administration",
        task_type="STUDY_NOTE",
        defaults={'duration_minutes': 45, 'status': 'COMPLETED'}
    )
    StudyTask.objects.get_or_create(
        study_plan=study_plan,
        date=today,
        title="Practice Mock Test",
        task_type="MODEL_EXAM",
        defaults={'duration_minutes': 60, 'status': 'PENDING'}
    )
    
    # 8. Add some practice sessions to show study time
    PracticeSession.objects.get_or_create(
        user=user,
        exam=exam,
        total_questions=10,
        defaults={
            'completed': True,
            'time_taken_seconds': 7200, # 120 minutes
            'correct_count': 8,
            'incorrect_count': 2,
            'score': 8.0,
            'accuracy': 80.0
        }
    )

    print("Successfully seeded test student data.")
    print("Login with -> Username: demostudent | Password: demo1234")

if __name__ == "__main__":
    seed()
