import type { Metadata } from 'next';

import { CabecalhoDeTela } from '@/components/palestras/cabecalho-de-tela';
import {
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  Tabela,
  Subtitulo,
  Vazio,
} from '@/components/ui';
import { listarImportacoes } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarCarimbo } from '@/lib/tempo';
import { AssistenteDeImportacao } from './assistente';

export const metadata: Metadata = { title: 'Importar colaboradores' };
export const dynamic = 'force-dynamic';

export default async function Importar() {
  const { escopo } = await exigirPapel(['admin']);
  const historico = await listarImportacoes(escopo);

  return (
    <>
      <CabecalhoDeTela
        sobrancelha="Administração · cadastro em massa"
        titulo="Importar colaboradores"
      />

      <p className="mt-0 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        Duas etapas: você envia o arquivo e confere as contagens, só depois
        de confirmar alguma coisa é gravada. A carga é idempotente:
        reimportar o mesmo arquivo não duplica ninguém.
      </p>

      <AssistenteDeImportacao />

      <section className="mt-12">
        <Subtitulo className="mb-4 text-t3">Importações anteriores</Subtitulo>
        {historico.length === 0 ? (
          <Vazio titulo="Nenhuma importação ainda." />
        ) : (
          <Tabela superficie="interna">
            <Cabecalho superficie="interna">
              <tr>
                <CelulaDeTitulo>Quando</CelulaDeTitulo>
                <CelulaDeTitulo>Arquivo</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Total</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Criados</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Atualizados</CelulaDeTitulo>
                <CelulaDeTitulo className="text-right">Erros</CelulaDeTitulo>
                <CelulaDeTitulo>Quem importou</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <Celula>{formatarCarimbo(h.feitoEm)}</Celula>
                  <Celula className="font-mono text-corpo-sm">{h.arquivoNome}</Celula>
                  <Celula className="text-right tabular-nums">{h.total}</Celula>
                  <Celula className="text-right tabular-nums">{h.criados}</Celula>
                  <Celula className="text-right tabular-nums">{h.atualizados}</Celula>
                  <Celula className="text-right tabular-nums">
                    {Array.isArray(h.errosJson) ? h.errosJson.length : 0}
                  </Celula>
                  <Celula>{h.feitoPorNome ?? 'admin (preview)'}</Celula>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </section>
    </>
  );
}
