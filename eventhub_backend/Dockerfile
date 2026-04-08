FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/strathmore_university_backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY strathmore_university_backend/requirements.txt /app/strathmore_university_backend/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY strathmore_university_backend/ /app/strathmore_university_backend/

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4"]
