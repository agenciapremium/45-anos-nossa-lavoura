'use client';

import { useState } from 'react';

import { Botao } from '@/components/ui';

/* =========================================================
   Copiar do lote avulso (tarefa 5.1)

   Client Component pelo único motivo que justifica um:
   `navigator.clipboard` não existe no servidor. Toda a leitura do lote
   continua no Server Component da página.

   Não existe botão de WhatsApp aqui, e não é esquecimento: requisito
   "Sem envio por WhatsApp" de `convites-avulsos`. A mensagem do sistema é
   assinada pelo colaborador remetente, e o convite avulso não tem um.
   ========================================================= */

/** Copia um endereço. Usado em cada linha da tabela. */
export function BotaoCopiarConvite({ url, codigo }: { url: string; codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o endereço continua visível
      // na própria linha, em texto, para copiar à mão.
      setCopiado(false);
    }
  }

  return (
    <Botao
      variante={copiado ? 'claro' : 'contorno'}
      tamanho="sm"
      onClick={copiar}
      aria-live="polite"
      aria-label={`Copiar o endereço do convite ${codigo}`}
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </Botao>
  );
}

/**
 * Copia os endereços de todos os convites do lote, um por linha.
 *
 * Uma linha por endereço, sem numeração nem texto em volta: é o formato que
 * cola direto numa planilha, num e-mail ou num bloco de notas, que é para
 * onde essa lista vai na prática.
 */
export function BotaoCopiarTodos({ urls }: { urls: string[] }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Botao
      variante={copiado ? 'claro' : 'primario'}
      tamanho="sm"
      onClick={copiar}
      aria-live="polite"
      disabled={urls.length === 0}
    >
      {copiado
        ? `${urls.length} link${urls.length === 1 ? '' : 's'} copiado${urls.length === 1 ? '' : 's'}`
        : `Copiar os ${urls.length} links`}
    </Botao>
  );
}
