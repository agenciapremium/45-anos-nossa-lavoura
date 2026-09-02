/* =========================================================
   NOSSA LAVOURA · 45 ANOS
   Interações da landing page
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Reveal on scroll, com escalonamento por grupo
     --------------------------------------------------------- */
  const revealables = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        e.target.style.setProperty('--d', `${Math.min(i, 5) * 60}ms`);
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealables.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------------
     Contagem dos números da trajetória
     --------------------------------------------------------- */
  const counters = $$('[data-count]');
  const runCount = el => {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    if (reduced) { el.textContent = prefix + target; return; }
    const dur = 1400, t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        runCount(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => cio.observe(el));
  } else {
    counters.forEach(runCount);
  }

  /* ---------------------------------------------------------
     Tarja de campanha: entra no ar a partir da data marcada
     --------------------------------------------------------- */
  const tarja = $('#tarja');
  if (tarja) {
    const from = new Date(`${tarja.dataset.from}T00:00:00-04:00`);
    if (Date.now() >= from.getTime()) tarja.hidden = false;
  }

  /* ---------------------------------------------------------
     Contagem regressiva para a semana de aniversário
     --------------------------------------------------------- */
  const cd = $('#cd');
  if (cd) {
    const target = new Date(cd.dataset.target).getTime();
    const cells = {
      d: cd.querySelector('[data-cd="d"]'),
      h: cd.querySelector('[data-cd="h"]'),
      m: cd.querySelector('[data-cd="m"]'),
      s: cd.querySelector('[data-cd="s"]')
    };
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { cd.hidden = true; return; }
      cd.hidden = false;
      const s = Math.floor(diff / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor(s / 3600) % 24);
      cells.m.textContent = pad(Math.floor(s / 60) % 60);
      cells.s.textContent = pad(s % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     Player do VT
     O arquivo entra em assets/video/vt-45-anos.mp4.
     Enquanto ele não existir, a página mantém o pôster e a
     versão em texto logo abaixo.
     --------------------------------------------------------- */
  const vtPlay = $('#vtPlay');
  if (vtPlay) {
    vtPlay.addEventListener('click', () => {
      const poster  = $('#vtPoster');
      const missing = $('#vtMissing');
      const video = document.createElement('video');
      video.src = 'assets/video/vt-45-anos.mp4';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('poster', 'assets/img/og.jpg');
      video.addEventListener('error', () => {
        video.remove();
        poster.hidden = false;
        missing.hidden = false;
      }, { once: true });
      video.addEventListener('loadeddata', () => { poster.hidden = true; }, { once: true });
      vtPlay.closest('.vt__player').prepend(video);
      video.play().catch(() => {});
    });
  }

})();
