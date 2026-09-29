import type { Metadata } from 'next';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import { Vazio } from '@/components/ui';
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
 * `/palestras/checkin`: Recepção e Admin (tarefa 6.3).
 *
 * O middleware já restringe o prefixo a `admin`/`recepcao`; `exigirPapel`
 * repete a checagem no servidor (a segunda camada da autorização, D4 de
 * `auth-e-papeis`) e é o que devolve o escopo que as Server Actions usam.
 *
 * É a tela usada em pé, na porta do evento, com pressa: o cabeçalho fica
 * curto de propósito, o essencial é a seleção de palestra e o corpo logo
 * abaixo, ao alcance do polegar.
 */
export default async function PaginaDeCheckin() {
  const { escopo } = await exigirPapel(['admin', 'recepcao']);

  const palestras = await listarPalestrasAtivas();
  const agoraRef = agora();
  // A palestra do dia é sugerida por padrão: a que cai no mesmo dia civil,
  // em America/Porto_Velho, de hoje.
  const palestraDoDia = palestras.find((p) => mesmoDiaCivil(agoraRef, p.dataHora));

  const opcoes = palestras.map((p) => ({
    id: p.id,
    rotulo: `${p.cidade} · ${formatarData(p.dataHora)} às ${formatarHorario(p.dataHora)}`,
  }));

  return (
    <>
      <CabecalhoDeTela sobrancelha={ROTULO_DO_PAPEL[escopo.papel]} titulo="Check-in" />

      {opcoes.length === 0 ? (
        <Vazio titulo="Nenhuma palestra cadastrada ainda." />
      ) : (
        <TelaDeCheckin opcoes={opcoes} eventoPadrao={palestraDoDia?.id ?? opcoes[0]!.id} />
      )}
    </>
  );
}
