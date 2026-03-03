import traceback
from django.http import JsonResponse

class ExceptionLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        return JsonResponse({
            "CRITICAL_MIDDLEWARE_EXCEPTION": str(exception.__class__.__name__),
            "MESSAGE": str(exception),
            "TRACEBACK": traceback.format_exc()
        }, status=500)
