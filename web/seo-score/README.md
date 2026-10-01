# SEO-score checker (website-widget)

Een leadmagnet voor de SEO-pagina: bezoekers vullen hun **website-URL** en
**e-mailadres** in en krijgen direct een **SEO-score van 0-100**, met een
uitsplitsing per categorie en hun vijf belangrijkste verbeterpunten. Elke scan
wordt (optioneel) als lead doorgestuurd naar Make / Zapier / n8n / je CRM.

```
web/seo-score/
  seo_score_engine.py   # Scoringsmotor (21 checks, 4 categorieën), ook als CLI te draaien
  api/seo-score.py      # Serverless endpoint (Vercel): validatie, rate limit, lead-webhook
  widget.js             # Inbedbaar formulier + resultaatweergave (vanilla JS, geen dependencies)
  index.html            # Previewpagina
  vercel.json           # Functie-timeout + caching widget
  requirements.txt      # requests + beautifulsoup4
```

## Wat wordt er gemeten?

| Categorie | Gewicht | Checks |
|---|---|---|
| Techniek | 30% | HTTPS, statuscode, serverreactietijd, redirects, noindex, viewport, robots.txt, sitemap.xml |
| Content & on-page | 35% | Titel (lengte), meta description, H1, subkoppen, hoeveelheid tekst, taalattribuut |
| Structuur & links | 15% | Alt-teksten, interne links, canonical |
| Social & rich results | 20% | Schema.org JSON-LD, Open Graph, favicon, Twitter/X-card |

Elke check is `goed` (volle punten), `matig` (halve punten) of `slecht` (0).
De analyse duurt meestal 2-10 seconden: één paginaload plus robots.txt en
sitemap.xml, zonder headless browser.

## 1. Deployen op Vercel

1. In Vercel: **Add New → Project**, kies deze repository en zet
   **Root Directory** op `web/seo-score`. Framework preset: *Other*.
2. Stel de environment variables in:

   | Variabele | Voorbeeld | Doel |
   |---|---|---|
   | `ALLOWED_ORIGINS` | `https://www.sent-marketing.nl,https://sent-marketing.webflow.io` | Alleen jouw site mag de API aanroepen (leeg = iedereen, alleen om te testen) |
   | `LEAD_WEBHOOK_URL` | `https://hook.eu1.make.com/...` | Leads (e-mail, URL, score) doorsturen |
   | `LEAD_WEBHOOK_SECRET` | willekeurige string | Meegestuurd als header `X-Webhook-Secret`, check deze in je scenario |
   | `RATE_LIMIT_PER_HOUR` | `10` | Max. scans per IP per uur (per warme instance) |

3. Deploy. Test via `https://<project>.vercel.app/` (de previewpagina).

## 2. Plaatsen op de website (Webflow / WordPress / anders)

Voeg op de SEO-pagina een **Embed**-element (Webflow) of **Aangepaste HTML**-blok
(WordPress) toe met:

```html
<div id="sent-seo-score"
     data-api="https://<project>.vercel.app/api/seo-score"
     data-privacy-url="/privacy"
     data-cta-url="/contact"
     data-cta-text="Plan een kennismaking"
     data-whatsapp="31620405236"
     data-theme="donker"
     data-variant="test"></div>
<script src="https://<project>.vercel.app/widget.js" defer></script>
```

| Attribuut | Standaard | Doel |
|---|---|---|
| `data-api` | host van `widget.js` | URL van het endpoint |
| `data-privacy-url` | `/privacy` | Link in de toestemmingstekst |
| `data-cta-url` / `data-cta-text` | `/contact` / "Plan een kennismaking" | Hoofdknop na de uitslag |
| `data-whatsapp` | leeg (geen knop) | Nummer in internationaal formaat; toont een WhatsApp-knop met de score als vooringevuld bericht |
| `data-theme` | `donker` | `donker` (navy kaart) of `licht` (lavendel kaart, voor lichte secties) |
| `data-variant` | `test` | Kop-variant: `contrast`, `vraag`, `kompas`, `kort`, of `test` (A/B-test) |
| `data-title` / `data-intro` | per variant | Eigen kop/introtekst (overschrijft de variant) |

### Kop-varianten (A/B-test)

| Variant | Kop |
|---|---|
| `contrast` | Geen dik rapport, maar direct je SEO-score. |
| `vraag` | Hoe goed scoort jouw website in Google? |
| `kompas` | Check je koers in Google. |
| `kort` | Je SEO-score in 15 seconden. |

Met `data-variant="test"` (standaard) krijgt elke bezoeker willekeurig één
variant, die bewaard blijft voor volgende bezoeken. Meten:

- **GA4 / GTM**: events `seo_score_view` en `seo_score_generated`, beide met
  `seo_score_variant`. Conversie per variant = generated ÷ view.
- **Leads**: het veld `variant` zit in de webhook-payload.

Kies na voldoende data (vuistregel: ~100 scans per variant) de winnaar en zet
`data-variant` vast op die waarde.

### Huisstijl

De widget volgt de SENT-huisstijl (bron: *SENT huisstijl – AI-referentie* en
*Bedrijfsplan V2*):

- Kleuren: navy `#10173B` als basis, helder blauw `#3FA9F5` als accent/CTA,
  lavendel `#E0E6FF` voor koppen, `#9DA5C5` / `#4A516E` voor subtekst.
- Montserrat (ExtraBold koppen, Bold knoppen en labels); lopende tekst neemt
  het bodyfont van de site over. Montserrat wordt alleen geladen als de site
  het nog niet laadt.
- Pilvormige knoppen en tags (radius 48px), twee "gloed"-vormen op de kaart.
- Het kompas als subtiel motief: de naald in de scorering en de laadanimatie
  ("We bepalen je koers…").
- Tone of voice: je/jij, kort en direct, met het contrast "Geen …, maar …".

Kleuren zijn CSS-variabelen en kunnen per pagina worden overschreven:

```css
#sent-seo-score { --sss-accent: #3FA9F5; --sss-navy: #10173B; }
```

Na een succesvolle scan wordt een `seo_score_generated`-event naar de
`dataLayer` gepusht (Google Tag Manager / GA4-conversie).

## 3. Leads opvolgen (Make-voorbeeld)

1. Make → nieuw scenario → **Webhooks → Custom webhook**, kopieer de URL naar
   `LEAD_WEBHOOK_URL`.
2. Filter op de header `X-Webhook-Secret`.
3. Voeg modules toe, bijvoorbeeld: contact aanmaken in je CRM / mailinglijst en
   een e-mail met het rapport sturen.

Payload:

```json
{
  "email": "naam@bedrijf.nl",
  "url": "https://bedrijf.nl",
  "final_url": "https://www.bedrijf.nl/",
  "score": 64,
  "grade": "Goed, met verbeterpunten",
  "categories": {"technisch": 80, "content": 57, "structuur": 67, "zichtbaarheid": 50},
  "top_priorities": ["Gestructureerde data", "Meta description"],
  "source": "https://www.sent-marketing.nl",
  "variant": "kompas",
  "created_at": "2026-10-01T10:00:00+00:00"
}
```

## Privacy (AVG)

- Het formulier vraagt expliciete toestemming (checkbox, niet vooraf aangevinkt)
  met een link naar je privacybeleid; zonder toestemming weigert de API de scan.
- De API slaat zelf niets op; e-mailadressen gaan alleen naar `LEAD_WEBHOOK_URL`.
- Vermeld de SEO-scan en de verwerker (Vercel, Make, ...) in je privacyverklaring.

## Beveiliging

- **SSRF**: elke hostnaam (ook bij elke redirect) wordt geresolved en geweigerd
  als een adres privé, loopback, link-local of een metadata-endpoint is.
- Honeypotveld tegen bots, rate limit per IP, maximaal 3 MB HTML per pagina.
- De in-memory rate limit geldt per serverless instance. Voor harde limieten:
  zet de Vercel Firewall (rate limiting rule op `/api/seo-score`) aan.

## Lokaal testen

```bash
pip install -r web/seo-score/requirements.txt
python3 web/seo-score/seo_score_engine.py https://voorbeeld.nl
python3 -m pytest tests/test_seo_score_widget.py
```
