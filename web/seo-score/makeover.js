/*
 * SENT "website makeover" widget: a visitor enters their URL and e-mail and
 * sees a redesigned homepage concept in their own house style (logo, colours,
 * fonts and content taken from their current site).
 *
 *   <div id="sent-site-makeover"
 *        data-api="https://JOUW-PROJECT.vercel.app/api/site-makeover"
 *        data-privacy-url="/privacy"
 *        data-cta-url="/contact"
 *        data-whatsapp="31620405236"></div>
 *   <script src="https://JOUW-PROJECT.vercel.app/makeover.js" defer></script>
 *
 * The concept is rendered in a sandboxed iframe (no scripts) from data the
 * server extracted; every value is escaped or validated before use.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var scriptOrigin = script ? new URL(script.src, location.href).origin : location.origin;
  var FONT_HREF = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap";

  var CSS = "" +
    ".smo{--smo-navy:#10173B;--smo-accent:#3FA9F5;--smo-lavender:#E0E6FF;--smo-sub:#9DA5C5;--smo-bad:#F26D6D;" +
    "--smo-line:rgba(224,230,255,.14);--smo-surface:rgba(224,230,255,.06);--smo-input:rgba(224,230,255,.08);" +
    "--smo-head:Montserrat,system-ui,sans-serif;font-family:inherit;color:var(--smo-sub);max-width:1080px;min-width:0;margin:0 auto;box-sizing:border-box;line-height:1.55}" +
    ".smo *{box-sizing:border-box}" +
    ".smo-card{position:relative;overflow:hidden;overflow:clip;background:var(--smo-navy);border-radius:24px;padding:40px 36px;isolation:isolate}" +
    "@media(max-width:600px){.smo-card{padding:28px 18px;border-radius:20px}}" +
    ".smo-card:before,.smo-card:after{content:'';position:absolute;border-radius:50%;filter:blur(70px);z-index:-1;pointer-events:none}" +
    ".smo-card:before{width:340px;height:340px;background:rgba(63,169,245,.35);top:-150px;right:-110px}" +
    ".smo-card:after{width:280px;height:280px;background:rgba(63,169,245,.18);bottom:-140px;left:-100px}" +
    ".smo-tag{display:inline-block;background:var(--smo-accent);color:var(--smo-navy);font:700 12px/1 var(--smo-head);letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;border-radius:48px;margin-bottom:16px}" +
    ".smo-title{font:800 clamp(24px,4vw,34px)/1.2 var(--smo-head);color:var(--smo-lavender);margin:0 0 8px;text-wrap:balance}" +
    ".smo-intro{margin:0 0 28px;font-size:16px;max-width:680px}" +
    ".smo-form{display:grid;gap:16px;max-width:760px}" +
    ".smo-row{display:grid;gap:16px;grid-template-columns:1fr 1fr}" +
    "@media(max-width:600px){.smo-row{grid-template-columns:1fr}}" +
    ".smo-field label{display:block;font:600 14px/1.3 var(--smo-head);color:var(--smo-lavender);margin-bottom:8px}" +
    ".smo input[type=text],.smo input[type=email]{width:100%;padding:14px 20px;font-size:16px;font-family:inherit;color:var(--smo-lavender);background:var(--smo-input);border:1px solid var(--smo-line);border-radius:48px}" +
    ".smo input::placeholder{color:var(--smo-sub);opacity:.7}" +
    ".smo input:focus,.smo button:focus-visible,.smo a:focus-visible{outline:2px solid var(--smo-accent);outline-offset:2px}" +
    ".smo-consent{display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer}" +
    ".smo-consent input{margin-top:3px;accent-color:var(--smo-accent);width:16px;height:16px;flex:none}" +
    ".smo-consent a{color:var(--smo-accent)}" +
    ".smo-hp{position:absolute!important;left:-9999px!important;height:0;width:0;overflow:hidden}" +
    ".smo-btn{background:var(--smo-accent);color:var(--smo-navy);border:0;border-radius:48px;padding:16px 28px;font:700 16px/1.2 var(--smo-head);cursor:pointer;text-decoration:none;display:inline-flex;gap:8px;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s}" +
    ".smo-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(63,169,245,.35)}" +
    ".smo-ghost{background:transparent;color:var(--smo-lavender);border:1px solid var(--smo-line)}" +
    ".smo-ghost:hover{box-shadow:none;border-color:var(--smo-accent)}" +
    ".smo-form .smo-btn{justify-self:start}" +
    "@media(max-width:600px){.smo-form .smo-btn,.smo-actions .smo-btn{width:100%;padding:15px 14px;font-size:15px;text-align:center}}" +
    ".smo-error{color:var(--smo-bad);font-size:14px;min-height:1em}" +
    ".smo-steps{list-style:none;padding:0;margin:8px auto 0;display:grid;gap:12px;max-width:420px}" +
    ".smo-steps li{display:flex;gap:12px;align-items:center;font-size:15px;color:var(--smo-sub);transition:color .3s}" +
    ".smo-steps li.on{color:var(--smo-lavender)}" +
    ".smo-steps li.done{color:var(--smo-lavender)}" +
    ".smo-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--smo-line);flex:none;display:grid;place-items:center;font:800 12px/1 var(--smo-head);color:var(--smo-navy)}" +
    ".smo-steps li.on .smo-dot{border-color:var(--smo-accent);border-top-color:transparent;animation:smo-spin 1s linear infinite}" +
    ".smo-steps li.done .smo-dot{background:var(--smo-accent);border-color:var(--smo-accent)}" +
    "@keyframes smo-spin{to{transform:rotate(360deg)}}" +
    "@media(prefers-reduced-motion:reduce){.smo-steps li.on .smo-dot{animation:none}}" +
    ".smo-loading{padding:24px 0;text-align:center}" +
    ".smo-loading p{color:var(--smo-lavender);font:700 18px/1.3 var(--smo-head);margin:0 0 16px}" +
    ".smo-brand{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 24px}" +
    ".smo-chip{display:inline-flex;gap:8px;align-items:center;background:var(--smo-surface);border:1px solid var(--smo-line);border-radius:48px;padding:6px 14px 6px 6px;font-size:13px;color:var(--smo-lavender)}" +
    ".smo-chip.txt{padding:6px 14px}" +
    ".smo-sw{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.3)}" +
    ".smo-logo{height:28px;max-width:120px;object-fit:contain;background:#fff;border-radius:14px;padding:3px 8px}" +
    ".smo-label{font:700 12px/1 var(--smo-head);letter-spacing:.08em;text-transform:uppercase;color:var(--smo-sub);margin-right:4px}" +
    ".smo-toggle{display:inline-flex;background:var(--smo-surface);border:1px solid var(--smo-line);border-radius:48px;padding:4px;margin-bottom:14px}" +
    ".smo-toggle button{border:0;background:transparent;color:var(--smo-sub);font:700 14px/1 var(--smo-head);padding:10px 18px;border-radius:48px;cursor:pointer}" +
    ".smo-toggle button[aria-pressed=true]{background:var(--smo-accent);color:var(--smo-navy)}" +
    ".smo-frame{background:#0b1130;border:1px solid var(--smo-line);border-radius:16px;overflow:hidden;margin:0 auto;transition:max-width .3s}" +
    ".smo-frame.mobile{max-width:400px}" +
    ".smo-bar{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--smo-line)}" +
    ".smo-bar i{width:10px;height:10px;border-radius:50%;background:rgba(224,230,255,.2);display:block}" +
    ".smo-addr{flex:1;min-width:0;margin-left:8px;background:rgba(224,230,255,.08);border-radius:48px;padding:5px 14px;font-size:12px;color:var(--smo-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".smo-view{position:relative;overflow:hidden;background:#fff}" +
    ".smo-view iframe{position:absolute;left:0;top:0;border:0;display:block;transform-origin:0 0;background:#fff}" +
    ".smo-note{font-size:13px;margin:14px 0 0}" +
    ".smo-cta{margin-top:32px;padding:24px;border-radius:20px;background:var(--smo-surface);border:1px solid var(--smo-line)}" +
    ".smo-cta-title{font:800 20px/1.25 var(--smo-head);color:var(--smo-lavender);margin:0 0 6px}" +
    ".smo-cta p{margin:0 0 18px;font-size:14px}" +
    ".smo-actions{display:flex;gap:12px;flex-wrap:wrap}" +
    ".smo-h3{font:700 18px/1.3 var(--smo-head);color:var(--smo-lavender);margin:28px 0 12px}" +
    ".smo-improve{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}" +
    ".smo-improve li{background:var(--smo-surface);border:1px solid var(--smo-line);border-radius:16px;padding:14px 16px 14px 44px;position:relative;font-size:14px;display:grid;gap:2px}" +
    ".smo-improve li:before{content:'\\2713';position:absolute;left:14px;top:13px;width:20px;height:20px;border-radius:50%;background:var(--smo-accent);color:var(--smo-navy);font:800 12px/20px var(--smo-head);text-align:center}" +
    ".smo-improve strong{font:700 15px/1.3 var(--smo-head);color:var(--smo-lavender)}" +
    ".smo-save{margin-top:20px;padding:18px 20px;border-radius:16px;border:1px dashed var(--smo-accent);display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}" +
    ".smo-save>div{display:grid;gap:2px;min-width:0;flex:1 1 240px;font-size:14px}.smo-save strong{font:700 16px/1.3 var(--smo-head);color:var(--smo-lavender)}" +
    ".smo-save-msg{color:var(--smo-bad);font-size:13px}.smo-save-msg:empty{display:none}" +
    ".smo-btn:disabled{opacity:.6;cursor:wait;transform:none;box-shadow:none}" +
    ".smo-pick{display:flex;gap:14px;align-items:center;font-size:14px}" +
    ".smo-color{width:56px;height:56px;padding:0;border:2px solid var(--smo-line);border-radius:16px;background:none;cursor:pointer}" +
    ".smo-file{color:var(--smo-lavender);font-size:14px}.smo-logo-preview{display:block;margin-top:10px;height:44px}.smo-logo-preview[hidden]{display:none}" +
    ".smo-link{background:none;border:0;color:var(--smo-accent);text-decoration:underline;cursor:pointer;font:600 14px var(--smo-head);padding:0;margin-top:16px}";

  // ---- helpers ------------------------------------------------------------
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
  function track(payload) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(payload); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var DATA_IMG = /^data:image\/(png|jpeg|webp|gif|avif|svg\+xml);base64,[A-Za-z0-9+\/=]+$/;
  function safeUrl(u) {
    if (typeof u === "string" && DATA_IMG.test(u)) return u;
    try { var p = new URL(u); return /^https?:$/.test(p.protocol) ? p.href : ""; } catch (e) { return ""; }
  }
  function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c || "") ? c.toLowerCase() : null; }
  function safeFont(f) { return /^[A-Za-z0-9 \-]{2,40}$/.test(f || "") ? f : null; }
  function rgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }); }
  function toHex(a) { return "#" + a.map(function (v) { return ("0" + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(""); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return toHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function lum(hex) {
    var c = rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function onColor(bg) { return lum(bg) > 0.45 ? "#111318" : "#ffffff"; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Darken a brand colour until it is readable as text on white (WCAG 4.5:1).
  function readable(c) { var out = c, i = 0; while (contrast(out, "#ffffff") < 4.5 && i++ < 12) out = mix(out, "#000000", 0.12); return out; }
  function phoneLabel(num) {
    return /^316\d{8}$/.test(num) ? "06 " + num.slice(3).replace(/(\d{3})(\d{3})(\d{2})/, "$1 $2 $3") : "+" + num;
  }

  // ---- concept page (rendered inside the iframe) ---------------------------
  function conceptHtml(d) {
    var b = d.brand || {}, colors = b.colors || {}, fonts = b.fonts || {}, cp = d.copy || {}, ct = d.content || {}, im = d.images || {};
    var P = safeColor(colors.primary) || safeColor(colors.dark) || "#1f4e79";
    var S = safeColor(colors.secondary) || mix(P, "#ffffff", 0.35);
    var INK = safeColor(colors.dark) && contrast(colors.dark, "#ffffff") >= 7 ? colors.dark : "#15171c";
    var PT = readable(P), ON_P = onColor(P), SOFT = mix(P, "#ffffff", 0.93), SOFT2 = mix(S, "#ffffff", 0.85);
    var head = safeFont(fonts.heading), body = safeFont(fonts.body);
    var google = (fonts.google || []).map(safeFont).filter(Boolean);
    [head, body].forEach(function (f) { if (f && google.indexOf(f) < 0) google.push(f); });
    var fontLinks = google.slice(0, 4).map(function (f) {
      return '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, "+") + ':wght@400;600;700;800&display=swap">';
    }).join("");
    var HF = (head ? "'" + head + "'," : "") + "system-ui,-apple-system,'Segoe UI',sans-serif";
    var BF = (body ? "'" + body + "'," : "") + "system-ui,-apple-system,'Segoe UI',sans-serif";

    var name = esc(b.name || "");
    var logo = safeUrl(b.logo);
    var hero = safeUrl(im.hero);
    var gallery = (im.gallery || []).map(safeUrl).filter(Boolean);
    var aboutImg = gallery[0] || hero;
    var nav = (ct.nav || []).slice(0, 5);
    var brandMark = logo ? '<img class="logo" src="' + esc(logo) + '" alt="' + name + '">' : '<span class="wordmark">' + name + "</span>";
    var phone = ct.phone ? esc(ct.phone) : "";
    var mail = ct.email ? esc(ct.email) : "";

    var usps = (cp.usps || []).map(function (u, i) {
      return '<div class="usp"><span class="num">' + (i + 1) + "</span><div><h3>" + esc(u.title) + "</h3><p>" + esc(u.text) + "</p></div></div>";
    }).join("");
    var ind = ["groen_bouw", "zorg", "financieel", "webshop"].indexOf(cp.industry || d.industry) >= 0 ? (cp.industry || d.industry) : "overig";
    var shop = ind === "webshop";
    var svcLabel = { groen_bouw: "Diensten", zorg: "Behandelingen", financieel: "Diensten", webshop: "Assortiment", overig: "Wat we doen" }[ind];
    var moreLabel = { zorg: "Meer over deze behandeling", webshop: "Bekijk de collectie", financieel: "Lees meer" }[ind] || "Meer informatie";
    var services = (cp.services || []).map(function (s, i) {
      if (shop) {
        return '<article class="cat' + (i % 2 ? " alt" : "") + '"><div class="cat-img"><span>' + esc(s.title.charAt(0)) + "</span></div><h3>" + esc(s.title) + "</h3>" +
          (s.text ? "<p>" + esc(s.text) + "</p>" : "") + '<span class="more">' + moreLabel + " &rarr;</span></article>";
      }
      return '<article class="svc"><span class="bar"></span><h3>' + esc(s.title) + "</h3>" + (s.text ? "<p>" + esc(s.text) + "</p>" : "") + '<span class="more">' + moreLabel + " &rarr;</span></article>";
    }).join("");
    var steps = (cp.steps || []).map(function (st, i) {
      return '<li><span class="sn">' + (i + 1) + "</span><h3>" + esc(st.title) + "</h3>" + (st.text ? "<p>" + esc(st.text) + "</p>" : "") + "</li>";
    }).join("");
    var stepsTitle = { zorg: "Zo verloopt je traject", financieel: "Zo werken we samen", webshop: "Zo bestel je" }[ind] || "Zo pakken we het aan";
    var area = cp.area_text && !shop ? '<section class="area"><div class="wrap"><div class="box"><span class="pin"></span><p><strong>Werkgebied</strong> ' + esc(cp.area_text) + "</p></div></div></section>" : "";
    var shopBar = shop && (cp.usps || []).length ? '<div class="shopbar">' + cp.usps.map(function (u) { return "<span>&#10003; " + esc(u.title) + "</span>"; }).join("") + "</div>" : "";

    var css = "" +
      ":root{--p:" + P + ";--pt:" + PT + ";--s:" + S + ";--on:" + ON_P + ";--ink:" + INK + ";--soft:" + SOFT + ";--soft2:" + SOFT2 + ";--hf:" + HF + ";--bf:" + BF + "}" +
      "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:var(--bf);color:var(--ink);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}" +
      "img{max-width:100%;display:block}h1,h2,h3{font-family:var(--hf);line-height:1.15;margin:0;color:var(--ink);text-wrap:balance}" +
      ".wrap{max-width:1160px;margin:0 auto;padding:0 32px}" +
      ".top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.06)}" +
      ".top .wrap{display:flex;align-items:center;gap:28px;height:76px}" +
      ".logo{height:44px;width:auto;max-width:180px;object-fit:contain}.wordmark{font:800 22px var(--hf);color:var(--pt)}" +
      ".nav{display:flex;gap:26px;margin-left:auto;font-size:15px;font-weight:600;color:var(--ink)}.nav span{opacity:.8}" +
      ".btn{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:var(--on);font:700 15px var(--hf);padding:14px 24px;border-radius:999px;text-decoration:none;box-shadow:0 10px 24px -10px var(--p)}" +
      ".btn.alt{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px rgba(0,0,0,.12)}" +
      ".hero{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--soft),#fff)}" +
      ".hero .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center;padding-top:72px;padding-bottom:88px}" +
      ".eyebrow{display:inline-flex;align-items:center;gap:8px;font:700 13px var(--hf);letter-spacing:.08em;text-transform:uppercase;color:var(--pt);background:#fff;border-radius:999px;padding:8px 14px;box-shadow:0 1px 0 rgba(0,0,0,.04)}" +
      ".eyebrow:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--s)}" +
      ".hero h1{font-size:56px;font-weight:800;letter-spacing:-.02em;margin:20px 0 18px}" +
      ".hero p.lead{font-size:19px;color:rgba(0,0,0,.66);max-width:520px;margin:0 0 30px}" +
      ".actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center}.call{font-weight:700;color:var(--pt);margin-left:6px}" +
      ".visual{position:relative}.visual:before{content:'';position:absolute;inset:-26px -26px 30px 40px;background:var(--s);opacity:.18;border-radius:36px;transform:rotate(3deg)}" +
      ".visual .img{position:relative;aspect-ratio:4/3;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,var(--p),var(--s));box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}" +
      ".visual .img img{width:100%;height:100%;object-fit:cover}" +
      ".badge{position:absolute;left:-24px;bottom:-22px;background:#fff;border-radius:18px;padding:14px 18px;box-shadow:0 18px 40px -18px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center;font:700 14px var(--hf);max-width:260px}" +
      ".badge i{width:36px;height:36px;border-radius:12px;background:var(--p);flex:none;display:block}" +
      ".usps{background:#fff;margin-top:-44px;position:relative}" +
      ".usps .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;background:#fff;border-radius:24px;padding:28px;box-shadow:0 24px 60px -36px rgba(0,0,0,.35)}" +
      ".usp{display:flex;gap:14px}.usp .num{width:38px;height:38px;border-radius:12px;background:var(--soft2);color:var(--pt);font:800 16px/38px var(--hf);text-align:center;flex:none}" +
      ".usp h3{font-size:17px;margin-bottom:4px}.usp p{margin:0;font-size:15px;color:rgba(0,0,0,.62)}" +
      "section.block{padding:96px 0}.head{max-width:640px;margin-bottom:40px}.head small{font:700 13px var(--hf);letter-spacing:.08em;text-transform:uppercase;color:var(--pt)}" +
      ".head h2{font-size:40px;font-weight:800;letter-spacing:-.01em;margin-top:10px}" +
      ".svcs{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}" +
      ".svc{position:relative;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:22px;padding:30px 26px;overflow:hidden}" +
      ".svc .bar{position:absolute;left:0;top:0;height:4px;width:64px;background:var(--p);border-radius:0 0 4px 0}" +
      ".svc h3{font-size:20px;margin:6px 0 10px}.svc p{margin:0 0 18px;color:rgba(0,0,0,.62);font-size:15px}.svc .more{font:700 14px var(--hf);color:var(--pt)}" +
      ".about{background:var(--soft)}.about .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:64px;align-items:center}" +
      ".about .pic{aspect-ratio:5/4;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,var(--s),var(--p))}.about .pic img{width:100%;height:100%;object-fit:cover}" +
      ".about h2{font-size:38px;font-weight:800;margin:10px 0 16px}.about p{font-size:17px;color:rgba(0,0,0,.68);margin:0 0 26px}" +
      ".band{background:var(--p);color:var(--on);border-radius:32px;padding:56px;display:grid;grid-template-columns:1.4fr 1fr;gap:32px;align-items:center;position:relative;overflow:hidden}" +
      ".band:after{content:'';position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:var(--s);opacity:.35}" +
      ".band h2{color:var(--on);font-size:36px;font-weight:800;margin-bottom:10px}.band p{margin:0;opacity:.85;font-size:17px}" +
      ".band .btn{background:var(--on);color:" + P + ";box-shadow:none}.band .meta{display:grid;gap:10px;position:relative;z-index:1;justify-items:start}" +
      ".band .meta span{font-weight:700}" +
      "footer{padding:48px 0 40px;color:rgba(0,0,0,.55);font-size:14px}footer .wrap{display:flex;gap:24px;align-items:center;flex-wrap:wrap}footer .nav{margin-left:auto}" +
      ".concept{background:var(--ink);color:#fff;text-align:center;font:600 12px var(--bf);padding:8px;letter-spacing:.02em;opacity:.9}" +
      ".shopbar{background:var(--p);color:var(--on);display:flex;justify-content:center;gap:36px;flex-wrap:wrap;font:600 13px var(--bf);padding:9px 16px}" +
      ".cats{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.cat h3{font-size:19px;margin:16px 0 6px}.cat p{margin:0 0 12px;color:rgba(0,0,0,.62);font-size:15px}.cat .more{font:700 14px var(--hf);color:var(--pt)}" +
      ".cat-img{aspect-ratio:4/3;border-radius:22px;background:linear-gradient(135deg,var(--soft2),var(--soft));display:grid;place-items:center;font:800 64px var(--hf);color:var(--pt)}" +
      ".cat.alt .cat-img{background:linear-gradient(135deg,var(--soft),var(--soft2))}" +
      ".steps{background:#fff}.steps ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;counter-reset:s}" +
      ".steps li{position:relative;padding-top:8px}.steps li:not(:last-child):after{content:'';position:absolute;top:30px;left:60px;right:-12px;height:2px;background:var(--soft2)}" +
      ".sn{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--p);color:var(--on);font:800 18px var(--hf);position:relative;z-index:1}" +
      ".steps h3{font-size:19px;margin:16px 0 6px}.steps p{margin:0;color:rgba(0,0,0,.62);font-size:15px}" +
      ".area .box{display:flex;gap:14px;align-items:center;background:var(--soft2);border-radius:18px;padding:18px 24px}.area{padding-bottom:24px}.area p{margin:0;font-size:16px}" +
      ".area .pin{width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--p);flex:none}" +
      "@media(max-width:820px){.wrap{padding:0 20px}.nav{display:none}.top .wrap{height:64px}.top .btn{margin-left:auto;padding:10px 16px;font-size:13px;white-space:nowrap}.logo{height:36px;max-width:130px}" +
      ".hero .wrap{grid-template-columns:1fr;gap:40px;padding-top:40px;padding-bottom:72px}.hero h1{font-size:36px}.hero p.lead{font-size:17px}" +
      ".badge{left:12px}.usps .grid,.svcs,.cats{grid-template-columns:1fr}.steps li:after{display:none}.shopbar{gap:14px}.usps .grid{padding:22px}section.block{padding:64px 0}.head h2,.about h2{font-size:30px}" +
      ".about .wrap,.band{grid-template-columns:1fr;gap:28px}.band{padding:36px 26px;border-radius:24px}.band h2{font-size:28px}footer .nav{margin-left:0}}";

    return "<!doctype html><html lang=\"" + esc(d.lang || "nl") + "\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<meta name=\"robots\" content=\"noindex\">" + fontLinks + "<style>" + css + "</style></head><body>" +
      '<div class="concept">Concept door SENT Marketing &middot; gebaseerd op ' + esc(hostOf(d.final_url || d.url)) + "</div>" + shopBar +
      '<header class="top"><div class="wrap">' + brandMark +
      '<nav class="nav">' + nav.map(function (n) { return "<span>" + esc(n) + "</span>"; }).join("") + "</nav>" +
      '<a class="btn">' + esc(cp.cta_primary || "Neem contact op") + "</a></div></header>" +
      '<section class="hero"><div class="wrap"><div>' +
      '<span class="eyebrow">' + name + "</span><h1>" + esc(cp.hero_title || b.name) + "</h1>" +
      (cp.hero_subtitle ? '<p class="lead">' + esc(cp.hero_subtitle) + "</p>" : "") +
      '<div class="actions"><a class="btn">' + esc(cp.cta_primary || "Neem contact op") + ' &rarr;</a><a class="btn alt">' + esc(cp.cta_secondary || "Meer over ons") + "</a>" +
      (phone ? '<span class="call">of bel ' + phone + "</span>" : "") + "</div></div>" +
      '<div class="visual"><div class="img">' + (hero ? '<img src="' + esc(hero) + '" alt="">' : "") + "</div>" +
      ((cp.usps || [])[0] ? '<div class="badge"><i></i>' + esc(cp.usps[0].title) + "</div>" : "") + "</div></div></section>" +
      (usps && !shop ? '<section class="usps"><div class="wrap"><div class="grid">' + usps + "</div></div></section>" : "") +
      (services ? '<section class="block"><div class="wrap"><div class="head"><small>' + svcLabel + "</small><h2>" +
        esc(cp.services_title || "Wat we doen") + '</h2></div><div class="' + (shop ? "cats" : "svcs") + '">' + services + "</div></div></section>" : "") +
      area +
      (steps ? '<section class="block steps"><div class="wrap"><div class="head"><small>Werkwijze</small><h2>' + stepsTitle + "</h2></div><ol>" + steps + "</ol></div></section>" : "") +
      (cp.about_text ? '<section class="block about"><div class="wrap"><div class="pic">' + (aboutImg ? '<img src="' + esc(aboutImg) + '" alt="">' : "") +
        "</div><div><small class=\"eyebrow\">Over ons</small><h2>" + esc(cp.about_title || "Over " + b.name) + "</h2><p>" + esc(cp.about_text) +
        '</p><a class="btn alt">' + esc(cp.cta_secondary || "Meer over ons") + "</a></div></div></section>" : "") +
      '<section class="block"><div class="wrap"><div class="band"><div><h2>' + esc(cp.contact_title || "Neem contact op") + "</h2><p>" + esc(cp.contact_text || "") +
      '</p></div><div class="meta"><a class="btn">' + esc(cp.cta_primary || "Neem contact op") + "</a>" +
      (phone ? "<span>" + phone + "</span>" : "") + (mail ? "<span>" + mail + "</span>" : "") + "</div></div></div></section>" +
      '<footer><div class="wrap">' + brandMark + "<span>&copy; " + new Date().getFullYear() + " " + name + '</span><nav class="nav">' +
      nav.map(function (n) { return "<span>" + esc(n) + "</span>"; }).join("") + "</nav></div></footer></body></html>";
  }

  // Load an image the way the concept page will (no referrer). Resolves true if it loads.
  function probe(url) {
    return new Promise(function (resolve) {
      if (!url) return resolve(false);
      var img = new Image(), done = false;
      function finish(ok) { if (!done) { done = true; resolve(ok); } }
      img.referrerPolicy = "no-referrer";
      img.onload = function () { finish(img.naturalWidth > 0); };
      img.onerror = function () { finish(false); };
      setTimeout(function () { finish(false); }, 4000);
      img.src = url;
    });
  }

  // Drop images that do not load (hotlink protection, 404) so the concept
  // falls back to brand-colour gradients instead of broken-image icons.
  function verifyImages(d) {
    var b = d.brand || {}, im = d.images || {};
    var urls = [safeUrl(b.logo), safeUrl(im.hero)].concat((im.gallery || []).map(safeUrl));
    return Promise.all(urls.map(probe)).then(function (ok) {
      var out = JSON.parse(JSON.stringify(d));
      out.brand = out.brand || {}; out.images = out.images || {};
      if (!ok[0]) out.brand.logo = null;
      if (!ok[1]) out.images.hero = null;
      out.images.gallery = (im.gallery || []).filter(function (g, i) { return ok[i + 2]; });
      return out;
    });
  }

  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

  // ---- PDF ----------------------------------------------------------------
  // Libraries load only when a visitor clicks "Download als PDF".
  var LIBS = {
    jspdf: ["https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js",
      "sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3", function () { return window.jspdf && window.jspdf.jsPDF; }],
    html2canvas: ["https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
      "sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H", function () { return window.html2canvas; }]
  };
  var libPromises = {};
  function loadLib(name) {
    var lib = LIBS[name];
    if (lib[2]()) return Promise.resolve(lib[2]());
    if (!libPromises[name]) {
      libPromises[name] = new Promise(function (resolve, reject) {
        var sc = document.createElement("script");
        sc.src = lib[0]; sc.integrity = lib[1]; sc.crossOrigin = "anonymous"; sc.async = true;
        sc.onload = function () { lib[2]() ? resolve(lib[2]()) : reject(new Error(name)); };
        sc.onerror = function () { libPromises[name] = null; reject(new Error(name)); };
        document.head.appendChild(sc);
      });
    }
    return libPromises[name];
  }

  // Render the concept at a given width in an off-screen, script-less iframe and capture it.
  function captureConcept(html2canvas, d, width, scale) {
    return new Promise(function (resolve, reject) {
      var fr = document.createElement("iframe");
      fr.setAttribute("sandbox", "allow-same-origin");
      fr.setAttribute("aria-hidden", "true");
      fr.style.cssText = "position:fixed;left:-20000px;top:0;width:" + width + "px;height:900px;border:0;visibility:hidden";
      fr.onload = function () {
        var doc = fr.contentDocument;
        var ready = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
        ready.then(function () { return new Promise(function (r) { setTimeout(r, 400); }); }).then(function () {
          var top = doc.querySelector(".top"); if (top) top.style.position = "relative";
          // html2canvas ignores object-fit: swap images for background-image boxes of the same size.
          Array.prototype.forEach.call(doc.querySelectorAll("img"), function (im) {
            var r = im.getBoundingClientRect(), box = doc.createElement("div");
            var fit = doc.defaultView.getComputedStyle(im).objectFit === "cover" ? "cover" : "contain";
            box.style.cssText = "display:block;flex:none;width:" + r.width + "px;height:" + r.height + "px;background:url('" +
              String(im.getAttribute("src")).replace(/'/g, "%27") + "') center/" + fit + " no-repeat";
            im.parentNode.replaceChild(box, im);
          });
          var h = Math.min(doc.documentElement.scrollHeight, 6000);
          fr.style.height = h + "px";
          return html2canvas(doc.documentElement, { width: width, height: h, windowWidth: width, windowHeight: h, scale: scale, backgroundColor: "#ffffff", logging: false });
        }).then(function (canvas) { fr.remove(); resolve(canvas); }, function (e) { fr.remove(); reject(e); });
      };
      fr.srcdoc = conceptHtml(d);
      document.body.appendChild(fr);
    });
  }

  function crop(canvas, y, h) {
    var c = document.createElement("canvas");
    c.width = canvas.width; c.height = Math.max(1, Math.min(h, canvas.height - y));
    c.getContext("2d").drawImage(canvas, 0, y, canvas.width, c.height, 0, 0, canvas.width, c.height);
    return c;
  }

  function pdfText(t) {
    return String(t == null ? "" : t).replace(/→/g, "-").replace(/[^\x00-\xFF€–—‘’“”•…]/g, "");
  }

  function makeoverPdf(d, o) {
    return Promise.all([loadLib("jspdf"), loadLib("html2canvas")]).then(function (libs) {
      var JsPDF = libs[0], html2canvas = libs[1];
      return captureConcept(html2canvas, d, 1280, 1).then(function (desk) {
        return captureConcept(html2canvas, d, 390, 2).then(function (mob) { return [desk, mob]; });
      }).then(function (shots) {
        var desk = shots[0], mob = shots[1];
        var NAVY = [16, 23, 59], ACCENT = [63, 169, 245], LAV = [224, 230, 255], SUB = [157, 165, 197], BLOCK = [74, 81, 110], LINE = [214, 219, 238];
        var doc = new JsPDF({ unit: "mm", format: "a4" });
        var W = 210, H = 297, M = 18, CW = W - 2 * M;
        var b = d.brand || {}, name = b.name || hostOf(d.final_url || d.url), site = d.final_url || d.url || "";
        function color(c) { doc.setTextColor(c[0], c[1], c[2]); }
        function font(st, sz) { doc.setFont("helvetica", st); doc.setFontSize(sz); }
        function lines(t, w) { return doc.splitTextToSize(pdfText(t), w); }
        function img(canvas, x, y, w) {
          var h = w * canvas.height / canvas.width;
          doc.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", x, y, w, h);
          doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3); doc.rect(x, y, w, h);
          return h;
        }

        // Page 1: header + top of the desktop concept
        font("bold", 22); var titleLines = lines("Websiteconcept voor " + name, CW).slice(0, 2);
        var headH = 50 + 9 * titleLines.length;
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, W, headH, "F");
        font("bold", 9); color(ACCENT); doc.text("SENT MARKETING", M, 17);
        font("bold", 22); color(LAV); doc.text(titleLines, M, 29);
        var hy = 29 + 9 * titleLines.length;
        font("normal", 11); doc.text(lines(site, CW)[0], M, hy);
        font("normal", 9); color(SUB);
        doc.text(pdfText("Gemaakt op " + new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) + "  •  in je eigen huisstijl"), M, hy + 7);
        var sy = headH + 14;
        font("bold", 14); color(NAVY); doc.text("Op een computer", M, sy);
        var availH = H - 22 - (sy + 6);
        var deskTop = crop(desk, 0, Math.round(desk.width * availH / CW));
        img(deskTop, M, sy + 6, CW);

        // Page 2: mobile + improvements + contact
        doc.addPage();
        font("bold", 14); color(NAVY); doc.text("Op je telefoon", M, 24);
        var mobW = 62, mobMaxH = 230;
        var mobCrop = crop(mob, 0, Math.round(mob.width * mobMaxH / mobW));
        img(mobCrop, M, 30, mobW);
        var x = M + mobW + 12, colW = W - M - x, y = 24;
        font("bold", 14); color(NAVY); doc.text("Wat we verbeterden", x, y); y += 9;
        (d.improvements || []).forEach(function (it) {
          font("normal", 9.5); var body = lines(it.text, colW - 7);
          doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]); doc.circle(x + 1.8, y - 1.3, 1.8, "F");
          font("bold", 10.5); color(NAVY); doc.text(lines(it.title, colW - 7), x + 7, y);
          font("normal", 9.5); color(BLOCK); doc.text(body, x + 7, y + 5);
          y += 9 + body.length * 4.3;
        });
        y += 4;
        font("normal", 9.5);
        var ctaBody = lines("Je spreekt direct met Stan of Timo, geen accountmanager. Binnen 24 uur contact.", colW - 12);
        font("bold", 12);
        var boxH = 26 + 5.5 * lines(o.ctaTitle, colW - 12).length + ctaBody.length * 4.6 + (o.whatsapp ? 6 : 0);
        doc.setFillColor(LAV[0], LAV[1], LAV[2]); doc.roundedRect(x, y, colW, boxH, 4, 4, "F");
        font("bold", 12);
        var ty = y + 9, title = lines(o.ctaTitle, colW - 12);
        color(NAVY); doc.text(title, x + 6, ty); ty += 5.5 * title.length + 1;
        font("normal", 9.5); color(BLOCK); doc.text(ctaBody, x + 6, ty); ty += ctaBody.length * 4.6 + 3;
        font("bold", 9.5); color(NAVY);
        doc.textWithLink(pdfText(o.ctaText + ": " + o.ctaUrl.replace(/^https?:\/\//, "")), x + 6, ty, { url: o.ctaUrl });
        if (o.whatsapp) { ty += 6; doc.textWithLink("WhatsApp: " + phoneLabel(o.whatsapp), x + 6, ty, { url: "https://wa.me/" + o.whatsapp }); }

        // Page 3: the whole desktop page, scaled to fit
        doc.addPage();
        font("bold", 14); color(NAVY); doc.text("De hele pagina", M, 24);
        var maxH = H - 24 - 36, fullW = Math.min(CW, maxH * desk.width / desk.height);
        img(desk, (W - fullW) / 2, 30, fullW);

        var pages = doc.getNumberOfPages();
        for (var i = 1; i <= pages; i++) {
          doc.setPage(i);
          doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3); doc.line(M, H - 14, W - M, H - 14);
          font("normal", 8); color(SUB);
          doc.text(pdfText("SENT Marketing  •  " + o.siteHost + "  •  Automatisch concept, geen definitief ontwerp"), M, H - 9);
          doc.text("Pagina " + i + " van " + pages, W - M, H - 9, { align: "right" });
        }
        doc.save("Websiteconcept-" + (hostOf(site) || "website") + ".pdf");
      });
    });
  }

  // ---- widget -------------------------------------------------------------
  function init(root) {
    if (root.dataset.smoReady) return;
    root.dataset.smoReady = "1";
    var api = root.dataset.api || scriptOrigin + "/api/site-makeover";
    var privacyUrl = root.dataset.privacyUrl || "/privacy";
    var ctaUrl = root.dataset.ctaUrl || "/contact";
    var ctaText = root.dataset.ctaText || "Plan een kennismaking";
    var ctaTitle = root.dataset.ctaTitle || "Je ziet nu hoe het kan. Tijd om koers te zetten.";
    var whatsapp = (root.dataset.whatsapp || "").replace(/\D/g, "");
    var title = root.dataset.title || "Zie hoe jouw website er straks uitziet.";
    var intro = root.dataset.intro || "Vul je website in en zie binnen een halve minuut een nieuw ontwerp in je eigen huisstijl: met je logo, kleuren en lettertypes.";

    root.classList.add("smo");
    var card = el("div", { class: "smo-card" });
    root.innerHTML = "";
    root.appendChild(card);
    var stepTimer = null;

    function renderForm(prefill, error) {
      prefill = prefill || {};
      card.innerHTML = "";
      card.appendChild(el("span", { class: "smo-tag", text: "Gratis website-preview" }));
      card.appendChild(el("h2", { class: "smo-title", text: title }));
      card.appendChild(el("p", { class: "smo-intro", text: intro }));
      var form = el("form", { class: "smo-form", novalidate: "" });
      var urlIn = el("input", { type: "text", id: "smo-url", placeholder: "jouwwebsite.nl", inputmode: "url", autocomplete: "url" });
      var mailIn = el("input", { type: "email", id: "smo-email", placeholder: "naam@bedrijf.nl", autocomplete: "email" });
      urlIn.value = prefill.url || ""; mailIn.value = prefill.email || "";
      var consent = el("input", { type: "checkbox", id: "smo-consent" });
      var consentLabel = el("label", { for: "smo-consent", class: "smo-consent" }, [consent, el("span", {}, [
        document.createTextNode("Ja, SENT mag mijn e-mailadres gebruiken om me het ontwerp en praktische tips te sturen. Lees onze "),
        el("a", { href: privacyUrl, target: "_blank", rel: "noopener", text: "privacyverklaring" }), document.createTextNode(".")
      ])]);
      var hp = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true", class: "smo-hp" });
      var err = el("div", { class: "smo-error", role: "alert", "aria-live": "polite", text: error || "" });
      form.appendChild(el("div", { class: "smo-row" }, [
        el("div", { class: "smo-field" }, [el("label", { for: "smo-url", text: "Je website" }), urlIn]),
        el("div", { class: "smo-field" }, [el("label", { for: "smo-email", text: "Je e-mailadres" }), mailIn])
      ]));
      form.appendChild(consentLabel); form.appendChild(hp); form.appendChild(err);
      form.appendChild(el("button", { type: "submit", class: "smo-btn", text: "Laat mijn nieuwe website zien →" }));
      card.appendChild(form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = { url: urlIn.value.trim(), email: mailIn.value.trim(), consent: consent.checked, website: hp.value };
        if (!data.url) { err.textContent = "Vul de URL van je website in."; urlIn.focus(); return; }
        if (!/^\S+@\S+\.\S+$/.test(data.email)) { err.textContent = "Vul een geldig e-mailadres in."; mailIn.focus(); return; }
        if (!data.consent) { err.textContent = "Vink het vakje aan, dan kunnen we je het ontwerp sturen."; return; }
        submit(data);
      });
    }

    function renderLoading() {
      card.innerHTML = "";
      var steps = ["Je website ophalen", "Huisstijl herkennen: logo, kleuren, lettertypes", "Teksten aanscherpen", "Nieuw ontwerp opbouwen"];
      var list = el("ol", { class: "smo-steps" });
      var items = steps.map(function (s) { var li = el("li", {}, [el("span", { class: "smo-dot" }), el("span", { text: s })]); list.appendChild(li); return li; });
      card.appendChild(el("div", { class: "smo-loading", role: "status" }, [el("p", { text: "We maken je nieuwe website…" }), list]));
      var i = 0;
      function tick() {
        items.forEach(function (li, j) { li.className = j < i ? "done" : j === i ? "on" : ""; });
        if (i < steps.length - 1) { i++; stepTimer = setTimeout(tick, 3500); }
      }
      tick();
    }

    function submit(data) {
      renderLoading();
      fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body && res.body.error || "Er ging iets mis.");
          return verifyImages(res.body).then(function (d) {
            clearTimeout(stepTimer);
            var need = d.needs_input || {};
            if (need.color || need.logo) renderComplete(d, data, need);
            else renderResult(d, data);
            track({ event: "site_makeover_generated" });
          });
        })
        .catch(function (e) {
          clearTimeout(stepTimer);
          renderForm(data, e && e.message && e.message !== "Failed to fetch" ? e.message : "Het ontwerp maken is niet gelukt. Probeer het opnieuw.");
        });
    }

    // Ask the visitor for the brand parts we could not find, then build the concept.
    function renderComplete(d, data, need) {
      card.innerHTML = "";
      card.appendChild(el("span", { class: "smo-tag", text: "Bijna klaar" }));
      card.appendChild(el("h2", { class: "smo-title", text: "Help ons je huisstijl compleet te maken." }));
      card.appendChild(el("p", { class: "smo-intro", text: "We konden " + (need.logo && need.color ? "je logo en merkkleur" : need.logo ? "je logo" : "je merkkleur") +
        " niet automatisch vinden op " + hostOf(d.final_url || d.url) + ". Vul " + (need.logo && need.color ? "ze" : "het") + " aan, dan maken we je concept af." }));
      var form = el("form", { class: "smo-form", novalidate: "" });
      var colorIn = null, fileIn = null, logoData = null;
      var err = el("div", { class: "smo-error", role: "alert", "aria-live": "polite" });
      if (need.color) {
        colorIn = el("input", { type: "color", id: "smo-color", value: "#1f4e79", class: "smo-color" });
        form.appendChild(el("div", { class: "smo-field" }, [el("label", { for: "smo-color", text: "Je merkkleur" }),
          el("div", { class: "smo-pick" }, [colorIn, el("span", { text: "Kies de kleur die het meest bij je bedrijf hoort." })])]));
      }
      if (need.logo) {
        fileIn = el("input", { type: "file", id: "smo-logo", accept: "image/png,image/jpeg,image/svg+xml,image/webp", class: "smo-file" });
        var preview = el("img", { class: "smo-logo smo-logo-preview", alt: "" });
        preview.hidden = true;
        fileIn.addEventListener("change", function () {
          err.textContent = ""; logoData = null; preview.hidden = true;
          var f = fileIn.files && fileIn.files[0];
          if (!f) return;
          if (f.size > 1000000) { err.textContent = "Dit logo is te groot. Kies een bestand kleiner dan 1 MB."; fileIn.value = ""; return; }
          var reader = new FileReader();
          reader.onload = function () {
            if (DATA_IMG.test(String(reader.result))) { logoData = reader.result; preview.src = logoData; preview.hidden = false; }
            else { err.textContent = "Kies een PNG, JPG, SVG of WebP."; fileIn.value = ""; }
          };
          reader.readAsDataURL(f);
        });
        form.appendChild(el("div", { class: "smo-field" }, [el("label", { for: "smo-logo", text: "Je logo (optioneel)" }), fileIn, preview]));
      }
      form.appendChild(err);
      var actions = el("div", { class: "smo-actions" }, [el("button", { type: "submit", class: "smo-btn", text: "Maak mijn concept →" })]);
      var skip = el("button", { type: "button", class: "smo-btn smo-ghost", text: "Overslaan" });
      actions.appendChild(skip);
      form.appendChild(actions);
      card.appendChild(form);
      function finish(useInput) {
        var out = JSON.parse(JSON.stringify(d));
        if (useInput && colorIn && safeColor(colorIn.value)) out.brand.colors.primary = colorIn.value.toLowerCase();
        if (useInput && logoData) out.brand.logo = logoData;
        out.needs_input = { color: false, logo: false };
        renderResult(out, data);
      }
      form.addEventListener("submit", function (e) { e.preventDefault(); finish(true); });
      skip.addEventListener("click", function () { finish(false); });
    }

    function renderResult(d, data) {
      card.innerHTML = "";
      var b = d.brand || {}, colors = b.colors || {}, fonts = b.fonts || {};
      var host = hostOf(d.final_url || d.url);
      card.appendChild(el("span", { class: "smo-tag", text: "Jouw nieuwe website" }));
      card.appendChild(el("h2", { class: "smo-title", text: "Zo kan " + (b.name || host) + " er straks uitzien." }));
      card.appendChild(el("p", { class: "smo-intro", text: "Gemaakt in je eigen huisstijl. Dit hebben we overgenomen van " + host + ":" }));

      var brand = el("div", { class: "smo-brand" });
      var logo = safeUrl(b.logo);
      if (logo) brand.appendChild(el("span", { class: "smo-chip" }, [el("img", { class: "smo-logo", src: logo, alt: "Logo " + (b.name || "") }), el("span", { text: "Logo" })]));
      [colors.primary, colors.secondary].map(safeColor).filter(Boolean).forEach(function (c) {
        var sw = el("span", { class: "smo-sw" }); sw.style.background = c;
        brand.appendChild(el("span", { class: "smo-chip" }, [sw, el("span", { text: c.toUpperCase() })]));
      });
      var fontNames = [fonts.heading, fonts.body].map(safeFont).filter(function (f, i, a) { return f && a.indexOf(f) === i; });
      if (fontNames.length) brand.appendChild(el("span", { class: "smo-chip txt" }, [el("span", { class: "smo-label", text: "Fonts" }), el("span", { text: fontNames.join(" + ") })]));
      card.appendChild(brand);

      var toggle = el("div", { class: "smo-toggle", role: "group", "aria-label": "Weergave" });
      var bDesk = el("button", { type: "button", "aria-pressed": "true", text: "Desktop" });
      var bMob = el("button", { type: "button", "aria-pressed": "false", text: "Mobiel" });
      toggle.appendChild(bDesk); toggle.appendChild(bMob);
      card.appendChild(toggle);

      var frame = el("div", { class: "smo-frame" });
      frame.appendChild(el("div", { class: "smo-bar" }, [el("i"), el("i"), el("i"), el("span", { class: "smo-addr", text: host })]));
      var view = el("div", { class: "smo-view" });
      var iframe = el("iframe", { title: "Nieuw ontwerp voor " + (b.name || host), sandbox: "", loading: "lazy", referrerpolicy: "no-referrer" });
      iframe.srcdoc = conceptHtml(d);
      view.appendChild(iframe);
      frame.appendChild(view);
      card.appendChild(frame);

      var mode = "desktop";
      if (card.clientWidth < 640) setTimeout(function () { setMode("mobile"); }, 0);
      function layout() {
        var w = view.clientWidth || frame.clientWidth;
        var vw = mode === "desktop" ? 1280 : 390, vh = mode === "desktop" ? 820 : 780;
        var s = Math.min(1, w / vw);
        iframe.style.width = vw + "px"; iframe.style.height = vh + "px";
        iframe.style.transform = "scale(" + s + ")";
        view.style.height = Math.round(vh * s) + "px";
      }
      function setMode(m) {
        mode = m; frame.className = "smo-frame" + (m === "mobile" ? " mobile" : "");
        bDesk.setAttribute("aria-pressed", String(m === "desktop")); bMob.setAttribute("aria-pressed", String(m === "mobile"));
        requestAnimationFrame(layout); setTimeout(layout, 320);
      }
      bDesk.addEventListener("click", function () { setMode("desktop"); });
      bMob.addEventListener("click", function () { setMode("mobile"); });
      window.addEventListener("resize", layout);
      requestAnimationFrame(layout);

      card.appendChild(el("p", { class: "smo-note", text: "Automatisch concept op basis van je huidige homepage. " +
        (d.ai ? "De teksten zijn voorstellen op basis van wat er nu op je site staat; we verzinnen geen feiten." : "De teksten komen van je huidige site.") +
        " Scroll in het voorbeeld om de hele pagina te zien." }));

      var imp = d.improvements || [];
      if (imp.length) {
        card.appendChild(el("h3", { class: "smo-h3", text: "Wat we verbeterden" }));
        var list = el("ul", { class: "smo-improve" });
        imp.forEach(function (it) { list.appendChild(el("li", {}, [el("strong", { text: it.title }), el("span", { text: it.text })])); });
        card.appendChild(list);
      }

      var pdfBtn = el("button", { type: "button", class: "smo-btn", text: "Download als PDF" });
      var pdfMsg = el("span", { class: "smo-save-msg", role: "status", "aria-live": "polite" });
      pdfBtn.addEventListener("click", function () {
        pdfBtn.disabled = true; pdfBtn.textContent = "PDF maken…"; pdfMsg.textContent = "";
        makeoverPdf(d, {
          ctaTitle: ctaTitle, ctaText: ctaText, ctaUrl: new URL(ctaUrl, location.href).href, whatsapp: whatsapp,
          siteHost: new URL(ctaUrl, location.href).hostname.replace(/^www\./, "")
        })
          .then(function () { track({ event: "site_makeover_pdf_download" }); })
          .catch(function () { pdfMsg.textContent = "Downloaden lukte niet. Probeer het opnieuw."; })
          .then(function () { pdfBtn.disabled = false; pdfBtn.textContent = "Download als PDF"; });
      });
      card.appendChild(el("div", { class: "smo-save" }, [
        el("div", {}, [el("strong", { text: "Bewaar je concept" }),
          el("span", { text: "Desktop- en mobielweergave plus de verbeterpunten in één PDF." }), pdfMsg]),
        pdfBtn
      ]));

      var actions = el("div", { class: "smo-actions" }, [el("a", { class: "smo-btn", href: ctaUrl, text: ctaText + " →" })]);
      if (whatsapp) {
        var msg = encodeURIComponent("Hoi! Ik zag het websiteconcept voor " + host + ". Kunnen we het daar eens over hebben?");
        actions.appendChild(el("a", { class: "smo-btn smo-ghost", href: "https://wa.me/" + whatsapp + "?text=" + msg, target: "_blank", rel: "noopener", text: "Stuur ons een WhatsApp" }));
      }
      var again = el("button", { type: "button", class: "smo-link", text: "Andere website proberen" });
      again.addEventListener("click", function () { window.removeEventListener("resize", layout); renderForm({ email: data.email }); });
      card.appendChild(el("div", { class: "smo-cta" }, [
        el("p", { class: "smo-cta-title", text: ctaTitle }),
        el("p", { text: "Je spreekt direct met Stan of Timo, geen accountmanager. Binnen 24 uur contact" + (whatsapp ? ", ook via WhatsApp op " + phoneLabel(whatsapp) : "") + "." }),
        actions, again
      ]));
    }

    renderForm();
  }

  function boot() {
    if (!document.getElementById("smo-style")) {
      if (!document.querySelector('link[href*="family=Montserrat"]')) {
        var fl = document.createElement("link"); fl.rel = "stylesheet"; fl.href = FONT_HREF; document.head.appendChild(fl);
      }
      var st = document.createElement("style"); st.id = "smo-style"; st.textContent = CSS; document.head.appendChild(st);
    }
    Array.prototype.forEach.call(document.querySelectorAll("#sent-site-makeover, [data-sent-site-makeover]"), init);
  }

  // Exposed for tests / previews.
  window.SentSiteMakeover = { conceptHtml: conceptHtml };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
