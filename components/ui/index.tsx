import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

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
        sm: 'text-corpo-sm px-4 py-2 min-h-10',
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
const baseDeCampo =
  'w-full bg-campo text-texto-forte font-corpo text-corpo ' +
  'border-2 border-linha rounded-controle px-3 py-2 min-h-11 ' +
  'placeholder:text-texto-suave ' +
  'focus:border-lima-500 focus:outline-none ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-perigo';

export function Campo({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input data-slot="campo" className={cn(baseDeCampo, className)} {...props} />
  );
}

export function AreaDeTexto({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="area"
      className={cn(baseDeCampo, 'min-h-32 leading-normal', className)}
      {...props}
    />
  );
}

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
   --------------------------------------------------------- */
export function Cartao({
  className,
  elevado = false,
  ...props
}: React.ComponentProps<'div'> & { elevado?: boolean }) {
  return (
    <div
      data-slot="cartao"
      className={cn(
        'bg-cartao text-texto rounded-cartao border-2 border-terra-700 p-5',
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
   --------------------------------------------------------- */
export function Sobrancelha({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-corpo font-bold text-rotulo uppercase ' +
          'tracking-sobrancelha text-lima-700 m-0 mb-4 ' +
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
   Tabela
   --------------------------------------------------------- */
export function Tabela({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto rounded-cartao border-2 border-terra-700 bg-cartao">
      <table
        className={cn('w-full border-collapse text-corpo', className)}
        {...props}
      />
    </div>
  );
}

export function Cabecalho({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('bg-terra-700 text-creme-500 text-left', className)}
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
const variantesDeSelo = cva(
  'inline-flex items-center gap-1 rounded-pilula px-3 py-1 ' +
    'font-corpo font-bold text-corpo-sm leading-none whitespace-nowrap',
  {
    variants: {
      tom: {
        neutro: 'bg-creme-600 text-terra-700',
        positivo: 'bg-sucesso-suave text-sucesso',
        atencao: 'bg-atencao-suave text-atencao',
        negativo: 'bg-perigo-suave text-perigo',
        acento: 'bg-lima-100 text-lima-700',
      },
    },
    defaultVariants: { tom: 'neutro' },
  },
);

export function Selo({
  className,
  tom,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof variantesDeSelo>) {
  return (
    <span className={cn(variantesDeSelo({ tom }), className)} {...props} />
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
