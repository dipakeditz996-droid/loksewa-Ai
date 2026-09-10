import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from notes.models import StudyMaterial
from exams.models import Exam

print('All study materials with exam info:')
for m in StudyMaterial.objects.all().select_related('exam', 'exam__parent'):
    exam = m.exam
    level = exam.parent.name if exam and exam.parent else 'N/A'
    print(f'  id={m.id}: exam_id={exam.id if exam else None} ({exam.name if exam else "None"}) level={level}')
    print(f'    Title: {m.title}')
    print(f'    cat={m.content_category} type={m.note_type} status={m.status}')
    print()
