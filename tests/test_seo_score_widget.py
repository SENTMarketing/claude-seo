"""Tests for the website SEO-score widget backend (web/seo-score/)."""

from __future__ import annotations

import importlib.util
import os
import socket
import sys
from unittest.mock import patch

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_WEB = os.path.join(_ROOT, "web", "seo-score")
if _WEB not in sys.path:
    sys.path.insert(0, _WEB)

import seo_score_engine as engine  # noqa: E402

_spec = importlib.util.spec_from_file_location("seo_score_api", os.path.join(_WEB, "api", "seo-score.py"))
api = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(api)

GOOD_HTML = """<!doctype html><html lang="nl"><head>
<title>SEO-specialist in Utrecht | Voorbeeld Marketing</title>
<meta name="description" content="Wij helpen MKB-bedrijven hoger in Google te komen met technische SEO, content en linkbuilding. Vraag een gratis scan aan.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://voorbeeld.nl/">
<link rel="icon" href="/favicon.ico">
<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="i">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Voorbeeld"}</script>
</head><body><h1>SEO in Utrecht</h1><h2>Diensten</h2>
<p>""" + ("woord " * 600) + """</p>
""" + "".join(f'<a href="/pagina-{i}">p{i}</a>' for i in range(12)) + """
<img src="a.jpg" alt="Team"><img src="b.jpg" alt="Kantoor">
</body></html>"""

BAD_HTML = "<html><head><meta name='robots' content='noindex'></head><body><p>Hallo</p></body></html>"


def _by_id(checks):
    return {c["id"]: c for c in checks}


def test_good_page_scores_high():
    checks = engine.analyze_html(GOOD_HTML, "https://voorbeeld.nl/", response_ms=300,
                                 robots_txt=(200, "User-agent: *\nDisallow: /admin"),
                                 sitemap=(200, "<urlset></urlset>"))
    result = engine.summarize(checks)
    assert result["score"] >= 95
    assert result["grade"] == "Uitstekend"
    assert all(c["status"] == "goed" for c in checks), [c for c in checks if c["status"] != "goed"]


def test_bad_page_scores_low_with_priorities():
    checks = engine.analyze_html(BAD_HTML, "http://voorbeeld.nl/", response_ms=2500,
                                 robots_txt=(404, ""), sitemap=(404, ""))
    result = engine.summarize(checks)
    by = _by_id(checks)
    assert result["score"] < 30
    assert by["https"]["status"] == "slecht"
    assert by["indexable"]["status"] == "slecht"
    assert by["title"]["status"] == "slecht"
    assert len(result["top_priorities"]) == 5
    assert all(p["advice"] for p in result["top_priorities"])


def test_robots_txt_block_all_detected():
    checks = engine.analyze_html(GOOD_HTML, "https://voorbeeld.nl/",
                                 robots_txt=(200, "User-agent: *\nDisallow: /\n"))
    assert _by_id(checks)["robots_txt"]["status"] == "slecht"


def test_scores_are_bounded():
    for html in (GOOD_HTML, BAD_HTML, ""):
        r = engine.summarize(engine.analyze_html(html, "https://voorbeeld.nl/"))
        assert 0 <= r["score"] <= 100
        assert all(0 <= c["score"] <= 100 for c in r["categories"].values())


@pytest.mark.parametrize("raw,expected", [
    ("voorbeeld.nl", "https://voorbeeld.nl"),
    (" https://www.voorbeeld.nl/pagina ", "https://www.voorbeeld.nl/pagina"),
])
def test_normalize_input_url(raw, expected):
    assert engine.normalize_input_url(raw) == expected


@pytest.mark.parametrize("raw", ["", "ftp://voorbeeld.nl", "javascript:alert(1)", "http://user:pw@voorbeeld.nl", "localhost"])
def test_normalize_input_url_rejects(raw):
    with pytest.raises(engine.ScoreError):
        engine.normalize_input_url(raw)


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "169.254.169.254", "192.168.1.1", "::1"])
def test_private_hosts_refused(ip):
    fake = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))]
    with patch.object(engine.socket, "getaddrinfo", return_value=fake):
        with pytest.raises(engine.ScoreError):
            engine.assert_public_host("https://evil.example.com/")


def test_public_host_allowed():
    fake = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]
    with patch.object(engine.socket, "getaddrinfo", return_value=fake):
        engine.assert_public_host("https://example.com/")


def test_metadata_hostname_refused():
    with pytest.raises(engine.ScoreError):
        engine.assert_public_host("http://metadata.google.internal/")


def test_validate_payload():
    assert api.validate_payload({"url": "voorbeeld.nl", "email": "a@b.nl", "consent": True}) == ("voorbeeld.nl", "a@b.nl")
    for bad in (
        {"url": "voorbeeld.nl", "email": "geen-email", "consent": True},
        {"url": "", "email": "a@b.nl", "consent": True},
        {"url": "voorbeeld.nl", "email": "a@b.nl", "consent": False},
        {"url": "voorbeeld.nl", "email": "a@b.nl", "consent": "true"},
    ):
        with pytest.raises(engine.ScoreError):
            api.validate_payload(bad)


def test_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_HOUR", "3")
    api._hits.clear()
    assert [api.rate_limited("1.2.3.4", now=1000 + i) for i in range(4)] == [False, False, False, True]
    assert api.rate_limited("1.2.3.4", now=1000 + 3700) is False


def test_send_lead_posts_payload(monkeypatch):
    monkeypatch.setenv("LEAD_WEBHOOK_URL", "https://hook.example.com/x")
    monkeypatch.setenv("LEAD_WEBHOOK_SECRET", "s3cret")
    report = {"url": "https://voorbeeld.nl", "score": 72, "grade": "Goed",
              "categories": {"technisch": {"score": 80}}, "top_priorities": [{"label": "H1-kop"}]}
    with patch.object(api.requests, "post") as post:
        api.send_lead("a@b.nl", report, "https://www.sent-marketing.nl", "kompas")
    kwargs = post.call_args.kwargs
    assert kwargs["json"]["email"] == "a@b.nl"
    assert kwargs["json"]["score"] == 72
    assert kwargs["json"]["categories"] == {"technisch": 80}
    assert kwargs["headers"]["X-Webhook-Secret"] == "s3cret"
    assert kwargs["json"]["variant"] == "kompas"


@pytest.mark.parametrize("raw,expected", [
    ("contrast", "contrast"), ("kort", "kort"), (None, ""), ("<script>", ""), ("x" * 40, ""),
])
def test_clean_variant(raw, expected):
    assert api.clean_variant(raw) == expected
