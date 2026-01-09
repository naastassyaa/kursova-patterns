from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allows access only to admin users.
    An admin user is identified by the 'ADMIN' role.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and has the 'ADMIN' role.
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')


class IsOwnerOrAdmin(BasePermission):
    """Allow access if user owns the object or is admin."""

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        owner = getattr(obj, "user", None)
        return owner == request.user