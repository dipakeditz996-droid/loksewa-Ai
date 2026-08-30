"""PublicStatsView (/api/public/stats/) used to multiply real counts by an
arbitrary factor to "look more populated". Covers: it now reports real counts
with only a floor (never a multiplier) applied below that floor.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question, QuestionSet,
)


class PublicStatsFloorTests(APITestCase):
    def _make_question(self, n):
        category = ExamCategory.objects.create(name='Loksewa')
        position = Exam.objects.create(name='Kharidar', category=category)
        paper = Paper.objects.create(exam=position, name='Paper 1')
        subject = Subject.objects.create(paper=paper, name='GK')
        chapter = Chapter.objects.create(subject=subject, title='History')
        topic = Topic.objects.create(chapter=chapter, name='Ancient History')
        for i in range(n):
            Question.objects.create(topic=topic, text=f'Q{i}', question_type='mcq', marks=1)

    def test_below_floor_reports_the_floor_not_a_multiple(self):
        # 3 real students - a naive `* 10` would have reported 30, not 5000.
        for i in range(3):
            User.objects.create_user(
                username=f'stud{i}', email=f's{i}@test.com', password='pass123', role='student')
        self._make_question(2)

        response = self.client.get('/api/public/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_aspirants'], 5000)
        self.assertEqual(response.data['total_questions'], 10000)
        self.assertEqual(response.data['practice_sets'], 200)

    def test_above_floor_reports_the_real_count_not_a_multiple(self):
        # bulk_create keeps this fast despite the row count needed to clear
        # the 5000 floor - a naive `* 10` would report 50,010, not 5001.
        users = [
            User(username=f'bulk{i}', email=f'bulk{i}@test.com', role='student', is_active=True, password='x')
            for i in range(5001)
        ]
        User.objects.bulk_create(users)

        response = self.client.get('/api/public/stats/')
        self.assertEqual(response.data['total_aspirants'], 5001)

    def test_anonymous_access_allowed(self):
        response = self.client.get('/api/public/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_aspirants', response.data)

    def test_practice_sets_counts_only_published_question_sets(self):
        category = ExamCategory.objects.create(name='Loksewa')
        position = Exam.objects.create(name='Kharidar', category=category)
        for i in range(250):
            QuestionSet.objects.create(
                name=f'Set {i}', category=category, exam=position,
                total_questions=10, status='published' if i < 210 else 'draft',
            )
        response = self.client.get('/api/public/stats/')
        self.assertEqual(response.data['practice_sets'], 210)
