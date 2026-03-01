import os
from .base import *  # noqa: F403

DEBUG = False

# Render.com / Vercel domain allow-listing
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[".render.com"])  # noqa: F405

# Use WhiteNoise for static files (CSS/JS)
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# REST Production settings
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "common.renderers.EventHubJSONRenderer",
)

# CSRF security
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["https://*.render.com", "https://*.vercel.app"])

# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Database performance
CONN_MAX_AGE = env.int("CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_MAX_AGE"] = CONN_MAX_AGE  # noqa: F405

# ── SUPABASE STORAGE CONFIGURATION (S3-Compatible) ───────────
# Use django-storages + boto3 to persist images to Supabase
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

AWS_ACCESS_KEY_ID = env("SB_STORAGE_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = env("SB_STORAGE_SECRET_KEY")
AWS_STORAGE_BUCKET_NAME = env("SB_STORAGE_BUCKET", default="media")
AWS_S3_ENDPOINT_URL = env("SB_STORAGE_ENDPOINT")
AWS_S3_REGION_NAME = env("SB_STORAGE_REGION", default="us-east-1")

# URL construction (no auth required for public links)
AWS_DEFAULT_ACL = "public-read"
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = False 
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
