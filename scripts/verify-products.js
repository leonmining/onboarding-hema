#!/usr/bin/env node
// Loopt alle productlinks na: bestaat de Bol.com-pagina nog? Is hij in stock?
// Producten die >7 dagen niet beschikbaar zijn, worden uit het overzicht
// gehaald. Producten die net niet leverbaar zijn, blijven staan met een
// vermelding "tijdelijk niet leverbaar".
//
// Dit script gebruikt geen API maar een eenvoudige HEAD-check op de
// publieke Bol.com URL. Voor diepere stock-info kun je in plaats hiervan
// de Bol.com Affiliate API gebruiken — dat is wat sync-bol.js doet.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const BASE = 'https://www.bol.com/nl/nl/';
const MAX_UNAVAILABLE_DAYS = 7;

async function check(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function run() {
  console.log('▶ Verifieer Bol.com URL\'s…');
  const data = JSON.parse(await readFile(join(root, 'data/products.json'), 'utf8'));

  const now = new Date();
  const toRemove = [];

  for (const p of data.products) {
    const url = `${BASE}${p.bolPath}`;
    const r = await check(url);
    p.lastChecked = now.toISOString();
    if (!r.ok) {
      p.available = false;
      p.unavailableSince = p.unavailableSince || now.toISOString();
      console.log(`  ✘ ${p.name} → ${r.status} (sinds ${p.unavailableSince})`);
    } else {
      p.available = true;
      delete p.unavailableSince;
      console.log(`  ✔ ${p.name}`);
    }

    // Te lang weg? Markeren voor verwijdering uit de gegenereerde site.
    if (p.unavailableSince) {
      const days = (now - new Date(p.unavailableSince)) / (1000 * 60 * 60 * 24);
      if (days > MAX_UNAVAILABLE_DAYS) toRemove.push(p.slug);
    }
  }

  if (toRemove.length) {
    console.log(`  ⚠ Verwijderen na ${MAX_UNAVAILABLE_DAYS} dagen offline: ${toRemove.join(', ')}`);
    data.products = data.products.filter(p => !toRemove.includes(p.slug));
  }

  data.lastVerified = now.toISOString();
  await writeFile(join(root, 'data/products.json'), JSON.stringify(data, null, 2));
  console.log('✓ Verificatie klaar.');
}

run().catch((err) => { console.error(err); process.exit(1); });
