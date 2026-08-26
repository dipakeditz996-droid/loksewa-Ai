import os

filepath = 'apps/api/administration/tests/test_exam_analytics.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam\n\nUser = get_user_model()',
    'from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam\nfrom django.utils import timezone\nimport datetime\n\nUser = get_user_model()'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
