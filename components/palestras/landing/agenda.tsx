import { urlDoMapa } from '@/lib/palestras/conteudo-da-landing';
import {
  formatarDiaDaSemana,
  formatarHorarioCurto,
  partesDaData,
} from '@/lib/tempo';
import { cn } from '@/lib/utils';

import estilo from './landing.module.css';

type PalestraDaAgenda = {
  id: string;
  cidade: string;
  dataHora: Date;
  localNome: string;
  localEndereco: string;
};

/**
 * Bloco 3, do slide 06: "Onde e quando". Um cartão por palestra ativa, na
 * ordem em que o banco devolve (por data). Sem palestra ativa, o bloco
 * diz que as datas ainda vão ser anunciadas e o resto da página segue.
 */
export function Agenda({ palestras }: { palestras: PalestraDaAgenda[] }) {
  return (
    <section className={estilo.agenda} id="onde-e-quando" aria-labelledby="titulo-agenda">
      <div className={estilo.miolo}>
        <h2 id="titulo-agenda">
          <span className={estilo.forte}>Onde</span>{' '}
          <span className={estilo.leve}>e</span>{' '}
          <span className={estilo.forte}>quando</span>
        </h2>

        {palestras.length === 0 ? (
          <p className={estilo.vazio}>
            As datas ainda vão ser anunciadas. Assim que o calendário for
            publicado, as cidades, os horários e os locais aparecem aqui.
          </p>
        ) : (
          <ol className={estilo.paradas}>
            {palestras.map((p) => (
              <Parada key={p.id} palestra={p} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Parada({ palestra: p }: { palestra: PalestraDaAgenda }) {
  const { dia, mes } = partesDaData(p.dataHora);
  return (
    <li className={estilo.parada}>
      <h3 className={estilo.cidade}>{p.cidade}</h3>
      <div className={estilo.paradaCorpo}>
        <div className={estilo.quando}>
          <IconeCalendario />
          <p>
            <span className={estilo.diaDaSemana}>{formatarDiaDaSemana(p.dataHora)}</span>
            <span className={estilo.data}>
              <b>{dia}</b> de <b>{mes}</b>
            </span>
          </p>
        </div>

        <div className={estilo.onde}>
          <div className={estilo.linhaIcone}>
            <IconeLocal />
            <div>
              <p className={estilo.local}>{p.localNome}</p>
              <p className={estilo.endereco}>{p.localEndereco}</p>
              <a
                className={estilo.mapa}
                href={urlDoMapa(p)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no mapa
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </div>
          <div className={estilo.linhaIcone}>
            <IconeRelogio />
            <p className={cn(estilo.hora)}>
              Às <b>{formatarHorarioCurto(p.dataHora)}</b>
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function IconeCalendario() {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <path fill="currentColor" d="M10 16h36a3 3 0 0 1 3 3v6H7v-6a3 3 0 0 1 3-3Z" />
      <rect x="15" y="11" width="4" height="9" rx="2" fill="currentColor" />
      <rect x="37" y="11" width="4" height="9" rx="2" fill="currentColor" />
      <path
        fill="currentColor"
        d="M7 28h42l-4 15a4 4 0 0 1-3.9 3H6.5a2 2 0 0 1-1.9-2.6L7 28Z"
      />
      <path fill="currentColor" opacity=".55" d="M11 47h34a2 2 0 0 1 0 4H9.5a2 2 0 0 1 1.5-4Z" />
    </svg>
  );
}

function IconeLocal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a8 8 0 0 0-8 8c0 5.6 6.6 11.3 7.3 11.9a1 1 0 0 0 1.4 0C13.4 21.3 20 15.6 20 10a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
      />
    </svg>
  );
}

function IconeRelogio() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M12 6.5V12l3.5 2.5"
        stroke="var(--terra-700)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
