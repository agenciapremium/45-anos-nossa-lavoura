import { PROMOCAO } from '@/lib/palestras/conteudo-da-landing';
import { cn } from '@/lib/utils';

import estilo from './landing.module.css';
import { Pilula } from './pilula';

/**
 * Blocos 4 e 5, do slide 07: como garantir a presença e a promoção do
 * trator.
 *
 * Esta página NÃO confirma presença. A confirmação acontece só pelo link
 * pessoal que o colaborador envia, e é isso que amarra cada convite a uma
 * pessoa. Nenhum formulário aqui (spec `landing-do-circuito`).
 */
export function Presenca() {
  return (
    <section className={estilo.presenca} aria-labelledby="titulo-presenca">
      <div className={estilo.miolo}>
        <h2 id="titulo-presenca" className={estilo.forte}>
          Garanta sua presença:
        </h2>
        <p className={estilo.lead}>
          A vaga é confirmada pelo link pessoal que você recebe de um
          colaborador da Nossa Lavoura.
        </p>

        <ol className={estilo.passos}>
          <li className={estilo.passo}>
            <h3>Receba seu link</h3>
            <p>Um colaborador da Nossa Lavoura envia o seu convite pelo WhatsApp.</p>
          </li>
          <li className={estilo.passo}>
            <h3>Confirme pelo link</h3>
            <p>Cada link vale para você e um acompanhante.</p>
          </li>
          <li className={estilo.passo}>
            <h3>Mostre o ingresso</h3>
            <p>No dia, apresente o ingresso na entrada, direto do celular.</p>
          </li>
        </ol>

        <div className={estilo.nota}>
          <p>
            Ainda não recebeu o seu?{' '}
            <strong>Fale com o consultor da loja Nossa Lavoura mais próxima.</strong>
          </p>
          <Pilula href="/palestras/ingresso">Já confirmei · ver meu ingresso</Pilula>
        </div>

        <Promocao />
      </div>
    </section>
  );
}

function Promocao() {
  return (
    <>
      <div className={estilo.promo}>
        <img
          className={estilo.trator}
          src={PROMOCAO.trator.src}
          alt={PROMOCAO.trator.alt}
          width={PROMOCAO.trator.largura}
          height={PROMOCAO.trator.altura}
          loading="lazy"
          decoding="async"
        />
        <div className={estilo.promoTexto}>
          <p>{PROMOCAO.chamada}</p>
          <p className={cn(estilo.forte, estilo.premio)}>{PROMOCAO.premio}</p>
        </div>
      </div>

      <p className={estilo.bordao}>
        {PROMOCAO.bordao.map((linha) => (
          <span key={linha}>{linha}</span>
        ))}
      </p>
      <p className={estilo.legal}>{PROMOCAO.textoLegal}</p>
    </>
  );
}
