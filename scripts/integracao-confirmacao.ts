/**
 * Teste de integração da change `confirmacao-convidado`, contra o banco real.
 *
 * Fica em `scripts/` e não em `tests/` pelo mesmo motivo do outro: precisa
 * de um Postgres acessível e escreve nele. Os testes de `npm test` são
 * puros e rodam em qualquer lugar.
 *
 *   npm run test:integracao:confirmacao
 *
 * Com o servidor no ar, também confere o HTML das telas de estado:
 *
 *   npm run build && npm start &
 *   BASE=http://localhost:3000 npm run test:integracao:confirmacao
 *
 * Tudo que ele cria leva o prefixo `[TESTE-CONF]` e é removido no fim —
 * menos os registros de auditoria, que são imutáveis por contrato.
 *
 * NÃO aponte `DATABASE_URL` para produção.
 */
import { config } from 'dotenv';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';

config({ path: '.env', quiet: true });

const MARCA = '[TESTE-CONF]';
const BASE = process.env.BASE ?? '';

let falhas = 0;
function checar(condicao: boolean, texto: string, detalhe = '') {
  if (!condicao) falhas++;
  console.log(
    `${condicao ? 'OK   ' : 'FALHA'} ${texto}${detalhe ? ` — ${detalhe}` : ''}`,
  );
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Completa os dois dígitos verificadores de uma base de 9 dígitos. */
function cpfDe(base: string): string {
  let d = base;
  for (const peso of [10, 11]) {
    let soma = 0;
    for (let i = 0; i < d.length; i++) soma += Number(d[i]) * (peso - i);
    const resto = (soma * 10) % 11;
    d += resto === 10 || resto === 11 ? '0' : String(resto);
  }
  return d;
}

const CPF = {
  a: cpfDe('100000001'),
  b: cpfDe('100000002'),
  c: cpfDe('100000003'),
  d: cpfDe('100000004'),
  e: cpfDe('100000005'),
  f: cpfDe('100000006'),
  g: cpfDe('100000007'),
  h: cpfDe('100000008'),
  i: cpfDe('100000009'),
  j: cpfDe('100000010'),
  k: cpfDe('100000011'),
  l: cpfDe('100000012'),
};

const TODOS_OS_CPFS = Object.values(CPF);

function dadosDe(cpf: string, extra: Record<string, unknown> = {}) {
  return {
    cpf,
    nome: `${MARCA} Produtor de Teste`,
    whatsapp: '(69) 99999-0000',
    cidade: 'Ji-Paraná',
    propriedade: 'Fazenda de Teste',
    atividade: 'corte',
    acompanhanteNome: 'Acompanhante de Teste',
    aceitePolitica: true,
    aceiteComunicacoes: false,
    ...extra,
  };
}

const PEDIDO_BASE = { ip: '203.0.113.7', userAgent: `${MARCA} navegador` };

async function main() {
  const { db, dbTx, fecharConexoes } = await import('@/lib/db');
  const {
    auditoria,
    confirmacao,
    convite,
    evento,
    loja,
    regional,
    user,
  } = await import('@/lib/db/schema');
  const {
    cancelarPeloConvidado,
    confirmacaoDoConvite,
    confirmarPresenca,
    cpfTemConfirmacaoAtiva,
    montarIngresso,
    recuperarIngresso,
    resolverConvite,
    totalDeConfirmacoesAtivas,
    ACOES_DO_CONVIDADO,
  } = await import('@/lib/palestras/servicos/confirmacao');
  const { transicionarConvite } = await import(
    '@/lib/palestras/estado-do-convite'
  );
  const { gerarCodigo } = await import('@/lib/palestras/codigo');
  const { gerarIngressoToken } = await import('@/lib/palestras/ingresso');
  const { deHoraLocal } = await import('@/lib/tempo');
  const { slugDisponivel } = await import('@/lib/palestras/slug');
  const {
    limparTentativas,
    registrarTentativa,
    verificarLimite,
  } = await import('@/lib/palestras/limite');

  let regionalId = '';
  let lojaId = '';
  let colaboradorId = '';
  let palestraId = '';
  let palestraVencidaId = '';

  /** Cria um convite novo, disponível, na palestra informada. */
  const novoConvite = async (eventoId = palestraId) => {
    const [linha] = await db()
      .insert(convite)
      .values({
        codigo: gerarCodigo(),
        eventoId,
        colaboradorId,
        estado: 'disponivel',
      })
      .returning({ id: convite.id, codigo: convite.codigo });
    return linha!;
  };

  const estadoDo = async (codigo: string) => {
    const [linha] = await db()
      .select({ estado: convite.estado })
      .from(convite)
      .where(eq(convite.codigo, codigo))
      .limit(1);
    return linha?.estado ?? null;
  };

  const limpar = async () => {
    const convites = await db()
      .select({ id: convite.id })
      .from(convite)
      .innerJoin(evento, eq(evento.id, convite.eventoId))
      .where(like(evento.cidade, `${MARCA}%`));
    const ids = convites.map((c) => c.id);
    if (ids.length) {
      await db().delete(confirmacao).where(inArray(confirmacao.conviteId, ids));
      await db().delete(convite).where(inArray(convite.id, ids));
    }
    await db().delete(confirmacao).where(inArray(confirmacao.cpf, TODOS_OS_CPFS));
    await db().delete(evento).where(like(evento.cidade, `${MARCA}%`));
    await db().delete(user).where(like(user.name, `${MARCA}%`));
    await db().delete(loja).where(like(loja.nome, `${MARCA}%`));
    await db().delete(regional).where(like(regional.nome, `${MARCA}%`));
  };

  try {
    console.log('== preparação ==');
    await limpar();

    const [r] = await db()
      .insert(regional)
      .values({ nome: `${MARCA} Regional` })
      .returning({ id: regional.id });
    regionalId = r!.id;

    const [l] = await db()
      .insert(loja)
      .values({
        regionalId,
        codigo: `${MARCA}-01`,
        nome: `${MARCA} Loja`,
        cidade: 'Ji-Paraná',
      })
      .returning({ id: loja.id });
    lojaId = l!.id;

    const [u] = await db()
      .insert(user)
      .values({
        name: `${MARCA} Colaborador`,
        cpf: cpfDe('100000099'),
        dataNascimento: '1985-03-15',
        papel: 'colaborador',
        lojaId,
      })
      .returning({ id: user.id });
    colaboradorId = u!.id;

    const slugs = (await db().select({ slug: evento.slug }).from(evento)).map(
      (e) => e.slug,
    );

    const daquiADoisDias = new Date(Date.now() + 2 * 86_400_000);
    const dataFutura = `${daquiADoisDias.toISOString().slice(0, 10)}T19:00`;
    const [futura] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-conf-futura', slugs),
        cidade: `${MARCA} Cidade Futura`,
        dataHora: deHoraLocal(dataFutura),
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 1, Centro',
        // Prazo folgado: o teste não pode depender de virada de dia.
        prazoConfirmacao: new Date(Date.now() + 36 * 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    palestraId = futura!.id;

    const [vencida] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-conf-vencida', [
          ...slugs,
          'teste-conf-futura',
        ]),
        cidade: `${MARCA} Cidade Vencida`,
        dataHora: new Date(Date.now() + 3_600_000),
        localNome: 'Local vencido',
        localEndereco: 'Rua vencida, 2',
        prazoConfirmacao: new Date(Date.now() - 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    palestraVencidaId = vencida!.id;

    checar(true, 'palestras, loja e colaborador de teste criados');

    /* =====================================================
       1. Confirmação — caminho feliz
       ===================================================== */
    console.log('\n== 1. confirmação ==');

    const c1 = await novoConvite();
    const r1 = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: c1.codigo,
      entrada: dadosDe(CPF.a),
    });

    checar(r1.ok, 'convite disponível aceita a confirmação');
    checar(
      (await estadoDo(c1.codigo)) === 'confirmado',
      'o convite passa de disponivel para confirmado',
    );

    const gravada = await confirmacaoDoConvite(c1.id);
    checar(gravada?.cpf === CPF.a, 'a confirmação fica vinculada ao CPF');
    checar(gravada?.ativa === true, 'a confirmação nasce ativa');

    const [evidencia] = await db()
      .select()
      .from(confirmacao)
      .where(eq(confirmacao.conviteId, c1.id))
      .limit(1);

    checar(
      evidencia?.aceitePoliticaVersao === '3.0',
      'grava a versão vigente da política',
      String(evidencia?.aceitePoliticaVersao),
    );
    checar(
      Boolean(evidencia?.aceitePoliticaEm),
      'grava data e hora do aceite',
    );
    checar(evidencia?.ip === PEDIDO_BASE.ip, 'grava o IP');
    checar(
      evidencia?.userAgent === PEDIDO_BASE.userAgent,
      'grava o agente de usuário',
    );
    checar(
      (evidencia?.aceitePoliticaTexto ?? '').includes(
        'Política de Privacidade',
      ),
      'grava o texto do aceite exibido',
    );
    checar(
      evidencia?.aceiteComunicacoes === false,
      'sem o opt-in, o registro indica que NÃO autorizou comunicações',
    );
    checar(
      (evidencia?.whatsapp ?? '') === '69999990000',
      'WhatsApp gravado só com dígitos',
      String(evidencia?.whatsapp),
    );
    checar(
      Buffer.from(evidencia?.ingressoToken ?? '', 'base64url').length === 32,
      'o ingresso_token tem 32 bytes',
    );

    /* --- opt-in marcado --- */
    const cOpt = await novoConvite();
    await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cOpt.codigo,
      entrada: dadosDe(CPF.b, { aceiteComunicacoes: true }),
    });
    const [comOptIn] = await db()
      .select({ optIn: confirmacao.aceiteComunicacoes })
      .from(confirmacao)
      .where(eq(confirmacao.conviteId, cOpt.id));
    checar(comOptIn?.optIn === true, 'com o opt-in, o registro indica que autorizou');

    /* --- ingresso montado --- */
    const conviteResolvido = await resolverConvite(c1.codigo);
    const ingresso = await montarIngresso(conviteResolvido!);
    checar(
      ingresso?.nomeDoAcompanhante === 'Acompanhante de Teste',
      'o ingresso traz o acompanhante informado',
    );
    checar(ingresso?.podeCancelar === true, 'dentro do prazo, oferece cancelar');

    /* =====================================================
       2. Validação no servidor
       ===================================================== */
    console.log('\n== 2. validação no servidor ==');

    const cInvalido = await novoConvite();

    const cpfRuim = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cInvalido.codigo,
      entrada: dadosDe('123.456.789-00'),
    });
    checar(
      !cpfRuim.ok && cpfRuim.motivo === 'dados-invalidos' && !!cpfRuim.erros?.cpf,
      'CPF com dígito verificador errado é recusado, apontando o campo',
    );

    const semAceite = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cInvalido.codigo,
      entrada: dadosDe(CPF.c, { aceitePolitica: false }),
    });
    checar(
      !semAceite.ok && !!semAceite.erros?.aceitePolitica,
      'o servidor recusa a confirmação sem aceite, mesmo contornando o navegador',
    );

    const semCampos = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cInvalido.codigo,
      entrada: dadosDe(CPF.c, {
        nome: '',
        cidade: '',
        propriedade: '',
        atividade: '',
      }),
    });
    checar(
      !semCampos.ok &&
        ['nome', 'cidade', 'propriedade', 'atividade'].every(
          (campo) => semCampos.erros?.[campo],
        ),
      'aponta cada campo obrigatório faltante',
    );

    checar(
      (await totalDeConfirmacoesAtivas(cInvalido.id)) === 0,
      'nenhuma confirmação foi gravada nas recusas de validação',
    );
    checar(
      (await estadoDo(cInvalido.codigo)) === 'disponivel',
      'o convite continua disponível depois das recusas',
    );

    /* =====================================================
       3. Trava do convite no primeiro CPF
       ===================================================== */
    console.log('\n== 3. trava no primeiro CPF ==');

    const outroCpf = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: c1.codigo,
      entrada: dadosDe(CPF.d),
    });
    checar(
      !outroCpf.ok && outroCpf.motivo === 'ja-utilizado',
      'outro CPF no mesmo link é recusado com "já utilizado"',
    );
    checar(
      !outroCpf.ok && !outroCpf.mensagem.includes(CPF.a.slice(0, 3)),
      'a recusa não devolve nenhum pedaço do CPF do titular',
    );

    const duplicado = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: c1.codigo,
      entrada: dadosDe(CPF.a),
    });
    checar(
      duplicado.ok && duplicado.repetida,
      'duplo toque do mesmo CPF devolve o ingresso, sem criar outra confirmação',
    );
    checar(
      duplicado.ok && duplicado.ingressoToken === gravada?.ingressoToken,
      'o duplo toque devolve o MESMO token',
    );
    checar(
      (await totalDeConfirmacoesAtivas(c1.id)) === 1,
      'continua existindo uma única confirmação ativa',
    );

    /* =====================================================
       4. Um CPF, uma palestra no circuito
       ===================================================== */
    console.log('\n== 4. CPF único no circuito ==');

    const cOutraPalestra = await novoConvite();
    const jaTem = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cOutraPalestra.codigo,
      entrada: dadosDe(CPF.a),
    });
    checar(
      !jaTem.ok && jaTem.motivo === 'cpf-ja-confirmado',
      'CPF com confirmação ativa é recusado em outro convite',
    );
    checar(
      !jaTem.ok && !/Cidade Futura|Cidade Vencida/.test(jaTem.mensagem),
      'a recusa NÃO revela em qual palestra o CPF já está confirmado',
    );

    /* =====================================================
       5. CONCORRÊNCIA
       ===================================================== */
    console.log('\n== 5. concorrência ==');

    /* ---- 5a. dois envios simultâneos no MESMO convite ---- */
    const RODADAS = 5;
    let okA = 0;
    let recusaA = 0;
    for (let i = 0; i < RODADAS; i++) {
      const alvo = await novoConvite();
      const cpfUm = cpfDe(`20000000${i}`);
      const cpfDois = cpfDe(`21000000${i}`);
      TODOS_OS_CPFS.push(cpfUm, cpfDois);

      const [x, y] = await Promise.all([
        confirmarPresenca({
          ...PEDIDO_BASE,
          codigo: alvo.codigo,
          entrada: dadosDe(cpfUm),
        }),
        confirmarPresenca({
          ...PEDIDO_BASE,
          codigo: alvo.codigo,
          entrada: dadosDe(cpfDois),
        }),
      ]);

      const vencedores = [x, y].filter((z) => z.ok).length;
      const ativas = await totalDeConfirmacoesAtivas(alvo.id);
      if (vencedores === 1 && ativas === 1) okA++;
      const perdedor = [x, y].find((z) => !z.ok);
      if (perdedor && !perdedor.ok && perdedor.motivo === 'ja-utilizado') {
        recusaA++;
      }
    }
    checar(
      okA === RODADAS,
      `${RODADAS} rodadas de envio simultâneo no mesmo convite: exatamente 1 confirmação em cada`,
      `${okA}/${RODADAS}`,
    );
    checar(
      recusaA === RODADAS,
      'o envio perdedor sempre recebe "convite já utilizado"',
      `${recusaA}/${RODADAS}`,
    );

    /* ---- 5b. mesmo CPF, convites DIFERENTES, simultâneos ---- */
    let okB = 0;
    let recusaB = 0;
    for (let i = 0; i < RODADAS; i++) {
      const um = await novoConvite();
      const dois = await novoConvite();
      const cpfRepetido = cpfDe(`22000000${i}`);
      TODOS_OS_CPFS.push(cpfRepetido);

      const [x, y] = await Promise.all([
        confirmarPresenca({
          ...PEDIDO_BASE,
          codigo: um.codigo,
          entrada: dadosDe(cpfRepetido),
        }),
        confirmarPresenca({
          ...PEDIDO_BASE,
          codigo: dois.codigo,
          entrada: dadosDe(cpfRepetido),
        }),
      ]);

      const [ativas] = await db()
        .select({ n: sql<number>`count(*)::int` })
        .from(confirmacao)
        .where(
          and(eq(confirmacao.cpf, cpfRepetido), eq(confirmacao.ativa, true)),
        );

      if ([x, y].filter((z) => z.ok).length === 1 && Number(ativas?.n) === 1) {
        okB++;
      }
      const perdedor = [x, y].find((z) => !z.ok);
      if (perdedor && !perdedor.ok && perdedor.motivo === 'cpf-ja-confirmado') {
        recusaB++;
      }
    }
    checar(
      okB === RODADAS,
      `${RODADAS} rodadas do mesmo CPF em convites diferentes: 1 confirmação ativa em cada`,
      `${okB}/${RODADAS}`,
    );
    checar(
      recusaB === RODADAS,
      'o envio perdedor sempre recebe "CPF já confirmado"',
      `${recusaB}/${RODADAS}`,
    );

    /* ---- 5c. prova de que quem decide é o BANCO, não a pré-checagem ----

       Nas rodadas acima, a pré-checagem da aplicação pode ter chegado
       antes em alguma delas. Os dois cenários abaixo tiram essa dúvida:
       a escrita concorrente fica ABERTA, sem commit, então a leitura da
       pré-checagem não a enxerga e passa — e a recusa só pode ter vindo
       da trava de linha e do índice único.                               */

    /* 5c-i. trava de linha (SELECT … FOR UPDATE) */
    const alvoTrava = await novoConvite();
    let liberarTrava!: () => void;
    const esperaTrava = new Promise<void>((resolver) => {
      liberarTrava = resolver;
    });

    const seguraConvite = dbTx().transaction(async (tx) => {
      await tx.execute(
        sql`select id from ${convite} where id = ${alvoTrava.id} for update`,
      );
      await tx
        .update(convite)
        .set({ estado: 'confirmado' })
        .where(eq(convite.id, alvoTrava.id));
      await tx.insert(confirmacao).values({
        conviteId: alvoTrava.id,
        cpf: CPF.e,
        nome: `${MARCA} Primeiro`,
        whatsapp: '69999990000',
        aceitePoliticaEm: new Date(),
        aceitePoliticaVersao: '3.0',
        ingressoToken: gerarIngressoToken(),
      });
      await esperaTrava;
    });

    await pausa(400);
    const bloqueado = confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: alvoTrava.codigo,
      entrada: dadosDe(CPF.f),
    });
    // Tempo de sobra para a pré-checagem rodar (e passar) e a transação
    // encostar no `FOR UPDATE`.
    await pausa(700);
    liberarTrava();
    await seguraConvite;
    const resultadoDaTrava = await bloqueado;

    checar(
      !resultadoDaTrava.ok && resultadoDaTrava.motivo === 'ja-utilizado',
      'com a escrita concorrente ainda sem commit, a trava de linha é quem recusa',
      resultadoDaTrava.ok ? 'passou!' : resultadoDaTrava.motivo,
    );
    checar(
      (await totalDeConfirmacoesAtivas(alvoTrava.id)) === 1,
      'o convite disputado terminou com uma única confirmação',
    );

    /* 5c-ii. índice único parcial de CPF */
    const alvoIndice = await novoConvite();
    const alvoIndiceDois = await novoConvite();
    let liberarIndice!: () => void;
    const esperaIndice = new Promise<void>((resolver) => {
      liberarIndice = resolver;
    });

    const seguraCpf = dbTx().transaction(async (tx) => {
      await tx
        .update(convite)
        .set({ estado: 'confirmado' })
        .where(eq(convite.id, alvoIndice.id));
      await tx.insert(confirmacao).values({
        conviteId: alvoIndice.id,
        cpf: CPF.g,
        nome: `${MARCA} Primeiro CPF`,
        whatsapp: '69999990000',
        aceitePoliticaEm: new Date(),
        aceitePoliticaVersao: '3.0',
        ingressoToken: gerarIngressoToken(),
      });
      await esperaIndice;
    });

    await pausa(400);
    const disputando = confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: alvoIndiceDois.codigo,
      entrada: dadosDe(CPF.g),
    });
    await pausa(700);
    liberarIndice();
    await seguraCpf;
    const resultadoDoIndice = await disputando;

    checar(
      !resultadoDoIndice.ok && resultadoDoIndice.motivo === 'cpf-ja-confirmado',
      'com a outra confirmação ainda sem commit, o índice único é quem recusa',
      resultadoDoIndice.ok ? 'passou!' : resultadoDoIndice.motivo,
    );
    checar(
      (await estadoDo(alvoIndiceDois.codigo)) === 'disponivel',
      'a violação de unicidade desfaz a transação inteira: o convite perdedor segue disponível',
    );
    const [ativasG] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(confirmacao)
      .where(and(eq(confirmacao.cpf, CPF.g), eq(confirmacao.ativa, true)));
    checar(
      Number(ativasG?.n) === 1,
      'existe exatamente uma confirmação ativa para aquele CPF',
      String(ativasG?.n),
    );

    /* 5c-iii. a restrição existe mesmo, e é a esperada */
    let codigoDoErro = '';
    let restricao = '';
    try {
      await db().insert(confirmacao).values({
        conviteId: alvoIndiceDois.id,
        cpf: CPF.g,
        nome: `${MARCA} Terceiro`,
        whatsapp: '69999990000',
        aceitePoliticaEm: new Date(),
        aceitePoliticaVersao: '3.0',
        ingressoToken: gerarIngressoToken(),
      });
    } catch (erro) {
      const e = erro as { code?: string; constraint?: string; message?: string };
      codigoDoErro = e.code ?? '';
      restricao = e.constraint ?? e.message ?? '';
    }
    checar(
      codigoDoErro === '23505' || /cpf_ativa/.test(restricao),
      'o banco recusa uma segunda confirmação ativa do mesmo CPF (23505)',
      `${codigoDoErro} ${restricao}`.trim(),
    );

    /* ---- trava de estado pelo helper, sem passar pelo serviço ---- */
    const alvoHelper = await novoConvite();
    const [h1, h2] = await Promise.all([
      transicionarConvite({
        alvo: { codigo: alvoHelper.codigo },
        para: 'confirmado',
        exigirEstadoAtual: ['disponivel'],
      }),
      transicionarConvite({
        alvo: { codigo: alvoHelper.codigo },
        para: 'confirmado',
        exigirEstadoAtual: ['disponivel'],
      }),
    ]);
    checar(
      [h1, h2].filter((x) => x.ok).length === 1,
      'duas transições simultâneas do mesmo convite: só uma passa',
    );

    /* =====================================================
       6. Prazo
       ===================================================== */
    console.log('\n== 6. prazo ==');

    const cVencido = await novoConvite(palestraVencidaId);
    const foraDoPrazo = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cVencido.codigo,
      entrada: dadosDe(CPF.h),
    });
    checar(
      !foraDoPrazo.ok && foraDoPrazo.motivo === 'prazo-vencido',
      'confirmação depois do prazo é recusada',
    );
    checar(
      (await resolverConvite(cVencido.codigo))?.estado === 'expirado',
      'a leitura já trata o convite vencido como expirado',
    );

    /* =====================================================
       7. Cancelamento pelo convidado
       ===================================================== */
    console.log('\n== 7. cancelamento ==');

    const cCancelar = await novoConvite();
    await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cCancelar.codigo,
      entrada: dadosDe(CPF.i),
    });

    const cancelamento = await cancelarPeloConvidado({ codigo: cCancelar.codigo });
    checar(cancelamento.ok, 'o titular cancela dentro do prazo');
    checar(
      (await estadoDo(cCancelar.codigo)) === 'cancelado',
      'o convite passa a cancelado',
    );

    const depois = await confirmacaoDoConvite(cCancelar.id);
    checar(depois?.ativa === false, 'a confirmação deixa de estar ativa');
    checar(
      depois !== null,
      'o registro original é preservado, não apagado',
    );

    const [conviteCancelado] = await db()
      .select({
        canceladoEm: convite.canceladoEm,
        motivo: convite.motivoCancelamento,
      })
      .from(convite)
      .where(eq(convite.id, cCancelar.id));
    checar(
      Boolean(conviteCancelado?.canceladoEm) &&
        /convidado/i.test(conviteCancelado?.motivo ?? ''),
      'grava data, hora e autoria do cancelamento',
    );

    checar(
      (await cpfTemConfirmacaoAtiva(CPF.i)) === false,
      'o CPF fica livre depois do cancelamento',
    );

    const cNovo = await novoConvite();
    const reconfirmou = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cNovo.codigo,
      entrada: dadosDe(CPF.i),
    });
    checar(reconfirmou.ok, 'o CPF liberado confirma em outro convite');

    const recancelar = await cancelarPeloConvidado({ codigo: cCancelar.codigo });
    checar(
      recancelar.ok && recancelar.jaEstavaCancelado,
      'cancelamento repetido é inofensivo: responde sem erro e nada muda',
    );

    const reconfirmar = await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cCancelar.codigo,
      entrada: dadosDe(CPF.j),
    });
    checar(
      !reconfirmar.ok && reconfirmar.motivo === 'cancelado',
      'convite cancelado não aceita nova confirmação',
    );
    checar(
      (await estadoDo(cCancelar.codigo)) === 'cancelado',
      'convite cancelado nunca volta a disponivel',
    );

    /* --- cancelamento depois do prazo --- */
    const cPrazo = await novoConvite(palestraVencidaId);
    await db().insert(confirmacao).values({
      conviteId: cPrazo.id,
      cpf: CPF.k,
      nome: `${MARCA} Fora do prazo`,
      whatsapp: '69999990000',
      aceitePoliticaEm: new Date(),
      aceitePoliticaVersao: '3.0',
      ingressoToken: gerarIngressoToken(),
    });
    await db()
      .update(convite)
      .set({ estado: 'confirmado' })
      .where(eq(convite.id, cPrazo.id));

    const tardio = await cancelarPeloConvidado({ codigo: cPrazo.codigo });
    checar(
      !tardio.ok && tardio.motivo === 'prazo-vencido',
      'cancelamento depois do prazo é recusado no servidor',
    );
    checar(
      (await confirmacaoDoConvite(cPrazo.id))?.ativa === true,
      'a confirmação permanece ativa depois da recusa',
    );
    const ingressoVencido = await montarIngresso(
      (await resolverConvite(cPrazo.codigo))!,
    );
    checar(
      ingressoVencido?.podeCancelar === false,
      'passado o prazo, o ingresso não oferece mais o cancelamento',
    );

    /* --- convite já utilizado no evento (estado `presente`) --- */
    const cPresente = await novoConvite();
    await confirmarPresenca({
      ...PEDIDO_BASE,
      codigo: cPresente.codigo,
      entrada: dadosDe(CPF.l),
    });
    await db()
      .update(convite)
      .set({ estado: 'presente' })
      .where(eq(convite.id, cPresente.id));

    const ingressoUsado = await montarIngresso(
      (await resolverConvite(cPresente.codigo))!,
    );
    checar(
      ingressoUsado !== null && ingressoUsado.estado === 'presente',
      'convite `presente` ainda mostra o ingresso ao titular',
    );
    checar(
      ingressoUsado?.podeCancelar === false,
      'convite `presente` não oferece cancelamento',
    );

    /* =====================================================
       8. Recuperação do ingresso
       ===================================================== */
    console.log('\n== 8. recuperação ==');

    const certo = await recuperarIngresso({ codigo: cNovo.codigo, cpf: CPF.i });
    checar(certo.ok, 'CPF e código corretos recuperam o ingresso');
    const tokenEsperado = (await confirmacaoDoConvite(cNovo.id))?.ingressoToken;
    checar(
      certo.ok && certo.ingressoToken === tokenEsperado,
      'recupera o MESMO ingresso, com o mesmo token',
    );

    const cpfErrado = await recuperarIngresso({
      codigo: cNovo.codigo,
      cpf: CPF.j,
    });
    const codigoErrado = await recuperarIngresso({
      codigo: 'ZZZZZZ',
      cpf: CPF.i,
    });
    checar(
      !cpfErrado.ok && !codigoErrado.ok,
      'CPF que não confere e código inexistente são recusados',
    );
    checar(
      !cpfErrado.ok &&
        !codigoErrado.ok &&
        cpfErrado.mensagem === codigoErrado.mensagem,
      'a resposta é a MESMA nos dois casos: não diz se o código existe',
    );

    const deCancelada = await recuperarIngresso({
      codigo: cCancelar.codigo,
      cpf: CPF.i,
    });
    checar(
      !deCancelada.ok && deCancelada.motivo === 'cancelado',
      'ingresso de confirmação cancelada não é recuperado',
    );

    /* =====================================================
       9. Auditoria
       ===================================================== */
    console.log('\n== 9. auditoria ==');

    const trilha = await db()
      .select()
      .from(auditoria)
      .where(eq(auditoria.acao, ACOES_DO_CONVIDADO.presencaConfirmada))
      .orderBy(desc(auditoria.criadoEm))
      .limit(20);

    checar(trilha.length > 0, 'a confirmação é registrada na auditoria');

    const serializado = JSON.stringify(trilha.map((t) => t.dadosJson));
    checar(
      !TODOS_OS_CPFS.some((cpf) => serializado.includes(cpf)),
      'nenhum CPF completo aparece no payload da auditoria',
    );
    checar(
      serializado.includes('cpfMascarado'),
      'o CPF entra mascarado, preservando a utilidade da trilha',
    );
    const tokens = await db()
      .select({ token: confirmacao.ingressoToken })
      .from(confirmacao)
      .where(inArray(confirmacao.cpf, TODOS_OS_CPFS));
    checar(
      !tokens.some((t) => serializado.includes(t.token)),
      'nenhum ingresso_token aparece na auditoria',
    );

    /* =====================================================
       10. Limite de requisições
       ===================================================== */
    console.log('\n== 10. limite de requisições ==');

    const chave = `${MARCA}:limite:${Date.now()}`;
    const politica = { maximo: 3, janelaSegundos: 60 };

    const inicial = await verificarLimite(chave, politica);
    checar(
      inicial.permitido && inicial.tentativasRestantes === 3,
      'chave nova começa com o teto inteiro disponível',
    );

    for (let i = 0; i < 3; i++) await registrarTentativa(chave);
    const estourado = await verificarLimite(chave, politica);
    checar(
      !estourado.permitido && estourado.tentativasRestantes === 0,
      'atingido o teto, o limite passa a recusar',
    );
    checar(
      estourado.liberadoEm instanceof Date,
      'a recusa informa quando o bloqueio cai',
    );

    await limparTentativas(chave);
    const limpo = await verificarLimite(chave, politica);
    checar(limpo.permitido, 'limpar as tentativas libera de novo');

    /* =====================================================
       11. HTML das telas (opcional, exige servidor no ar)
       ===================================================== */
    if (BASE) {
      console.log('\n== 11. telas, pelo HTTP ==');

      const titular = await confirmacaoDoConvite(cNovo.id);
      const [dadosDoTitular] = await db()
        .select()
        .from(confirmacao)
        .where(eq(confirmacao.conviteId, cNovo.id));

      const buscar = async (caminho: string) => {
        const t0 = Date.now();
        const resposta = await fetch(`${BASE}${caminho}`, {
          redirect: 'follow',
        });
        const corpo = await resposta.text();
        return { status: resposta.status, corpo, ms: Date.now() - t0 };
      };

      /* --- convite confirmado, aberto por quem NÃO é o titular --- */
      const alheio = await buscar(`/palestras/c/${cNovo.codigo}`);
      const proibidos: [string, string][] = [
        ['nome do titular', dadosDoTitular!.nome],
        ['CPF em dígitos', dadosDoTitular!.cpf],
        [
          'CPF mascarado',
          `${dadosDoTitular!.cpf.slice(0, 3)}.${dadosDoTitular!.cpf.slice(3, 6)}`,
        ],
        ['WhatsApp', dadosDoTitular!.whatsapp],
        ['acompanhante', dadosDoTitular!.acompanhanteNome ?? '@@nunca@@'],
        ['ingresso_token', titular!.ingressoToken],
        ['propriedade', dadosDoTitular!.propriedade ?? '@@nunca@@'],
      ];
      for (const [rotulo, valor] of proibidos) {
        checar(
          !alheio.corpo.includes(valor),
          `tela de "já utilizado" não traz ${rotulo} no código-fonte`,
        );
      }
      checar(
        !/data:image\/png;base64/.test(alheio.corpo),
        'tela de "já utilizado" não traz QR Code embutido',
      );
      checar(
        /já foi utilizado/i.test(alheio.corpo),
        'tela de "já utilizado" mostra o aviso correto',
      );
      checar(
        /noindex/.test(alheio.corpo),
        'a página do convite instrui os buscadores a não indexar',
      );

      /* --- código inexistente × convite cancelado ---

         Compara o HTML **renderizado**, que é o que o visitante recebe e
         o que um varredor compara. A carga de hidratação fica de fora
         desta igualdade por um motivo só: em desenvolvimento o React
         embute nela tempos de execução e rastros de pilha, que mudam a
         cada requisição — inclusive entre dois códigos inexistentes. Que
         ela não contenha dado pessoal é garantido pelas conferências
         acima, feitas sobre o corpo inteiro.                             */
      const inexistente = await buscar('/palestras/c/ZZZZZZ');
      const cancelado = await buscar(`/palestras/c/${cCancelar.codigo}`);
      const controle = await buscar('/palestras/c/WWWWWW');

      const renderizado = (html: string, codigo: string) => {
        const corte = html.indexOf('<script>(self.__next_f');
        return (corte > 0 ? html.slice(0, corte) : html)
          .split(codigo)
          .join('CODIGO')
          .replace(/\?v=\d+/g, '?v=0');
      };

      checar(
        renderizado(inexistente.corpo, 'ZZZZZZ') ===
          renderizado(controle.corpo, 'WWWWWW'),
        'controle: dois códigos inexistentes devolvem o mesmo HTML',
      );
      checar(
        renderizado(inexistente.corpo, 'ZZZZZZ') ===
          renderizado(cancelado.corpo, cCancelar.codigo),
        'código inexistente e convite cancelado devolvem HTML idêntico',
      );
      checar(
        inexistente.status === cancelado.status,
        'e o mesmo código de status',
        `${inexistente.status} × ${cancelado.status}`,
      );
      /* --- tempo de resposta ---

         Uma amostra só não diz nada: a primeira visita a uma rota em
         desenvolvimento compila, e a latência do Neon oscila. A
         comparação é entre MEDIANAS de várias medições, depois de as
         duas rotas estarem aquecidas.                                    */
      const mediana = async (caminho: string) => {
        await buscar(caminho); // aquece
        const amostras: number[] = [];
        for (let i = 0; i < 7; i++) amostras.push((await buscar(caminho)).ms);
        amostras.sort((x, y) => x - y);
        return amostras[3]!;
      };

      const tInexistente = await mediana('/palestras/c/ZZZZZZ');
      const tCancelado = await mediana(`/palestras/c/${cCancelar.codigo}`);
      const diferenca = Math.abs(tInexistente - tCancelado);
      checar(
        diferenca < 120,
        'e o mesmo tempo de resposta, dentro da tolerância',
        `mediana ${tInexistente}ms × ${tCancelado}ms (Δ ${diferenca}ms)`,
      );

      /* --- .ics não vira detector de códigos --- */
      const icsAlheio = await buscar(`/palestras/c/${cNovo.codigo}/agenda.ics`);
      const icsInexistente = await buscar('/palestras/c/ZZZZZZ/agenda.ics');
      checar(
        icsAlheio.status === 404 && icsInexistente.status === 404,
        'o .ics responde 404 sem o cookie do titular, exista o código ou não',
        `${icsAlheio.status} × ${icsInexistente.status}`,
      );

      /* --- recuperação e sitemap --- */
      const recuperacao = await buscar('/palestras/ingresso');
      checar(
        /noindex/.test(recuperacao.corpo),
        '/palestras/ingresso também leva noindex',
      );
      checar(
        /dpo@axiaagro\.com\.br/.test(recuperacao.corpo) &&
          /politica-de-privacidade/.test(recuperacao.corpo),
        'o rodapé público traz a política e o canal do encarregado',
      );

      const sitemap = await buscar('/sitemap.xml');
      checar(
        !/palestras\/c\//.test(sitemap.corpo) &&
          !/palestras\/ingresso/.test(sitemap.corpo),
        'as rotas de convite ficam fora do sitemap.xml',
      );
    } else {
      console.log(
        '\n(sem BASE: as conferências de HTML foram puladas — rode com ' +
          'BASE=http://localhost:3000 e o servidor no ar)',
      );
    }

    /* =====================================================
       12. Limpeza
       ===================================================== */
    console.log('\n== 12. limpeza ==');
    await limpar();
    const [restou] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(confirmacao)
      .where(inArray(confirmacao.cpf, TODOS_OS_CPFS));
    checar(Number(restou?.n) === 0, 'dados de teste removidos');
  } catch (erro) {
    falhas++;
    console.error('\nERRO:', erro);
    try {
      await limpar();
    } catch {
      console.error('(a limpeza também falhou)');
    }
  } finally {
    await fecharConexoes();
  }

  console.log(
    falhas === 0
      ? '\nTODOS OS CHECKS DE CONFIRMAÇÃO PASSARAM'
      : `\n${falhas} CHECK(S) FALHARAM`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
