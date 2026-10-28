from django.test import TestCase
from django.contrib.auth import get_user_model
from exams.models import Examination, ExamCategory, Exam
from administration.exam_serializers import ExaminationSerializer

User = get_user_model()

class SubjectiveExamConfigTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser('admin_user', 'admin@example.com', 'pass1234')
        self.category = ExamCategory.objects.create(name='Test Category')
        self.position = Exam.objects.create(name='Test Position', category=self.category)

    def test_subjective_exam_serializer_forces_randomize_false_and_handles_missing_marks_per_question(self):
        """Subjective examinations must not have randomization and do not require marks_per_question in payload."""
        payload = {
            'title': 'Subjective Test Exam',
            'exam_type': 'subjective',
            'objective_category': 'model',
            'category': self.category.id,
            'exam': self.position.id,
            'time_limit': 120,
            'total_marks': 100,
            'passing_marks': 40,
            'randomize_questions': True,  # Overridden to False for subjective
            'randomize_options': True,
        }
        serializer = ExaminationSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        exam = serializer.save(created_by=self.user)
        self.assertFalse(exam.randomize_questions)
        self.assertFalse(exam.randomize_options)
        self.assertEqual(exam.marks_per_question, 1.0)
        self.assertEqual(exam.total_marks, 100)

    def test_objective_exam_preserves_marks_per_question_and_randomize_questions(self):
        """Objective exams retain their marks_per_question and randomize options."""
        payload = {
            'title': 'Objective Test Exam',
            'exam_type': 'mock',
            'objective_category': 'model',
            'category': self.category.id,
            'exam': self.position.id,
            'time_limit': 45,
            'total_marks': 50,
            'passing_marks': 20,
            'marks_per_question': 2.5,
            'randomize_questions': True,
            'randomize_options': True,
        }
        serializer = ExaminationSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        exam = serializer.save(created_by=self.user)
        self.assertTrue(exam.randomize_questions)
        self.assertTrue(exam.randomize_options)
        self.assertEqual(exam.marks_per_question, 2.5)
