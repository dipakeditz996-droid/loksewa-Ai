"""Create (or reset the password of) an admin account from the command line.

    python create_admin.py --username some_admin --email admin@example.com

The password is read from the ADMIN_PASSWORD environment variable, or prompted
for without echo, and checked against the project's password validators. It is
never stored in this file or printed. Two-factor auth is left as it is unless
--disable-2fa is passed, and locked accounts are only unlocked with --unlock.
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
parser.add_argument('--email', required=True)
parser.add_argument('--role', default='super-admin', choices=['admin', 'super-admin'])
parser.add_argument('--disable-2fa', action='store_true')
parser.add_argument('--unlock', action='store_true')
args = parser.parse_args()

password = os.environ.get('ADMIN_PASSWORD') or getpass.getpass('Admin password: ')

user, created = User.objects.get_or_create(
    username=args.username,
    defaults={'email': args.email, 'role': args.role, 'is_staff': True, 'is_active': True},
)
if not created:
    user.email = args.email
    user.role = args.role
    user.is_active = True
if args.role == 'super-admin':
    user.is_staff = True
    user.is_superuser = True
if args.disable_2fa:
    user.is_2fa_enabled = False
if args.unlock:
    user.failed_login_attempts = 0
    user.locked_until = None

validate_password(password, user)
user.set_password(password)
user.save()

print(f"{'Created' if created else 'Updated'} {user.role} account: {user.username} (id {user.id})")
