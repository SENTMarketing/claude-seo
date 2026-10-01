/*
 * SENT SEO-score widget, styled in the SENT Marketing house style
 * (navy #10173B base, accent #3FA9F5, lavender #E0E6FF, Montserrat headings,
 * pill-shaped buttons, compass needle as a subtle motif).
 *
 * Embed on any page (Webflow "Embed" element, WordPress HTML block, ...):
 *
 *   <div id="sent-seo-score"
 *        data-api="https://JOUW-PROJECT.vercel.app/api/seo-score"
 *        data-privacy-url="/privacybeleid"
 *        data-cta-url="/contact"
 *        data-cta-text="Plan een kennismaking"
 *        data-whatsapp="31620405236"
 *        data-theme="donker"></div>
 *   <script src="https://JOUW-PROJECT.vercel.app/widget.js" defer></script>
 *
 * All data-* attributes are optional; data-api defaults to the host serving
 * this script. data-theme: "donker" (default, navy card) or "licht"
 * (lavender card, for light page sections). data-title / data-intro
 * override the headline and intro text. Styles are scoped under .sss.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var scriptOrigin = script ? new URL(script.src, location.href).origin : location.origin;

  var FONT_HREF = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap";

  var CSS = "" +
    /* Theme tokens: values mirror the SENT Webflow/Figma variables. */
    ".sss{--sss-navy:#10173B;--sss-accent:#3FA9F5;--sss-lavender:#E0E6FF;--sss-sub:#9DA5C5;--sss-block:#4A516E;" +
    "--sss-good:#34D399;--sss-warn:#F5B83F;--sss-bad:#F26D6D;" +
    "--sss-bg:var(--sss-navy);--sss-heading:var(--sss-lavender);--sss-text:var(--sss-sub);--sss-surface:rgba(224,230,255,.06);" +
    "--sss-line:rgba(224,230,255,.14);--sss-input-bg:rgba(224,230,255,.08);--sss-track:rgba(224,230,255,.12);" +
    "--sss-head-font:Montserrat,system-ui,sans-serif;--sss-body-font:inherit;" +
    "font-family:var(--sss-body-font);color:var(--sss-text);max-width:760px;margin:0 auto;box-sizing:border-box;line-height:1.55}" +
    ".sss[data-theme=licht]{--sss-bg:var(--sss-lavender);--sss-heading:var(--sss-navy);--sss-text:var(--sss-block);--sss-surface:#fff;" +
    "--sss-line:rgba(16,23,59,.12);--sss-input-bg:#fff;--sss-track:rgba(16,23,59,.1);--sss-good:#1F9D6B;--sss-warn:#C7861A;--sss-bad:#D14343}" +
    ".sss *{box-sizing:border-box}" +
    ".sss-card{position:relative;overflow:hidden;overflow:clip;background:var(--sss-bg);border-radius:24px;padding:40px 36px;isolation:isolate}" +
    "@media(max-width:600px){.sss-card{padding:28px 20px;border-radius:20px}}" +
    /* Two decorative 'Gloed' shapes, as in the social templates. */
    ".sss-card:before,.sss-card:after{content:'';position:absolute;border-radius:50%;filter:blur(70px);z-index:-1;pointer-events:none}" +
    ".sss-card:before{width:320px;height:320px;background:rgba(63,169,245,.35);top:-140px;right:-100px}" +
    ".sss-card:after{width:260px;height:260px;background:rgba(63,169,245,.18);bottom:-130px;left:-90px}" +
    ".sss[data-theme=licht] .sss-card:before{background:rgba(63,169,245,.28)}" +
    ".sss[data-theme=licht] .sss-card:after{background:rgba(255,255,255,.7)}" +
    ".sss-tag{display:inline-block;background:var(--sss-accent);color:var(--sss-navy);font:700 12px/1 var(--sss-head-font);letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;border-radius:48px;margin-bottom:16px}" +
    ".sss-title{font:800 clamp(24px,4vw,32px)/1.2 var(--sss-head-font);color:var(--sss-heading);margin:0 0 8px}" +
    ".sss-intro{margin:0 0 28px;font-size:16px}" +
    ".sss-form{display:grid;gap:16px}" +
    ".sss-row{display:grid;gap:16px;grid-template-columns:1fr 1fr}" +
    "@media(max-width:600px){.sss-row{grid-template-columns:1fr}}" +
    ".sss-field label{display:block;font:600 14px/1.3 var(--sss-head-font);color:var(--sss-heading);margin-bottom:8px}" +
    ".sss input[type=text],.sss input[type=email]{width:100%;padding:14px 20px;font-size:16px;font-family:inherit;color:var(--sss-heading);background:var(--sss-input-bg);border:1px solid var(--sss-line);border-radius:48px}" +
    ".sss input::placeholder{color:var(--sss-text);opacity:.7}" +
    ".sss input:focus{outline:2px solid var(--sss-accent);outline-offset:1px;border-color:transparent}" +
    ".sss-consent{display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer}" +
    ".sss-consent input{margin-top:3px;accent-color:var(--sss-accent);width:16px;height:16px;flex:none}" +
    ".sss-consent a{color:var(--sss-accent)}" +
    ".sss-hp{position:absolute!important;left:-9999px!important;height:0;width:0;overflow:hidden}" +
    ".sss-btn{background:var(--sss-accent);color:var(--sss-navy);border:0;border-radius:48px;padding:16px 28px;font:700 16px/1.2 var(--sss-head-font);cursor:pointer;text-decoration:none;display:inline-flex;gap:8px;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s}" +
    ".sss-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(63,169,245,.35)}" +
    ".sss-btn-ghost{background:transparent;color:var(--sss-heading);border:1px solid var(--sss-line)}" +
    ".sss-btn-ghost:hover{box-shadow:none;border-color:var(--sss-accent)}" +
    ".sss-form .sss-btn{justify-self:start}" +
    "@media(max-width:600px){.sss-form .sss-btn{justify-self:stretch}}" +
    ".sss-note{font-size:13px;margin:0}" +
    ".sss-error{color:var(--sss-bad);font-size:14px;min-height:1em}" +
    ".sss-loading{text-align:center;padding:32px 0}" +
    ".sss-loading p{color:var(--sss-heading);font:700 18px/1.3 var(--sss-head-font);margin:16px 0 4px}" +
    ".sss-compass{width:64px;height:64px;margin:0 auto;display:block}" +
    ".sss-compass .sss-needle{transform-origin:32px 32px;animation:sss-seek 1.6s ease-in-out infinite}" +
    "@keyframes sss-seek{0%{transform:rotate(-40deg)}50%{transform:rotate(55deg)}100%{transform:rotate(-40deg)}}" +
    "@media(prefers-reduced-motion:reduce){.sss-compass .sss-needle{animation:none}}" +
    ".sss-head{display:flex;gap:28px;align-items:center;flex-wrap:wrap}" +
    ".sss-ring{width:152px;height:152px;flex:none}" +
    ".sss-grade{font:800 26px/1.2 var(--sss-head-font);color:var(--sss-heading);margin:0 0 6px}" +
    ".sss-url{font-size:14px;word-break:break-all}" +
    ".sss-counts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}" +
    ".sss-pill{font:600 12px/1 var(--sss-head-font);padding:7px 12px;border-radius:48px;background:var(--sss-surface);color:var(--sss-heading);border:1px solid var(--sss-line)}" +
    ".sss-cats{display:grid;gap:14px;margin:32px 0}" +
    ".sss-cat{display:grid;grid-template-columns:190px 1fr 48px;gap:14px;align-items:center;font-size:14px;color:var(--sss-heading)}" +
    "@media(max-width:600px){.sss-cat{grid-template-columns:1fr 48px}.sss-bar{grid-column:1/-1;order:3}}" +
    ".sss-cat strong{font:700 15px var(--sss-head-font);text-align:right}" +
    ".sss-bar{height:8px;background:var(--sss-track);border-radius:48px;overflow:hidden}" +
    ".sss-bar span{display:block;height:100%;border-radius:48px;transition:width .8s ease}" +
    ".sss h3{font:700 18px/1.3 var(--sss-head-font);color:var(--sss-heading);margin:8px 0 14px}" +
    ".sss-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}" +
    ".sss-item{background:var(--sss-surface);border:1px solid var(--sss-line);border-radius:16px;padding:14px 18px;font-size:14px;display:grid;grid-template-columns:auto 1fr;gap:4px 14px}" +
    ".sss-item strong{font:700 15px/1.3 var(--sss-head-font);color:var(--sss-heading)}" +
    ".sss-num{grid-row:span 2;width:28px;height:28px;border-radius:50%;background:var(--sss-accent);color:var(--sss-navy);font:800 13px/28px var(--sss-head-font);text-align:center}" +
    ".sss-dot{grid-row:span 2;width:10px;height:10px;border-radius:50%;margin:6px 9px 0}" +
    ".sss-details summary{cursor:pointer;font:700 15px var(--sss-head-font);color:var(--sss-accent);margin:20px 0 12px}" +
    ".sss-cta{margin-top:32px;padding:24px;border-radius:20px;background:var(--sss-surface);border:1px solid var(--sss-line)}" +
    ".sss-cta-title{font:800 20px/1.25 var(--sss-head-font);color:var(--sss-heading);margin:0 0 6px}" +
    ".sss-cta p{margin:0 0 18px;font-size:14px}" +
    ".sss-actions{display:flex;gap:12px;flex-wrap:wrap}" +
    "@media(max-width:600px){.sss-actions .sss-btn{flex:1 1 100%;padding:16px 18px;text-align:center}}" +
    ".sss-link{background:none;border:0;color:var(--sss-accent);text-decoration:underline;cursor:pointer;font:600 14px var(--sss-head-font);padding:0;margin-top:16px}";

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

  function svg(markup, cls, label) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", cls);
    if (label) { s.setAttribute("role", "img"); s.setAttribute("aria-label", label); }
    else s.setAttribute("aria-hidden", "true");
    s.innerHTML = markup;
    return s;
  }

  function colorFor(score) {
    return score >= 80 ? "var(--sss-good)" : score >= 50 ? "var(--sss-warn)" : "var(--sss-bad)";
  }
  var STATUS_COLOR = { goed: "var(--sss-good)", matig: "var(--sss-warn)", slecht: "var(--sss-bad)" };

  // Score ring with the SENT compass needle pointing at the score.
  function ring(score) {
    var r = 64, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    var angle = score / 100 * 360;
    var s = svg(
      '<circle cx="76" cy="76" r="' + r + '" fill="none" stroke="var(--sss-track)" stroke-width="10"/>' +
      '<circle cx="76" cy="76" r="' + r + '" fill="none" stroke="' + colorFor(score) + '" stroke-width="10" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 76 76)"/>' +
      '<g transform="rotate(' + angle + ' 76 76)"><path d="M76 4 L81 16 L71 16 Z" fill="var(--sss-accent)"/></g>' +
      '<text x="76" y="84" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="40" font-weight="800" fill="var(--sss-heading)">' + score + "</text>" +
      '<text x="76" y="106" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="12" font-weight="600" fill="var(--sss-text)">van 100</text>',
      "sss-ring", "SEO-score " + score + " van 100");
    s.setAttribute("viewBox", "0 0 152 152");
    return s;
  }

  function compass() {
    var s = svg(
      '<circle cx="32" cy="32" r="29" fill="none" stroke="var(--sss-line)" stroke-width="2"/>' +
      '<circle cx="32" cy="32" r="3" fill="var(--sss-heading)"/>' +
      '<g class="sss-needle"><path d="M32 7 L37 32 L32 30 L27 32 Z" fill="var(--sss-accent)"/>' +
      '<path d="M32 57 L37 32 L32 34 L27 32 Z" fill="var(--sss-text)" opacity=".5"/></g>',
      "sss-compass");
    s.setAttribute("viewBox", "0 0 64 64");
    return s;
  }

  function init(root) {
    if (root.dataset.sssReady) return;
    root.dataset.sssReady = "1";
    var api = root.dataset.api || scriptOrigin + "/api/seo-score";
    var privacyUrl = root.dataset.privacyUrl || "/privacy";
    var ctaUrl = root.dataset.ctaUrl || "/contact";
    var ctaText = root.dataset.ctaText || "Plan een kennismaking";
    var whatsapp = (root.dataset.whatsapp || "").replace(/\D/g, "");
    var title = root.dataset.title || "Je SEO-score in 15 seconden.";
    var intro = root.dataset.intro || "Vul je website en e-mailadres in. Geen verkooppraatje, gewoon je score en wat je eraan kunt doen.";

    root.classList.add("sss");
    if (!root.dataset.theme) root.dataset.theme = "donker";
    var card = el("div", { class: "sss-card" });
    root.innerHTML = "";
    root.appendChild(card);

    function renderForm(prefill) {
      prefill = prefill || {};
      card.innerHTML = "";
      card.appendChild(el("span", { class: "sss-tag", text: "Gratis SEO-scan" }));
      card.appendChild(el("h2", { class: "sss-title", text: title }));
      card.appendChild(el("p", { class: "sss-intro", text: intro }));

      var form = el("form", { class: "sss-form", novalidate: "" });
      var urlIn = el("input", { type: "text", name: "url", id: "sss-url", placeholder: "jouwwebsite.nl", required: "", inputmode: "url", autocomplete: "url" });
      var mailIn = el("input", { type: "email", name: "email", id: "sss-email", placeholder: "naam@bedrijf.nl", required: "", autocomplete: "email" });
      urlIn.value = prefill.url || "";
      mailIn.value = prefill.email || "";
      var consent = el("input", { type: "checkbox", name: "consent", id: "sss-consent" });
      var privacy = el("a", { href: privacyUrl, target: "_blank", rel: "noopener", text: "privacyverklaring" });
      var consentLabel = el("label", { for: "sss-consent", class: "sss-consent" }, [consent, el("span", {}, [
        document.createTextNode("Ja, SENT mag mijn e-mailadres gebruiken om me de uitslag en praktische SEO-tips te sturen. Lees onze "),
        privacy, document.createTextNode(".")
      ])]);
      var hp = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true", class: "sss-hp" });
      var err = el("div", { class: "sss-error", role: "alert", "aria-live": "polite" });
      var btn = el("button", { type: "submit", class: "sss-btn", text: "Bereken mijn SEO-score →" });

      form.appendChild(el("div", { class: "sss-row" }, [
        el("div", { class: "sss-field" }, [el("label", { for: "sss-url", text: "Je website" }), urlIn]),
        el("div", { class: "sss-field" }, [el("label", { for: "sss-email", text: "Je e-mailadres" }), mailIn])
      ]));
      form.appendChild(consentLabel);
      form.appendChild(hp);
      form.appendChild(err);
      form.appendChild(btn);
      form.appendChild(el("p", { class: "sss-note", text: "100% gratis · Geen verkooppraatje · Direct resultaat" }));
      card.appendChild(form);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        err.textContent = "";
        var data = { url: urlIn.value.trim(), email: mailIn.value.trim(), consent: consent.checked, website: hp.value };
        if (!data.url) { err.textContent = "Vul de URL van je website in."; urlIn.focus(); return; }
        if (!/^\S+@\S+\.\S+$/.test(data.email)) { err.textContent = "Vul een geldig e-mailadres in."; mailIn.focus(); return; }
        if (!data.consent) { err.textContent = "Vink het vakje aan, dan kunnen we je de uitslag sturen."; return; }
        submit(data);
      });
    }

    function renderLoading() {
      card.innerHTML = "";
      card.appendChild(el("div", { class: "sss-loading", role: "status" }, [
        compass(),
        el("p", { text: "We bepalen je koers…" }),
        el("div", { text: "Je website wordt geanalyseerd. Dit duurt 5 tot 15 seconden." })
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
      card.appendChild(el("span", { class: "sss-tag", text: "Jouw SEO-score" }));
      var counts = r.counts ? el("div", { class: "sss-counts" }, [
        el("span", { class: "sss-pill", text: r.counts.goed + " goed" }),
        el("span", { class: "sss-pill", text: r.counts.matig + " matig" }),
        el("span", { class: "sss-pill", text: r.counts.slecht + " slecht" })
      ]) : null;
      card.appendChild(el("div", { class: "sss-head" }, [
        ring(r.score),
        el("div", {}, [
          el("p", { class: "sss-grade", text: r.grade }),
          el("div", { class: "sss-url", text: r.final_url || r.url }),
          counts
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
        card.appendChild(el("h3", { text: "Hier begin je mee" }));
        var list = el("ol", { class: "sss-list" });
        r.top_priorities.forEach(function (p, i) {
          list.appendChild(el("li", { class: "sss-item" }, [
            el("span", { class: "sss-num", text: String(i + 1) }),
            el("strong", { text: p.label }), el("span", { text: p.advice })
          ]));
        });
        card.appendChild(list);
      }

      var details = el("details", { class: "sss-details" }, [el("summary", { text: "Bekijk alle " + (r.checks || []).length + " controles" })]);
      var all = el("ul", { class: "sss-list" });
      (r.checks || []).forEach(function (c) {
        var dot = el("span", { class: "sss-dot", title: c.status });
        dot.style.background = STATUS_COLOR[c.status];
        all.appendChild(el("li", { class: "sss-item" }, [
          dot, el("strong", { text: c.label }),
          el("span", { text: c.message + (c.advice ? " " + c.advice : "") })
        ]));
      });
      details.appendChild(all);
      card.appendChild(details);

      var actions = el("div", { class: "sss-actions" }, [el("a", { class: "sss-btn", href: ctaUrl, text: ctaText + " →" })]);
      if (whatsapp) {
        var msg = encodeURIComponent("Hoi! Mijn SEO-score voor " + (r.final_url || r.url) + " is " + r.score + ". Kunnen jullie meekijken?");
        actions.appendChild(el("a", { class: "sss-btn sss-btn-ghost", href: "https://wa.me/" + whatsapp + "?text=" + msg, target: "_blank", rel: "noopener", text: "Stuur ons een WhatsApp" }));
      }
      var again = el("button", { type: "button", class: "sss-link", text: "Andere website checken" });
      again.addEventListener("click", function () { renderForm({ email: data.email }); });
      card.appendChild(el("div", { class: "sss-cta" }, [
        el("p", { class: "sss-cta-title", text: "Geen lijst die in een la verdwijnt, maar een betere score." }),
        el("p", { text: "Je spreekt direct met Stan of Timo, geen accountmanager. Binnen 24 uur contact." }),
        actions,
        again
      ]));
    }

    renderForm();
  }

  function boot() {
    if (!document.getElementById("sss-style")) {
      if (!document.querySelector('link[href*="family=Montserrat"]')) {
        var fl = document.createElement("link");
        fl.rel = "stylesheet";
        fl.href = FONT_HREF;
        document.head.appendChild(fl);
      }
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
