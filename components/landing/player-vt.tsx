'use client';

import { useState } from 'react';

import { Seta } from './seta';

const ARQUIVO_DO_VT = '/assets/video/vt-45-anos.mp4';

/**
 * Player do VT.
 *
 * O arquivo entra em `public/assets/video/vt-45-anos.mp4`. Enquanto ele não
 * existir, o `<video>` dispara `error` e a página volta ao pôster com o aviso
 * — exatamente o que `main.js` fazia criando o elemento à mão.
 */
export function PlayerVt() {
  const [tocando, setTocando] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);
  const [carregou, setCarregou] = useState(false);

  return (
    <div className="vt__player" data-reveal>
      {tocando ? (
        <video
          src={ARQUIVO_DO_VT}
          controls
          playsInline
          preload="auto"
          poster="/assets/img/og.jpg"
          autoPlay
          onLoadedData={() => setCarregou(true)}
          onError={() => {
            setTocando(false);
            setCarregou(false);
            setIndisponivel(true);
          }}
        />
      ) : null}

      <div className="vt__poster" id="vtPoster" hidden={tocando && carregou}>
        <img
          src="/assets/img/pasto-1600.webp"
          alt=""
          width={1600}
          height={1067}
          loading="lazy"
          decoding="async"
        />
        <img
          className="vt__seal"
          src="/assets/img/selo-600.webp"
          alt=""
          width={600}
          height={501}
          loading="lazy"
          decoding="async"
        />
        <button
          className="btn btn--primary vt__play"
          type="button"
          id="vtPlay"
          onClick={() => {
            setIndisponivel(false);
            setTocando(true);
          }}
        >
          Assistir ao filme
          <Seta />
        </button>
      </div>

      <p className="vt__missing" id="vtMissing" hidden={!indisponivel}>
        O filme ainda não está disponível nesta página. Leia abaixo a versão em
        texto.
      </p>
    </div>
  );
}
