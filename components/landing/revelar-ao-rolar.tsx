'use client';

import { useEffect } from 'react';

/**
 * Porta para React os dois primeiros blocos de `main.js`: o reveal na
 * rolagem e a contagem dos números da trajetória.
 *
 * Continua varrendo `[data-reveal]` e `[data-count]` do documento, em vez de
 * envolver cada elemento em um componente. É de propósito: assim a marcação
 * das seções segue idêntica à da versão estática — mesma classe, mesmo
 * atributo, mesmo CSS — e o escalonamento por grupo (`--d`), que depende da
 * ordem em que os elementos entram na viewport juntos, se comporta igual.
 */
export function RevelarAoRolar() {
  useEffect(() => {
    const reduzido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const reveláveis = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]'),
    );
    const contadores = Array.from(
      document.querySelectorAll<HTMLElement>('[data-count]'),
    );

    const observadores: IntersectionObserver[] = [];
    let quadro = 0;

    /* ---------------- reveal ---------------- */
    if (reduzido || !('IntersectionObserver' in window)) {
      reveláveis.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entradas, obs) => {
          entradas
            .filter((e) => e.isIntersecting)
            .forEach((e, i) => {
              (e.target as HTMLElement).style.setProperty(
                '--d',
                `${Math.min(i, 5) * 60}ms`,
              );
              e.target.classList.add('is-in');
              obs.unobserve(e.target);
            });
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
      );
      reveláveis.forEach((el) => io.observe(el));
      observadores.push(io);
    }

    /* ---------------- contagem dos números ---------------- */
    const contar = (el: HTMLElement) => {
      const alvo = Number(el.dataset.count);
      const prefixo = el.dataset.prefix ?? '';
      if (reduzido) {
        el.textContent = prefixo + alvo;
        return;
      }
      const duracao = 1400;
      const t0 = performance.now();
      const passo = (agora: number) => {
        const p = Math.min((agora - t0) / duracao, 1);
        el.textContent = prefixo + Math.round(alvo * (1 - Math.pow(1 - p, 3)));
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    };

    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver(
        (entradas, obs) => {
          entradas.forEach((e) => {
            if (!e.isIntersecting) return;
            contar(e.target as HTMLElement);
            obs.unobserve(e.target);
          });
        },
        { threshold: 0.5 },
      );
      contadores.forEach((el) => cio.observe(el));
      observadores.push(cio);
    } else {
      contadores.forEach(contar);
    }

    return () => {
      observadores.forEach((o) => o.disconnect());
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return null;
}
