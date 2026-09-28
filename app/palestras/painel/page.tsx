import Link from 'next/link';

import {
  Cartao,
  Selo,
  Sobrancelha,
  Subtitulo,
  Titulo,
  TituloDoCartao,
  Vazio,
} from '@/components/ui';
import { listarPalestrasAtivas } from '@/lib/palestras/consultas';
import { resumoNoEscopo, totalDeUsuariosNoEscopo } from '@/lib/palestras/dados';
import type { Escopo } from '@/lib/palestras/escopo';
import {
  ROTULO_DA_ACAO,
  ROTULO_DO_PAPEL,
  alcanceDe,
  type AcaoProtegida,
} from '@/lib/palestras/papeis';
import { exigirEscopo } from '@/lib/palestras/sessao';
import { formatarDataHora } from '@/lib/tempo';

export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/painel · início conforme o papel

   Os números já vêm filtrados pelo escopo (`lib/palestras/dados.ts`): o
   gerente de loja vê os convites da loja dele, o gerente regional os da
   regional, o colaborador os próprios. O Admin vê tudo, mas o lugar dele é
   a administração.

   Os atalhos saem da **matriz de permissões**, não de uma lista escrita à
   mão. Esconder um atalho não protege nada — a proteção está no servidor —
   mas oferecer um botão que responde 403 é desrespeito com quem clica.
   ========================================================= */

type Atalho = {
  acao: AcaoProtegida;
  href: string;
  rotulo: string;
  descricao: string;
  /** Rota entregue por uma change posterior. */
  emBreve?: boolean;
};

const ATALHOS: Atalho[] = [
  {
    acao: 'cadastrarPalestras',
    href: '/palestras/admin',
    rotulo: 'Administração',
    descricao: 'Palestras, estrutura, importação, geração e PDFs.',
  },
  {
    acao: 'verConvitesEConfirmacoes',
    href: '/palestras/painel/convites',
    rotulo: 'Convites',
    descricao: 'Links por palestra e estado, com envio e cancelamento.',
  },
  {
    acao: 'listaImpressaECsv',
    href: '/palestras/relatorios',
    rotulo: 'Relatórios',
    descricao: 'Lista para impressão e exportação em CSV.',
    emBreve: true,
  },
  {
    acao: 'fazerCheckin',
    href: '/palestras/checkin',
    rotulo: 'Check-in',
    descricao: 'Leitura do QR e busca manual no dia da palestra.',
    emBreve: true,
  },
];

/**
 * A visão de equipe (`visao-gerencial`) não é uma linha da matriz do PRD —
 * é leitura agregada sobre a mesma ação `verConvitesEConfirmacoes`, só que
 * reservada a quem tem mais de um colaborador no escopo. Por isso o atalho
 * é decidido pelo papel, e não por `alcanceDe`: um colaborador tem alcance
 * `proprios` em `verConvitesEConfirmacoes` (é por isso que ele vê
 * "Convites"), mas "Equipe" não faz sentido para ele — não há equipe.
 */
const PAPEIS_COM_EQUIPE: ReadonlyArray<Escopo['papel']> = [
  'admin',
  'gerente_regional',
  'gerente_loja',
];

function descricaoDoEscopo(escopo: Escopo): string {
  switch (escopo.papel) {
    case 'admin':
      return 'Você enxerga todas as regionais e lojas do circuito.';
    case 'gerente_regional':
      return 'Você enxerga os convites e confirmações das lojas da sua regional.';
    case 'gerente_loja':
      return 'Você enxerga os convites e confirmações da sua loja.';
    case 'colaborador':
      return 'Você enxerga os convites gerados para você.';
    case 'recepcao':
      return 'Você atende a portaria: titular, acompanhante e CPF mascarado.';
  }
}

export default async function Painel() {
  const atual = await exigirEscopo();
  const { escopo } = atual;

  const palestras = await listarPalestrasAtivas();

  const podeVerNumeros = alcanceDe(escopo.papel, 'verConvitesEConfirmacoes') !== 'nenhum';

  const resumos = podeVerNumeros
    ? await Promise.all(
        palestras.map(async (p) => ({
          palestra: p,
          resumo: await resumoNoEscopo(escopo, p.id),
        })),
      )
    : [];

  const pessoas =
    escopo.papel === 'gerente_regional' || escopo.papel === 'gerente_loja'
      ? await totalDeUsuariosNoEscopo(escopo)
      : null;

  const atalhos = ATALHOS.filter(
    (a) => alcanceDe(escopo.papel, a.acao) !== 'nenhum',
  );
  const temEquipe = PAPEIS_COM_EQUIPE.includes(escopo.papel);

  return (
    <>
      <Sobrancelha>{ROTULO_DO_PAPEL[escopo.papel]}</Sobrancelha>
      <Titulo>Olá, {atual.nome.trim().split(/\s+/)[0]}</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        {descricaoDoEscopo(escopo)}
      </p>

      {pessoas !== null ? (
        <section className="mb-10">
          <Cartao className="max-w-xs">
            <TituloDoCartao>{pessoas}</TituloDoCartao>
            <p className="mt-1 font-corpo text-corpo text-texto-suave">
              pessoas no seu escopo
            </p>
          </Cartao>
        </section>
      ) : null}

      {podeVerNumeros ? (
        <section className="mb-12">
          <Subtitulo className="mb-4">Palestras do circuito</Subtitulo>
          {resumos.length === 0 ? (
            <Vazio titulo="Nenhuma palestra ativa">
              <p className="m-0">
                Assim que a administração cadastrar as palestras, os números
                aparecem aqui.
              </p>
            </Vazio>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resumos.map(({ palestra, resumo }) => {
                const gerados = Object.values(resumo).reduce((a, b) => a + b, 0);
                return (
                  <Cartao key={palestra.id}>
                    <TituloDoCartao>{palestra.cidade}</TituloDoCartao>
                    <p className="mt-1 font-corpo text-corpo text-texto">
                      {formatarDataHora(palestra.dataHora)}
                    </p>
                    <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
                      <li>
                        <Selo tom="neutro">{gerados} gerados</Selo>
                      </li>
                      <li>
                        <Selo tom="positivo">{resumo.confirmado} confirmados</Selo>
                      </li>
                      <li>
                        <Selo tom="neutro">{resumo.disponivel} disponíveis</Selo>
                      </li>
                      <li>
                        <Selo tom="negativo">{resumo.cancelado} cancelados</Selo>
                      </li>
                    </ul>
                  </Cartao>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section>
        <Subtitulo className="mb-4">O que você pode fazer</Subtitulo>
        <div className="grid gap-4 sm:grid-cols-2">
          {temEquipe ? (
            <Link href="/palestras/painel/equipe" className="no-underline">
              <Cartao className="h-full hover:border-lima-500">
                <TituloDoCartao>Equipe</TituloDoCartao>
                <p className="mt-1 font-corpo text-corpo text-texto-suave">
                  Números e listas por loja e por colaborador do seu escopo,
                  em modo de leitura.
                </p>
              </Cartao>
            </Link>
          ) : null}
          {atalhos.map((atalho) =>
            atalho.emBreve ? (
              <Cartao key={atalho.rotulo} className="opacity-70">
                <div className="flex flex-wrap items-center gap-2">
                  <TituloDoCartao>{atalho.rotulo}</TituloDoCartao>
                  <Selo tom="neutro">em breve</Selo>
                </div>
                <p className="mt-1 font-corpo text-corpo text-texto-suave">
                  {atalho.descricao}
                </p>
              </Cartao>
            ) : (
              <Link
                key={atalho.rotulo}
                href={atalho.href}
                className="no-underline"
              >
                <Cartao className="h-full hover:border-lima-500">
                  <TituloDoCartao>{atalho.rotulo}</TituloDoCartao>
                  <p className="mt-1 font-corpo text-corpo text-texto-suave">
                    {atalho.descricao}
                  </p>
                </Cartao>
              </Link>
            ),
          )}
          {atalhos.length === 0 && !temEquipe ? (
            <Vazio titulo="Nada por aqui ainda">
              <p className="m-0">
                As telas do seu perfil entram nas próximas entregas do
                circuito. {ROTULO_DA_ACAO.fazerCheckin} é uma delas.
              </p>
            </Vazio>
          ) : null}
        </div>
      </section>
    </>
  );
}
