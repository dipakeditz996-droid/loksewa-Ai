from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()

# Distinguishes "caller did not resolve the user" from "caller resolved it and
# found no such user" (None).
_UNRESOLVED = object()


class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend that allows logging in with either
    username or email address.

    This is the only authentication backend (it subclasses Django's
    ModelBackend, so permission checks are inherited unchanged). Listing
    ModelBackend as a second backend added nothing - it can only match a
    username this backend already tried - but made every failed login pay
    for a second password hash.
    """
    def authenticate(self, request, username=None, password=None, user=_UNRESOLVED, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        if username is None or password is None:
            return None

        # `user` lets a caller that already resolved the account (the login
        # serializer does, for its lockout check) skip a duplicate lookup.
        # The password is always verified here regardless.
        if user is _UNRESOLVED:
            from core.account_lockout import find_user_by_username_or_email
            user = find_user_by_username_or_email(username)

        if user is None:
            # Run the hasher anyway so an unknown identifier costs the same
            # time as a wrong password (Django's ModelBackend does the same);
            # otherwise response time reveals whether an account exists.
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
