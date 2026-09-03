import sys
from django.core.management.base import BaseCommand
from django.db import transaction

from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from courses.models import Course
from subscriptions.models import SubscriptionPlan
from marketplace.models import Product

class Command(BaseCommand):
    help = 'Safely identifies and cleans up development placeholder data (Dry-Run Only)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run to identify safe/unsafe records without modifying the database.'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (Currently disabled in this phase)'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run')
        confirm = options.get('confirm')

        if confirm:
            self.stdout.write(self.style.ERROR("ERROR: --confirm is not implemented yet. Safety dry-run only."))
            sys.exit(1)

        if not dry_run:
            self.stdout.write(self.style.ERROR("ERROR: You must specify --dry-run. Actual deletion is not supported in this phase."))
            sys.exit(1)
            
        self.stdout.write("LoksewaAI Development Data Cleanup")
        self.stdout.write("===================================")
        self.stdout.write("DRY RUN — NO DATABASE CHANGES WILL BE MADE\n")
        self.stdout.write("Candidates found:\n")

        # TARGETS = {ModelName: (ModelClass, NameField, [Exact Names])}
        TARGETS = {
            'ExamCategory': (ExamCategory, 'name', ["[DEV] Kharidar Preparation"]),
            'Exam': (Exam, 'name', ["[DEV] Kharidar First Paper"]),
            'Paper': (Paper, 'name', ["[DEV] General Knowledge and Basic Office Skills Test"]),
            'Subject': (Subject, 'name', ["[DEV] General Knowledge"]),
            'Chapter': (Chapter, 'title', ["[DEV] Geography of Nepal"]),
            'Topic': (Topic, 'name', ["[DEV] Rivers and Lakes", "[DEV] Mountains"]),
            'Course': (Course, 'title', ["[DEV] Kharidar Complete Course"]),
            'Product': (Product, 'title', ["[DEV] Kharidar Complete Course"]),
            'SubscriptionPlan': (SubscriptionPlan, 'name', ["[DEV] Basic Monthly Plan"]),
        }

        # Dependencies to check. If any of these reverse relations have count > 0, it is UNSAFE.
        DEPENDENCIES = {
            'ExamCategory': ['exams', 'question_sets', 'examinations', 'examinationeligibility_set', 'targeted_students'],
            'Exam': ['papers', 'legacy_subjects', 'question_sets', 'practicesession_set', 'model_exams', 'subjective_practice_sets', 'subjective_model_exams', 'examinations', 'examinationeligibility_set', 'materials', 'marketplace_products', 'study_plan_templates', 'study_plans', 'targeted_students', 'courses'],
            'Paper': ['subjects'],
            'Subject': ['chapters', 'question_sets', 'practicesession_set', 'subjective_practice_sets', 'examinations', 'materials', 'study_tasks'],
            'Chapter': ['topics', 'question_sets'],
            'Topic': ['user_progress', 'questions', 'question_sets', 'practicesession_set', 'subjective_practice_sets', 'materials', 'study_tasks'],
            # 'marketplace_products' was dropped: Product.course was removed in
            # the physical-marketplace refactor, so Course no longer has that
            # reverse relation at all - checking it here would silently no-op
            # via the getattr(..., None) fallback below and always read as safe.
            'Course': ['subscription_plans', 'enrollments', 'applications', 'teachers'],
            'Product': ['payment_submissions', 'purchases'],
            'SubscriptionPlan': ['subscriptions', 'subscription_payments'],
        }

        total_safe = 0
        total_unsafe = 0
        total_skipped = 0

        # We will wrap in atomic block just in case to guarantee nothing gets modified
        with transaction.atomic():
            for model_name, (model_class, field_name, exact_names) in TARGETS.items():
                self.stdout.write(f"\n{model_name}")
                safe_count = 0
                unsafe_count = 0
                
                # Use strictly in list exact match
                kwargs = {f"{field_name}__in": exact_names}
                candidates = model_class.objects.filter(**kwargs)
                
                for candidate in candidates:
                    is_safe = True
                    unsafe_reasons = []
                    
                    # Check dependencies
                    deps = DEPENDENCIES.get(model_name, [])
                    for dep in deps:
                        try:
                            rel_manager = getattr(candidate, dep, None)
                            if rel_manager is not None:
                                count = rel_manager.count()
                                if count > 0:
                                    is_safe = False
                                    unsafe_reasons.append(f"{dep} ({count})")
                        except Exception as e:
                            is_safe = False
                            unsafe_reasons.append(f"Error checking {dep}: {str(e)}")

                    name_val = getattr(candidate, field_name)
                    if is_safe:
                        safe_count += 1
                        total_safe += 1
                        self.stdout.write(self.style.SUCCESS(f"  Model: {model_name} | ID: {candidate.id} | {field_name.capitalize()}: {name_val} | Status: SAFE"))
                    else:
                        unsafe_count += 1
                        total_unsafe += 1
                        reasons_str = ", ".join(unsafe_reasons)
                        self.stdout.write(self.style.ERROR(f"  Model: {model_name} | ID: {candidate.id} | {field_name.capitalize()}: {name_val} | Status: UNSAFE | Reason: {reasons_str}"))

                self.stdout.write(f"  SAFE: {safe_count}")
                self.stdout.write(f"  UNSAFE: {unsafe_count}")
                
            transaction.set_rollback(True) # Ensure absolutely no changes persist if anything happened

        self.stdout.write("\n-----------------------------------")
        self.stdout.write("\nTOTAL")
        self.stdout.write(f"\nSafe:\n{total_safe}")
        self.stdout.write(f"\nUnsafe:\n{total_unsafe}")
        self.stdout.write(f"\nSkipped:\n{total_skipped}")
        self.stdout.write("\nNo records were deleted.\n")
