from unittest.mock import patch
from django.test import TestCase, override_settings
from core.email_service import send_account_created_email


class AccountCreatedEmailTests(TestCase):
    @patch('core.email_service._send_email')
    def test_account_created_email_contains_all_information_and_hemrajkc_redirect(self, mock_send):
        send_account_created_email(
            to_email='student@gmail.com',
            username='Binii',
            password='TempPass123!@#',
            full_name='Binii KC',
            phone='9812345678',
            package_names=['Full Loksewa Package'],
            enrolled_courses=['Kharidar First Paper', 'General Knowledge'],
            target_exam='PSC Exams - Kharidar',
            expiry_date='2026-12-31',
        )

        mock_send.assert_called_once()
        subject, text_body, html_body, to_email = mock_send.call_args[0]

        self.assertEqual(to_email, 'student@gmail.com')
        self.assertEqual(subject, 'Your LoksewaAI account has been created')

        # Check credentials in text and html
        self.assertIn('Binii', text_body)
        self.assertIn('student@gmail.com', text_body)
        self.assertIn('TempPass123!@#', text_body)
        self.assertIn('Binii KC', text_body)
        self.assertIn('9812345678', text_body)

        self.assertIn('Binii', html_body)
        self.assertIn('student@gmail.com', html_body)
        self.assertIn('TempPass123!@#', html_body)
        self.assertIn('Binii KC', html_body)
        self.assertIn('9812345678', html_body)

        # Check package and course access info
        self.assertIn('Full Loksewa Package', text_body)
        self.assertIn('Kharidar First Paper', text_body)
        self.assertIn('PSC Exams - Kharidar', text_body)
        self.assertIn('2026-12-31', text_body)

        self.assertIn('Full Loksewa Package', html_body)
        self.assertIn('Kharidar First Paper', html_body)
        self.assertIn('PSC Exams - Kharidar', html_body)
        self.assertIn('2026-12-31', html_body)

        # Check redirection URL is hemrajkc.com/login and NOT localhost
        self.assertIn('https://hemrajkc.com/login', text_body)
        self.assertIn('https://hemrajkc.com/login', html_body)
        self.assertNotIn('localhost', text_body)
        self.assertNotIn('localhost', html_body)

    @patch('core.email_service._send_email')
    @override_settings(FRONTEND_URL='http://localhost:3000')
    def test_localhost_frontend_url_is_safely_sanitized_to_hemrajkc(self, mock_send):
        # Even if settings.FRONTEND_URL is misconfigured to localhost, it must point to hemrajkc.com/login
        send_account_created_email(
            to_email='student@gmail.com',
            username='Binii',
            password='TempPass123!',
        )

        mock_send.assert_called_once()
        _, text_body, html_body, _ = mock_send.call_args[0]

        self.assertIn('https://hemrajkc.com/login', text_body)
        self.assertIn('https://hemrajkc.com/login', html_body)
        self.assertNotIn('localhost', text_body)
        self.assertNotIn('localhost', html_body)

    @patch('core.email_service._send_email')
    def test_minimal_call_without_optional_fields_works_safely(self, mock_send):
        # Backward compatibility test when password is not supplied
        send_account_created_email(
            to_email='student2@gmail.com',
            username='Student2',
        )

        mock_send.assert_called_once()
        _, text_body, html_body, to_email = mock_send.call_args[0]

        self.assertEqual(to_email, 'student2@gmail.com')
        self.assertIn('Student2', text_body)
        self.assertIn('https://hemrajkc.com/login', text_body)
        self.assertIn('https://hemrajkc.com/login', html_body)

