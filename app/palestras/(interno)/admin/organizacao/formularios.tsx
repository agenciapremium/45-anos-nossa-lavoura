'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Aviso,
  Botao,
  Campo,
  Grupo,
  Selecao,
} from '@/components/ui';
import { PAPEIS } from '@/lib/db/schema';
import { mascaraProgressiva } from '@/lib/palestras/cpf';
import { ROTULO_DO_PAPEL } from '@/lib/palestras/papeis';
import {
  alternarAtivoDeLoja,
  alternarAtivoDeRegional,
  alternarAtivoDeUsuario,
  salvarLoja,
  salvarRegional,
  salvarUsuario,
  type EstadoDoFormulario,
} from './acoes';

const INICIAL: EstadoDoFormulario = { ok: false };

/* =========================================================
   Formulários da estrutura organizacional (tarefa 5.3)

   As três Server Actions (`salvarRegional`, `salvarLoja`, `salvarUsuario`)
   e a validação Zod continuam exatamente como estavam: só a moldura muda,
   de cartão empilhado na página para o conteúdo de um `PainelLateral`
   (aberto por `./painel-de-cadastro.tsx`). `aoCancelar`, quando presente,
   fecha o painel sem submeter nada.
   ========================================================= */

function BotaoSalvar({ rotulo = 'Salvar' }: { rotulo?: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending} className="flex-1">
      {pending ? 'Salvando...' : rotulo}
    </Botao>
  );
}

function Recado({ estado }: { estado: EstadoDoFormulario }) {
  if (!estado.mensagem) return null;
  return (
    <Aviso tom={estado.ok ? 'sucesso' : 'erro'} className="mb-4">
      <p>{estado.mensagem}</p>
    </Aviso>
  );
}

function AcoesDoPainel({
  rotulo,
  aoCancelar,
}: {
  rotulo: string;
  aoCancelar?: () => void;
}) {
  return (
    <div className="mt-2 flex gap-3">
      <BotaoSalvar rotulo={rotulo} />
      {aoCancelar ? (
        <Botao type="button" variante="contorno" onClick={aoCancelar}>
          Cancelar
        </Botao>
      ) : null}
    </div>
  );
}

const CaixaAtivo = ({ padrao }: { padrao: boolean }) => (
  <>
    <label className="mb-4 flex min-h-11 items-center gap-2 font-corpo text-corpo">
      <input
        type="checkbox"
        name="ativo"
        value="sim"
        defaultChecked={padrao}
        className="size-5 accent-lima-500"
      />
      Ativo
    </label>
    <input type="hidden" name="ativo" value="nao" />
  </>
);

/* =========================================================
   Regional
   ========================================================= */
export function FormularioDeRegional({
  aoCancelar,
}: {
  aoCancelar?: () => void;
}) {
  const [estado, acao] = useActionState(salvarRegional, INICIAL);
  return (
    <form action={acao}>
      <Recado estado={estado} />
      <Grupo
        rotulo="Nome"
        htmlFor="regional-nome"
        obrigatorio
        erro={estado.erros?.nome}
        ajuda="O nome é único e é por ele que a importação de CSV reaproveita a regional."
      >
        <Campo
          id="regional-nome"
          name="nome"
          required
          placeholder="Regional Centro"
          aria-invalid={Boolean(estado.erros?.nome)}
        />
      </Grupo>
      <CaixaAtivo padrao />
      <AcoesDoPainel rotulo="Criar regional" aoCancelar={aoCancelar} />
    </form>
  );
}

/* =========================================================
   Loja
   ========================================================= */
export function FormularioDeLoja({
  regionais,
  aoCancelar,
}: {
  regionais: { id: string; nome: string; ativo: boolean }[];
  aoCancelar?: () => void;
}) {
  const [estado, acao] = useActionState(salvarLoja, INICIAL);
  return (
    <form action={acao}>
      <Recado estado={estado} />
      <Grupo
        rotulo="Regional"
        htmlFor="loja-regional"
        obrigatorio
        erro={estado.erros?.regionalId}
      >
        <Selecao
          id="loja-regional"
          name="regionalId"
          required
          defaultValue=""
          aria-invalid={Boolean(estado.erros?.regionalId)}
        >
          <option value="" disabled>
            Escolha a regional
          </option>
          {regionais.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
              {r.ativo ? '' : ' (inativa)'}
            </option>
          ))}
        </Selecao>
      </Grupo>
      <Grupo
        rotulo="Código"
        htmlFor="loja-codigo"
        obrigatorio
        erro={estado.erros?.codigo}
        ajuda="Único. É a chave que a importação usa para reconhecer a loja."
      >
        <Campo
          id="loja-codigo"
          name="codigo"
          required
          placeholder="NL-014"
          aria-invalid={Boolean(estado.erros?.codigo)}
        />
      </Grupo>
      <Grupo rotulo="Nome" htmlFor="loja-nome" obrigatorio erro={estado.erros?.nome}>
        <Campo id="loja-nome" name="nome" required placeholder="Loja Jaru" />
      </Grupo>
      <Grupo rotulo="Cidade" htmlFor="loja-cidade" erro={estado.erros?.cidade}>
        <Campo id="loja-cidade" name="cidade" placeholder="Jaru" />
      </Grupo>
      <CaixaAtivo padrao />
      <AcoesDoPainel rotulo="Criar loja" aoCancelar={aoCancelar} />
    </form>
  );
}

/* =========================================================
   Usuário
   ========================================================= */
export function FormularioDeUsuario({
  regionais,
  lojas,
  aoCancelar,
}: {
  regionais: { id: string; nome: string }[];
  lojas: { id: string; nome: string; codigo: string; ativo: boolean }[];
  aoCancelar?: () => void;
}) {
  const [estado, acao] = useActionState(salvarUsuario, INICIAL);
  const [papel, setPapel] = useState<string>('colaborador');
  const [cpf, setCpf] = useState('');

  const exigeLoja = papel === 'colaborador' || papel === 'gerente_loja';
  const exigeRegional = papel === 'gerente_regional';

  return (
    <form action={acao}>
      <Recado estado={estado} />

      <Grupo rotulo="Nome completo" htmlFor="usuario-nome" obrigatorio erro={estado.erros?.nome}>
        <Campo id="usuario-nome" name="nome" required />
      </Grupo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Grupo
          rotulo="CPF"
          htmlFor="usuario-cpf"
          obrigatorio
          erro={estado.erros?.cpf}
          ajuda="Com ou sem máscara. É gravado só com dígitos."
        >
          <Campo
            id="usuario-cpf"
            name="cpf"
            required
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(mascaraProgressiva(e.target.value))}
            placeholder="000.000.000-00"
            aria-invalid={Boolean(estado.erros?.cpf)}
          />
        </Grupo>

        <Grupo
          rotulo="Data de nascimento"
          htmlFor="usuario-nascimento"
          obrigatorio
          erro={estado.erros?.dataNascimento}
          ajuda="DD/MM/AAAA"
        >
          <Campo
            id="usuario-nascimento"
            name="dataNascimento"
            required
            inputMode="numeric"
            placeholder="07/09/1984"
            aria-invalid={Boolean(estado.erros?.dataNascimento)}
          />
        </Grupo>
      </div>

      <Grupo
        rotulo="E-mail"
        htmlFor="usuario-email"
        erro={estado.erros?.email}
        ajuda="Opcional e único quando informado. Sem e-mail, o acesso é por CPF e nascimento."
      >
        <Campo id="usuario-email" name="email" type="email" />
      </Grupo>

      <Grupo rotulo="WhatsApp" htmlFor="usuario-whatsapp" erro={estado.erros?.whatsapp}>
        <Campo
          id="usuario-whatsapp"
          name="whatsapp"
          inputMode="tel"
          placeholder="(69) 90000-0000"
        />
      </Grupo>

      <Grupo
        rotulo="Papel"
        htmlFor="usuario-papel"
        obrigatorio
        erro={estado.erros?.papel}
        ajuda="Um usuário tem exatamente um papel."
      >
        <Selecao
          id="usuario-papel"
          name="papel"
          value={papel}
          onChange={(e) => setPapel(e.target.value)}
        >
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_DO_PAPEL[p]}
            </option>
          ))}
        </Selecao>
      </Grupo>

      {exigeRegional ? (
        <Grupo
          rotulo="Regional"
          htmlFor="usuario-regional"
          obrigatorio
          erro={estado.erros?.regionalId}
        >
          <Selecao id="usuario-regional" name="regionalId" defaultValue="">
            <option value="" disabled>
              Escolha a regional
            </option>
            {regionais.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
        </Grupo>
      ) : (
        <input type="hidden" name="regionalId" value="" />
      )}

      {exigeLoja ? (
        <Grupo rotulo="Loja" htmlFor="usuario-loja" obrigatorio erro={estado.erros?.lojaId}>
          <Selecao id="usuario-loja" name="lojaId" defaultValue="">
            <option value="" disabled>
              Escolha a loja
            </option>
            {lojas
              .filter((l) => l.ativo)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.nome}
                </option>
              ))}
          </Selecao>
        </Grupo>
      ) : (
        <input type="hidden" name="lojaId" value="" />
      )}

      {exigeLoja || exigeRegional ? (
        <Aviso tom="informacao" className="mb-4">
          <p>
            Colaborador e gerente de loja precisam de loja. Gerente regional
            precisa de regional. Sem o vínculo, o servidor recusa o
            cadastro.
          </p>
        </Aviso>
      ) : null}

      <CaixaAtivo padrao />
      <AcoesDoPainel rotulo="Criar usuário" aoCancelar={aoCancelar} />
    </form>
  );
}

/* =========================================================
   Botões de desativação nas listagens
   ========================================================= */
type Alvo = 'usuario' | 'loja' | 'regional';

const ACAO_POR_ALVO = {
  usuario: alternarAtivoDeUsuario,
  loja: alternarAtivoDeLoja,
  regional: alternarAtivoDeRegional,
} as const;

export function BotaoDeAtivacao({
  alvo,
  id,
  ativo,
}: {
  alvo: Alvo;
  id: string;
  ativo: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [recado, setRecado] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Botao
        variante="contorno"
        tamanho="sm"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await ACAO_POR_ALVO[alvo](id);
            setRecado(r.mensagem ?? null);
          })
        }
      >
        {ativo ? 'Desativar' : 'Reativar'}
      </Botao>
      {recado ? (
        <span className="text-right text-corpo-sm text-texto-suave">{recado}</span>
      ) : null}
    </div>
  );
}
