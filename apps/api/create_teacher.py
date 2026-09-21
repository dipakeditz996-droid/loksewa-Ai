"""Create (or reset the password of) a teacher account.

    python create_teacher.py --username teacher@example.com

The password is read from the TEACHER_PASSWORD environment variable, or
prompted for without echo. It is never stored in this file or printed.
"""
import argparse
import getpass
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.password_validation import validate_password

from core.models import User

parser = argparse.ArgumentParser()
parser.add_argument('--username', required=True)
parser.add_argument('--first-name', default='Demo')
parser.add_argument('--last-name', default='Teacher')
args = parser.parse_args()

password = os.environ.get('TEACHER_PASSWORD') or getpass.getpass('Teacher password: ')

user, created = User.objects.get_or_create(
    username=args.username,
    defaults={
        'email': args.username,
        'role': 'teacher',
        'is_active': True,
        'first_name': args.first_name,
        'last_name': args.last_name,
    },
)
validate_password(password, user)
user.set_password(password)
user.save()

print(f"{'Created' if created else 'Updated'} teacher account: {args.username}")
