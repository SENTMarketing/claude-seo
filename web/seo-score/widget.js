/*
 * SENT SEO-score widget.
 *
 * Embed on any page (Webflow "Embed" element, WordPress HTML block, ...):
 *
 *   <div id="sent-seo-score"
 *        data-api="https://JOUW-PROJECT.vercel.app/api/seo-score"
 *        data-privacy-url="/privacybeleid"
 *        data-cta-url="/contact"
 *        data-cta-text="Plan een gratis SEO-adviesgesprek"></div>
 *   <script src="https://JOUW-PROJECT.vercel.app/widget.js" defer></script>
 *
 * All data-* attributes are optional; data-api defaults to the host serving
 * this script. Styles are scoped under .sss- to avoid clashing with the site.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var scriptOrigin = script ? new URL(script.src, location.href).origin : location.origin;

  var CSS = "" +
    ".sss{--sss-accent:#1e3a5f;--sss-good:#2d6a4f;--sss-warn:#d4740e;--sss-bad:#c53030;--sss-bg:#fff;--sss-muted:#5b6472;--sss-border:#e3e6eb;" +
    "font-family:inherit;color:#1a1f29;max-width:720px;margin:0 auto;box-sizing:border-box}" +
    ".sss *{box-sizing:border-box}" +
    ".sss-card{background:var(--sss-bg);border:1px solid var(--sss-border);border-radius:14px;padding:24px}" +
    ".sss-form{display:grid;gap:12px}" +
    ".sss-row{display:grid;gap:12px;grid-template-columns:1fr 1fr}" +
    "@media(max-width:600px){.sss-row{grid-template-columns:1fr}}" +
    ".sss label{display:block;font-size:14px;font-weight:600;margin-bottom:4px}" +
    ".sss input[type=text],.sss input[type=email]{width:100%;padding:12px 14px;font-size:16px;border:1px solid var(--sss-border);border-radius:8px;font-family:inherit}" +
    ".sss input:focus{outline:2px solid var(--sss-accent);outline-offset:1px}" +
    ".sss-consent{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--sss-muted)}" +
    ".sss-consent input{margin-top:3px}" +
    ".sss-hp{position:absolute!important;left:-9999px!important;height:0;width:0;overflow:hidden}" +
    ".sss-btn{background:var(--sss-accent);color:#fff;border:0;border-radius:8px;padding:14px 20px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;text-align:center}" +
    ".sss-btn:disabled{opacity:.6;cursor:wait}" +
    ".sss-error{color:var(--sss-bad);font-size:14px;min-height:1em}" +
    ".sss-loading{text-align:center;padding:24px;color:var(--sss-muted)}" +
    ".sss-spin{width:36px;height:36px;border:4px solid var(--sss-border);border-top-color:var(--sss-accent);border-radius:50%;margin:0 auto 12px;animation:sss-spin 1s linear infinite}" +
    "@keyframes sss-spin{to{transform:rotate(360deg)}}" +
    ".sss-head{display:flex;gap:24px;align-items:center;flex-wrap:wrap}" +
    ".sss-ring{width:132px;height:132px;flex:none}" +
    ".sss-ring text{font-family:inherit}" +
    ".sss-grade{font-size:22px;font-weight:700;margin:0 0 4px}" +
    ".sss-url{color:var(--sss-muted);font-size:14px;word-break:break-all}" +
    ".sss-cats{display:grid;gap:10px;margin:24px 0}" +
    ".sss-cat{display:grid;grid-template-columns:170px 1fr 44px;gap:10px;align-items:center;font-size:14px}" +
    "@media(max-width:600px){.sss-cat{grid-template-columns:1fr 44px}.sss-bar{grid-column:1/-1;order:3}}" +
    ".sss-bar{height:8px;background:var(--sss-border);border-radius:4px;overflow:hidden}" +
    ".sss-bar span{display:block;height:100%;border-radius:4px}" +
    ".sss h3{font-size:17px;margin:20px 0 10px}" +
    ".sss-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}" +
    ".sss-item{border:1px solid var(--sss-border);border-radius:8px;padding:10px 12px;font-size:14px}" +
    ".sss-item strong{display:block;margin-bottom:2px}" +
    ".sss-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}" +
    ".sss-details summary{cursor:pointer;font-weight:600;margin:16px 0 8px}" +
    ".sss-cta{margin-top:24px;padding:18px;border-radius:10px;background:#faf9f7;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}" +
    ".sss-link{background:none;border:0;color:var(--sss-accent);text-decoration:underline;cursor:pointer;font:inherit;padding:0}";

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function colorFor(score) {
    return score >= 80 ? "var(--sss-good)" : score >= 50 ? "var(--sss-warn)" : "var(--sss-bad)";
  }
  var STATUS_COLOR = { goed: "var(--sss-good)", matig: "var(--sss-warn)", slecht: "var(--sss-bad)" };

  function ring(score) {
    var r = 56, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 132 132");
    svg.setAttribute("class", "sss-ring");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "SEO-score " + score + " van 100");
    svg.innerHTML =
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="#e3e6eb" stroke-width="12"/>' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="' + colorFor(score) + '" stroke-width="12" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 66 66)"/>' +
      '<text x="66" y="72" text-anchor="middle" font-size="34" font-weight="700" fill="currentColor">' + score + "</text>" +
      '<text x="66" y="92" text-anchor="middle" font-size="12" fill="#5b6472">van 100</text>';
    return svg;
  }

  function init(root) {
    if (root.dataset.sssReady) return;
    root.dataset.sssReady = "1";
    var api = root.dataset.api || scriptOrigin + "/api/seo-score";
    var privacyUrl = root.dataset.privacyUrl || "/privacy";
    var ctaUrl = root.dataset.ctaUrl || "/contact";
    var ctaText = root.dataset.ctaText || "Plan een gratis SEO-adviesgesprek";

    root.classList.add("sss");
    var card = el("div", { class: "sss-card" });
    root.innerHTML = "";
    root.appendChild(card);

    function renderForm(prefill) {
      prefill = prefill || {};
      card.innerHTML = "";
      var form = el("form", { class: "sss-form", novalidate: "" });
      var urlIn = el("input", { type: "text", name: "url", id: "sss-url", placeholder: "jouwwebsite.nl", required: "", inputmode: "url", autocomplete: "url" });
      var mailIn = el("input", { type: "email", name: "email", id: "sss-email", placeholder: "naam@bedrijf.nl", required: "", autocomplete: "email" });
      urlIn.value = prefill.url || "";
      mailIn.value = prefill.email || "";
      var consent = el("input", { type: "checkbox", name: "consent", id: "sss-consent" });
      var consentLabel = el("label", { for: "sss-consent", class: "sss-consent" });
      consentLabel.style.fontWeight = "400";
      var privacy = el("a", { href: privacyUrl, target: "_blank", rel: "noopener", text: "privacybeleid" });
      consentLabel.appendChild(consent);
      consentLabel.appendChild(el("span", {}, [
        document.createTextNode("Ik ga akkoord dat mijn e-mailadres wordt gebruikt om mijn SEO-rapport en relevante tips te sturen. Zie ons "),
        privacy, document.createTextNode(".")
      ]));
      var hp = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true", class: "sss-hp" });
      var err = el("div", { class: "sss-error", role: "alert", "aria-live": "polite" });
      var btn = el("button", { type: "submit", class: "sss-btn", text: "Bereken mijn SEO-score" });

      form.appendChild(el("div", { class: "sss-row" }, [
        el("div", {}, [el("label", { for: "sss-url", text: "Website-URL" }), urlIn]),
        el("div", {}, [el("label", { for: "sss-email", text: "E-mailadres" }), mailIn])
      ]));
      form.appendChild(consentLabel);
      form.appendChild(hp);
      form.appendChild(err);
      form.appendChild(btn);
      card.appendChild(form);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        err.textContent = "";
        var data = { url: urlIn.value.trim(), email: mailIn.value.trim(), consent: consent.checked, website: hp.value };
        if (!data.url) { err.textContent = "Vul de URL van je website in."; urlIn.focus(); return; }
        if (!/^\S+@\S+\.\S+$/.test(data.email)) { err.textContent = "Vul een geldig e-mailadres in."; mailIn.focus(); return; }
        if (!data.consent) { err.textContent = "Geef toestemming om je e-mailadres te gebruiken."; return; }
        submit(data);
      });
    }

    function renderLoading() {
      card.innerHTML = "";
      card.appendChild(el("div", { class: "sss-loading", role: "status" }, [
        el("div", { class: "sss-spin" }),
        el("div", { text: "We analyseren je website… dit duurt meestal 5 tot 15 seconden." })
      ]));
    }

    function submit(data) {
      renderLoading();
      fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body && res.body.error || "Er ging iets mis.");
          renderResult(res.body, data);
          if (window.dataLayer) window.dataLayer.push({ event: "seo_score_generated", seo_score: res.body.score });
        })
        .catch(function (e) {
          renderForm(data);
          card.querySelector(".sss-error").textContent =
            e && e.message && e.message !== "Failed to fetch" ? e.message : "De analyse is niet gelukt. Probeer het opnieuw.";
        });
    }

    function renderResult(r, data) {
      card.innerHTML = "";
      card.appendChild(el("div", { class: "sss-head" }, [
        ring(r.score),
        el("div", {}, [
          el("p", { class: "sss-grade", text: r.grade }),
          el("div", { class: "sss-url", text: r.final_url || r.url }),
          el("div", { class: "sss-url", text: r.counts ? (r.counts.goed + " goed · " + r.counts.matig + " matig · " + r.counts.slecht + " slecht") : "" })
        ])
      ]));

      var cats = el("div", { class: "sss-cats" });
      Object.keys(r.categories || {}).forEach(function (k) {
        var c = r.categories[k];
        var bar = el("div", { class: "sss-bar" }, [el("span")]);
        bar.firstChild.style.width = c.score + "%";
        bar.firstChild.style.background = colorFor(c.score);
        cats.appendChild(el("div", { class: "sss-cat" }, [
          el("span", { text: c.label }), bar, el("strong", { text: c.score + "%" })
        ]));
      });
      card.appendChild(cats);

      if (r.top_priorities && r.top_priorities.length) {
        card.appendChild(el("h3", { text: "Jouw belangrijkste verbeterpunten" }));
        var list = el("ul", { class: "sss-list" });
        r.top_priorities.forEach(function (p) {
          list.appendChild(el("li", { class: "sss-item" }, [el("strong", { text: p.label }), el("span", { text: p.advice })]));
        });
        card.appendChild(list);
      }

      var details = el("details", { class: "sss-details" }, [el("summary", { text: "Bekijk alle " + (r.checks || []).length + " controles" })]);
      var all = el("ul", { class: "sss-list" });
      (r.checks || []).forEach(function (c) {
        var dot = el("span", { class: "sss-dot", title: c.status });
        dot.style.background = STATUS_COLOR[c.status];
        all.appendChild(el("li", { class: "sss-item" }, [
          el("strong", {}, [dot, document.createTextNode(c.label)]),
          el("span", { text: c.message + (c.advice ? " " + c.advice : "") })
        ]));
      });
      details.appendChild(all);
      card.appendChild(details);

      var again = el("button", { type: "button", class: "sss-link", text: "Andere URL controleren" });
      again.addEventListener("click", function () { renderForm({ email: data.email }); });
      card.appendChild(el("div", { class: "sss-cta" }, [
        el("div", {}, [
          el("strong", { text: "Hulp nodig bij het verbeteren van je score?" }),
          el("div", {}, [again])
        ]),
        el("a", { class: "sss-btn", href: ctaUrl, text: ctaText })
      ]));
    }

    renderForm();
  }

  function boot() {
    if (!document.getElementById("sss-style")) {
      var st = document.createElement("style");
      st.id = "sss-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var nodes = document.querySelectorAll("#sent-seo-score, [data-sent-seo-score]");
    Array.prototype.forEach.call(nodes, init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
