import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * `Gaveta` e `PainelLateral` exigem estado de cliente (abrir/fechar,
 * Esc), então vivem em arquivo próprio (`gaveta.tsx`) com `'use client'`
 * só ali. Reexportados aqui para que `@/components/ui` continue sendo o
 * único lugar de onde a interface importa suas primitivas.
 */
export { Gaveta, PainelLateral } from './gaveta';

/* =========================================================
   Primitivas de interface · design system Nossa Lavoura 45 Anos

   Escritas no padrão do shadcn/ui (composição por `className`, variantes com
   `cva`, `data-slot`), mas com os tokens do design system em vez do tema
   neutro que o shadcn traz de fábrica:

   - elevação é **slab de cor** (`--shadow-slab-*`), nunca blur;
   - a paleta é terra/lima/creme;
   - o octógono é elemento de fundo, nunca forma de contêiner.
   ========================================================= */

/* ---------------------------------------------------------
   Botão
   --------------------------------------------------------- */
const variantesDeBotao = cva(
  'inline-flex items-center justify-center gap-2 font-corpo font-bold uppercase ' +
    'tracking-[0.06em] leading-none whitespace-nowrap cursor-pointer ' +
    'border-2 border-transparent rounded-controle min-h-12 ' +
    'transition-[background-color,color,border-color,transform,box-shadow] duration-150 ' +
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        primario:
          'bg-lima-500 text-terra-900 border-lima-500 hover:bg-lima-600 hover:border-lima-600',
        secundario:
          'bg-terra-700 text-creme-500 border-terra-700 hover:bg-terra-900 hover:border-terra-900',
        claro:
          'bg-creme-500 text-terra-900 border-creme-500 hover:bg-lima-500 hover:border-lima-500',
        contorno:
          'bg-transparent text-terra-700 border-terra-700 hover:bg-terra-700 hover:text-creme-500',
        perigo:
          'bg-perigo text-creme-500 border-perigo hover:brightness-110',
        texto:
          'bg-transparent border-transparent text-terra-700 underline underline-offset-4 hover:text-lima-700 min-h-0',
      },
      tamanho: {
        md: 'text-corpo px-[26px] py-[14px]',
        lg: 'text-corpo-lg px-8 py-[18px] rounded-md',
        // 8.6: 44px é o alvo de toque mínimo do interno (spec
        // `sistema-visual`). `min-h-10` (40px) ficava abaixo; nenhuma tela
        // do convidado ou de check-in usa `tamanho="sm"` (elas já usam o
        // padrão de 48px), então o ajuste só sobe o interno ao mínimo.
        sm: 'text-corpo-sm px-4 py-2 min-h-11',
      },
    },
    defaultVariants: { variante: 'primario', tamanho: 'md' },
  },
);

export type PropsDoBotao = React.ComponentProps<'button'> &
  VariantProps<typeof variantesDeBotao>;

export function Botao({
  className,
  variante,
  tamanho,
  type = 'button',
  ...props
}: PropsDoBotao) {
  return (
    <button
      data-slot="botao"
      type={type}
      className={cn(variantesDeBotao({ variante, tamanho }), className)}
      {...props}
    />
  );
}

export function LinkBotao({
  className,
  variante,
  tamanho,
  ...props
}: React.ComponentProps<'a'> & VariantProps<typeof variantesDeBotao>) {
  return (
    <a
      data-slot="botao"
      className={cn(
        variantesDeBotao({ variante, tamanho }),
        'no-underline',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------
   Campos
   --------------------------------------------------------- */
/*
 * 8.6: `focus:outline-none` tinha precedência (classe + pseudo-classe é
 * mais específico que `:focus-visible` sozinho, em `app/globals.css`) e
 * apagava o anel de foco de TODO campo, textarea e seleção do sistema,
 * para todo mundo que navega por teclado, não só quem clica. A troca de
 * cor da borda continua no clique com o mouse, mas o anel em lima de
 * `:focus-visible` (a mesma regra global usada pelo resto da interface)
 * precisa aparecer para quem tabula.
 */
const baseDeCampo =
  'w-full bg-campo text-texto-forte font-corpo text-corpo ' +
  'border-2 border-linha rounded-controle px-3 py-2 min-h-11 ' +
  'placeholder:text-texto-suave ' +
  'focus:border-lima-500 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-perigo';

export function Campo({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input data-slot="campo" className={cn(baseDeCampo, className)} {...props} />
  );
}

export const AreaDeTexto = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(function AreaDeTexto({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="area"
      className={cn(baseDeCampo, 'min-h-32 leading-normal', className)}
      {...props}
    />
  );
});

export function Selecao({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="selecao"
      className={cn(baseDeCampo, 'appearance-none pr-8', className)}
      {...props}
    />
  );
}

export function Rotulo({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="rotulo"
      className={cn(
        'block font-corpo font-bold text-corpo-sm text-texto-forte mb-1',
        className,
      )}
      {...props}
    />
  );
}

export function Ajuda({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('mt-1 text-corpo-sm text-texto-suave', className)}
      {...props}
    />
  );
}

export function ErroDoCampo({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      className={cn('mt-1 text-corpo-sm font-bold text-perigo', className)}
      {...props}
    />
  );
}

/** Rótulo + campo + ajuda/erro, na ordem em que o leitor precisa. */
export function Grupo({
  rotulo,
  htmlFor,
  ajuda,
  erro,
  obrigatorio,
  children,
  className,
}: {
  rotulo: string;
  htmlFor?: string;
  ajuda?: React.ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4', className)}>
      <Rotulo htmlFor={htmlFor}>
        {rotulo}
        {obrigatorio ? (
          <span className="text-perigo" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </Rotulo>
      {children}
      {erro ? <ErroDoCampo>{erro}</ErroDoCampo> : null}
      {!erro && ajuda ? <Ajuda>{ajuda}</Ajuda> : null}
    </div>
  );
}

/* ---------------------------------------------------------
   Cartão — elevação por slab, não por blur

   Duas superfícies (D4 do design), zero token novo:

   - `marca` (padrão, preserva o visual de hoje): borda de 2px em
     terra-700, para as telas públicas, o ingresso, o PDF e o login.
   - `interna`: borda hairline de 1px, para o painel, a administração e
     os relatórios — a mesa de trabalho, sem laje de cor.
   --------------------------------------------------------- */
const variantesDeCartao = cva('bg-cartao text-texto rounded-cartao p-5', {
  variants: {
    superficie: {
      marca: 'border-2 border-terra-700',
      interna: 'border border-linha',
    },
  },
  defaultVariants: { superficie: 'marca' },
});

export function Cartao({
  className,
  elevado = false,
  superficie,
  ...props
}: React.ComponentProps<'div'> & { elevado?: boolean } & VariantProps<
    typeof variantesDeCartao
  >) {
  return (
    <div
      data-slot="cartao"
      className={cn(
        variantesDeCartao({ superficie }),
        elevado && 'shadow-laje-sm',
        className,
      )}
      {...props}
    />
  );
}

export function TituloDoCartao({
  className,
  ...props
}: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'font-titulo font-bold text-t3 text-texto-forte leading-justo tracking-destaque m-0',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------
   Cabeçalhos de seção

   8.6: a sobrancelha usava `text-lima-700` (3,22:1 sobre branco/creme,
   onde ela sempre aparece) para um texto de 12px em caixa alta, abaixo do
   mínimo de 4,5:1. Trocado por `text-texto-suave` (terra-300, 5,4 a 5,7:1
   nos fundos reais), que também é a cor que o próprio mockup aprovado usa
   para este rótulo (ex.: artboard "Convites").
   --------------------------------------------------------- */
export function Sobrancelha({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-corpo font-bold text-rotulo uppercase ' +
          'tracking-sobrancelha text-texto-suave m-0 mb-4 ' +
          "before:content-[''] before:w-8 before:h-0.5 before:bg-current before:flex-none",
        className,
      )}
      {...props}
    />
  );
}

export function Titulo({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'font-titulo font-bold text-t1 text-texto-forte leading-justo tracking-destaque m-0',
        className,
      )}
      {...props}
    />
  );
}

export function Subtitulo({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'font-titulo font-bold text-t2 text-texto-forte leading-justo tracking-destaque m-0',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------
   Tabela — mesma distinção de superfície do Cartão (D4)
   --------------------------------------------------------- */
const variantesDeMolduraDaTabela = cva('w-full overflow-x-auto rounded-cartao bg-cartao', {
  variants: {
    superficie: {
      marca: 'border-2 border-terra-700',
      interna: 'border border-linha',
    },
  },
  defaultVariants: { superficie: 'marca' },
});

export function Tabela({
  className,
  containerClassName,
  superficie,
  ...props
}: React.ComponentProps<'table'> &
  VariantProps<typeof variantesDeMolduraDaTabela> & {
    containerClassName?: string;
  }) {
  return (
    <div className={cn(variantesDeMolduraDaTabela({ superficie }), containerClassName)}>
      <table
        className={cn('w-full border-collapse text-corpo', className)}
        {...props}
      />
    </div>
  );
}

const variantesDeCabecalho = cva('text-left', {
  variants: {
    superficie: {
      marca: 'bg-terra-700 text-creme-500',
      interna: 'bg-superficie-alt text-texto-suave',
    },
  },
  defaultVariants: { superficie: 'marca' },
});

export function Cabecalho({
  className,
  superficie,
  ...props
}: React.ComponentProps<'thead'> & VariantProps<typeof variantesDeCabecalho>) {
  return (
    <thead
      className={cn(variantesDeCabecalho({ superficie }), className)}
      {...props}
    />
  );
}

export function Celula({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn('px-4 py-3 align-middle border-t border-linha', className)}
      {...props}
    />
  );
}

export function CelulaDeTitulo({
  className,
  ...props
}: React.ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 font-corpo font-bold text-corpo-sm uppercase tracking-rotulo',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------
   Selo de estado
   --------------------------------------------------------- */
/*
 * 8.6: `text-sucesso`, `text-atencao` e `text-lima-700` sobre o próprio
 * fundo suave do tom davam 3.46:1, 2.56:1 e 2.79:1 de contraste,
 * respectivamente (medido com as cores reais de `tokens.css`) — abaixo do
 * mínimo de 4.5:1 para texto pequeno em negrito, que nem chega a "texto
 * grande" para render por WCAG. Trocados por `text-terra-700`, o mesmo
 * texto que o tom `neutro` já usava (12,6:1 nele; acima de 12:1 nos
 * outros três fundos), sem introduzir cor nova: o fundo continua
 * diferenciando o tom, o texto passa a ser sempre legível.
 */
const variantesDeSelo = cva(
  'inline-flex items-center gap-1.5 rounded-pilula px-3 py-1 ' +
    'font-corpo font-bold text-corpo-sm leading-none whitespace-nowrap',
  {
    variants: {
      tom: {
        neutro: 'bg-creme-600 text-terra-700',
        positivo: 'bg-sucesso-suave text-terra-700',
        atencao: 'bg-atencao-suave text-terra-700',
        negativo: 'bg-perigo-suave text-perigo',
        acento: 'bg-lima-100 text-terra-700',
      },
    },
    defaultVariants: { tom: 'neutro' },
  },
);

/** Cor do ponto por tom. Só o ponto usa a cor cheia; o texto é sempre terra. */
const PONTO_DO_TOM: Record<NonNullable<VariantProps<typeof variantesDeSelo>['tom']>, string> = {
  neutro: 'bg-terra-300',
  positivo: 'bg-sucesso',
  atencao: 'bg-atencao',
  negativo: 'bg-perigo',
  acento: 'bg-lima-700',
};

/**
 * Selo de estado: ponto, cor e palavra.
 *
 * A spec `sistema-visual` exige os três juntos, e o ponto é o que dá ao
 * estado um sinal de forma além do fundo colorido. Ele é decorativo
 * (`aria-hidden`): quem usa leitor de tela ouve a palavra, que nunca falta.
 *
 * `ponto={false}` para o caso em que o próprio conteúdo já abre com um
 * ícone, como o selo de "rastro do registro" na auditoria: dois símbolos
 * antes da palavra viram ruído.
 */
export function Selo({
  className,
  tom,
  ponto = true,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof variantesDeSelo> & { ponto?: boolean }) {
  return (
    <span className={cn(variantesDeSelo({ tom }), className)} {...props}>
      {ponto ? (
        <span
          aria-hidden="true"
          className={cn(
            'size-2 flex-none rounded-pilula',
            PONTO_DO_TOM[tom ?? 'neutro'],
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------
   Aviso
   --------------------------------------------------------- */
const variantesDeAviso = cva(
  'rounded-cartao border-2 p-4 text-corpo [&_p]:m-0 [&_p+p]:mt-2',
  {
    variants: {
      tom: {
        informacao: 'bg-info-suave border-terra-500 text-terra-700',
        sucesso: 'bg-sucesso-suave border-sucesso text-terra-900',
        atencao: 'bg-atencao-suave border-atencao text-terra-900',
        erro: 'bg-perigo-suave border-perigo text-terra-900',
      },
    },
    defaultVariants: { tom: 'informacao' },
  },
);

export function Aviso({
  className,
  tom,
  titulo,
  children,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof variantesDeAviso> & { titulo?: string }) {
  return (
    <div
      role={tom === 'erro' ? 'alert' : 'status'}
      className={cn(variantesDeAviso({ tom }), className)}
      {...props}
    >
      {titulo ? (
        <p className="font-bold font-corpo mb-1">{titulo}</p>
      ) : null}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------
   Estado vazio
   --------------------------------------------------------- */
export function Vazio({
  titulo,
  children,
}: {
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-cartao border-2 border-dashed border-linha bg-superficie-alt p-8 text-center">
      <p className="font-titulo font-bold text-t3 text-texto-forte m-0">
        {titulo}
      </p>
      {children ? (
        <div className="mt-2 text-corpo text-texto-suave">{children}</div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------
   Abas segmentadas — links, não botões de estado (D7)

   O estado vive na URL: cada aba é um `<a>` com `aria-selected`, então a
   tela abre certa antes do script carregar e o botão voltar funciona. Usado
   nos métodos de acesso e nos níveis da estrutura organizacional.
   --------------------------------------------------------- */
export function AbasSegmentadas({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-controle bg-superficie-alt p-1',
        className,
      )}
      {...props}
    />
  );
}

export function AbaSegmentada({
  className,
  ativo = false,
  ...props
}: React.ComponentProps<'a'> & { ativo?: boolean }) {
  return (
    <a
      role="tab"
      aria-selected={ativo}
      className={cn(
        'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-controle px-4 font-corpo text-corpo-sm font-bold no-underline transition-colors',
        ativo
          ? 'bg-cartao text-texto-forte shadow-suave'
          : 'text-texto-suave hover:text-texto-forte',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------
   Medidor — indicador com barra de progresso
   --------------------------------------------------------- */
export function Medidor({
  rotulo,
  valor,
  descricao,
  percentual,
  className,
}: {
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  descricao?: React.ReactNode;
  /** De 0 a 100. Omitido, a barra não aparece. */
  percentual?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-cartao border border-linha bg-cartao p-4', className)}>
      <p className="m-0 font-corpo text-corpo-sm text-texto-suave">{rotulo}</p>
      <p className="m-0 mt-1 font-corpo text-t2 font-bold leading-none text-texto-forte">
        {valor}
      </p>
      {descricao ? (
        <p className="m-0 mt-2 font-corpo text-corpo-sm text-texto-suave">
          {descricao}
        </p>
      ) : null}
      {percentual !== undefined ? (
        <div className="mt-3 h-2 overflow-hidden rounded-pilula bg-lima-100">
          <div
            className="h-2 rounded-pilula bg-lima-700"
            style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------
   Chip de filtro com contagem

   8.6: o estado ativo usava `text-lima-700` sobre `bg-lima-100` (2,79:1) e
   a contagem usava `text-creme-500` sobre `bg-lima-700` (3,06:1) — os dois
   abaixo do mínimo de 4,5:1. Trocados por `text-terra-700`/`text-terra-900`
   (via `text-texto-forte`), que passam de 5:1 nos dois fundos, sem cor
   nova: quem diferencia o chip ativo continua sendo a borda e o fundo em
   lima, só o texto deixou de ser a parte frágil.
   --------------------------------------------------------- */
export function ChipDeFiltro({
  className,
  ativo = false,
  contagem,
  children,
  ...props
}: React.ComponentProps<'button'> & { ativo?: boolean; contagem?: number }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-pilula border px-3 font-corpo text-corpo-sm font-bold transition-colors',
        ativo
          ? 'border-lima-700 bg-lima-100 text-terra-700'
          : 'border-linha bg-cartao text-texto-suave hover:border-linha-forte hover:text-texto-forte',
        className,
      )}
      {...props}
    >
      {children}
      {contagem !== undefined ? (
        <span
          className={cn(
            'inline-flex min-w-5 items-center justify-center rounded-pilula px-1.5 text-corpo-sm font-bold',
            ativo
              ? 'bg-lima-700 text-texto-forte'
              : 'bg-superficie-alt text-texto-suave',
          )}
        >
          {contagem}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------
   Linha do tempo — histórico do convite
   --------------------------------------------------------- */
export type PassoDaLinhaDoTempo = {
  titulo: string;
  data?: string;
  descricao?: string;
  concluido?: boolean;
};

export function LinhaDoTempo({
  passos,
  className,
}: {
  passos: PassoDaLinhaDoTempo[];
  className?: string;
}) {
  return (
    <ol className={cn('m-0 list-none p-0', className)}>
      {passos.map((passo, indice) => (
        <li key={`${passo.titulo}-${indice}`} className="relative flex gap-3 pb-6 last:pb-0">
          {indice < passos.length - 1 ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-[7px] top-4 h-full w-px',
                passo.concluido ? 'bg-lima-700' : 'bg-linha',
              )}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              'relative mt-1 size-3.5 flex-none rounded-pilula border-2',
              passo.concluido
                ? 'border-lima-700 bg-lima-700'
                : 'border-linha bg-cartao',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="m-0 font-corpo text-corpo font-bold text-texto-forte">
                {passo.titulo}
              </p>
              {passo.data ? (
                <p className="m-0 font-corpo text-corpo-sm text-texto-suave">
                  {passo.data}
                </p>
              ) : null}
            </div>
            {passo.descricao ? (
              <p className="m-0 mt-1 font-corpo text-corpo-sm text-texto-suave">
                {passo.descricao}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
