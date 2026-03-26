# deployment steps for Render.com

# In Render, use the following:
# Runtime: Python
# Build Command: ./build.sh
# Start Command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2

set -o errexit  # exit on error

# Render deploys should always use production settings for management commands.
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"

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

# Collect static files
python manage.py collectstatic --no-input
