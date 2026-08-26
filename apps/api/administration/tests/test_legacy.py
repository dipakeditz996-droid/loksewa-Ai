from rest_framework.test import APITestCase
from rest_framework import status

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question, QuestionSet


class QuestionSetGenerateTests(APITestCase):
    """
    Regression tests for QuestionSetViewSet.generate (administration app).

    Before this fix, `generate` filtered on Question.status == 'published'
    (a value that doesn't exist in Question.STATUS_CHOICES) and referenced
    pre-rename field paths (topic__unit__subject_id, qset.unit_id) that were
    renamed to chapter/topic__chapter__subject_id in
    exams/migrations/0016_academic_hierarchy_restructure — so this action
    always either matched zero questions or raised AttributeError/FieldError
    against the current schema. It now delegates to the shared
    QuestionSelectionService.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pass1234', role='admin', is_staff=True
        )
        self.client.force_authenticate(user=self.admin)

        self.category = ExamCategory.objects.create(name="Loksewa")
        self.exam = Exam.objects.create(category=self.category, name="Kharidar")
        self.paper = Paper.objects.create(exam=self.exam, name="Paper I")
        self.subject = Subject.objects.create(paper=self.paper, name="General Knowledge")
        self.chapter = Chapter.objects.create(subject=self.subject, title="History")
        self.topic = Topic.objects.create(chapter=self.chapter, name="Ancient Nepal")

        self.approved_ids = []
        for i in range(3):
            q = Question.objects.create(
                topic=self.topic, text=f"Approved easy Q{i}", question_type='mcq',
                status='approved', difficulty='easy',
                option_a='A', option_b='B', option_c='C', option_d='D', correct_option='A',
            )
            self.approved_ids.append(q.id)

        # Must never be selectable: not approved.
        self.draft_question = Question.objects.create(
            topic=self.topic, text="Draft question", question_type='mcq',
            status='draft', difficulty='easy',
            option_a='A', option_b='B', option_c='C', option_d='D', correct_option='A',
        )

        self.qset = QuestionSet.objects.create(
            name="Ancient Nepal Practice Set",
            category=self.category,
            exam=self.exam,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic,
            set_type='topic',
            total_questions=2,
            difficulty_distribution={'easy': 2, 'medium': 0, 'hard': 0},
        )

    def test_generate_selects_only_approved_questions_via_current_hierarchy(self):
        url = f"/api/admin/question-sets/{self.qset.id}/generate/"
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['generated_count'], 2)
        preview_ids = {q['id'] for q in response.data['preview_questions']}
        self.assertTrue(preview_ids.issubset(set(self.approved_ids)))
        self.assertNotIn(self.draft_question.id, preview_ids)

    def test_generate_reports_shortfall_without_crashing(self):
        self.qset.difficulty_distribution = {'easy': 2, 'medium': 5, 'hard': 0}
        self.qset.total_questions = 7
        self.qset.save()

        url = f"/api/admin/question-sets/{self.qset.id}/generate/"
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
