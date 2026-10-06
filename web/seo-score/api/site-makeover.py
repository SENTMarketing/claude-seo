"""
Vercel serverless endpoint: POST /api/site-makeover

Request (JSON): same as /api/seo-score
    {"url": "voorbeeld.nl", "email": "naam@bedrijf.nl", "consent": true, "website": ""}

Response 200 (JSON):
    {"url", "final_url", "brand": {name, logo, colors, fonts}, "content": {...},
     "images": {hero, gallery}, "lang", "industry", "improvements": [{title, text}],
     "needs_input": {color, logo}, "copy": {hero_title, ..., services, usps, steps,
     area_text, industry}, "ai": bool}
    Images (logo, hero, gallery) are inlined as data: URIs.
Response 4xx (JSON): {"error": "<Dutch, user-facing message>"}

Environment variables: see lead_common.py, plus ANTHROPIC_API_KEY / MAKEOVER_MODEL /
MAKEOVER_EFFORT for AI copy (see makeover_ai.py).
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_common import LeadHandler  # noqa: E402
from makeover_ai import build_copy  # noqa: E402
from makeover_engine import makeover_url  # noqa: E402


def make_preview(url: str, client=None) -> dict:
    site = makeover_url(url)
    copy, ai = build_copy(site, client)
    site["industry"] = copy["industry"]
    # Paragraphs are only needed to write copy; keep the response small.
    site["content"].pop("paragraphs", None)
    return {**site, "copy": copy, "ai": ai}


class handler(LeadHandler):  # noqa: N801 - name required by Vercel
    bucket = "site-makeover"
    honeypot_response = {"brand": {}, "copy": {}, "content": {}, "images": {}}

    def run(self, url: str) -> dict:
        return make_preview(url)

    def lead_fields(self, email: str, report: dict) -> dict:
        brand = report.get("brand", {})
        return {
            "tool": "site-makeover",
            "email": email,
            "url": report.get("url"),
            "final_url": report.get("final_url"),
            "company": brand.get("name"),
            "colors": brand.get("colors", {}).get("found", []),
            "fonts": brand.get("fonts", {}),
            "phone": report.get("content", {}).get("phone"),
            "industry": report.get("industry"),
            "ai_copy": report.get("ai"),
        }
