import os
import re

filepath = 'apps/api/administration/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ModelExamAttempt.objects with ExaminationAttempt.objects in AdminAnalyticsView
old_block = '''        # Exam attempts per day
        attempts_qs = (
            ModelExamAttempt.objects.filter(
                started_at__date__gte=start_date,
                started_at__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(started_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        attempts_map = {str(a['day']): a['count'] for a in attempts_qs}'''

new_block = '''        # Exam attempts per day (Legacy ModelExamAttempt + new ExaminationAttempt)
        legacy_qs = (
            ModelExamAttempt.objects.filter(
                started_at__date__gte=start_date,
                started_at__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(started_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        
        new_qs = (
            ExaminationAttempt.objects.filter(
                started_at__date__gte=start_date,
                started_at__date__lte=end_date,
            )
            .extra(select={'day': 'DATE(started_at)'})
            .values('day')
            .annotate(count=Count('id'))
        )
        
        attempts_map = {}
        for a in legacy_qs:
            attempts_map[str(a['day'])] = attempts_map.get(str(a['day']), 0) + a['count']
        for a in new_qs:
            attempts_map[str(a['day'])] = attempts_map.get(str(a['day']), 0) + a['count']
'''

if old_block in content:
    content = content.replace(old_block, new_block)
    
    # Need to add ExaminationAttempt import to administration/views.py
    if 'ExaminationAttempt' not in content:
        content = content.replace(
            'from exams.models import Exam, Question, ModelExam, ModelExamAttempt, PracticeSession',
            'from exams.models import Exam, Question, ModelExam, ModelExamAttempt, PracticeSession, ExaminationAttempt'
        )
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated AdminAnalyticsView successfully")
else:
    print("Could not find old block to replace.")
