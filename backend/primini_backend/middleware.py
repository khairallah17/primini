from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import CsrfViewMiddleware


class CsrfExemptApiMiddleware(MiddlewareMixin):
    """
    Middleware to exempt API endpoints from CSRF protection.
    Since we're using Token authentication for REST API, CSRF is not needed.
    """
    
    def process_request(self, request):
        # Exempt all /api/ endpoints from CSRF
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

