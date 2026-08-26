import os

filepath = 'apps/api/administration/tests/test_exam_analytics.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace("from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam", "from exams.models import Examination, ExaminationAttempt, ExamCategory, Exam, Question, Topic, StudentAnswer")

addition = '''
    def test_advanced_analytics_and_question_performance(self):
        # Create questions
        topic = Topic.objects.create(name='test_topic')
        q1 = Question.objects.create(text='q1', topic=topic, difficulty='easy', correct_option='A')
        q2 = Question.objects.create(text='q2', topic=topic, difficulty='hard', correct_option='B')
        
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam, student=self.student_user, 
            status='evaluated', score=50.0, percentage=50.0, passed=True, 
            time_taken_seconds=1200, started_at=timezone.now(), submitted_at=timezone.now()
        )
        StudentAnswer.objects.create(attempt=attempt, question=q1, is_correct=True, selected_option='A')
        StudentAnswer.objects.create(attempt=attempt, question=q2, is_correct=False, selected_option='C')
        
        attempt2 = ExaminationAttempt.objects.create(
            examination=self.exam, student=self.student_user2, 
            status='evaluated', score=0.0, percentage=0.0, passed=False, 
            time_taken_seconds=600, started_at=timezone.now(), submitted_at=timezone.now()
        )
        StudentAnswer.objects.create(attempt=attempt2, question=q1, is_correct=False, selected_option='B')
        StudentAnswer.objects.create(attempt=attempt2, question=q2, is_correct=False, selected_option=None) # skipped
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin-examination-analytics', kwargs={'pk': self.exam.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        self.assertEqual(data['summary']['total_attempts'], 2)
        self.assertEqual(data['time_statistics']['average_duration_seconds'], 900.0)
        
        q_perf = {q['question_id']: q for q in data['question_performance']}
        self.assertEqual(q_perf[q1.id]['correct'], 1)
        self.assertEqual(q_perf[q1.id]['incorrect'], 1)
        self.assertEqual(q_perf[q1.id]['skipped'], 0)
        
        self.assertEqual(q_perf[q2.id]['correct'], 0)
        self.assertEqual(q_perf[q2.id]['incorrect'], 1)
        self.assertEqual(q_perf[q2.id]['skipped'], 1)
        
        diff_perf = {d['level']: d for d in data['difficulty_performance']}
        self.assertEqual(diff_perf['Easy']['attempts'], 2)
        self.assertEqual(diff_perf['Hard']['attempts'], 2)

    def test_results_annotations_and_ranking(self):
        topic = Topic.objects.create(name='test_topic')
        q1 = Question.objects.create(text='q1', topic=topic, difficulty='easy', correct_option='A')
        
        attempt = ExaminationAttempt.objects.create(
            examination=self.exam, student=self.student_user, 
            status='evaluated', score=50.0, passed=True, 
            time_taken_seconds=1200, started_at=timezone.now(), submitted_at=timezone.now()
        )
        StudentAnswer.objects.create(attempt=attempt, question=q1, is_correct=True, selected_option='A')
        
        attempt2 = ExaminationAttempt.objects.create(
            examination=self.exam, student=self.student_user2, 
            status='evaluated', score=100.0, passed=True, 
            time_taken_seconds=600, started_at=timezone.now(), submitted_at=timezone.now()
        )
        StudentAnswer.objects.create(attempt=attempt2, question=q1, is_correct=True, selected_option='A')
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin-examination-results', kwargs={'pk': self.exam.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
        results = response.data['results']
        # attempt2 should be rank 1 (score 100), attempt 1 rank 2 (score 50)
        self.assertEqual(results[0]['id'], attempt2.id)
        self.assertEqual(results[0]['rank'], 1)
        self.assertEqual(results[0]['correct_answers'], 1)
        
        self.assertEqual(results[1]['id'], attempt.id)
        self.assertEqual(results[1]['rank'], 2)
'''

# Find the last line of the class to append the new tests
if new_content.endswith('\n'):
    new_content += addition
else:
    new_content += '\n' + addition

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Updated tests")
