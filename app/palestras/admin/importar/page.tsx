import type { Metadata } from 'next';

import {
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  Sobrancelha,
  Subtitulo,
  Tabela,
  Titulo,
  Vazio,
} from '@/components/ui';
import { listarImportacoes } from '@/lib/palestras/consultas';
import { exigirPapel } from '@/lib/palestras/sessao';
import { formatarCarimbo } from '@/lib/tempo';
import { AssistenteDeImportacao } from './assistente';

export const metadata: Metadata = { title: 'Importar colaboradores' };

export default async function Importar() {
  const { escopo } = await exigirPapel(['admin']);
  const historico = await listarImportacoes(escopo);

  return (
    <>
      <Sobrancelha>Cadastro em massa</Sobrancelha>
      <Titulo>Importar colaboradores</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        Duas etapas: você envia o arquivo e confere as contagens; só depois de
        confirmar alguma coisa é gravada. A carga é idempotente — reimportar o
        mesmo arquivo não duplica ninguém.
      </p>

      <AssistenteDeImportacao />

      <section className="mt-16">
        <Subtitulo className="mb-4">Histórico de importações</Subtitulo>
        {historico.length === 0 ? (
          <Vazio titulo="Nenhuma importação ainda." />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <CelulaDeTitulo>Quando</CelulaDeTitulo>
                <CelulaDeTitulo>Arquivo</CelulaDeTitulo>
                <CelulaDeTitulo>Total</CelulaDeTitulo>
                <CelulaDeTitulo>Criados</CelulaDeTitulo>
                <CelulaDeTitulo>Atualizados</CelulaDeTitulo>
                <CelulaDeTitulo>Erros</CelulaDeTitulo>
                <CelulaDeTitulo>Quem importou</CelulaDeTitulo>
              </tr>
            </Cabecalho>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <Celula>{formatarCarimbo(h.feitoEm)}</Celula>
                  <Celula className="font-mono text-corpo-sm">
                    {h.arquivoNome}
                  </Celula>
                  <Celula className="tabular-nums">{h.total}</Celula>
                  <Celula className="tabular-nums">{h.criados}</Celula>
                  <Celula className="tabular-nums">{h.atualizados}</Celula>
                  <Celula className="tabular-nums">
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
