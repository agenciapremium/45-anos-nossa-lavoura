import {
  encerrarSessao,
  encerrarTodasAsSessoes,
} from '@/lib/palestras/acoes-de-sessao';

/**
 * Quem está logado e como sair.
 *
 * Fica no cabeçalho de toda tela autenticada. Os dois botões são
 * formulários com Server Action — POST, verificado contra a origem pelo
 * próprio Next. Sair por link `GET` seria disparável por um `<img>` numa
 * página de terceiro.
 */
export function BarraDaSessao({
  nome,
  papel,
}: {
  nome: string;
  papel: string;
}) {
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="m-0 font-corpo text-corpo-sm font-bold text-creme-500">
          {primeiro}
        </p>
        <p className="m-0 font-corpo text-rotulo uppercase tracking-sobrancelha text-lima-500">
          {papel}
        </p>
      </div>
      <form action={encerrarSessao}>
        <button
          type="submit"
          className="cursor-pointer rounded-controle border-2 border-creme-500 bg-transparent px-3 py-2 font-corpo text-corpo-sm font-bold uppercase tracking-[0.06em] text-creme-500 hover:bg-creme-500 hover:text-terra-900"
        >
          Sair
        </button>
      </form>
      <form action={encerrarTodasAsSessoes} className="hidden md:block">
        <button
          type="submit"
          title="Encerra a sessão em todos os navegadores e celulares"
          className="cursor-pointer border-none bg-transparent p-0 font-corpo text-corpo-sm text-lima-300 underline underline-offset-4 hover:text-lima-500"
        >
          Sair de todos
        </button>
      </form>
    </div>
  );
}
