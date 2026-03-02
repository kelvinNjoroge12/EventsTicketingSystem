# deployment steps for Render.com

# In Render, use the following:
# Runtime: Python
# Build Command: ./build.sh
# Start Command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2

set -o errexit  # exit on error

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
