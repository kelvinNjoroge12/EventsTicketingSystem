from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, []),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))


def _require(name: str) -> str:
    value = env(name, default=None)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


SECRET_KEY = _require("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    # Third party themes
    "jazzmin",
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    "anymail",
    "storages",
    # Local
    "common",
    "apps.accounts.apps.AccountsConfig",
    "apps.events",
    "apps.tickets",
    "apps.orders.apps.OrdersConfig",
    "apps.payments",
    "apps.speakers.apps.SpeakersConfig",
    "apps.schedules.apps.SchedulesConfig",
    "apps.sponsors.apps.SponsorsConfig",
    "apps.checkin.apps.CheckinConfig",
    "apps.analytics.apps.AnalyticsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.finances.apps.FinancesConfig",
    "apps.waitlist.apps.WaitlistConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middleware.CSPMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "apps" / "notifications" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL"),
}

CONN_MAX_AGE = env.int("CONN_MAX_AGE", default=0)
DATABASES["default"]["CONN_MAX_AGE"] = CONN_MAX_AGE

if "postgres" in DATABASES["default"]["ENGINE"]:
    INSTALLED_APPS.append("django.contrib.postgres")

ENABLE_KEEP_ALIVE_PING = env.bool("ENABLE_KEEP_ALIVE_PING", default=False)
KEEP_ALIVE_URL = env("KEEP_ALIVE_URL", default="https://eventsticketingsystem.onrender.com/api/health/")
KEEP_ALIVE_INTERVAL_SECONDS = env.int("KEEP_ALIVE_INTERVAL_SECONDS", default=840)
ENABLE_IMAGE_OPTIMIZATION = env.bool("ENABLE_IMAGE_OPTIMIZATION", default=True)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "common.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.EventHubPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "common.renderers.EventHubJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "EXCEPTION_HANDLER": "common.exceptions.eventhub_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "checkout": "5/minute",      # Specific throttle for checkout
        "auth": "10/minute",         # Specific throttle for auth
        "order_lookup": "30/minute", # Throttle for order detail lookups (anti brute-force)
        "qr_generation": "30/minute", # Throttle for QR generation
        "resend_email": "5/minute",  # Throttle for email resending
        "frontend_error": "30/minute",  # Throttle for frontend crash telemetry ingestion
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "EventHub API",
    "DESCRIPTION": "REST API for EventHub event ticketing platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {"persistAuthorization": True},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# JWT cookie settings (for HttpOnly cookie auth)
JWT_AUTH_COOKIE = env("JWT_AUTH_COOKIE", default="eventhub_access")
JWT_REFRESH_COOKIE = env("JWT_REFRESH_COOKIE", default="eventhub_refresh")
JWT_COOKIE_SECURE = env.bool("JWT_COOKIE_SECURE", default=not DEBUG)
JWT_COOKIE_SAMESITE = env("JWT_COOKIE_SAMESITE", default="Lax")
JWT_COOKIE_DOMAIN = env("JWT_COOKIE_DOMAIN", default="")

# CORS
FRONTEND_URL = env("FRONTEND_URL", default="https://events-ticketing-system.vercel.app")
BACKEND_URL = env("BACKEND_URL", default="https://eventsticketingsystem.onrender.com")
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# Allow ALL Vercel preview deployments automatically (*.vercel.app)
# and the production domain. This avoids having to update env vars
# every time Vercel creates a new preview URL.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",       # all vercel preview + production urls
    r"^https://eventsticketingsystem\.onrender\.com$",
    r"^http://localhost(:\d+)?$",        # local dev
    r"^http://127\.0\.0\.1(:\d+)?$",
]

# Upload constraints (validated server-side in serializers/validators)
FILE_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_ALLOWED_EXTENSIONS = ("jpeg", "jpg", "png", "webp", "gif")

# Redis cache / Celery
REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")
EXPIRED_TICKET_RETENTION_HOURS = env.int("EXPIRED_TICKET_RETENTION_HOURS", default=72)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# ── Email System Configuration ──
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@eventhub.test")
ASYNC_TICKET_EMAIL = env.bool("ASYNC_TICKET_EMAIL", default=True)

# SendGrid HTTP API takes priority over SMTP (works on Render free tier, SMTP is blocked).
# If SENDGRID_API_KEY is set, use it regardless of EMAIL_HOST.
_sendgrid_key = env("SENDGRID_API_KEY", default="")
if _sendgrid_key:
    EMAIL_BACKEND = "anymail.backends.sendgrid.EmailBackend"
    ANYMAIL = {
        "SENDGRID_API_KEY": _sendgrid_key,
    }
elif env("EMAIL_HOST", default=""):
    # Fallback: standard SMTP (only works if outbound port 587 is open)
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="noreply@eventhub.test")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
    EMAIL_TIMEOUT = 10
else:
    # No email configured — log to console (dev/test)
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Stripe
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_SERVICE_FEE_PERCENT = env.float("STRIPE_SERVICE_FEE_PERCENT", default=3.0)

# M-Pesa Daraja
MPESA_CONSUMER_KEY = env("MPESA_CONSUMER_KEY", default="")
MPESA_CONSUMER_SECRET = env("MPESA_CONSUMER_SECRET", default="")
MPESA_SHORTCODE = env("MPESA_SHORTCODE", default="")
MPESA_PASSKEY = env("MPESA_PASSKEY", default="")
MPESA_CALLBACK_URL = env("MPESA_CALLBACK_URL", default="")
MPESA_ENVIRONMENT = env("MPESA_ENVIRONMENT", default="sandbox")  # sandbox|production

# Storage (S3 / Cloudflare R2)
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="auto")
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}



# Rate limiting (django-ratelimit uses per-view decorators; add shared toggles here)
RATELIMIT_ENABLE = env.bool("RATELIMIT_ENABLE", default=True)

# Payments simulation mode (safe-by-default off unless explicitly enabled per environment)
ENABLE_SIMULATED_PAYMENTS = env.bool("ENABLE_SIMULATED_PAYMENTS", default=False)
SIMULATED_PAYMENT_TOKEN_MAX_AGE_SECONDS = env.int("SIMULATED_PAYMENT_TOKEN_MAX_AGE_SECONDS", default=3600)

# Reservation TTL: how long a pending order holds inventory before auto-cancel
ORDER_RESERVATION_TTL_MINUTES = env.int("ORDER_RESERVATION_TTL_MINUTES", default=15)

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "send_daily_event_reminders": {
        "task": "send_event_reminders",
        "schedule": crontab(minute=0, hour='*'),  # Runs every hour
    },
    "sync_event_lifecycle": {
        "task": "common.tasks.sync_event_lifecycle_task",
        "schedule": crontab(minute="*/15"),
    },
    # Purge draft events older than 30 days to prevent DB and storage bloat.
    "cleanup_abandoned_drafts": {
        "task": "apps.events.tasks.cleanup_abandoned_drafts",
        "schedule": crontab(minute=0, hour=3),  # 3 AM daily
    },
    # Release tickets stuck in pending orders (reservation TTL enforcement)
    "cancel_stale_orders": {
        "task": "apps.orders.tasks.cancel_stale_orders",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
}

if ENABLE_KEEP_ALIVE_PING:
    CELERY_BEAT_SCHEDULE["keep_alive_ping"] = {
        "task": "common.tasks.keep_alive_ping_task",
        "schedule": timedelta(seconds=KEEP_ALIVE_INTERVAL_SECONDS),
    }

JAZZMIN_SETTINGS = {
    "site_title": "EventHub SuperAdmin",
    "site_header": "EventHub Dashboard",
    "site_brand": "EventHub",
    "welcome_sign": "Welcome to EventHub SuperAdmin",
    "copyright": "EventHub Ltd",
    "search_model": ["accounts.User", "events.Event"],
    "show_ui_builder": True,
    "navigation_expanded": True,
    "topmenu_links": [
        {"name": "Home",  "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Frontend Site", "url": "https://events-ticketing-system.vercel.app/"},
    ]
}
