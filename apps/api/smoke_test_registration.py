import os
import django
from urllib.parse import urlparse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
os.environ['DJANGO_ALLOWED_HOSTS'] = '*'
os.environ['DATABASE_URL'] = "postgresql://postgres.oanknexcqcguofsaroen:Loksewaai%40121@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
django.setup()

from django.test import Client
from core.models import User
from support.models import StudentProfile, NotificationPreference
from gamification.models import GamificationProfile

def run_smoke_test():
    client = Client(HTTP_HOST='localhost')

    # Step 1: Duplicate prevention check (try to register with existing 'aspirant99')
    print("Testing duplicate username...")
    resp = client.post('/api/auth/signup/', {
        'username': 'aspirant99',
        'email': 'new@loksewa.ai',
        'password': 'Password123!'
    }, content_type='application/json')
    if resp.status_code == 400:
        print("[OK] Duplicate username correctly rejected.")
    else:
        print(f"[FAIL] Failed duplicate username check: {resp.status_code} {resp.content}")

    # Clean up previous test users if any
    User.objects.filter(username='smoketest_student').delete()

    # Step 2: Register a new student
    print("\nTesting new student registration...")
    resp = client.post('/api/auth/signup/', {
        'username': 'smoketest_student',
        'email': 'smoke_test@loksewa.ai',
        'password': 'TestPassword123!'
    }, content_type='application/json')
    
    if resp.status_code != 201:
        print(f"[FAIL] Registration failed: {resp.status_code} {resp.content}")
        return
        
    print("[OK] Registration successful (201 Created).")
    data = resp.json()
    access_token = data.get('access')
    
    # Step 3: Verify Profile Creation inside the database
    print("\nVerifying database profile creation...")
    user = User.objects.get(username='smoketest_student')
    if StudentProfile.objects.filter(user=user).exists():
        print("[OK] StudentProfile explicitly created.")
    else:
        print("[FAIL] StudentProfile missing.")

    if NotificationPreference.objects.filter(user=user).exists():
        print("[OK] NotificationPreference explicitly created.")
    else:
        print("[FAIL] NotificationPreference missing.")
        
    if GamificationProfile.objects.filter(user=user).exists():
        print("[OK] GamificationProfile explicitly created.")
    else:
        print("[FAIL] GamificationProfile missing.")
        
    # Step 4: Login test
    print("\nTesting login...")
    login_resp = client.post('/api/token/', {
        'username': 'smoketest_student',
        'password': 'TestPassword123!'
    }, content_type='application/json')
    
    if login_resp.status_code == 200:
        print("[OK] Login successful.")
        access_token = login_resp.json().get('access')
    else:
        print(f"[FAIL] Login failed: {login_resp.status_code}")
        
    # Step 5: Test /api/auth/me/
    print("\nTesting /api/auth/me/ endpoint...")
    me_resp = client.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
    if me_resp.status_code == 200:
        print(f"[OK] /api/auth/me/ accessible. Role: {me_resp.json().get('role')}")
    else:
        print(f"[FAIL] /api/auth/me/ failed: {me_resp.status_code}")
        
    # Step 6: Test Onboarding/Profile Update
    print("\nTesting Profile Update (Onboarding)...")
    profile_resp = client.patch('/api/support/profile/', {
        'bio': 'I am a smoke test student.'
    }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    if profile_resp.status_code == 200:
        print("[OK] Profile successfully updated.")
    else:
        print(f"[FAIL] Profile update failed: {profile_resp.status_code}")
        
    print("\n[OK] SMOKE TEST COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    run_smoke_test()
