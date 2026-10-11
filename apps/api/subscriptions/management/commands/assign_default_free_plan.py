"""Management command to safely and auditably assign the default Free Plan
to existing eligible students who currently have no active package entitlement.

Usage:
    python manage.py assign_default_free_plan [--dry-run]
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import User
from subscriptions.models import Subscription, SubscriptionPlan
from subscriptions.entitlements import EntitlementService
from subscriptions.access import has_admin_granted_access

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Safely assigns the configured default Free Plan to eligible students without active entitlements."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate eligibility check without persisting changes.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        default_free_plan = EntitlementService.get_default_free_plan()
        if not default_free_plan:
            self.stdout.write(self.style.ERROR(
                "No active, published default Free Plan found in the system. "
                "Please configure a package with price 0.00 and is_default_free=True first."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"Using Default Free Plan: '{default_free_plan.name}' (ID: {default_free_plan.id})"
        ))

        # Query all active student accounts
        students = User.objects.filter(role='student', is_active=True).order_by('id')
        total_students = students.count()
        self.stdout.write(f"Auditing {total_students} active student accounts...")

        qualified_count = 0
        granted_count = 0
        skipped_paid = 0
        skipped_admin = 0
        skipped_existing_free = 0

        for student in students:
            # Check for active admin-granted access
            if has_admin_granted_access(student):
                skipped_admin += 1
                continue

            active_sub = EntitlementService.get_active_subscription(student)
            if active_sub:
                if active_sub.plan.price > 0:
                    skipped_paid += 1
                    continue
                else:
                    skipped_existing_free += 1
                    continue

            # Student qualifies!
            qualified_count += 1

            if not dry_run:
                try:
                    with transaction.atomic():
                        sub = EntitlementService.activate_free_plan(student, default_free_plan)
                        if sub:
                            granted_count += 1
                except Exception as e:
                    logger.exception("Failed to grant free plan to student %s: %s", student.username, e)
                    self.stdout.write(self.style.WARNING(
                        f"Failed to assign free plan for {student.username} (ID {student.id}): {e}"
                    ))
            else:
                granted_count += 1

        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("AUDIT & FREE PLAN ASSIGNMENT REPORT:"))
        self.stdout.write(f"  Total student accounts audited: {total_students}")
        self.stdout.write(f"  Skipped (active paid subscribers): {skipped_paid}")
        self.stdout.write(f"  Skipped (admin-granted access): {skipped_admin}")
        self.stdout.write(f"  Skipped (already have active free plan): {skipped_existing_free}")
        self.stdout.write(f"  Students qualifying for free plan: {qualified_count}")
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"  [DRY RUN] Would grant free plan to {granted_count} students. No changes made."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  Successfully granted free plan to {granted_count} students."
            ))
        self.stdout.write("=" * 60)
