"""Covers archive_expired_examinations() - the periodic job that closes out
'published' exams once their end_time is well behind them, since nothing
else in the app ever moves an exam out of 'published' on its own."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Examination
from exams.lifecycle_service import archive_expired_examinations, ARCHIVE_GRACE_PERIOD_HOURS


class ArchiveExpiredExaminationsTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='Public Service')
        self.exam_level = Exam.objects.create(category=self.category, name='Section Officer')

    def _make_exam(self, **kwargs):
        defaults = dict(
            title='Test Exam', category=self.category, exam=self.exam_level,
            exam_type='mock', status='published',
        )
        defaults.update(kwargs)
        return Examination.objects.create(**defaults)

    def test_archives_exam_past_grace_period(self):
        exam = self._make_exam(
            end_time=timezone.now() - timedelta(hours=ARCHIVE_GRACE_PERIOD_HOURS + 1),
        )

        archived = archive_expired_examinations()

        self.assertEqual(len(archived), 1)
        self.assertEqual(archived[0]['id'], exam.id)
        exam.refresh_from_db()
        self.assertEqual(exam.status, 'archived')

    def test_does_not_archive_within_grace_period(self):
        exam = self._make_exam(
            end_time=timezone.now() - timedelta(hours=1),
        )

        archived = archive_expired_examinations()

        self.assertEqual(archived, [])
        exam.refresh_from_db()
        self.assertEqual(exam.status, 'published')

    def test_does_not_archive_exam_with_no_end_time(self):
        exam = self._make_exam(end_time=None)

        archived = archive_expired_examinations()

        self.assertEqual(archived, [])
        exam.refresh_from_db()
        self.assertEqual(exam.status, 'published')

    def test_does_not_touch_non_published_exams(self):
        exam = self._make_exam(
            status='draft', end_time=timezone.now() - timedelta(hours=ARCHIVE_GRACE_PERIOD_HOURS + 1),
        )

        archived = archive_expired_examinations()

        self.assertEqual(archived, [])
        exam.refresh_from_db()
        self.assertEqual(exam.status, 'draft')
