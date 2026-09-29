import { SeloDoCircuito } from '@/components/palestras/selo';
import { PALESTRANTES } from '@/lib/palestras/conteudo-da-landing';
import { cn } from '@/lib/utils';

import estilo from './landing.module.css';
import { Pilula } from './pilula';

/**
 * Bloco 1, do slide 01 do carrossel: pasto em curva com borda lima e o
 * selo sobreposto, com o texto centralizado abaixo.
 */
export function Abertura({ cidades }: { cidades: number }) {
  return (
    <header className={estilo.abertura}>
      <div className={estilo.pasto} aria-hidden="true">
        <img
          src="/assets/img/pasto-circuito-1400.webp"
          srcSet="/assets/img/pasto-circuito-800.webp 800w, /assets/img/pasto-circuito-1400.webp 1400w"
          sizes="(min-width: 1260px) 980px, 78vw"
          alt=""
          width={1400}
          height={933}
          fetchPriority="high"
        />
      </div>

      <div className={cn(estilo.miolo, estilo.aberturaTexto)}>
        <div className={estilo.selo}>
          <SeloDoCircuito tamanho={288} />
        </div>
        <p className={estilo.sobrancelha}>
          Circuito de Palestras · Outubro de 2026 · Rondônia
        </p>
        <h1 className={cn(estilo.forte, estilo.titulo)}>Acelera no Campo 3.0</h1>
        <p className={cn(estilo.leve, estilo.subtitulo)}>
          Conhecimento para acelerar os resultados no campo.
        </p>

        <ul className={estilo.fatos} aria-label="Resumo do circuito">
          {cidades > 0 ? (
            <li>
              {cidades} {cidades === 1 ? 'cidade' : 'cidades'}
            </li>
          ) : null}
          <li>{PALESTRANTES.length} palestrantes</li>
          <li>Entrada gratuita</li>
        </ul>

        <div className={estilo.acoes}>
          <Pilula href="#palestrantes" paraBaixo>
            Conheça os palestrantes
          </Pilula>
          <a className={estilo.link} href="#onde-e-quando">
            Ver cidades e datas
          </a>
        </div>
      </div>
    </header>
  );
}
