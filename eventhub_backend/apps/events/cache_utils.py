from django.core.cache import cache


CACHE_VERSION_KEY = "events:cache_version"


def get_cache_version() -> int:
    version = cache.get(CACHE_VERSION_KEY)
    if not isinstance(version, int) or version < 1:
        version = 1
        cache.set(CACHE_VERSION_KEY, version, None)
    return version


def bump_cache_version() -> int:
    try:
        return cache.incr(CACHE_VERSION_KEY)
    except Exception:
        version = get_cache_version() + 1
        cache.set(CACHE_VERSION_KEY, version, None)
        return version
