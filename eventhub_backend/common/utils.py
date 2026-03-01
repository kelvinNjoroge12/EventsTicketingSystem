from __future__ import annotations

import uuid


def short_uuid(length: int = 8) -> str:
    return str(uuid.uuid4()).replace("-", "")[:length]

