import { SeloDoCircuito } from '@/components/palestras/selo';
import { textosDeConsentimento } from '@/lib/palestras/configuracao';
import {
  formatarData,
  formatarDataPorExtenso,
  formatarHorario,
} from '@/lib/tempo';
import { cn } from '@/lib/utils';

/* =========================================================
   Casca das páginas públicas do circuito

   Mobile first de verdade: quem abre isto é um produtor rural, no celular,
   com internet ruim, a partir de um link recebido no WhatsApp. Nada de
   coluna lateral, nada de tabela, nada que dependa de largura. Alvos de
   toque grandes, contraste alto e o selo do circuito no topo, para a
   página parecer o convite que a pessoa recebeu.
   ========================================================= */

/** Topo com o selo. Nunca recortado nem distorcido — traz Virbac e Supremax. */
export function TopoPublico({
  sobrancelha = 'Acelera no Campo 3.0',
  titulo,
  children,
}: {
  sobrancelha?: string;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-inverso-fundo text-creme-500">
      <div className="mx-auto flex w-full max-w-prosa flex-col items-center gap-4 px-[var(--gutter-page)] py-8 text-center sm:py-12">
        <SeloDoCircuito tamanho={132} />
        <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
          {sobrancelha}
        </p>
        <h1 className="m-0 font-titulo text-t1 font-bold leading-justo tracking-destaque text-creme-500 text-balance">
          {titulo}
        </h1>
        {children}
      </div>
    </header>
  );
}

/**
 * Rodapé exigido pela spec `consentimento-lgpd`: link da política e canal
 * do encarregado de dados, em todas as páginas públicas do módulo.
 *
 * Assíncrono porque os dois valores vêm de configuração — a mesma que o
 * formulário usa, para não existirem dois endereços de DPO no produto.
 */
export async function RodapePublico({
  className,
}: {
  className?: string;
}) {
  const textos = await textosDeConsentimento();

  return (
    <footer
      className={cn(
        'mt-auto border-t-2 border-terra-700 bg-inverso-fundo text-texto-inverso-suave',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-prosa flex-col gap-3 px-[var(--gutter-page)] py-8 text-center font-corpo text-corpo-sm">
        <p className="m-0">
          <a
            href={textos.urlDaPolitica}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-creme-500 underline underline-offset-4"
          >
            Política de Privacidade
          </a>
        </p>
        <p className="m-0">
          Dúvidas sobre seus dados, pedidos de acesso, correção ou exclusão:{' '}
          <a
            href={`mailto:${textos.emailDoEncarregado}`}
            className="font-bold text-creme-500 underline underline-offset-4"
          >
            {textos.emailDoEncarregado}
          </a>
          , o encarregado de dados do Grupo Axia Agro.
        </p>
        <p className="m-0">
          <a
            href="/"
            className="font-bold text-creme-500 underline underline-offset-4"
          >
            Nossa Lavoura 45 anos
          </a>
        </p>
        <p className="m-0 text-texto-inverso-suave">
          Nossa Lavoura, amiga de quem planta, cria e produz
        </p>
      </div>
    </footer>
  );
}

/** Conteúdo em coluna única, com a medida de leitura do design system. */
export function ColunaPublica({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={cn('flex-1', className)}>
      <div className="mx-auto w-full max-w-prosa px-[var(--gutter-page)] py-8 sm:py-12">
        {children}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------
   Dados da palestra
   --------------------------------------------------------- */

export type PalestraNaTela = {
  cidade: string;
  dataHora: Date;
  localNome: string;
  localEndereco: string;
  prazoConfirmacao: Date;
};

/**
 * O bloco que responde "onde e quando".
 *
 * É a primeira coisa que a pessoa procura, então vem antes do formulário e
 * antes do QR — e repete a data por extenso, porque `15/10` sozinho já fez
 * gente aparecer no dia errado.
 */
export function DadosDaPalestra({
  palestra,
  comPrazo = false,
  className,
}: {
  palestra: PalestraNaTela;
  comPrazo?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-cartao border-2 border-terra-700 bg-cartao p-5',
        className,
      )}
    >
      <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-700">
        {formatarData(palestra.dataHora)} · {formatarHorario(palestra.dataHora)}
      </p>
      <p className="mt-2 mb-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte">
        {palestra.cidade}
      </p>
      <p className="mt-1 mb-3 font-corpo text-corpo-sm text-texto-suave">
        {formatarDataPorExtenso(palestra.dataHora)}
      </p>
      <p className="m-0 font-corpo text-corpo-lg font-bold text-texto-forte">
        {palestra.localNome}
      </p>
      <p className="m-0 mt-1 font-corpo text-corpo text-texto">
        {palestra.localEndereco}
      </p>
      {comPrazo ? (
        <p className="mt-4 mb-0 border-l-4 border-linha-acento pl-4 font-corpo text-corpo-sm text-texto">
          Confirme até{' '}
          <strong className="font-bold text-texto-forte">
            {formatarData(palestra.prazoConfirmacao)} às{' '}
            {formatarHorario(palestra.prazoConfirmacao)}
          </strong>
          .
        </p>
      ) : null}
    </div>
  );
}
