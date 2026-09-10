"""
Data migration: LoksewaAI canonical course hierarchy corrections.

Changes:
1. Rename Exam records to match client-specified names:
   - [20] Civil Engineering (4th Level child) → Assistant Civil Engineer
   - [22] Civil Engineering (5th Level child) → Civil Sub Engineer
   - [25] Civil Engineering (7th Level child) → Civil Engineer

2. Rename Course records to match:
   - [10] PSC 5th Level Civil Engineering → Civil Sub Engineer
   - [17] PSC 4th Level Civil Engineering → Assistant Civil Engineer
   - [19] PSC 7th Level Civil Engineering → Civil Engineer

3. Fix ExamCategory typo:
   - [20] "Licence Exam" → "License Exam"

4. Create License Exam academic structure:
   - Exam: "Civil Engineering" (root, License Exam category)
   - Course: "Civil Engineering" (status=published) linked to that Exam

5. Mark Coming Soon courses (status='coming_soon'):
   - PSC 5th: Amin (Surveyor), Computer, Building and Architect, Civil Lab Assistant, Computer Operator
   - PSC 7th: Geomatic/Surveyor, Computer, Building and Architect, Computer Officer
   - PSC 4th: Amin (Surveyor)

6. Mark non-canonical / dev-only courses as archived:
   - [1] [DEV] Kharidar Complete Course
   - [2] Section Officer Prep Course
   - [3] Test Course
"""

from django.db import migrations


def apply_canonical_hierarchy(apps, schema_editor):
    ExamCategory = apps.get_model('exams', 'ExamCategory')
    Exam = apps.get_model('exams', 'Exam')
    Course = apps.get_model('courses', 'Course')

    # ─────────────────────────────────────────────────────
    # 1. Fix ExamCategory typo: Licence → License
    # ─────────────────────────────────────────────────────
    ExamCategory.objects.filter(id=20).update(name='License Exam')

    # ─────────────────────────────────────────────────────
    # 2. Rename Exam records (PKs are stable FK anchors — only name changes)
    # ─────────────────────────────────────────────────────
    # PSC 4th Level child: Civil Engineering → Assistant Civil Engineer
    Exam.objects.filter(id=20).update(name='Assistant Civil Engineer')

    # PSC 5th Level child: Civil Engineering → Civil Sub Engineer
    Exam.objects.filter(id=22).update(name='Civil Sub Engineer')

    # PSC 7th Level child: Civil Engineering → Civil Engineer
    Exam.objects.filter(id=25).update(name='Civil Engineer')

    # PSC 7th Level child: Surveyor → Geomatic (client calls it Geomatic)
    Exam.objects.filter(id=27).update(name='Geomatic')

    # PSC 7th Level child: Computer → Computer / IT
    Exam.objects.filter(id=26).update(name='Computer / IT')

    # PSC 5th Level child: Computer → Computer / IT
    Exam.objects.filter(id=23).update(name='Computer / IT')

    # ─────────────────────────────────────────────────────
    # 3. Rename Course records (PKs and FKs stay identical)
    # ─────────────────────────────────────────────────────
    # Course 10: PSC 5th Level Civil Engineering → Civil Sub Engineer
    Course.objects.filter(id=10).update(
        title='Civil Sub Engineer',
        slug='civil-sub-engineer-psc-5th',
        short_description='PSC 5th Level Civil Sub Engineer exam preparation course.',
    )

    # Course 17: PSC 4th Level Civil Engineering → Assistant Civil Engineer
    Course.objects.filter(id=17).update(
        title='Assistant Civil Engineer',
        slug='assistant-civil-engineer-psc-4th',
        short_description='PSC 4th Level Assistant Civil Engineer exam preparation course.',
    )

    # Course 19: PSC 7th Level Civil Engineering → Civil Engineer
    Course.objects.filter(id=19).update(
        title='Civil Engineer',
        slug='civil-engineer-psc-7th',
        short_description='PSC 7th Level Civil Engineer exam preparation course.',
    )

    # ─────────────────────────────────────────────────────
    # 4. Mark Coming Soon courses (keep is_open_for_enrollment=False)
    # ─────────────────────────────────────────────────────
    coming_soon_course_ids = [
        9,   # PSC 5th Level Computer Operator  → Coming Soon
        11,  # PSC 7th Level Surveyor → Geomatic Coming Soon (now renamed)
        12,  # PSC 7th Level Computer Officer → Coming Soon
        13,  # PSC 5th Level Building and Architect → Coming Soon
        14,  # PSC 5th Level Civil Lab Assistant → Coming Soon
        15,  # PSC 5th Level Amin (Surveyor) → Coming Soon
        18,  # PSC 4th Level Amin (Surveyor) → Coming Soon
        20,  # PSC 7th Level Building and Architect → Coming Soon
    ]
    Course.objects.filter(id__in=coming_soon_course_ids).update(
        status='coming_soon',
        is_open_for_enrollment=False,
    )

    # ─────────────────────────────────────────────────────
    # 5. Archive dev/test courses
    # ─────────────────────────────────────────────────────
    Course.objects.filter(id__in=[1, 2, 3]).update(
        status='archived',
        is_open_for_enrollment=False,
    )

    # ─────────────────────────────────────────────────────
    # 6. Create License Exam → Civil Engineering Exam + Course
    # ─────────────────────────────────────────────────────
    license_cat = ExamCategory.objects.filter(id=20).first()  # License Exam (just renamed)
    if license_cat:
        # Create Exam node for License Civil Engineering (root level, no parent)
        license_civil_exam, _ = Exam.objects.get_or_create(
            name='Civil Engineering',
            category=license_cat,
            parent=None,
            defaults={
                'description': 'Nepal Engineering Council License Exam for Civil Engineering.',
                'is_active': True,
                'order': 1,
            },
        )

        # Create the Course linked to this Exam
        Course.objects.get_or_create(
            slug='license-civil-engineering',
            defaults={
                'title': 'Civil Engineering',
                'short_description': 'NEC License Exam preparation for Civil Engineering graduates.',
                'description': '',
                'status': 'published',
                'exam': license_civil_exam,
                'featured': False,
                'duration_months': 3,
                'is_open_for_enrollment': True,
            },
        )

    # ─────────────────────────────────────────────────────
    # 7. Create License Coming Soon exams and courses
    # ─────────────────────────────────────────────────────
    if license_cat:
        # Geomatics Engineering — Coming Soon
        geomatics_exam, _ = Exam.objects.get_or_create(
            name='Geomatics Engineering',
            category=license_cat,
            parent=None,
            defaults={
                'description': 'NEC License Exam for Geomatics Engineering.',
                'is_active': True,
                'order': 2,
            },
        )
        Course.objects.get_or_create(
            slug='license-geomatics-engineering',
            defaults={
                'title': 'Geomatics Engineering',
                'short_description': 'NEC License Exam preparation for Geomatics Engineering. Coming soon.',
                'description': '',
                'status': 'coming_soon',
                'exam': geomatics_exam,
                'featured': False,
                'duration_months': 3,
                'is_open_for_enrollment': False,
            },
        )

        # Computer / IT Engineering — Coming Soon
        computer_exam, _ = Exam.objects.get_or_create(
            name='Computer / IT Engineering',
            category=license_cat,
            parent=None,
            defaults={
                'description': 'NEC License Exam for Computer/IT Engineering.',
                'is_active': True,
                'order': 3,
            },
        )
        Course.objects.get_or_create(
            slug='license-computer-it-engineering',
            defaults={
                'title': 'Computer / IT Engineering',
                'short_description': 'NEC License Exam preparation for Computer/IT Engineering. Coming soon.',
                'description': '',
                'status': 'coming_soon',
                'exam': computer_exam,
                'featured': False,
                'duration_months': 3,
                'is_open_for_enrollment': False,
            },
        )


def reverse_canonical_hierarchy(apps, schema_editor):
    """
    Partial reverse — restores original Exam/Course names.
    Does NOT delete newly created License courses (safe: no data loss,
    admin can delete them manually if needed).
    """
    ExamCategory = apps.get_model('exams', 'ExamCategory')
    Exam = apps.get_model('exams', 'Exam')
    Course = apps.get_model('courses', 'Course')

    ExamCategory.objects.filter(id=20).update(name='Licence Exam')
    Exam.objects.filter(id=20).update(name='Civil Engineering')
    Exam.objects.filter(id=22).update(name='Civil Engineering')
    Exam.objects.filter(id=25).update(name='Civil Engineering')
    Exam.objects.filter(id=27).update(name='Surveyor')
    Exam.objects.filter(id=26).update(name='Computer')
    Exam.objects.filter(id=23).update(name='Computer')
    Course.objects.filter(id=10).update(title='PSC 5th Level Civil Engineering', slug='psc-5th-level-civil-engineering')
    Course.objects.filter(id=17).update(title='PSC 4th Level Civil Engineering', slug='psc-4th-level-civil-engineering')
    Course.objects.filter(id=19).update(title='PSC 7th Level Civil Engineering', slug='psc-7th-level-civil-engineering')


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0008_course_coming_soon_status'),
        ('exams', '__first__'),
    ]

    operations = [
        migrations.RunPython(apply_canonical_hierarchy, reverse_canonical_hierarchy),
    ]
