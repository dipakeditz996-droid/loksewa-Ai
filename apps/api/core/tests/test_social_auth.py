from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import SocialAccount
from core.social_auth import SocialAuthService
from unittest.mock import patch

User = get_user_model()

class SocialAuthTests(TestCase):
    def setUp(self):
        pass

    def test_get_or_create_social_user_new_user(self):
        provider_data = {
            'provider_account_id': 'google_12345',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        user = SocialAuthService.get_or_create_social_user('google', provider_data)
        
        self.assertIsNotNone(user)
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.role, 'student')
        
        social_account = SocialAccount.objects.get(user=user)
        self.assertEqual(social_account.provider, 'google')
        self.assertEqual(social_account.provider_account_id, 'google_12345')

    def test_get_or_create_social_user_existing_user_linked(self):
        # Create an existing user with password
        existing_user = User.objects.create(
            username='existinguser',
            email='existing@example.com',
            first_name='Existing'
        )
        
        provider_data = {
            'provider_account_id': 'fb_67890',
            'email': 'existing@example.com',
            'first_name': 'Facebook',
            'last_name': 'User'
        }
        
        user = SocialAuthService.get_or_create_social_user('facebook', provider_data)
        
        # Should return the exact same user instance
        self.assertEqual(user.id, existing_user.id)
        
        # A new social account should be linked to it
        social_account = SocialAccount.objects.get(user=user, provider='facebook')
        self.assertEqual(social_account.provider_account_id, 'fb_67890')
        
    def test_get_or_create_social_user_existing_social_account(self):
        # Create a user and a social account
        user = User.objects.create(username='social_user', email='social@example.com')
        SocialAccount.objects.create(
            user=user, provider='apple', provider_account_id='apple_abc', email='social@example.com'
        )
        
        provider_data = {
            'provider_account_id': 'apple_abc',
            'email': 'social@example.com',
            'first_name': 'Apple',
            'last_name': 'User'
        }
        
        returned_user = SocialAuthService.get_or_create_social_user('apple', provider_data)
        
        self.assertEqual(returned_user.id, user.id)
        # Should not create duplicate social account
        self.assertEqual(SocialAccount.objects.filter(provider='apple').count(), 1)
