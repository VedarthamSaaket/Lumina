# backend/middleware/security.py
"""
Lumina Security Middleware
Covers:
  - Rate limiting  (login, signup, API endpoints, AI generation)
  - Bot / abuse protection
  - HTTPS enforcement
  - Security headers
  - Anomaly / suspicious-activity logging
"""

import time
import logging
import hashlib
from collections import defaultdict
from typing import Callable, Dict, Tuple
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ─── Logging ──────────────────────────────────────────────────────────────────
security_logger = logging.getLogger("lumina.security")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [SECURITY]  %(levelname)s  %(message)s",
)


# ─── In-memory rate-limit store ───────────────────────────────────────────────
# { "ip:route_key" : [timestamp, timestamp, ...] }
_rate_store: Dict[str, list] = defaultdict(list)

# ─── Failed-login tracker (for lockout) ──────────────────────────────────────
# { "ip" : [timestamp, ...] }
_failed_logins: Dict[str, list] = defaultdict(list)

# ─── Suspicious-request tracker ──────────────────────────────────────────────
# { "ip" : count }
_suspicious: Dict[str, int] = defaultdict(int)


# ─── Rate-limit rules ─────────────────────────────────────────────────────────
# (window_seconds, max_requests)
RATE_LIMITS: Dict[str, Tuple[int, int]] = {
    # Auth  – very tight
    "/api/auth/signin":    (60,   8),    # 8 attempts / minute
    "/api/auth/signup":    (60,   5),    # 5 signups / minute
    # AI generation – expensive
    "/api/chat/stream":    (60,  20),    # 20 streaming messages / minute
    "/api/chat/message":   (60,  20),
    "/api/summary":        (60,  15),
    # Data writes
    "/api/journal":        (60,  30),
    "/api/mood":           (60,  30),
    "/api/screening":      (60,  20),
    "/api/cbt":            (60,  40),
    "/api/cognitive":      (60,  30),
    # Default catch-all for all other /api/* routes
    "__default__":         (60, 120),
}

# Max failed-login attempts before a 15-minute lockout
LOGIN_LOCKOUT_ATTEMPTS = 10
LOGIN_LOCKOUT_WINDOW   = 900   # 15 min

# Blocked IPs (populated at runtime after repeated abuse)
_blocked_ips: set = set()


def _get_client_ip(request: Request) -> str:
    """Return the real client IP, respecting X-Forwarded-For from trusted proxies."""
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_rate_limited(key: str, window: int, max_req: int) -> bool:
    now   = time.time()
    hits  = _rate_store[key]
    # Evict stale timestamps
    _rate_store[key] = [t for t in hits if now - t < window]
    if len(_rate_store[key]) >= max_req:
        return True
    _rate_store[key].append(now)
    return False


def _is_login_locked(ip: str) -> bool:
    now  = time.time()
    hits = _failed_logins[ip]
    _failed_logins[ip] = [t for t in hits if now - t < LOGIN_LOCKOUT_WINDOW]
    return len(_failed_logins[ip]) >= LOGIN_LOCKOUT_ATTEMPTS


def record_failed_login(ip: str) -> None:
    """Call this from auth router on bad credentials."""
    _failed_logins[ip].append(time.time())
    count = len(_failed_logins[ip])
    if count >= LOGIN_LOCKOUT_ATTEMPTS:
        security_logger.warning(
            "LOGIN_LOCKOUT ip=%s failed_attempts=%d", ip, count
        )


def record_suspicious(ip: str, reason: str) -> None:
    """Increment abuse score for an IP and log it."""
    _suspicious[ip] += 1
    score = _suspicious[ip]
    security_logger.warning(
        "SUSPICIOUS ip=%s reason=%s cumulative_score=%d", ip, reason, score
    )
    if score >= 50:
        _blocked_ips.add(ip)
        security_logger.error("AUTO_BLOCKED ip=%s score=%d", ip, score)


def _get_rate_key(path: str) -> Tuple[int, int]:
    for prefix, limits in RATE_LIMITS.items():
        if prefix != "__default__" and path.startswith(prefix):
            return limits
    return RATE_LIMITS["__default__"]


# ─── Middleware class ─────────────────────────────────────────────────────────
class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Applies to every request:
      1. Blocks permanently banned IPs
      2. Enforces login lockout
      3. Applies per-route rate limiting
      4. Injects security headers on every response
      5. Logs anomalies (very large bodies, suspicious user-agents, etc.)
    """

    def __init__(self, app, enforce_https: bool = False):
        super().__init__(app)
        self.enforce_https = enforce_https

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        ip   = _get_client_ip(request)
        path = request.url.path

        # ── 1. Blocked IPs ────────────────────────────────────────────────────
        if ip in _blocked_ips:
            security_logger.warning("BLOCKED_IP_REQUEST ip=%s path=%s", ip, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again later."},
            )

        # ── 2. HTTPS redirect ─────────────────────────────────────────────────
        if self.enforce_https and request.url.scheme == "http":
            secure_url = request.url.replace(scheme="https")
            return Response(
                status_code=301,
                headers={"Location": str(secure_url)},
            )

        # ── 3. Login lockout ──────────────────────────────────────────────────
        if path == "/api/auth/signin" and request.method == "POST":
            if _is_login_locked(ip):
                security_logger.warning(
                    "LOCKED_OUT_REQUEST ip=%s", ip
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": (
                            "Too many failed login attempts. "
                            "Please wait 15 minutes before trying again."
                        )
                    },
                )

        # ── 4. Rate limiting ──────────────────────────────────────────────────
        if path.startswith("/api/"):
            window, max_req = _get_rate_key(path)
            rl_key          = f"{ip}:{path}"
            if _is_rate_limited(rl_key, window, max_req):
                record_suspicious(ip, f"rate_limit_exceeded:{path}")
                security_logger.warning(
                    "RATE_LIMITED ip=%s path=%s limit=%d/%ds",
                    ip, path, max_req, window,
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Slow down."},
                    headers={"Retry-After": str(window)},
                )

        # ── 5. Suspicious user-agent detection ────────────────────────────────
        ua = request.headers.get("User-Agent", "")
        if not ua or any(
            bot in ua.lower()
            for bot in ("sqlmap", "nikto", "zgrab", "masscan", "nmap", "python-requests/2.2")
        ):
            record_suspicious(ip, f"bad_user_agent:{ua[:60]}")

        # ── 6. Process the request ────────────────────────────────────────────
        response = await call_next(request)

        # ── 7. Security headers ───────────────────────────────────────────────
        response.headers["X-Content-Type-Options"]   = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]          = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]       = (
            "geolocation=(), microphone=(), camera=()"
        )
        if self.enforce_https:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        # Prevent caching of sensitive API responses
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"]        = "no-cache"

        # ── 8. Log anomalies ──────────────────────────────────────────────────
        if response.status_code >= 400 and path.startswith("/api/"):
            security_logger.info(
                "API_ERROR ip=%s method=%s path=%s status=%d",
                ip, request.method, path, response.status_code,
            )

        return response
