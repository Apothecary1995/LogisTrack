from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsCompanyAdminOrReadOnly(BasePermission):
    message = "Only company admins can modify these settings."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_company_admin)
