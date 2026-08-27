import csv
import io
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
from administration.models import CSVImport, AuditLog
from exams.models import Question, Topic
from ai_tutor.services import AdminAILogic

# The CSV carries question content only. Syllabus placement, question type and
# difficulty are chosen once in the UI and applied to every row, so the file
# stays simple and an admin cannot mistype a subject or chapter name.
CSV_COLUMNS = [
    'question', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'explanation',
]

VALID_ANSWERS = ['A', 'B', 'C', 'D']


def _analyse_row(row, question_type):
    """Split a row's problems into hard errors and AI-fillable gaps.

    Errors mean the row can never be imported. Missing fields are gaps the AI
    can fill, so those rows are held as 'incomplete' rather than rejected.
    """
    errors = []
    missing = []

    text = (row.get('question') or '').strip()
    if not text:
        errors.append('Question text is required.')

    if question_type == 'mcq':
        blanks = [k for k in ('option_a', 'option_b', 'option_c', 'option_d')
                  if not (row.get(k) or '').strip()]
        if blanks:
            missing.append('options')

        answer = (row.get('correct_answer') or '').strip().upper()
        if not answer:
            missing.append('correct_answer')
        elif answer not in VALID_ANSWERS:
            errors.append(f"correct_answer must be one of A, B, C, D (got '{answer}').")

    elif question_type == 'true_false':
        answer = (row.get('correct_answer') or '').strip().upper()
        if not answer:
            missing.append('correct_answer')
        elif answer not in ('A', 'B'):
            errors.append("correct_answer must be A (True) or B (False).")

    if not (row.get('explanation') or '').strip():
        missing.append('explanation')

    return errors, missing


def _build_report(rows, question_type):
    """Validate every row and return (report_data, counts)."""
    report_data = []
    counts = {'total': 0, 'valid': 0, 'incomplete': 0, 'error': 0, 'duplicate': 0}

    for idx, row in enumerate(rows):
        counts['total'] += 1
        clean = {key: (row.get(key) or '').strip() for key in CSV_COLUMNS}

        errors, missing = _analyse_row(clean, question_type)

        is_duplicate = bool(clean['question']) and Question.objects.filter(
            text__iexact=clean['question']
        ).exists()
        if is_duplicate:
            errors.append('A question with this text already exists.')

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
        """Download the CSV template (question content only)."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="question_import_template.csv"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'

        writer = csv.writer(response)
        writer.writerow(CSV_COLUMNS)
        writer.writerow([
            'What is the capital of Nepal?',
            'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur',
            'A', 'Kathmandu is the capital of Nepal.',
        ])
        # Second example: blanks the AI can fill in later.
        writer.writerow([
            'Which river is the longest in Nepal?', '', '', '', '', '', '',
        ])
        return response

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Parse and validate a CSV against a syllabus target chosen in the UI.

        Nothing is written to the Question table here.
        """
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=400)

        file = request.FILES['file']
        if not file.name.lower().endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=400)

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

        try:
            decoded = file.read().decode('utf-8-sig')
            rows = list(csv.DictReader(io.StringIO(decoded)))
        except Exception as exc:
            return Response({'error': f'Failed to parse CSV: {exc}'}, status=400)

        if not rows:
            return Response({'error': 'The CSV has no data rows.'}, status=400)

        if 'question' not in (rows[0].keys()):
            return Response(
                {'error': "The CSV must have a 'question' column. Download the template for the expected format."},
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
            total_rows=counts['total'],
            valid_rows=counts['valid'],
            duplicate_rows=counts['duplicate'],
            error_rows=counts['error'],
            report_data=report_data,
        )
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

        import_record.status = 'imported'
        import_record.save(update_fields=['status'])

        AuditLog.objects.create(
            actor=request.user, action='CSV_IMPORT', entity_type='Question', entity_id=None,
            details={
                'import_id': import_record.id,
                'file_name': import_record.file_name,
                'imported_count': len(created),
                'topic_id': import_record.topic_id,
            },
        )
        return Response({'success': True, 'imported_count': len(created)})
