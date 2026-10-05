#!/usr/bin/env python3
"""
Local test server for the website lead tools (no Vercel needed).

Serves both lead tools with their real endpoints, so you can enter any public
URL and see the live result in your browser:

    http://localhost:8000/               SEO-score checker (POST /api/seo-score)
    http://localhost:8000/makeover.html  Website makeover (POST /api/site-makeover)

Leads are printed to the terminal instead of being sent to a webhook (unless
LEAD_WEBHOOK_URL is set). Set ANTHROPIC_API_KEY to get AI-written copy in the
makeover preview.

Usage:
    pip install -r web/seo-score/requirements.txt
    python3 web/seo-score/dev_server.py            # http://localhost:8000
    python3 web/seo-score/dev_server.py --port 8080
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import webbrowser
from http.server import ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = {
    "/": "index.html",
    "/index.html": "index.html",
    "/widget.js": "widget.js",
    "/makeover.html": "makeover.html",
    "/makeover.js": "makeover.js",
}
TYPES = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8"}


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, "api", filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


api = _load("seo_score_api", "seo-score.py")
makeover_api = _load("site_makeover_api", "site-makeover.py")


class DevHandler(api.handler):
    """Serves both tools: POST /api/seo-score and POST /api/site-makeover."""

    def _makeover(self) -> bool:
        return self.path.split("?")[0] == "/api/site-makeover"

    @property
    def bucket(self) -> str:  # separate rate-limit bucket per tool
        return "site-makeover" if self._makeover() else "seo-score"

    def run(self, url: str) -> dict:
        return makeover_api.make_preview(url) if self._makeover() else api.score_url(url)

    def send_lead(self, email: str, report: dict) -> None:
        if os.environ.get("LEAD_WEBHOOK_URL"):
            if self._makeover():
                makeover_api.handler.send_lead(self, email, report)
            else:
                api.send_lead(email, report, self.headers.get("Origin", ""))
            return
        fields = (makeover_api.handler.lead_fields(self, email, report) if self._makeover()
                  else {"tool": "seo-score", "email": email, "url": report.get("final_url"),
                        "score": report.get("score")})
        print("\n[lead] " + json.dumps(fields, ensure_ascii=False))

    def do_GET(self):  # noqa: N802
        name = STATIC.get(self.path.split("?")[0])
        if not name:
            self.send_response(404)
            self.end_headers()
            return
        with open(os.path.join(HERE, name), "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", TYPES[os.path.splitext(name)[1]])
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the SEO-score and makeover widgets locally.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser tab")
    args = parser.parse_args()
    os.environ.setdefault("RATE_LIMIT_PER_HOUR", "1000")
    url = f"http://localhost:{args.port}/"
    server = ThreadingHTTPServer(("127.0.0.1", args.port), DevHandler)
    print(f"SEO-score: {url}  |  Website-makeover: {url}makeover.html  (stoppen: Ctrl+C)")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGestopt.")


if __name__ == "__main__":
    main()
