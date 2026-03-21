from __future__ import annotations

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "eventhub_access")
        raw_token = request.COOKIES.get(cookie_name)
        if not raw_token:
            return None

        # Avoid CSRF risks: only allow cookie-auth for safe (read-only) methods.
        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
