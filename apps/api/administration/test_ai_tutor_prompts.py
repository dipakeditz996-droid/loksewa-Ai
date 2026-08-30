"""Tests for the AI Tutor Prompts admin endpoint and its real effect on
AITutorService.construct_system_prompt()."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings
from ai_tutor.models import Conversation, PromptTemplate
from ai_tutor.services import AITutorService

URL = '/api/admin/ai-tutor/prompts/'


class PromptsTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)


class PermissionTests(PromptsTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)


class GetTests(PromptsTestBase):
    def test_seeds_all_five_modes_with_current_defaults(self):
        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(set(resp.data['modes'].keys()),
                          {'EXPLAIN', 'PRACTICE', 'REVISION', 'EXAM_STRATEGY', 'STUDY_PLAN'})
        self.assertEqual(
            resp.data['modes']['EXPLAIN']['promptText'],
            PromptTemplate.MODE_DEFAULTS['EXPLAIN'],
        )
        self.assertIn('Loksewa preparation in Nepal', resp.data['basePrompt'])

    def test_seeding_actually_creates_rows(self):
        self.assertEqual(PromptTemplate.objects.count(), 0)
        self.as_admin()
        self.client.get(URL)
        self.assertEqual(PromptTemplate.objects.count(), 5)


class PutTests(PromptsTestBase):
    def test_updates_base_prompt(self):
        self.as_admin()
        resp = self.client.put(URL, {'basePrompt': 'Custom base instructions.'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(AdminSettings.get_settings().ai_tutor_base_prompt, 'Custom base instructions.')

    def test_updates_a_single_mode(self):
        self.as_admin()
        resp = self.client.put(URL, {'modes': {'EXPLAIN': 'New explain instructions.'}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            PromptTemplate.objects.get(mode='EXPLAIN').prompt_text,
            'New explain instructions.',
        )

    def test_updating_one_mode_does_not_touch_others(self):
        self.as_admin()
        self.client.get(URL)  # seed all 5
        self.client.put(URL, {'modes': {'PRACTICE': 'Changed.'}}, format='json')
        self.assertEqual(
            PromptTemplate.objects.get(mode='REVISION').prompt_text,
            PromptTemplate.MODE_DEFAULTS['REVISION'],
        )

    def test_rejects_unknown_mode(self):
        self.as_admin()
        resp = self.client.put(URL, {'modes': {'NOT_A_REAL_MODE': 'x'}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_empty_base_prompt(self):
        self.as_admin()
        resp = self.client.put(URL, {'basePrompt': '   '}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_empty_mode_prompt(self):
        self.as_admin()
        resp = self.client.put(URL, {'modes': {'EXPLAIN': ''}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_records_who_made_the_change(self):
        self.as_admin()
        self.client.put(URL, {'basePrompt': 'Tracked change.'}, format='json')
        self.assertEqual(AdminSettings.get_settings().updated_by, self.admin)


class RealEffectOnAIServiceTests(PromptsTestBase):
    """The whole point of this feature: editing here must change what
    AITutorService actually sends to the model, not just what's stored."""

    def test_construct_system_prompt_uses_edited_base_prompt(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.ai_tutor_base_prompt = "UNIQUE_BASE_MARKER_XYZ "
        settings_obj.save()

        conv = Conversation.objects.create(student=self.student, mode='EXPLAIN')
        prompt = AITutorService().construct_system_prompt(conv)
        self.assertIn("UNIQUE_BASE_MARKER_XYZ", prompt)

    def test_construct_system_prompt_uses_edited_mode_prompt(self):
        conv = Conversation.objects.create(student=self.student, mode='PRACTICE')
        PromptTemplate.objects.create(mode='PRACTICE', prompt_text="UNIQUE_MODE_MARKER_ABC")

        prompt = AITutorService().construct_system_prompt(conv)
        self.assertIn("UNIQUE_MODE_MARKER_ABC", prompt)

    def test_falls_back_to_defaults_when_no_row_exists_yet(self):
        """Before any admin edit, behaviour must be unchanged from the old
        hardcoded strings - no PromptTemplate row exists until GET/PUT seeds one."""
        self.assertEqual(PromptTemplate.objects.count(), 0)
        conv = Conversation.objects.create(student=self.student, mode='REVISION')
        prompt = AITutorService().construct_system_prompt(conv)
        self.assertIn(PromptTemplate.MODE_DEFAULTS['REVISION'], prompt)
