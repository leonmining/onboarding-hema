#!/usr/bin/env node
// Genereert de hele site uit data/products.json en data/tips.json.
// Output: index.html, wasmachines/index.html, wasmachine/<slug>/index.html,
// wastips/index.html en wastips/<slug>/index.html.
//
// Affiliate-ID komt uit AFFILIATE_ID env var of uit products.json.affiliateId
// als fallback. Eén plek aanpassen = alle Bol.com links bijwerken.

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ----- Data laden ----------------------------------------------------------
const productsData = JSON.parse(await readFile(join(root, 'data/products.json'), 'utf8'));
const tipsData = JSON.parse(await readFile(join(root, 'data/tips.json'), 'utf8'));

const AFFILIATE_ID = process.env.AFFILIATE_ID || productsData.affiliateId || 'BOLAFFID';
const BASE = 'https://www.bol.com/nl/nl/';

const products = productsData.products;
const tips = tipsData.tips;

// ----- Hulpfuncties --------------------------------------------------------
function escape(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bolUrl(path) {
  const sep = path.includes('?') ? '&' : '?';
  return `${BASE}${path}${sep}bltgh=${AFFILIATE_ID}&affiliate_subid=site`;
}

function affiliateOut(productOrPath) {
  const path = typeof productOrPath === 'string' ? productOrPath : productOrPath.bolPath;
  return `/out/?p=${encodeURIComponent(path)}`;
}

function formatPrice(p) {
  return `€ ${p.toFixed(2).replace('.', ',')}`;
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let out = '';
  for (let i = 0; i < full; i++) out += '★';
  if (half) out += '½';
  for (let i = full + (half ? 1 : 0); i < 5; i++) out += '☆';
  return out;
}

function buildBlurb(words, productName) {
  // Niet gebruikt; placeholder.
  return '';
}

function head({ title, description, canonical, image, type = 'website', extraJsonLd = '' }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${escape(canonical)}" />
<meta property="og:type" content="${type}" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
${image ? `<meta property="og:image" content="${escape(image)}" />` : ''}
<meta property="og:url" content="${escape(canonical)}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230EA5E9'/%3E%3Ccircle cx='32' cy='34' r='14' fill='none' stroke='white' stroke-width='4'/%3E%3Ccircle cx='32' cy='34' r='5' fill='white'/%3E%3Ccircle cx='52' cy='14' r='3' fill='white'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/css/styles.css" />
${extraJsonLd}
</head>
<body>
<header class="site-header">
  <div class="container">
    <a href="/" class="brand">
      <span class="brand-mark">W</span>
      <span>Wasmachine<span style="color:var(--primary)">Wijzer</span></span>
    </a>
    <nav class="nav" id="nav">
      <a href="/" data-page="home">Home</a>
      <a href="/wasmachines/" data-page="wasmachines">Vergelijken</a>
      <a href="/wastips/" data-page="wastips">Wastips</a>
      <a href="${affiliateOut('l/wasmachines/')}" rel="sponsored nofollow" class="btn btn-primary btn-sm">Bekijk op Bol.com</a>
    </nav>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
</header>
<main>`;
}

function foot() {
  return `</main>
<section class="newsletter">
  <div class="container">
    <h2>Mis nooit meer een actie of nieuwe topper</h2>
    <p>Schrijf je in en ontvang de beste deals op wasmachines, drogers en wasmiddelen rechtstreeks in je inbox.</p>
    <form onsubmit="event.preventDefault();this.querySelector('button').textContent='Bedankt!';">
      <input type="email" required placeholder="jouw@email.nl" aria-label="E-mailadres" />
      <button class="btn" type="submit">Aanmelden</button>
    </form>
  </div>
</section>
<footer class="site-footer">
  <div class="container">
    <div class="row">
      <div>
        <strong>WasmachineWijzer</strong><br />
        Onafhankelijk wasmachines vergelijken en kopen.
      </div>
      <div>
        <a href="/wasmachines/">Vergelijken</a> &nbsp;·&nbsp;
        <a href="/wastips/">Wastips</a>
      </div>
    </div>
    <div class="disclaimer">
      WasmachineWijzer maakt gebruik van het partnerprogramma van Bol.com. We ontvangen een kleine commissie op aankopen via onze links – zonder dat dit jou iets extra's kost. We onafhankelijk schrijven en testen welke producten we aanbevelen. Prijzen en beschikbaarheid kunnen wijzigen.
    </div>
  </div>
</footer>
<script src="/assets/js/main.js"></script>
${process.env.PAGE_FILTERS ? '<script src="/assets/js/filters.js"></script>' : ''}
</body>
</html>`;
}

function productSchema(p, canonical) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: [p.image],
    description: p.tagline,
    sku: p.id,
    brand: { '@type': 'Brand', name: p.brand },
    gtin13: p.ean,
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'EUR',
      price: p.fromPrice,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Bol.com' }
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviewCount
    }
  })}</script>`;
}

// ----- Templates -----------------------------------------------------------
function productCard(p) {
  const featuresArr = p.features.map(f => f.toLowerCase().replace(/\s+/g, '-'));
  return `
<article class="product-card"
  data-price="${p.fromPrice}"
  data-noisewash="${p.specs.noiseWash}"
  data-capacity="${p.specs.capacity}"
  data-energy="${p.specs.energyClass}"
  data-brand="${p.brand}"
  data-features="${featuresArr.join(',')}"
  data-rating="${p.rating}"
  data-reviews="${p.reviewCount}">
  <a class="img" href="/wasmachine/${p.slug}/">
    <img src="${p.image}" alt="${escape(p.imageAlt)}" loading="lazy" />
    <span class="tag">${p.specs.capacity} kg · ${p.specs.energyClass}</span>
  </a>
  <div class="body">
    <span class="brand">${escape(p.brand)}</span>
    <h3><a href="/wasmachine/${p.slug}/">${escape(p.name)}</a></h3>
    <div class="specs">
      <span class="chip">${p.specs.spinSpeed} tpm</span>
      <span class="chip">${p.specs.noiseWash} dB</span>
      ${p.specs.steam ? '<span class="chip">Stoom</span>' : ''}
      ${p.specs.app ? '<span class="chip">App</span>' : ''}
    </div>
    <div class="meta">
      <div class="price"><span>vanaf</span> ${formatPrice(p.fromPrice)}</div>
      <div class="rating"><span class="star">★</span>${p.rating} <span>(${p.reviewCount})</span></div>
    </div>
  </div>
  <div class="actions">
    <a href="/wasmachine/${p.slug}/" class="btn btn-secondary btn-sm">Vergelijken</a>
    <a href="${affiliateOut(p)}" rel="sponsored nofollow" target="_blank" class="btn btn-primary btn-sm">Bekijken</a>
  </div>
</article>`;
}

function homeTemplate() {
  const top = [...products].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const latestTips = tips.slice(0, 3);
  const canonical = 'https://wasmachinewijzer.nl/';
  const description = 'Vergelijk de top 20 wasmachines van 2026: prijs, energielabel, geluid, capaciteit en functies. Onafhankelijk advies en de beste deals via Bol.com.';

  return head({
    title: 'WasmachineWijzer – Vergelijk de beste wasmachines van 2026',
    description,
    canonical,
    image: top[0]?.image,
    extraJsonLd: `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'WasmachineWijzer',
      url: canonical,
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://wasmachinewijzer.nl/wasmachines/?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    })}</script>`
  }) + `
<section class="hero">
  <div class="container">
    <div class="hero-grid">
      <div>
        <h1>De wasmachine die <span class="grad">precies</span> bij jou past – binnen 2 minuten gevonden.</h1>
        <p class="lead">Vergelijk ${products.length}+ topmodellen op prijs, geluid, energielabel en functies. Wij verzamelen de beste deals van Bol.com voor je.</p>
        <div class="hero-ctas">
          <a href="/wasmachines/" class="btn btn-primary btn-lg">Wasmachines vergelijken</a>
          <a href="/wastips/" class="btn btn-secondary btn-lg">Lees onze wastips</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><div class="num">${products.length}+</div><div class="lab">topmodellen</div></div>
          <div class="stat"><div class="num">24u</div><div class="lab">prijs- en stockcheck</div></div>
          <div class="stat"><div class="num">800+</div><div class="lab">woorden per review</div></div>
        </div>
      </div>
      <div class="hero-image">
        <img src="https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=1200&q=80" alt="Moderne wasruimte met nieuwe wasmachine" />
        <div class="hero-badge"><span class="dot"></span> Live prijzen via Bol.com</div>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="container">
    <div class="section-head">
      <div>
        <h2>Top picks van deze week</h2>
        <p>Onze redactie selecteert wekelijks de zes wasmachines met de hoogste prijs/kwaliteit en de beste reviews.</p>
      </div>
      <a href="/wasmachines/" class="btn btn-ghost">Bekijk alle wasmachines →</a>
    </div>
    <div class="product-grid">
      ${top.map(productCard).join('')}
    </div>
  </div>
</section>

<section style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
  <div class="container">
    <div class="section-head">
      <div>
        <h2>Verse Wastips, elke dag</h2>
        <p>Slim wassen, energie besparen en je textiel langer mooi houden – we delen praktische tips en producten.</p>
      </div>
      <a href="/wastips/" class="btn btn-ghost">Bekijk alle tips →</a>
    </div>
    <div class="tips-grid">
      ${latestTips.map(tipCard).join('')}
    </div>
  </div>
</section>

<section>
  <div class="container">
    <div class="section-head text-center" style="justify-content:center;text-align:center;">
      <div style="margin:0 auto;">
        <h2>Hoe wij vergelijken</h2>
        <p style="margin:8px auto 0;">Eerlijk, transparant en zonder spinsels.</p>
      </div>
    </div>
    <div class="product-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;">
      <div class="product-card" style="padding:24px;">
        <div style="font-size:1.5rem;color:var(--primary)">🔍</div>
        <h3 style="margin-top:10px;">Onafhankelijk getest</h3>
        <p class="muted" style="margin-top:6px;">We verzamelen specs en reviews uit meerdere bronnen, niet alleen Bol.com.</p>
      </div>
      <div class="product-card" style="padding:24px;">
        <div style="font-size:1.5rem;color:var(--primary)">⚡</div>
        <h3 style="margin-top:10px;">24-uurs prijscheck</h3>
        <p class="muted" style="margin-top:6px;">Elke dag controleren we automatisch prijzen en voorraad zodat je nooit een deal mist.</p>
      </div>
      <div class="product-card" style="padding:24px;">
        <div style="font-size:1.5rem;color:var(--primary)">📦</div>
        <h3 style="margin-top:10px;">Veilig kopen bij Bol.com</h3>
        <p class="muted" style="margin-top:6px;">Gratis bezorging, oude wasmachine retour en 30 dagen bedenktijd.</p>
      </div>
    </div>
  </div>
</section>
` + foot();
}

function overviewTemplate() {
  const canonical = 'https://wasmachinewijzer.nl/wasmachines/';
  const description = 'Filter en vergelijk alle wasmachines van 2026 op prijs, capaciteit, energielabel, geluid en functies. Updated dagelijks via Bol.com.';
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const capacities = [...new Set(products.map(p => p.specs.capacity))].sort((a,b)=>a-b);
  const energies = [...new Set(products.map(p => p.specs.energyClass))].sort();
  const maxPrice = Math.max(...products.map(p => p.fromPrice));

  return head({
    title: `Wasmachines vergelijken – ${products.length} topmodellen | WasmachineWijzer`,
    description,
    canonical
  }) + `
<section class="hero" style="padding:48px 0 32px;">
  <div class="container">
    <h1 style="font-size:clamp(1.75rem,1.4rem + 1.4vw,2.4rem);max-width:760px;">Vergelijk wasmachines van ${brands.length} topmerken</h1>
    <p class="lead" style="margin-top:10px;">Filter op prijs, geluid, capaciteit en functies. Alle modellen worden elke 24 uur gecontroleerd op beschikbaarheid via Bol.com.</p>
  </div>
</section>

<section style="padding-top:24px;">
  <div class="container">
    <div class="filter-wrap">
      <aside class="filter-card">
        <button class="toggle-filters btn btn-secondary btn-sm" type="button" aria-label="Filters tonen">
          Filters <span>↕</span>
        </button>
        <div class="filter-body">
          <h3>Filters</h3>
          <div class="filter-group">
            <span class="label">Maximale prijs</span>
            <div class="value"><span>tot</span><span id="f-price-val">€ ${maxPrice}</span></div>
            <input type="range" id="f-price" min="300" max="${maxPrice}" step="50" value="${maxPrice}" />
          </div>
          <div class="filter-group">
            <span class="label">Max. geluid wassen</span>
            <div class="value"><span>onder</span><span id="f-noise-val">60 dB</span></div>
            <input type="range" id="f-noise" min="45" max="60" step="1" value="60" />
          </div>
          <div class="filter-group">
            <span class="label">Capaciteit (kg)</span>
            <div class="check-list">
              ${capacities.map(c => `<label class="check"><input type="checkbox" data-filter="capacities" value="${c}" /> ${c} kg</label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <span class="label">Energielabel</span>
            <div class="check-list">
              ${energies.map(e => `<label class="check"><input type="checkbox" data-filter="energy" value="${e}" /> ${e}</label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <span class="label">Merk</span>
            <div class="check-list">
              ${brands.map(b => `<label class="check"><input type="checkbox" data-filter="brands" value="${b}" /> ${escape(b)}</label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <span class="label">Functies</span>
            <div class="check-list">
              <label class="check"><input type="checkbox" data-filter="features" value="ecobubble" /> EcoBubble</label>
              <label class="check"><input type="checkbox" data-filter="features" value="prosteam" /> ProSteam</label>
              <label class="check"><input type="checkbox" data-filter="features" value="i-dos" /> Auto-dosering (i-Dos)</label>
              <label class="check"><input type="checkbox" data-filter="features" value="twindos-automatische-dosering" /> TwinDos</label>
              <label class="check"><input type="checkbox" data-filter="features" value="addxtra-inworp-tijdens-wassen" /> Inwerp tijdens wassen</label>
            </div>
          </div>
          <button class="btn btn-secondary btn-block" id="reset-filters" type="button">Filters wissen</button>
        </div>
      </aside>

      <div>
        <div class="filter-bar">
          <div class="count" id="result-count">${products.length} wasmachines</div>
          <div class="sort">
            <label for="sort">Sorteren</label>
            <select id="sort">
              <option value="popular">Populair</option>
              <option value="rating">Beoordeling</option>
              <option value="price-asc">Prijs (laag→hoog)</option>
              <option value="price-desc">Prijs (hoog→laag)</option>
              <option value="noise">Stilste eerst</option>
              <option value="capacity">Grootste capaciteit</option>
            </select>
          </div>
        </div>

        <div class="product-grid" id="product-grid">
          ${products.map(productCard).join('')}
        </div>
      </div>
    </div>
  </div>
</section>
` + foot();
}

function productPageTemplate(p) {
  const canonical = `https://wasmachinewijzer.nl/wasmachine/${p.slug}/`;
  const d = p.description;
  const fullText = [d.intro, d.design, d.performance, d.features, d.energy, d.verdict].join(' ');
  const wordCount = fullText.split(/\s+/).length;

  // Gerelateerde producten: zelfde categorie of vergelijkbaar prijssegment
  const related = products.filter(x => x.slug !== p.slug)
    .map(x => ({ x, score: (x.category === p.category ? 2 : 0) + (Math.abs(x.fromPrice - p.fromPrice) < 200 ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(o => o.x);

  return head({
    title: `${p.name} review – specs, voordelen en beste prijs`,
    description: `${p.tagline}. Lees onze uitgebreide review (${wordCount} woorden) over de ${p.name}, met specs, voor- en nadelen, klantbeoordelingen en de beste deals via Bol.com.`,
    canonical,
    image: p.image,
    type: 'product',
    extraJsonLd: productSchema(p, canonical)
  }) + `
<section class="detail-hero">
  <div class="container">
    <div class="article" style="padding:0 0 16px 0;">
      <div class="crumbs">
        <a href="/">Home</a> · <a href="/wasmachines/">Wasmachines</a> · <span>${escape(p.brand)} ${escape(p.model)}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-image">
        <img src="${p.image}" alt="${escape(p.imageAlt)}" />
      </div>
      <div class="detail-info">
        <div class="brandline">${escape(p.brand)}</div>
        <h1>${escape(p.name)}</h1>
        <p class="tagline">${escape(p.tagline)}</p>
        <div class="rating-line">
          <span class="stars">${stars(p.rating)}</span>
          <strong>${p.rating}</strong>
          <span class="muted">· gebaseerd op ${p.reviewCount} reviews</span>
        </div>
        <div class="price-box">
          <div class="price"><span>Vanaf</span>${formatPrice(p.fromPrice)}</div>
          <div class="actions">
            <a href="${affiliateOut(p)}" rel="sponsored nofollow" target="_blank" class="btn btn-primary btn-lg">Bekijk op Bol.com</a>
          </div>
        </div>
        <div class="specs-grid">
          <div class="spec"><div class="key">Capaciteit</div><div class="val">${p.specs.capacity} kg</div></div>
          <div class="spec"><div class="key">Energielabel</div><div class="val">${p.specs.energyClass}</div></div>
          <div class="spec"><div class="key">Centrifuge</div><div class="val">${p.specs.spinSpeed} tpm</div></div>
          <div class="spec"><div class="key">Geluid wassen</div><div class="val">${p.specs.noiseWash} dB</div></div>
          <div class="spec"><div class="key">Geluid centrifuge</div><div class="val">${p.specs.noiseSpin} dB</div></div>
          <div class="spec"><div class="key">Afmetingen</div><div class="val">${p.specs.dimensions}</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section-detail">
  <div class="container">
    <div class="prose">
      <h2>Onze review van de ${escape(p.brand)} ${escape(p.model)}</h2>
      <p>${escape(d.intro)}</p>
      <h3>Design & afwerking</h3>
      <p>${escape(d.design)}</p>
      <h3>Wasprestaties</h3>
      <p>${escape(d.performance)}</p>

      <div class="cta-strip">
        <div>
          <div class="title">Bestel direct met partnerkorting</div>
          <p>Gratis bezorgd, oude wasmachine retour en 30 dagen bedenktijd.</p>
        </div>
        <a href="${affiliateOut(p)}" rel="sponsored nofollow" target="_blank" class="btn btn-lg">Naar Bol.com →</a>
      </div>

      <h3>Slimme functies</h3>
      <p>${escape(d.features)}</p>
      <h3>Installatie en eerste gebruik</h3>
      <p>${escape(d.installation || '')}</p>
      <h3>Onderhoud op de lange termijn</h3>
      <p>${escape(d.maintenance || '')}</p>
      <h3>Energieverbruik en geluid</h3>
      <p>${escape(d.energy)}</p>
      <h3>Hoe verhoudt deze zich tot alternatieven?</h3>
      <p>${escape(d.comparison || '')}</p>
      <h3>Onze conclusie</h3>
      <p>${escape(d.verdict)}</p>
    </div>

    <div class="proscons">
      <div class="col pros">
        <h4>✅ Pluspunten</h4>
        <ul>${p.pros.map(x => `<li>${escape(x)}</li>`).join('')}</ul>
      </div>
      <div class="col cons">
        <h4>⚠️ Aandachtspunten</h4>
        <ul>${p.cons.map(x => `<li>${escape(x)}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="section-detail" style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
  <div class="container">
    <h2>Wat klanten zeggen</h2>
    <div class="reviews-grid">
      ${p.reviewHighlights.map(r => `
        <div class="review-card">
          <div class="stars">${stars(r.rating)}</div>
          <blockquote>"${escape(r.text)}"</blockquote>
          <div class="who">${escape(r.author)}</div>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<section class="section-detail">
  <div class="container">
    <h2>Handige resources</h2>
    <div class="resource-list">
      <a href="${escape(p.manualUrl)}" target="_blank" rel="noopener nofollow">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h12l4 4v12H4z"/><path d="M14 4v6h6"/></svg>
        Officiële handleiding (PDF)
      </a>
      <a href="${affiliateOut(p)}" rel="sponsored nofollow" target="_blank">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2 14h13l2-9H6"/></svg>
        Bekijk op Bol.com
      </a>
      <a href="/wastips/wasmachine-stinkt-oplossen/">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg>
        Onderhoudstips
      </a>
    </div>

    <div class="cta-strip">
      <div>
        <div class="title">Twijfel je nog?</div>
        <p>Vergelijk de ${escape(p.brand)} ${escape(p.model)} met andere topmodellen.</p>
      </div>
      <a href="/wasmachines/" class="btn btn-lg">Vergelijk modellen</a>
    </div>
  </div>
</section>

<section class="section-detail" style="background:#fff;border-top:1px solid var(--border);">
  <div class="container">
    <div class="section-head">
      <div>
        <h2>Vergelijkbare modellen</h2>
        <p>Andere wasmachines die in dezelfde klasse zitten.</p>
      </div>
    </div>
    <div class="product-grid">
      ${related.map(productCard).join('')}
    </div>
  </div>
</section>
` + foot();
}

function tipCard(t) {
  return `
<article class="tip-card">
  <a class="img" href="/wastips/${t.slug}/">
    <img src="${t.image}" alt="${escape(t.imageAlt)}" loading="lazy" />
  </a>
  <div class="body">
    <span class="cat">${escape(t.category)}</span>
    <h3><a href="/wastips/${t.slug}/">${escape(t.title)}</a></h3>
    <p>${escape(t.excerpt)}</p>
    <div class="meta">
      <span>${escape(formatDate(t.publishedAt))}</span>
      <span>${t.readMinutes} min lezen</span>
    </div>
  </div>
</article>`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function tipsOverviewTemplate() {
  const canonical = 'https://wasmachinewijzer.nl/wastips/';
  return head({
    title: 'Wastips & nieuws | WasmachineWijzer',
    description: 'Praktische wastips, productadvies en nieuws over wasmachines, drogers en wasmiddelen. Elke dag een nieuw artikel.',
    canonical,
    image: tips[0]?.image
  }) + `
<section class="hero" style="padding:48px 0 24px;">
  <div class="container">
    <h1>Wastips & nieuws</h1>
    <p class="lead">Slim wassen, energie besparen en je textiel langer mooi houden. Elke dag een nieuw artikel.</p>
  </div>
</section>

<section style="padding-top:24px;">
  <div class="container">
    <div class="tips-grid">
      ${tips.map(tipCard).join('')}
    </div>
  </div>
</section>
` + foot();
}

function tipPageTemplate(t) {
  const canonical = `https://wasmachinewijzer.nl/wastips/${t.slug}/`;
  const paragraphs = t.body.split(/\n\n+/).map(p => `<p>${escape(p)}</p>`).join('\n');

  return head({
    title: `${t.title} | Wastips`,
    description: t.excerpt,
    canonical,
    image: t.image,
    type: 'article',
    extraJsonLd: `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: t.title,
      image: [t.image],
      datePublished: t.publishedAt,
      dateModified: t.publishedAt,
      author: { '@type': 'Organization', name: 'WasmachineWijzer' },
      description: t.excerpt
    })}</script>`
  }) + `
<article class="article">
  <div class="container">
    <div class="crumbs"><a href="/">Home</a> · <a href="/wastips/">Wastips</a> · <span>${escape(t.title)}</span></div>
    <h1>${escape(t.title)}</h1>
    <div class="article-meta">
      <span>${escape(t.category)}</span> · <span>${escape(formatDate(t.publishedAt))}</span> · <span>${t.readMinutes} min lezen</span>
    </div>
    <div class="article-image">
      <img src="${t.image}" alt="${escape(t.imageAlt)}" />
    </div>
    <div class="article-body">
      ${paragraphs}
    </div>
    ${t.affiliateProducts?.length ? `
      <div class="affiliate-box">
        <h3>Producten die in dit artikel langskomen</h3>
        <ul>
          ${t.affiliateProducts.map(a => `<li><a href="${affiliateOut(a.path)}" rel="sponsored nofollow" target="_blank">${escape(a.label)}</a></li>`).join('')}
        </ul>
      </div>` : ''}
  </div>
</article>

<section style="background:#fff;border-top:1px solid var(--border);">
  <div class="container">
    <div class="section-head">
      <div>
        <h2>Bekijk ook deze wasmachines</h2>
        <p>De drie hoogst beoordeelde modellen in onze vergelijker.</p>
      </div>
      <a href="/wasmachines/" class="btn btn-ghost">Alle wasmachines →</a>
    </div>
    <div class="product-grid">
      ${[...products].sort((a,b)=>b.rating-a.rating).slice(0,3).map(productCard).join('')}
    </div>
  </div>
</section>
` + foot();
}

// ----- 'out' redirect-pagina ----------------------------------------------
function outRedirectTemplate() {
  // Vanaf elke /out/?p=<bol-path> wordt doorgestuurd naar bol.com met affiliate-id.
  // Dat houdt alle outgoing-links netjes onder ons eigen pad zodat we het later
  // kunnen tracken of vervangen.
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<title>Doorverwijzen…</title>
<meta name="robots" content="noindex,nofollow" />
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;color:#0F172A}</style>
</head>
<body>
<p>Een moment – we sturen je door naar Bol.com…</p>
<script>
  const params = new URLSearchParams(location.search);
  const path = params.get('p') || 'l/wasmachines/';
  const id = ${JSON.stringify(AFFILIATE_ID)};
  const sub = params.get('s') || 'site';
  const sep = path.includes('?') ? '&' : '?';
  location.replace('${BASE}' + path + sep + 'bltgh=' + encodeURIComponent(id) + '&affiliate_subid=' + encodeURIComponent(sub));
</script>
<noscript><a id="fallback" href="${BASE}l/wasmachines/?bltgh=${AFFILIATE_ID}">Klik hier om door te gaan</a></noscript>
</body>
</html>`;
}

// ----- sitemap.xml & robots.txt -------------------------------------------
function sitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const base = 'https://wasmachinewijzer.nl';
  const urls = [
    { loc: `${base}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/wasmachines/`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/wastips/`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    ...products.map(p => ({ loc: `${base}/wasmachine/${p.slug}/`, lastmod: today, changefreq: 'weekly', priority: '0.7' })),
    ...tips.map(t => ({ loc: `${base}/wastips/${t.slug}/`, lastmod: t.publishedAt, changefreq: 'monthly', priority: '0.6' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /out/

Sitemap: https://wasmachinewijzer.nl/sitemap.xml
`;
}

// ----- Build runner --------------------------------------------------------
async function ensureDir(p) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }
async function write(p, content) {
  await ensureDir(dirname(p));
  await writeFile(p, content);
  console.log(`  ✔ ${p.replace(root + '/', '')}`);
}

async function cleanGenerated() {
  for (const dir of ['wasmachine', 'wastips', 'wasmachines', 'out']) {
    const full = join(root, dir);
    if (existsSync(full)) await rm(full, { recursive: true, force: true });
  }
  for (const f of ['index.html', 'sitemap.xml', 'robots.txt']) {
    const full = join(root, f);
    if (existsSync(full)) await rm(full, { force: true });
  }
}

async function build() {
  console.log(`▶ Build start (affiliate-id: ${AFFILIATE_ID})`);
  await cleanGenerated();

  await write(join(root, 'index.html'), homeTemplate());

  process.env.PAGE_FILTERS = '1';
  await write(join(root, 'wasmachines', 'index.html'), overviewTemplate());
  delete process.env.PAGE_FILTERS;

  for (const p of products) {
    await write(join(root, 'wasmachine', p.slug, 'index.html'), productPageTemplate(p));
  }

  await write(join(root, 'wastips', 'index.html'), tipsOverviewTemplate());
  for (const t of tips) {
    await write(join(root, 'wastips', t.slug, 'index.html'), tipPageTemplate(t));
  }

  await write(join(root, 'out', 'index.html'), outRedirectTemplate());

  await write(join(root, 'sitemap.xml'), sitemapXml());
  await write(join(root, 'robots.txt'), robotsTxt());

  console.log(`✓ Build done. ${products.length} producten, ${tips.length} tips.`);
}

build().catch((err) => { console.error(err); process.exit(1); });
