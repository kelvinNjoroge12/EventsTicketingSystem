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
    try:
        response = exception_handler(exc, context)
        if response is None:
            return Response(
                {"success": False, "error": {"code": "SERVER_ERROR", "message": f"{exc.__class__.__name__}: {str(exc)}"}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
        data = response.data
        code = "ERROR"
        message = "Request failed"
        details = data
        
        if isinstance(data, dict):
            if "detail" in data:
                message = str(data["detail"])
            else:
                code = "VALIDATION_ERROR" if response.status_code == 400 else "ERROR"
                message = "Validation error" if code == "VALIDATION_ERROR" else "Request failed"
        
        response.data = {
            "success": False, 
            "error": {"code": code, "message": message, "details": details}
        }
        return response
    except Exception as e:
        return Response({"success": False, "error": {"code": "FATAL", "message": f"Exception handler crashed: {str(e)}"}}, status=500)

