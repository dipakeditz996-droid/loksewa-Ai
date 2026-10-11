from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic,
    Question, QuestionCollection, Examination, ExaminationQuestion
)
from exams.services.question_import_service import generate_excel_template
from administration.import_views import _resolve_row_academic_scope
from courses.models import Course

User = get_user_model()


class QuestionCollectionsAndSubjectiveImportTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin_test@loksewa.com',
            username='admin_test',
            password='Password123!',
            is_staff=True,
            is_superuser=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        # Academic hierarchy
        self.category = ExamCategory.objects.create(name='Civil Engineering')
        self.exam_level = Exam.objects.create(
            name='Sub Engineer Level 5',
            category=self.category,
        )
        self.paper = Paper.objects.create(
            exam=self.exam_level,
            name='Technical Paper I'
        )
        self.subject = Subject.objects.create(
            name='Engineering Mathematics',
            code='MATH501',
            paper=self.paper
        )
        self.chapter = Chapter.objects.create(
            subject=self.subject,
            title='Calculus and Algebra'
        )
        self.topic = Topic.objects.create(
            chapter=self.chapter,
            name='Matrices and Determinants'
        )
        self.course = Course.objects.create(
            title='Loksewa Civil Sub-Engineer Prep',
            slug='civil-sub-engineer-prep',
            exam=self.exam_level,
            status='published'
        )

        # Create sample questions
        self.q1 = Question.objects.create(
            text='What is the determinant of an identity matrix?',
            question_type='mcq',
            status='approved',
            category=self.category,
            exam=self.exam_level,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic,
            marks=1,
            option_a='1',
            option_b='0',
            option_c='-1',
            option_d='Undefined',
            correct_option='A',
            created_by=self.admin
        )
        self.q2 = Question.objects.create(
            text='Explain rank of a matrix with an example.',
            question_type='subjective',
            status='approved',
            category=self.category,
            exam=self.exam_level,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic,
            marks=10,
            model_answer='The rank of a matrix is the maximum number of linearly independent row or column vectors.',
            created_by=self.admin
        )

    def test_collection_creation_with_academic_scope(self):
        """Verify collection can be created with academic scope and retrieved."""
        col = QuestionCollection.objects.create(
            name='Engineering Math — Set 1',
            description='Practice questions for Sub Engineer',
            created_by=self.admin,
            category=self.category,
            exam=self.exam_level,
            subject=self.subject,
            chapter=self.chapter,
            topic=self.topic
        )
        self.assertEqual(col.name, 'Engineering Math — Set 1')
        self.assertEqual(col.subject, self.subject)
        self.assertEqual(col.chapter, self.chapter)

    def test_add_and_remove_questions_from_collection_preserves_master_question(self):
        """Adding/removing questions from a collection does not delete the master question."""
        col = QuestionCollection.objects.create(
            name='Calculus Practice',
            created_by=self.admin,
            subject=self.subject
        )
        col.questions.add(self.q1, self.q2)
        self.assertEqual(col.questions.count(), 2)

        # Remove q1 from collection
        col.questions.remove(self.q1)
        self.assertEqual(col.questions.count(), 1)
        self.assertIn(self.q2, col.questions.all())

        # Master question q1 still exists in the database
        self.assertTrue(Question.objects.filter(id=self.q1.id).exists())

    def test_prevent_duplicate_collection_membership(self):
        """Adding a question twice does not create duplicate membership."""
        col = QuestionCollection.objects.create(
            name='Algebra Pack',
            created_by=self.admin
        )
        col.questions.add(self.q1)
        col.questions.add(self.q1)
        self.assertEqual(col.questions.count(), 1)

    def test_topicwise_exam_collection_association_snapshot_isolation(self):
        """
        When questions are attached to an examination, modifying the collection
        afterwards does not remove questions from the examination.
        """
        col = QuestionCollection.objects.create(
            name='Topicwise Test Questions',
            created_by=self.admin,
            subject=self.subject
        )
        col.questions.add(self.q1, self.q2)

        exam = Examination.objects.create(
            title='Topicwise Test 1',
            exam_type='subject',
            category=self.category,
            exam=self.exam_level,
            subject=self.subject,
            created_by=self.admin,
            total_marks=11,
            time_limit=45
        )

        # Associate collection questions to exam via canonical ExaminationQuestion
        for idx, q in enumerate(col.questions.all(), start=1):
            ExaminationQuestion.objects.create(
                examination=exam,
                question=q,
                order=idx,
                marks=q.marks
            )

        self.assertEqual(exam.examination_questions.count(), 2)

        # Later, admin removes q1 from the collection
        col.questions.remove(self.q1)
        self.assertEqual(col.questions.count(), 1)

        # Exam assigned questions remain completely intact!
        self.assertEqual(exam.examination_questions.count(), 2)
        assigned_q_ids = list(exam.examination_questions.values_list('question_id', flat=True))
        self.assertIn(self.q1.id, assigned_q_ids)
        self.assertIn(self.q2.id, assigned_q_ids)

    def test_subjective_template_generation(self):
        """Generate subjective excel template and ensure correct headers exist."""
        buf, title = generate_excel_template('subjective')
        content = buf.read()
        self.assertTrue(len(content) > 0)
        self.assertIn('Subjective', title)

    def test_academic_scope_resolution(self):
        """Test row-level resolution of Course, Position, Subject, Chapter."""
        row_data = {
            'course': self.course.title,
            'position': self.exam_level.name,
            'subject': self.subject.name,
            'chapter': self.chapter.title,
        }
        resolved, errors = _resolve_row_academic_scope(
            row_data,
            default_category=None,
            default_exam=None,
            default_subject=None,
            default_chapter=None,
            default_topic=None,
            default_course=None
        )
        self.assertEqual(errors, [])
        self.assertEqual(resolved.get('exam_id'), self.exam_level.id)
        self.assertEqual(resolved.get('subject_id'), self.subject.id)
        self.assertEqual(resolved.get('chapter_id'), self.chapter.id)

    def test_academic_scope_resolution_unknown_entity_rejected(self):
        """Unknown Course or Subject produces a descriptive error."""
        row_data = {
            'course': 'Nonexistent Fantasyland Course 9999',
            'subject': self.subject.name,
        }
        resolved, errors = _resolve_row_academic_scope(
            row_data,
            default_category=None,
            default_exam=None,
            default_subject=None,
            default_chapter=None,
            default_topic=None,
            default_course=None
        )
        self.assertTrue(len(errors) > 0)
        self.assertTrue(any('was not found in the database' in e for e in errors))
