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

  /* =========================================================
     O SELO COMO FUNDO DA PÁGINA

     Um canvas fixo atrás de todo o conteúdo. A posição da
     rolagem escolhe o quadro, então o selo se monta ao longo
     da leitura e chega inteiro na assinatura. O elemento não
     se move — só o desenho muda, então não há parallax.

     Mobile recebe a sequência de 380px: 17 MB de bitmap
     decodificado em vez dos 49 MB da versão desktop.
     ========================================================= */
  const canvas = $('#seloBg');
  const still  = $('#seloBgStill');
  const hero   = $('.hero');
  const footer = $('.ft');

  if (canvas && hero && footer) {
    if (reduced) {
      /* Sem scrub: fica o quadro final, parado. */
      still.hidden = false;
    } else {
      const TOTAL  = 53;
      const mobile = matchMedia('(max-width: 760px)').matches;
      const dir    = mobile ? 'assets/selo/bg-m/' : 'assets/selo/bg-d/';
      const W      = mobile ? 380 : 640;
      const H      = mobile ? 214 : 361;

      canvas.width  = W;
      canvas.height = H;

      const ctx    = canvas.getContext('2d', { alpha: true });
      const frames = new Array(TOTAL);
      let loaded  = 0;
      let ready   = false;
      let current = -1;
      let queued  = false;
      let from = 0, span = 1;

      const src = i => `${dir}${String(i + 1).padStart(3, '0')}.webp`;

      /* O selo começa a se montar no fim do hero e fica inteiro
         quando a assinatura entra em cena, antes do rodapé. */
      const measure = () => {
        from = hero.offsetHeight * 0.6;
        const to = footer.offsetTop - innerHeight * 0.6;
        span = Math.max(to - from, 1);
      };

      const progress = () => Math.min(Math.max((scrollY - from) / span, 0), 1);

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

      /* Carregamento em blocos, para não competir com o hero */
      const CHUNK = 6;
      const loadChunk = start => {
        const end = Math.min(start + CHUNK, TOTAL);
        let pending = end - start;
        if (pending === 0) return;

        const next = () => {
          if (--pending > 0) return;
          if (end < TOTAL) loadChunk(end);
          else canvas.dataset.complete = 'true';
        };

        for (let i = start; i < end; i++) {
          const img = new Image();
          img.decoding = 'async';
          frames[i] = img;
          img.addEventListener('load', () => {
            loaded++;
            if (!ready && loaded >= CHUNK) {
              ready = true;
              canvas.hidden = false;
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

      measure();
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', () => { measure(); current = -1; onScroll(); }, { passive: true });

      /* Só depois que a página carregou: o hero tem prioridade. */
      if (document.readyState === 'complete') loadChunk(0);
      else addEventListener('load', () => loadChunk(0), { once: true });
    }
  }
})();
