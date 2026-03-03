from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"

    def ready(self):
        """
        Kill any 'idle in transaction' Postgres sessions left over from previous
        crashed/timed-out Gunicorn workers.  Those sessions hold row-level locks
        on TicketType rows that block every subsequent SELECT FOR UPDATE, causing
        a 30-second Gunicorn timeout and Cloudflare 500 on every checkout attempt.

        This runs once on every Gunicorn startup (each worker calls ready() once).
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            from django.db import connection
            with connection.cursor() as c:
                c.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE pid <> pg_backend_pid()
                      AND state IN ('idle in transaction', 'idle in transaction (aborted)')
                      AND datname = current_database()
                """)
                killed = c.fetchall()
                if killed:
                    logger.warning(f"[orders.ready] Terminated {len(killed)} stuck idle-in-transaction Postgres session(s).")
        except Exception as exc:
            # Don't crash startup if cleanup fails (e.g. on SQLite in dev)
            logger.debug(f"[orders.ready] Postgres session cleanup skipped: {exc}")
