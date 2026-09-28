import { cn } from '@/lib/utils';

export const SELO_DO_CIRCUITO = '/assets/img/selo_circuito_acelera_no_campo.webp';

/**
 * Selo do Circuito Acelera no Campo 3.0.
 *
 * **Nunca recortar nem distorcer.** O selo carrega as marcas Virbac e
 * Supremax, que são dos patrocinadores — por isso a proporção é sempre 1:1,
 * o `object-fit` é `contain` e não existe variante "só o símbolo". Pelo
 * mesmo motivo ele não serve de favicon: em 32px as marcas somem. O favicon
 * continua sendo o selo dos 45 anos (D1b do design).
 */
export function SeloDoCircuito({
  tamanho = 120,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <img
      src={SELO_DO_CIRCUITO}
      alt="Selo do Circuito de Palestras Acelera no Campo 3.0, com as marcas Virbac e Supremax"
      width={tamanho}
      height={tamanho}
      className={cn('block object-contain', className)}
      style={{ width: tamanho, height: tamanho }}
      decoding="async"
    />
  );
}

/** Cabeçalho discreto das telas internas. */
export function CabecalhoDoCircuito({
  titulo,
  children,
}: {
  titulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b-2 border-terra-700 bg-inverso text-creme-500">
      <div className="mx-auto flex w-full max-w-conteudo items-center gap-4 px-[var(--gutter-page)] py-4">
        <SeloDoCircuito tamanho={56} className="flex-none" />
        <div className="min-w-0 flex-1">
          <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
            Acelera no Campo 3.0
          </p>
          {titulo ? (
            <p className="m-0 truncate font-titulo text-t3 font-bold text-creme-500">
              {titulo}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}
