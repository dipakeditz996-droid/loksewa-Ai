import io
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from administration.models import CSVImport, AuditLog
from administration.permissions import IsTeacher
from core.models import Tag
from core.notification_service import NotificationService
from exams.models import Question, Subject, Chapter, Topic, QuestionCollection
from exams.services.question_import_service import (
    ALL_TYPES,
    SUBJECTIVE_TYPES,
    OBJECTIVE_TYPES,
    _parse_xlsx_rows,
    _parse_csv_rows,
    _build_report,
    _recount,
    _existing_question_ids,
    generate_excel_template,
    get_teacher_authorized_hierarchy,
    verify_teacher_subject_authorization,
)


def _teacher_response_payload(import_record):
    counts = _recount(import_record.report_data)
    subject_data = None
    if import_record.subject:
        subject_data = {
            'id': import_record.subject.id,
            'name': import_record.subject.name,
            'code': import_record.subject.code,
        }
    chapter_data = None
    if import_record.chapter:
        chapter_data = {
            'id': import_record.chapter.id,
            'name': import_record.chapter.title,
        }
    topic_data = None
    if import_record.topic:
        topic_data = {
            'id': import_record.topic.id,
            'name': import_record.topic.name,
        }

    return {
        'import_id': import_record.id,
        'file_name': import_record.file_name,
        'status': import_record.status,
        'subject': subject_data,
        'chapter': chapter_data,
        'topic': topic_data,
        'question_type': import_record.question_type,
        'difficulty': import_record.difficulty,
        'total_rows': counts['total'],
        'valid_rows': counts['valid'],
        'duplicate_rows': counts['duplicate'],
        'error_rows': counts['error'],
        'report_data': import_record.report_data,
        'created_at': import_record.created_at,
    }


class TeacherQuestionImportViewSet(viewsets.GenericViewSet):
    """
    Teacher Question Bank Excel Bulk Import Pipeline.

    Workflow:
      1. Teacher loads authorized academic hierarchy (/hierarchy/).
      2. Teacher downloads Excel template (/template/?type=mcq).
      3. Teacher uploads Excel file with academic context (/upload/).
         - Validates teacher's assigned course/subject authorization.
         - Parses file and performs row-level validation.
         - Detects duplicates in-file and against existing Question records.
         - Explanation and Hint are strictly optional.
         - Returns detailed preview report without inserting into Question bank.
      4. Teacher reviews preview and submits for Admin Review (/commit/).
         - Atomically creates Question records with status='pending_review'
         - Derives teacher attribution strictly from request.user (created_by=request.user)
         - Notifies Admins and Teacher.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return CSVImport.objects.none()
        return CSVImport.objects.filter(admin=user).select_related(
            'subject', 'chapter', 'topic'
        ).order_by('-created_at')

    def list(self, request):
        """List recent upload batches by this teacher."""
        imports = self.get_queryset()[:20]
        data = []
        for imp in imports:
            counts = _recount(imp.report_data) if imp.report_data else {
                'total': imp.total_rows,
                'valid': imp.valid_rows,
                'duplicate': imp.duplicate_rows,
                'error': imp.error_rows,
            }
            data.append({
                'id': imp.id,
                'file_name': imp.file_name,
                'status': imp.status,
                'subject_name': imp.subject.name if imp.subject else '',
                'chapter_title': imp.chapter.title if imp.chapter else '',
                'topic_name': imp.topic.name if imp.topic else '',
                'total_rows': counts['total'],
                'valid_rows': counts['valid'],
                'duplicate_rows': counts['duplicate'],
                'error_rows': counts['error'],
                'created_at': imp.created_at,
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def template(self, request):
        """Download the Excel (.xlsx) import template matching Admin format."""
        qtype = (request.query_params.get('type') or 'mcq').strip().lower()
        if qtype in SUBJECTIVE_TYPES:
            qtype = 'subjective'
        if qtype not in ('mcq', 'true_false', 'subjective'):
            return Response({'error': f'Unsupported template type: {qtype}'}, status=400)

        buf, title = generate_excel_template(qtype)
        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{title}.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """
        Fast bulk endpoint providing the academic hierarchy scoped to the teacher's assigned courses.
        Avoids multiple slow waterfall API requests.
        """
        tree_data = get_teacher_authorized_hierarchy(request.user)
        return Response(tree_data)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Parse and validate an uploaded Excel spreadsheet against teacher's authorized subject.
        No Question records are created at this step.
        """
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided.'}, status=400)

        file = request.FILES['file']
        name = file.name.lower()
        is_excel = name.endswith('.xlsx') or name.endswith('.xls')
        is_csv = name.endswith('.csv')
        if not (is_excel or is_csv):
            return Response({'error': 'Please upload a valid Excel (.xlsx, .xls) file.'}, status=400)

        # 1. Subject validation (Required)
        subject_id = request.data.get('subject_id') or request.data.get('subject')
        if not subject_id:
            return Response({'error': 'Please select a Subject before uploading.'}, status=400)

        is_authorized, subject_or_err = verify_teacher_subject_authorization(request.user, subject_id)
        if not is_authorized:
            return Response({'error': subject_or_err}, status=403)
        subject = subject_or_err

        # 2. Chapter / Topic (Optional)
        chapter = None
        chapter_id = request.data.get('chapter_id') or request.data.get('chapter')
        if chapter_id:
            try:
                chapter = Chapter.objects.get(pk=chapter_id, subject=subject)
            except (Chapter.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Selected chapter does not belong to the chosen subject.'}, status=400)

        topic = None
        topic_id = request.data.get('topic_id') or request.data.get('topic')
        if topic_id:
            try:
                topic = Topic.objects.select_related('chapter').get(pk=topic_id)
                if chapter and topic.chapter_id != chapter.id:
                    return Response({'error': 'Selected topic does not belong to the chosen chapter.'}, status=400)
                if topic.chapter.subject_id != subject.id:
                    return Response({'error': 'Selected topic does not belong to the chosen subject.'}, status=400)
                if not chapter:
                    chapter = topic.chapter
            except (Topic.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Selected topic does not exist.'}, status=400)

        # 3. Question type & difficulty
        question_type = (request.data.get('question_type') or 'mcq').strip().lower()
        if question_type not in ALL_TYPES:
            return Response({'error': f'Unsupported question type: {question_type}'}, status=400)

        difficulty = (request.data.get('difficulty') or 'medium').strip().lower()
        if difficulty not in ('easy', 'medium', 'hard'):
            return Response({'error': f'Unsupported difficulty: {difficulty}'}, status=400)

        # 4. Parse file rows
        try:
            if is_excel:
                rows, found_headers = _parse_xlsx_rows(file)
            else:
                rows, found_headers = _parse_csv_rows(file)
        except Exception as exc:
            return Response({'error': f'Failed to parse the file: {exc}'}, status=400)

        if not rows:
            return Response({'error': 'The file contains no data rows.'}, status=400)

        if 'question' not in found_headers:
            return Response(
                {'error': "The file must have a 'Questions' column. Download the template for the expected format."},
                status=400,
            )

        # Guard against template mismatch
        if question_type in SUBJECTIVE_TYPES and 'model_answer' not in found_headers:
            return Response(
                {'error': "This file has no 'Model Answer' column. Subjective questions need the Subjective template."},
                status=400,
            )
        if question_type in OBJECTIVE_TYPES and 'model_answer' in found_headers and 'correct_answer' not in found_headers:
            return Response(
                {'error': "This file has a 'Model Answer' column and no 'Correct Answer'. Choose Question Type = Subjective or download Objective template."},
                status=400,
            )

        # 5. Build validation report with allow_blank_explanation=True and require_mcq_fields=True
        report_data, counts = _build_report(
            rows,
            question_type,
            allow_blank_explanation=True,
            require_mcq_fields=True,
        )

        import_record = CSVImport.objects.create(
            admin=request.user,
            file_name=file.name,
            status='validated',
            subject=subject,
            chapter=chapter,
            topic=topic,
            question_type=question_type,
            difficulty=difficulty,
            total_rows=counts['total'],
            valid_rows=counts['valid'],
            duplicate_rows=counts['duplicate'],
            error_rows=counts['error'],
            report_data=report_data,
        )

        return Response(_teacher_response_payload(import_record))

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None):
        """
        Atomically import valid questions into the Teacher Question Review workflow.
        Created questions enter status='pending_review' with created_by=request.user.
        """
        try:
            import_record = CSVImport.objects.select_related('subject', 'chapter', 'topic').get(
                pk=pk, status='validated'
            )
        except CSVImport.DoesNotExist:
            return Response({'error': 'Import not found or already submitted.'}, status=404)

        if import_record.admin != request.user:
            return Response({'error': 'You do not have permission to commit this import.'}, status=403)

        if not import_record.subject_id:
            return Response({'error': 'This import has no subject attached.'}, status=400)

        # Re-verify teacher subject authorization
        is_authorized, _ = verify_teacher_subject_authorization(request.user, import_record.subject_id)
        if not is_authorized:
            return Response({'error': 'You are no longer authorized for this subject.'}, status=403)

        valid_rows = [r for r in import_record.report_data if r['status'] == 'valid']
        if not valid_rows:
            return Response({'error': 'No valid questions to submit. Please correct errors and re-upload.'}, status=400)

        # Re-check database duplicates at commit time to prevent race conditions
        existing_ids = _existing_question_ids(
            r['data']['question'].strip().lower() for r in valid_rows
        )

        is_subjective = import_record.question_type in SUBJECTIVE_TYPES
        questions_to_create = []
        skipped_duplicates = []

        now = timezone.now()

        for row in valid_rows:
            data = row['data']
            lowered = data['question'].strip().lower()
            if lowered in existing_ids:
                skipped_duplicates.append({
                    'row_index': row['row_index'],
                    'existing_question_id': existing_ids[lowered]['code'],
                    'existing_id': existing_ids[lowered]['id'],
                })
                continue

            marks_raw = (data.get('marks') or '').strip()
            try:
                marks_val = float(marks_raw) if marks_raw else 1.0
            except ValueError:
                marks_val = 1.0

            questions_to_create.append(Question(
                subject_id=import_record.subject_id,
                chapter_id=import_record.chapter_id,
                topic_id=import_record.topic_id,
                question_type=import_record.question_type,
                text=data['question'],
                option_a='' if is_subjective else (data.get('option_a') or ''),
                option_b='' if is_subjective else (data.get('option_b') or ''),
                option_c='' if is_subjective else (data.get('option_c') or ''),
                option_d='' if is_subjective else (data.get('option_d') or ''),
                correct_option=None if is_subjective else ((data.get('correct_answer') or '').upper() or None),
                model_answer=(data.get('model_answer') or '') if is_subjective else '',
                explanation=data.get('explanation') or '',
                hint=data.get('hint') or '',
                marks=marks_val,
                difficulty=import_record.difficulty,
                # Enforce Teacher Workflow:
                status='pending_review',
                submitted_at=now,
                created_by=request.user,
            ))

        if not questions_to_create:
            return Response({
                'error': 'All valid rows were duplicates of existing questions in the database.',
                'skipped_duplicates': skipped_duplicates,
            }, status=400)

        with transaction.atomic():
            created = Question.objects.bulk_create(questions_to_create)

            # Generate Q-000001 style permanent unique question IDs
            for q in created:
                q.question_id = f"Q-{q.pk:06d}"
            if created:
                Question.objects.bulk_update(created, ['question_id'])

            import_record.status = 'imported'
            import_record.save(update_fields=['status'])

            AuditLog.objects.create(
                actor=request.user,
                action='TEACHER_EXCEL_IMPORT',
                entity_type='Question',
                entity_id=None,
                details={
                    'import_id': import_record.id,
                    'file_name': import_record.file_name,
                    'imported_count': len(created),
                    'subject_id': import_record.subject_id,
                    'chapter_id': import_record.chapter_id,
                    'topic_id': import_record.topic_id,
                    'status': 'pending_review',
                    'skipped_duplicates_count': len(skipped_duplicates),
                },
            )

        # Notifications
        try:
            # Notify teacher
            NotificationService.notify_question_review(
                teacher=request.user,
                question_title=f"{len(created)} questions ({import_record.file_name})",
                status='submitted for Admin review',
                action_url='/teacher/questions',
            )
            # Notify admins
            teacher_name = request.user.get_full_name() or request.user.username
            NotificationService.notify_admins(
                notif_type='question_review',
                title='Teacher Questions Submitted for Review',
                message=f"{teacher_name} submitted {len(created)} questions via Excel for review in '{import_record.subject.name}'.",
                action_url='/admin-dashboard/academic/questions',
            )
        except Exception:
            pass

        return Response({
            'success': True,
            'imported_count': len(created),
            'status': 'pending_review',
            'question_ids': [q.pk for q in created],
            'skipped_duplicates': skipped_duplicates,
            'message': f"Successfully submitted {len(created)} questions for Admin review.",
        })

    @action(detail=True, methods=['get'], url_path='error-report')
    def error_report(self, request, pk=None):
        """Download an Excel report of only the error/duplicate rows for correction."""
        try:
            import_record = CSVImport.objects.get(pk=pk, admin=request.user)
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
        response['Content-Disposition'] = f'attachment; filename="teacher_import_{pk}_errors.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
