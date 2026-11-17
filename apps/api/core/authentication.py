from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password
from .session_service import validate_token_session


class ProfileAwareJWTAuthentication(JWTAuthentication):
    """Stock JWT authentication, with three differences:
    1. The user's student profile is fetched in the same query.
    2. Single Active Session enforcement: rejects access tokens belonging to
       superseded or revoked sessions immediately.
    3. Query param support: accepts ?token= or ?jwt= for media and PDF streaming.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.query_params.get('token') or request.query_params.get('jwt')
            if raw_token is None:
                return None
            if isinstance(raw_token, str):
                raw_token = raw_token.encode('utf-8')
        else:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            if header is not None:
                raise
            return None

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as e:
            raise InvalidToken(_("Token contained no recognizable user identification")) from e

        try:
            user = (
                self.user_model.objects.select_related('student_profile')
                .get(**{api_settings.USER_ID_FIELD: user_id})
            )
        except self.user_model.DoesNotExist as e:
            raise AuthenticationFailed(_("User not found"), code="user_not_found") from e

        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code="user_inactive")

        if api_settings.CHECK_REVOKE_TOKEN:
            if validated_token.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(user.password):
                raise AuthenticationFailed(_("The user's password has been changed."), code="password_changed")

        # Single active session validation: ensure token belongs to the authoritative session
        validate_token_session(user, validated_token.get("session_key"))

        return user
