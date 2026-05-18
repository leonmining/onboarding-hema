(function () {
  'use strict';

  document.getElementById('jaar').textContent = new Date().getFullYear();

  // ===== Persoonlijke begroeting =====
  const STORAGE_NAAM = 'hema-onboarding-naam';
  const STORAGE_CHECK = 'hema-onboarding-checklist';
  const naamVeld = document.getElementById('naam-veld');
  const naamInput = document.getElementById('naam-input');
  const naamForm = document.getElementById('naam-form');

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const opgeslagenNaam = localStorage.getItem(STORAGE_NAAM);
  if (opgeslagenNaam) {
    naamVeld.textContent = opgeslagenNaam;
    naamInput.value = opgeslagenNaam;
  }

  naamForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = naamInput.value.trim().slice(0, 40);
    if (naam.length > 0) {
      naamVeld.textContent = naam;
      localStorage.setItem(STORAGE_NAAM, naam);
      naamVeld.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
        { duration: 400, easing: 'ease-out' }
      );
    } else {
      naamVeld.textContent = 'collega';
      localStorage.removeItem(STORAGE_NAAM);
    }
  });

  // ===== Mobiele navigatie =====
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.getElementById('nav-list');
  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navList.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ===== Checklist met opslag =====
  const checkboxes = document.querySelectorAll('#checklist-list input[type="checkbox"]');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  let opgeslagen = {};
  try {
    opgeslagen = JSON.parse(localStorage.getItem(STORAGE_CHECK) || '{}');
  } catch (e) {
    opgeslagen = {};
  }

  function updateProgress() {
    const totaal = checkboxes.length;
    const gedaan = Array.from(checkboxes).filter((c) => c.checked).length;
    const pct = totaal === 0 ? 0 : (gedaan / totaal) * 100;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${gedaan} van ${totaal}`;
  }

  checkboxes.forEach((cb) => {
    const key = cb.dataset.key;
    if (opgeslagen[key]) cb.checked = true;
    cb.addEventListener('change', () => {
      opgeslagen[cb.dataset.key] = cb.checked;
      localStorage.setItem(STORAGE_CHECK, JSON.stringify(opgeslagen));
      updateProgress();
    });
  });
  updateProgress();
})();
