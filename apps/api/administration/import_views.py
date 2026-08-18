import csv
import io
import json
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
from administration.models import CSVImport, AuditLog
from exams.models import Question, Topic

class QuestionImportViewSet(viewsets.ModelViewSet):
    queryset = CSVImport.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]
    
    # Needs a simple serializer if we were strictly REST, but since it's an internal admin tool, we can just use action endpoints.
    
    @action(detail=False, methods=['get'])
    def template(self, request):
        """Download CSV Template"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="question_import_template.csv"'
        writer = csv.writer(response)
        
        headers = [
            'question', 'subject', 'chapter', 'topic', 'question_type', 
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'explanation', 'difficulty', 'ai_generate_options'
        ]
        writer.writerow(headers)
        
        writer.writerow([
            'What is the capital of Nepal?', 'Geography', 'Cities', 'Capital Cities', 'mcq', 
            'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur',
            'A', 'Kathmandu is the capital.', 'easy', 'false'
        ])
        
        return response

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload, Parse, and Validate CSV. Does NOT insert into Question table yet.
        """
        if 'file' not in request.FILES:
            return Response({"error": "No file provided"}, status=400)
            
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "File must be a CSV"}, status=400)
            
        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return Response({"error": f"Failed to parse CSV: {str(e)}"}, status=400)
            
        total_rows = 0
        valid_rows = 0
        error_rows = 0
        duplicate_rows = 0
        
        report_data = []
        
        # Pre-fetch all topics for fast validation
        topics = Topic.objects.select_related('Chapter', 'unit__subject').all()
        topic_lookup = {}
        for t in topics:
            key = f"{t.Chapter.subject.name.lower()}|{t.Chapter.title.lower()}|{t.name.lower()}"
            topic_lookup[key] = t.id
        
        for idx, row in enumerate(reader):
            total_rows += 1
            row_errors = []
            
            q_type = row.get('question_type', '').strip().lower()
            text = row.get('question', '').strip()
            
            subject = row.get('subject', '').strip()
            chapter = row.get('chapter', '').strip()
            topic_name = row.get('topic', '').strip()
            
            topic_id = None
            if subject and chapter and topic_name:
                key = f"{subject.lower()}|{chapter.lower()}|{topic_name.lower()}"
                topic_id = topic_lookup.get(key)
                if not topic_id:
                    row_errors.append(f"Subject/Chapter/Topic combination not found in syllabus.")
            else:
                row_errors.append("Subject, chapter, and topic are required.")
                
            if not text:
                row_errors.append("Question text is required.")
            
            if q_type not in ['mcq', 'true_false', 'short_answer', 'long_answer', 'subjective']:
                row_errors.append(f"Invalid question_type: {q_type}")
                
            if q_type == 'mcq':
                if not row.get('option_a') or not row.get('option_b') or not row.get('option_c') or not row.get('option_d'):
                    row_errors.append("MCQ requires option_a, option_b, option_c, option_d.")
                if row.get('correct_answer') not in ['A', 'B', 'C', 'D']:
                    row_errors.append("MCQ requires correct_answer (A, B, C, or D).")
                    
            # Check for duplicate
            is_duplicate = False
            if text and Question.objects.filter(text__iexact=text).exists():
                row_errors.append("Possible duplicate question text.")
                is_duplicate = True
                
            status = 'valid'
            if row_errors:
                if is_duplicate and len(row_errors) == 1:
                    status = 'duplicate'
                    duplicate_rows += 1
                else:
                    status = 'error'
                    error_rows += 1
            else:
                valid_rows += 1
                
            # Add topic_id to row data for commit phase
            if topic_id:
                row['resolved_topic_id'] = topic_id
                
            report_data.append({
                "row_index": idx + 1, # 1-based index
                "status": status,
                "errors": row_errors,
                "data": row
            })
            
        import_record = CSVImport.objects.create(
            admin=request.user,
            file_name=file.name,
            status='validated',
            total_rows=total_rows,
            valid_rows=valid_rows,
            duplicate_rows=duplicate_rows,
            error_rows=error_rows,
            report_data=report_data
        )
        
        return Response({
            "import_id": import_record.id,
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "duplicate_rows": duplicate_rows,
            "error_rows": error_rows,
            "report_data": report_data
        })

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None):
        """
        Commit a validated CSVImport to the Database.
        """
        try:
            import_record = CSVImport.objects.get(pk=pk, status='validated')
        except CSVImport.DoesNotExist:
            return Response({"error": "Import not found or already processed."}, status=404)
            
        questions_to_create = []
        
        for row_info in import_record.report_data:
            if row_info['status'] == 'valid': # We only import fully valid rows. We skip duplicates/errors.
                data = row_info['data']
                q = Question(
                    topic_id=int(data['resolved_topic_id']),
                    question_type=data.get('question_type', 'mcq'),
                    text=data['question'],
                    option_a=data.get('option_a'),
                    option_b=data.get('option_b'),
                    option_c=data.get('option_c'),
                    option_d=data.get('option_d'),
                    correct_option=data.get('correct_answer'),
                    difficulty=data.get('difficulty', 'medium'),
                    explanation=data.get('explanation', ''),
                    ai_generate_options=str(data.get('ai_generate_options', '')).lower() == 'true',
                    status='published' # Auto publish on import for now
                )
                questions_to_create.append(q)
                
        Question.objects.bulk_create(questions_to_create)
        
        # After bulk create, question_ids are not generated because save() isn't called on bulk_create.
        # So we have to populate them manually here for the new ones.
        missing_ids = Question.objects.filter(question_id__isnull=True)
        for q in missing_ids:
            q.question_id = f"Q-{q.pk:06d}"
            
        Question.objects.bulk_update(missing_ids, ['question_id'])
        
        import_record.status = 'imported'
        import_record.save()
        
        AuditLog.objects.create(
            actor=request.user, action='CSV_IMPORT', entity_type='Question', entity_id=None,
            details={"import_id": import_record.id, "file_name": import_record.file_name, "imported_count": len(questions_to_create)}
        )
        
        return Response({"success": True, "imported_count": len(questions_to_create)})
