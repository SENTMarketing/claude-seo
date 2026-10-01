#!/usr/bin/env python3
"""
SEO score engine for the public website lead-magnet ("SEO-score checker").

Fetches a single public URL, runs ~20 fast on-page and technical checks, and
returns a 0-100 score split into four categories, plus per-check advice in
Dutch. Designed to finish well inside a serverless function timeout: one page
fetch plus robots.txt and sitemap.xml probes, no headless browser.

This module is deliberately self-contained (requests + beautifulsoup4 only)
so the `web/seo-score/` directory can be deployed on its own (e.g. Vercel)
without the rest of the claude-seo repository.

SSRF protection: every hostname (including each redirect hop) is resolved and
all A/AAAA records must be public unicast addresses before a request is made.
Redirects are followed manually so each hop is re-validated.

CLI usage:
    python3 seo_score_engine.py https://example.com
    python3 seo_score_engine.py https://example.com --html-file page.html

Output: JSON on stdout (see `score_url` for the shape).
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import re
import socket
import sys
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (compatible; SENT-SEO-Score/1.0; +https://www.sent-marketing.nl)"
FETCH_TIMEOUT = 10
MAX_REDIRECTS = 5
MAX_BYTES = 3_000_000
BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal", "metadata", "instance-data"}

# Category weights (sum = 100).
CATEGORIES = {
    "technisch": {"label": "Techniek", "weight": 30},
    "content": {"label": "Content & on-page", "weight": 35},
    "structuur": {"label": "Structuur & links", "weight": 15},
    "zichtbaarheid": {"label": "Social & rich results", "weight": 20},
}


class ScoreError(ValueError):
    """Raised for user-facing errors (invalid URL, unreachable site, ...)."""


# --------------------------------------------------------------------------- #
# URL safety + fetching
# --------------------------------------------------------------------------- #

def normalize_input_url(raw: str) -> str:
    """Accept 'example.nl' or 'https://example.nl/pagina' and return a full URL."""
    url = (raw or "").strip()
    if not url:
        raise ScoreError("Vul een URL in.")
    if len(url) > 2048:
        raise ScoreError("Deze URL is te lang.")
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "https://" + url
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ScoreError("Dit is geen geldige website-URL.")
    if parsed.username or parsed.password or "@" in parsed.netloc:
        raise ScoreError("Dit is geen geldige website-URL.")
    if "." not in parsed.hostname:
        raise ScoreError("Dit is geen geldige website-URL.")
    return url


def _is_public_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return ip.is_global and not ip.is_multicast


def assert_public_host(url: str) -> None:
    """Resolve the URL's host and refuse it unless every address is public."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or host in BLOCKED_HOSTNAMES or host.endswith((".local", ".internal")):
        raise ScoreError("Deze URL kan niet gecontroleerd worden.")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise ScoreError("Deze website is niet gevonden. Controleer de URL.") from None
    ips = {info[4][0] for info in infos}
    if not ips or not all(_is_public_ip(ip) for ip in ips):
        raise ScoreError("Deze URL kan niet gecontroleerd worden.")


def safe_get(url: str, timeout: int = FETCH_TIMEOUT) -> tuple[requests.Response, str, list[str]]:
    """GET with manual, re-validated redirects. Returns (response, final_url, chain)."""
    chain: list[str] = []
    current = url
    with requests.Session() as session:
        session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "nl,en;q=0.8"})
        for _ in range(MAX_REDIRECTS + 1):
            assert_public_host(current)
            resp = session.get(current, timeout=timeout, allow_redirects=False, stream=True)
            if resp.is_redirect and resp.headers.get("Location"):
                chain.append(current)
                current = urljoin(current, resp.headers["Location"])
                if urlparse(current).scheme not in ("http", "https"):
                    raise ScoreError("De website stuurt door naar een ongeldige URL.")
                resp.close()
                continue
            body = resp.raw.read(MAX_BYTES + 1, decode_content=True)
            resp._content = body[:MAX_BYTES]  # noqa: SLF001 - cap memory use
            resp._content_consumed = True  # noqa: SLF001
            return resp, current, chain
    raise ScoreError("De website heeft te veel doorverwijzingen.")


def _probe(url: str) -> tuple[int, str]:
    """Best-effort GET for robots.txt / sitemap.xml. Returns (status, text)."""
    try:
        resp, _, _ = safe_get(url, timeout=5)
        return resp.status_code, resp.text[:200_000]
    except (requests.RequestException, ScoreError):
        return 0, ""


# --------------------------------------------------------------------------- #
# Checks
# --------------------------------------------------------------------------- #

def _check(cid, category, label, status, weight, message, advice=""):
    points = {"goed": 1.0, "matig": 0.5, "slecht": 0.0}[status] * weight
    return {
        "id": cid,
        "category": category,
        "label": label,
        "status": status,
        "weight": weight,
        "points": round(points, 2),
        "message": message,
        "advice": advice if status != "goed" else "",
    }


def analyze_html(
    html: str,
    final_url: str,
    *,
    status_code: int = 200,
    response_ms: int | None = None,
    redirect_count: int = 0,
    robots_txt: tuple[int, str] | None = None,
    sitemap: tuple[int, str] | None = None,
) -> list[dict]:
    """Run all checks against already-fetched HTML. Pure function (no network)."""
    soup = BeautifulSoup(html, "html.parser")
    parsed = urlparse(final_url)
    host = parsed.hostname or ""
    checks: list[dict] = []
    add = checks.append

    # ---- Techniek ---------------------------------------------------------
    if parsed.scheme == "https":
        add(_check("https", "technisch", "HTTPS", "goed", 6, "De site gebruikt een beveiligde verbinding."))
    else:
        add(_check("https", "technisch", "HTTPS", "slecht", 6, "De site gebruikt geen HTTPS.",
                   "Installeer een SSL-certificaat en stuur alle HTTP-verkeer door naar HTTPS."))

    if status_code == 200:
        add(_check("status", "technisch", "Bereikbaarheid", "goed", 5, "De pagina laadt correct (HTTP 200)."))
    else:
        add(_check("status", "technisch", "Bereikbaarheid", "slecht", 5,
                   f"De pagina geeft statuscode {status_code}.",
                   "Zorg dat de pagina een 200-status teruggeeft, anders wordt hij niet geïndexeerd."))

    if response_ms is not None:
        if response_ms < 800:
            add(_check("speed", "technisch", "Reactiesnelheid server", "goed", 5, f"De server reageert snel ({response_ms} ms)."))
        elif response_ms < 1800:
            add(_check("speed", "technisch", "Reactiesnelheid server", "matig", 5, f"De server reageert redelijk ({response_ms} ms).",
                       "Verbeter de serverrespons met caching, een CDN of snellere hosting."))
        else:
            add(_check("speed", "technisch", "Reactiesnelheid server", "slecht", 5, f"De server reageert traag ({response_ms} ms).",
                       "Een trage server kost rankings en bezoekers. Kijk naar caching, CDN en hosting."))

    if redirect_count <= 1:
        add(_check("redirects", "technisch", "Doorverwijzingen", "goed", 2, "Geen onnodige doorverwijzingsketens."))
    else:
        add(_check("redirects", "technisch", "Doorverwijzingen", "matig", 2, f"{redirect_count} doorverwijzingen voor de pagina laadt.",
                   "Verwijs in één stap door naar de definitieve URL."))

    robots_meta = ""
    tag = soup.find("meta", attrs={"name": re.compile(r"^(robots|googlebot)$", re.I)})
    if tag:
        robots_meta = (tag.get("content") or "").lower()
    if "noindex" in robots_meta:
        add(_check("indexable", "technisch", "Indexeerbaarheid", "slecht", 6, "De pagina staat op 'noindex' en verschijnt niet in Google.",
                   "Verwijder de noindex-tag als deze pagina gevonden moet worden."))
    else:
        add(_check("indexable", "technisch", "Indexeerbaarheid", "goed", 6, "De pagina mag door zoekmachines geïndexeerd worden."))

    if soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)}):
        add(_check("viewport", "technisch", "Mobielvriendelijk", "goed", 4, "Er is een viewport-tag voor mobiele weergave."))
    else:
        add(_check("viewport", "technisch", "Mobielvriendelijk", "slecht", 4, "Geen viewport-tag gevonden.",
                   "Voeg <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> toe."))

    if robots_txt is not None:
        code, text = robots_txt
        blocked_all = bool(re.search(r"user-agent:\s*\*\s*(?:\n(?!user-agent).*)*\ndisallow:\s*/\s*(\n|$)", text.lower()))
        if code == 200 and not blocked_all:
            add(_check("robots_txt", "technisch", "robots.txt", "goed", 1, "Er is een geldig robots.txt-bestand."))
        elif code == 200:
            add(_check("robots_txt", "technisch", "robots.txt", "slecht", 1, "robots.txt blokkeert de hele site.",
                       "Verwijder 'Disallow: /' voor alle crawlers."))
        else:
            add(_check("robots_txt", "technisch", "robots.txt", "matig", 1, "Geen robots.txt gevonden.",
                       "Plaats een robots.txt met een verwijzing naar je sitemap."))

    if sitemap is not None:
        code, text = sitemap
        if code == 200 and ("<urlset" in text or "<sitemapindex" in text):
            add(_check("sitemap", "technisch", "XML-sitemap", "goed", 1, "Er is een XML-sitemap gevonden."))
        else:
            add(_check("sitemap", "technisch", "XML-sitemap", "matig", 1, "Geen XML-sitemap gevonden op /sitemap.xml.",
                       "Maak een XML-sitemap en meld deze aan in Google Search Console."))

    # ---- Content & on-page -----------------------------------------------
    title = soup.title.get_text(strip=True) if soup.title else ""
    if not title:
        add(_check("title", "content", "Paginatitel", "slecht", 9, "De pagina heeft geen titel.",
                   "Schrijf een unieke titel van 30-60 tekens met je belangrijkste zoekwoord."))
    elif 30 <= len(title) <= 60:
        add(_check("title", "content", "Paginatitel", "goed", 9, f"Titel heeft een goede lengte ({len(title)} tekens)."))
    else:
        add(_check("title", "content", "Paginatitel", "matig", 9, f"Titel is {'te kort' if len(title) < 30 else 'te lang'} ({len(title)} tekens).",
                   "Houd de titel tussen 30 en 60 tekens zodat hij volledig in Google verschijnt."))

    desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    desc = (desc_tag.get("content") or "").strip() if desc_tag else ""
    if not desc:
        add(_check("meta_description", "content", "Meta description", "slecht", 7, "Er is geen meta description.",
                   "Schrijf een wervende omschrijving van 120-160 tekens; dit verhoogt de klikratio."))
    elif 70 <= len(desc) <= 160:
        add(_check("meta_description", "content", "Meta description", "goed", 7, f"Meta description heeft een goede lengte ({len(desc)} tekens)."))
    else:
        add(_check("meta_description", "content", "Meta description", "matig", 7,
                   f"Meta description is {'te kort' if len(desc) < 70 else 'te lang'} ({len(desc)} tekens).",
                   "Houd de meta description tussen 70 en 160 tekens."))

    h1s = [h.get_text(strip=True) for h in soup.find_all("h1")]
    if len(h1s) == 1 and h1s[0]:
        add(_check("h1", "content", "H1-kop", "goed", 7, "Er is precies één H1-kop."))
    elif not h1s:
        add(_check("h1", "content", "H1-kop", "slecht", 7, "Er is geen H1-kop.",
                   "Geef elke pagina één duidelijke H1 die het onderwerp beschrijft."))
    else:
        add(_check("h1", "content", "H1-kop", "matig", 7, f"Er zijn {len(h1s)} H1-koppen.",
                   "Gebruik één H1 per pagina en H2/H3 voor subkoppen."))

    if soup.find("h2"):
        add(_check("headings", "content", "Kopstructuur", "goed", 3, "De tekst is opgedeeld met subkoppen."))
    else:
        add(_check("headings", "content", "Kopstructuur", "matig", 3, "Geen H2-subkoppen gevonden.",
                   "Structureer je tekst met H2- en H3-koppen voor lezers en zoekmachines."))

    for t in soup(["script", "style", "noscript", "template", "svg"]):
        t.decompose()
    body = soup.body or soup
    words = len(re.findall(r"\w+", body.get_text(" ", strip=True)))
    if words >= 500:
        add(_check("word_count", "content", "Hoeveelheid tekst", "goed", 6, f"De pagina bevat voldoende tekst ({words} woorden)."))
    elif words >= 250:
        add(_check("word_count", "content", "Hoeveelheid tekst", "matig", 6, f"De pagina bevat vrij weinig tekst ({words} woorden).",
                   "Breid de content uit met nuttige informatie die vragen van bezoekers beantwoordt."))
    else:
        add(_check("word_count", "content", "Hoeveelheid tekst", "slecht", 6, f"De pagina bevat weinig tekst ({words} woorden).",
                   "Dunne content rankt slecht. Voeg minimaal 300-500 woorden waardevolle tekst toe."))

    html_tag = soup.find("html")
    lang = html_tag.get("lang") if html_tag else None
    if lang:
        add(_check("lang", "content", "Taalinstelling", "goed", 3, f"De paginataal is ingesteld ({lang})."))
    else:
        add(_check("lang", "content", "Taalinstelling", "matig", 3, "Geen lang-attribuut op <html>.",
                   "Voeg lang=\"nl\" (of de juiste taal) toe aan de <html>-tag."))

    # ---- Structuur & links ------------------------------------------------
    imgs = [i for i in body.find_all("img") if i.get("src") or i.get("data-src")]
    if imgs:
        with_alt = sum(1 for i in imgs if (i.get("alt") or "").strip())
        pct = round(100 * with_alt / len(imgs))
        status = "goed" if pct >= 90 else "matig" if pct >= 60 else "slecht"
        add(_check("img_alt", "structuur", "Alt-teksten afbeeldingen", status, 5, f"{pct}% van de afbeeldingen heeft een alt-tekst ({with_alt}/{len(imgs)}).",
                   "Geef elke afbeelding een beschrijvende alt-tekst voor toegankelijkheid en Google Afbeeldingen."))
    else:
        add(_check("img_alt", "structuur", "Alt-teksten afbeeldingen", "goed", 5, "Geen afbeeldingen zonder alt-tekst gevonden."))

    internal = 0
    bare_host = host.removeprefix("www.")
    for a in body.find_all("a", href=True):
        href = urljoin(final_url, a["href"])
        h = (urlparse(href).hostname or "").removeprefix("www.")
        if h == bare_host:
            internal += 1
    if internal >= 10:
        add(_check("internal_links", "structuur", "Interne links", "goed", 5, f"De pagina linkt naar {internal} interne pagina's."))
    elif internal >= 3:
        add(_check("internal_links", "structuur", "Interne links", "matig", 5, f"Slechts {internal} interne links.",
                   "Link vaker naar relevante pagina's binnen je site om autoriteit te verdelen."))
    else:
        add(_check("internal_links", "structuur", "Interne links", "slecht", 5, f"Bijna geen interne links ({internal}).",
                   "Voeg navigatie- en contextuele links naar je belangrijkste pagina's toe."))

    canonical = soup.find("link", rel=lambda v: v and "canonical" in (v if isinstance(v, list) else [v]))
    if canonical and canonical.get("href"):
        add(_check("canonical", "structuur", "Canonical-tag", "goed", 5, "Er is een canonical-tag ingesteld."))
    else:
        add(_check("canonical", "structuur", "Canonical-tag", "matig", 5, "Geen canonical-tag gevonden.",
                   "Voeg een canonical-tag toe om duplicate content te voorkomen."))

    # ---- Social & rich results ---------------------------------------------
    # soup.find for <script> no longer works after decompose; re-parse head bits.
    head_soup = BeautifulSoup(html, "html.parser")
    ld = head_soup.find_all("script", attrs={"type": re.compile(r"application/ld\+json", re.I)})
    types: list[str] = []
    for s in ld:
        try:
            data = json.loads(s.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        items = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for it in items:
            if isinstance(it, dict) and it.get("@type"):
                t = it["@type"]
                types.extend(t if isinstance(t, list) else [t])
    if types:
        add(_check("schema", "zichtbaarheid", "Gestructureerde data", "goed", 8,
                   f"Schema.org-markup gevonden: {', '.join(sorted(set(map(str, types)))[:5])}."))
    else:
        add(_check("schema", "zichtbaarheid", "Gestructureerde data", "slecht", 8, "Geen gestructureerde data (JSON-LD) gevonden.",
                   "Voeg Schema.org-markup toe (bijv. Organization, LocalBusiness) voor rich results en AI-zoekmachines."))

    og = {m.get("property", "").lower() for m in head_soup.find_all("meta", attrs={"property": True})}
    needed = {"og:title", "og:description", "og:image"}
    have = len(needed & og)
    status = "goed" if have == 3 else "matig" if have else "slecht"
    add(_check("open_graph", "zichtbaarheid", "Open Graph (social delen)", status, 6, f"{have} van 3 belangrijke Open Graph-tags aanwezig.",
               "Voeg og:title, og:description en og:image toe zodat gedeelde links er goed uitzien."))

    if head_soup.find("link", rel=lambda v: v and any("icon" in r for r in (v if isinstance(v, list) else [v]))):
        add(_check("favicon", "zichtbaarheid", "Favicon", "goed", 3, "Er is een favicon ingesteld."))
    else:
        add(_check("favicon", "zichtbaarheid", "Favicon", "matig", 3, "Geen favicon gevonden.",
                   "Een favicon wordt in Google-resultaten getoond en versterkt je merk."))

    if head_soup.find("meta", attrs={"name": re.compile(r"^twitter:card$", re.I)}):
        add(_check("twitter", "zichtbaarheid", "Twitter/X-card", "goed", 3, "Er is een Twitter/X-card ingesteld."))
    else:
        add(_check("twitter", "zichtbaarheid", "Twitter/X-card", "matig", 3, "Geen Twitter/X-card gevonden.",
                   "Voeg <meta name=\"twitter:card\" content=\"summary_large_image\"> toe."))

    return checks


def summarize(checks: list[dict]) -> dict:
    """Aggregate checks into an overall 0-100 score and per-category scores."""
    cats = {}
    for key, meta in CATEGORIES.items():
        items = [c for c in checks if c["category"] == key]
        max_pts = sum(c["weight"] for c in items)
        pts = sum(c["points"] for c in items)
        pct = round(100 * pts / max_pts) if max_pts else 0
        cats[key] = {"label": meta["label"], "score": pct, "weight": meta["weight"]}
    present = {c["category"] for c in checks}
    total_w = sum(c["weight"] for k, c in cats.items() if k in present)
    overall = round(
        sum(c["score"] * c["weight"] for k, c in cats.items() if k in present) / total_w
    ) if total_w else 0
    if overall >= 80:
        grade = "Uitstekend"
    elif overall >= 60:
        grade = "Goed, met verbeterpunten"
    elif overall >= 40:
        grade = "Matig"
    else:
        grade = "Veel ruimte voor verbetering"
    rank = {"slecht": 0, "matig": 1}
    priorities = sorted((c for c in checks if c["status"] != "goed"),
                        key=lambda c: (rank[c["status"]], -c["weight"]))
    return {
        "score": overall,
        "grade": grade,
        "categories": cats,
        "top_priorities": [{"label": c["label"], "advice": c["advice"]} for c in priorities[:5]],
        "counts": {s: sum(1 for c in checks if c["status"] == s) for s in ("goed", "matig", "slecht")},
    }


def score_url(raw_url: str) -> dict:
    """Fetch a URL and return the full score report as a dict."""
    url = normalize_input_url(raw_url)
    start = time.monotonic()
    try:
        resp, final_url, chain = safe_get(url)
    except requests.exceptions.SSLError:
        raise ScoreError("Het SSL-certificaat van deze website is ongeldig.") from None
    except requests.RequestException:
        raise ScoreError("De website reageert niet. Controleer de URL en probeer het opnieuw.") from None
    elapsed_ms = int((time.monotonic() - start) * 1000)
    ctype = resp.headers.get("Content-Type", "")
    if "html" not in ctype.lower():
        raise ScoreError("Deze URL is geen webpagina (HTML).")
    root = f"{urlparse(final_url).scheme}://{urlparse(final_url).netloc}"
    checks = analyze_html(
        resp.text,
        final_url,
        status_code=resp.status_code,
        response_ms=elapsed_ms,
        redirect_count=len(chain),
        robots_txt=_probe(root + "/robots.txt"),
        sitemap=_probe(root + "/sitemap.xml"),
    )
    return {"url": url, "final_url": final_url, **summarize(checks), "checks": checks}


def main() -> None:
    parser = argparse.ArgumentParser(description="Calculate a 0-100 SEO score for a URL.")
    parser.add_argument("url", help="URL to analyse")
    parser.add_argument("--html-file", help="Score a local HTML file instead of fetching (offline)")
    args = parser.parse_args()
    try:
        if args.html_file:
            with open(args.html_file, encoding="utf-8") as fh:
                checks = analyze_html(fh.read(), normalize_input_url(args.url))
            result = {"url": args.url, **summarize(checks), "checks": checks}
        else:
            result = score_url(args.url)
    except ScoreError as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
