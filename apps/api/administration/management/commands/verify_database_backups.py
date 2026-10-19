from django.core.management.base import BaseCommand
from administration.models import DatabaseBackup
from administration.backup_service import BackupService


class Command(BaseCommand):
    help = "Verifies integrity and checksums of database backups on local disk and Cloudflare R2."

    def add_arguments(self, parser):
        parser.add_argument(
            '--id',
            type=int,
            default=None,
            help="Specific backup ID to verify (default: verify all recent backups)",
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=20,
            help="Number of recent backups to audit (default: 20)",
        )

    def handle(self, *args, **options):
        backup_id = options['id']
        limit = options['limit']

        if backup_id:
            backups = DatabaseBackup.objects.filter(pk=backup_id)
            if not backups.exists():
                self.stderr.write(self.style.ERROR(f"Backup with ID {backup_id} not found."))
                return
        else:
            backups = DatabaseBackup.objects.all().order_by('-created_at')[:limit]

        self.stdout.write(f"Auditing {len(backups)} database backup(s)...")
        self.stdout.write("-" * 80)
        self.stdout.write(f"{'ID':<6} {'Name':<35} {'Type':<12} {'Storage':<15} {'Status':<10}")
        self.stdout.write("-" * 80)

        verified_count = 0
        failed_count = 0

        for b in backups:
            is_valid = BackupService.verify_backup(b)
            status_text = "VERIFIED" if is_valid else b.status.upper()
            style = self.style.SUCCESS if is_valid else self.style.ERROR

            if is_valid:
                verified_count += 1
            else:
                failed_count += 1

            self.stdout.write(
                f"{b.id:<6} {b.name[:33]:<35} {b.backup_type:<12} {b.storage_backend:<15} "
                + style(status_text)
            )

        self.stdout.write("-" * 80)
        self.stdout.write(
            self.style.SUCCESS(f"Audit completed: {verified_count} verified, {failed_count} failed/corrupted.")
        )
