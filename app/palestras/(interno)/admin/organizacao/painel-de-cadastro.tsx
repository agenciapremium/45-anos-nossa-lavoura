'use client';

import { useState } from 'react';

import { Botao, PainelLateral } from '@/components/ui';
import {
  FormularioDeLoja,
  FormularioDeRegional,
  FormularioDeUsuario,
} from './formularios';

export type NivelDaEstrutura = 'regionais' | 'lojas' | 'usuarios';

const ROTULO: Record<NivelDaEstrutura, string> = {
  regionais: 'Nova regional',
  lojas: 'Nova loja',
  usuarios: 'Novo usuário',
};

/**
 * Botão de "Novo X" do cabeçalho + o painel lateral de cadastro (tarefa
 * 5.3, D do design: cadastro em painel em vez de formulário empilhado).
 * O formulário mostrado depende de qual aba de nível está ativa.
 */
export function PainelDeCadastro({
  nivel,
  regionais,
  lojas,
}: {
  nivel: NivelDaEstrutura;
  regionais: { id: string; nome: string; ativo: boolean }[];
  lojas: { id: string; nome: string; codigo: string; ativo: boolean }[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Botao tamanho="sm" onClick={() => setAberto(true)}>
        {ROTULO[nivel]}
      </Botao>
      <PainelLateral
        titulo={ROTULO[nivel]}
        aberto={aberto}
        aoFechar={() => setAberto(false)}
      >
        {nivel === 'regionais' ? (
          <FormularioDeRegional aoCancelar={() => setAberto(false)} />
        ) : nivel === 'lojas' ? (
          <FormularioDeLoja
            regionais={regionais}
            aoCancelar={() => setAberto(false)}
          />
        ) : (
          <FormularioDeUsuario
            regionais={regionais}
            lojas={lojas}
            aoCancelar={() => setAberto(false)}
          />
        )}
      </PainelLateral>
    </>
  );
}
