import type { Metadata } from 'next';

import { CabecalhoDoCircuito } from '@/components/palestras/selo';
import { BarraDaSessao } from '@/components/palestras/barra-da-sessao';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import { exigirPapel } from '@/lib/palestras/sessao';
import { agora, formatarData, formatarHorario, mesmoDiaCivil } from '@/lib/tempo';

import { TelaDeCheckin } from './tela';

export const metadata: Metadata = {
  title: 'Check-in',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * `/palestras/checkin` — Recepção e Admin (task 2.1).
 *
 * O middleware já restringe o prefixo a `admin`/`recepcao`; `exigirPapel`
 * repete a checagem no servidor (a segunda camada da autorização, D4 de
 * `auth-e-papeis`) e é o que devolve o escopo que as Server Actions usam.
 */
export default async function PaginaDeCheckin() {
  const atual = await exigirPapel(['admin', 'recepcao']);

  const palestras = await listarPalestrasAtivas();
  const agoraRef = agora();
  // A palestra do dia é sugerida por padrão (task 2.2): a que cai no
  // mesmo dia civil, em America/Porto_Velho, de hoje.
  const palestraDoDia = palestras.find((p) => mesmoDiaCivil(agoraRef, p.dataHora));

  const opcoes = palestras.map((p) => ({
    id: p.id,
    rotulo: `${p.cidade} — ${formatarData(p.dataHora)} às ${formatarHorario(p.dataHora)}`,
  }));

  return (
    <>
      <CabecalhoDoCircuito titulo="Check-in">
        <BarraDaSessao nome={atual.nome} papel={ROTULO_DO_PAPEL[atual.papel]} />
      </CabecalhoDoCircuito>

      <main className="mx-auto w-full max-w-conteudo flex-1 px-[var(--gutter-page)] py-6">
        {opcoes.length === 0 ? (
          <p className="font-corpo text-corpo text-texto">
            Nenhuma palestra cadastrada ainda.
          </p>
        ) : (
          <TelaDeCheckin opcoes={opcoes} eventoPadrao={palestraDoDia?.id ?? opcoes[0]!.id} />
        )}
      </main>
    </>
  );
}
