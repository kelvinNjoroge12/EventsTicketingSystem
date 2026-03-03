from __future__ import annotations

import traceback
from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _to_error_payload(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return payload


def eventhub_exception_handler(exc, context):
    import traceback
    if hasattr(exc, 'detail'):
        traceback.print_exc()
    """
    Ensures a consistent error envelope for all DRF exceptions:
    {
      "success": false,
      "error": { "code": "...", "message": "...", "details": {...} }
    }
    """
    response = exception_handler(exc, context)
    if response is None:
        return Response(
            {"success": False, "error": _to_error_payload("SERVER_ERROR", "Unexpected server error")},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # DRF typically returns dict of field errors or {"detail": "..."}
    data = response.data
    code = "ERROR"
    message = "Request failed"
    details = None

    if isinstance(data, dict):
        if "detail" in data and isinstance(data["detail"], (str,)):
            message = str(data["detail"])
        else:
            code = "VALIDATION_ERROR" if response.status_code == status.HTTP_400_BAD_REQUEST else "ERROR"
            message = "Validation error" if code == "VALIDATION_ERROR" else "Request failed"
            details = data
    else:
        details = data

    response.data = {"success": False, "error": _to_error_payload(code, message, details)}
    return response

