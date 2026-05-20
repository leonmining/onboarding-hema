# WasmachineWijzer

Affiliate-vergelijksite voor wasmachines, gekoppeld aan het partnerprogramma van Bol.com.

## Wat zit erin
- Homepagina met top picks en laatste wastips
- `/wasmachines/` overzichtspagina met filters (prijs, geluid, capaciteit, energielabel, merk, functies) en sorteren
- `/wasmachine/<slug>/` detailpagina per machine met 800+ woorden review, specs, voor- en nadelen, klantcitaten, handleiding-link en meerdere CTA's naar Bol.com
- `/wastips/` overzicht met dagelijkse artikelen (wastips, productadvies)
- `/wastips/<slug>/` artikelpagina met inline affiliate-blokken
- `/out/?p=...` redirect-pagina: alle outgoing links lopen via één centrale doorverwijzer waardoor je het partner-ID op één plek beheert
- `sitemap.xml` + `robots.txt` automatisch gegenereerd
- JSON-LD product- en artikel-schema voor SEO

## Bestandsstructuur
```
data/
  products.json   # Hét bron-bestand. Alle producten, specs en reviews.
  tips.json       # Wastips-artikelen.
scripts/
  build.js        # Genereert alle HTML uit de data.
  sync-bol.js     # Haalt producten op via Bol.com Open API.
  verify-products.js  # Controleert dagelijks of URLs nog werken.
  serve.js        # Lokale dev-server (npm run serve).
assets/
  css/styles.css
  js/main.js
  js/filters.js
.github/workflows/
  daily-sync.yml  # Cron: elke dag om 03:00 UTC sync + build + deploy.
```

## Snel starten

```bash
npm run build      # genereer alle HTML uit data/
npm run serve      # bekijk lokaal op http://localhost:4321
```

## Affiliate-ID instellen
Bol.com geeft je een `bltgh`/partner-ID. Je kunt 'm op twee manieren toevoegen:

1. **Voor productie (GitHub Actions)**: zet `AFFILIATE_ID` als repository-secret. De daily workflow leest 'm en stopt 'm in elke uitgaande link.
2. **Voor lokaal testen**:
   ```bash
   AFFILIATE_ID=jouw_id npm run build
   ```
3. **Permanent in data**: vervang `BOLAFFID` in `data/products.json` (`affiliateId` veld).

Alle uitgaande links gaan via `/out/?p=<bolpad>` en daar wordt het ID dynamisch toegevoegd. Dat betekent: één plek aanpassen = direct overal werkend.

## Bol.com Open API koppelen
Voor de automatische dagelijkse sync heb je een Bol.com Partner-account met API-toegang nodig:

1. Vraag client credentials aan via [partner.bol.com](https://partner.bol.com).
2. Voeg ze als GitHub Actions secrets toe:
   - `BOL_CLIENT_ID`
   - `BOL_CLIENT_SECRET`
   - `AFFILIATE_ID`
3. (Optioneel) `BOL_CATEGORY_ID` (default `3825` voor wasmachines).

Zonder credentials slaat `sync-bol.js` automatisch over en blijft de bestaande data behouden. De rest van de workflow (URL-verificatie + build + deploy) werkt nog steeds.

## Wat gebeurt er elke 24 uur?
De workflow in `.github/workflows/daily-sync.yml` draait elke dag om 03:00 UTC:

1. **Sync** – haalt populaire wasmachines op via de Bol.com Open API. Nieuwe producten worden toegevoegd (met een `needsContent: true`-vlag zodat je weet dat de redactie nog tekst moet schrijven). Bestaande producten krijgen verse prijzen, voorraadstatus en images.
2. **Verify** – HEAD-request op elke `bol.com/...` URL. Producten die >7 dagen weg zijn, worden uit het overzicht verwijderd, zodat je geen commissie misloopt door dode links.
3. **Build** – regenereert alle HTML uit `data/`.
4. **Commit & push** – wijzigingen komen automatisch terug in de repo.
5. **Deploy** – publiceert naar GitHub Pages.

Handmatig starten kan via de Actions-tab → "Daily sync & build" → "Run workflow".

## Nieuwe wasmachine handmatig toevoegen
Open `data/products.json`, kopieer een bestaand product-object en pas aan:
- `id`, `slug`, `brand`, `model`, `name`, `tagline`, `image`
- `fromPrice`, `specs`, `features`, `pros`, `cons`
- `description` (zes secties van samen ~800 woorden)
- `reviewHighlights`, `manualUrl`, `bolPath`

Daarna `npm run build`.

## Nieuwe wastip toevoegen
Open `data/tips.json` en voeg een item toe. `body` mag meerdere paragrafen bevatten (gescheiden door dubbele newlines). Je kunt onderaan `affiliateProducts` toevoegen voor inline product-CTA's.

## Hosting
De site is static — host hem waar je wilt:
- **GitHub Pages**: workflow doet dit automatisch.
- **Cloudflare Pages / Netlify / Vercel**: koppel de repo, build command `npm run build`, output `.` (huidige map).

## URLs
- `/` homepage
- `/wasmachines/` vergelijkpagina
- `/wasmachine/<slug>/` productdetail (bv. `/wasmachine/samsung-ww90t534aaw/`)
- `/wastips/` tips-overzicht
- `/wastips/<slug>/` artikel
- `/out/?p=<bol-path>` affiliate-redirect (intern, niet voor publiek)
- `/sitemap.xml`, `/robots.txt`

## Affiliate disclosure
In de footer staat een korte disclosure dat we via het partnerprogramma van Bol.com werken. Voldoet aan de AFM/ACM richtlijnen voor reclame-uitingen.
