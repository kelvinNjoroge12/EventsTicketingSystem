"""
Immutable audit log for financial and security-sensitive operations.
Used by payments, refunds, check-in, and admin actions.
"""
from __future__ import annotations

import logging

from django.db import models

from common.models import TimeStampedModel

logger = logging.getLogger(__name__)


class AuditLog(TimeStampedModel):
    """
    Immutable append-only log. Never update or delete rows.
    """

    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    action = models.CharField(max_length=80, db_index=True)
    entity_type = models.CharField(max_length=40)
    entity_id = models.UUIDField()
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"AuditLog({self.action}, {self.entity_type}:{self.entity_id})"


def log_action(
    action: str,
    entity_type: str,
    entity_id,
    metadata: dict | None = None,
    actor=None,
    ip_address: str | None = None,
):
    """
    Convenience function to write an audit log entry.
    Best-effort: logs errors but never raises.
    """
    try:
        AuditLog.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata or {},
            ip_address=ip_address,
        )
    except Exception:
        logger.exception("Failed to write audit log: %s %s:%s", action, entity_type, entity_id)
