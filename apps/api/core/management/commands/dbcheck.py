"""
Read-only database inspection command.

    python manage.py dbcheck            # backend, connection, migration state
    python manage.py dbcheck --tables   # also list every table in the database

This command NEVER writes, alters, drops or truncates anything. It exists to
answer three questions before and after a Supabase migration:

    1. Is Django actually talking to PostgreSQL, or still to SQLite?
    2. Does the target database already contain tables / data?
    3. Are there unapplied migrations?

No password or full connection string is ever printed.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

# Canonical models the LoksewaAI architecture depends on. Presence is checked
# by table name; nothing is created or modified.
CANONICAL_TABLES = [
    # Authentication / profiles
    'core_user',
    'core_teacherprofile',
    'support_studentprofile',
    # Academic hierarchy
    'exams_examcategory',
    'exams_exam',
    'exams_paper',
    'exams_subject',
    'exams_chapter',
    'exams_topic',
    # Question system
    'exams_question',
    'exams_questionset',
    'exams_questionsetquestion',
    'exams_practicesession',
    'exams_questionattempt',
    # Examinations
    'exams_examination',
    'exams_examinationquestion',
    'exams_examinationattempt',
    'exams_studentanswer',
    'exams_usertopicprogress',
    # Courses
    'courses_course',
    'courses_courseapplication',
    'courses_enrollment',
    'courses_teachercourseassignment',
    # Study materials
    'notes_studymaterial',
    # Study plans
    'study_plan_studyplantemplate',
    'study_plan_studyplantemplatetask',
    'study_plan_studyplan',
    # Gamification
    'gamification_gamificationprofile',
    'gamification_xptransaction',
    'gamification_referral',
    # Commerce / support
    'marketplace_product',
    'marketplace_purchase',
    'subscriptions_subscription',
    'support_supportticket',
]


class Command(BaseCommand):
    help = 'Report the active database backend, connection target and migration state (read-only).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tables',
            action='store_true',
            help='List every table name found in the database.',
        )

    def handle(self, *args, **options):
        settings_dict = connection.settings_dict
        engine = settings_dict.get('ENGINE', '')
        vendor = connection.vendor

        self.stdout.write('=' * 62)
        self.stdout.write('DATABASE BACKEND')
        self.stdout.write('=' * 62)

        if vendor == 'postgresql':
            label = 'PostgreSQL'
            style = self.style.SUCCESS
        elif vendor == 'sqlite':
            label = 'SQLite'
            style = self.style.WARNING
        else:
            label = vendor
            style = self.style.WARNING

        self.stdout.write(style(f'  Backend        : {label}'))
        self.stdout.write(f'  Engine         : {engine}')

        if vendor == 'postgresql':
            host = settings_dict.get('HOST') or '(local socket)'
            port = settings_dict.get('PORT') or '5432'
            name = settings_dict.get('NAME') or ''
            user = settings_dict.get('USER') or ''
            options_dict = settings_dict.get('OPTIONS') or {}
            self.stdout.write(f'  Host           : {host}')
            self.stdout.write(f'  Port           : {port}')
            self.stdout.write(f'  Database       : {name}')
            self.stdout.write(f'  User           : {_mask(user)}')
            self.stdout.write(f"  SSL mode       : {options_dict.get('sslmode', '(not set)')}")
            self.stdout.write(f"  Pooled (6543)  : {'yes' if str(port) == '6543' else 'no'}")
            self.stdout.write(
                f"  Server cursors : {'disabled' if settings_dict.get('DISABLE_SERVER_SIDE_CURSORS') else 'enabled'}"
            )
            self.stdout.write(f"  conn_max_age   : {settings_dict.get('CONN_MAX_AGE')}")
        else:
            self.stdout.write(f"  File           : {settings_dict.get('NAME')}")
            self.stdout.write(self.style.WARNING(
                '  NOTE: DATABASE_URL is not set, so Django is using the local\n'
                '        development SQLite fallback. This is NOT production.'
            ))

        # --- live connection ------------------------------------------------
        self.stdout.write('')
        self.stdout.write('=' * 62)
        self.stdout.write('CONNECTION')
        self.stdout.write('=' * 62)
        try:
            with connection.cursor() as cursor:
                if vendor == 'postgresql':
                    cursor.execute('SELECT version(), current_database(), current_user')
                    version, current_db, current_user = cursor.fetchone()
                    self.stdout.write(self.style.SUCCESS('  Status         : CONNECTED'))
                    self.stdout.write(f'  Server         : {version.split(" on ")[0]}')
                    self.stdout.write(f'  current_database: {current_db}')
                    self.stdout.write(f'  current_user   : {_mask(current_user)}')
                    cursor.execute('SHOW TIME ZONE')
                    self.stdout.write(f'  Server TimeZone: {cursor.fetchone()[0]}')
                else:
                    cursor.execute('SELECT 1')
                    cursor.fetchone()
                    self.stdout.write(self.style.SUCCESS('  Status         : CONNECTED'))
        except Exception as exc:  # noqa: BLE001 - report, do not crash
            self.stdout.write(self.style.ERROR(f'  Status         : FAILED - {type(exc).__name__}'))
            self.stdout.write(self.style.ERROR(f'  Detail         : {exc}'))
            return

        # --- existing tables / data ----------------------------------------
        table_names = sorted(connection.introspection.table_names())
        self.stdout.write('')
        self.stdout.write('=' * 62)
        self.stdout.write('EXISTING SCHEMA')
        self.stdout.write('=' * 62)
        self.stdout.write(f'  Tables found   : {len(table_names)}')

        if not table_names:
            self.stdout.write(self.style.SUCCESS(
                '  The database is EMPTY. A fresh `migrate` is safe.'
            ))
        else:
            if 'django_migrations' in table_names:
                with connection.cursor() as cursor:
                    cursor.execute('SELECT COUNT(*) FROM django_migrations')
                    applied = cursor.fetchone()[0]
                self.stdout.write(f'  django_migrations rows: {applied}')
            else:
                self.stdout.write(self.style.WARNING(
                    '  Tables exist but django_migrations does NOT.\n'
                    '  STOP: this database was not created by Django migrations.'
                ))

            # Row counts for the canonical tables that exist.
            populated = []
            for table in CANONICAL_TABLES:
                if table in table_names:
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                            count = cursor.fetchone()[0]
                        if count:
                            populated.append((table, count))
                    except Exception:  # noqa: BLE001
                        continue
            if populated:
                self.stdout.write(self.style.WARNING('  Tables containing DATA:'))
                for table, count in populated:
                    self.stdout.write(f'    {table}: {count} row(s)')
                self.stdout.write(self.style.WARNING(
                    '  This database is NOT empty. Do not run destructive commands.'
                ))
            else:
                self.stdout.write('  No rows found in the canonical tables.')

        if options['tables']:
            self.stdout.write('')
            self.stdout.write('  All tables:')
            for table in table_names:
                self.stdout.write(f'    {table}')

        # --- canonical model coverage ---------------------------------------
        self.stdout.write('')
        self.stdout.write('=' * 62)
        self.stdout.write('CANONICAL MODEL TABLES')
        self.stdout.write('=' * 62)
        missing = [t for t in CANONICAL_TABLES if t not in table_names]
        present = len(CANONICAL_TABLES) - len(missing)
        self.stdout.write(f'  Present        : {present}/{len(CANONICAL_TABLES)}')
        if missing:
            self.stdout.write(self.style.WARNING('  Missing:'))
            for table in missing:
                self.stdout.write(f'    {table}')
        else:
            self.stdout.write(self.style.SUCCESS('  All canonical tables present.'))

        # --- migration state -------------------------------------------------
        self.stdout.write('')
        self.stdout.write('=' * 62)
        self.stdout.write('MIGRATION STATE')
        self.stdout.write('=' * 62)
        try:
            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            plan = executor.migration_plan(targets)
            self.stdout.write(f'  Known migrations   : {len(executor.loader.graph.nodes)}')
            self.stdout.write(f'  Applied migrations : {len(executor.loader.applied_migrations)}')
            self.stdout.write(f'  Unapplied (planned): {len(plan)}')
            if plan:
                self.stdout.write(self.style.WARNING('  Pending:'))
                for migration, _backwards in plan:
                    self.stdout.write(f'    {migration.app_label}.{migration.name}')
            else:
                self.stdout.write(self.style.SUCCESS('  Database schema is up to date.'))
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.ERROR(f'  Could not build migration plan: {exc}'))

        # --- verdict ----------------------------------------------------------
        self.stdout.write('')
        self.stdout.write('=' * 62)
        if vendor == 'postgresql':
            self.stdout.write(self.style.SUCCESS('VERDICT: Django is connected to PostgreSQL.'))
        else:
            self.stdout.write(self.style.WARNING(
                f'VERDICT: Django is using {label}, NOT PostgreSQL. '
                'Set DATABASE_URL in apps/api/.env.'
            ))
        self.stdout.write('=' * 62)


def _mask(value):
    """Show only the first 4 characters of an identifier."""
    value = str(value or '')
    if len(value) <= 4:
        return value or '(empty)'
    return value[:4] + '*' * (len(value) - 4)
