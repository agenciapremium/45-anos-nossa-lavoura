import type { Metadata } from 'next';

import {
  Cabecalho,
  Celula,
  CelulaDeTitulo,
  Selo,
  Sobrancelha,
  Subtitulo,
  Tabela,
  Titulo,
  Vazio,
} from '@/components/ui';
import {
  listarLojas,
  listarRegionais,
  listarUsuarios,
} from '@/lib/palestras/consultas';
import { formatarCpf } from '@/lib/palestras/cpf';
import { exigirPapel } from '@/lib/palestras/sessao';
import { isoParaDataBr } from '@/lib/tempo';
import {
  BotaoDeAtivacao,
  FormularioDeLoja,
  FormularioDeRegional,
  FormularioDeUsuario,
} from './formularios';

export const metadata: Metadata = { title: 'Estrutura organizacional' };

export default async function Organizacao() {
  const { escopo } = await exigirPapel(['admin']);

  const [regionais, lojas, usuarios] = await Promise.all([
    listarRegionais(escopo),
    listarLojas(escopo),
    listarUsuarios(escopo),
  ]);

  return (
    <>
      <Sobrancelha>Cadastro</Sobrancelha>
      <Titulo>Estrutura organizacional</Titulo>
      <p className="mt-2 mb-8 max-w-prosa font-corpo text-corpo-lg text-texto">
        Três níveis: uma regional contém lojas, uma loja contém usuários.
        Desativar preserva o histórico; não existe exclusão.
      </p>

      {/* ---------------- Regionais ---------------- */}
      <section className="mb-12">
        <Subtitulo className="mb-4">Regionais</Subtitulo>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {regionais.length === 0 ? (
            <Vazio titulo="Nenhuma regional cadastrada.">
              <p>
                Crie ao menos uma regional antes de cadastrar lojas — toda loja
                pertence a uma.
              </p>
            </Vazio>
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <CelulaDeTitulo>Nome</CelulaDeTitulo>
                  <CelulaDeTitulo>Lojas</CelulaDeTitulo>
                  <CelulaDeTitulo>Situação</CelulaDeTitulo>
                  <CelulaDeTitulo>
                    <span className="sr-only">Ações</span>
                  </CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {regionais.map((r) => (
                  <tr key={r.id}>
                    <Celula className="font-bold">{r.nome}</Celula>
                    <Celula className="tabular-nums">
                      {lojas.filter((l) => l.regionalId === r.id).length}
                    </Celula>
                    <Celula>
                      <Selo tom={r.ativo ? 'positivo' : 'neutro'}>
                        {r.ativo ? 'ativa' : 'inativa'}
                      </Selo>
                    </Celula>
                    <Celula>
                      <BotaoDeAtivacao alvo="regional" id={r.id} ativo={r.ativo} />
                    </Celula>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
          <FormularioDeRegional />
        </div>
      </section>

      {/* ---------------- Lojas ---------------- */}
      <section className="mb-12">
        <Subtitulo className="mb-4">Lojas</Subtitulo>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {lojas.length === 0 ? (
            <Vazio titulo="Nenhuma loja cadastrada." />
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <CelulaDeTitulo>Código</CelulaDeTitulo>
                  <CelulaDeTitulo>Loja</CelulaDeTitulo>
                  <CelulaDeTitulo>Regional</CelulaDeTitulo>
                  <CelulaDeTitulo>Usuários</CelulaDeTitulo>
                  <CelulaDeTitulo>Situação</CelulaDeTitulo>
                  <CelulaDeTitulo>
                    <span className="sr-only">Ações</span>
                  </CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {lojas.map((l) => (
                  <tr key={l.id}>
                    <Celula className="font-mono">{l.codigo}</Celula>
                    <Celula className="font-bold">
                      {l.nome}
                      {l.cidade ? (
                        <span className="block text-corpo-sm font-normal text-texto-suave">
                          {l.cidade}
                        </span>
                      ) : null}
                    </Celula>
                    <Celula>{l.regionalNome}</Celula>
                    <Celula className="tabular-nums">
                      {usuarios.filter((u) => u.lojaId === l.id).length}
                    </Celula>
                    <Celula>
                      <Selo tom={l.ativo ? 'positivo' : 'neutro'}>
                        {l.ativo ? 'ativa' : 'inativa'}
                      </Selo>
                    </Celula>
                    <Celula>
                      <BotaoDeAtivacao alvo="loja" id={l.id} ativo={l.ativo} />
                    </Celula>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
          <FormularioDeLoja regionais={regionais} />
        </div>
      </section>

      {/* ---------------- Usuários ---------------- */}
      <section>
        <Subtitulo className="mb-4">Usuários</Subtitulo>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {usuarios.length === 0 ? (
            <Vazio titulo="Nenhum usuário cadastrado.">
              <p>
                Para 390 colaboradores, use a{' '}
                <a
                  href="/palestras/admin/importar"
                  className="font-bold underline underline-offset-4"
                >
                  importação por CSV
                </a>{' '}
                em vez do formulário.
              </p>
            </Vazio>
          ) : (
            <Tabela>
              <Cabecalho>
                <tr>
                  <CelulaDeTitulo>Nome</CelulaDeTitulo>
                  <CelulaDeTitulo>CPF</CelulaDeTitulo>
                  <CelulaDeTitulo>Nascimento</CelulaDeTitulo>
                  <CelulaDeTitulo>Papel</CelulaDeTitulo>
                  <CelulaDeTitulo>Escopo</CelulaDeTitulo>
                  <CelulaDeTitulo>Situação</CelulaDeTitulo>
                  <CelulaDeTitulo>
                    <span className="sr-only">Ações</span>
                  </CelulaDeTitulo>
                </tr>
              </Cabecalho>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <Celula className="font-bold">
                      {u.nome}
                      {u.email ? (
                        <span className="block text-corpo-sm font-normal text-texto-suave">
                          {u.email}
                        </span>
                      ) : null}
                    </Celula>
                    {/* O Admin vê o CPF inteiro; os demais papéis, mascarado
                        — regra aplicada por `auth-e-papeis`. */}
                    <Celula className="font-mono">{formatarCpf(u.cpf)}</Celula>
                    <Celula>{isoParaDataBr(u.dataNascimento)}</Celula>
                    <Celula>
                      <Selo tom={u.papel === 'admin' ? 'acento' : 'neutro'}>
                        {u.papel}
                      </Selo>
                    </Celula>
                    <Celula className="text-corpo-sm">
                      {u.lojaCodigo ? `${u.lojaCodigo} · ${u.lojaNome}` : null}
                      {u.regionalNome ? (
                        <span className="block text-texto-suave">
                          {u.regionalNome}
                        </span>
                      ) : null}
                    </Celula>
                    <Celula>
                      <Selo tom={u.ativo ? 'positivo' : 'neutro'}>
                        {u.ativo ? 'ativo' : 'inativo'}
                      </Selo>
                    </Celula>
                    <Celula>
                      <BotaoDeAtivacao alvo="usuario" id={u.id} ativo={u.ativo} />
                    </Celula>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
          <FormularioDeUsuario regionais={regionais} lojas={lojas} />
        </div>
      </section>
    </>
  );
}
