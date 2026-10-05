#!/usr/bin/env python3
"""
Site makeover engine: extract a website's brand and content for a redesign preview.

Fetches one public URL (plus up to 4 of its stylesheets) and returns the
brand identity (name, logo, colours, fonts), the key content (headline,
description, services, navigation, contact details) and usable images. The
widget renders this into a modern page template in the site's own house
style, optionally with copy rewritten by Claude (see makeover_ai.py).

Fetching reuses the SSRF-safe `safe_get` from seo_score_engine: every host
and every redirect hop must resolve to public addresses.

CLI usage:
    python3 makeover_engine.py https://example.com
    python3 makeover_engine.py https://example.com --html-file page.html

Output: JSON on stdout.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import re
import sys
from collections import Counter
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from seo_score_engine import ScoreError, normalize_input_url, safe_get

MAX_STYLESHEETS = 4
MAX_CSS_BYTES = 400_000
GENERIC_FONTS = {
    "inherit", "initial", "unset", "sans-serif", "serif", "monospace", "cursive", "fantasy",
    "system-ui", "-apple-system", "blinkmacsystemfont", "ui-sans-serif", "ui-serif",
    "segoe ui", "roboto", "helvetica neue", "helvetica", "arial", "apple color emoji",
    "segoe ui emoji", "noto color emoji", "var",
}
HEX_RE = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})")
RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")
SAFE_FONT_RE = re.compile(r"^[A-Za-z0-9 \-]{2,40}$")


# --------------------------------------------------------------------------- #
# Colours
# --------------------------------------------------------------------------- #

def _to_hex(r: int, g: int, b: int) -> str:
    return "#{:02x}{:02x}{:02x}".format(*(max(0, min(255, v)) for v in (r, g, b)))


def _parse_colors(text: str) -> list[str]:
    out = []
    for m in HEX_RE.finditer(text):
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        out.append("#" + h.lower())
    for m in RGB_RE.finditer(text):
        out.append(_to_hex(*(int(m.group(i)) for i in (1, 2, 3))))
    return out


def _hls(hex_color: str) -> tuple[float, float, float]:
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)


def is_brand_color(hex_color: str) -> bool:
    """True for saturated, mid-lightness colours (not white/black/grey)."""
    h, lum, s = _hls(hex_color)
    return s >= 0.25 and 0.12 <= lum <= 0.85


def hue_distance(a: str, b: str) -> float:
    d = abs(_hls(a)[0] - _hls(b)[0]) * 360
    return min(d, 360 - d)


def collect_colors(css_text: str, theme_color: str | None) -> Counter:
    """Score candidate brand colours; buttons, links and brand variables count extra."""
    scores: Counter = Counter()
    if theme_color:
        for c in _parse_colors(theme_color):
            scores[c] += 25
    for selector, body in RULE_RE.findall(css_text):
        sel = selector.lower()
        weight = 1
        if re.search(r"btn|button|cta|primary|accent|brand", sel):
            weight = 4
        elif re.search(r"(^|[\s,>])a([\s,:.\[]|$)|header|nav|h1|h2", sel):
            weight = 2
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, value = decl.split(":", 1)
            prop = prop.strip().lower()
            w = weight
            if prop.startswith("--"):
                w = 6 if re.search(r"primary|brand|accent|main|secondary", prop) else 2
            elif not re.search(r"color|background|border|fill|stroke", prop):
                continue
            for c in _parse_colors(value):
                scores[c] += w
    return scores


def pick_palette(scores: Counter) -> dict:
    brand = [c for c, _ in scores.most_common() if is_brand_color(c)]
    primary = brand[0] if brand else None
    secondary = next((c for c in brand[1:] if hue_distance(c, primary) >= 25), None) if primary else None
    darks = [c for c, _ in scores.most_common() if _hls(c)[1] < 0.25]
    return {
        "primary": primary,
        "secondary": secondary,
        "dark": darks[0] if darks else None,
        "found": brand[:6],
    }


# --------------------------------------------------------------------------- #
# Fonts
# --------------------------------------------------------------------------- #

def _first_family(value: str) -> str | None:
    for part in value.split(","):
        name = part.strip().strip("'\"").strip()
        if not name or name.lower() in GENERIC_FONTS or name.lower().startswith("var("):
            continue
        return name if SAFE_FONT_RE.match(name) else None
    return None


def collect_fonts(soup: BeautifulSoup, css_text: str) -> dict:
    google: list[str] = []
    for link in soup.find_all("link", href=True):
        href = link["href"]
        if "fonts.googleapis.com" in href:
            for fam in re.findall(r"family=([^&:]+)", href):
                name = fam.replace("+", " ").strip()
                if SAFE_FONT_RE.match(name) and name not in google:
                    google.append(name)
    heading = body = None
    counts: Counter = Counter()
    for selector, decls in RULE_RE.findall(css_text):
        m = re.search(r"font-family\s*:\s*([^;]+)", decls, re.I)
        if not m:
            continue
        fam = _first_family(m.group(1))
        if not fam:
            continue
        counts[fam] += 1
        sel = selector.lower()
        if heading is None and re.search(r"(^|[\s,])h[1-3]\b|heading|title", sel):
            heading = fam
        if body is None and re.search(r"(^|[\s,])(body|html)\b", sel):
            body = fam
    common = [f for f, _ in counts.most_common()]
    body = body or (google[1] if len(google) > 1 else None) or (common[0] if common else None) or (google[0] if google else None)
    heading = heading or (google[0] if google else None) or body
    return {"heading": heading, "body": body, "google": google[:4]}


# --------------------------------------------------------------------------- #
# Content
# --------------------------------------------------------------------------- #

def _clean(text: str, limit: int) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[: limit - 1].rstrip() + "…" if len(text) > limit else text


def _abs_http(base: str, src: str | None) -> str | None:
    if not src or src.startswith("data:"):
        return None
    url = urljoin(base, src.strip())
    return url if urlparse(url).scheme in ("http", "https") else None


def _site_name(soup: BeautifulSoup, host: str) -> str:
    og = soup.find("meta", attrs={"property": "og:site_name"})
    if og and og.get("content"):
        return _clean(og["content"], 60)
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    generic = {"home", "homepage", "start", "welkom", "index", "hoofdpagina", "welcome"}
    parts = [p.strip() for p in re.split(r"\s+[|–—\-:•·]\s+", title) if p.strip()]
    parts = [p for p in parts if p.lower() not in generic] or parts
    if len(parts) > 1:
        # Prefer the part that shares a word with the domain, else the last (usually the brand).
        domain = host.removeprefix("www.").split(".")[0].lower()
        match = [p for p in parts if any(w.lower() in domain for w in re.findall(r"\w{4,}", p))]
        return _clean((match or parts[-1:])[0], 60)
    if parts:
        return _clean(parts[0], 60)
    return host.removeprefix("www.").split(".")[0].capitalize()


def _logo(soup: BeautifulSoup, base: str) -> str | None:
    def is_logo(tag) -> bool:
        blob = " ".join(
            [" ".join(tag.get("class", [])), tag.get("id", ""), tag.get("alt", ""), tag.get("src", "")]
        ).lower()
        return "logo" in blob

    for scope in (soup.find("header"), soup.find("nav"), soup):
        if scope is None:
            continue
        for img in scope.find_all("img"):
            if is_logo(img) or (scope is not soup and img.find_parent("a", href=True)):
                url = _abs_http(base, img.get("src") or img.get("data-src"))
                if url:
                    return url
    for rel in ("apple-touch-icon", "icon"):
        link = soup.find("link", rel=lambda v, r=rel: v and r in (v if isinstance(v, list) else [v]))
        if link:
            url = _abs_http(base, link.get("href"))
            if url and not url.endswith(".ico"):
                return url
    return None


def _images(soup: BeautifulSoup, base: str, logo: str | None) -> dict:
    hero = None
    og = soup.find("meta", attrs={"property": "og:image"})
    if og:
        hero = _abs_http(base, og.get("content"))
    gallery: list[str] = []
    for img in soup.find_all("img"):
        src = _abs_http(base, img.get("src") or img.get("data-src"))
        if not src or src == logo or src in gallery:
            continue
        low = src.lower()
        if any(k in low for k in ("logo", "icon", "sprite", "pixel", ".svg", "gravatar", "avatar")):
            continue
        try:
            w = int(str(img.get("width", "0")).rstrip("px") or 0)
        except ValueError:
            w = 0
        if w and w < 200:
            continue
        gallery.append(src)
        if len(gallery) >= 6:
            break
    if not hero and gallery:
        hero = gallery[0]
    return {"hero": hero, "gallery": [g for g in gallery if g != hero][:4]}


def extract_content(soup: BeautifulSoup, base: str) -> dict:
    h1 = soup.find("h1")
    desc = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    headings: list[str] = []
    for tag in soup.find_all(["h2", "h3"]):
        t = _clean(tag.get_text(" ", strip=True), 80)
        if 3 <= len(t) and t not in headings:
            headings.append(t)
        if len(headings) >= 10:
            break
    nav: list[str] = []
    nav_scope = soup.find("nav") or soup.find("header")
    if nav_scope:
        for a in nav_scope.find_all("a", href=True):
            t = _clean(a.get_text(" ", strip=True), 30)
            if 2 <= len(t) <= 30 and t not in nav:
                nav.append(t)
            if len(nav) >= 6:
                break
    paragraphs = []
    for p in soup.find_all("p"):
        t = _clean(p.get_text(" ", strip=True), 400)
        if len(t) >= 60:
            paragraphs.append(t)
        if len(paragraphs) >= 6:
            break
    ctas = []
    for el in soup.find_all(["a", "button"]):
        cls = " ".join(el.get("class", [])).lower()
        if re.search(r"btn|button|cta", cls):
            t = _clean(el.get_text(" ", strip=True), 40)
            if 2 <= len(t) and t not in ctas:
                ctas.append(t)
        if len(ctas) >= 4:
            break
    phone = email = None
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not phone and href.lower().startswith("tel:"):
            phone = _clean(a.get_text(" ", strip=True) or href[4:], 30)
        if not email and href.lower().startswith("mailto:"):
            email = _clean(href[7:].split("?")[0], 80)
    return {
        "h1": _clean(h1.get_text(" ", strip=True), 120) if h1 else "",
        "description": _clean(desc.get("content", ""), 300) if desc else "",
        "headings": headings,
        "nav": nav,
        "paragraphs": paragraphs,
        "ctas": ctas,
        "phone": phone,
        "email": email,
    }


def analyze_site(html: str, final_url: str, css_text: str = "") -> dict:
    """Extract brand + content from fetched HTML and CSS. Pure function (no network)."""
    soup = BeautifulSoup(html, "html.parser")
    host = urlparse(final_url).hostname or ""
    inline_css = "\n".join(s.get_text() for s in soup.find_all("style"))
    style_attrs = "\n".join(f"x{{{t['style']}}}" for t in soup.find_all(style=True))
    all_css = "\n".join([css_text, inline_css, style_attrs])
    theme = soup.find("meta", attrs={"name": "theme-color"})
    palette = pick_palette(collect_colors(all_css, theme.get("content") if theme else None))
    logo = _logo(soup, final_url)
    html_tag = soup.find("html")
    return {
        "brand": {
            "name": _site_name(soup, host),
            "logo": logo,
            "colors": palette,
            "fonts": collect_fonts(soup, all_css),
        },
        "content": extract_content(soup, final_url),
        "images": _images(soup, final_url, logo),
        "lang": (html_tag.get("lang") if html_tag else None) or "nl",
    }


def fetch_stylesheets(soup: BeautifulSoup, base: str) -> str:
    texts = []
    for link in soup.find_all("link", href=True):
        rel = link.get("rel") or []
        rel = rel if isinstance(rel, list) else [rel]
        if "stylesheet" not in [r.lower() for r in rel]:
            continue
        href = _abs_http(base, link["href"])
        if not href or "fonts.googleapis.com" in href:
            continue
        try:
            resp, _, _ = safe_get(href, timeout=5)
        except (requests.RequestException, ScoreError):
            continue
        if resp.status_code == 200:
            texts.append(resp.text[:MAX_CSS_BYTES])
        if len(texts) >= MAX_STYLESHEETS:
            break
    return "\n".join(texts)


def makeover_url(raw_url: str) -> dict:
    """Fetch a URL and its stylesheets and return the extracted brand + content."""
    url = normalize_input_url(raw_url)
    try:
        resp, final_url, _ = safe_get(url)
    except requests.exceptions.SSLError:
        raise ScoreError("Het SSL-certificaat van deze website is ongeldig.") from None
    except requests.RequestException:
        raise ScoreError("De website reageert niet. Controleer de URL en probeer het opnieuw.") from None
    if resp.status_code >= 400:
        raise ScoreError("Deze pagina kon niet worden geladen. Controleer de URL.")
    if "html" not in resp.headers.get("Content-Type", "").lower():
        raise ScoreError("Deze URL is geen webpagina (HTML).")
    html = resp.text
    css = fetch_stylesheets(BeautifulSoup(html, "html.parser"), final_url)
    return {"url": url, "final_url": final_url, **analyze_site(html, final_url, css)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract brand and content for a site makeover preview.")
    parser.add_argument("url", help="URL to analyse")
    parser.add_argument("--html-file", help="Analyse a local HTML file instead of fetching (offline)")
    args = parser.parse_args()
    try:
        if args.html_file:
            with open(args.html_file, encoding="utf-8") as fh:
                url = normalize_input_url(args.url)
                result = {"url": url, "final_url": url, **analyze_site(fh.read(), url)}
        else:
            result = makeover_url(args.url)
    except ScoreError as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
