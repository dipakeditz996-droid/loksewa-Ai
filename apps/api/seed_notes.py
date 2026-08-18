import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import User
from exams.models import Exam, Subject, Topic
from notes.models import StudyMaterial

print("Seeding notes...")
admin = User.objects.filter(is_superuser=True).first()
if not admin:
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'adminpass')

exam = Exam.objects.first()
if not exam:
    exam = Exam.objects.create(title="Section Officer", code="SO", status="active", total_marks=100, pass_marks=40, description="Section Officer Exam")

subject = Subject.objects.filter(exam=exam).first()
if not subject:
    subject = Subject.objects.create(exam=exam, name="Constitution of Nepal", description="Study of Constitution")

topic = Topic.objects.filter(chapter__subject=subject).first()

# Create a rich text note
mat1, _ = StudyMaterial.objects.get_or_create(
    slug='fundamental-rights-complete',
    defaults={
        'title': 'Fundamental Rights - Complete Notes',
        'exam': exam,
        'subject': subject,
        'topic': topic,
        'description': 'A comprehensive guide to all fundamental rights covered in the constitution.',
        'content': '<h2>1. Introduction</h2><p>Fundamental rights are basic rights...</p>',
        'material_type': 'notes',
        'access_type': 'free',
        'status': 'published',
        'estimated_reading_time': 15
    }
)
mat1.status = 'published'
mat1.save()

# Create a PDF note
mat2, _ = StudyMaterial.objects.get_or_create(
    slug='constitution-pdf-guide',
    defaults={
        'title': 'Constitution PDF Guide',
        'exam': exam,
        'subject': subject,
        'topic': topic,
        'description': 'Official constitution pdf.',
        'material_type': 'pdf',
        'access_type': 'premium',
        'status': 'published',
        'estimated_reading_time': 45
    }
)
mat2.status = 'published'
mat2.save()

print("Notes seeded successfully!")
