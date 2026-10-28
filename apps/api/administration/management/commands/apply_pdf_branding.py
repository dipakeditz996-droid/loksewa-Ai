import logging
from django.core.management.base import BaseCommand
from administration.models import PdfBrandingBatchJob, PdfBrandingSetting
from administration.pdf_branding_service import PdfBrandingService
from notes.models import StudyMaterial

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Applies configured PDF branding and watermarking to study materials in bulk."

    def add_arguments(self, parser):
        parser.add_argument(
            '--job-id',
            type=int,
            help="Run a specific existing PdfBrandingBatchJob by ID.",
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help="Apply branding to all eligible materials without an existing job.",
        )
        parser.add_argument(
            '--reprocess-all',
            action='store_true',
            help="Regenerate all branded files from pristine originals using latest settings.",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simulate the branding run and display affected counts without writing files.",
        )

    def handle(self, *args, **options):
        job_id = options.get('job_id')
        run_all = options.get('all')
        reprocess_all = options.get('reprocess_all')
        dry_run = options.get('dry_run')

        if dry_run:
            action = 'reprocess_all' if reprocess_all else 'all_eligible'
            preview = PdfBrandingService.preview_bulk_operation(action=action)
            self.stdout.write(self.style.SUCCESS(
                f"[DRY RUN] Affected PDFs: {preview['affected_count']}, Excluded: {preview['excluded_count']}"
            ))
            for item in preview['sample_affected'][:10]:
                self.stdout.write(f"  - #{item['id']}: {item['title']} ({item['current_status']})")
            return

        if job_id:
            self.stdout.write(f"Executing PdfBrandingBatchJob #{job_id}...")
            job = PdfBrandingService.execute_batch_job(job_id)
            if job:
                self.stdout.write(self.style.SUCCESS(
                    f"Job #{job.id} finished: {job.success_count} succeeded, {job.failed_count} failed, {job.skipped_count} skipped."
                ))
            return

        if run_all or reprocess_all:
            action = 'reprocess_all' if reprocess_all else 'all_eligible'
            preview = PdfBrandingService.preview_bulk_operation(action=action)
            target_ids = [item['id'] for item in preview['sample_affected']]

            if not target_ids:
                self.stdout.write(self.style.WARNING("No eligible PDFs found to brand."))
                return

            self.stdout.write(f"Starting bulk branding for {len(target_ids)} documents...")
            job = PdfBrandingBatchJob.objects.create(
                status='pending',
                operation=action,
                total_files=len(target_ids),
                file_ids=target_ids,
            )
            PdfBrandingService.execute_batch_job(job.id, batch_size=25)
            job.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(
                f"Completed: {job.success_count} branded, {job.failed_count} failed."
            ))
            return

        self.stdout.write(self.style.NOTICE("Please specify --all, --reprocess-all, --dry-run, or --job-id <ID>."))
