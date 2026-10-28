from rest_framework import permissions


def is_admin(user):
    return bool(
        user and user.is_authenticated
        and (
            getattr(user, 'role', None) in ('admin', 'super-admin')
            or getattr(user, 'is_staff', False)
            or getattr(user, 'is_superuser', False)
        )
    )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Object-level: the post/reply author, or an admin, may write to it.
    Everyone authenticated may read (list/retrieve already filter out
    removed content for non-admins at the queryset level)."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if is_admin(request.user):
            return True
        return obj.author_id == request.user.id


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)
