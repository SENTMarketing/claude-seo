"""Tests for the website makeover tool (web/seo-score/makeover_*.py, api/site-makeover.py)."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_WEB = os.path.join(_ROOT, "web", "seo-score")
_FIX = os.path.join(_ROOT, "tests", "fixtures", "makeover")
if _WEB not in sys.path:
    sys.path.insert(0, _WEB)

import makeover_ai  # noqa: E402
import makeover_engine as engine  # noqa: E402

_spec = importlib.util.spec_from_file_location("site_makeover_api", os.path.join(_WEB, "api", "site-makeover.py"))
api = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(api)

BASE = "https://www.lindehout-voorbeeld.nl/"


@pytest.fixture(scope="module")
def site():
    with open(os.path.join(_FIX, "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    with open(os.path.join(_FIX, "style.css"), encoding="utf-8") as fh:
        css = fh.read()
    return {"url": BASE, "final_url": BASE, **engine.analyze_site(html, BASE, css)}


def test_brand_name_from_title(site):
    assert site["brand"]["name"] == "Hoveniersbedrijf Lindehout"


def test_logo_detected_and_absolute(site):
    assert site["brand"]["logo"] == BASE + "logo.svg"


def test_brand_colors(site):
    colors = site["brand"]["colors"]
    assert colors["primary"] == "#4a7c2a"
    assert colors["secondary"] == "#e2a72e"
    assert all(engine.is_brand_color(c) for c in colors["found"])


def test_neutrals_are_not_brand_colors():
    for c in ("#ffffff", "#f2f2f2", "#333333", "#000000", "#dddddd"):
        assert not engine.is_brand_color(c)


def test_fonts(site):
    fonts = site["brand"]["fonts"]
    assert fonts["heading"] == "Poppins"
    assert fonts["body"] == "Open Sans"
    assert fonts["google"] == ["Poppins", "Open Sans"]


def test_content(site):
    c = site["content"]
    assert c["h1"] == "Welkom bij Hoveniersbedrijf Lindehout"
    assert c["headings"] == ["Tuinaanleg", "Tuinonderhoud", "Bestrating"]
    assert c["nav"][:3] == ["Home", "Tuinaanleg", "Onderhoud"]
    assert c["phone"] == "033 123 45 67"
    assert c["email"] == "info@lindehout-voorbeeld.nl"
    assert c["ctas"] == ["Vraag een offerte aan"]


def test_images(site):
    assert site["images"]["hero"] == BASE + "images/tuin.jpg"
    assert BASE + "logo.svg" not in site["images"]["gallery"]


def test_unsafe_font_names_are_dropped():
    soup = engine.BeautifulSoup("<html></html>", "html.parser")
    fonts = engine.collect_fonts(soup, "body{font-family:'</style><script>x',serif}")
    assert fonts["body"] is None


def test_javascript_urls_are_dropped():
    html = '<header><img class="logo" src="javascript:alert(1)"></header><meta property="og:image" content="data:image/png;base64,AA">'
    out = engine.analyze_site(html, BASE)
    assert out["brand"]["logo"] is None
    assert out["images"]["hero"] is None


def test_fallback_copy_uses_only_site_text(site):
    copy = makeover_ai.fallback_copy(site)
    assert copy["hero_title"] == "Welkom bij Hoveniersbedrijf Lindehout"
    assert [s["title"] for s in copy["services"]] == ["Tuinaanleg", "Tuinonderhoud", "Bestrating"]
    assert copy["usps"] == []
    assert copy["cta_primary"] == "Vraag een offerte aan"


def test_ai_copy_skipped_without_key(site, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    copy, used = makeover_ai.build_copy(site)
    assert used is False
    assert copy["hero_title"]


def _fake_client(text, stop_reason="end_turn"):
    client = MagicMock()
    client.beta.messages.create.return_value = SimpleNamespace(
        stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=text)]
    )
    return client


def test_ai_copy_is_normalized(site):
    ai = {
        "hero_title": "Een tuin waar je elke dag van geniet",
        "hero_subtitle": "Tuinaanleg, onderhoud en bestrating in Amersfoort.",
        "cta_primary": "Vraag een offerte aan",
        "cta_secondary": "Bekijk onze diensten",
        "usps": [{"title": f"USP {i}", "text": "x" * 500} for i in range(5)],
        "services_title": "Diensten",
        "services": [{"title": "Tuinaanleg", "text": "Compleet aangelegd."}],
        "about_title": "Over Lindehout",
        "about_text": "Hovenier in Amersfoort.",
        "contact_title": "Zin in een nieuwe tuin?",
        "contact_text": "Plan een vrijblijvend gesprek.",
    }
    client = _fake_client(json.dumps(ai))
    copy, used = makeover_ai.build_copy(site, client)
    assert used is True
    assert len(copy["usps"]) == 3
    assert all(len(u["text"]) <= 160 for u in copy["usps"])
    kwargs = client.beta.messages.create.call_args.kwargs
    assert kwargs["model"] == "claude-opus-5-5"
    assert kwargs["output_config"]["format"]["schema"] == makeover_ai.COPY_SCHEMA
    assert "<website>" in kwargs["messages"][0]["content"]
    assert "Verzin niets" in kwargs["system"]


@pytest.mark.parametrize("text,stop", [("not json", "end_turn"), ("{}", "refusal"), ('{"a":1}', "max_tokens")])
def test_ai_copy_falls_back(site, text, stop):
    copy, used = makeover_ai.build_copy(site, _fake_client(text, stop))
    assert used is False
    assert copy["hero_title"] == "Welkom bij Hoveniersbedrijf Lindehout"


def test_ai_copy_api_error_falls_back(site):
    client = MagicMock()
    client.beta.messages.create.side_effect = RuntimeError("boom")
    _, used = makeover_ai.build_copy(site, client)
    assert used is False


def test_make_preview_shape(site):
    with patch.object(api, "makeover_url", return_value=json.loads(json.dumps(site))):
        out = api.make_preview("lindehout-voorbeeld.nl", client=_fake_client("nope"))
    assert set(out) >= {"brand", "content", "images", "copy", "ai"}
    assert "paragraphs" not in out["content"]


def test_lead_fields(site):
    report = {**site, "ai": False}
    fields = api.handler.lead_fields(None, "a@b.nl", report)
    assert fields["tool"] == "site-makeover"
    assert fields["company"] == "Hoveniersbedrijf Lindehout"
    assert fields["phone"] == "033 123 45 67"
    assert "#4a7c2a" in fields["colors"]


# --- industry, improvements, missing input, inlined images -------------------

def test_industry_from_keywords(site):
    assert site["industry"] == "groen_bouw"


@pytest.mark.parametrize("text,expected", [
    ("Fysiotherapie praktijk. Maak een afspraak voor je behandeling bij onze fysiotherapeut.", "zorg"),
    ("Onafhankelijk hypotheekadvies en financieel advies. Hypotheek nodig?", "financieel"),
    ("Gratis verzending vanaf 50 euro. Bekijk je winkelwagen en ga naar afrekenen.", "webshop"),
    ("Wij maken mooie dingen.", "overig"),
])
def test_classify_industry(text, expected):
    assert engine.classify_industry(f"<html><body><p>{text}</p></body></html>") == expected


def test_improvements_are_specific(site):
    with open(os.path.join(_FIX, "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    items = engine.improvements(html, BASE, site["content"])
    titles = [i["title"] for i in items]
    assert titles[0] == "Eén duidelijke boodschap bovenaan"
    assert "Goed leesbaar op je telefoon" in titles  # fixture has no viewport meta
    assert "Telefoonnummer direct zichtbaar" in titles
    assert "Duidelijke knop naar contact" not in titles  # fixture has a CTA button
    assert len(items) <= 6


def test_needs_input():
    site = {"brand": {"logo": None, "colors": {"primary": None}}}
    assert engine.needs_input(site) == {"color": True, "logo": True}
    site = {"brand": {"logo": "data:image/png;base64,AA", "colors": {"primary": "#123456"}}}
    assert engine.needs_input(site) == {"color": False, "logo": False}


def _resp(ctype, body, status=200):
    return SimpleNamespace(status_code=status, headers={"Content-Type": ctype}, content=body)


def test_inline_image_data_uri():
    with patch.object(engine, "safe_get", return_value=(_resp("image/png", b"\x89PNG"), "", [])):
        assert engine.inline_image("https://x.nl/a.png", 1000) == "data:image/png;base64,iVBORw=="


@pytest.mark.parametrize("ctype,body,status", [
    ("text/html", b"<html>", 200),
    ("image/png", b"x" * 2000, 200),
    ("image/png", b"x", 404),
])
def test_inline_image_rejects(ctype, body, status):
    with patch.object(engine, "safe_get", return_value=(_resp(ctype, body, status), "", [])):
        assert engine.inline_image("https://x.nl/a.png", 1000) is None


def test_inline_image_blocked_host():
    with patch.object(engine, "safe_get", side_effect=engine.ScoreError("blocked")):
        assert engine.inline_image("http://169.254.169.254/a.png", 1000) is None


def test_ai_industry_and_steps_normalized(site):
    ai = {**makeover_ai.fallback_copy(site), "industry": "raket", "steps": [{"title": f"S{i}", "text": "t"} for i in range(6)],
          "area_text": "Amersfoort en omgeving"}
    copy, used = makeover_ai.build_copy(site, _fake_client(json.dumps(ai)))
    assert used is True
    assert copy["industry"] == "overig"
    assert len(copy["steps"]) == 4
    assert copy["area_text"] == "Amersfoort en omgeving"
    assert "industry" in makeover_ai.COPY_SCHEMA["required"]


def test_fallback_copy_uses_industry_defaults():
    site = {"brand": {"name": "Praktijk X"}, "industry": "zorg",
            "content": {"h1": "", "description": "", "headings": [], "paragraphs": [], "ctas": []}}
    copy = makeover_ai.fallback_copy(site)
    assert copy["cta_primary"] == "Maak een afspraak"
    assert copy["services_title"] == "Behandelingen"
    assert copy["steps"] == [] and copy["area_text"] == ""
