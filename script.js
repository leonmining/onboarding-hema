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

  let vorigeStatus = false;
  function updateProgress(skipCelebration) {
    const totaal = checkboxes.length;
    const gedaan = Array.from(checkboxes).filter((c) => c.checked).length;
    const pct = totaal === 0 ? 0 : (gedaan / totaal) * 100;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${gedaan} van ${totaal}`;
    const allesAf = totaal > 0 && gedaan === totaal;
    if (allesAf && !vorigeStatus && !skipCelebration) {
      vierFeest();
    }
    vorigeStatus = allesAf;
  }

  // ===== Viering met confetti & tompouce =====
  const celebration = document.getElementById('celebration');
  const celebrationClose = document.getElementById('celebration-close');
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confettiId = null;
  let deeltjes = [];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function maakDeeltjes() {
    const kleuren = ['#E60028', '#ff7eb3', '#ffd84d', '#ffffff', '#ff4e8a', '#fff8dc'];
    deeltjes = [];
    const aantal = reduceMotion ? 40 : 140;
    for (let i = 0; i < aantal; i++) {
      deeltjes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        kleur: kleuren[Math.floor(Math.random() * kleuren.length)],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vrot: -0.15 + Math.random() * 0.3,
      });
    }
  }

  function tekenConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    deeltjes.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.kleur;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiId = requestAnimationFrame(tekenConfetti);
  }

  function vierFeest() {
    celebration.classList.add('open');
    celebration.setAttribute('aria-hidden', 'false');
    resizeCanvas();
    maakDeeltjes();
    if (confettiId) cancelAnimationFrame(confettiId);
    tekenConfetti();
    celebrationClose.focus();
  }

  function stopFeest() {
    celebration.classList.remove('open');
    celebration.setAttribute('aria-hidden', 'true');
    if (confettiId) cancelAnimationFrame(confettiId);
    confettiId = null;
  }

  celebrationClose.addEventListener('click', stopFeest);
  celebration.addEventListener('click', (e) => {
    if (e.target === celebration) stopFeest();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && celebration.classList.contains('open')) stopFeest();
  });
  window.addEventListener('resize', () => {
    if (celebration.classList.contains('open')) resizeCanvas();
  });

  checkboxes.forEach((cb) => {
    const key = cb.dataset.key;
    if (opgeslagen[key]) cb.checked = true;
    cb.addEventListener('change', () => {
      opgeslagen[cb.dataset.key] = cb.checked;
      localStorage.setItem(STORAGE_CHECK, JSON.stringify(opgeslagen));
      updateProgress();
    });
  });
  updateProgress(true);
})();
