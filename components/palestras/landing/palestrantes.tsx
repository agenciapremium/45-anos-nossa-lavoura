import { PALESTRANTES, type Palestrante } from '@/lib/palestras/conteudo-da-landing';
import { cn } from '@/lib/utils';

import estilo from './landing.module.css';

/** Bloco 2, dos slides 02 a 05: uma laje lima por palestrante. */
export function Palestrantes() {
  return (
    <section id="palestrantes" aria-labelledby="titulo-palestrantes">
      <div className={estilo.introPalestrantes}>
        <div className={estilo.miolo}>
          <p className={estilo.sobrancelha}>Quem sobe ao palco</p>
          <h2 id="titulo-palestrantes">
            <span className={estilo.forte}>Conheça os palestrantes</span>
            <span className={estilo.leve}>Duas palestras técnicas, direto ao ponto.</span>
          </h2>
        </div>
      </div>

      {PALESTRANTES.map((p, i) => (
        <LajeDoPalestrante key={p.id} palestrante={p} invertido={i % 2 === 1} />
      ))}
    </section>
  );
}

function LajeDoPalestrante({
  palestrante: p,
  invertido,
}: {
  palestrante: Palestrante;
  invertido: boolean;
}) {
  const idDoNome = `nome-${p.id}`;
  return (
    <article
      className={cn(estilo.palestrante, invertido && estilo.invertido)}
      aria-labelledby={idDoNome}
    >
      <div className={cn(estilo.miolo, estilo.palestranteGrade)}>
        <div className={estilo.foto}>
          {/* Mesma imagem, ampliada e esmaecida: decorativa (D3). */}
          <img
            className={estilo.fantasma}
            src={p.foto.src}
            alt=""
            aria-hidden="true"
            width={p.foto.largura}
            height={p.foto.altura}
            loading="lazy"
            decoding="async"
          />
          <img
            className={estilo.recorte}
            src={p.foto.src}
            alt={p.foto.alt}
            width={p.foto.largura}
            height={p.foto.altura}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className={estilo.palestranteTexto}>
          <h3 className={estilo.nome} id={idDoNome}>
            <span className={estilo.forte}>{p.nome}</span>
            <span className={estilo.leve}>{p.sobrenome}</span>
          </h3>
          <ul className={estilo.credenciais}>
            {p.credenciais.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className={estilo.etiqueta}>Palestra:</p>
          <p className={cn(estilo.forte, estilo.tema)}>{p.tema}</p>
        </div>
      </div>
    </article>
  );
}
