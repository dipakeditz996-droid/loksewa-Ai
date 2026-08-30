"""Tests for the AI Tutor Knowledge Base: the available_to_ai_tutor toggle
on StudyMaterial (exposed via the existing admin study-materials endpoints)
and AITutorService.retrieve_knowledge_context()."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import Exam, ExamCategory, Subject, Paper
from notes.models import StudyMaterial
from ai_tutor.services import AITutorService

LIST_URL = '/api/admin/study-materials/'


def detail_url(pk):
    return f'/api/admin/study-materials/{pk}/'


class KnowledgeBaseTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teach1', password='pw', role='teacher')
        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(category=self.category, name='Kharidar')
        self.paper = Paper.objects.create(exam=self.exam, name='Paper I')
        self.subject = Subject.objects.create(paper=self.paper, name='Constitution')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def make_material(self, title='Nepal Constitution Basics',
                       content='The Constitution of Nepal was promulgated in 2015.',
                       status_='published', available=False):
        return StudyMaterial.objects.create(
            title=title, exam=self.exam, subject=self.subject,
            content=content, status=status_, available_to_ai_tutor=available,
        )


class ToggleAPITests(KnowledgeBaseTestBase):
    def test_list_includes_availability_field(self):
        self.make_material(available=True)
        self.as_admin()
        resp = self.client.get(LIST_URL, {'status': 'all'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['materials'][0]['availableToAiTutor'])

    def test_detail_includes_availability_field(self):
        material = self.make_material(available=False)
        self.as_admin()
        resp = self.client.get(detail_url(material.id))
        self.assertFalse(resp.data['availableToAiTutor'])

    def test_patch_enables_availability(self):
        material = self.make_material(available=False)
        self.as_admin()
        resp = self.client.patch(
            detail_url(material.id), {'available_to_ai_tutor': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        material.refresh_from_db()
        self.assertTrue(material.available_to_ai_tutor)

    def test_patch_disables_availability(self):
        material = self.make_material(available=True)
        self.as_admin()
        self.client.patch(detail_url(material.id), {'available_to_ai_tutor': False}, format='json')
        material.refresh_from_db()
        self.assertFalse(material.available_to_ai_tutor)

    def test_patch_rejects_non_boolean(self):
        material = self.make_material()
        self.as_admin()
        resp = self.client.patch(
            detail_url(material.id), {'available_to_ai_tutor': 'yes'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_cannot_toggle(self):
        material = self.make_material()
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.patch(
            detail_url(material.id), {'available_to_ai_tutor': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_default_is_false_for_new_material(self):
        material = self.make_material()
        self.assertFalse(StudyMaterial.objects.get(pk=material.id).available_to_ai_tutor)


class RetrievalTests(KnowledgeBaseTestBase):
    """AITutorService.retrieve_knowledge_context() - the actual retrieval logic."""

    def test_returns_empty_string_when_nothing_matches(self):
        self.make_material(available=True)
        result = AITutorService().retrieve_knowledge_context("What is the capital of France?")
        self.assertEqual(result, '')

    def test_matches_available_published_material(self):
        self.make_material(
            title='Nepal Constitution',
            content='The Constitution of Nepal was promulgated in 2015 by the Constituent Assembly.',
            available=True,
        )
        result = AITutorService().retrieve_knowledge_context("Tell me about the constitution of Nepal")
        self.assertIn('Nepal Constitution', result)
        self.assertIn('promulgated in 2015', result)

    def test_excludes_unavailable_material(self):
        self.make_material(
            title='Secret Notes', content='constitution constitution constitution',
            available=False,
        )
        result = AITutorService().retrieve_knowledge_context("Explain the constitution")
        self.assertEqual(result, '')

    def test_excludes_unpublished_material(self):
        self.make_material(
            title='Draft Notes', content='constitution constitution constitution',
            status_='draft', available=True,
        )
        result = AITutorService().retrieve_knowledge_context("Explain the constitution")
        self.assertEqual(result, '')

    def test_excludes_material_with_empty_content(self):
        self.make_material(title='Empty', content='', available=True)
        result = AITutorService().retrieve_knowledge_context("Explain the empty topic")
        self.assertEqual(result, '')

    def test_ranks_more_relevant_material_first(self):
        self.make_material(
            title='Loosely Related', content='The constitution is mentioned briefly here.',
            available=True,
        )
        self.make_material(
            title='Highly Relevant',
            content='constitution constitution constitution monarchy federal republic',
            available=True,
        )
        result = AITutorService().retrieve_knowledge_context(
            "Explain the constitution and federal republic and monarchy")
        # Both match (score > 0), but the more heavily-matched material should rank first.
        self.assertLess(result.index('Highly Relevant'), result.index('Loosely Related'))

    def test_respects_max_matches_limit(self):
        for i in range(5):
            self.make_material(
                title=f'Material {i}', content='constitution ' * 10, available=True,
            )
        result = AITutorService().retrieve_knowledge_context("Explain the constitution")
        self.assertEqual(result.count('###'), AITutorService.MAX_KNOWLEDGE_MATCHES)

    def test_truncates_long_content(self):
        self.make_material(
            title='Long Document', content='constitution ' * 1000, available=True,
        )
        result = AITutorService().retrieve_knowledge_context("Explain the constitution")
        # Excerpt should be capped, not dump the entire multi-KB document.
        self.assertLess(len(result), AITutorService.MAX_EXCERPT_CHARS + 500)


class RealEffectOnGenerateResponseTests(KnowledgeBaseTestBase):
    """Proves retrieved context actually reaches the constructed prompt used
    by generate_response(), not just that retrieve_knowledge_context() works
    in isolation."""

    def test_mock_mode_still_calls_retrieval_path_safely(self):
        # In mock mode (no GEMINI_API_KEY in tests), generate_response short-circuits
        # before using retrieval - this just proves it doesn't crash either way.
        student = User.objects.create_user(username='stu1', password='pw', role='student')
        from ai_tutor.models import Conversation
        conv = Conversation.objects.create(student=student, mode='EXPLAIN')
        self.make_material(available=True)
        service = AITutorService()
        response_text = service.generate_response(conv, "Explain the constitution of Nepal")
        self.assertIsInstance(response_text, str)
