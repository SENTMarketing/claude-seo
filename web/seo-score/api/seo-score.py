"""
Vercel serverless endpoint: POST /api/seo-score

Request (JSON):
    {"url": "voorbeeld.nl", "email": "naam@bedrijf.nl", "consent": true, "website": "",
     "variant": "contrast"}

    `website` is a honeypot field: real visitors never fill it; bots do.
    `variant` is the headline variant shown (A/B test), forwarded to the webhook.

Response 200 (JSON): the report from `seo_score_engine.score_url` (score, grade,
categories, top_priorities, checks).
Response 4xx (JSON): {"error": "<Dutch, user-facing message>"}

Environment variables:
    ALLOWED_ORIGINS   Comma-separated origins allowed to call the API via CORS,
                      e.g. "https://www.sent-marketing.nl,https://sent-marketing.webflow.io".
                      Empty = allow all (only for testing).
    LEAD_WEBHOOK_URL  Optional. Every scan is POSTed here as JSON (email, url,
                      score, ...) so leads land in Make / Zapier / n8n / a CRM.
    LEAD_WEBHOOK_SECRET  Optional. Sent as the X-Webhook-Secret header.
    RATE_LIMIT_PER_HOUR  Max scans per IP per warm instance (default 10).
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests  # noqa: E402

from seo_score_engine import ScoreError, score_url  # noqa: E402

VARIANT_RE = re.compile(r"^[a-z0-9-]{1,32}$")
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


def rate_limited(ip: str, now: float | None = None) -> bool:
    limit = int(os.environ.get("RATE_LIMIT_PER_HOUR", "10"))
    now = now if now is not None else time.time()
    q = _hits[ip]
    while q and q[0] < now - 3600:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


def clean_variant(value) -> str:
    """Return the A/B headline variant if well-formed, else an empty string."""
    value = str(value or "")
    return value if VARIANT_RE.match(value) else ""


def send_lead(email: str, report: dict, origin: str, variant: str = "") -> None:
    """Forward the lead to the configured webhook. Never raises."""
    hook = os.environ.get("LEAD_WEBHOOK_URL")
    if not hook:
        return
    payload = {
        "email": email,
        "url": report.get("url"),
        "final_url": report.get("final_url"),
        "score": report.get("score"),
        "grade": report.get("grade"),
        "categories": {k: v["score"] for k, v in report.get("categories", {}).items()},
        "top_priorities": [p["label"] for p in report.get("top_priorities", [])],
        "source": origin or "seo-score-widget",
        "variant": variant,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    headers = {"Content-Type": "application/json"}
    if os.environ.get("LEAD_WEBHOOK_SECRET"):
        headers["X-Webhook-Secret"] = os.environ["LEAD_WEBHOOK_SECRET"]
    try:
        requests.post(hook, json=payload, headers=headers, timeout=5)
    except requests.RequestException:
        pass


class handler(BaseHTTPRequestHandler):  # noqa: N801 - name required by Vercel
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
            return self._send(200, {"score": 0, "grade": "", "categories": {}, "checks": [], "top_priorities": []})

        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        if rate_limited(ip):
            return self._send(429, {"error": "Te veel aanvragen. Probeer het over een uur opnieuw."})

        try:
            url, email = validate_payload(data)
            report = score_url(url)
        except ScoreError as exc:
            return self._send(422, {"error": str(exc)})
        except Exception:  # noqa: BLE001 - never leak internals to visitors
            return self._send(500, {"error": "Er ging iets mis bij het analyseren. Probeer het later opnieuw."})

        send_lead(email, report, self.headers.get("Origin", ""), clean_variant(data.get("variant")))
        return self._send(200, report)

    def do_GET(self):  # noqa: N802
        self._send(405, {"error": "Gebruik POST."})
