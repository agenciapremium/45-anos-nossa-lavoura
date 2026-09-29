'use client';

import { useState, useTransition } from 'react';

import { Aviso, Botao } from '@/components/ui';
import { alternarAtivacao, excluirPalestra } from './acoes';

/**
 * Desativar e excluir, na linha da listagem.
 *
 * Excluir é oferecido sempre, mas o servidor recusa quando já há convite
 * gerado — e a recusa vem com a alternativa (desativar) no próprio texto.
 * Esconder o botão seria pior: o Admin ficaria sem saber por que sumiu.
 */
export function AcoesDaPalestra({
  id,
  ativo,
  temConvites,
}: {
  id: string;
  ativo: boolean;
  temConvites: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [recado, setRecado] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );

  const executar = (fn: () => Promise<{ ok: boolean; mensagem?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setRecado(r.mensagem ? { ok: r.ok, texto: r.mensagem } : null);
    });

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Botao
          variante="contorno"
          tamanho="sm"
          disabled={pendente}
          onClick={() => executar(() => alternarAtivacao(id))}
        >
          {ativo ? 'Desativar' : 'Reativar'}
        </Botao>
        <Botao
          variante="texto"
          tamanho="sm"
          disabled={pendente}
          onClick={() => {
            if (
              !window.confirm(
                temConvites
                  ? 'Esta palestra tem convites gerados. A exclusão vai ser recusada. Continuar mesmo assim?'
                  : 'Excluir esta palestra? A ação não pode ser desfeita.',
              )
            ) {
              return;
            }
            executar(() => excluirPalestra(id));
          }}
        >
          Excluir
        </Botao>
      </div>
      {recado ? (
        <Aviso tom={recado.ok ? 'sucesso' : 'erro'} className="text-corpo-sm">
          <p>{recado.texto}</p>
        </Aviso>
      ) : null}
    </div>
  );
}
