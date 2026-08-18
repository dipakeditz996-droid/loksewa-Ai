from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin and super-admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'super-admin'])

class IsSuperAdminUser(permissions.BasePermission):
    """
    Allows access only to super-admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'super-admin')

class IsEvaluatorUser(permissions.BasePermission):
    """
    Allows access only to teacher/evaluator and admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['teacher', 'admin', 'super-admin'])

class IsTeacher(permissions.BasePermission):
    """
    Allows access only to teacher users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'teacher')
