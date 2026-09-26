import csv
import io
import unicodedata
from openpyxl import Workbook, load_workbook

CSV_COLUMNS = [
    'question', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'explanation',
]

ROW_FIELDS = [
    'sn', 'question', 'marks', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'model_answer', 'explanation', 'hint',
]

EXCEL_HEADERS_OBJECTIVE = [
    'SN', 'Questions', 'Mark', 'Option A', 'Option B', 'Option C', 'Option D',
    'Correct Answer', 'Explanation', 'Hint',
]
EXCEL_HEADERS_TRUE_FALSE = ['SN', 'Questions', 'Mark', 'Correct Answer', 'Explanation', 'Hint']
EXCEL_HEADERS_SUBJECTIVE = ['SN', 'Questions', 'Mark', 'Model Answer', 'Explanation', 'Hint']

OBJECTIVE_TYPES = ('mcq', 'true_false')
SUBJECTIVE_TYPES = ('subjective', 'short_answer', 'long_answer')
ALL_TYPES = OBJECTIVE_TYPES + SUBJECTIVE_TYPES

EXCEL_HEADER_MAP = {
    'sn': 'sn', 'questions': 'question', 'question': 'question',
    'mark': 'marks', 'marks': 'marks',
    'option a': 'option_a', 'option b': 'option_b',
    'option c': 'option_c', 'option d': 'option_d',
    'options a': 'option_a', 'options b': 'option_b',
    'options c': 'option_c', 'options d': 'option_d',
    'correct answer': 'correct_answer',
    'model answer': 'model_answer',
    'expected answer': 'model_answer', 'model_answer': 'model_answer',
    'explanation': 'explanation', 'hint': 'hint',
}

VALID_ANSWERS = ['A', 'B', 'C', 'D']
ANSWER_NUMBER_MAP = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}


def _normalize_answer(raw):
    """Normalize raw answer values like 'A', 'option a', '1', 'A.' to uppercase letter A/B/C/D."""
    value = (raw or '').strip().upper()
    if value.startswith('OPTION '):
        value = value[7:].strip()
    elif value.startswith('OPTION'):
        value = value[6:].strip()
    if value.endswith('.'):
        value = value[:-1].strip()
    return ANSWER_NUMBER_MAP.get(value, value)


def _parse_xlsx_rows(file):
    """Read an .xlsx workbook into a list of dicts keyed by ROW_FIELDS."""
    wb = load_workbook(file, data_only=True, read_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration:
        return [], []

    headers = []
    for cell in header_row:
        key = EXCEL_HEADER_MAP.get(str(cell).strip().lower()) if cell is not None else None
        headers.append(key)

    rows = []
    for raw in rows_iter:
        if raw is None or all(v is None or str(v).strip() == '' for v in raw):
            continue
        row = {}
        for key, value in zip(headers, raw):
            if key is None:
                continue
            row[key] = '' if value is None else str(value).strip()
        rows.append(row)
    return rows, [h for h in headers if h]


def _parse_csv_rows(file):
    decoded = file.read().decode('utf-8-sig')
    reader = list(csv.DictReader(io.StringIO(decoded)))
    rows = [{k: (v or '').strip() for k, v in r.items()} for r in reader]
    return rows, list(reader[0].keys()) if reader else []


def _analyse_row(row, question_type, allow_blank_explanation=False, require_mcq_fields=False):
    """
    Split a row's problems into hard errors and AI-fillable gaps.

    When require_mcq_fields is True (Teacher upload workflow):
      Missing Option A-D and missing Correct Answer are hard errors.
    When allow_blank_explanation is True:
      Blank Explanation is completely valid (optional) and not held as missing.
    """
    errors = []
    missing = []

    text = (row.get('question') or '').strip()
    if not text:
        errors.append('Question is required.')

    marks_raw = (row.get('marks') or '').strip()
    if marks_raw:
        try:
            if float(marks_raw) <= 0:
                errors.append('Mark must be a positive number.')
        except ValueError:
            errors.append(f"Mark must be numeric (got '{marks_raw}').")

    if question_type == 'mcq':
        option_keys = ('option_a', 'option_b', 'option_c', 'option_d')
        blank_options = [k[-1].upper() for k in option_keys if not (row.get(k) or '').strip()]
        if blank_options:
            if require_mcq_fields:
                errors.append('Option ' + ', '.join(blank_options) + (' is required.' if len(blank_options) == 1 else ' are required.'))
            else:
                missing.append('options')

        raw_answer = (row.get('correct_answer') or '').strip()
        answer = _normalize_answer(raw_answer)
        if not raw_answer:
            if require_mcq_fields:
                errors.append('Missing Correct Answer.')
            else:
                missing.append('correct_answer')
        elif answer not in VALID_ANSWERS:
            errors.append(f'Correct Answer "{raw_answer}" is invalid. Expected A, B, C or D (or 1, 2, 3, 4).')
        else:
            row['correct_answer'] = answer

    elif question_type == 'true_false':
        raw_answer = (row.get('correct_answer') or '').strip()
        answer = _normalize_answer(raw_answer)
        if not raw_answer:
            if require_mcq_fields:
                errors.append('Missing Correct Answer.')
            else:
                missing.append('correct_answer')
        elif answer not in ('A', 'B'):
            errors.append("Correct Answer must be 1 or A (True), or 2 or B (False).")
        else:
            row['correct_answer'] = answer

    elif question_type in SUBJECTIVE_TYPES:
        if not (row.get('model_answer') or '').strip():
            errors.append('Model Answer is required for subjective questions.')
        return errors, missing

    if not (row.get('explanation') or '').strip():
        if not allow_blank_explanation:
            missing.append('explanation')

    return errors, missing


def _missing_detail(row, question_type):
    """Human-readable list of what an incomplete row is missing."""
    detail = []
    if question_type == 'mcq':
        blanks = [k[-1].upper() for k in ('option_a', 'option_b', 'option_c', 'option_d')
                  if not (row.get(k) or '').strip()]
        if blanks:
            detail.append('Option ' + ', '.join(blanks) + (' is required.' if len(blanks) == 1 else ' are required.'))
    if question_type in OBJECTIVE_TYPES and not (row.get('correct_answer') or '').strip():
        detail.append('Correct Answer is required.')
    if not (row.get('explanation') or '').strip() and question_type in OBJECTIVE_TYPES:
        detail.append('Explanation is empty (the AI can fill it).')
    return detail


def _existing_question_ids(norm_texts):
    """Map lower-cased question text -> {'id': id, 'code': question_id}, in batches."""
    from django.db.models.functions import Lower
    from exams.models import Question
    found = {}
    texts = sorted(set(norm_texts))
    for i in range(0, len(texts), 500):
        chunk = texts[i:i + 500]
        for q_id, q_code, lowered in (
            Question.objects.annotate(lowered=Lower('text'))
            .filter(lowered__in=chunk).order_by('id')
            .values_list('id', 'question_id', 'lowered')
        ):
            found.setdefault(lowered, {
                'id': q_id,
                'code': q_code or f"Q-{q_id:06d}"
            })
    return found


def _build_report(rows, question_type, allow_blank_explanation=False, require_mcq_fields=False):
    """Validate every row and return (report_data, counts)."""
    report_data = []
    counts = {'total': 0, 'valid': 0, 'incomplete': 0, 'error': 0, 'duplicate': 0}
    seen_texts = {}

    cleaned = []
    for idx, row in enumerate(rows):
        clean = {key: (row.get(key) or '').strip() for key in ROW_FIELDS}
        if not clean.get('sn'):
            clean['sn'] = str(idx + 1)
        cleaned.append(clean)
    existing_ids = _existing_question_ids(
        c['question'].strip().lower() for c in cleaned if c['question'].strip()
    )

    for idx, clean in enumerate(cleaned):
        counts['total'] += 1
        errors, missing = _analyse_row(
            clean,
            question_type,
            allow_blank_explanation=allow_blank_explanation,
            require_mcq_fields=require_mcq_fields,
        )

        norm_text = clean['question'].strip().lower()
        is_duplicate = False
        duplicate_of = None
        if norm_text:
            if norm_text in existing_ids:
                is_duplicate = True
                duplicate_of = existing_ids[norm_text]['code']
            elif norm_text in seen_texts:
                is_duplicate = True
                duplicate_of = f"row {seen_texts[norm_text]}"
            else:
                seen_texts[norm_text] = idx + 1

        if is_duplicate:
            errors = [f"Duplicate question (matches {duplicate_of}). It will be reused instead of imported as a new question."]
            missing = []
            status = 'duplicate'
        else:
            if errors:
                status = 'error'
            elif missing:
                status = 'incomplete'
            else:
                status = 'valid'

        counts[status] += 1
        report_data.append({
            'row_index': idx + 1,
            'sn': clean['sn'],
            'status': status,
            'errors': errors,
            'missing': missing,
            'missing_detail': _missing_detail(clean, question_type) if missing else [],
            'duplicate_of': duplicate_of,
            'data': clean,
        })

    return report_data, counts


def _recount(report_data):
    counts = {'total': len(report_data), 'valid': 0, 'incomplete': 0, 'error': 0, 'duplicate': 0}
    for row in report_data:
        counts[row['status']] = counts.get(row['status'], 0) + 1
    return counts


def generate_excel_template(qtype='mcq'):
    """Generate in-memory Excel template workbook with Questions and Instructions sheets."""
    qtype = (qtype or 'mcq').strip().lower()
    if qtype in SUBJECTIVE_TYPES:
        qtype = 'subjective'
    if qtype not in ('mcq', 'true_false', 'subjective'):
        qtype = 'mcq'

    if qtype == 'mcq':
        headers = EXCEL_HEADERS_OBJECTIVE
        title = 'Objective Question Template'
        example = [1, 'नेपालको राजधानी कुन हो?', 1, 'पोखरा', 'काठमाडौं', 'ललितपुर', 'विराटनगर',
                   'B', 'नेपालको राजधानी काठमाडौं हो।', '']
        rules = [
            'Required: Questions, Mark, Option A-D, Correct Answer.',
            'Correct Answer: A, B, C or D (the numbers 1-4 also work).',
            'Explanation and Hint are optional.',
        ]
    elif qtype == 'true_false':
        headers = EXCEL_HEADERS_TRUE_FALSE
        title = 'True-False Question Template'
        example = [1, 'काठमाडौं नेपालको राजधानी हो।', 1, 'A', 'काठमाडौं नेपालको राजधानी हो।', '']
        rules = [
            'Required: Questions, Mark, Correct Answer.',
            'Correct Answer: A (True) or B (False) - 1 or 2 also work.',
            'Explanation and Hint are optional.',
        ]
    else:
        headers = EXCEL_HEADERS_SUBJECTIVE
        title = 'Subjective Question Template'
        example = [1, 'नेपालको संघीय संरचनाबारे संक्षिप्त चर्चा गर्नुहोस्।', 5,
                   'नेपाल ७ प्रदेशसहितको संघीय गणतन्त्र हो...', 'अध्याय ३ हेर्नुहोस्।', '']
        rules = [
            'Required: Questions, Mark, Model Answer (the reference answer evaluators mark against).',
            'Explanation and Hint are optional.',
            'Subjective questions have no answer options, so this template has no option columns.',
        ]

    wb = Workbook()
    ws = wb.active
    ws.title = 'Questions'
    ws.append(headers)
    guide = wb.create_sheet('Instructions')
    guide.append([title])
    for line in rules:
        guide.append([line])
    guide.append([])
    guide.append(['Example row (copy the layout into the Questions sheet):'])
    guide.append(headers)
    guide.append(example)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf, title


def get_teacher_authorized_exam_ids(user):
    """
    Returns a set of Exam IDs the teacher is authorized to access based on assigned courses.
    Admin and Super-admin users are authorized for all exams.
    """
    if not user or not user.is_authenticated:
        return set()
    if getattr(user, 'role', '') in ('admin', 'super-admin') or getattr(user, 'is_staff', False):
        from exams.models import Exam
        return set(Exam.objects.values_list('id', flat=True))

    from courses.models import Course
    from exams.models import Exam

    assigned_courses = Course.objects.filter(teachers__teacher=user).exclude(exam__isnull=True)
    direct_exam_ids = set(assigned_courses.values_list('exam_id', flat=True))
    if not direct_exam_ids:
        return set()

    # Expand to child exams (e.g. if assigned to Level, can teach preparations under it;
    # or if assigned to Preparation, can teach sub-branches)
    child_ids = set(Exam.objects.filter(parent_id__in=direct_exam_ids).values_list('id', flat=True))
    grandchild_ids = set(Exam.objects.filter(parent_id__in=child_ids).values_list('id', flat=True))

    return direct_exam_ids | child_ids | grandchild_ids


def verify_teacher_subject_authorization(user, subject_id):
    """
    Verify that the user is authorized to upload questions into the given subject.
    Returns (True, subject_obj) on success, or (False, error_message) on failure.
    """
    from exams.models import Subject
    try:
        subject = Subject.objects.select_related(
            'paper', 'paper__exam', 'paper__exam__parent', 'paper__exam__category'
        ).get(pk=subject_id)
    except (Subject.DoesNotExist, ValueError, TypeError):
        return False, "The selected subject no longer exists."

    if not subject.paper or not subject.paper.exam:
        return False, "Subject is not connected to a valid exam/syllabus."

    if getattr(user, 'role', '') in ('admin', 'super-admin') or getattr(user, 'is_staff', False):
        return True, subject

    authorized_exam_ids = get_teacher_authorized_exam_ids(user)
    if not authorized_exam_ids:
        return False, "You have not been assigned to any courses yet. Please contact an administrator."

    exam_id = subject.paper.exam_id

    if exam_id in authorized_exam_ids:
        return True, subject

    return False, "You are not authorized to upload questions into this course or preparation."


def get_teacher_authorized_hierarchy(user):
    """
    Build a fast, preloaded hierarchy of categories, levels, preparations, subjects, chapters, and topics.
    Scoped to the courses/exams the teacher is authorized to teach.
    """
    from exams.models import ExamCategory

    authorized_exam_ids = get_teacher_authorized_exam_ids(user)
    is_admin = getattr(user, 'role', '') in ('admin', 'super-admin') or getattr(user, 'is_staff', False)

    categories = ExamCategory.objects.prefetch_related(
        'exams__children__children__papers__subjects__chapters__topics',
        'exams__children__papers__subjects__chapters__topics',
        'exams__papers__subjects__chapters__topics',
    ).order_by('order', 'id')

    def _sorted(items):
        return sorted(items, key=lambda o: (getattr(o, 'order', 0), o.id))

    def build_paper(paper):
        paper_data = {
            'id': paper.id,
            'name': paper.name,
            'is_active': paper.is_active,
            'subjects': [],
        }
        for sub in _sorted(paper.subjects.all()):
            sub_data = {
                'id': sub.id,
                'name': sub.name,
                'code': sub.code,
                'is_active': sub.is_active,
                'chapters': [],
            }
            for chap in _sorted(sub.chapters.all()):
                chap_data = {
                    'id': chap.id,
                    'name': chap.title,
                    'is_active': chap.is_active,
                    'topics': [
                        {'id': topic.id, 'name': topic.name, 'is_active': topic.is_active}
                        for topic in _sorted(chap.topics.all())
                    ],
                }
                sub_data['chapters'].append(chap_data)
            paper_data['subjects'].append(sub_data)
        return paper_data

    def exam_is_authorized(exam):
        if is_admin:
            return True
        if exam.id in authorized_exam_ids:
            return True
        # Check if any child exam is authorized
        if any(c.id in authorized_exam_ids for c in exam.children.all()):
            return True
        return False

    def build_exam(exam):
        # Filter children and papers
        children = [build_exam(child) for child in _sorted(exam.children.all()) if exam_is_authorized(child)]
        papers = [build_paper(paper) for paper in _sorted(exam.papers.all())]

        return {
            'id': exam.id,
            'name': exam.name,
            'status': exam.status,
            'is_active': exam.is_active,
            'category_id': exam.category_id,
            'children': children,
            'papers': papers,
        }

    tree_data = []
    for cat in categories:
        positions = [
            build_exam(exam)
            for exam in _sorted(cat.exams.all())
            if exam.parent_id is None and exam_is_authorized(exam)
        ]
        if positions:
            tree_data.append({
                'id': cat.id,
                'name': cat.name,
                'is_active': cat.is_active,
                'positions': positions,
            })

    return tree_data
