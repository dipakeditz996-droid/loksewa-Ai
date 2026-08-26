import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from exams.models import (
    ModelExam, 
    Examination, 
    ExaminationQuestion, 
    ModelExamAttempt, 
    ExaminationAttempt,
    ModelExamAttemptAnswer,
    StudentAnswer,
    LegacyModelExamMigration
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely migrate legacy ModelExam architecture to canonical Examination architecture.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run the migration without saving any changes to the database.',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Execute the migration and commit changes to the database.',
        )

    def handle(self, *args, **options):
        is_dry_run = options['dry_run']
        is_confirm = options['confirm']

        if not is_dry_run and not is_confirm:
            self.stdout.write(self.style.ERROR('You must specify either --dry-run or --confirm.'))
            sys.exit(1)
            
        if is_dry_run and is_confirm:
            self.stdout.write(self.style.ERROR('You cannot specify both --dry-run and --confirm.'))
            sys.exit(1)

        self.stdout.write("LoksewaAI Mock Exam Migration")
        self.stdout.write("=============================\n")
        
        if is_dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — NO DATABASE CHANGES\n"))

        model_exams = ModelExam.objects.all()
        total_model_exams = model_exams.count()
        
        migratable_exams = 0
        already_migrated_exams = 0
        review_required_exams = 0
        
        total_attempts = ModelExamAttempt.objects.count()
        migratable_attempts = 0
        skipped_attempts = 0
        
        total_answers = ModelExamAttemptAnswer.objects.count()
        migratable_answers = 0
        skipped_answers = 0
        
        potential_issues = []

        # Find a suitable creator for migrated exams (superuser)
        # Using the first superuser or a fallback ID.
        migration_user = User.objects.filter(is_superuser=True).first()
        if not migration_user:
            migration_user = User.objects.first()

        try:
            with transaction.atomic():
                for model_exam in model_exams:
                    # Check idempotency
                    migration_record = LegacyModelExamMigration.objects.filter(legacy_model_exam=model_exam).first()
                    
                    if migration_record:
                        already_migrated_exams += 1
                        continue

                    if not migration_user:
                        review_required_exams += 1
                        potential_issues.append(f"ModelExam {model_exam.id}: No suitable creator user found.")
                        continue

                    # Validate FKs
                    if not model_exam.exam:
                        review_required_exams += 1
                        potential_issues.append(f"ModelExam {model_exam.id}: Missing related exam.")
                        continue

                    category = model_exam.exam.category
                    if not category:
                        review_required_exams += 1
                        potential_issues.append(f"ModelExam {model_exam.id}: Missing related category.")
                        continue

                    # Map Fields
                    migratable_exams += 1
                    
                    # Status mapping
                    status_map = {
                        'draft': 'draft',
                        'published': 'published',
                        'archived': 'archived'
                    }
                    new_status = status_map.get(model_exam.status, 'draft')

                    # Create Examination
                    examination = Examination(
                        title=model_exam.title,
                        description=model_exam.description,
                        exam_type='mock', # Explicit mapping to mock
                        category=category,
                        exam=model_exam.exam,
                        subject=None, # Subject is generally null for full exams
                        instructions=model_exam.description, # Use description as instructions if missing
                        time_limit=model_exam.duration_minutes,
                        total_questions=model_exam.total_questions,
                        total_marks=model_exam.total_marks,
                        passing_marks=model_exam.passing_marks,
                        negative_marking=bool(model_exam.negative_marking and model_exam.negative_marking > 0),
                        negative_marking_value=model_exam.negative_marking if model_exam.negative_marking else 0.0,
                        status=new_status,
                        created_by=migration_user,
                        # Other defaults
                        max_attempts=0, # Unlimited
                        allow_resume=True,
                        auto_submit=True,
                        result_visibility='immediate',
                        show_correct_answers=True,
                    )
                    
                    if not is_dry_run:
                        examination.save()
                        # Record migration
                        LegacyModelExamMigration.objects.create(
                            legacy_model_exam=model_exam,
                            examination=examination
                        )
                        
                    # Map Questions
                    questions = model_exam.questions.all().order_by('id')
                    
                    marks_per_question = 1.0
                    if model_exam.total_questions > 0 and model_exam.total_marks:
                        marks_per_question = model_exam.total_marks / model_exam.total_questions
                        
                    seen_questions = set()
                    
                    for idx, question in enumerate(questions):
                        if question.id in seen_questions:
                            potential_issues.append(f"ModelExam {model_exam.id}: Duplicate Question {question.id} found.")
                            continue
                        seen_questions.add(question.id)
                        
                        if not is_dry_run:
                            ExaminationQuestion.objects.create(
                                examination=examination,
                                question=question,
                                order=idx + 1,
                                marks=marks_per_question
                            )

                    # Map Attempts
                    attempts = model_exam.attempts.all().order_by('id')
                    for attempt in attempts:
                        migratable_attempts += 1
                        
                        percentage = 0.0
                        if model_exam.total_marks and model_exam.total_marks > 0:
                            percentage = (attempt.score / model_exam.total_marks) * 100
                            
                        if not is_dry_run:
                            exam_attempt = ExaminationAttempt.objects.create(
                                examination=examination,
                                student=attempt.student,
                                started_at=attempt.started_at,
                                submitted_at=attempt.submitted_at,
                                status=attempt.status,
                                score=attempt.score,
                                percentage=percentage,
                                passed=(attempt.score >= model_exam.passing_marks) if model_exam.passing_marks else False,
                                time_taken_seconds=attempt.time_taken_seconds
                            )
                            
                            # Map Answers
                            answers = attempt.answers.all().order_by('id')
                            for answer in answers:
                                migratable_answers += 1
                                
                                marks_awarded = marks_per_question if answer.is_correct else 0.0
                                if not answer.is_correct and model_exam.negative_marking:
                                    marks_awarded = -(model_exam.negative_marking)
                                
                                StudentAnswer.objects.create(
                                    attempt=exam_attempt,
                                    question=answer.question,
                                    selected_option=answer.selected_option,
                                    is_correct=answer.is_correct,
                                    marks_awarded=marks_awarded
                                )
                        else:
                            # In dry-run, we just count them
                            migratable_answers += attempt.answers.count()

                if is_dry_run:
                    # Rollback the transaction to be absolutely safe, even though we guarded writes with `not is_dry_run`
                    transaction.set_rollback(True)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Migration aborted due to error: {e}"))
            if is_dry_run:
                transaction.set_rollback(True)
            return

        self.stdout.write("ModelExam")
        self.stdout.write("---------")
        self.stdout.write(f"Found: {total_model_exams}")
        self.stdout.write(f"Migratable: {migratable_exams}")
        self.stdout.write(f"Already migrated: {already_migrated_exams}")
        self.stdout.write(f"Review required: {review_required_exams}\n")

        self.stdout.write("Attempts")
        self.stdout.write("--------")
        self.stdout.write(f"Found: {total_attempts}")
        self.stdout.write(f"Migratable: {migratable_attempts}")
        self.stdout.write(f"Skipped: {skipped_attempts}\n")

        self.stdout.write("Answers")
        self.stdout.write("-------")
        self.stdout.write(f"Found: {total_answers}")
        self.stdout.write(f"Migratable: {migratable_answers}")
        self.stdout.write(f"Skipped: {skipped_answers}\n")

        self.stdout.write("Potential issues:")
        if not potential_issues:
            self.stdout.write("None\n")
        else:
            for issue in potential_issues:
                self.stdout.write(f"- {issue}")
            self.stdout.write("")

        if is_dry_run:
            self.stdout.write(self.style.WARNING("NO DATABASE CHANGES WERE MADE."))
        else:
            self.stdout.write(self.style.SUCCESS("MIGRATION COMPLETED SUCCESSFULLY."))
