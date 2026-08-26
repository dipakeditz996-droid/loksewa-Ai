import os
import re

def fix_file(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for old, new in replacements:
            content = content.replace(old, new)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Failed to fix {filepath}: {e}")

# Syllabus
fix_file('apps/web/app/home/SyllabusSection.tsx', [
    ('(paper, pi)', '(paper: any, pi: number)'),
    ('(subject, si)', '(subject: any, si: number)'),
    ('(ch, ci)', '(ch: any, ci: number)'),
])

# Settings Analytics
fix_file('apps/web/app/teacher/analytics/_components/performance-trend.tsx', [
    ('formatter={(value: number)', 'formatter={(value: any)'),
])

# Practice Sets
fix_file('apps/web/app/teacher/practice-sets/[id]/edit/page.tsx', [
    ('selectedSubject.name', 'selectedSubject?.name'),
])
fix_file('apps/web/app/teacher/practice-sets/new/page.tsx', [
    ('selectedSubject.name', 'selectedSubject?.name'),
])

# Teacher Settings
fix_file('apps/web/app/teacher/settings/page.tsx', [
    ('onClick={() => handleSave(item.redirectTo)}', 'onClick={(e) => handleSave(item.redirectTo)}'),
    ('onClick={() => handleSave()}', 'onClick={(e) => handleSave()}'),
])
fix_file('apps/web/components/teacher/settings/TeacherAccountSection.tsx', [
    ('user.date_joined', '(user as any).date_joined'),
])

# Teacher Mock Exams
fix_file('apps/web/components/teacher/mock-exams/MockExamBuilder.tsx', [
    ('selectedSubject.id', 'selectedSubject?.id'),
    ('selectedSubject.name', 'selectedSubject?.name'),
])

# Subjects
fix_file('apps/web/app/admin-dashboard/academic/subjects/[id]/page.tsx', [
    ('c =>', '(c: any) =>'),
    ('chapter =>', '(chapter: any) =>'),
    ('t =>', '(t: any) =>'),
])
fix_file('apps/web/app/admin-dashboard/academic/subjects/page.tsx', [
    ('subject.status', '(subject as any).status'),
])

# Exams
fix_file('apps/web/app/admin-dashboard/exams/page.tsx', [
    ('exam.status === "published"', '(exam as any).status === "published"'),
])

# Payment methods
fix_file('apps/web/app/admin-dashboard/marketplace/payment-methods/page.tsx', [
    ('editingMethod', 'editingMethod as any'),
])

# Layout
fix_file('apps/web/app/admin-dashboard/layout.tsx', [
    ('icon: LayoutDashboard', 'icon: LayoutDashboard as any'),
    ('icon: BookOpen', 'icon: BookOpen as any'),
    ('icon: GraduationCap', 'icon: GraduationCap as any'),
    ('icon: Users', 'icon: Users as any'),
    ('icon: WalletCards', 'icon: WalletCards as any'),
    ('icon: ShoppingCart', 'icon: ShoppingCart as any'),
    ('icon: Settings', 'icon: Settings as any'),
])
