import os
import requests
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from core.models import SocialAccount

User = get_user_model()

class SocialAuthService:
    @staticmethod
    def verify_google_token(token):
        try:
            # When using custom frontend buttons, it's easier to get an access_token.
            # We verify the access_token by fetching the user profile from Google.
            response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if not response.ok:
                raise ValueError("Invalid Google access token")
            
            idinfo = response.json()
            return {
                'provider_account_id': idinfo['sub'],
                'email': idinfo.get('email'),
                'first_name': idinfo.get('given_name', ''),
                'last_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', '')
            }
        except Exception as e:
            raise ValueError(f"Google token verification failed: {str(e)}")

    @staticmethod
    def verify_facebook_token(token):
        try:
            response = requests.get(
                "https://graph.facebook.com/me",
                params={
                    "fields": "id,email,first_name,last_name,picture",
                    "access_token": token
                }
            )
            if not response.ok:
                raise ValueError("Invalid Facebook token")
            data = response.json()
            return {
                'provider_account_id': data['id'],
                'email': data.get('email'),
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'picture': data.get('picture', {}).get('data', {}).get('url', '')
            }
        except Exception as e:
            raise ValueError(f"Facebook token verification failed: {str(e)}")

    @staticmethod
    def verify_apple_token(token):
        try:
            apple_keys_response = requests.get('https://appleid.apple.com/auth/keys')
            apple_keys = apple_keys_response.json()['keys']
            
            header = jwt.get_unverified_header(token)
            kid = header['kid']
            key = next(k for k in apple_keys if k['kid'] == kid)
            
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
            
            decoded = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=os.environ.get('APPLE_CLIENT_ID', 'com.loksewa.web')
            )
            
            return {
                'provider_account_id': decoded['sub'],
                'email': decoded.get('email'),
                'first_name': '', 
                'last_name': '',
                'picture': ''
            }
        except Exception as e:
            raise ValueError(f"Apple token verification failed: {str(e)}")

    @staticmethod
    def get_or_create_social_user(provider, provider_data, additional_data=None):
        provider_account_id = provider_data['provider_account_id']
        email = provider_data['email']
        first_name = provider_data.get('first_name', '')
        last_name = provider_data.get('last_name', '')
        
        # Apple can send name during the first login step via client SDK
        if provider == 'apple' and additional_data and additional_data.get('name'):
            apple_name = additional_data.get('name')
            if apple_name.get('firstName'):
                first_name = apple_name.get('firstName')
            if apple_name.get('lastName'):
                last_name = apple_name.get('lastName')
        
        social_account = SocialAccount.objects.filter(
            provider=provider, 
            provider_account_id=provider_account_id
        ).first()
        
        if social_account:
            return social_account.user
            
        user = None
        if email:
            user = User.objects.filter(email=email).first()
            
        if not user:
            username = email.split('@')[0] if email else f"{provider}_{provider_account_id[:10]}"
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User.objects.create(
                username=username,
                email=email or "",
                first_name=first_name,
                last_name=last_name,
                role='student' # Default role for social sign-ups
            )
            user.set_password(get_random_string(32))
            user.save()
            
        SocialAccount.objects.create(
            user=user,
            provider=provider,
            provider_account_id=provider_account_id,
            email=email
        )
        
        return user
