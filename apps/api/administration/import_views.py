import csv
import io
from openpyxl import Workbook, load_workbook
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
from administration.models import CSVImport, AuditLog
from exams.models import Question, Topic, QuestionCollection
from core.models import Tag
from ai_tutor.services import AdminAILogic

# The CSV/Excel file carries question content only. Syllabus placement,
# question type and difficulty are chosen once in the UI and applied to
# every row, so the file stays simple and an admin cannot mistype a subject
# or chapter name.
#
# Internal row keys (left) map to the admin-facing Excel headers (right):
#   sn -> SN, question -> Questions, marks -> Mark,
#   option_a..d -> Option A..D, correct_answer -> Correct Answer,
#   explanation -> Explanation, hint -> Hint
CSV_COLUMNS = [
    'question', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'explanation',
]

# Full set of fields recognised in a row, CSV or Excel. `sn` and `marks` and
# `hint` are optional extras layered on top of the original CSV format.
ROW_FIELDS = ['sn', 'question', 'marks', 'option_a', 'option_b', 'option_c', 'option_d',
              'correct_answer', 'explanation', 'hint']

EXCEL_HEADERS = [
    'SN', 'Questions', 'Mark', 'Option A', 'Option B', 'Option C', 'Option D',
    'Correct Answer', 'Explanation', 'Hint',
]
EXCEL_HEADER_MAP = {
    'sn': 'sn', 'questions': 'question', 'mark': 'marks',
    'option a': 'option_a', 'option b': 'option_b',
    'option c': 'option_c', 'option d': 'option_d',
    'correct answer': 'correct_answer', 'explanation': 'explanation', 'hint': 'hint',
}

VALID_ANSWERS = ['A', 'B', 'C', 'D']

# Admins commonly write the correct answer as the option's position number
# (1st/2nd/3rd/4th option) rather than its letter - both are accepted and
# normalized to the letter form the Question model actually stores.
ANSWER_NUMBER_MAP = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}


def _normalize_answer(raw):
    value = (raw or '').strip().upper()
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
    # Normalize legacy CSV headers (question, option_a, ...) which already
    # match ROW_FIELDS, so no remapping needed beyond stripping values.
    rows = [{k: (v or '').strip() for k, v in r.items()} for r in reader]
    return rows, list(reader[0].keys()) if reader else []


def _analyse_row(row, question_type):
    """Split a row's problems into hard errors and AI-fillable gaps.

    Errors mean the row can never be imported. Missing fields are gaps the AI
    can fill, so those rows are held as 'incomplete' rather than rejected.
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
        blanks = [k for k in ('option_a', 'option_b', 'option_c', 'option_d')
                  if not (row.get(k) or '').strip()]
        if blanks:
            missing.append('options')
            for k in blanks:
                label = k.replace('option_', 'Option ').upper()
                errors_note = f'{label} is required.'
                # Only a hard error once AI-fill has had its chance; recorded
                # in `missing` above so the row is held as 'incomplete' first.

        raw_answer = (row.get('correct_answer') or '').strip()
        answer = _normalize_answer(raw_answer)
        if not raw_answer:
            missing.append('correct_answer')
        elif answer not in VALID_ANSWERS:
            errors.append(f"Correct Answer must be 1, 2, 3, 4 (or A, B, C, D) - got '{raw_answer}'.")
        else:
            row['correct_answer'] = answer

    elif question_type == 'true_false':
        raw_answer = (row.get('correct_answer') or '').strip()
        answer = _normalize_answer(raw_answer)
        if not raw_answer:
            missing.append('correct_answer')
        elif answer not in ('A', 'B'):
            errors.append("Correct Answer must be 1 or A (True), or 2 or B (False).")
        else:
            row['correct_answer'] = answer

    if not (row.get('explanation') or '').strip():
        missing.append('explanation')

    return errors, missing


def _build_report(rows, question_type):
    """Validate every row and return (report_data, counts)."""
    report_data = []
    counts = {'total': 0, 'valid': 0, 'incomplete': 0, 'error': 0, 'duplicate': 0}
    seen_texts = {}

    for idx, row in enumerate(rows):
        counts['total'] += 1
        clean = {key: (row.get(key) or '').strip() for key in ROW_FIELDS}
        if not clean.get('sn'):
            clean['sn'] = str(idx + 1)

        errors, missing = _analyse_row(clean, question_type)

        norm_text = clean['question'].strip().lower()
        is_duplicate = False
        duplicate_of = None
        if norm_text:
            existing = Question.objects.filter(text__iexact=clean['question']).first()
            if existing:
                is_duplicate = True
                duplicate_of = existing.question_id
            elif norm_text in seen_texts:
                is_duplicate = True
                duplicate_of = f"row {seen_texts[norm_text]}"
            else:
                seen_texts[norm_text] = idx + 1

        if is_duplicate:
            errors.append(f"Duplicate question (matches {duplicate_of}).")

        if errors:
            status = 'error'
        elif missing:
            status = 'incomplete'
        else:
            status = 'valid'

        if is_duplicate and status == 'error' and len(errors) == 1:
            status = 'duplicate'

        counts[status] += 1
        report_data.append({
            'row_index': idx + 1,
            'sn': clean['sn'],
            'status': status,
            'errors': errors,
            'missing': missing,
            'data': clean,
        })

    return report_data, counts


def _recount(report_data):
    counts = {'total': len(report_data), 'valid': 0, 'incomplete': 0, 'error': 0, 'duplicate': 0}
    for row in report_data:
        counts[row['status']] = counts.get(row['status'], 0) + 1
    return counts


def _response_payload(import_record):
    counts = _recount(import_record.report_data)
    return {
        'import_id': import_record.id,
        'topic_id': import_record.topic_id,
        'question_type': import_record.question_type,
        'difficulty': import_record.difficulty,
        'collection_id': import_record.collection_id,
        'tag_ids': list(import_record.tag_objects.values_list('id', flat=True)),
        'total_rows': counts['total'],
        'valid_rows': counts['valid'],
        'incomplete_rows': counts['incomplete'],
        'duplicate_rows': counts['duplicate'],
        'error_rows': counts['error'],
        'report_data': import_record.report_data,
    }


class QuestionImportViewSet(viewsets.ModelViewSet):
    queryset = CSVImport.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def template(self, request):
        """Download the Excel (.xlsx) import template."""
        wb = Workbook()
        ws = wb.active
        ws.title = 'Questions'
        ws.append(EXCEL_HEADERS)
        ws.append([
            1, 'नेपालको संविधान कहिले जारी भयो?', 1,
            '२०७२ असोज ३', '२०७२ भदौ ३', '२०७३ असोज ३', '२०७१ असोज ३',
            1, 'नेपालको संविधान २०७२ असोज ३ गते जारी भएको हो।', 'असोज ३ सम्झनुहोस्',
        ])
        ws.append([
            2, 'नेपालको राजधानी कुन हो?', 1,
            'पोखरा', 'काठमाडौं', 'ललितपुर', 'विराटनगर',
            2, 'नेपालको राजधानी काठमाडौं हो।', '',
        ])
        ws.append(['Remove the example rows above before importing.'])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="question_import_template.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Parse and validate a CSV/Excel file against a syllabus target chosen in the UI.

        Nothing is written to the Question table here.
        """
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=400)

        file = request.FILES['file']
        name = file.name.lower()
        is_excel = name.endswith('.xlsx') or name.endswith('.xls')
        is_csv = name.endswith('.csv')
        if not (is_excel or is_csv):
            return Response({'error': 'Please upload a valid Excel (.xlsx) or CSV file.'}, status=400)

        topic_id = request.data.get('topic')
        if not topic_id:
            return Response({'error': 'Select a topic before uploading.'}, status=400)

        try:
            topic = Topic.objects.select_related('chapter', 'chapter__subject').get(pk=topic_id)
        except (Topic.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'The selected topic no longer exists.'}, status=400)

        question_type = (request.data.get('question_type') or 'mcq').strip().lower()
        if question_type not in ('mcq', 'true_false', 'subjective', 'short_answer', 'long_answer'):
            return Response({'error': f'Unsupported question_type: {question_type}'}, status=400)

        difficulty = (request.data.get('difficulty') or 'medium').strip().lower()
        if difficulty not in ('easy', 'medium', 'hard'):
            return Response({'error': f'Unsupported difficulty: {difficulty}'}, status=400)

        collection = None
        collection_id = request.data.get('collection_id')
        if collection_id:
            try:
                collection = QuestionCollection.objects.get(pk=collection_id)
            except (QuestionCollection.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'The selected collection no longer exists.'}, status=400)

        tag_ids = request.data.getlist('tag_ids') if hasattr(request.data, 'getlist') else (request.data.get('tag_ids') or [])
        tags = list(Tag.objects.filter(pk__in=tag_ids)) if tag_ids else []

        try:
            if is_excel:
                rows, found_headers = _parse_xlsx_rows(file)
            else:
                rows, found_headers = _parse_csv_rows(file)
        except Exception as exc:
            return Response({'error': f'Failed to parse the file: {exc}'}, status=400)

        if not rows:
            return Response({'error': 'The file has no data rows.'}, status=400)

        if 'question' not in found_headers:
            return Response(
                {'error': "The file must have a 'Questions' column. Download the template for the expected format."},
                status=400,
            )

        report_data, counts = _build_report(rows, question_type)

        import_record = CSVImport.objects.create(
            admin=request.user,
            file_name=file.name,
            status='validated',
            topic=topic,
            question_type=question_type,
            difficulty=difficulty,
            collection=collection,
            total_rows=counts['total'],
            valid_rows=counts['valid'],
            duplicate_rows=counts['duplicate'],
            error_rows=counts['error'],
            report_data=report_data,
        )
        if tags:
            import_record.tag_objects.set(tags)
        return Response(_response_payload(import_record))

    @action(detail=True, methods=['post'], url_path='ai-fill')
    def ai_fill(self, request, pk=None):
        """Fill the gaps the AI can handle (options, correct answer, explanation)."""
        try:
            import_record = CSVImport.objects.select_related(
                'topic', 'topic__chapter', 'topic__chapter__subject'
            ).get(pk=pk, status='validated')
        except CSVImport.DoesNotExist:
            return Response({'error': 'Import not found or already processed.'}, status=404)

        incomplete = [r for r in import_record.report_data if r['status'] == 'incomplete']
        if not incomplete:
            return Response(_response_payload(import_record))

        needs_options = any('options' in r['missing'] or 'correct_answer' in r['missing']
                            for r in incomplete)
        needs_explanations = any('explanation' in r['missing'] for r in incomplete)

        subject = 'General'
        if import_record.topic_id:
            subject = import_record.topic.chapter.subject.name

        payload = [{
            'id': str(r['row_index']),
            'question': r['data']['question'],
            'option_a': r['data']['option_a'],
            'option_b': r['data']['option_b'],
            'option_c': r['data']['option_c'],
            'option_d': r['data']['option_d'],
        } for r in incomplete]

        generated = AdminAILogic().generate_bulk_content(
            payload, needs_options, needs_explanations, subject
        )
        if not generated:
            return Response({'error': 'The AI could not generate the missing content. Try again.'}, status=502)

        by_row = {str(item.get('id')): item for item in generated}

        for row in incomplete:
            item = by_row.get(str(row['row_index']))
            if not item:
                continue

            if 'options' in row['missing']:
                for key in ('option_a', 'option_b', 'option_c', 'option_d'):
                    if item.get(key):
                        row['data'][key] = item[key]
            if 'correct_answer' in row['missing'] and item.get('correct_answer'):
                row['data']['correct_answer'] = item['correct_answer']
            if 'explanation' in row['missing'] and item.get('explanation'):
                row['data']['explanation'] = item['explanation']

            row['ai_filled'] = list(row['missing'])
            errors, missing = _analyse_row(row['data'], import_record.question_type)
            row['errors'] = errors
            row['missing'] = missing
            row['status'] = 'error' if errors else ('incomplete' if missing else 'valid')

        counts = _recount(import_record.report_data)
        import_record.valid_rows = counts['valid']
        import_record.error_rows = counts['error']
        import_record.save(update_fields=['report_data', 'valid_rows', 'error_rows'])

        return Response(_response_payload(import_record))

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None):
        """Insert the rows that are fully valid. Incomplete and error rows are skipped."""
        try:
            import_record = CSVImport.objects.get(pk=pk, status='validated')
        except CSVImport.DoesNotExist:
            return Response({'error': 'Import not found or already processed.'}, status=404)

        if not import_record.topic_id:
            return Response({'error': 'This import has no topic attached.'}, status=400)

        questions_to_create = []
        for row in import_record.report_data:
            if row['status'] != 'valid':
                continue
            data = row['data']
            marks_raw = (data.get('marks') or '').strip()
            questions_to_create.append(Question(
                topic_id=import_record.topic_id,
                question_type=import_record.question_type,
                text=data['question'],
                option_a=data.get('option_a') or '',
                option_b=data.get('option_b') or '',
                option_c=data.get('option_c') or '',
                option_d=data.get('option_d') or '',
                correct_option=(data.get('correct_answer') or '').upper() or None,
                explanation=data.get('explanation') or '',
                hint=data.get('hint') or '',
                marks=float(marks_raw) if marks_raw else 1,
                difficulty=import_record.difficulty,
                status='approved',
            ))

        created = Question.objects.bulk_create(questions_to_create)

        # bulk_create skips Model.save(), so the Q-000001 style id is never
        # generated. Backfill it for the rows this import just created.
        for q in created:
            q.question_id = f"Q-{q.pk:06d}"
        if created:
            Question.objects.bulk_update(created, ['question_id'])

        if created and import_record.collection_id:
            import_record.collection.questions.add(*created)

        tag_list = list(import_record.tag_objects.all())
        if created and tag_list:
            for q in created:
                q.tag_objects.set(tag_list)

        import_record.status = 'imported'
        import_record.save(update_fields=['status'])

        AuditLog.objects.create(
            actor=request.user, action='CSV_IMPORT', entity_type='Question', entity_id=None,
            details={
                'import_id': import_record.id,
                'file_name': import_record.file_name,
                'imported_count': len(created),
                'topic_id': import_record.topic_id,
                'collection_id': import_record.collection_id,
            },
        )
        return Response({'success': True, 'imported_count': len(created)})

    @action(detail=True, methods=['get'], url_path='error-report')
    def error_report(self, request, pk=None):
        """Download an Excel report of only the error/duplicate rows, for correction."""
        try:
            import_record = CSVImport.objects.get(pk=pk)
        except CSVImport.DoesNotExist:
            return Response({'error': 'Import not found.'}, status=404)

        wb = Workbook()
        ws = wb.active
        ws.title = 'Errors'
        ws.append(['Row', 'SN', 'Question', 'Error'])
        for row in import_record.report_data:
            if row['status'] not in ('error', 'duplicate'):
                continue
            ws.append([
                row['row_index'], row.get('sn', ''), row['data'].get('question', ''),
                '; '.join(row['errors']),
            ])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="import_{pk}_errors.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
