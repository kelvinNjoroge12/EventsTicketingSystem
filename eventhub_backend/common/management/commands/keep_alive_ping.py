from __future__ import annotations

import time
import urllib.error
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ping the health endpoint periodically to prevent host sleep."

    def add_arguments(self, parser):
        parser.add_argument(
            "--url",
            default=getattr(settings, "KEEP_ALIVE_URL", "https://eventsticketingsystem.onrender.com/api/health/"),
            help="Health check URL to ping.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=int(getattr(settings, "KEEP_ALIVE_INTERVAL_SECONDS", 840)),
            help="Seconds between pings.",
        )

    def handle(self, *args, **options):
        if not getattr(settings, "ENABLE_KEEP_ALIVE_PING", False):
            self.stdout.write(self.style.WARNING("ENABLE_KEEP_ALIVE_PING is disabled."))
            return

        url = options["url"]
        interval = max(60, int(options["interval"]))
        self.stdout.write(self.style.SUCCESS(f"Pinging {url} every {interval}s"))

        while True:
            time.sleep(interval)
            try:
                req = urllib.request.Request(url)
                urllib.request.urlopen(req, timeout=10)
            except urllib.error.URLError:
                # Silent retry on failures
                continue
