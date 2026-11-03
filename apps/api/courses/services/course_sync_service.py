"""Course Catalog Synchronization Service.

Ensures that every academic preparation node in the Exam hierarchy
has a 1:1 canonical Course record, and that renames, status updates,
and creation in the academic hierarchy propagate to Course everywhere.
"""

from typing import Optional
from django.utils.text import slugify
from django.db import transaction
import uuid


def is_preparation_exam(exam) -> bool:
    """Returns True if the Exam represents a preparation/course node,
    rather than a Level/Category container node.

    A node is a preparation course if:
    1. It has a parent (e.g. child of a Level: 4th Level -> Assistant Civil Engineer,
       Diploma License -> Civil Sub Engineering License), OR
    2. It is a root exam in a flat category without child exams
       (e.g. Entrance Exams -> IOE MSC Entrance).
    Nodes that have child exams (e.g. Diploma License, 4th Level) are Levels.
    """
    if getattr(exam, 'parent_id', None) is not None:
        return True
    # If it has children, it's a level container
    if hasattr(exam, 'children') and exam.children.exists():
        return False
    # Flat exam under a category
    return getattr(exam, 'category_id', None) is not None


def map_exam_status_to_course(exam) -> str:
    """Maps Exam status/is_active to Course status."""
    if not getattr(exam, 'is_active', True) or getattr(exam, 'status', 'active') == 'inactive':
        return 'archived'
    if getattr(exam, 'status', 'active') == 'coming_soon':
        return 'coming_soon'
    return 'published'


def sync_course_for_exam(exam, create_if_missing: bool = False, force_save: bool = False) -> Optional[object]:
    """Synchronizes an Exam preparation node to its canonical Course record.
    If a Course already exists for this exam, updates its title, status, and description.
    If no Course exists and create_if_missing=True, creates the canonical Course record.
    """
    from courses.models import Course

    if not is_preparation_exam(exam):
        return None

    # Check for existing course linked to this exam
    course = Course.objects.filter(exam=exam).first()
    target_status = map_exam_status_to_course(exam)

    if course:
        updated_fields = []
        if course.title != exam.name:
            course.title = exam.name
            updated_fields.append('title')
        if exam.description and course.description != exam.description:
            course.description = exam.description
            updated_fields.append('description')
        if course.status != target_status:
            course.status = target_status
            updated_fields.append('status')
        if updated_fields or force_save:
            updated_fields.append('updated_at')
            course.save(update_fields=updated_fields if not force_save else None)
        return course

    if not create_if_missing:
        return None

    # No linked course yet; generate unique slug and create canonical Course record
    slug_base = slugify(exam.name)
    parent = getattr(exam, 'parent', None)
    category = getattr(exam, 'category', None)
    if parent:
        slug_base = slugify(f"{exam.name} {parent.name}")
    elif category:
        slug_base = slugify(f"{exam.name} {category.name}")
    
    if not slug_base:
        slug_base = f"course-{exam.id}"

    slug = slug_base
    if Course.objects.filter(slug=slug).exclude(exam=exam).exists():
        slug = f"{slug_base}-{exam.id}"
    if Course.objects.filter(slug=slug).exclude(exam=exam).exists():
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    course = Course.objects.create(
        title=exam.name,
        slug=slug,
        description=exam.description or '',
        short_description=(exam.description or '')[:500],
        status=target_status,
        exam=exam,
        is_open_for_enrollment=True,
    )
    return course


def ensure_courses_for_exams(exams_qs):
    """Ensures that all preparation exams in exams_qs have a canonical Course record.
    Non-destructive and idempotent."""
    from courses.models import Course

    exam_list = list(exams_qs)
    if not exam_list:
        return

    existing_exam_ids = set(Course.objects.filter(exam__in=exam_list).values_list('exam_id', flat=True))
    for exam in exam_list:
        if exam.id not in existing_exam_ids and is_preparation_exam(exam):
            sync_course_for_exam(exam, create_if_missing=True)


def reconcile_all_courses() -> dict:
    """Safely audits and reconciles all preparation exams with canonical Course records.
    Also links any StudyMaterial objects missing their course foreign key.
    """
    from exams.models import Exam
    from courses.models import Course
    from notes.models import StudyMaterial

    created_courses = 0
    updated_courses = 0
    synced_materials = 0

    with transaction.atomic():
        all_exams = Exam.objects.select_related('parent', 'category').prefetch_related('children').all()
        for exam in all_exams:
            if is_preparation_exam(exam):
                existing = Course.objects.filter(exam=exam).first()
                course = sync_course_for_exam(exam, create_if_missing=True)
                if course:
                    if existing is None:
                        created_courses += 1
                    else:
                        updated_courses += 1

        # Reconcile StudyMaterial where course is null but exam is set
        materials_without_course = StudyMaterial.objects.filter(course__isnull=True, exam__isnull=False).select_related('exam')
        for mat in materials_without_course:
            linked_course = Course.objects.filter(exam=mat.exam).first()
            if linked_course:
                mat.course = linked_course
                mat.save(update_fields=['course'])
                synced_materials += 1

    return {
        "created_courses": created_courses,
        "updated_courses": updated_courses,
        "synced_materials": synced_materials,
        "total_courses": Course.objects.count(),
    }
