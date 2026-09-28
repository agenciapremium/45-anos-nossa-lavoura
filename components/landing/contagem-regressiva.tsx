'use client';

import { useEffect, useState } from 'react';

/** 19/10/2026, 00h00 em Porto Velho — o mesmo instante do `data-target`. */
const ALVO = new Date('2026-10-19T00:00:00-04:00').getTime();

const pad = (n: number) => String(n).padStart(2, '0');

type Restante = { d: string; h: string; m: string; s: string } | null;

function calcular(): Restante {
  const diff = ALVO - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    d: pad(Math.floor(s / 86400)),
    h: pad(Math.floor(s / 3600) % 24),
    m: pad(Math.floor(s / 60) % 60),
    s: pad(s % 60),
  };
}

/**
 * Contagem regressiva para a semana de aniversário.
 *
 * Fica escondida na primeira renderização (`hidden`, como o HTML original) e
 * só aparece no cliente: o servidor não tem como saber o segundo em que a
 * página vai ser lida, e renderizar um valor no HTML causaria divergência de
 * hidratação a cada acesso.
 */
export function ContagemRegressiva() {
  const [restante, setRestante] = useState<Restante>(null);

  useEffect(() => {
    setRestante(calcular());
    const id = setInterval(() => setRestante(calcular()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cd" id="cd" hidden={restante === null}>
      <div>
        <b data-cd="d">{restante?.d ?? '00'}</b>
        <span>dias</span>
      </div>
      <div>
        <b data-cd="h">{restante?.h ?? '00'}</b>
        <span>horas</span>
      </div>
      <div>
        <b data-cd="m">{restante?.m ?? '00'}</b>
        <span>min</span>
      </div>
      <div>
        <b data-cd="s">{restante?.s ?? '00'}</b>
        <span>seg</span>
      </div>
    </div>
  );
}
