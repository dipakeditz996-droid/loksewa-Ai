import os
from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Create the default admin user if one does not already exist.'

    def handle(self, *args, **options):
        email = os.environ.get('DEFAULT_ADMIN_EMAIL', 'admin@loksewa.ai')
        username = os.environ.get('DEFAULT_ADMIN_USERNAME', 'admin')
        password = os.environ.get('DEFAULT_ADMIN_PASSWORD', 'Admin@12345')

        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            # Ensure the existing admin has the correct fields
            changed = False
            if user.role != 'admin':
                user.role = 'admin'
                changed = True
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if user.email != email:
                user.email = email
                changed = True
            if changed:
                user.save()
                self.stdout.write(self.style.WARNING(
                    f'Admin user "{username}" already exists. Updated role/email to match defaults.'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'Admin user "{username}" already exists with correct configuration. No changes made.'
                ))
            return

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role='admin',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            first_name='Admin',
            last_name='User',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Default admin user created successfully.\n'
            f'  Username: {username}\n'
            f'  Email:    {email}\n'
            f'  Role:     admin'
        ))
