import { normalizarCodigo, pareceCodigo } from '@/lib/palestras/codigo';
import {
  montarIcs,
  nomeDoArquivoIcs,
} from '@/lib/palestras/ingresso-agenda';
import {
  confirmacaoDoConvite,
  resolverConvite,
} from '@/lib/palestras/servicos/confirmacao';
import { ehODispositivoDoTitular } from '../titular';

/* =========================================================
   `.ics` da palestra (D7 do design)

   Um arquivo de calendário montado no pedido, nunca armazenado. Não
   carrega nenhum dado pessoal — só cidade, data, horário, local e
   endereço, que são públicos em `/palestras`.

   Mesmo assim a rota é fechada ao **dispositivo do titular**. Não é para
   proteger o conteúdo: é para a rota não virar um detector de códigos
   válidos. Quem não tem o cookie recebe 404 para qualquer código, exista
   ele ou não — exatamente como a página do convite responde igual para
   código inexistente e cancelado.
   ========================================================= */

export const dynamic = 'force-dynamic';

const NAO_ENCONTRADO = new Response('Not Found', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});

export async function GET(
  _pedido: Request,
  contexto: { params: Promise<{ codigo: string }> },
) {
  const { codigo: bruto } = await contexto.params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));
  if (!pareceCodigo(codigo)) return NAO_ENCONTRADO.clone();

  const convite = await resolverConvite(codigo);
  if (!convite) return NAO_ENCONTRADO.clone();

  const confirmacao = await confirmacaoDoConvite(convite.conviteId);
  if (!confirmacao?.ativa) return NAO_ENCONTRADO.clone();

  const titular = await ehODispositivoDoTitular(
    codigo,
    confirmacao.id,
    confirmacao.ingressoToken,
  );
  if (!titular) return NAO_ENCONTRADO.clone();

  const corpo = montarIcs({
    inicio: convite.palestra.dataHora,
    cidade: convite.palestra.cidade,
    localNome: convite.palestra.localNome,
    localEndereco: convite.palestra.localEndereco,
    // Estável por palestra e por convite: reabrir o arquivo atualiza o
    // compromisso em vez de criar um segundo.
    uid: `${convite.palestra.id}.${codigo}@acelera-no-campo.nossalavoura`,
  });

  return new Response(corpo, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeDoArquivoIcs(
        convite.palestra.cidade,
      )}"`,
      'Cache-Control': 'no-store',
    },
  });
}
