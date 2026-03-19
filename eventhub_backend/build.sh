# deployment steps for Render.com

# In Render, use the following:
# Runtime: Python
# Build Command: ./build.sh
# Start Command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2

set -o errexit  # exit on error

# Install dependencies
pip install -r requirements.txt

# Kill any stuck "idle in transaction" Postgres sessions from previous crashed workers.
# These hold row-level locks on TicketType and prevent new checkouts from completing.
echo ">>> Clearing stuck Postgres sessions..."
python manage.py shell << 'EOF'
from django.db import connection
try:
    with connection.cursor() as c:
        c.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid()
              AND state IN ('idle in transaction', 'idle in transaction (aborted)')
              AND datname = current_database()
        """)
        killed = c.fetchall()
        print(f"Terminated {len(killed)} stuck session(s).")
except Exception as e:
    print(f"Session cleanup skipped: {e}")
EOF

# Run migrations
python manage.py migrate

# Optional: seed demo data on Render (use env RUN_SEED_STRATHMORE=true)
# WARNING: seed_strathmore.py deletes all existing events.
if [ "${RUN_SEED_STRATHMORE:-}" = "true" ]; then
  echo ">>> Running seed_strathmore.py (this will delete all events)..."
  python seed_strathmore.py
fi

# Optional: seed schools/courses from Excel/CSV (use env RUN_SEED_ACADEMICS=true and SEED_ACADEMICS_PATH)
if [ "${RUN_SEED_ACADEMICS:-}" = "true" ]; then
  if [ -z "${SEED_ACADEMICS_PATH:-}" ]; then
    echo ">>> RUN_SEED_ACADEMICS set but SEED_ACADEMICS_PATH is empty; skipping."
  else
    echo ">>> Running seed_academics from ${SEED_ACADEMICS_PATH}..."
    python manage.py seed_academics --path "${SEED_ACADEMICS_PATH}"
  fi
fi

# Collect static files
python manage.py collectstatic --no-input
