import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from exams.models import Exam, Paper, Subject, Chapter, Topic, UserTopicProgress
from core.models import User

def seed():
    print("Seeding database...")
    admin_user = User.objects.filter(username='admin').first()
    if not admin_user:
        print("Admin user not found!")
        return

    # Create Exam
    exam = Exam.objects.create(name="Section Officer", description="Section Officer Preparation", is_active=True)

    # Create Paper
    paper1 = Paper.objects.create(exam=exam, name="Paper I", paper_number="I")

    sub1 = Subject.objects.create(paper=paper1, exam=exam, name="Public Administration")
    u1 = Chapter.objects.create(subject=sub1, title="Chapter 01: Introduction to Public Administration")
    t1 = Topic.objects.create(chapter=u1, name="01. Concept and Scope")
    t2 = Topic.objects.create(chapter=u1, name="02. Evolution of Public Administration")
    t3 = Topic.objects.create(chapter=u1, name="03. Principles of Organization")
    t4 = Topic.objects.create(chapter=u1, name="04. Public Organizations")
    t5 = Topic.objects.create(chapter=u1, name="05. Administrative Behaviour")
    
    u2 = Chapter.objects.create(subject=sub1, title="Chapter 02: Personnel Administration")
    t6 = Topic.objects.create(chapter=u2, name="01. Civil Service Systems")
    t7 = Topic.objects.create(chapter=u2, name="02. Recruitment and Selection")
    t8 = Topic.objects.create(chapter=u2, name="03. Training and Development")

    # Constitution
    sub2 = Subject.objects.create(paper=paper1, exam=exam, name="Constitution")
    u3 = Chapter.objects.create(subject=sub2, title="Chapter 01: Constitutional History")
    t9 = Topic.objects.create(chapter=u3, name="01. Early Constitutional Developments")
    t10 = Topic.objects.create(chapter=u3, name="02. Constitution of Nepal 2072")

    # Current Affairs
    sub3 = Subject.objects.create(paper=paper1, exam=exam, name="Current Affairs")
    u4 = Chapter.objects.create(subject=sub3, title="Chapter 01: National Events")
    t11 = Topic.objects.create(chapter=u4, name="01. Economic Developments")
    t12 = Topic.objects.create(chapter=u4, name="02. Political Changes")

    u5 = Chapter.objects.create(subject=sub3, title="Chapter 02: International Relations")
    t13 = Topic.objects.create(chapter=u5, name="01. UN and International Bodies")
    t14 = Topic.objects.create(chapter=u5, name="02. Global Treaties")

    Subject.objects.create(paper=paper1, exam=exam, name="General Knowledge")
    Subject.objects.create(paper=paper1, exam=exam, name="Governance")
    Subject.objects.create(paper=paper1, exam=exam, name="Economy")

    Exam.objects.create(name="Nayab Subba", description="Nayab Subba preparation")

    # Seed User Progress for admin
    UserTopicProgress.objects.create(user=admin_user, topic=t1, status="completed", progress=100, accuracy=85)
    UserTopicProgress.objects.create(user=admin_user, topic=t2, status="completed", progress=100, accuracy=72)
    UserTopicProgress.objects.create(user=admin_user, topic=t3, status="in-progress", progress=45, accuracy=61)
    
    UserTopicProgress.objects.create(user=admin_user, topic=t6, status="completed", progress=100, accuracy=90)
    UserTopicProgress.objects.create(user=admin_user, topic=t7, status="in-progress", progress=60, accuracy=65)

    UserTopicProgress.objects.create(user=admin_user, topic=t9, status="completed", progress=100, accuracy=88)
    UserTopicProgress.objects.create(user=admin_user, topic=t10, status="in-progress", progress=75, accuracy=58)

    UserTopicProgress.objects.create(user=admin_user, topic=t11, status="completed", progress=100, accuracy=95)
    UserTopicProgress.objects.create(user=admin_user, topic=t12, status="completed", progress=100, accuracy=92)
    UserTopicProgress.objects.create(user=admin_user, topic=t13, status="in-progress", progress=80, accuracy=64)

    print("Seed complete!")

    print("Seeding Subjective Questions...")
    from exams.models import Question, SubjectivePracticeSet, SubjectiveModelExam
    
    q1 = Question.objects.create(
        question_type='subjective',
        topic=t1,
        text="Discuss the major socio-economic reforms introduced by King Mahendra during the Panchayat era.",
        marks=10,
        expected_time_minutes=15,
        difficulty="medium",
        model_answer="Key points should include: Land Reform Act 1964, New Civil Code (Muluki Ain) 1963, introduction of the Panchayat system, eradication of untouchability, and infrastructure development like the East-West Highway.",
        status='published'
    )
    
    q2 = Question.objects.create(
        question_type='subjective',
        topic=t2,
        text="Analyze the impact of the Anglo-Nepalese War on Nepal's current boundaries.",
        marks=15,
        expected_time_minutes=25,
        difficulty="hard",
        model_answer="Focus on the Treaty of Sugauli (1816), loss of territories (Sikkim, Kumaon, Garhwal, Terai regions), the establishment of British residency, and how it shaped the modern borders of Nepal.",
        status='published'
    )

    print("Creating Subjective Practice Set...")
    prac_set = SubjectivePracticeSet.objects.create(
        title="History of Nepal - Descriptive Set 1",
        description="A practice set focusing on historical events and their socio-economic impacts.",
        exam=exam,
        subject=sub1,
        topic=t1,
        estimated_time_minutes=40,
        status='published'
    )
    prac_set.questions.set([q1, q2])

    print("Creating Subjective Model Exam...")
    sub_model_exam = SubjectiveModelExam.objects.create(
        title="Loksewa Section Officer - GK Subjective Mock Test",
        description="Full-length subjective exam simulating the real testing environment.",
        exam=exam,
        duration_minutes=45,
        total_marks=30,
        status='published'
    )
    sub_model_exam.questions.set([q1, q2])

if __name__ == '__main__':
    seed()
