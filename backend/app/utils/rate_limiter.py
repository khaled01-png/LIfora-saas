import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

from backend.app.config import settings


def client_ip(request: Request) -> str:
    """Real client IP. X-Forwarded-For is only trusted when TRUST_PROXY is enabled."""
    if settings.TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            # The left-most value is written by the client and can be faked to dodge rate limits.
            # Each trusted proxy appends the address it saw, so count from the right.
            index = max(0, len(parts) - max(1, settings.TRUSTED_PROXY_COUNT))
            return parts[index]
    return request.client.host if request.client else "unknown"


class InMemoryRateLimiter:
    """Simple sliding-window limiter. Per-process: use Redis if you run several instances."""

    def __init__(self, requests_per_minute: int = 60, burst_limit: int = 20):
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        self.records = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup(self, now: float, window_seconds: int) -> None:
        if now - self._last_cleanup < 300:
            return
        self._last_cleanup = now
        for key in list(self.records.keys()):
            self.records[key] = [ts for ts in self.records[key] if ts > now - max(window_seconds, 3600)]
            if not self.records[key]:
                del self.records[key]

    def is_allowed(self, client_key: str, max_requests: int = None, window_seconds: int = 60) -> bool:
        if not settings.RATE_LIMIT_ENABLED:
            return True
        limit = max_requests or self.requests_per_minute
        now = time.time()
        window_start = now - window_seconds
        self._cleanup(now, window_seconds)

        self.records[client_key] = [ts for ts in self.records[client_key] if ts > window_start]
        if len(self.records[client_key]) >= limit:
            return False
        self.records[client_key].append(now)
        return True


limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int = 20, window_seconds: int = 60):
    def dependency(request: Request):
        key = f"{client_ip(request)}:{request.url.path}"
        if not limiter.is_allowed(key, max_requests=max_requests, window_seconds=window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait a moment before trying again.",
            )
        return True
    return dependency
