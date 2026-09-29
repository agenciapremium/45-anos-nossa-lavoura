import { IconeSair } from '@/components/ui/icones';
import {
  encerrarSessao,
  encerrarTodasAsSessoes,
} from '@/lib/palestras/acoes-de-sessao';

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Identidade de quem está logado, no rodapé do menu, com a saída.
 *
 * A saída continua sendo um POST com Server Action (nunca link `GET`). Isto
 * também vale para "Sair de todos os dispositivos": a casca nova tinha
 * ficado sem porta de entrada para `encerrarTodasAsSessoes`
 * (`lib/palestras/acoes-de-sessao.ts`) quando substituiu a antiga
 * `BarraDaSessao`: regressão de funcionalidade, não decisão de design.
 * Devolvida aqui como ação secundária discreta (link em texto, não botão
 * primário), junto da identidade, para aparecer tanto no menu fixo do
 * desktop quanto na gaveta do celular (`NavegacaoMobile`), que reusa este
 * mesmo componente.
 */
export function IdentidadeDaSessao({
  nome,
  papel,
}: {
  nome: string;
  papel: string;
}) {
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;

  return (
    <div className="flex flex-none flex-col gap-2 border-t border-linha-inversa p-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-pilula bg-acento font-corpo text-corpo-sm font-bold text-texto-forte"
        >
          {iniciaisDe(nome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-corpo text-corpo-sm font-bold text-texto-inverso">
            {primeiro}
          </span>
          <span className="block font-corpo text-[10px] font-bold uppercase tracking-sobrancelha text-lima-600">
            {papel}
          </span>
        </span>
        <form action={encerrarSessao}>
          <button
            type="submit"
            aria-label="Sair do sistema"
            title="Sair do sistema"
            className="inline-flex size-11 flex-none items-center justify-center rounded-controle border border-linha-inversa text-texto-inverso-suave hover:bg-inverso hover:text-texto-inverso"
          >
            <IconeSair className="size-4" />
          </button>
        </form>
      </div>
      <form action={encerrarTodasAsSessoes}>
        <button
          type="submit"
          className="cursor-pointer border-none bg-transparent p-0 font-corpo text-corpo-sm text-texto-inverso-suave underline underline-offset-4 hover:text-texto-inverso"
        >
          Sair de todos os dispositivos
        </button>
      </form>
    </div>
  );
}
