import re
from urllib.parse import quote


def format_material_display_title(material):
    """
    Returns '{Course Name} - Syllabus' if syllabus, else '{Course Name} - Note'.
    Requirement:
    'course name + if syllabus than syllabus else if note than note'
    """
    if not material:
        return 'Document'

    kind = 'Syllabus' if getattr(material, 'content_category', None) == 'syllabus' else 'Note'

    course_name = ''
    course = getattr(material, 'course', None)
    if course and getattr(course, 'title', None):
        course_name = course.title.strip()

    exam = getattr(material, 'exam', None)
    if not course_name and exam:
        rel_course = None
        if hasattr(exam, 'courses'):
            try:
                rel_course = exam.courses.filter(status='published').first() or exam.courses.first()
            except Exception:
                rel_course = None
        if rel_course and getattr(rel_course, 'title', None):
            course_name = rel_course.title.strip()
        elif getattr(exam, 'parent', None) and getattr(exam.parent, 'name', None):
            parent_name = exam.parent.name.strip()
            exam_name = exam.name.strip() if getattr(exam, 'name', None) else ''
            if parent_name.lower() in exam_name.lower():
                course_name = exam_name
            elif exam_name:
                course_name = f"{parent_name} {exam_name}"
            else:
                course_name = parent_name
        elif getattr(exam, 'name', None):
            course_name = exam.name.strip()

    if not course_name and getattr(material, 'title', None):
        course_name = material.title.strip()

    clean_course = course_name
    for suffix in ['- Syllabus', 'Syllabus', '- Notes', 'Notes', '- Note', 'Note']:
        if clean_course.lower().endswith(suffix.lower()):
            clean_course = clean_course[:-len(suffix)].strip(' -_')
            break
    if not clean_course:
        clean_course = course_name or 'Document'

    return f"{clean_course} - {kind}"


def _drive_file_id_matches(value, file_id):
    if not value:
        return False
    name = str(value).replace('\\', '/')
    if '/' in name:
        name = name.rsplit('/', 1)[1]
    if '__' not in name:
        return False
    stored_id, _, _ = name.partition('__')
    return stored_id == file_id


def resolve_file_display_info(file_id):
    """
    Given a Google Drive file_id, resolve the display title and kind:
    Returns (display_title, kind)
    """
    from notes.models import StudyMaterial
    from exams.models import Examination

    # 1. Search in StudyMaterial
    try:
        candidates = StudyMaterial.objects.filter(file__icontains=file_id).select_related(
            'course', 'exam', 'exam__parent', 'exam__category'
        )
        for cand in candidates:
            if _drive_file_id_matches(cand.file.name, file_id) or file_id in str(cand.file.name):
                return format_material_display_title(cand), ('Syllabus' if cand.content_category == 'syllabus' else 'Note')
    except Exception:
        pass

    # 2. Search in Examination
    try:
        exam_candidates = Examination.objects.filter(question_paper_pdf__icontains=file_id).select_related('course', 'exam')
        for cand in exam_candidates:
            if _drive_file_id_matches(cand.question_paper_pdf.name, file_id) or file_id in str(cand.question_paper_pdf.name):
                c_title = cand.course.title if cand.course else (cand.exam.name if cand.exam else cand.title)
                return f"{c_title} - Question Paper", "Question Paper"
    except Exception:
        pass

    return None, None


def inject_pdf_title(pdf_bytes, title):
    """
    Update the PDF metadata '/Title' entry to `title` so browser PDF viewers
    (like Chrome/Edge native PDF reader) show the desired title in the browser tab
    and top-left viewer toolbar.
    """
    if not pdf_bytes or not title:
        return pdf_bytes
    if not pdf_bytes.startswith(b'%PDF-'):
        return pdf_bytes

    # Attempt with pymupdf (fastest C library)
    try:
        import pymupdf
        doc = pymupdf.open(stream=pdf_bytes, filetype='pdf')
        meta = doc.metadata or {}
        meta['title'] = str(title)
        doc.set_metadata(meta)
        return doc.tobytes(deflate=True)
    except Exception:
        pass

    # Fallback with pypdf
    try:
        import pypdf
        import io
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        writer = pypdf.PdfWriter()
        writer.append(reader)
        writer.add_metadata({'/Title': str(title)})
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()
    except Exception:
        pass

    return pdf_bytes


def build_content_disposition(display_title, disposition_type='inline'):
    """
    Constructs an RFC 6266 / RFC 5987 compliant Content-Disposition header
    with both an ASCII-safe fallback and a UTF-8 encoded filename.
    """
    clean_title = re.sub(r'[\\/*?:"<>|]', '_', display_title).strip(' .')
    if not clean_title.lower().endswith('.pdf'):
        base_name = f"{clean_title}.pdf"
    else:
        base_name = clean_title

    ascii_name = re.sub(r'[^\w\s\.-]', '_', base_name)
    ascii_name = re.sub(r'_+', '_', ascii_name).strip(' ._')
    if not ascii_name.lower().endswith('.pdf'):
        ascii_name = f"{ascii_name}.pdf"
    if not ascii_name or ascii_name == '.pdf':
        ascii_name = 'document.pdf'

    encoded_name = quote(base_name)
    return f"{disposition_type}; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded_name}"

