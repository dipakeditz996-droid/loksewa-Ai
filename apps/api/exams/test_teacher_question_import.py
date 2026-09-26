import io
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Notification
from courses.models import Course, TeacherCourseAssignment
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
from exams.selection_service import QuestionSelectionService
from administration.models import CSVImport

TEMPLATE_URL = '/api/teacher/questions/import/template/'
HIERARCHY_URL = '/api/teacher/questions/import/hierarchy/'
UPLOAD_URL = '/api/teacher/questions/import/upload/'


def commit_url(import_id):
    return f'/api/teacher/questions/import/{import_id}/commit/'


def error_report_url(import_id):
    return f'/api/teacher/questions/import/{import_id}/error-report/'


def make_xlsx(rows, headers=None):
    """Build an in-memory .xlsx upload matching the canonical Excel template."""
    headers = headers or [
        'SN', 'Questions', 'Mark', 'Option A', 'Option B', 'Option C', 'Option D',
        'Correct Answer', 'Explanation', 'Hint'
    ]
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    buf.name = 'teacher_questions.xlsx'
    return buf


class TeacherQuestionImportTestBase(APITestCase):
    def setUp(self):
        # Users
        self.admin = User.objects.create_user(username='admin_user', password='pw', role='admin', is_staff=True)
        self.teacher_a = User.objects.create_user(username='teacher_a', password='pw', role='teacher')
        self.teacher_b = User.objects.create_user(username='teacher_b', password='pw', role='teacher')
        self.student = User.objects.create_user(username='student_user', password='pw', role='student')

        # Academic Hierarchy
        self.category = ExamCategory.objects.create(name='PSC Exams')
        self.level_5 = Exam.objects.create(category=self.category, name='5th Level')
        self.prep_civil = Exam.objects.create(category=self.category, parent=self.level_5, name='Civil Engineering')
        self.prep_computer = Exam.objects.create(category=self.category, parent=self.level_5, name='Computer Engineering')

        # Course A for Civil (assigned to teacher_a)
        self.course_civil = Course.objects.create(title='Civil 5th Prep', slug='civil-5th', exam=self.prep_civil)
        TeacherCourseAssignment.objects.create(teacher=self.teacher_a, course=self.course_civil)

        # Course B for Computer (assigned to teacher_b)
        self.course_computer = Course.objects.create(title='Computer 5th Prep', slug='computer-5th', exam=self.prep_computer)
        TeacherCourseAssignment.objects.create(teacher=self.teacher_b, course=self.course_computer)

        # Papers & Subjects under Civil
        self.paper_civil = Paper.objects.create(exam=self.prep_civil, name='First Paper')
        self.subject_survey = Subject.objects.create(paper=self.paper_civil, name='Surveying', code='SURV101')
        self.chapter_leveling = Chapter.objects.create(subject=self.subject_survey, title='Leveling')
        self.topic_autolevel = Topic.objects.create(chapter=self.chapter_leveling, name='Auto Level')

        # Papers & Subjects under Computer
        self.paper_computer = Paper.objects.create(exam=self.prep_computer, name='Technical Paper')
        self.subject_dsa = Subject.objects.create(paper=self.paper_computer, name='Data Structures', code='DSA101')

    def upload_for_teacher(self, user, rows, subject_id=None, **extra):
        self.client.force_authenticate(user=user)
        payload = {
            'file': make_xlsx(rows),
            'subject_id': subject_id or self.subject_survey.id,
            'question_type': 'mcq',
            'difficulty': 'medium',
        }
        payload.update(extra)
        return self.client.post(UPLOAD_URL, payload, format='multipart')


class SecurityAndPermissionTests(TeacherQuestionImportTestBase):
    def test_anonymous_access_denied(self):
        res = self.client.get(TEMPLATE_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        res_up = self.client.post(UPLOAD_URL, {'subject_id': self.subject_survey.id})
        self.assertEqual(res_up.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_access_denied(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get(TEMPLATE_URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        res_up = self.client.post(UPLOAD_URL, {'subject_id': self.subject_survey.id})
        self.assertEqual(res_up.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_download_template(self):
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get(TEMPLATE_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', res['Content-Type'])

    def test_teacher_hierarchy_scoped_to_assigned_courses(self):
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get(HIERARCHY_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Teacher A is assigned to Civil Engineering under 5th Level
        data = res.data
        self.assertTrue(len(data) > 0)
        positions = data[0]['positions']
        # Find 5th Level
        pos_5 = next((p for p in positions if p['id'] == self.level_5.id), None)
        self.assertIsNotNone(pos_5)
        # Should contain Civil Engineering child
        child_ids = [c['id'] for c in pos_5['children']]
        self.assertIn(self.prep_civil.id, child_ids)
        # Should NOT contain Computer Engineering child (Teacher A is not assigned to it)
        self.assertNotIn(self.prep_computer.id, child_ids)

    def test_teacher_cannot_upload_into_unauthorized_subject(self):
        # Teacher A tries to upload questions into Data Structures (Computer Engineering)
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[[1, 'What is a stack?', 1, 'LIFO', 'FIFO', 'Random', 'None', 'A', '', '']],
            subject_id=self.subject_dsa.id,
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not authorized', res.data['error'].lower())

    def test_teacher_a_cannot_commit_teacher_b_import(self):
        # Teacher B creates an import
        res_b = self.upload_for_teacher(
            user=self.teacher_b,
            rows=[[1, 'What is a stack?', 1, 'LIFO', 'FIFO', 'Random', 'None', 'A', '', '']],
            subject_id=self.subject_dsa.id,
        )
        import_id = res_b.data['import_id']

        # Teacher A tries to commit Teacher B's import
        self.client.force_authenticate(user=self.teacher_a)
        res_steal = self.client.post(commit_url(import_id))
        self.assertEqual(res_steal.status_code, status.HTTP_403_FORBIDDEN)


class UploadValidationTests(TeacherQuestionImportTestBase):
    def test_valid_row_with_empty_explanation_and_hint_accepted(self):
        """Explanation and Hint must be OPTIONAL."""
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'What is the benchmark in surveying?', 1, 'Reference point', 'Telescope', 'Chain', 'Compass',
                 'A', '', ''],
            ]
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['valid_rows'], 1)
        self.assertEqual(res.data['error_rows'], 0)
        report_row = res.data['report_data'][0]
        self.assertEqual(report_row['status'], 'valid')
        self.assertEqual(len(report_row['errors']), 0)

    def test_valid_row_with_explanation_and_hint_accepted(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'What is the benchmark in surveying?', 1.5, 'Reference point', 'Telescope', 'Chain', 'Compass',
                 'A', 'Benchmark is a fixed point of known elevation.', 'Look for elevation reference.'],
            ]
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['valid_rows'], 1)

    def test_missing_question_text_rejected(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, '', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
            ]
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['valid_rows'], 0)
        self.assertEqual(res.data['error_rows'], 1)
        row = res.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Question is required' in e for e in row['errors']))

    def test_missing_option_rejected(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Surveying question?', 1, 'Ref', '', 'Chain', 'Compass', 'A', '', ''],
            ]
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['valid_rows'], 0)
        row = res.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Option B is required' in e for e in row['errors']))

    def test_missing_correct_answer_rejected(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Surveying question?', 1, 'Ref', 'Tel', 'Chain', 'Compass', '', '', ''],
            ]
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['valid_rows'], 0)
        row = res.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Correct Answer' in e for e in row['errors']))

    def test_invalid_correct_answer_rejected(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Surveying question?', 1, 'Ref', 'Tel', 'Chain', 'Compass', 'Z', '', ''],
            ]
        )
        row = res.data['report_data'][0]
        self.assertEqual(row['status'], 'error')
        self.assertTrue(any('Expected A, B, C or D' in e for e in row['errors']))

    def test_correct_answer_normalization(self):
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Question 1', 1, 'A', 'B', 'C', 'D', 'b', '', ''],
                [2, 'Question 2', 1, 'A', 'B', 'C', 'D', 'Option C', '', ''],
                [3, 'Question 3', 1, 'A', 'B', 'C', 'D', '1', '', ''],
                [4, 'Question 4', 1, 'A', 'B', 'C', 'D', 'D.', '', ''],
            ]
        )
        self.assertEqual(res.data['valid_rows'], 4)
        self.assertEqual(res.data['report_data'][0]['data']['correct_answer'], 'B')
        self.assertEqual(res.data['report_data'][1]['data']['correct_answer'], 'C')
        self.assertEqual(res.data['report_data'][2]['data']['correct_answer'], 'A')
        self.assertEqual(res.data['report_data'][3]['data']['correct_answer'], 'D')

    def test_duplicate_question_detected(self):
        # Create an existing question in database
        Question.objects.create(
            subject=self.subject_survey,
            question_type='mcq',
            status='approved',
            text='What is contour line?',
            option_a='Line of equal elevation',
            option_b='Line of slope',
            option_c='Line of latitude',
            option_d='Line of longitude',
            correct_option='A',
        )

        # Upload duplicate in Excel + duplicate within same Excel file
        res = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'What is contour line?', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
                [2, 'New unique question?', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
                [3, 'New unique question?', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
            ]
        )
        self.assertEqual(res.data['valid_rows'], 1)
        self.assertEqual(res.data['duplicate_rows'], 2)
        self.assertEqual(res.data['report_data'][0]['status'], 'duplicate')
        self.assertEqual(res.data['report_data'][1]['status'], 'valid')
        self.assertEqual(res.data['report_data'][2]['status'], 'duplicate')


class ReviewWorkflowAndSelectionServiceTests(TeacherQuestionImportTestBase):
    def test_full_workflow_from_upload_to_admin_approval_and_selection_service(self):
        # Step 1: Teacher uploads Excel
        res_upload = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'What is the purpose of fly leveling?', 2, 'Check elevation', 'Measure angles', 'Find distance', 'Draw curves',
                 'A', 'Fly leveling is used to connect benchmark.', 'Elevation check.'],
            ],
            chapter_id=self.chapter_leveling.id,
            topic_id=self.topic_autolevel.id,
        )
        self.assertEqual(res_upload.status_code, status.HTTP_200_OK)
        import_id = res_upload.data['import_id']

        # Step 2: Teacher commits valid questions for Admin review
        self.client.force_authenticate(user=self.teacher_a)
        res_commit = self.client.post(commit_url(import_id))
        self.assertEqual(res_commit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_commit.data['imported_count'], 1)
        self.assertEqual(res_commit.data['status'], 'pending_review')

        # Verify Question in database
        q = Question.objects.get(text='What is the purpose of fly leveling?')
        self.assertEqual(q.status, 'pending_review')
        self.assertEqual(q.created_by, self.teacher_a)
        self.assertEqual(q.subject, self.subject_survey)
        self.assertEqual(q.chapter, self.chapter_leveling)
        self.assertEqual(q.topic, self.topic_autolevel)
        self.assertEqual(q.marks, 2.0)
        self.assertTrue(q.question_id.startswith('Q-'))
        self.assertIsNotNone(q.submitted_at)

        # Step 3: CRITICAL MASTER QUESTION BANK RULE
        # Pending question MUST NOT be selectable by QuestionSelectionService!
        svc = QuestionSelectionService()
        base_qs = svc.get_base_queryset()
        self.assertNotIn(q, base_qs)
        self.assertFalse(base_qs.filter(id=q.id).exists())

        # Step 4: Admin reviews and approves the question
        self.client.force_authenticate(user=self.admin)
        res_approve = self.client.post(f'/api/admin/questions/review-queue/{q.id}/approve/')
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)

        # Reload question
        q.refresh_from_db()
        self.assertEqual(q.status, 'approved')
        self.assertEqual(q.reviewed_by, self.admin)
        self.assertIsNotNone(q.reviewed_at)

        # Step 5: Question NOW becomes part of Master Question Bank and selectable!
        base_qs_after = svc.get_base_queryset()
        self.assertIn(q, base_qs_after)

    def test_admin_rejection_workflow(self):
        # Teacher uploads and commits
        res_upload = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Unclear survey question?', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
            ]
        )
        res_commit = self.client.post(commit_url(res_upload.data['import_id']))
        q = Question.objects.get(text='Unclear survey question?')
        self.assertEqual(q.status, 'pending_review')

        # Admin rejects
        self.client.force_authenticate(user=self.admin)
        res_reject = self.client.post(
            f'/api/admin/questions/review-queue/{q.id}/reject/',
            {'reviewer_comment': 'Options are ambiguous and need restructuring.'},
            format='json'
        )
        self.assertEqual(res_reject.status_code, status.HTTP_200_OK)

        q.refresh_from_db()
        self.assertEqual(q.status, 'rejected')
        self.assertEqual(q.reviewer_comment, 'Options are ambiguous and need restructuring.')

        # Teacher views question and sees feedback
        self.client.force_authenticate(user=self.teacher_a)
        res_view = self.client.get(f'/api/teacher/questions/{q.id}/')
        self.assertEqual(res_view.status_code, status.HTTP_200_OK)
        self.assertEqual(res_view.data['reviewer_comment'], 'Options are ambiguous and need restructuring.')

    def test_admin_request_changes_workflow(self):
        # Teacher uploads and commits
        res_upload = self.upload_for_teacher(
            user=self.teacher_a,
            rows=[
                [1, 'Question needing correction?', 1, 'A', 'B', 'C', 'D', 'A', '', ''],
            ]
        )
        res_commit = self.client.post(commit_url(res_upload.data['import_id']))
        q = Question.objects.get(text='Question needing correction?')

        # Admin requests changes
        self.client.force_authenticate(user=self.admin)
        res_req = self.client.post(
            f'/api/admin/questions/review-queue/{q.id}/request-changes/',
            {'reviewer_comment': 'Please fix Option C typo.'},
            format='json'
        )
        self.assertEqual(res_req.status_code, status.HTTP_200_OK)

        q.refresh_from_db()
        self.assertEqual(q.status, 'changes_requested')

        # Teacher can edit in changes_requested status
        self.client.force_authenticate(user=self.teacher_a)
        res_edit = self.client.patch(
            f'/api/teacher/questions/{q.id}/',
            {'option_c': 'Fixed Option C text'},
            format='json'
        )
        self.assertEqual(res_edit.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.option_c, 'Fixed Option C text')

        # Teacher resubmits
        res_resubmit = self.client.post(f'/api/teacher/questions/{q.id}/submit/')
        self.assertEqual(res_resubmit.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.status, 'pending_review')
