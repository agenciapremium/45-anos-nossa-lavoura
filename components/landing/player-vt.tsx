'use client';

import { useState } from 'react';

import { Seta } from './seta';

/** `VT EMOCIONAL - 45 ANOS NOSSA LAVOURA`, no canal Nossa Lavoura. */
export const ID_DO_VT = 'Bk8XulkNC14';

export const URL_DO_VT = `https://youtu.be/${ID_DO_VT}`;

/*
   `youtube-nocookie.com`, e não `youtube.com`.

   O domínio sem cookie não grava nada no navegador de quem só assistiu, e
   a página não pede consentimento nenhum para rodar o filme. Numa landing
   que já leva o canal do encarregado de dados no rodapé, cobrar um aceite
   para ver um VT institucional seria desproporcional.

   `autoplay=1` só vale porque o iframe nasce depois do clique: é o próprio
   gesto da pessoa que inicia o vídeo, não um autoplay de carregamento.
*/
const EMBED = `https://www.youtube-nocookie.com/embed/${ID_DO_VT}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

/**
 * Player do VT.
 *
 * O iframe só entra na página **depois do clique** (click-to-play). Antes
 * disso não há requisição nenhuma ao YouTube: o que aparece é o pôster da
 * própria landing, servido daqui. Isso vale pelos três motivos de sempre —
 * nada de terceiro carrega sem a pessoa pedir, o peso inicial da página não
 * cresce, e o desenho do pôster com o selo continua sendo o que ela vê
 * primeiro.
 *
 * Antes isto apontava para `/assets/video/vt-45-anos.mp4`, um arquivo que
 * nunca chegou a existir na pasta: o `<video>` disparava `error` e a tela
 * caía no aviso de "filme ainda não disponível". Com o VT publicado no
 * canal, o player passa a tocar de verdade.
 */
export function PlayerVt() {
  const [tocando, setTocando] = useState(false);

  return (
    <div className="vt__player" data-reveal>
      {tocando ? (
        <iframe
          src={EMBED}
          title="VT dos 45 anos da Nossa Lavoura"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <div className="vt__poster" id="vtPoster">
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
            onClick={() => setTocando(true)}
          >
            Assistir ao filme
            <Seta />
          </button>
        </div>
      )}
    </div>
  );
}
