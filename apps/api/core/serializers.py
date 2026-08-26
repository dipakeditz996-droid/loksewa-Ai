from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import exceptions

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except exceptions.AuthenticationFailed as e:
            # If the user is inactive, authenticate() returns None and SimpleJWT raises AuthenticationFailed.
            # But we also need to distinguish between wrong password and disabled account.
            # By default, Django's authenticate returns None for both wrong password and disabled account 
            # if user_can_authenticate() returns False, unless we catch it.
            # Wait, `EmailOrUsernameModelBackend` calls `self.user_can_authenticate(user)`, which returns False if `is_active` is False.
            # To provide a distinct message for inactive users, we can check manually here before calling super().
            pass

        # Manual check to distinguish inactive vs wrong password
        username_field = self.username_field
        username = attrs.get(username_field)
        password = attrs.get("password")
        
        from django.contrib.auth import authenticate
        from .models import User
        
        user = authenticate(request=self.context.get('request'), username=username, password=password)
        
        if user is None:
            # Check if user exists but is inactive
            inactive_user = None
            try:
                inactive_user = User.objects.get(username=username)
            except User.DoesNotExist:
                try:
                    inactive_user = User.objects.get(email=username)
                except User.DoesNotExist:
                    pass
            
            if inactive_user and inactive_user.check_password(password) and not inactive_user.is_active:
                raise exceptions.AuthenticationFailed(
                    'Your account has been disabled. Please contact support.',
                    'account_disabled'
                )
            
            raise exceptions.AuthenticationFailed(
                'Invalid email/username or password.',
                'no_active_account'
            )
            
        # If user is valid, we still use the super().validate() to get the tokens,
        # but we must pass the actual username because the provided username might be an email.
        attrs[username_field] = user.username
        
        return super().validate(attrs)
