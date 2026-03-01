from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from rest_framework.renderers import JSONRenderer


class EventHubJSONRenderer(JSONRenderer):
    """
    Wrap all responses in:
      success: true|false
      data: ...
      message: optional

    Errors are produced by the custom exception handler and passed through.
    """

    def render(self, data: Any, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        response = renderer_context.get("response")

        if data is None:
            data = {}

        if isinstance(data, Mapping) and "success" in data:
            return super().render(data, accepted_media_type, renderer_context)

        status_code = getattr(response, "status_code", 200)
        is_success = 200 <= status_code < 400

        envelope: dict[str, Any]
        if is_success:
            envelope = {"success": True, "data": data}
        else:
            envelope = {
                "success": False,
                "error": {
                    "code": "ERROR",
                    "message": "Request failed",
                    "details": data,
                },
            }

        return super().render(envelope, accepted_media_type, renderer_context)

