import os
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F403

DEBUG = False

# Render.com / Vercel domain allow-listing
ALLOWED_HOSTS = env.list(  # noqa: F405
    "ALLOWED_HOSTS",
    default=[
        "eventsticketingsystem.onrender.com",
    ],
)

# Use WhiteNoise for static files (CSS/JS)
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# REST Production settings
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "common.renderers.StrathmoreUniversityJSONRenderer",
)

# CSRF and CORS security
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://eventsticketingsystem.onrender.com",
        "https://events-ticketing-system.vercel.app",
    ],
)
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "https://events-ticketing-system.vercel.app",
    ],
)
# Disable wildcard CORS regexes in production unless explicitly provided.
CORS_ALLOWED_ORIGIN_REGEXES = env.list("CORS_ALLOWED_ORIGIN_REGEXES", default=[])
ENABLE_SIMULATED_PAYMENTS = env.bool("ENABLE_SIMULATED_PAYMENTS", default=False)  # noqa: F405

if MPESA_ENVIRONMENT == "production" and not MPESA_CALLBACK_SECRET:  # noqa: F405
    raise ImproperlyConfigured(
        "MPESA_CALLBACK_SECRET must be set when MPESA_ENVIRONMENT=production."
    )

# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
# Render's load balancer handles SSL termination externally.
# Setting SECURE_SSL_REDIRECT=True causes SecurityMiddleware to issue a 301
# redirect on incoming HTTP (internal) requests â€” before CORS headers are set.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# â”€â”€ CSP Headers (issue #8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Content-Security-Policy delivered via SecurityMiddleware custom header.
# Protects against XSS by restricting what resources the browser can load.
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
CSP_DEFAULT_SRC = "'self'"
CSP_SCRIPT_SRC = "'self' https://js.stripe.com"
CSP_STYLE_SRC = "'self' 'unsafe-inline' https://fonts.googleapis.com"
CSP_IMG_SRC = "'self' data: https://*.supabase.co"
CSP_FONT_SRC = "'self' https://fonts.gstatic.com"
CSP_CONNECT_SRC = "'self' https://api.stripe.com https://*.safaricom.co.ke"
CSP_FRAME_SRC = "'self' https://js.stripe.com"

# Cross-site cookies for Vercel frontend
JWT_COOKIE_SECURE = True
JWT_COOKIE_SAMESITE = "None"

# â”€â”€ Connection handling (issue #4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CONN_MAX_AGE=0 is critical on Render because persistent connections
# survive Gunicorn SIGKILL events (e.g. worker timeouts) and carry over
# aborted/uncommitted transactions to the next request, causing row-lock
# deadlocks and 30-second hangs for every subsequent request.
# If you move to Railway/ECS with proper Gunicorn lifecycle hooks, set
# CONN_MAX_AGE=600 via env var to enable connection pooling.
CONN_MAX_AGE = env.int("CONN_MAX_AGE", default=0)  # noqa: F405
DATABASES["default"]["CONN_MAX_AGE"] = CONN_MAX_AGE  # noqa: F405

# â”€â”€ Redis Cache (issue #7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Replace LocMemCache with Redis so cache keys are shared across all
# Gunicorn workers and rate limiting + M-Pesa token caching work properly.
_redis_url = env("REDIS_URL", default="")  # noqa: F405
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
            "KEY_PREFIX": "eh",
            "TIMEOUT": 300,
        }
    }

# â”€â”€ Celery: ALWAYS run async in production (issue #2) â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Render free-tier mode runs only a web service (no worker/beat).
# In this mode we can execute Celery tasks inline to keep critical
# paths like ticket email delivery working.
RENDER_FREE_MODE = env.bool("RENDER_FREE_MODE", default=False)  # noqa: F405
if RENDER_FREE_MODE:
    ASYNC_TICKET_EMAIL = False  # noqa: F405
    CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=True)  # noqa: F405
    CELERY_TASK_EAGER_PROPAGATES = env.bool("CELERY_TASK_EAGER_PROPAGATES", default=False)  # noqa: F405
else:
    CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)  # noqa: F405
    CELERY_TASK_EAGER_PROPAGATES = env.bool("CELERY_TASK_EAGER_PROPAGATES", default=False)  # noqa: F405

# â”€â”€ Extra throttle scopes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["promo_code_lookup"] = "10/minute"  # noqa: F405

ENABLE_IMAGE_OPTIMIZATION = env.bool("ENABLE_IMAGE_OPTIMIZATION", default=False)  # noqa: F405
ENABLE_KEEP_ALIVE_PING = env.bool("ENABLE_KEEP_ALIVE_PING", default=False)  # noqa: F405

# â”€â”€ SUPABASE STORAGE CONFIGURATION (S3-Compatible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Use django-storages + boto3 to persist images to Supabase
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

AWS_ACCESS_KEY_ID = env("SB_STORAGE_ACCESS_KEY", default="")
AWS_SECRET_ACCESS_KEY = env("SB_STORAGE_SECRET_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("SB_STORAGE_BUCKET", default="media")
AWS_S3_ENDPOINT_URL = env("SB_STORAGE_ENDPOINT", default="https://cyrwfnkatnqtfasqsoau.supabase.co/storage/v1/s3")
AWS_S3_REGION_NAME = env("SB_STORAGE_REGION", default="eu-west-1")

# URL construction (no auth required for public links)
AWS_DEFAULT_ACL = "public-read"
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = False 
# Instruct boto3 not to use bucket names as subdomains, which can fail with non-AWS S3
AWS_S3_ADDRESSING_STYLE = "path"

# Make sure image URLs point directly to the Supabase object/public endpoint instead of S3 endpoint
_domain = AWS_S3_ENDPOINT_URL.replace("https://", "").split("/")[0]
if _domain:
    AWS_S3_CUSTOM_DOMAIN = f"{_domain}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}"

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
