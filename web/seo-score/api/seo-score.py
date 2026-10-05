"""
Vercel serverless endpoint: POST /api/seo-score

Request (JSON):
    {"url": "voorbeeld.nl", "email": "naam@bedrijf.nl", "consent": true, "website": ""}

    `website` is a honeypot field: real visitors never fill it; bots do.

Response 200 (JSON): the report from `seo_score_engine.score_url` (score, grade,
categories, top_priorities, checks).
Response 4xx (JSON): {"error": "<Dutch, user-facing message>"}

Environment variables: see lead_common.py (ALLOWED_ORIGINS, LEAD_WEBHOOK_URL,
LEAD_WEBHOOK_SECRET, RATE_LIMIT_PER_HOUR).
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests  # noqa: E402,F401 - re-exported for tests that patch requests.post

from lead_common import (  # noqa: E402,F401 - re-exported for tests and dev_server
    EMAIL_RE,
    LeadHandler,
    _hits,
    post_lead,
    rate_limited,
    validate_payload,
)
from seo_score_engine import score_url  # noqa: E402


def send_lead(email: str, report: dict, origin: str) -> None:
    """Forward an SEO-score lead to the configured webhook. Never raises."""
    post_lead(
        {
            "tool": "seo-score",
            "email": email,
            "url": report.get("url"),
            "final_url": report.get("final_url"),
            "score": report.get("score"),
            "grade": report.get("grade"),
            "categories": {k: v["score"] for k, v in report.get("categories", {}).items()},
            "top_priorities": [p["label"] for p in report.get("top_priorities", [])],
        },
        origin,
    )


class handler(LeadHandler):  # noqa: N801 - name required by Vercel
    bucket = "seo-score"
    honeypot_response = {"score": 0, "grade": "", "categories": {}, "checks": [], "top_priorities": []}

    def run(self, url: str) -> dict:
        return score_url(url)

    def send_lead(self, email: str, report: dict) -> None:
        send_lead(email, report, self.headers.get("Origin", ""))
