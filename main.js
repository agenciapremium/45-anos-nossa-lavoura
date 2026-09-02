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
      const shown = entries.filter(e => e.isIntersecting);
      shown.forEach((e, i) => {
        e.target.style.setProperty('--d', `${Math.min(i, 5) * 60}ms`);
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
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
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased);
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
     Enquanto ele não existir, a página mantém o pôster
     e a versão em texto logo abaixo.
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

  /* ---------------------------------------------------------
     Selo 45 anos em sequência de frames, dirigido pelo scroll
     (mesma técnica de scrub de vídeo do scroll-world:
      a posição do scroll controla o quadro exibido)
     --------------------------------------------------------- */
  const canvas   = $('#seloCanvas');
  const fallback = $('#seloFallback');
  const stage    = $('.fim__stage');

  if (canvas && stage && !reduced) {
    const TOTAL  = 105;
    const mobile = matchMedia('(max-width: 760px)').matches;
    const dir    = mobile ? 'assets/selo/m/' : 'assets/selo/d/';
    const W      = mobile ? 560 : 960;
    const H      = mobile ? 316 : 541;

    canvas.width  = W;
    canvas.height = H;

    const ctx    = canvas.getContext('2d', { alpha: true });
    const frames = new Array(TOTAL);
    let loaded   = 0;
    let ready    = false;
    let current  = -1;
    let queued   = false;

    const src = i => `${dir}${String(i + 1).padStart(3, '0')}.webp`;

    /* Desenha o quadro mais próximo já carregado, para nunca piscar */
    const draw = i => {
      let f = frames[i];
      if (!f || !f.complete || !f.naturalWidth) {
        for (let k = i; k >= 0; k--) {
          if (frames[k] && frames[k].complete && frames[k].naturalWidth) { f = frames[k]; break; }
        }
      }
      if (!f) return;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(f, 0, 0, W, H);
    };

    const progress = () => {
      const r = stage.getBoundingClientRect();
      const span = r.height - innerHeight;
      if (span <= 0) return 1;
      return Math.min(Math.max(-r.top / span, 0), 1);
    };

    const render = () => {
      queued = false;
      if (!ready) return;
      const i = Math.min(TOTAL - 1, Math.round(progress() * (TOTAL - 1)));
      if (i === current) return;
      current = i;
      draw(i);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(render);
    };

    /* Carregamento em blocos, para não competir com o resto da página */
    const CHUNK = 8;
    const loadChunk = start => {
      const end = Math.min(start + CHUNK, TOTAL);
      let pending = end - start;
      if (pending === 0) return;

      const next = () => {
        if (--pending === 0) {
          if (end < TOTAL) loadChunk(end);
          else canvas.dataset.complete = 'true';
        }
      };

      for (let i = start; i < end; i++) {
        const img = new Image();
        img.decoding = 'async';
        frames[i] = img;
        img.addEventListener('load', () => {
          loaded++;
          /* Assim que o primeiro bloco chega, troca o fallback pelo canvas */
          if (!ready && loaded >= CHUNK) {
            ready = true;
            canvas.hidden = false;
            fallback.hidden = true;
            render();
          } else if (ready) {
            current = -1;
            onScroll();
          }
          next();
        }, { once: true });
        img.addEventListener('error', next, { once: true });
        img.src = src(i);
      }
    };

    /* Só começa a baixar quando o fechamento se aproxima */
    const startLoad = () => loadChunk(0);
    if ('IntersectionObserver' in window) {
      const sio = new IntersectionObserver((entries, obs) => {
        if (!entries.some(e => e.isIntersecting)) return;
        obs.disconnect();
        startLoad();
      }, { rootMargin: '150% 0px' });
      sio.observe(stage);
    } else {
      addEventListener('load', startLoad);
    }

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { current = -1; onScroll(); }, { passive: true });
  }
})();
