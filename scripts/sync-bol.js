#!/usr/bin/env node
// Synchroniseert producten met de Bol.com Open API.
//
// Vereiste env-vars (zet ze als GitHub Action secrets):
//   BOL_CLIENT_ID         OAuth client ID
//   BOL_CLIENT_SECRET     OAuth client secret
//   AFFILIATE_ID          jouw partner-/affiliate-ID voor de bltgh-parameter
//   BOL_CATEGORY_ID       (optioneel) Bol.com categorie-id voor wasmachines
//
// Wat dit script doet:
// 1. Haalt een OAuth-token op met client_credentials.
// 2. Vraagt populaire wasmachines op via de catalog search.
// 3. Per product haalt het specs en images op.
// 4. Werkt data/products.json bij door:
//    - nieuwe producten toe te voegen (zonder beschrijvingen — die schrijf je zelf)
//    - bestaande producten te updaten (prijs, voorraad, image, specs)
//    - producten die niet meer bestaan te markeren met "available: false"
//
// In een real-world deploy roep je dit aan vanuit GitHub Actions (zie
// .github/workflows/daily-sync.yml). Zonder credentials draait dit script
// als no-op zodat de build niet kapot gaat in een development setup.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const BOL_TOKEN_URL = 'https://login.bol.com/token?grant_type=client_credentials';
const BOL_API = 'https://api.bol.com';

const {
  BOL_CLIENT_ID,
  BOL_CLIENT_SECRET,
  AFFILIATE_ID,
  BOL_CATEGORY_ID = '3825', // categorie 'Wasmachines'
} = process.env;

if (!BOL_CLIENT_ID || !BOL_CLIENT_SECRET) {
  console.log('⏭  BOL_CLIENT_ID/BOL_CLIENT_SECRET niet gezet – sync wordt overgeslagen.');
  console.log('   Zet ze als GitHub Action-secrets om automatisch te synchroniseren.');
  process.exit(0);
}

async function getToken() {
  const basic = Buffer.from(`${BOL_CLIENT_ID}:${BOL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(BOL_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

async function bolFetch(token, path) {
  const res = await fetch(`${BOL_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.advertiser.v10+json'
    }
  });
  if (!res.ok) throw new Error(`Bol API ${path} → ${res.status}`);
  return res.json();
}

function toSlug(brand, model) {
  return `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function run() {
  console.log('▶ Sync met Bol.com Open API…');
  const token = await getToken();
  console.log('  ✔ token verkregen');

  // Catalogus zoeken (top 50 wasmachines op populariteit)
  const search = await bolFetch(token, `/advertiser/products?category-id=${BOL_CATEGORY_ID}&sort=POPULARITY&limit=50`);
  const items = search.products || [];
  console.log(`  ✔ ${items.length} producten opgehaald`);

  const current = JSON.parse(await readFile(join(root, 'data/products.json'), 'utf8'));
  const bySlug = new Map(current.products.map(p => [p.slug, p]));
  const apiIds = new Set();

  for (const it of items) {
    const brand = it.brand || it.attributes?.brand || 'Onbekend';
    const model = it.modelName || it.attributes?.modelName || it.id;
    const slug = toSlug(brand, model);
    apiIds.add(it.id);

    const existing = bySlug.get(slug) || current.products.find(p => p.id === it.id);
    if (existing) {
      // Update prijs, image, voorraad
      existing.fromPrice = it.offerData?.price || existing.fromPrice;
      existing.image = it.images?.[0]?.url || existing.image;
      existing.available = true;
      existing.lastChecked = new Date().toISOString();
    } else {
      // Nieuw product: voeg basisrecord toe. Beschrijvingen blijven leeg
      // tot een redacteur ze invult — generatieve tekst zonder context is
      // slechter voor SEO dan een opmerking.
      current.products.push({
        id: it.id,
        slug,
        brand,
        model,
        name: `${brand} ${model}`,
        tagline: it.shortDescription || '',
        image: it.images?.[0]?.url || '',
        imageAlt: `${brand} ${model} wasmachine`,
        fromPrice: it.offerData?.price || 0,
        category: 'unknown',
        specs: {
          capacity: it.attributes?.capacity || 0,
          energyClass: it.attributes?.energyLabel || '',
          spinSpeed: it.attributes?.spinSpeed || 0,
          noiseWash: it.attributes?.noiseLevelWash || 0,
          noiseSpin: it.attributes?.noiseLevelSpin || 0,
          dimensions: it.attributes?.dimensions || '',
          weight: it.attributes?.weight || 0,
          type: it.attributes?.washingType || 'Voorlader',
          inverter: false, steam: false, app: false, addWash: false
        },
        features: [],
        pros: [], cons: [],
        rating: it.rating?.average || 0,
        reviewCount: it.rating?.count || 0,
        manualUrl: '',
        bolProductId: it.id,
        bolPath: `p/${slug}/${it.id}/`,
        ean: it.ean || '',
        description: { intro: '', design: '', performance: '', features: '', energy: '', verdict: '' },
        reviewHighlights: [],
        available: true,
        lastChecked: new Date().toISOString(),
        needsContent: true
      });
      console.log(`  + nieuw product: ${brand} ${model}`);
    }
  }

  // Markeer producten die niet meer in de API zitten als unavailable.
  for (const p of current.products) {
    if (p.bolProductId && !apiIds.has(p.bolProductId)) {
      p.available = false;
      p.lastChecked = new Date().toISOString();
      console.log(`  - niet meer beschikbaar: ${p.name}`);
    }
  }

  current.lastSync = new Date().toISOString();
  current.affiliateId = AFFILIATE_ID || current.affiliateId;

  await writeFile(join(root, 'data/products.json'), JSON.stringify(current, null, 2));
  console.log('✓ Sync klaar.');
}

run().catch((err) => { console.error(err); process.exit(1); });
