"""
Fix academic hierarchy to match client requirements EXACTLY.

CLIENT REQUIREMENTS:
PSC Exams:
  4th Level:
    - Assistant Civil Engineer (active)
    - Amin/Surveyor (coming soon)

  5th Level:
    - Civil Engineering (NOT "Civil Sub Engineer") ← RENAME NEEDED
    - Building and Architect (coming soon)
    - Civil Lab Assistant (coming soon)
    - Amin (Surveyor) (coming soon)

  7th Level:
    - Civil Engineer (active)
    - Geomatic (coming soon)
    - Computer/IT (coming soon)

License Exam:
  - Civil Engineering (active)
  - Geomatics Engineering (coming soon)
  - Computer / IT Engineering (coming soon)

ISSUES TO FIX:
1. 5th Level "Civil Sub Engineer" (id=22) → rename to "Civil Engineering"
   - Also rename its course "Civil Sub Engineer" → "PSC 5th Level Civil Engineering"
   - Update course status to published (it IS the main civil course)
2. 5th Level "Computer / IT" (id=23) → mark as inactive (not in client requirements for 5th level)
   Actually per requirements, Computer Operator could be for 5th level as "Computer Operator"
   but it's not in the PRIMARY client requirements. Keep as inactive for now.
3. 5th Level "Computer Operator" (id=32) → mark as inactive (not in primary client requirements)
4. 7th Level: Fix names:
   - "Geomatic" (id=27) → keep as is, coming_soon, but rename course to "PSC 7th Level Geomatic"
   - "Computer / IT" (id=26) → rename to "Computer/IT" and fix course
   - "Computer Officer" (id=35) → mark as inactive (duplicate)
   - "Building and Architect" (id=34) → keep coming_soon
5. 4th Level: 
   - "Assistant Civil Engineer" (id=20) → already correct
   - "Amin (Surveyor)" (id=33) → already correct coming_soon

This script ONLY makes SAFE changes - renames and status updates.
It does NOT delete any data.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from exams.models import ExamCategory, Exam
from courses.models import Course

psc = ExamCategory.objects.get(name='PSC Exams')

print("=" * 60)
print("FIXING PSC ACADEMIC HIERARCHY")
print("=" * 60)

# ── FIX 1: Rename "Civil Sub Engineer" → "Civil Engineering" under 5th Level ──
lvl5 = Exam.objects.get(category=psc, parent=None, name='5th Level Exam')

civil_sub = Exam.objects.filter(parent=lvl5, name='Civil Sub Engineer').first()
if civil_sub:
    old_name = civil_sub.name
    civil_sub.name = 'Civil Engineering'
    civil_sub.order = 1
    civil_sub.save()
    print(f"FIX 1: Renamed Exam id={civil_sub.id}: '{old_name}' → 'Civil Engineering'")

    # Rename/update the associated course
    course = Course.objects.filter(exam=civil_sub).first()
    if course:
        old_title = course.title
        course.title = 'PSC 5th Level Civil Engineering'
        # Ensure it's published (it's the main prep)
        if course.status == 'draft':
            course.status = 'published'
        course.is_open_for_enrollment = True
        course.save()
        print(f"  Fixed course id={course.id}: '{old_title}' → '{course.title}' status={course.status}")
    else:
        # Create course if none exists
        slug = 'psc-5th-level-civil-engineering'
        c = Course.objects.filter(slug=slug).first()
        if not c:
            c = Course.objects.create(
                exam=civil_sub,
                title='PSC 5th Level Civil Engineering',
                slug=slug,
                status='published',
                is_open_for_enrollment=True,
            )
            print(f"  Created course id={c.id}: '{c.title}'")
else:
    civil_existing = Exam.objects.filter(parent=lvl5, name='Civil Engineering').first()
    if civil_existing:
        print(f"FIX 1: 'Civil Engineering' already exists (id={civil_existing.id}) - no rename needed")
    else:
        print("FIX 1: WARN - Could not find 'Civil Sub Engineer' or 'Civil Engineering' under 5th Level!")

# ── FIX 2: Deactivate "Computer / IT" under 5th Level (not in primary client req) ──
comp_it_5th = Exam.objects.filter(parent=lvl5, name='Computer / IT').first()
if comp_it_5th:
    comp_it_5th.is_active = False
    comp_it_5th.save()
    print(f"FIX 2: Deactivated Exam id={comp_it_5th.id}: 'Computer / IT' under 5th Level (not in primary client requirements)")

# ── FIX 3: Deactivate "Computer Operator" under 5th Level (not in primary client req) ──
comp_op_5th = Exam.objects.filter(parent=lvl5, name='Computer Operator').first()
if comp_op_5th:
    comp_op_5th.is_active = False
    comp_op_5th.save()
    print(f"FIX 3: Deactivated Exam id={comp_op_5th.id}: 'Computer Operator' under 5th Level")

# Fix 5th Level ordering
civil_eng_5th = Exam.objects.filter(parent=lvl5, name='Civil Engineering').first()
bld_arch_5th = Exam.objects.filter(parent=lvl5, name='Building and Architect').first()
civil_lab_5th = Exam.objects.filter(parent=lvl5, name='Civil Lab Assistant').first()
amin_5th = Exam.objects.filter(parent=lvl5, name='Amin (Surveyor)').first()

for exam, order in [(civil_eng_5th, 1), (bld_arch_5th, 2), (civil_lab_5th, 3), (amin_5th, 4)]:
    if exam:
        exam.order = order
        exam.is_active = True
        exam.save()
        print(f"  Order/active set: 5th Level id={exam.id} '{exam.name}' → order={order}")

# ── FIX 4: Fix 7th Level - clean up duplicates ──
lvl7 = Exam.objects.get(category=psc, parent=None, name='7th Level Exam')

# Keep: Civil Engineer (id=25), Geomatic (id=27), Building and Architect (id=34)
# "Computer/IT" (id=26) - rename to just "Computer/IT" and update course
# "Computer Officer" (id=35) - deactivate as duplicate

comp_off_7th = Exam.objects.filter(parent=lvl7, name='Computer Officer').first()
if comp_off_7th:
    comp_off_7th.is_active = False
    comp_off_7th.save()
    print(f"FIX 4: Deactivated Exam id={comp_off_7th.id}: 'Computer Officer' (7th Level duplicate)")

comp_it_7th = Exam.objects.filter(parent=lvl7, name='Computer / IT').first()
if comp_it_7th:
    # Make sure it's correctly marked as coming_soon and properly named
    comp_it_7th.is_active = True
    comp_it_7th.save()
    course = Course.objects.filter(exam=comp_it_7th).first()
    if course:
        course.title = 'PSC 7th Level Computer/IT'
        course.status = 'coming_soon'
        course.save()
        print(f"FIX 4: Fixed 7th Level Computer/IT course → {course.title}")

# Fix ordering for 7th level
civil_7th = Exam.objects.filter(parent=lvl7, name='Civil Engineer').first()
geom_7th = Exam.objects.filter(parent=lvl7, name='Geomatic').first()
comp_7th = Exam.objects.filter(parent=lvl7, name='Computer / IT').first()
bld_7th = Exam.objects.filter(parent=lvl7, name='Building and Architect').first()

for exam, order in [(civil_7th, 1), (geom_7th, 2), (comp_7th, 3), (bld_7th, 4)]:
    if exam:
        exam.order = order
        exam.is_active = True
        exam.save()
        print(f"  Order/active set: 7th Level id={exam.id} '{exam.name}' → order={order}")

# ── FIX 5: Fix 4th Level ordering ──
lvl4 = Exam.objects.get(category=psc, parent=None, name='4th Level Exam')
ace_4th = Exam.objects.filter(parent=lvl4, name='Assistant Civil Engineer').first()
amin_4th = Exam.objects.filter(parent=lvl4, name='Amin (Surveyor)').first()

for exam, order in [(ace_4th, 1), (amin_4th, 2)]:
    if exam:
        exam.order = order
        exam.is_active = True
        exam.save()
        print(f"  Order set: 4th Level id={exam.id} '{exam.name}' → order={order}")

print()
print("=" * 60)
print("VERIFICATION AFTER FIXES")
print("=" * 60)

print("\nPSC Exams → 5th Level (active only):")
for p in Exam.objects.filter(parent=lvl5, is_active=True).order_by('order'):
    c = p.courses.first()
    print(f"  [{p.order}] id={p.id}: {p.name} | course={c.title if c else 'None'} ({c.status if c else 'N/A'})")

print("\nPSC Exams → 4th Level (active only):")
for p in Exam.objects.filter(parent=lvl4, is_active=True).order_by('order'):
    c = p.courses.first()
    print(f"  [{p.order}] id={p.id}: {p.name} | course={c.title if c else 'None'} ({c.status if c else 'N/A'})")

print("\nPSC Exams → 7th Level (active only):")
for p in Exam.objects.filter(parent=lvl7, is_active=True).order_by('order'):
    c = p.courses.first()
    print(f"  [{p.order}] id={p.id}: {p.name} | course={c.title if c else 'None'} ({c.status if c else 'N/A'})")

lic = ExamCategory.objects.filter(name='License Exam').first()
if lic:
    print("\nLicense Exam (active only):")
    for p in Exam.objects.filter(category=lic, is_active=True).order_by('order'):
        c = p.courses.first()
        print(f"  [{p.order}] id={p.id}: {p.name} | course={c.title if c else 'None'} ({c.status if c else 'N/A'})")

print("\nDone!")
