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
  dev_server.py         # Lokale testserver (beide tools + echte API)
  lead_common.py        # Gedeeld: validatie, toestemming, honeypot, rate limit, CORS, lead-webhook
  makeover_engine.py    # Website-makeover: huisstijl + content uit een website halen
  makeover_ai.py        # Website-makeover: teksten herschrijven met Claude (optioneel)
  api/site-makeover.py  # Serverless endpoint voor de website-makeover
  makeover.js           # Inbedbare website-makeover widget
  makeover.html         # Previewpagina website-makeover
  vercel.json           # Functie-timeouts + caching widgets
  requirements.txt      # requests + beautifulsoup4 + anthropic
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
     data-theme="donker"></div>
<script src="https://<project>.vercel.app/widget.js" defer></script>
```

| Attribuut | Standaard | Doel |
|---|---|---|
| `data-api` | host van `widget.js` | URL van het endpoint |
| `data-privacy-url` | `/privacy` | Link in de toestemmingstekst |
| `data-cta-url` / `data-cta-text` | `/contact` / "Plan een kennismaking" | Hoofdknop na de uitslag |
| `data-whatsapp` | leeg (geen knop) | Nummer in internationaal formaat; toont een WhatsApp-knop met de score als vooringevuld bericht |
| `data-theme` | `donker` | `donker` (navy kaart) of `licht` (lavendel kaart, voor lichte secties) |
| `data-cta-title` | zie widget | Kop van het afsluitende contactblok (ook in de PDF) |
| `data-title` / `data-intro` | "Je SEO-score in 15 seconden." / standaardintro | Eigen kop en introtekst |

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

## PDF-rapport

Na de uitslag kan de bezoeker met één klik een **PDF-rapport** downloaden
(knop "Download als PDF"). Het rapport bevat de score, de categorieën, de vijf
belangrijkste verbeterpunten, alle controles met advies en het contactblok
(kennismaking + WhatsApp), in de SENT-huisstijl.

- Wordt in de browser van de bezoeker gemaakt met jsPDF (geen serverbelasting,
  er wordt niets extra opgeslagen).
- jsPDF wordt pas geladen bij een klik, vanaf jsDelivr met een
  integrity-hash (SRI).
- GA4/GTM-event bij downloaden: `seo_score_pdf_download`.

## Website-makeover (tweede tool)

Een bezoeker vult zijn website en e-mailadres in en ziet binnen een halve
minuut een **nieuw homepage-ontwerp in zijn eigen huisstijl**: met zijn logo,
merkkleuren, lettertypes, foto's, menu, diensten en contactgegevens. Doel:
direct laten zien dat SENT de site mooier kan maken, en een lead opleveren.

```html
<div id="sent-site-makeover"
     data-api="https://<project>.vercel.app/api/site-makeover"
     data-privacy-url="/privacy"
     data-cta-url="/contact"
     data-whatsapp="31620405236"></div>
<script src="https://<project>.vercel.app/makeover.js" defer></script>
```

Plaats hem op de webdesign-pagina. Optionele attributen: `data-title`,
`data-intro`, `data-cta-title` (standaard "Je ziet nu hoe het kan. Tijd om
koers te zetten."), `data-cta-text`.

**Hoe het werkt**

1. `makeover_engine.py` haalt de pagina en maximaal 4 stylesheets op (zelfde
   SSRF-bescherming als de SEO-checker) en bepaalt:
   - naam (og:site_name of paginatitel), logo (img met "logo" in header/nav, of touch-icon);
   - merkkleuren: kleuren uit CSS, `theme-color` en CSS-variabelen, gewogen
     (knoppen en `--primary`/`--brand` tellen zwaarder), grijs/wit/zwart uitgesloten;
   - lettertypes: Google Fonts-links en `font-family` van koppen en body;
   - content: H1, meta description, menu, H2/H3-koppen, alinea's, knopteksten,
     telefoon en e-mail; afbeeldingen: og:image en grote content-afbeeldingen;
   - **branche** op trefwoorden: `groen_bouw` (hoveniers, installateurs, bouw),
     `zorg` (fysio, praktijken), `financieel` (adviseurs, administratie),
     `webshop` of `overig`;
   - **wat we verbeterden**: maximaal 6 concrete punten, alleen als ze kloppen
     (bijv. geen viewport, geen contactknop, telefoonnummer niet in beeld,
     geen of meerdere H1's, geen meta description, geen HTTPS);
   - logo, hoofdfoto en één extra foto worden als `data:`-URI meegestuurd
     (max. 0,4 / 1,5 / 1 MB): geen hotlink-problemen en de PDF kan ze gebruiken.
2. `makeover_ai.py` laat Claude (`claude-opus-5-5`, effort `low`, JSON-schema)
   de teksten aanscherpen: kop, subkop, 3 USP's, diensten, over-ons,
   contactblok, de branchegroep, de werkwijze in stappen en het werkgebied.
   Claude gebruikt de woorden van de branche ("behandelingen", "afspraak
   maken", "offerte aanvragen") en mag **niets verzinnen** (geen reviews,
   cijfers, jaartallen, prijzen); de websitetekst gaat als afgebakende data
   mee, nooit als instructie. Zonder `ANTHROPIC_API_KEY`, bij een fout of
   weigering gebruikt de tool de eigen teksten van de site met
   branche-standaarden voor knoppen en koppen.
3. `makeover.js`:
   - **Aanvullen**: als logo of merkkleur niet gevonden is, vraagt de widget
     om een kleur (kleurkiezer) en een logo (upload, max. 1 MB, alleen in de
     browser). "Overslaan" bouwt het concept met een neutrale kleur.
   - **Concept** in een sandboxed iframe (geen scripts), desktop/mobiel.
     Per branche: zorg krijgt "Behandelingen" en "Maak een afspraak",
     webshops een USP-balk en categorietegels, groen/bouw en financieel een
     werkwijze in stappen; het werkgebied verschijnt als de site een regio noemt.
   - **Wat we verbeterden** onder het concept.
   - **PDF** ("Download als PDF"): titelpagina met de bovenkant van het
     concept, mobielweergave met de verbeterpunten en het contactblok, en de
     hele pagina. Gemaakt in de browser met html2canvas + jsPDF (pas geladen
     bij een klik, vanaf jsDelivr met SRI).

Extra environment variables op Vercel:

| Variabele | Standaard | Doel |
|---|---|---|
| `ANTHROPIC_API_KEY` | leeg | Zet AI-teksten aan |
| `MAKEOVER_MODEL` | `claude-opus-5-5` | Ander model |
| `MAKEOVER_EFFORT` | `low` | Hoger = betere teksten, langzamer |

Lead-payload (`tool: "site-makeover"`): `email`, `url`, `final_url`,
`company`, `industry`, `colors`, `fonts`, `phone`, `ai_copy`, `source`,
`created_at`. GA4-events: `site_makeover_generated` en
`site_makeover_pdf_download`.

**E-mail naar Stan en Timo (Make)**: maak een scenario met een *Custom
webhook* (URL in `LEAD_WEBHOOK_URL`), een filter op `tool = site-makeover`
(en een tweede route voor `seo-score`) en een *Email*-module, bijvoorbeeld:

> Onderwerp: Nieuwe website-preview: {{company}} ({{industry}})
> Tekst: {{email}} heeft een concept gemaakt voor {{final_url}}.
> Telefoon op de site: {{phone}}. AI-teksten: {{ai_copy}}. Bel of mail binnen 24 uur.

Let op: het concept is een automatische schets van de homepage, geen echt
ontwerp. Het toont alleen data van de opgegeven website en wordt nergens
opgeslagen of gepubliceerd.

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

De widget met echte analyse in je browser, zonder Vercel:

```bash
pip install -r web/seo-score/requirements.txt
python3 web/seo-score/dev_server.py        # opent http://localhost:8000
# website-makeover: http://localhost:8000/makeover.html
```

Leads worden dan in de terminal getoond in plaats van naar een webhook
gestuurd. Alleen de analyse (JSON) of de tests:

```bash
python3 web/seo-score/seo_score_engine.py https://voorbeeld.nl
python3 -m pytest tests/test_seo_score_widget.py
```
