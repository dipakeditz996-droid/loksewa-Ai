import os
import re

filepath = 'apps/api/administration/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''        # Recent exam attempts
        recent_attempts = ModelExamAttempt.objects.select_related('student', 'model_exam').order_by('-started_at')[:3]
        for a in recent_attempts:
            recent_activity.append({
                "id": activity_id,
                "type": "exam_attempt",
                "description": f"'{a.student.get_full_name() or a.student.username}' attempted '{a.model_exam.title}'",
                "user": a.student.get_full_name() or a.student.username,
                "time": _format_time_ago(a.started_at),
                "status": a.status,
            })
            activity_id += 1'''

new_block = '''        # Recent exam attempts (legacy + new)
        legacy_attempts = list(ModelExamAttempt.objects.select_related('student', 'model_exam').order_by('-started_at')[:3])
        new_attempts = list(ExaminationAttempt.objects.select_related('student', 'examination').order_by('-started_at')[:3])
        
        all_recent = sorted(legacy_attempts + new_attempts, key=lambda x: x.started_at, reverse=True)[:3]
        
        for a in all_recent:
            is_legacy = isinstance(a, ModelExamAttempt)
            title = a.model_exam.title if is_legacy else a.examination.title
            recent_activity.append({
                "id": activity_id,
                "type": "exam_attempt",
                "description": f"'{a.student.get_full_name() or a.student.username}' attempted '{title}'",
                "user": a.student.get_full_name() or a.student.username,
                "time": _format_time_ago(a.started_at),
                "status": a.status,
            })
            activity_id += 1'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated AdminDashboardStatsView successfully")
else:
    print("Could not find old block to replace in AdminDashboardStatsView.")
