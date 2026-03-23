from __future__ import annotations

import logging
from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _to_error_payload(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return payload


def eventhub_exception_handler(exc, context):
    try:
        response = exception_handler(exc, context)
        if response is None:
            logger.exception("Unhandled API exception.", exc_info=exc)
            return Response(
                {
                    "success": False,
                    "error": {"code": "SERVER_ERROR", "message": "An unexpected server error occurred."},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
        data = response.data
        code = "ERROR"
        message = "Request failed"
        details = data if response.status_code < 500 else None

        if response.status_code >= 500:
            logger.exception("DRF returned a 5xx API response.", exc_info=exc)
            response.data = {
                "success": False,
                "error": {"code": "SERVER_ERROR", "message": "An unexpected server error occurred."},
            }
            return response
        
        if isinstance(data, dict):
            if "detail" in data:
                message = str(data["detail"])
            else:
                code = "VALIDATION_ERROR" if response.status_code == 400 else "ERROR"
                # Pull the very first string out of the validation error dictionary
                # so the user sees a real message like "Email already exists" instead of "Validation error"
                first_error = None
                for key, val in data.items():
                    if isinstance(val, list) and len(val) > 0 and isinstance(val[0], str):
                        first_error = str(val[0])
                        break
                    elif isinstance(val, str):
                        first_error = val
                        break
                
                message = first_error if first_error else ("Validation error" if code == "VALIDATION_ERROR" else "Request failed")
        
        response.data = {
            "success": False, 
            "error": {"code": code, "message": message, "details": details}
        }
        return response
    except Exception:
        logger.exception("API exception handler crashed.")
        return Response(
            {
                "success": False,
                "error": {"code": "SERVER_ERROR", "message": "An unexpected server error occurred."},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
