import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from exams.models import ExamCategory, Exam
from courses.models import Course

lic_cat = ExamCategory.objects.get(name='License Exam')
nec_exam = Exam.objects.get(id=43)

# 1. Main NEC General License Course
c_nec, created = Course.objects.get_or_create(
    slug='nec-general-license',
    defaults={
        'exam': nec_exam,
        'title': 'NEC General License Preparation',
        'status': 'published',
        'is_open_for_enrollment': True,
        'short_description': 'Comprehensive Nepal Engineering Council general license exam preparation.',
        'duration_months': 3
    }
)
if not created and (c_nec.exam != nec_exam or c_nec.status != 'published'):
    c_nec.exam = nec_exam
    c_nec.status = 'published'
    c_nec.is_open_for_enrollment = True
    c_nec.save()
print(f'Main NEC Course: {c_nec.id} {c_nec.title} (created={created})')

# 2. Child streams
streams = [
    ('Civil Engineering', 1, 'published', True),
    ('Geomatics Engineering', 2, 'coming_soon', False),
    ('Computer / IT Engineering', 3, 'coming_soon', False),
]

for sname, sorder, sstatus, sopen in streams:
    exam_obj, e_created = Exam.objects.get_or_create(
        category=lic_cat,
        parent=nec_exam,
        name=sname,
        defaults={'order': sorder, 'is_active': True, 'status': 'active' if sstatus == 'published' else 'coming_soon'}
    )
    clean = sname.lower().replace(' ', '-').replace('/', '-').replace('(', '').replace(')', '')
    cslug = f'nec-license-{clean}'
    scourse, c_created = Course.objects.get_or_create(
        slug=cslug,
        defaults={
            'exam': exam_obj,
            'title': f'NEC License - {sname}',
            'status': sstatus,
            'is_open_for_enrollment': sopen,
            'short_description': f'Nepal Engineering Council {sname} License Preparation Course.',
            'duration_months': 3
        }
    )
    if not c_created and (scourse.exam != exam_obj or scourse.status != sstatus):
        scourse.exam = exam_obj
        scourse.status = sstatus
        scourse.is_open_for_enrollment = sopen
        scourse.save()
    print(f'Stream Exam: {exam_obj.id} {exam_obj.name} -> Course: {scourse.id} {scourse.title} (created={c_created})')

print("License Exam courses seeding complete!")
