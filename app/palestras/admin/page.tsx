import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Cartao,
  LinkBotao,
  Selo,
  Sobrancelha,
  Subtitulo,
  Titulo,
  TituloDoCartao,
} from '@/components/ui';
import {
  listarLojas,
  listarPalestras,
  listarRegionais,
  listarUsuarios,
  resumoDeConvites,
} from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarCarimbo, formatarDataHora, venceu } from '@/lib/tempo';

export const metadata: Metadata = { title: 'Início' };
export const dynamic = 'force-dynamic';

export default async function InicioAdministrativo() {
  const { escopo } = await exigirPapel(['admin']);

  const [palestras, regionais, lojas, usuarios] = await Promise.all([
    listarPalestras(),
    listarRegionais(escopo),
    listarLojas(escopo),
    listarUsuarios(escopo),
  ]);

  const ativas = palestras.filter((p) => p.ativo);
  const resumos = await Promise.all(
    ativas.map(async (p) => ({
      palestra: p,
      resumo: await resumoDeConvites(escopo, p.id),
    })),
  );

  const colaboradores = usuarios.filter(
    (u) => u.papel === 'colaborador' && u.ativo,
  );

  return (
    <>
      <Sobrancelha>Preparação do circuito</Sobrancelha>
      <Titulo>Administração</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        Esta é a operação de preparação: cadastrar as palestras, carregar a
        estrutura da Nossa Lavoura, gerar os lotes de convites e entregar o PDF
        ao colaborador.
      </p>

      <section className="mb-12 grid gap-4 sm:grid-cols-4">
        <Cartao>
          <TituloDoCartao>{palestras.length}</TituloDoCartao>
          <p className="mt-1 font-corpo text-corpo text-texto-suave">
            palestras ({ativas.length} ativas)
          </p>
        </Cartao>
        <Cartao>
          <TituloDoCartao>{regionais.length}</TituloDoCartao>
          <p className="mt-1 font-corpo text-corpo text-texto-suave">
            regionais
          </p>
        </Cartao>
        <Cartao>
          <TituloDoCartao>{lojas.length}</TituloDoCartao>
          <p className="mt-1 font-corpo text-corpo text-texto-suave">lojas</p>
        </Cartao>
        <Cartao>
          <TituloDoCartao>{colaboradores.length}</TituloDoCartao>
          <p className="mt-1 font-corpo text-corpo text-texto-suave">
            colaboradores ativos
          </p>
        </Cartao>
      </section>

      <section className="mb-12">
        <Subtitulo className="mb-4">Palestras ativas</Subtitulo>
        {resumos.length === 0 ? (
          <Cartao>
            <p className="m-0 font-corpo text-corpo">
              Nenhuma palestra ativa.{' '}
              <Link
                href="/palestras/admin/palestras/nova"
                className="font-bold underline underline-offset-4"
              >
                Cadastre a primeira
              </Link>
              .
            </p>
          </Cartao>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resumos.map(({ palestra, resumo }) => {
              const vencido = venceu(palestra.prazoConfirmacao);
              return (
                <Cartao key={palestra.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <TituloDoCartao>{palestra.cidade}</TituloDoCartao>
                    {vencido ? (
                      <Selo tom="negativo">prazo vencido</Selo>
                    ) : (
                      <Selo tom="positivo">aberta</Selo>
                    )}
                  </div>
                  <p className="mt-1 font-corpo text-corpo text-texto">
                    {formatarDataHora(palestra.dataHora)}
                  </p>
                  <p className="font-corpo text-corpo-sm text-texto-suave">
                    Confirmações até {formatarCarimbo(palestra.prazoConfirmacao)}
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 font-corpo text-corpo-sm">
                    <div>
                      <dt className="text-texto-suave">disponíveis</dt>
                      <dd className="m-0 font-bold tabular-nums">
                        {resumo.disponivel}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-texto-suave">confirmados</dt>
                      <dd className="m-0 font-bold tabular-nums">
                        {resumo.confirmado}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-texto-suave">expirados</dt>
                      <dd className="m-0 font-bold tabular-nums">
                        {resumo.expirado}
                      </dd>
                    </div>
                  </dl>
                </Cartao>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <Subtitulo className="mb-4">Por onde começar</Subtitulo>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {[
            {
              titulo: '1. Cadastrar as palestras',
              texto:
                'As quatro do circuito, com cidade, data, local e mensagem de WhatsApp.',
              href: '/palestras/admin/palestras/nova',
              rotulo: 'Nova palestra',
            },
            {
              titulo: '2. Carregar a estrutura',
              texto:
                'Regionais, lojas e colaboradores da Nossa Lavoura, pelo CSV.',
              href: '/palestras/admin/importar',
              rotulo: 'Importar CSV',
            },
            {
              titulo: '3. Gerar os convites',
              texto:
                'Um lote por palestra, com a quantidade de cada colaborador.',
              href: '/palestras/admin/gerar',
              rotulo: 'Gerar convites',
            },
            {
              titulo: '4. Entregar os PDFs',
              texto:
                'Um arquivo por colaborador, pronto para o WhatsApp, ou tudo num .zip.',
              href: '/palestras/admin/distribuir',
              rotulo: 'Gerar PDFs',
            },
          ].map((passo) => (
            <li key={passo.href}>
              <Cartao className="flex h-full flex-col items-start">
                <TituloDoCartao>{passo.titulo}</TituloDoCartao>
                <p className="mt-2 mb-4 font-corpo text-corpo text-texto">
                  {passo.texto}
                </p>
                <LinkBotao
                  href={passo.href}
                  variante="contorno"
                  tamanho="sm"
                  className="mt-auto"
                >
                  {passo.rotulo}
                </LinkBotao>
              </Cartao>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
