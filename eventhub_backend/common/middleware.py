"""
Content-Security-Policy middleware.
Reads CSP_* settings from django.conf.settings and injects them as a
single Content-Security-Policy response header.
"""
from __future__ import annotations

from django.conf import settings


class CSPMiddleware:
    """
    Lightweight CSP middleware that builds the header from settings.
    Only adds the header when at least CSP_DEFAULT_SRC is defined.
    """

    def __init__(self, get_response):
        self.get_response = get_response

        directives = []
        mapping = {
            "CSP_DEFAULT_SRC": "default-src",
            "CSP_SCRIPT_SRC": "script-src",
            "CSP_STYLE_SRC": "style-src",
            "CSP_IMG_SRC": "img-src",
            "CSP_FONT_SRC": "font-src",
            "CSP_CONNECT_SRC": "connect-src",
            "CSP_FRAME_SRC": "frame-src",
            "CSP_OBJECT_SRC": "object-src",
            "CSP_MEDIA_SRC": "media-src",
        }
        for setting_name, directive_name in mapping.items():
            value = getattr(settings, setting_name, None)
            if value:
                directives.append(f"{directive_name} {value}")

        self.csp_header = "; ".join(directives) if directives else None

    def __call__(self, request):
        response = self.get_response(request)
        if self.csp_header and "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = self.csp_header
        return response
