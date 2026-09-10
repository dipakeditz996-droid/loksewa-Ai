import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from courses.models import Course

psc, _ = ExamCategory.objects.get_or_create(name='PSC Exams', defaults={'is_active': True, 'order': 1})

# Levels
lvl4 = Exam.objects.filter(category=psc, name__in=['4th Level', '4th Level Exam'], parent=None).first()
if not lvl4:
    lvl4 = Exam.objects.create(category=psc, name='4th Level Exam', parent=None, is_active=True, order=1)
else:
    lvl4.name = '4th Level Exam'
    lvl4.save()

lvl5 = Exam.objects.filter(category=psc, name__in=['5th Level', '5th Level Exam'], parent=None).first()
if not lvl5:
    lvl5 = Exam.objects.create(category=psc, name='5th Level Exam', parent=None, is_active=True, order=2)
else:
    lvl5.name = '5th Level Exam'
    lvl5.save()

lvl7 = Exam.objects.filter(category=psc, name__in=['7th Level', '7th Level Exam'], parent=None).first()
if not lvl7:
    lvl7 = Exam.objects.create(category=psc, name='7th Level Exam', parent=None, is_active=True, order=3)
else:
    lvl7.name = '7th Level Exam'
    lvl7.save()

print(f"Levels: {lvl4.id}: {lvl4.name}, {lvl5.id}: {lvl5.name}, {lvl7.id}: {lvl7.name}")

# Preparations under 5th Level
preps_5th = [
    ('Civil Engineering', 1),
    ('Building and Architect', 2),
    ('Civil Lab Assistant', 3),
    ('Amin (Surveyor)', 4),
    ('Computer Operator', 5),
]

for name, order in preps_5th:
    if name == 'Civil Engineering':
        civil_old = Exam.objects.filter(category=psc, parent=lvl5, name__in=['Civil', 'Civil Engineering']).first()
        if civil_old:
            civil_old.name = 'Civil Engineering'
            civil_old.order = order
            civil_old.save()
            prep_obj = civil_old
        else:
            prep_obj, _ = Exam.objects.get_or_create(category=psc, parent=lvl5, name=name, defaults={'order': order, 'is_active': True})
    else:
        prep_obj, _ = Exam.objects.get_or_create(category=psc, parent=lvl5, name=name, defaults={'order': order, 'is_active': True})

    clean_slug = prep_obj.name.lower().replace(' ', '-').replace('(', '').replace(')', '')
    slug = f"psc-5th-level-{clean_slug}"
    course = Course.objects.filter(slug=slug).first() or Course.objects.filter(exam=prep_obj).first()
    if course:
        course.exam = prep_obj
        course.title = f"PSC 5th Level {prep_obj.name}"
        course.save()
    else:
        Course.objects.create(
            exam=prep_obj,
            title=f"PSC 5th Level {prep_obj.name}",
            slug=slug,
            status='published',
            is_open_for_enrollment=True,
        )
    print(f"5th Level Prep: {prep_obj.id} - {prep_obj.name}")

# Preparations under 4th Level
for name, order in [('Civil Engineering', 1), ('Amin (Surveyor)', 2)]:
    prep = Exam.objects.filter(category=psc, parent=lvl4, name__in=[name, 'Civil']).first()
    if prep:
        prep.name = name
        prep.order = order
        prep.save()
    else:
        prep = Exam.objects.create(category=psc, parent=lvl4, name=name, order=order, is_active=True)
    clean_slug = name.lower().replace(' ', '-').replace('(', '').replace(')', '')
    slug = f"psc-4th-level-{clean_slug}"
    c = Course.objects.filter(slug=slug).first() or Course.objects.filter(exam=prep).first()
    if not c:
        Course.objects.create(exam=prep, title=f"PSC 4th Level {name}", slug=slug, status='published', is_open_for_enrollment=True)

# Preparations under 7th Level
for name, order in [('Civil Engineering', 1), ('Building and Architect', 2), ('Surveyor', 3), ('Computer Officer', 4)]:
    prep = Exam.objects.filter(category=psc, parent=lvl7, name__in=[name, 'Civil']).first()
    if prep:
        prep.name = name
        prep.order = order
        prep.save()
    else:
        prep = Exam.objects.create(category=psc, parent=lvl7, name=name, order=order, is_active=True)
    clean_slug = name.lower().replace(' ', '-').replace('(', '').replace(')', '')
    slug = f"psc-7th-level-{clean_slug}"
    c = Course.objects.filter(slug=slug).first() or Course.objects.filter(exam=prep).first()
    if not c:
        Course.objects.create(exam=prep, title=f"PSC 7th Level {name}", slug=slug, status='published', is_open_for_enrollment=True)

# Setup Papers, Subjects, Chapters, Topics for 5th Level Civil Engineering
civil_prep = Exam.objects.filter(parent=lvl5, name='Civil Engineering').first()
p1, _ = Paper.objects.get_or_create(exam=civil_prep, name='First Paper: Technical Subject', defaults={'paper_number': '1', 'order': 1})
s1, _ = Subject.objects.get_or_create(paper=p1, name='Civil Engineering Fundamentals', defaults={'code': 'CE-101', 'order': 1})
c1, _ = Chapter.objects.get_or_create(subject=s1, title='Unit 1: Structural Engineering & Mechanics', defaults={'order': 1})
Topic.objects.get_or_create(chapter=c1, name='1.1 Bending Moment & Shear Force', defaults={'order': 1})
Topic.objects.get_or_create(chapter=c1, name='1.2 Stress & Strain Analysis', defaults={'order': 2})

c2, _ = Chapter.objects.get_or_create(subject=s1, title='Unit 2: Estimating, Costing & Valuation', defaults={'order': 2})
Topic.objects.get_or_create(chapter=c2, name='2.1 Rate Analysis & Specifications', defaults={'order': 1})
Topic.objects.get_or_create(chapter=c2, name='2.2 Quantity Surveying', defaults={'order': 2})

p2, _ = Paper.objects.get_or_create(exam=civil_prep, name='Second Paper: Applied Civil Engineering', defaults={'paper_number': '2', 'order': 2})
s2, _ = Subject.objects.get_or_create(paper=p2, name='Building Construction & Technology', defaults={'code': 'CE-201', 'order': 1})
c3, _ = Chapter.objects.get_or_create(subject=s2, title='Unit 1: Foundation & Masonry', defaults={'order': 1})
Topic.objects.get_or_create(chapter=c3, name='1.1 Shallow and Deep Foundations', defaults={'order': 1})

# Setup Papers, Subjects, Chapters, Topics for 5th Level Amin (Surveyor)
amin_prep = Exam.objects.filter(parent=lvl5, name='Amin (Surveyor)').first()
ap1, _ = Paper.objects.get_or_create(exam=amin_prep, name='First Paper: Surveying Fundamentals', defaults={'paper_number': '1', 'order': 1})
as1, _ = Subject.objects.get_or_create(paper=ap1, name='Cadastral Surveying', defaults={'code': 'SV-101', 'order': 1})
ac1, _ = Chapter.objects.get_or_create(subject=as1, title='Unit 1: Basic Geodesy & Measurements', defaults={'order': 1})
Topic.objects.get_or_create(chapter=ac1, name='1.1 Plane Table Surveying', defaults={'order': 1})
Topic.objects.get_or_create(chapter=ac1, name='1.2 Land Measurement Units', defaults={'order': 2})

print('All academic hierarchy and courses successfully seeded!')
