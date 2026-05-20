// Client-side filteren en sorteren van wasmachines op de overzichtspagina.
// Data wordt geladen vanuit /data/products.json. De product-cards in de DOM
// hebben data-attributen die overeenkomen met de filterbare specs.

(async function () {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.product-card'));
  const countEl = document.getElementById('result-count');

  const state = {
    maxPrice: parseInt(document.getElementById('f-price')?.max || 2000, 10),
    minPrice: 0,
    maxNoise: 80,
    capacities: new Set(),
    energy: new Set(),
    brands: new Set(),
    features: new Set(),
    sort: 'popular'
  };

  // UI: prijs- en geluidsslider met live waarde
  const priceEl = document.getElementById('f-price');
  const priceVal = document.getElementById('f-price-val');
  const noiseEl = document.getElementById('f-noise');
  const noiseVal = document.getElementById('f-noise-val');

  if (priceEl) {
    state.maxPrice = parseInt(priceEl.value, 10);
    priceEl.addEventListener('input', () => {
      state.maxPrice = parseInt(priceEl.value, 10);
      if (priceVal) priceVal.textContent = `€ ${state.maxPrice}`;
      apply();
    });
  }
  if (noiseEl) {
    state.maxNoise = parseInt(noiseEl.value, 10);
    noiseEl.addEventListener('input', () => {
      state.maxNoise = parseInt(noiseEl.value, 10);
      if (noiseVal) noiseVal.textContent = `${state.maxNoise} dB`;
      apply();
    });
  }

  // Checkboxes
  document.querySelectorAll('[data-filter]').forEach((el) => {
    el.addEventListener('change', () => {
      const set = state[el.dataset.filter];
      if (!set) return;
      if (el.checked) set.add(el.value); else set.delete(el.value);
      apply();
    });
  });

  // Sort
  const sortEl = document.getElementById('sort');
  if (sortEl) sortEl.addEventListener('change', () => { state.sort = sortEl.value; apply(); });

  // Filter toggle op mobiel
  document.querySelector('.toggle-filters')?.addEventListener('click', (e) => {
    e.currentTarget.closest('.filter-card')?.classList.toggle('collapsed');
  });

  // Reset-knop
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((el) => { el.checked = false; });
    state.capacities.clear(); state.energy.clear(); state.brands.clear(); state.features.clear();
    if (priceEl) { priceEl.value = priceEl.max; state.maxPrice = parseInt(priceEl.max, 10); if (priceVal) priceVal.textContent = `€ ${state.maxPrice}`; }
    if (noiseEl) { noiseEl.value = noiseEl.max; state.maxNoise = parseInt(noiseEl.max, 10); if (noiseVal) noiseVal.textContent = `${state.maxNoise} dB`; }
    if (sortEl) sortEl.value = 'popular';
    state.sort = 'popular';
    apply();
  });

  function apply() {
    let visible = 0;
    cards.forEach((card) => {
      const d = card.dataset;
      const price = parseFloat(d.price);
      const noise = parseFloat(d.noisewash);
      const cap = d.capacity;
      const en = d.energy;
      const brand = d.brand;
      const features = (d.features || '').split(',');

      let show = true;
      if (price > state.maxPrice) show = false;
      if (noise > state.maxNoise) show = false;
      if (state.capacities.size && !state.capacities.has(cap)) show = false;
      if (state.energy.size && !state.energy.has(en)) show = false;
      if (state.brands.size && !state.brands.has(brand)) show = false;
      if (state.features.size && !Array.from(state.features).every(f => features.some(ft => ft.startsWith(f)))) show = false;

      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    // Sorteren
    const visibleCards = cards.filter(c => !c.classList.contains('hidden'));
    const sorted = [...visibleCards].sort((a, b) => {
      const da = a.dataset; const db = b.dataset;
      switch (state.sort) {
        case 'price-asc': return parseFloat(da.price) - parseFloat(db.price);
        case 'price-desc': return parseFloat(db.price) - parseFloat(da.price);
        case 'rating': return parseFloat(db.rating) - parseFloat(da.rating);
        case 'noise': return parseFloat(da.noisewash) - parseFloat(db.noisewash);
        case 'capacity': return parseFloat(db.capacity) - parseFloat(da.capacity);
        default: return parseInt(db.reviews) - parseInt(da.reviews);
      }
    });
    sorted.forEach(c => grid.appendChild(c));

    if (countEl) countEl.textContent = `${visible} wasmachine${visible === 1 ? '' : 's'}`;
  }

  apply();
})();
