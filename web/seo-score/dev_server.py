#!/usr/bin/env python3
"""
Local test server for the SEO-score widget (no Vercel needed).

Serves the preview page (index.html), widget.js and the real POST
/api/seo-score endpoint, so you can enter any public URL and see the live
result in your browser. Leads are printed to the terminal instead of being
sent to a webhook (unless LEAD_WEBHOOK_URL is set).

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
STATIC = {"/": "index.html", "/index.html": "index.html", "/widget.js": "widget.js"}
TYPES = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8"}

_spec = importlib.util.spec_from_file_location("seo_score_api", os.path.join(HERE, "api", "seo-score.py"))
api = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(api)

if not os.environ.get("LEAD_WEBHOOK_URL"):
    def _print_lead(email, report, origin):
        print("\n[lead] " + json.dumps(
            {"email": email, "url": report.get("final_url"), "score": report.get("score")},
            ensure_ascii=False,
        ))
    api.send_lead = _print_lead


class DevHandler(api.handler):
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
    parser = argparse.ArgumentParser(description="Run the SEO-score widget locally.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser tab")
    args = parser.parse_args()
    os.environ.setdefault("RATE_LIMIT_PER_HOUR", "1000")
    url = f"http://localhost:{args.port}/"
    server = ThreadingHTTPServer(("127.0.0.1", args.port), DevHandler)
    print(f"SEO-score widget draait op {url}  (stoppen: Ctrl+C)")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGestopt.")


if __name__ == "__main__":
    main()
