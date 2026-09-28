import type { Metadata } from 'next';
import { count, eq } from 'drizzle-orm';

import { Sobrancelha, Titulo, Vazio } from '@/components/ui';
import { db } from '@/lib/db';
import { convite } from '@/lib/db/schema';
import {
  listarColaboradoresParaGeracao,
  listarLojas,
  listarPalestras,
  listarRegionais,
} from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarDataHora, venceu } from '@/lib/tempo';
import { FormularioDeGeracao } from './formulario';

export const metadata: Metadata = { title: 'Gerar convites' };

export default async function Gerar({
  searchParams,
}: {
  searchParams: Promise<{ palestra?: string }>;
}) {
  const { escopo } = await exigirPapel(['admin']);
  const { palestra } = await searchParams;

  const [palestras, colaboradores, regionais, lojas] = await Promise.all([
    listarPalestras(),
    listarColaboradoresParaGeracao(escopo, {}),
    listarRegionais(escopo),
    listarLojas(escopo),
  ]);

  const ativas = palestras.filter((p) => p.ativo);

  /*
   * Quantos convites cada colaborador já tem na palestra escolhida. Sem esse
   * número, o Admin não tem como saber se já gerou — e gerar de novo dobra
   * os convites em vez de substituir.
   */
  const eventoEscolhido =
    palestra ?? ativas.find((p) => !venceu(p.prazoConfirmacao))?.id;

  const jaTemPorColaborador = new Map<string, number>();
  if (eventoEscolhido && colaboradores.length) {
    const linhas = await db()
      .select({ colaboradorId: convite.colaboradorId, total: count() })
      .from(convite)
      .where(eq(convite.eventoId, eventoEscolhido))
      .groupBy(convite.colaboradorId);
    for (const l of linhas) {
      jaTemPorColaborador.set(l.colaboradorId, Number(l.total));
    }
  }

  return (
    <>
      <Sobrancelha>Convites</Sobrancelha>
      <Titulo>Gerar convites</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        Uma operação cobre vários colaboradores com quantidades diferentes na
        mesma palestra. Cada convite recebe um código de 6 caracteres e nasce
        disponível.
      </p>

      {ativas.length === 0 ? (
        <Vazio titulo="Nenhuma palestra ativa.">
          <p>
            Cadastre e ative ao menos uma palestra antes de gerar convites.
          </p>
        </Vazio>
      ) : colaboradores.length === 0 ? (
        <Vazio titulo="Nenhum colaborador cadastrado.">
          <p>
            Importe a base pela tela de importação: só entram aqui usuários
            ativos com papel <code className="font-mono">colaborador</code> e
            loja vinculada.
          </p>
        </Vazio>
      ) : (
        <FormularioDeGeracao
          palestras={ativas.map((p) => ({
            id: p.id,
            cidade: p.cidade,
            rotulo: `${p.cidade} — ${formatarDataHora(p.dataHora)}`,
            prazoVencido: venceu(p.prazoConfirmacao),
          }))}
          colaboradores={colaboradores.map((c) => ({
            id: c.id,
            nome: c.nome,
            lojaId: c.lojaId,
            lojaCodigo: c.lojaCodigo,
            lojaNome: c.lojaNome,
            regionalId: c.regionalId,
            regionalNome: c.regionalNome,
            jaTem: jaTemPorColaborador.get(c.id) ?? 0,
          }))}
          regionais={regionais.map((r) => ({ id: r.id, nome: r.nome }))}
          lojas={lojas.map((l) => ({
            id: l.id,
            nome: l.nome,
            codigo: l.codigo,
            regionalId: l.regionalId,
          }))}
        />
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';
