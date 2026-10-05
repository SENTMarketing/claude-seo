"""
Shared plumbing for the website lead tools (SEO-score checker, site makeover).

Both serverless endpoints accept the same request shape
({"url", "email", "consent", "website"}), apply the same validation, CORS,
honeypot and per-IP rate limit, and forward a lead to LEAD_WEBHOOK_URL.
Each endpoint subclasses `LeadHandler` and implements `run(url)` and
`lead_fields(report)`.

Environment variables:
    ALLOWED_ORIGINS      Comma-separated origins allowed via CORS. Empty = allow
                         all (only for testing).
    LEAD_WEBHOOK_URL     Optional. Every successful request is POSTed here as JSON.
    LEAD_WEBHOOK_SECRET  Optional. Sent as the X-Webhook-Secret header.
    RATE_LIMIT_PER_HOUR  Max requests per IP per tool per warm instance (default 10).
"""

from __future__ import annotations

import json
import os
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import requests

from seo_score_engine import ScoreError

EMAIL_RE = re.compile(r"^[^@\s<>\"']{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$")
MAX_BODY = 4096
_hits: dict[str, deque] = defaultdict(deque)


def validate_payload(data: dict) -> tuple[str, str]:
    """Return (url, email) or raise ScoreError with a user-facing message."""
    if not isinstance(data, dict):
        raise ScoreError("Ongeldig verzoek.")
    email = str(data.get("email") or "").strip()
    url = str(data.get("url") or "").strip()
    if not url:
        raise ScoreError("Vul de URL van je website in.")
    if not EMAIL_RE.match(email):
        raise ScoreError("Vul een geldig e-mailadres in.")
    if data.get("consent") is not True:
        raise ScoreError("Geef toestemming om je e-mailadres te gebruiken.")
    return url, email


def rate_limited(ip: str, now: float | None = None, bucket: str = "") -> bool:
    limit = int(os.environ.get("RATE_LIMIT_PER_HOUR", "10"))
    now = now if now is not None else time.time()
    q = _hits[f"{bucket}:{ip}"]
    while q and q[0] < now - 3600:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


def post_lead(fields: dict, origin: str) -> None:
    """Forward a lead to the configured webhook. Never raises."""
    hook = os.environ.get("LEAD_WEBHOOK_URL")
    if not hook:
        return
    payload = {
        **fields,
        "source": origin or "website-tool",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    headers = {"Content-Type": "application/json"}
    if os.environ.get("LEAD_WEBHOOK_SECRET"):
        headers["X-Webhook-Secret"] = os.environ["LEAD_WEBHOOK_SECRET"]
    try:
        requests.post(hook, json=payload, headers=headers, timeout=5)
    except requests.RequestException:
        pass


class LeadHandler(BaseHTTPRequestHandler):
    """Base request handler: CORS, validation, honeypot, rate limit, lead."""

    bucket = "tool"
    honeypot_response: dict = {}

    def run(self, url: str) -> dict:  # pragma: no cover - implemented by subclasses
        raise NotImplementedError

    def lead_fields(self, email: str, report: dict) -> dict:  # pragma: no cover
        raise NotImplementedError

    def send_lead(self, email: str, report: dict) -> None:
        post_lead(self.lead_fields(email, report), self.headers.get("Origin", ""))

    def _cors_origin(self) -> str | None:
        origin = self.headers.get("Origin", "")
        allowed = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
        if not allowed:
            return "*"
        return origin if origin in allowed else None

    def _send(self, status: int, body: dict) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        cors = self._cors_origin()
        if cors:
            self.send_header("Access-Control-Allow-Origin", cors)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        cors = self._cors_origin()
        if cors:
            self.send_header("Access-Control-Allow-Origin", cors)
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")
            self.send_header("Vary", "Origin")
        self.end_headers()

    def do_POST(self):  # noqa: N802
        if self._cors_origin() is None:
            return self._send(403, {"error": "Niet toegestaan."})
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            return self._send(400, {"error": "Ongeldig verzoek."})
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self._send(400, {"error": "Ongeldig verzoek."})

        if isinstance(data, dict) and data.get("website"):
            # Honeypot filled in: pretend success, do nothing.
            return self._send(200, self.honeypot_response)

        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        if rate_limited(ip, bucket=self.bucket):
            return self._send(429, {"error": "Te veel aanvragen. Probeer het over een uur opnieuw."})

        try:
            url, email = validate_payload(data)
            report = self.run(url)
        except ScoreError as exc:
            return self._send(422, {"error": str(exc)})
        except Exception:  # noqa: BLE001 - never leak internals to visitors
            return self._send(500, {"error": "Er ging iets mis bij het analyseren. Probeer het later opnieuw."})

        self.send_lead(email, report)
        return self._send(200, report)

    def do_GET(self):  # noqa: N802
        self._send(405, {"error": "Gebruik POST."})
