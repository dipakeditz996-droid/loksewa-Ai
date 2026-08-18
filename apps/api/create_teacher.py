import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import User

user, created = User.objects.get_or_create(
    username='teacher@loksewa.ai', 
    defaults={
        'email': 'teacher@loksewa.ai', 
        'role': 'teacher', 
        'is_active': True, 
        'first_name': 'Demo', 
        'last_name': 'Teacher'
    }
)
user.set_password('Teacher@123')
user.save()

print('Created Teacher: teacher@loksewa.ai / Teacher@123')
