import os
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:3000"
EVIDENCE_DIR = os.path.abspath("../../loksewaai_progress_evidence")

def capture(page, path, name):
    full_path = os.path.join(EVIDENCE_DIR, path, name)
    try:
        page.screenshot(path=full_path, full_page=True)
        print(f"Captured: {full_path}")
    except Exception as e:
        print(f"Failed to capture {full_path}: {e}")

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Test Student
        print("Testing Student Portal...")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        try:
            page.goto(f"{BASE_URL}/login")
            time.sleep(2)
            capture(page, "02_student", "login_page.png")
            
            page.fill("input#email", "demostudent")
            page.fill("input#password", "demo1234")
            page.click("button[type='submit']")
            time.sleep(3)
            capture(page, "02_student", "dashboard.png")
            
            page.goto(f"{BASE_URL}/student/courses")
            time.sleep(2)
            capture(page, "02_student", "my_courses.png")
            
            page.goto(f"{BASE_URL}/student/practice")
            time.sleep(2)
            capture(page, "06_exams", "student_practice.png")
            
            page.goto(f"{BASE_URL}/marketplace")
            time.sleep(2)
            capture(page, "07_marketplace", "marketplace_home.png")
            
            page.goto(f"{BASE_URL}/community")
            time.sleep(2)
            capture(page, "08_community", "community_home.png")
        except Exception as e:
            print(f"Student test failed: {e}")
            
        context.close()
        
        # 2. Test Teacher
        print("Testing Teacher Portal...")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        try:
            page.goto(f"{BASE_URL}/login")
            time.sleep(2)
            page.fill("input#email", "teacher@loksewa.ai")
            page.fill("input#password", "Teacher@123")
            page.click("button[type='submit']")
            time.sleep(3)
            capture(page, "03_teacher", "teacher_dashboard.png")
            
            page.goto(f"{BASE_URL}/teacher/students")
            time.sleep(2)
            capture(page, "03_teacher", "teacher_students.png")
        except Exception as e:
            print(f"Teacher test failed: {e}")
            
        context.close()
        
        # 3. Test Admin
        print("Testing Admin Portal...")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        try:
            page.goto(f"{BASE_URL}/login")
            time.sleep(2)
            page.fill("input#email", "admin@loksewa.ai")
            page.fill("input#password", "admin123")
            page.click("button[type='submit']")
            time.sleep(3)
            capture(page, "04_admin", "admin_dashboard.png")
            
            page.goto(f"{BASE_URL}/admin/users")
            time.sleep(2)
            capture(page, "04_admin", "admin_users.png")
            
            page.goto(f"{BASE_URL}/admin/packages")
            time.sleep(2)
            capture(page, "05_packages", "admin_packages.png")
        except Exception as e:
            print(f"Admin test failed: {e}")
            
        context.close()
        
        # 4. Responsive Testing (Mobile)
        print("Testing Responsive...")
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        try:
            page.goto(f"{BASE_URL}/")
            time.sleep(2)
            capture(page, "10_responsive", "mobile_home.png")
        except Exception as e:
            print(f"Responsive test failed: {e}")
            
        context.close()
        
        browser.close()

if __name__ == "__main__":
    run_tests()
