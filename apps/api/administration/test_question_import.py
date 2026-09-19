"""Tests for the admin Question Bank Excel/CSV bulk-import pipeline
(administration/import_views.py: QuestionImportViewSet), covering upload
validation, duplicate detection, commit safety, optional Collection/Tag
assignment, and permission enforcement."""
import io

from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Tag
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question, QuestionCollection
from .models import CSVImport

UPLOAD_URL = '/api/admin/questions/import/upload/'
TEMPLATE_URL = '/api/admin/questions/import/template/'


def ai_fill_url(import_id):
    return f'/api/admin/questions/import/{import_id}/ai-fill/'


def commit_url(import_id):
    return f'/api/admin/questions/import/{import_id}/commit/'


def error_report_url(import_id):
    return f'/api/admin/questions/import/{import_id}/error-report/'


def make_xlsx(rows, headers=None):
    """Build an in-memory .xlsx upload matching the admin Excel template."""
    headers = headers or ['SN', 'Questions', 'Mark', 'Option A', 'Option B', 'Option C', 'Option D',
                           'Correct Answer', 'Explanation', 'Hint']
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    buf.name = 'questions.xlsx'
    return buf


class QuestionImportTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(username='teacher1', password='pw', role='teacher')
        self.student = User.objects.create_user(username='stu1', password='pw', role='student')

        category = ExamCategory.objects.create(name='Loksewa')
        exam = Exam.objects.create(category=category, name='Kharidar')
        paper = Paper.objects.create(exam=exam, name='First Paper')
        subject = Subject.objects.create(paper=paper, name='General Knowledge')
        chapter = Chapter.objects.create(subject=subject, title='Geography')
        self.topic = Topic.objects.create(chapter=chapter, name='Mountains')

    def upload(self, rows, **extra):
        payload = {'file': make_xlsx(rows), 'topic': self.topic.id, 'question_type': 'mcq', 'difficulty': 'medium'}
        payload.update(extra)
        return self.client.post(UPLOAD_URL, payload, format='multipart')


class PermissionTests(QuestionImportTestBase):
    def test_upload_anonymous_denied(self):
        response = self.upload([[1, 'Q1', 1, 'A', 'B', 'C', 'D', 'A', '', '']])
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_student_denied(self):
        self.client.force_authenticate(user=self.student)
        response = self.upload([[1, 'Q1', 1, 'A', 'B', 'C', 'D', 'A', '', '']])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_unauthorized_teacher_denied(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.upload([[1, 'Q1', 1, 'A', 'B', 'C', 'D', 'A', '', '']])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_admin_allowed(self):
        self.client.force_authenticate(user=self.admin)
        response = self.upload([[1, 'Q1', 1, 'A', 'B', 'C', 'D', 'A', '', '']])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_template_requires_admin(self):
        self.assertEqual(self.client.get(TEMPLATE_URL).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(TEMPLATE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', response['Content-Type'])


class UploadValidationTests(QuestionImportTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_valid_row_accepted(self):
        response = self.upload([
            [1, 'What is the capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar',
             'A', 'Kathmandu is the capital.', 'Think of the biggest city.'],
        ])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['valid_rows'], 1)
        self.assertEqual(response.data['error_rows'], 0)

    def test_empty_question_rejected(self):
        response = self.upload([
            ['', '', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Question' in e for e in row['errors']))

    def test_missing_option_held_incomplete_not_error(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', '', 'Biratnagar', 'A', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'incomplete')
        self.assertIn('options', row['missing'])

    def test_invalid_correct_answer_rejected(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'E', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('is invalid. Expected A, B, C or D' in e for e in row['errors']))

    def test_correct_answer_lowercase_normalized(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'a', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'valid')

    def test_invalid_mark_rejected(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 'abc', 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Mark must be numeric' in e for e in row['errors']))

    def test_duplicate_question_in_db_detected(self):
        Question.objects.create(
            topic=self.topic, question_type='mcq', status='approved', text='Capital of Nepal?',
            option_a='Kathmandu', option_b='Pokhara', option_c='Lalitpur', option_d='Biratnagar',
            correct_option='A',
        )
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['status'], 'duplicate')

    def test_duplicate_rows_within_same_file_detected(self):
        row_data = [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', '']
        response = self.upload([row_data, [2] + row_data[1:]])
        self.assertEqual(response.data['report_data'][0]['status'], 'valid')
        self.assertEqual(response.data['report_data'][1]['status'], 'duplicate')

    def test_sn_used_for_display_only(self):
        response = self.upload([
            [999, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        row = response.data['report_data'][0]
        self.assertEqual(row['sn'], '999')
        self.assertEqual(row['row_index'], 1)

    def test_wrong_file_type_rejected(self):
        self.client.force_authenticate(user=self.admin)
        bad_file = io.BytesIO(b'not an excel file')
        bad_file.name = 'questions.txt'
        response = self.client.post(UPLOAD_URL, {
            'file': bad_file, 'topic': self.topic.id, 'question_type': 'mcq', 'difficulty': 'medium',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('valid Excel', response.data['error'])


class CommitTests(QuestionImportTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_commit_only_imports_valid_rows(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
            [2, 'Bad row', 1, 'A', 'B', '', 'D', 'E', '', ''],
        ])
        import_id = response.data['import_id']
        self.assertEqual(response.data['valid_rows'], 1)

        commit_response = self.client.post(commit_url(import_id))
        self.assertEqual(commit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(commit_response.data['imported_count'], 1)
        self.assertEqual(Question.objects.filter(text='Capital of Nepal?').count(), 1)
        self.assertFalse(Question.objects.filter(text='Bad row').exists())

    def test_commit_returns_created_question_ids(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        commit_response = self.client.post(commit_url(response.data['import_id']))
        created = Question.objects.get(text='Capital of Nepal?')
        self.assertEqual(commit_response.data['question_ids'], [created.pk])

    def test_commit_sets_approved_status(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        self.client.post(commit_url(response.data['import_id']))
        q = Question.objects.get(text='Capital of Nepal?')
        self.assertEqual(q.status, 'approved')
        self.assertIsNotNone(q.question_id)

    def test_commit_persists_explanation_and_hint(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 2.5, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A',
             'It is the capital city.', 'Think biggest city.'],
        ])
        self.client.post(commit_url(response.data['import_id']))
        q = Question.objects.get(text='Capital of Nepal?')
        self.assertEqual(q.explanation, 'It is the capital city.')
        self.assertEqual(q.hint, 'Think biggest city.')
        self.assertEqual(q.marks, 2.5)

    def test_commit_does_not_create_duplicate_questions(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        self.client.post(commit_url(response.data['import_id']))
        before = Question.objects.count()

        # Re-uploading the same content is now flagged as a duplicate and
        # excluded from commit, so no second row is ever created.
        second = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', ''],
        ])
        self.assertEqual(second.data['valid_rows'], 0)
        self.client.post(commit_url(second.data['import_id']))
        self.assertEqual(Question.objects.count(), before)

    def test_commit_assigns_optional_collection(self):
        collection = QuestionCollection.objects.create(name='PSC Important', created_by=self.admin)
        response = self.upload(
            [[1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', '']],
            collection_id=collection.id,
        )
        self.client.post(commit_url(response.data['import_id']))
        q = Question.objects.get(text='Capital of Nepal?')
        self.assertIn(collection, q.collections.all())

    def test_commit_assigns_optional_tags(self):
        tag = Tag.objects.create(name='PYQ', slug='pyq')
        response = self.upload(
            [[1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', '']],
            tag_ids=[tag.id],
        )
        self.client.post(commit_url(response.data['import_id']))
        q = Question.objects.get(text='Capital of Nepal?')
        self.assertIn(tag, q.tag_objects.all())

    def test_collection_deletion_does_not_delete_questions(self):
        collection = QuestionCollection.objects.create(name='Temp Collection', created_by=self.admin)
        response = self.upload(
            [[1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'A', 'x', '']],
            collection_id=collection.id,
        )
        self.client.post(commit_url(response.data['import_id']))
        collection.delete()
        self.assertTrue(Question.objects.filter(text='Capital of Nepal?').exists())

    def test_large_batch_all_valid_rows_committed(self):
        rows = [[i, f'Question number {i}?', 1, 'A', 'B', 'C', 'D', 'A', 'x', ''] for i in range(1, 51)]
        response = self.upload(rows)
        self.assertEqual(response.data['valid_rows'], 50)
        commit_response = self.client.post(commit_url(response.data['import_id']))
        self.assertEqual(commit_response.data['imported_count'], 50)

    def test_error_report_download(self):
        response = self.upload([
            [1, 'Capital of Nepal?', 1, 'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'E', 'x', ''],
        ])
        report_response = self.client.get(error_report_url(response.data['import_id']))
        self.assertEqual(report_response.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', report_response['Content-Type'])
