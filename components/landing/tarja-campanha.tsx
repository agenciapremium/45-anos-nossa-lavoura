'use client';

import { useEffect, useState } from 'react';

/** A tarja entra no ar a partir de 12/10/2026, 00h00 em Porto Velho. */
const A_PARTIR_DE = new Date('2026-10-12T00:00:00-04:00').getTime();

/**
 * Tarja de campanha. Como a decisão depende do relógio de quem acessa, ela
 * fica escondida no HTML e só é revelada no cliente — igual à versão
 * estática, que também partia de `hidden`.
 */
export function TarjaCampanha() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (Date.now() >= A_PARTIR_DE) setVisivel(true);
  }, []);

  return (
    <div className="tarja" id="tarja" hidden={!visivel}>
      <div className="wrap tarja__in">
        <p>
          <b>Semana de aniversário:</b> 19 a 24 de outubro, em todas as lojas.
        </p>
        <a href="#semana">Ver as ofertas</a>
      </div>
    </div>
  );
}
