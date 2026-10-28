from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from notes.models import StudyMaterial


class AcademicTreeDataSafetyTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='tree_admin', password='pw', role='admin', is_staff=True,
        )
        self.category = ExamCategory.objects.create(name='PSC')
        self.level_exam = Exam.objects.create(category=self.category, name='5th Level')
        self.prep_exam = Exam.objects.create(
            category=self.category, parent=self.level_exam, name='Civil Sub Engineer'
        )
        self.paper = Paper.objects.create(exam=self.prep_exam, name='Paper I')
        self.subject = Subject.objects.create(paper=self.paper, name='Engineering')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Surveying')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Leveling')
        
        self.question = Question.objects.create(
            exam=self.prep_exam,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic,
            text='What is a benchmark in surveying?',
            status='approved'
        )
        self.note = StudyMaterial.objects.create(
            title='Surveying Fundamentals',
            slug='surveying-fundamentals-test',
            exam=self.prep_exam,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic,
        )
        self.client.force_authenticate(user=self.admin)

    def test_delete_root_level_cascades_all_child_nodes_and_questions(self):
        # Admin deletes the root Level ("5th Level")
        response = self.client.delete(
            f'/api/admin/syllabus/exams/{self.level_exam.id}/?force=true'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Root level exam deleted
        self.assertFalse(Exam.objects.filter(pk=self.level_exam.pk).exists())
        # Child preparation exam deleted
        self.assertFalse(Exam.objects.filter(pk=self.prep_exam.pk).exists())
        # All descendant nodes deleted
        self.assertFalse(Paper.objects.filter(pk=self.paper.pk).exists())
        self.assertFalse(Subject.objects.filter(pk=self.subject.pk).exists())
        self.assertFalse(Chapter.objects.filter(pk=self.chapter.pk).exists())
        self.assertFalse(Topic.objects.filter(pk=self.topic.pk).exists())
        # All related questions automatically deleted
        self.assertFalse(Question.objects.filter(pk=self.question.pk).exists())
        # Notes deleted
        self.assertFalse(StudyMaterial.objects.filter(pk=self.note.pk).exists())

    def test_delete_category_cascades_all_nodes_and_questions(self):
        # Admin deletes the root Category ("PSC")
        response = self.client.delete(
            f'/api/admin/syllabus/categories/{self.category.id}/?force=true'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Category deleted
        self.assertFalse(ExamCategory.objects.filter(pk=self.category.pk).exists())
        # Child exams deleted
        self.assertFalse(Exam.objects.filter(pk=self.level_exam.pk).exists())
        self.assertFalse(Exam.objects.filter(pk=self.prep_exam.pk).exists())
        # All descendant nodes deleted
        self.assertFalse(Paper.objects.filter(pk=self.paper.pk).exists())
        self.assertFalse(Subject.objects.filter(pk=self.subject.pk).exists())
        self.assertFalse(Chapter.objects.filter(pk=self.chapter.pk).exists())
        self.assertFalse(Topic.objects.filter(pk=self.topic.pk).exists())
        # All related questions automatically deleted
        self.assertFalse(Question.objects.filter(pk=self.question.pk).exists())
