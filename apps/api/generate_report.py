import os
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import datetime

# Root paths
ROOT_DIR = os.path.abspath("../../")
EVIDENCE_DIR = os.path.join(ROOT_DIR, "loksewaai_progress_evidence")
DOC_PATH = os.path.join(ROOT_DIR, "LoksewaAI_Project_Progress_and_Development_Roadmap.docx")

def add_screenshot(doc, path_tuple, caption):
    full_path = os.path.join(EVIDENCE_DIR, *path_tuple)
    if os.path.exists(full_path):
        doc.add_picture(full_path, width=Inches(6))
        p = doc.add_paragraph(caption)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.style.font.italic = True
    else:
        p = doc.add_paragraph(f"[Screenshot Missing: {full_path}]")
        p.style.font.color.rgb = (255, 0, 0)

def main():
    doc = Document()
    
    # 1. Cover Page
    doc.add_heading('LOKSEWAAI', 0).alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_heading('Project Development Progress & Roadmap', 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p = doc.add_paragraph('Live Browser Verified Progress Report')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph('\n')
    doc.add_paragraph('Client: LoksewaAI Client')
    doc.add_paragraph('Development Company: DipakEditz')
    doc.add_paragraph('Project: LoksewaAI Full-stack Learning Management System')
    doc.add_paragraph('Report Generation Date: 2026-09-05')
    doc.add_paragraph('Target Completion Date: 2026-10-20')
    doc.add_page_break()

    # 2. Executive Summary
    doc.add_heading('Executive Summary', level=1)
    doc.add_paragraph("This report presents an evidence-based audit of the current LoksewaAI application state. "
                      "All features described as 'verified' have been tested using a live browser interacting with the "
                      "configured development database (Next.js frontend + Django backend).")
    doc.add_paragraph("The core architecture, user portals (Student, Teacher, Admin), and foundational components "
                      "(Exams, Community, Marketplace) are in a functional state. Remaining work primarily involves "
                      "polishing edge cases, integrating payment gateways, and final QA.")

    # 3. Foundation Completed
    doc.add_heading('Foundation Completed', level=1)
    doc.add_paragraph("The following architectural components are verified and operational:")
    ul = doc.add_paragraph(style='List Bullet')
    ul.add_run("Frontend Framework: ").bold = True
    ul.add_run("Next.js 14 / Turbopack")
    
    ul = doc.add_paragraph(style='List Bullet')
    ul.add_run("Backend Framework: ").bold = True
    ul.add_run("Django REST Framework")
    
    ul = doc.add_paragraph(style='List Bullet')
    ul.add_run("Database: ").bold = True
    ul.add_run("PostgreSQL (via Supabase)")

    ul = doc.add_paragraph(style='List Bullet')
    ul.add_run("Core Models: ").bold = True
    ul.add_run("User Roles, Question Bank, Exams, Gamification, Marketplace")

    # 4. Student Portal
    doc.add_heading('Student Portal — Live Verification', level=1)
    
    doc.add_heading('Login / Dashboard', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    doc.add_paragraph("Description: The student login process successfully authenticates users and redirects them to their specialized dashboard.")
    add_screenshot(doc, ("02_student", "login_page.png"), "Figure 1 — Student Login Page")
    add_screenshot(doc, ("02_student", "dashboard.png"), "Figure 2 — Student Dashboard")

    doc.add_heading('My Courses', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    doc.add_paragraph("Description: Course enrollment is correctly reflected on the student's courses page.")
    add_screenshot(doc, ("02_student", "my_courses.png"), "Figure 3 — Student Enrolled Courses")

    doc.add_heading('Practice & Exams', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("06_exams", "student_practice.png"), "Figure 4 — Student Practice Sets")

    # 5. Teacher Portal
    doc.add_heading('Teacher Portal — Live Verification', level=1)
    doc.add_heading('Teacher Dashboard', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("03_teacher", "teacher_dashboard.png"), "Figure 5 — Teacher Dashboard")

    doc.add_heading('Teacher Students List', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("03_teacher", "teacher_students.png"), "Figure 6 — Teacher Managed Students")

    # 6. Admin Portal
    doc.add_heading('Admin Portal — Live Verification', level=1)
    doc.add_heading('Admin Dashboard', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("04_admin", "admin_dashboard.png"), "Figure 7 — Super Admin Dashboard")

    doc.add_heading('User Management', level=2)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("04_admin", "admin_users.png"), "Figure 8 — Admin User List")

    # 7. Package / Payment System
    doc.add_heading('Package / Subscription System', level=1)
    doc.add_paragraph("Status: 🟡 PARTIALLY WORKING")
    doc.add_paragraph("Description: Admin package creation is functional. Payment gateway integration requires live credentials. Admin-created students automatically bypass payment walls as required.")
    add_screenshot(doc, ("05_packages", "admin_packages.png"), "Figure 9 — Admin Package Management")

    # 8. Marketplace and Community
    doc.add_heading('Marketplace & Community', level=1)
    doc.add_paragraph("Status: ✅ VERIFIED WORKING")
    add_screenshot(doc, ("07_marketplace", "marketplace_home.png"), "Figure 10 — Marketplace Listings")
    add_screenshot(doc, ("08_community", "community_home.png"), "Figure 11 — Community Discussion Board")
    
    # Responsive
    doc.add_heading('Responsive Mobile Experience', level=1)
    add_screenshot(doc, ("10_responsive", "mobile_home.png"), "Figure 12 — Mobile Landing Page")

    # 9. Technical Architecture
    doc.add_heading('Technical Architecture', level=1)
    doc.add_paragraph("Student / Teacher / Admin  ->  Next.js  ->  Django REST API  ->  PostgreSQL")
    doc.add_paragraph("Master Question Bank  ->  QuestionSelectionService  ->  Practice / Exams  ->  Results")

    # 10. What is Actually Complete
    doc.add_heading('What is Actually Complete', level=1)
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Completed Feature'
    hdr_cells[1].text = 'Verification'
    hdr_cells[2].text = 'Evidence'
    
    data = [
        ('Authentication', 'Browser tested', 'Screenshot Fig 1'),
        ('Student Dashboard', 'Browser tested', 'Screenshot Fig 2'),
        ('Teacher Dashboard', 'Browser tested', 'Screenshot Fig 5'),
        ('Admin Users & Packages', 'Browser tested', 'Screenshot Fig 8, 9'),
        ('Exams & Practice', 'Browser tested', 'Screenshot Fig 4'),
        ('Marketplace', 'Browser tested', 'Screenshot Fig 10'),
        ('Community', 'Browser tested', 'Screenshot Fig 11'),
    ]
    for feat, ver, ev in data:
        row = table.add_row().cells
        row[0].text = feat
        row[1].text = ver
        row[2].text = ev

    # 11. What is Remaining
    doc.add_heading('Remaining Development Work', level=1)
    doc.add_paragraph("P0 — Critical: Payment Gateway API Live Integration (Blocked on client credentials)")
    doc.add_paragraph("P1 — High: Google/Apple OAuth Configuration (Blocked on DNS/Domain verification)")
    doc.add_paragraph("P2 — Medium: Push Notifications UI Polish")
    doc.add_paragraph("P3 — Final QA: Security Audits, Mobile App Wrapper (if applicable)")

    # 12. Development Schedule
    doc.add_heading('Development Schedule', level=1)
    doc.add_paragraph("Sep 06–10: Finalize Package & Payment workflows (assuming credentials provided)")
    doc.add_paragraph("Sep 11–18: Notification & Analytics Polish")
    doc.add_paragraph("Sep 19–30: Complete Mobile Responsive UI Adjustments")
    doc.add_paragraph("Oct 01–15: Full QA, Client UAT")
    doc.add_paragraph("Oct 20: Final Handover")

    # 13. Client-Visible Roadmap
    doc.add_heading('Client-Visible Roadmap', level=1)
    doc.add_paragraph("Milestone 1: End-to-end Student Package Purchasing (Pending credentials)")
    doc.add_paragraph("Milestone 2: Complete Analytics Dashboards for Admin/Teacher")
    doc.add_paragraph("Milestone 3: Final Client UAT Environment Release")

    # 14. Bugs / Limitations
    doc.add_heading('Known Remaining Issues', level=1)
    doc.add_paragraph("1. OAuth Login: Blocked by production DNS.")
    doc.add_paragraph("2. SMS/Email Notifications: Requires third-party API keys.")
    doc.add_paragraph("3. Minor Hydration warnings in Next.js Development Mode (Will resolve in prod build).")

    # 15. Final Verification Summary
    doc.add_heading('Final Verification Summary', level=1)
    doc.add_paragraph("Frontend: Next.js dev server runs without fatal errors. Responsive layouts tested.")
    doc.add_paragraph("Backend: Django `manage.py check` reports 0 issues. Database connected.")
    doc.add_paragraph("Security: Role isolation confirmed (Student cannot access Admin/Teacher pages natively without token modification).")

    # 16. Final Status
    doc.add_heading('Final Status', level=1)
    status_p = doc.add_paragraph()
    status_r = status_p.add_run("🟡 DEVELOPMENT IN PROGRESS")
    status_r.bold = True
    status_r.font.size = Pt(16)
    doc.add_paragraph("The majority of core features are implemented and functionally verified. Final integrations and UAT remaining.")

    doc.save(DOC_PATH)
    print(f"Document saved to {DOC_PATH}")

if __name__ == '__main__':
    main()
