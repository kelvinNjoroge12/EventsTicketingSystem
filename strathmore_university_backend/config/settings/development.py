from .base import *  # noqa: F403
from pathlib import Path

DEBUG = True
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
ANYMAIL = {}  # noqa: F405

CORS_ALLOW_ALL_ORIGINS = True

# Use SQLite for local development â€” no password needed
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# Remove django.contrib.postgres (requires PostgreSQL)
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.postgres"]  # noqa: F405

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "common.renderers.StrathmoreUniversityJSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)

# Enable simulation by default in local development.
ENABLE_SIMULATED_PAYMENTS = True  # noqa: F405

# Disable ratelimits for tests/local development to prevent flaky test failures.
RATELIMIT_ENABLE = False  # noqa: F405
