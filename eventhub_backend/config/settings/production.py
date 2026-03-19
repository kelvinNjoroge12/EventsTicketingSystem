import os
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
    "common.renderers.EventHubJSONRenderer",
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

# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
# Render's load balancer handles SSL termination externally.
# Setting SECURE_SSL_REDIRECT=True causes SecurityMiddleware to issue a 301
# redirect on incoming HTTP (internal) requests — before CORS headers are set.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Cross-site cookies for Vercel frontend
JWT_COOKIE_SECURE = True
JWT_COOKIE_SAMESITE = "None"

# CONN_MAX_AGE=0 is critical on Render because persistent connections
# survive Gunicorn SIGKILL events (e.g. worker timeouts) and carry over
# aborted/uncommitted transactions to the next request, causing row-lock
# deadlocks and 30-second hangs for every subsequent request.
CONN_MAX_AGE = 0
DATABASES["default"]["CONN_MAX_AGE"] = 0  # noqa: F405

# ── SUPABASE STORAGE CONFIGURATION (S3-Compatible) ───────────
# Use django-storages + boto3 to persist images to Supabase
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

AWS_ACCESS_KEY_ID = env("SB_STORAGE_ACCESS_KEY", default="")
AWS_SECRET_ACCESS_KEY = env("SB_STORAGE_SECRET_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("SB_STORAGE_BUCKET", default="media")
AWS_S3_ENDPOINT_URL = env("SB_STORAGE_ENDPOINT", default="https://cyrwfnkatnqtfasqsoau.supabase.co/storage/v1/s3")
AWS_S3_REGION_NAME = env("SB_STORAGE_REGION", default="eu-west-1")

# Because Render deployed without a Redis instance add-on defined natively in environment,
# we need to execute Celery tasks (like email sending) synchronously during sign-ups to prevent 500 crashes
CELERY_TASK_ALWAYS_EAGER = True

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

# ─────────────────────────────────────────────────────────────

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
