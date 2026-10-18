import logging
import uuid
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


def should_enforce_single_session(user) -> bool:
    """
    Returns True if single active session must be enforced for this user.

    Core Rule: One student account = one active login session at a time.
    Student accounts are strictly enforced. Admin and teacher accounts follow
    standard sessions by default to preserve multi-window/grading workflows.
    """
    if not user:
        return False
    return getattr(user, 'role', None) == 'student'


def establish_active_session(user) -> str:
    """
    Atomically establishes a new active session for the user, superseding and
    invalidating all prior sessions.

    Performs an atomic row UPDATE inside a transaction, which acquires an
    exclusive row lock in PostgreSQL to serialize concurrent logins without
    costing a redundant SELECT query.
    """
    from .models import User

    new_session_key = uuid.uuid4().hex
    with transaction.atomic():
        User.objects.filter(id=user.id).update(jwt_session_key=new_session_key)
        user.jwt_session_key = new_session_key

    logger.info(
        "Active session established for user_id=%s (role=%s, session_key=%s...)",
        user.id, getattr(user, 'role', 'unknown'), new_session_key[:8]
    )
    return new_session_key


def invalidate_user_session(user, session_key_to_match=None) -> None:
    """
    Atomically invalidates the user's active session (e.g. on manual logout).
    Rotates the session key to a revoked value so all outstanding access and
    refresh tokens are immediately invalidated.
    """
    from .models import User

    revoked_key = f"revoked_{uuid.uuid4().hex}"
    with transaction.atomic():
        qs = User.objects.filter(id=user.id)
        if session_key_to_match is not None:
            qs = qs.filter(jwt_session_key=session_key_to_match)
        updated = qs.update(jwt_session_key=revoked_key)
        if updated:
            user.jwt_session_key = revoked_key
            logger.info("Active session invalidated for user_id=%s", user.id)


def validate_token_session(user, token_session_key: str | None) -> None:
    """
    Validates whether the session_key in a JWT token matches the user's active session.
    Raises AuthenticationFailed with code 'session_revoked' if invalid.
    """
    if not should_enforce_single_session(user):
        return

    # If the user has an active session established, the token must present the matching key
    active_key = getattr(user, 'jwt_session_key', None)
    if active_key:
        if not token_session_key or token_session_key != active_key:
            raise AuthenticationFailed(
                {
                    "detail": _("Your account was signed in on another device. Please log in again to continue."),
                    "code": "session_revoked",
                }
            )
