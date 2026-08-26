import os

filepath = 'apps/api/administration/tests/test_exam_analytics.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam, Question, Topic, StudentAnswer", "from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam, Question, Topic, StudentAnswer, Chapter, Subject, Paper")

old_test_setup = "topic = Topic.objects.create(name='test_topic')"
new_test_setup = '''paper = Paper.objects.create(name='test_paper', exam=self.parent_exam)
        subject = Subject.objects.create(name='test_subj', paper=paper)
        chapter = Chapter.objects.create(title='test_chap', subject=subject)
        topic = Topic.objects.create(name='test_topic', chapter=chapter)'''

content = content.replace(old_test_setup, new_test_setup)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed topic setup in tests")
