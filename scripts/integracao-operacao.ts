/**
 * Teste de integração da change `operacao-evento`, contra o banco real.
 *
 * Fica em `scripts/` e não em `tests/` pelo mesmo motivo das changes
 * anteriores: precisa de um Postgres acessível e escreve nele. Os testes de
 * `npm test` são puros e rodam em qualquer lugar.
 *
 *   npm run test:integracao:operacao
 *
 * Tudo que ele cria leva o prefixo `[TESTE-OPER]` e é removido no fim —
 * menos os registros de auditoria, que são imutáveis por contrato.
 *
 * NÃO aponte `DATABASE_URL` para produção.
 */
import { config } from 'dotenv';
import { and, eq, inArray, like, notInArray, sql } from 'drizzle-orm';

import type { Escopo } from '@/lib/palestras/escopo';

config({ path: '.env', quiet: true });

const MARCA = '[TESTE-OPER]';

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

async function main() {
  const { db, dbTx, fecharConexoes } = await import('@/lib/db');
  const {
    auditoria,
    checkin,
    confirmacao,
    convite,
    evento,
    loja,
    lote,
    regional,
    user,
  } = await import('@/lib/db/schema');
  const {
    checkinManual,
    checkinPorToken,
    MENSAGENS_DE_CHECKIN,
  } = await import('@/lib/palestras/servicos/checkin');
  const {
    buscarConfirmadoPorCpf,
    buscarConfirmadosPorNome,
    dadosParaExportacaoCsv,
    listaDeImpressao,
    resumoNoEscopo,
  } = await import('@/lib/palestras/dados');
  const { SemAcesso } = await import('@/lib/palestras/escopo');
  const { ACOES } = await import('@/lib/palestras/auditoria');
  const { montarCsv, valorDeTextoForcado, BOM_UTF8, SEPARADOR_CSV } = await import(
    '@/lib/palestras/csv'
  );
  const { totalGerados } = await import('@/lib/palestras/taxas');
  const { gerarCodigo } = await import('@/lib/palestras/codigo');
  const { gerarIngressoToken } = await import('@/lib/palestras/ingresso');
  const { formatarCarimbo, formatarData, mesmoDiaCivil } = await import('@/lib/tempo');
  const { slugDisponivel } = await import('@/lib/palestras/slug');

  let regionalId = '';
  let lojaAId = '';
  let lojaBId = '';
  let lojaANome = '';
  let colaboradorAId = '';
  let colaboradorBId = '';
  let gerenteLojaAId = '';
  let gerenteRegionalId = '';
  let adminId = '';
  let recepcaoId = '';
  let palestraHojeId = '';
  let palestraHojeCidade = '';
  let palestraHojeDataHora: Date;
  let palestraOutraId = '';
  let palestraOutraCidade = '';
  let palestraAmanhaId = '';
  let palestraAmanhaDataHora: Date;

  let sufixo = 0;
  const proximoCpf = () => cpfDe(`5${String(700000 + sufixo++).padStart(8, '0')}`);

  /*
     Admin e Recepção são autores de check-in, e todo check-in grava uma
     linha de auditoria imutável (`palestra_auditoria`, `ator_id` -> este
     usuário). `ON DELETE SET NULL` exigiria um UPDATE na auditoria para
     apagá-los, e o gatilho de imutabilidade recusa esse UPDATE — a mesma
     situação que `painel-colaborador` já documentou para o autor de um
     cancelamento. A solução é a mesma: CPF fixo, reaproveitado entre
     execuções, em vez de um usuário novo por rodada. `limpar()` os
     mantém de propósito.
  */
  const CPF_ADMIN_FIXO = cpfDe('900000001');
  const CPF_RECEPCAO_FIXO = cpfDe('900000002');

  /** Convite já `confirmado`, com confirmação ativa e token pronto para check-in. */
  async function novoConfirmado(
    eventoId: string,
    /** Nulo é o convite avulso: gerado pela administração, sem colaborador. */
    colaboradorId: string | null,
    extra: Partial<{
      cpf: string;
      acompanhanteNome: string | null;
      propriedade: string;
      nome: string;
      loteId: string;
    }> = {},
  ) {
    const cpf = extra.cpf ?? proximoCpf();
    const [c] = await db()
      .insert(convite)
      .values({
        codigo: gerarCodigo(),
        eventoId,
        colaboradorId,
        loteId: extra.loteId ?? null,
        estado: 'confirmado',
      })
      .returning({ id: convite.id, codigo: convite.codigo });
    const token = gerarIngressoToken();
    await db()
      .insert(confirmacao)
      .values({
        conviteId: c!.id,
        cpf,
        nome: extra.nome ?? `${MARCA} Convidado ${cpf.slice(0, 4)}`,
        whatsapp: '69999990000',
        propriedade: extra.propriedade ?? 'Fazenda de Teste',
        atividade: 'corte',
        cidade: 'Ji-Paraná',
        acompanhanteNome: extra.acompanhanteNome ?? null,
        ativa: true,
        aceitePoliticaEm: new Date(),
        aceitePoliticaVersao: '3.0',
        ingressoToken: token,
      });
    return { conviteId: c!.id, codigo: c!.codigo, token, cpf };
  }

  /** Convite `disponivel`, sem confirmação — para a exportação CSV. */
  async function novoDisponivel(eventoId: string, colaboradorId: string) {
    const [c] = await db()
      .insert(convite)
      .values({ codigo: gerarCodigo(), eventoId, colaboradorId, estado: 'disponivel' })
      .returning({ id: convite.id, codigo: convite.codigo });
    return { conviteId: c!.id, codigo: c!.codigo };
  }

  const contarCheckins = async (conviteId: string) => {
    const linhas = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(checkin)
      .where(eq(checkin.conviteId, conviteId));
    return Number(linhas[0]?.n ?? 0);
  };

  const estadoGravadoDe = async (conviteId: string) => {
    const [linha] = await db()
      .select({ estado: convite.estado })
      .from(convite)
      .where(eq(convite.id, conviteId))
      .limit(1);
    return linha?.estado ?? null;
  };

  /** Reaproveita o usuário pelo CPF fixo, ou cria na primeira execução. */
  const usuarioFixo = async (cpf: string, nome: string, papel: string) => {
    const [existente] = await db().select({ id: user.id }).from(user).where(eq(user.cpf, cpf)).limit(1);
    if (existente) return existente.id;
    const [criado] = await db()
      .insert(user)
      .values({ name: nome, cpf, dataNascimento: '1985-03-15', papel })
      .returning({ id: user.id });
    return criado!.id;
  };

  const limpar = async () => {
    const convites = await db()
      .select({ id: convite.id })
      .from(convite)
      .innerJoin(evento, eq(evento.id, convite.eventoId))
      .where(like(evento.cidade, `${MARCA}%`));
    const ids = convites.map((c) => c.id);
    if (ids.length) {
      await db().delete(checkin).where(inArray(checkin.conviteId, ids));
      await db().delete(confirmacao).where(inArray(confirmacao.conviteId, ids));
      await db().delete(convite).where(inArray(convite.id, ids));
    }
    // Os lotes vêm antes do evento: `palestra_lote.evento_id` é
    // `on delete restrict`, e `palestra_convite.lote_id` é `set null`, então
    // apagar os convites acima não apaga o lote — e o lote órfão barraria o
    // `delete` do evento.
    const eventosDeTeste = await db()
      .select({ id: evento.id })
      .from(evento)
      .where(like(evento.cidade, `${MARCA}%`));
    if (eventosDeTeste.length) {
      await db()
        .delete(lote)
        .where(
          inArray(
            lote.eventoId,
            eventosDeTeste.map((e) => e.id),
          ),
        );
    }
    await db().delete(evento).where(like(evento.cidade, `${MARCA}%`));
    // Admin e Recepção ficam de fora, por papel — não só os dois CPFs
    // fixos de hoje: qualquer usuário `admin`/`recepcao` de execuções
    // passadas deste script pode ter virado ator de check-in, e a
    // auditoria que o referencia é imutável (ver comentário acima de
    // CPF_ADMIN_FIXO). Excluir por papel é o que torna a limpeza segura
    // mesmo depois de uma execução antiga com outro esquema de CPF.
    await db()
      .delete(user)
      .where(
        and(
          like(user.name, `${MARCA}%`),
          notInArray(user.papel, ['admin', 'recepcao']),
        ),
      );
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

    const [la] = await db()
      .insert(loja)
      .values({ regionalId, codigo: `${MARCA}-A`, nome: `${MARCA} Loja A`, cidade: 'Ji-Paraná' })
      .returning({ id: loja.id, nome: loja.nome });
    lojaAId = la!.id;
    lojaANome = la!.nome;

    const [lb] = await db()
      .insert(loja)
      .values({ regionalId, codigo: `${MARCA}-B`, nome: `${MARCA} Loja B`, cidade: 'Vilhena' })
      .returning({ id: loja.id });
    lojaBId = lb!.id;

    const usuarios = await db()
      .insert(user)
      .values([
        {
          name: `${MARCA} Colaborador A`,
          cpf: cpfDe('600000001'),
          dataNascimento: '1985-03-15',
          papel: 'colaborador',
          lojaId: lojaAId,
        },
        {
          name: `${MARCA} Colaborador B`,
          cpf: cpfDe('600000002'),
          dataNascimento: '1985-03-15',
          papel: 'colaborador',
          lojaId: lojaBId,
        },
        {
          name: `${MARCA} Gerente Loja A`,
          cpf: cpfDe('600000003'),
          dataNascimento: '1985-03-15',
          papel: 'gerente_loja',
          lojaId: lojaAId,
        },
        {
          name: `${MARCA} Gerente Regional`,
          cpf: cpfDe('600000004'),
          dataNascimento: '1985-03-15',
          papel: 'gerente_regional',
          regionalId,
        },
      ])
      .returning({ id: user.id, papel: user.papel });

    colaboradorAId = usuarios[0]!.id;
    colaboradorBId = usuarios[1]!.id;
    gerenteLojaAId = usuarios[2]!.id;
    gerenteRegionalId = usuarios[3]!.id;
    // CPF fixo, reaproveitado entre execuções (ver comentário acima).
    adminId = await usuarioFixo(CPF_ADMIN_FIXO, `${MARCA} Admin (fixo)`, 'admin');
    recepcaoId = await usuarioFixo(CPF_RECEPCAO_FIXO, `${MARCA} Recepção (fixo)`, 'recepcao');

    const slugs = (await db().select({ slug: evento.slug }).from(evento)).map((e) => e.slug);

    // Palestra "de hoje": daqui a 3h, ainda no mesmo dia civil de Porto
    // Velho na imensa maioria das execuções. Prazo folgado (1h à frente),
    // para um convite `disponivel` criado no meio do teste não aparecer
    // como `expirado` na exportação (o que quebraria o teste 9.5/CSV).
    palestraHojeDataHora = new Date(Date.now() + 3 * 3_600_000);
    palestraHojeCidade = `${MARCA} Cidade Hoje`;
    const [pHoje] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-oper-hoje', slugs),
        cidade: palestraHojeCidade,
        dataHora: palestraHojeDataHora,
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 1',
        prazoConfirmacao: new Date(Date.now() + 2 * 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    palestraHojeId = pHoje!.id;

    palestraOutraCidade = `${MARCA} Cidade Outra`;
    const [pOutra] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-oper-outra', [...slugs, 'teste-oper-hoje']),
        cidade: palestraOutraCidade,
        dataHora: new Date(Date.now() + 4 * 3_600_000),
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 2',
        prazoConfirmacao: new Date(Date.now() + 1 * 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    palestraOutraId = pOutra!.id;

    // Amanhã de verdade (26h à frente): fora do dia civil de hoje mesmo
    // perto da virada da meia-noite.
    palestraAmanhaDataHora = new Date(Date.now() + 26 * 3_600_000);
    const [pAmanha] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-oper-amanha', [
          ...slugs,
          'teste-oper-hoje',
          'teste-oper-outra',
        ]),
        cidade: `${MARCA} Cidade Amanhã`,
        dataHora: palestraAmanhaDataHora,
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 3',
        prazoConfirmacao: new Date(Date.now() + 25 * 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    palestraAmanhaId = pAmanha!.id;

    checar(
      mesmoDiaCivil(new Date(), palestraHojeDataHora),
      'a palestra de teste "de hoje" cai no dia civil de hoje, em Porto Velho',
    );
    checar(
      !mesmoDiaCivil(new Date(), palestraAmanhaDataHora),
      'a palestra de teste "de amanhã" cai fora do dia civil de hoje',
    );

    const atorRecepcao = { id: recepcaoId, nome: `${MARCA} Recepção` };
    const atorAdmin = { id: adminId, nome: `${MARCA} Admin` };

    const escopoAdmin: Escopo = { usuarioId: adminId, papel: 'admin', regionalId: null, lojaId: null };
    const escopoRecepcao: Escopo = {
      usuarioId: recepcaoId,
      papel: 'recepcao',
      regionalId: null,
      lojaId: null,
    };
    const escopoColaboradorA: Escopo = {
      usuarioId: colaboradorAId,
      papel: 'colaborador',
      regionalId: null,
      lojaId: lojaAId,
    };
    const escopoGerenteLojaA: Escopo = {
      usuarioId: gerenteLojaAId,
      papel: 'gerente_loja',
      regionalId: null,
      lojaId: lojaAId,
    };
    const escopoGerenteRegional: Escopo = {
      usuarioId: gerenteRegionalId,
      papel: 'gerente_regional',
      regionalId,
      lojaId: null,
    };

    checar(true, 'estrutura, usuários e três palestras de teste criados');

    /* =====================================================
       4. Registro do check-in — caminho feliz (verde)
       ===================================================== */
    console.log('\n== 4. check-in válido (verde) ==');

    const cVerde = await novoConfirmado(palestraHojeId, colaboradorAId, {
      acompanhanteNome: `${MARCA} Acompanhante Verde`,
    });
    const antesDoCheckin = performance.now();
    const rVerde = await checkinPorToken(cVerde.token, palestraHojeId, atorRecepcao);
    const duracaoMs = performance.now() - antesDoCheckin;

    checar(rVerde.ok && rVerde.cor === 'verde', 'convite confirmado, palestra e dia certos: resultado verde');
    if (rVerde.ok) {
      checar(rVerde.titular.startsWith(MARCA), 'traz o nome do titular');
      checar(rVerde.acompanhante === `${MARCA} Acompanhante Verde`, 'traz o nome do acompanhante');
      checar(rVerde.lojaNome === lojaANome, 'traz a loja de origem');
      checar(rVerde.colaboradorNome.includes('Colaborador A'), 'traz o colaborador de origem');
    }
    checar(
      (await estadoGravadoDe(cVerde.conviteId)) === 'presente',
      'o convite passa a `presente`',
    );
    checar(
      duracaoMs < 2000,
      'resultado em menos de 2 segundos (meta da spec, em conexão local)',
      `${Math.round(duracaoMs)} ms`,
    );

    // Registro do check-in: convite, autor, data/hora, método (task 4.5).
    const [linhaDoCheckin] = await db()
      .select()
      .from(checkin)
      .where(eq(checkin.conviteId, cVerde.conviteId))
      .limit(1);
    checar(linhaDoCheckin?.conviteId === cVerde.conviteId, 'grava o convite');
    checar(linhaDoCheckin?.feitoPor === recepcaoId, 'grava quem fez o check-in');
    checar(Boolean(linhaDoCheckin?.feitoEm), 'grava a data e a hora');
    checar(linhaDoCheckin?.metodo === 'qr', 'grava o método (qr)');

    // Auditoria (task 4.7).
    const [linhaDeAuditoria] = await db()
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.entidade, 'palestra_convite'),
          eq(auditoria.entidadeId, cVerde.conviteId),
          eq(auditoria.acao, ACOES.checkinRegistrado),
        ),
      )
      .limit(1);
    checar(Boolean(linhaDeAuditoria), 'o check-in é registrado na auditoria');
    checar(linhaDeAuditoria?.atorId === recepcaoId, 'a auditoria registra o autor certo');

    /* =====================================================
       4/5. Segunda leitura — já utilizado (amarelo)
       ===================================================== */
    console.log('\n== 5. segunda leitura do mesmo QR (amarelo) ==');

    const primeiroCheckinGravadoEm = new Date(linhaDoCheckin!.feitoEm);
    const rAmarelo = await checkinPorToken(cVerde.token, palestraHojeId, atorRecepcao);
    checar(!rAmarelo.ok && rAmarelo.cor === 'amarelo', 'segunda leitura: resultado amarelo');
    if (!rAmarelo.ok && rAmarelo.cor === 'amarelo') {
      checar(
        Math.abs(rAmarelo.primeiroCheckinEm.getTime() - primeiroCheckinGravadoEm.getTime()) < 1000,
        'informa a data e a hora do PRIMEIRO check-in',
      );
      checar(
        rAmarelo.mensagem.includes(formatarData(primeiroCheckinGravadoEm)),
        'a mensagem cita a data do primeiro check-in',
      );
    }
    checar(
      (await contarCheckins(cVerde.conviteId)) === 1,
      'nenhum novo registro de check-in foi criado na segunda leitura',
    );

    /* =====================================================
       5. Vermelho: cancelado, expirado, outra palestra, token desconhecido
       ===================================================== */
    console.log('\n== 5. resultados vermelhos ==');

    const cCancelado = await novoConfirmado(palestraHojeId, colaboradorAId);
    await db().update(convite).set({ estado: 'cancelado', canceladoEm: new Date() }).where(eq(convite.id, cCancelado.conviteId));
    const rCancelado = await checkinPorToken(cCancelado.token, palestraHojeId, atorRecepcao);
    checar(
      !rCancelado.ok && rCancelado.cor === 'vermelho' && rCancelado.motivo === 'cancelado',
      'convite cancelado: vermelho, motivo "cancelado"',
    );

    const cExpirado = await novoConfirmado(palestraHojeId, colaboradorAId);
    await db().update(convite).set({ estado: 'expirado' }).where(eq(convite.id, cExpirado.conviteId));
    const rExpirado = await checkinPorToken(cExpirado.token, palestraHojeId, atorRecepcao);
    checar(
      !rExpirado.ok && rExpirado.cor === 'vermelho' && rExpirado.motivo === 'expirado',
      'convite expirado: vermelho, motivo "expirado"',
    );

    const cOutraPalestra = await novoConfirmado(palestraOutraId, colaboradorAId);
    const rOutraPalestra = await checkinPorToken(cOutraPalestra.token, palestraHojeId, atorRecepcao);
    checar(
      !rOutraPalestra.ok && rOutraPalestra.cor === 'vermelho' && rOutraPalestra.motivo === 'outra-palestra',
      'convite de outra palestra: vermelho, motivo "outra-palestra"',
    );
    checar(
      !rOutraPalestra.ok && !rOutraPalestra.mensagem.includes(palestraOutraCidade),
      'a mensagem NÃO revela qual é a outra palestra',
    );

    const rTokenDesconhecido = await checkinPorToken(
      'token-que-nao-existe-em-lugar-nenhum',
      palestraHojeId,
      atorRecepcao,
    );
    checar(
      !rTokenDesconhecido.ok &&
        rTokenDesconhecido.cor === 'vermelho' &&
        rTokenDesconhecido.motivo === 'token-desconhecido',
      'token desconhecido: vermelho, motivo "token-desconhecido"',
    );
    checar(
      !rTokenDesconhecido.ok && rTokenDesconhecido.mensagem === MENSAGENS_DE_CHECKIN.tokenDesconhecido,
      'usa a mensagem padrão de token desconhecido',
    );

    /* =====================================================
       4.3 / D4 — fora do dia da palestra
       ===================================================== */
    console.log('\n== check-in fora do dia da palestra ==');

    const cAmanha = await novoConfirmado(palestraAmanhaId, colaboradorAId);
    const rForaDoDia = await checkinPorToken(cAmanha.token, palestraAmanhaId, atorRecepcao);
    checar(
      !rForaDoDia.ok && rForaDoDia.cor === 'vermelho' && rForaDoDia.motivo === 'fora-do-dia',
      'convite de palestra de amanhã, lido hoje: vermelho, motivo "fora-do-dia"',
    );
    checar(
      !rForaDoDia.ok &&
        rForaDoDia.mensagem.includes(formatarData(palestraAmanhaDataHora)),
      'a mensagem diz explicitamente a data em que o convite vale',
      !rForaDoDia.ok ? rForaDoDia.mensagem : '',
    );
    checar(
      (await estadoGravadoDe(cAmanha.conviteId)) === 'confirmado',
      'o convite recusado por dia errado continua `confirmado` (nada foi alterado)',
    );

    /* =====================================================
       4.6 / 22 — concorrência: duas leituras simultâneas do mesmo QR
       ===================================================== */
    console.log('\n== concorrência: duas leituras simultâneas do mesmo QR ==');

    const RODADAS = 5;
    let umUnicoRegistro = 0;
    let outroAmarelo = 0;
    for (let i = 0; i < RODADAS; i++) {
      const c = await novoConfirmado(palestraHojeId, colaboradorAId);
      const [x, y] = await Promise.all([
        checkinPorToken(c.token, palestraHojeId, atorRecepcao),
        checkinPorToken(c.token, palestraHojeId, atorAdmin),
      ]);
      const verdes = [x, y].filter((z) => z.ok).length;
      const registros = await contarCheckins(c.conviteId);
      if (verdes === 1 && registros === 1) umUnicoRegistro++;
      const perdedor = [x, y].find((z) => !z.ok);
      if (perdedor && !perdedor.ok && perdedor.cor === 'amarelo') outroAmarelo++;
    }
    checar(
      umUnicoRegistro === RODADAS,
      `${RODADAS} rodadas de leitura simultânea (dois "dispositivos") do mesmo QR: exatamente 1 check-in em cada`,
      `${umUnicoRegistro}/${RODADAS}`,
    );
    checar(
      outroAmarelo === RODADAS,
      'o dispositivo que perde a corrida sempre recebe "já utilizado" (amarelo)',
      `${outroAmarelo}/${RODADAS}`,
    );

    /* ---- prova de que quem decide é a TRAVA DE LINHA, não a aplicação ----
       Mesmo padrão de `confirmacao-convidado`: segura uma transação aberta,
       sem commit, sobre o convite já marcado `presente` com o check-in já
       inserido, e só então dispara a segunda leitura. Ela fica bloqueada
       até a primeira liberar — a prova de que é o `SELECT … FOR UPDATE`
       (D3 do design), não uma checagem prévia da aplicação, que serializa
       as duas leituras. */
    const alvoDaTrava = await novoConfirmado(palestraHojeId, colaboradorAId);
    let liberarTrava!: () => void;
    const esperaTrava = new Promise<void>((resolver) => {
      liberarTrava = resolver;
    });

    const seguraLinha = dbTx().transaction(async (tx) => {
      await tx.execute(sql`select id from ${convite} where id = ${alvoDaTrava.conviteId} for update`);
      await tx.update(convite).set({ estado: 'presente' }).where(eq(convite.id, alvoDaTrava.conviteId));
      await tx.insert(checkin).values({
        conviteId: alvoDaTrava.conviteId,
        feitoPor: recepcaoId,
        metodo: 'qr',
      });
      await esperaTrava;
    });

    await pausa(400);
    const bloqueado = checkinPorToken(alvoDaTrava.token, palestraHojeId, atorAdmin);
    // Tempo de sobra para a segunda leitura encostar no FOR UPDATE.
    await pausa(700);
    liberarTrava();
    await seguraLinha;
    const resultadoDaTrava = await bloqueado;

    checar(
      !resultadoDaTrava.ok && resultadoDaTrava.cor === 'amarelo',
      'com a escrita concorrente ainda sem commit, a trava de linha (não a aplicação) é quem recusa a segunda leitura',
      resultadoDaTrava.ok ? 'passou!' : resultadoDaTrava.cor,
    );
    checar(
      (await contarCheckins(alvoDaTrava.conviteId)) === 1,
      'o convite disputado terminou com um único registro de check-in',
    );

    /* ---- a restrição única de `palestra_checkin (convite_id)` existe mesmo ---- */
    const alvoDoIndice = await novoConfirmado(palestraHojeId, colaboradorAId);
    await checkinManual(alvoDoIndice.conviteId, palestraHojeId, atorRecepcao);
    let codigoDoErro = '';
    let restricao = '';
    try {
      await db().insert(checkin).values({
        conviteId: alvoDoIndice.conviteId,
        feitoPor: recepcaoId,
        metodo: 'qr',
      });
    } catch (erro) {
      const e = erro as { code?: string; constraint?: string; message?: string };
      codigoDoErro = e.code ?? '';
      restricao = e.constraint ?? e.message ?? '';
    }
    checar(
      codigoDoErro === '23505' || /checkin_convite/.test(restricao),
      'o banco recusa um segundo registro de check-in para o mesmo convite (23505)',
      `${codigoDoErro} ${restricao}`.trim(),
    );

    /* =====================================================
       11.4 — simulação de fila: leituras em SEQUÊNCIA, tempo por pessoa

       Não substitui o ensaio com um celular real na porta (isso é tarefa
       de pessoa, não de script — ver docs/OPERACAO-EVENTO.md). O que dá
       para provar daqui: o tempo de round-trip real contra o Neon, um
       check-in de cada vez, como aconteceria numa fila com um único
       operador — sem a otimização (ou o ruído) de disparos em paralelo.
       ===================================================== */
    console.log('\n== 11.4 simulação de fila (leituras em sequência) ==');

    const TAMANHO_DA_FILA = 8;
    const tempos: number[] = [];
    for (let i = 0; i < TAMANHO_DA_FILA; i++) {
      const c = await novoConfirmado(palestraHojeId, colaboradorAId);
      const inicio = performance.now();
      const resultado = await checkinPorToken(c.token, palestraHojeId, atorRecepcao);
      tempos.push(performance.now() - inicio);
      if (!resultado.ok) falhas++; // cada leitura da fila deveria ser verde
    }
    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    const pior = Math.max(...tempos);
    checar(
      pior < 2000,
      `fila de ${TAMANHO_DA_FILA} pessoas em sequência: todas abaixo de 2s`,
      `média ${Math.round(media)} ms · pior caso ${Math.round(pior)} ms`,
    );

    /* =====================================================
       6. Busca manual e check-in manual
       ===================================================== */
    console.log('\n== 6. busca manual ==');

    const cBusca = await novoConfirmado(palestraHojeId, colaboradorAId, {
      nome: `${MARCA} Zezinho da Busca`,
      acompanhanteNome: `${MARCA} Acompanhante da Busca`,
    });

    const porCpf = await buscarConfirmadoPorCpf(escopoRecepcao, palestraHojeId, cBusca.cpf);
    checar(porCpf?.conviteId === cBusca.conviteId, 'busca por CPF encontra o confirmado certo');
    checar(
      JSON.stringify(Object.keys(porCpf ?? {}).sort()) ===
        JSON.stringify(['acompanhante', 'conviteId', 'cpf', 'titular'].sort()),
      'a busca devolve só titular, acompanhante, CPF (mascarado) e o id do convite — nada de WhatsApp, cidade, propriedade ou atividade',
    );
    checar(
      /^\*\*\*\.\d{3}\.\d{3}-\*\*$/.test(porCpf?.cpf ?? ''),
      'o CPF vem mascarado no formato do PRD',
      porCpf?.cpf,
    );

    const foraDaPalestra = await buscarConfirmadoPorCpf(escopoRecepcao, palestraOutraId, cBusca.cpf);
    checar(foraDaPalestra === null, 'busca por CPF restrita à palestra escolhida: não aparece em outra palestra');

    const porNome = await buscarConfirmadosPorNome(escopoRecepcao, palestraHojeId, 'Zezinho da Busca');
    checar(
      porNome.some((r) => r.conviteId === cBusca.conviteId),
      'busca por nome parcial encontra o confirmado certo',
    );
    const porNomeForaDaPalestra = await buscarConfirmadosPorNome(
      escopoRecepcao,
      palestraOutraId,
      'Zezinho da Busca',
    );
    checar(
      porNomeForaDaPalestra.length === 0,
      'busca por nome também restrita à palestra escolhida',
    );

    let recusaDeColaboradorNaBusca = false;
    try {
      await buscarConfirmadoPorCpf(escopoColaboradorA, palestraHojeId, cBusca.cpf);
    } catch (erro) {
      recusaDeColaboradorNaBusca = erro instanceof SemAcesso;
    }
    checar(recusaDeColaboradorNaBusca, 'colaborador não pode usar a busca manual do check-in (SemAcesso)');

    // Check-in a partir da busca manual — mesmo registro do QR, exceto o método.
    const rManual = await checkinManual(cBusca.conviteId, palestraHojeId, atorRecepcao);
    checar(rManual.ok && rManual.cor === 'verde', 'check-in pela busca manual: também resulta em verde');
    const [linhaManual] = await db()
      .select()
      .from(checkin)
      .where(eq(checkin.conviteId, cBusca.conviteId))
      .limit(1);
    checar(linhaManual?.metodo === 'manual', 'o método fica marcado como manual');
    checar(
      Boolean(linhaManual?.conviteId) && Boolean(linhaManual?.feitoPor) && Boolean(linhaManual?.feitoEm),
      'o registro manual tem convite, autor e data/hora — igual ao do QR',
    );
    checar(
      (await estadoGravadoDe(cBusca.conviteId)) === 'presente',
      'o convite também passa a `presente` pelo caminho manual',
    );

    /* =====================================================
       9.5/9.6 — confirmado sem check-in é ausência; soma bate com o total
       ===================================================== */
    console.log('\n== 9. números por palestra ==');

    const cSemCheckin = await novoConfirmado(palestraHojeId, colaboradorAId);
    checar(
      (await estadoGravadoDe(cSemCheckin.conviteId)) === 'confirmado',
      'confirmado sem check-in permanece `confirmado` (tratado como ausência nos números)',
    );

    const cDisponivel = await novoDisponivel(palestraHojeId, colaboradorAId);
    const cDaLojaB = await novoConfirmado(palestraHojeId, colaboradorBId);

    const [totalNaPalestra] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, palestraHojeId));
    const resumoFinal = await resumoNoEscopo(escopoAdmin, palestraHojeId);
    checar(
      Number(totalNaPalestra?.n) === totalGerados(resumoFinal),
      'a soma de confirmados, presentes, cancelados, expirados e disponíveis bate com o total de convites gerados na palestra',
      `${totalNaPalestra?.n} vs ${totalGerados(resumoFinal)}`,
    );

    /* =====================================================
       7. Lista para impressão
       ===================================================== */
    console.log('\n== 7. lista para impressão ==');

    const listaAdmin = await listaDeImpressao(escopoAdmin, palestraHojeId);
    checar(
      listaAdmin.every((l) => /^\*\*\*\./.test(l.cpf)),
      'CPF sempre mascarado na lista impressa, inclusive para o Admin (D6)',
    );
    checar(
      !listaAdmin.some((l) => l.conviteId === cCancelado.conviteId),
      'convite cancelado não aparece na lista impressa',
    );
    checar(
      !listaAdmin.some((l) => l.conviteId === cDisponivel.conviteId),
      'convite disponível (não confirmado) não aparece na lista impressa',
    );
    const nomes = listaAdmin.map((l) => l.titular);
    const nomesOrdenados = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    checar(
      JSON.stringify(nomes) === JSON.stringify(nomesOrdenados),
      'a lista sai em ordem alfabética pelo nome do titular',
    );

    const listaGerenteLojaA = await listaDeImpressao(escopoGerenteLojaA, palestraHojeId);
    checar(
      listaGerenteLojaA.length > 0 && listaGerenteLojaA.every((l) => l.lojaNome === lojaANome),
      'gerente de loja só vê, na lista impressa, os confirmados da própria loja',
    );
    checar(
      !listaGerenteLojaA.some((l) => l.conviteId === cDaLojaB.conviteId),
      'confirmado da loja B não aparece na lista impressa do gerente da loja A',
    );

    const listaRecepcao = await listaDeImpressao(escopoRecepcao, palestraHojeId);
    checar(
      listaRecepcao.some((l) => l.conviteId === cDaLojaB.conviteId),
      'a recepção vê a palestra inteira na lista impressa, sem filtro de origem',
    );

    let recusaDeColaboradorNaLista = false;
    try {
      await listaDeImpressao(escopoColaboradorA, palestraHojeId);
    } catch (erro) {
      recusaDeColaboradorNaLista = erro instanceof SemAcesso;
    }
    checar(recusaDeColaboradorNaLista, 'colaborador não gera lista impressa (SemAcesso)');

    /* =====================================================
       8. Exportação CSV
       ===================================================== */
    console.log('\n== 8. exportação CSV ==');

    const CABECALHOS = [
      'palestra',
      'codigo_convite',
      'estado',
      'regional',
      'loja',
      'colaborador',
      'titular_nome',
      'titular_cpf',
      'titular_whatsapp',
      'cidade',
      'propriedade',
      'atividade',
      'acompanhante_nome',
      'confirmado_em',
      'checkin_em',
      'cancelado_em',
    ];
    const linhaDaExportacao = (l: Awaited<ReturnType<typeof dadosParaExportacaoCsv>>[number]) => [
      `${palestraHojeCidade} - ${formatarData(palestraHojeDataHora)}`,
      l.codigo,
      l.estado,
      l.regionalNome,
      l.lojaNome,
      l.colaboradorNome,
      l.titularNome,
      l.titularCpf ? valorDeTextoForcado(l.titularCpf) : null,
      l.titularWhatsapp,
      l.cidade,
      l.propriedade,
      l.atividade,
      l.acompanhanteNome,
      l.confirmadoEm ? formatarCarimbo(l.confirmadoEm) : null,
      l.checkinEm ? formatarCarimbo(l.checkinEm) : null,
      l.canceladoEm ? formatarCarimbo(l.canceladoEm) : null,
    ];

    const csvAdmin = await dadosParaExportacaoCsv(escopoAdmin, palestraHojeId);
    checar(
      csvAdmin.length === Number(totalNaPalestra?.n),
      'a exportação CSV traz TODOS os convites da palestra, em qualquer estado',
      `${csvAdmin.length} vs ${totalNaPalestra?.n}`,
    );

    const linhaDisponivel = csvAdmin.find((l) => l.codigo === cDisponivel.codigo);
    checar(
      linhaDisponivel?.estado === 'disponivel' &&
        linhaDisponivel.titularNome === null &&
        linhaDisponivel.confirmadoEm === null,
      'convite `disponivel` exportado com as colunas de titular e datas vazias, sem quebrar o formato',
    );

    const linhaComCheckin = csvAdmin.find((l) => l.codigo === cVerde.codigo);
    checar(
      Boolean(linhaComCheckin?.checkinEm) && linhaComCheckin?.estado === 'presente',
      'convite com check-in exportado com o campo checkin_em preenchido',
    );

    checar(
      csvAdmin.some((l) => l.titularCpf === cBusca.cpf),
      'Admin recebe o CPF COMPLETO do titular na exportação',
    );

    const csvGerenteLojaA = await dadosParaExportacaoCsv(escopoGerenteLojaA, palestraHojeId);
    checar(
      csvGerenteLojaA.every((l) => l.titularCpf === null || /^\*\*\*\./.test(l.titularCpf)),
      'gerente de loja recebe o CPF MASCARADO na exportação',
    );
    checar(
      !csvGerenteLojaA.some((l) => l.codigo === cDaLojaB.codigo),
      'exportação do gerente da loja A não inclui convite da loja B (escopo)',
    );

    const csvGerenteRegional = await dadosParaExportacaoCsv(escopoGerenteRegional, palestraHojeId);
    checar(
      csvGerenteRegional.some((l) => l.codigo === cDaLojaB.codigo),
      'exportação do gerente regional inclui as duas lojas da própria regional',
    );

    let recusaDeRecepcaoNoCsv = false;
    try {
      await dadosParaExportacaoCsv(escopoRecepcao, palestraHojeId);
    } catch (erro) {
      recusaDeRecepcaoNoCsv = erro instanceof SemAcesso;
    }
    checar(
      recusaDeRecepcaoNoCsv,
      'a recepção NÃO exporta CSV, mesmo gerando a lista impressa da mesma palestra (SemAcesso)',
    );

    let recusaDeColaboradorNoCsv = false;
    try {
      await dadosParaExportacaoCsv(escopoColaboradorA, palestraHojeId);
    } catch (erro) {
      recusaDeColaboradorNoCsv = erro instanceof SemAcesso;
    }
    checar(recusaDeColaboradorNoCsv, 'colaborador não exporta CSV (SemAcesso)');

    /* ---- o arquivo de verdade: BOM, separador, escape, CPF, datas ---- */
    const cpfComZero = cpfDe('012345670');
    const cEscape = await novoConfirmado(palestraHojeId, colaboradorAId, {
      cpf: cpfComZero,
      propriedade: `${MARCA} Fazenda "Boa Vista"; km 5`,
    });

    const csvParaArquivo = await dadosParaExportacaoCsv(escopoAdmin, palestraHojeId);
    checar(
      csvParaArquivo.some((l) => l.codigo === cEscape.codigo),
      'o convite com caracteres especiais está na exportação antes de virar texto',
    );
    const textoCsv = montarCsv(CABECALHOS, csvParaArquivo.map(linhaDaExportacao));

    checar(textoCsv.charCodeAt(0) === 0xfeff, 'o arquivo começa com o BOM UTF-8');
    checar(textoCsv.slice(1).startsWith(CABECALHOS.join(SEPARADOR_CSV)), 'o cabeçalho usa ";" como separador');
    checar(
      textoCsv.includes(`${MARCA} Fazenda ""Boa Vista""; km 5`),
      'valor com ";" e aspas sai corretamente escapado (aspas duplicadas, dentro de aspas)',
    );
    checar(
      // A célula inteira sai entre aspas (D7), então as aspas do truque
      // `="…"` chegam DOBRADAS pelo escape do CSV: `"=""0123…"""`, não
      // `="0123…"` cru. O dígito continua lá, e o zero à esquerda também.
      textoCsv.includes(`"=""${cpfComZero}"""`),
      'o CPF (com zero à esquerda) sai como texto forçado, preservando o dígito, e ainda entre aspas',
      cpfComZero,
    );
    checar(
      /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(textoCsv),
      'as datas saem no formato brasileiro (dd/mm/aaaa hh:mm)',
    );
    checar(
      !textoCsv.startsWith(BOM_UTF8 + BOM_UTF8),
      'o BOM aparece uma única vez',
    );

    /* =====================================================
       12. Convite avulso na operação do evento
           (`convites-avulsos`, requisitos "Check-in de convidado
           avulso" e "Lista impressa com convidado avulso")

       A regressão que esta seção existe para pegar é a pior possível:
       com `innerJoin` em `user`, o `select` que monta o resultado verde
       do check-in não devolvia linha para convite sem colaborador, o
       serviço lançava `RecusaDeCheckin('invalido')`, a transação inteira
       era desfeita e a portaria via TELA VERMELHA para alguém com
       ingresso válido. Não havia campo em branco: havia entrada negada.
       ===================================================== */
    console.log('\n== 12. convite avulso na porta ==');

    const [loteDoTeste] = await db()
      .insert(lote)
      .values({
        eventoId: palestraHojeId,
        colaboradorId: null,
        quantidade: 1,
        rotulo: `${MARCA} Imprensa`,
        criadoPor: adminId,
      })
      .returning({ id: lote.id });

    const cAvulso = await novoConfirmado(palestraHojeId, null, {
      acompanhanteNome: `${MARCA} Acompanhante Avulso`,
      nome: `${MARCA} Convidado Avulso`,
      loteId: loteDoTeste!.id,
    });

    const rAvulso = await checkinPorToken(cAvulso.token, palestraHojeId, atorRecepcao);
    checar(
      rAvulso.ok && rAvulso.cor === 'verde',
      'convite avulso confirmado passa no check-in: resultado VERDE',
      rAvulso.ok ? '' : `veio ${rAvulso.cor}`,
    );
    if (rAvulso.ok) {
      checar(
        rAvulso.colaboradorNome === 'Administração',
        'a origem é "Administração", não um campo vazio',
        rAvulso.colaboradorNome,
      );
      checar(
        rAvulso.lojaNome === 'Administração',
        'a loja também diz "Administração"',
        String(rAvulso.lojaNome),
      );
      checar(
        rAvulso.rotuloDoLote === `${MARCA} Imprensa`,
        'o rótulo do lote chega à portaria',
        String(rAvulso.rotuloDoLote),
      );
      checar(
        rAvulso.titular === `${MARCA} Convidado Avulso`,
        'o titular é o do convite avulso',
      );
    }
    checar(
      (await estadoGravadoDe(cAvulso.conviteId)) === 'presente',
      'o convite avulso passa a `presente`: a transação foi gravada, não desfeita',
    );

    // Segunda leitura do avulso: amarelo, como qualquer outro convite.
    const rAvulsoDeNovo = await checkinPorToken(cAvulso.token, palestraHojeId, atorRecepcao);
    checar(
      !rAvulsoDeNovo.ok && rAvulsoDeNovo.cor === 'amarelo',
      'segunda leitura do avulso: amarelo, comportamento idêntico ao dos outros',
    );

    // A folha da porta: o avulso precisa estar nela, com origem preenchida.
    const listaComAvulso = await listaDeImpressao(escopoAdmin, palestraHojeId);
    const linhaAvulsa = listaComAvulso.find((l) => l.titular === `${MARCA} Convidado Avulso`);
    checar(Boolean(linhaAvulsa), 'o convidado avulso aparece na lista impressa');
    checar(
      linhaAvulsa?.colaboradorNome === 'Administração',
      'na lista impressa, a coluna de colaborador diz "Administração"',
      String(linhaAvulsa?.colaboradorNome),
    );
    checar(
      linhaAvulsa?.lojaNome === 'Administração',
      'e a coluna de loja também',
      String(linhaAvulsa?.lojaNome),
    );

    // A planilha da palestra: o avulso entra, com as três colunas de origem
    // preenchidas.
    const csvComAvulso = await dadosParaExportacaoCsv(escopoAdmin, palestraHojeId);
    const linhaCsvAvulsa = csvComAvulso.find((l) => l.codigo === cAvulso.codigo);
    checar(Boolean(linhaCsvAvulsa), 'o convite avulso entra na exportação CSV');
    checar(
      linhaCsvAvulsa?.colaboradorNome === 'Administração' &&
        linhaCsvAvulsa?.lojaNome === 'Administração' &&
        linhaCsvAvulsa?.regionalNome === 'Administração',
      'no CSV, regional, loja e colaborador dizem "Administração"',
    );

    // E o avulso continua invisível para quem não é Admin.
    const listaDoGerente = await listaDeImpressao(escopoGerenteRegional, palestraHojeId);
    checar(
      !listaDoGerente.some((l) => l.titular === `${MARCA} Convidado Avulso`),
      'o gerente regional NÃO vê o convidado avulso na lista dele',
    );

    /* =====================================================
       11.3 — permissões (camada de dados, defesa em profundidade)
       ===================================================== */
    console.log('\n== 11. permissões na camada de dados ==');
    checar(
      recusaDeColaboradorNaBusca && recusaDeColaboradorNaLista && recusaDeColaboradorNoCsv,
      'colaborador recusado nas três leituras desta change (busca, lista impressa, CSV)',
    );
    checar(
      recusaDeRecepcaoNoCsv,
      'recepção recusada especificamente na exportação CSV (mas não na lista impressa)',
    );

    console.log('\n== limpeza ==');
    await limpar();
    const [restou] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(evento)
      .where(like(evento.cidade, `${MARCA}%`));
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
      ? '\nTODOS OS CHECKS DE OPERAÇÃO PASSARAM'
      : `\n${falhas} CHECK(S) FALHARAM`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
