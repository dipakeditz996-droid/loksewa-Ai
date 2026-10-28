from rest_framework import permissions


def is_admin_or_super(user):
    """Admin users can do anything. Check role or Django staff/superuser flags."""
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'role', None) in ['admin', 'super-admin']
            or getattr(user, 'is_staff', False)
            or getattr(user, 'is_superuser', False)
        )
    )


class IsAdminUser(permissions.BasePermission):
    """
    Allows access to admin and super-admin users (admin can do anything).
    """
    def has_permission(self, request, view):
        return is_admin_or_super(request.user)


class IsSuperAdminUser(permissions.BasePermission):
    """
    Allows access to admin and super-admin users (admin and super-admin have identical permissions).
    """
    def has_permission(self, request, view):
        return is_admin_or_super(request.user)


class IsEvaluatorUser(permissions.BasePermission):
    """
    Allows access to teacher/evaluator and admin users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, 'role', None) in ['teacher', 'admin', 'super-admin']
                or is_admin_or_super(request.user)
            )
        )


class IsTeacher(permissions.BasePermission):
    """
    Allows access to teacher and admin users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, 'role', None) in ['teacher', 'admin', 'super-admin']
                or is_admin_or_super(request.user)
            )
        )
