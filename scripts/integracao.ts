/**
 * Teste de integração contra o banco real.
 *
 * Exercita, ponta a ponta, o que as telas fazem: importação limpa,
 * importação com erros, reimportação idempotente, geração de lotes com
 * quantidades diferentes, recusa por prazo vencido, lote grande e a rotina
 * de expiração.
 *
 * Fica em `scripts/` e não em `tests/` de propósito: precisa de um Postgres
 * acessível e escreve nele. Os testes de `npm test` são puros e rodam em
 * qualquer lugar.
 *
 * Tudo que ele cria usa o prefixo `[TESTE]` e é removido no fim — menos os
 * registros de auditoria, que são imutáveis por contrato.
 *
 *   npm run test:integracao
 */
import { config } from 'dotenv';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';

config({ path: '.env', quiet: true });

const MARCA = '[TESTE]';

let falhas = 0;
function checar(condicao: boolean, texto: string, detalhe = '') {
  if (!condicao) falhas++;
  console.log(
    `${condicao ? 'OK   ' : 'FALHA'} ${texto}${detalhe ? ` — ${detalhe}` : ''}`,
  );
}

const CPFS = {
  joao: '529.982.247-25',
  maria: '111.444.777-35',
  ana: '877.482.488-00',
  pedro: '031.180.140-40',
  carla: '930.983.230-43',
};

const CABECALHO =
  'regional,loja_codigo,loja_nome,loja_cidade,nome,cpf,data_nascimento,email,whatsapp,papel';

const CSV_LIMPO = [
  CABECALHO,
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Joao da Silva,${CPFS.joao},15/03/1985,teste-joao@exemplo.test,(69) 99999-0000,colaborador`,
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Maria Souza,${CPFS.maria},02/11/1990,teste-maria@exemplo.test,(69) 98888-1111,gerente_loja`,
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Ana Rocha,${CPFS.ana},20/06/1992,teste-ana@exemplo.test,,colaborador`,
  `${MARCA} Regional Sul,TST02,${MARCA} Loja Vilhena,Vilhena,${MARCA} Pedro Lima,${CPFS.pedro},05/01/1988,teste-pedro@exemplo.test,,colaborador`,
  `${MARCA} Regional Sul,,,,${MARCA} Carla Dias,${CPFS.carla},11/11/1980,teste-carla@exemplo.test,,gerente_regional`,
].join('\n');

const CSV_SUJO = [
  CABECALHO,
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Bruno Alves,123.456.789-00,10/10/1990,teste-bruno@exemplo.test,,colaborador`, // CPF inválido
  `${MARCA} Regional Centro,,,,${MARCA} Clara Nunes,${CPFS.joao},31/02/1991,,,colaborador`, // sem loja + data inexistente + CPF repetido do limpo
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Diego Reis,52998224725,10/10/1990,,,vendedor`, // papel inexistente + CPF repetido
  `${MARCA} Regional Centro,TST01,${MARCA} Loja Ji-Paraná,Ji-Paraná,${MARCA} Elis Prado,${CPFS.maria},01/01/1995,teste-elis@exemplo.test,,colaborador`, // CPF já existe no banco: atualiza
].join('\n');

async function main() {
  const { db, dbTx, fecharConexoes } = await import('@/lib/db');
  const { auditoria, convite, evento, loja, lote, regional, user } = await import(
    '@/lib/db/schema'
  );
  const { aplicarImportacao, previsualizarImportacao } = await import(
    '@/lib/palestras/servicos/importacao'
  );
  const { gerarLotesDeConvites, gerarLoteAvulso } = await import(
    '@/lib/palestras/servicos/geracao'
  );
  const { expirarConvitesVencidos } = await import('@/lib/palestras/expiracao');
  const { montarDadosDoPdf } = await import('@/lib/palestras/pdf/montar');
  const { deHoraLocal, prazoPadrao } = await import('@/lib/tempo');
  const { ATOR_DE_SCRIPT } = await import('@/lib/palestras/auditoria');
  const { pareceCodigo } = await import('@/lib/palestras/codigo');
  const { slugDisponivel } = await import('@/lib/palestras/slug');
  const { confirmacao, session } = await import('@/lib/db/schema');
  const { confirmacoesNoEscopo, convitesNoEscopo, confirmadosParaRecepcao } =
    await import('@/lib/palestras/dados');
  const {
    limparTentativas,
    registrarTentativa,
    verificarLimite,
  } = await import('@/lib/palestras/limite');
  const { LOGIN_POR_CPF } = await import('@/lib/palestras/limite-politicas');
  const { mascararCpfParaRecepcao } = await import('@/lib/palestras/mascaras');

  const cpfsLimpos = Object.values(CPFS).map((c) => c.replace(/\D/g, ''));
  let idDaPalestra = '';
  let idDaPalestraVencida = '';

  const limpar = async () => {
    const usuarios = await db()
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.cpf, cpfsLimpos));
    const ids = usuarios.map((u) => u.id);
    if (ids.length) {
      // Confirmação referencia convite com `restrict`: sai primeiro.
      const convitesDoTeste = await db()
        .select({ id: convite.id })
        .from(convite)
        .where(inArray(convite.colaboradorId, ids));
      const idsDeConvite = convitesDoTeste.map((c) => c.id);
      if (idsDeConvite.length) {
        await db()
          .delete(confirmacao)
          .where(inArray(confirmacao.conviteId, idsDeConvite));
      }
      await db().delete(session).where(inArray(session.userId, ids));
      await db().delete(convite).where(inArray(convite.colaboradorId, ids));
      await db().delete(lote).where(inArray(lote.colaboradorId, ids));
      await db().delete(user).where(inArray(user.id, ids));
    }
    await db().delete(evento).where(like(evento.cidade, `${MARCA}%`));
    await db().delete(loja).where(like(loja.nome, `${MARCA}%`));
    await db().delete(regional).where(like(regional.nome, `${MARCA}%`));
  };

  try {
    console.log('== preparação ==');
    await limpar();
    checar(true, 'banco limpo dos resíduos de execuções anteriores');

    /* ---------- palestras de teste ---------- */
    const daquiADoisDias = new Date(Date.now() + 2 * 86_400_000);
    const dataFutura = `${daquiADoisDias.toISOString().slice(0, 10)}T19:00`;
    const slugs = (await db().select({ slug: evento.slug }).from(evento)).map(
      (e) => e.slug,
    );

    const [futura] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-futura', slugs),
        cidade: `${MARCA} Cidade Futura`,
        dataHora: deHoraLocal(dataFutura),
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 1',
        prazoConfirmacao: prazoPadrao(deHoraLocal(dataFutura)),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    idDaPalestra = futura!.id;

    const ontem = new Date(Date.now() - 86_400_000);
    const [vencida] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-vencida', [...slugs, 'teste-futura']),
        cidade: `${MARCA} Cidade Vencida`,
        dataHora: ontem,
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 2',
        prazoConfirmacao: new Date(ontem.getTime() - 3_600_000),
        mensagemWhatsapp: 'Convite: {link}',
      })
      .returning({ id: evento.id });
    idDaPalestraVencida = vencida!.id;
    checar(Boolean(idDaPalestra && idDaPalestraVencida), 'palestras de teste criadas');

    /* ---------- 1. pré-visualização não grava ---------- */
    console.log('\n== importação · pré-visualização ==');
    const antes = await contar(db, user, regional, loja);
    const previa = await previsualizarImportacao(CSV_LIMPO);
    const depoisDaPrevia = await contar(db, user, regional, loja);

    checar(previa.ok, 'pré-visualização aceita o arquivo limpo');
    if (previa.ok) {
      checar(previa.contagens.novos === 5, 'conta 5 novos', String(previa.contagens.novos));
      checar(previa.contagens.atualizados === 0, 'conta 0 atualizados');
      checar(previa.contagens.erros === 0, 'conta 0 erros');
      checar(previa.contagens.regionaisNovas === 2, 'conta 2 regionais novas');
      checar(previa.contagens.lojasNovas === 2, 'conta 2 lojas novas');
    }
    checar(
      JSON.stringify(antes) === JSON.stringify(depoisDaPrevia),
      'a pré-visualização não gravou nada',
      JSON.stringify(depoisDaPrevia),
    );

    /* ---------- 2. importação limpa ---------- */
    console.log('\n== importação · confirmação ==');
    const r1 = await aplicarImportacao({
      conteudo: CSV_LIMPO,
      arquivoNome: 'teste-limpo.csv',
      somenteValidas: false,
      ator: ATOR_DE_SCRIPT,
    });
    checar(r1.ok, 'importação limpa foi aceita', r1.ok ? '' : r1.mensagem);
    if (r1.ok) {
      checar(r1.contagens.novos === 5, 'criou 5 usuários', String(r1.contagens.novos));
      checar(r1.contagens.regionaisNovas === 2, 'criou 2 regionais');
      checar(r1.contagens.lojasNovas === 2, 'criou 2 lojas');
    }

    const depoisDaCarga = await contar(db, user, regional, loja);

    /* ---------- 3. reimportação idempotente ---------- */
    console.log('\n== importação · reimportação ==');
    const r2 = await aplicarImportacao({
      conteudo: CSV_LIMPO,
      arquivoNome: 'teste-limpo.csv',
      somenteValidas: false,
      ator: ATOR_DE_SCRIPT,
    });
    const depoisDaSegunda = await contar(db, user, regional, loja);
    checar(r2.ok, 'reimportação aceita');
    if (r2.ok) {
      checar(r2.contagens.novos === 0, 'zero criados na segunda vez', String(r2.contagens.novos));
      checar(
        r2.contagens.atualizados === 5,
        'todos os 5 como atualizados',
        String(r2.contagens.atualizados),
      );
    }
    checar(
      JSON.stringify(depoisDaCarga) === JSON.stringify(depoisDaSegunda),
      'as contagens do banco não mudaram',
      `${JSON.stringify(depoisDaCarga)} -> ${JSON.stringify(depoisDaSegunda)}`,
    );

    /* ---------- 4. arquivo com erros ---------- */
    console.log('\n== importação · arquivo com erros ==');
    const r3 = await aplicarImportacao({
      conteudo: CSV_SUJO,
      arquivoNome: 'teste-sujo.csv',
      somenteValidas: false,
      ator: ATOR_DE_SCRIPT,
    });
    const depoisDoSujo = await contar(db, user, regional, loja);
    checar(!r3.ok, 'recusa quando há erro e a opção não está marcada');
    checar(
      JSON.stringify(depoisDaCarga) === JSON.stringify(depoisDoSujo),
      'nada foi gravado na recusa',
    );

    const r4 = await aplicarImportacao({
      conteudo: CSV_SUJO,
      arquivoNome: 'teste-sujo.csv',
      somenteValidas: true,
      ator: ATOR_DE_SCRIPT,
    });
    checar(r4.ok, 'aceita quando o Admin escolhe só as válidas');
    if (r4.ok) {
      // Três LINHAS quebradas, mas cinco erros: uma linha soma vários
      // problemas (sem loja + data inexistente + CPF repetido).
      const linhasComErro = new Set(r4.erros.map((e) => e.linha));
      checar(
        linhasComErro.size === 3 && r4.contagens.erros === 5,
        'as 3 linhas quebradas continuam no relatório, com 5 motivos',
        `${linhasComErro.size} linha(s), ${r4.contagens.erros} motivo(s)`,
      );
      checar(
        r4.contagens.novos === 0 && r4.contagens.atualizados === 1,
        'só a linha válida entrou, como atualização',
        JSON.stringify(r4.contagens),
      );
    }
    const [elis] = await db()
      .select({ nome: user.name })
      .from(user)
      .where(eq(user.cpf, CPFS.maria.replace(/\D/g, '')));
    checar(
      elis?.nome === `${MARCA} Elis Prado`,
      'o usuário existente foi atualizado pelo CPF, mantendo o id',
      elis?.nome ?? 'não encontrado',
    );

    /* ---------- 5. geração de lotes ---------- */
    console.log('\n== geração de convites ==');
    const colaboradores = await db()
      .select({ id: user.id, nome: user.name })
      .from(user)
      .where(and(eq(user.papel, 'colaborador'), like(user.name, `${MARCA}%`)));
    // Quatro, e não três: a importação "só as válidas" trocou o papel de
    // quem estava como gerente_loja para colaborador — exatamente o que a
    // spec pede que o upsert por CPF faça.
    checar(
      colaboradores.length === 4,
      '4 colaboradores de teste (um teve o papel atualizado pelo CSV)',
      String(colaboradores.length),
    );

    const tres = colaboradores.slice(0, 3);
    const g1 = await gerarLotesDeConvites({
      eventoId: idDaPalestra,
      pedidos: [
        { colaboradorId: tres[0]!.id, quantidade: 10 },
        { colaboradorId: tres[1]!.id, quantidade: 20 },
        { colaboradorId: tres[2]!.id, quantidade: 5 },
      ],
      ator: ATOR_DE_SCRIPT,
    });
    checar(g1.ok, 'gera quantidades diferentes numa operação', g1.ok ? '' : g1.mensagem);
    if (g1.ok) {
      checar(g1.resumo.convites === 35, '10 + 20 + 5 = 35 convites', String(g1.resumo.convites));
    }

    const gerados = await db()
      .select({ codigo: convite.codigo, estado: convite.estado, colaboradorId: convite.colaboradorId })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));
    checar(gerados.length === 35, 'o banco tem 35 convites', String(gerados.length));
    checar(
      gerados.every((c) => c.estado === 'disponivel'),
      'todos nascem disponíveis',
    );
    checar(
      gerados.every((c) => pareceCodigo(c.codigo)),
      'todos os códigos têm 6 caracteres do alfabeto sem ambiguidade',
    );
    checar(
      new Set(gerados.map((c) => c.codigo)).size === 35,
      'nenhum código repetido',
    );
    const porColaborador = new Map<string, number>();
    for (const c of gerados) {
      // Este teste só gera pelo caminho por colaborador: nenhuma linha
      // deveria vir com `colaboradorId` nulo, mas o tipo agora é anulável
      // (`convites-avulsos`), então o filtro documenta a garantia.
      if (!c.colaboradorId) continue;
      porColaborador.set(c.colaboradorId, (porColaborador.get(c.colaboradorId) ?? 0) + 1);
    }
    checar(
      [...porColaborador.values()].sort((a, b) => a - b).join(',') === '5,10,20',
      'as quantidades foram distribuídas corretamente',
      [...porColaborador.values()].join(','),
    );

    /* --- novo lote soma, não substitui --- */
    const g2 = await gerarLotesDeConvites({
      eventoId: idDaPalestra,
      pedidos: [{ colaboradorId: tres[0]!.id, quantidade: 3 }],
      ator: ATOR_DE_SCRIPT,
    });
    checar(g2.ok, 'novo lote antes do prazo é aceito');
    const total2 = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));
    checar(
      Number(total2[0]?.n) === 38,
      'os novos convites são somados aos existentes',
      String(total2[0]?.n),
    );

    /* --- quantidade inválida derruba tudo --- */
    const g3 = await gerarLotesDeConvites({
      eventoId: idDaPalestra,
      pedidos: [
        { colaboradorId: tres[0]!.id, quantidade: 5 },
        { colaboradorId: tres[1]!.id, quantidade: 0 },
        { colaboradorId: tres[2]!.id, quantidade: -3 },
      ],
      ator: ATOR_DE_SCRIPT,
    });
    checar(!g3.ok, 'quantidade inválida recusa a operação inteira');
    if (!g3.ok) {
      checar(
        Object.keys(g3.errosPorColaborador ?? {}).length === 2,
        'aponta os dois colaboradores com valor inválido',
        JSON.stringify(g3.errosPorColaborador),
      );
    }
    const total3 = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));
    checar(Number(total3[0]?.n) === 38, 'nada foi gerado na recusa', String(total3[0]?.n));

    /* --- prazo vencido --- */
    const g4 = await gerarLotesDeConvites({
      eventoId: idDaPalestraVencida,
      pedidos: [{ colaboradorId: tres[0]!.id, quantidade: 1 }],
      ator: ATOR_DE_SCRIPT,
    });
    checar(!g4.ok, 'geração após o prazo é recusada');
    checar(
      !g4.ok && /prazo/i.test(g4.mensagem),
      'a mensagem explica que o prazo venceu',
      g4.ok ? '' : g4.mensagem,
    );

    /* ---------- 6. lote grande ---------- */
    console.log('\n== lote grande ==');
    const POR_COLABORADOR = 200;
    const noLoteGrande = colaboradores.length * POR_COLABORADOR;
    const g5 = await gerarLotesDeConvites({
      eventoId: idDaPalestra,
      pedidos: colaboradores.map((c) => ({
        colaboradorId: c.id,
        quantidade: POR_COLABORADOR,
      })),
      ator: ATOR_DE_SCRIPT,
    });
    checar(g5.ok, `${noLoteGrande} convites numa operação`, g5.ok ? '' : g5.mensagem);
    if (g5.ok) {
      console.log(
        `       ${noLoteGrande} convites em ${g5.resumo.duracaoMs} ms ` +
          `(${(g5.resumo.duracaoMs / noLoteGrande).toFixed(1)} ms por convite)`,
      );
      checar(
        g5.resumo.duracaoMs < 60_000,
        'dentro do limite de execução de uma função da Vercel',
        `${g5.resumo.duracaoMs} ms`,
      );
    }
    const totalFinal = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));
    checar(
      Number(totalFinal[0]?.n) === 38 + noLoteGrande,
      `${38 + noLoteGrande} convites no total`,
      String(totalFinal[0]?.n),
    );

    /* ---------- 7. PDF ---------- */
    console.log('\n== PDF de distribuição ==');
    const semConvites = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.cpf, CPFS.carla.replace(/\D/g, '')));
    const semConvitesId = semConvites[0]!.id;

    const escopoAdminDoPdf = {
      usuarioId: 'admin-de-teste',
      papel: 'admin' as const,
      regionalId: null,
      lojaId: null,
    };
    const dados = await montarDadosDoPdf(escopoAdminDoPdf, tres[0]!.id, [
      idDaPalestra,
    ]);
    checar(dados !== null, 'monta os dados do PDF');
    if (dados) {
      checar(dados.blocos.length === 1, 'um bloco por palestra');
      checar(
        dados.blocos[0]!.convites.length === 10 + 3 + POR_COLABORADOR,
        'só os disponíveis entram',
        String(dados.blocos[0]!.convites.length),
      );
      const primeiro = dados.blocos[0]!.convites[0]!;
      checar(
        primeiro.url.includes('/palestras/c/') && pareceCodigo(primeiro.url.split('/').pop()!),
        'a URL do convite tem a forma esperada',
        primeiro.url,
      );
      checar(
        primeiro.linkWhatsapp.startsWith('https://wa.me/?text='),
        'o botão aponta para wa.me sem número',
      );
      checar(
        decodeURIComponent(primeiro.linkWhatsapp.split('?text=')[1]!).includes(
          primeiro.url,
        ),
        'a mensagem do wa.me traz o link daquele convite',
      );
    }

    /*
     * Renderização de verdade, pelo Route Handler.
     *
     * O PDF não é montado aqui dentro de propósito: `@react-pdf/renderer`
     * depende de um `exports` map que o Node resolve diferente sob a
     * condição `react-server` que este script precisa usar. Quem renderiza é
     * o servidor, que é onde isso acontece na vida real — então o teste
     * bate no endpoint.
     *
     * Suba `npm start` e rode com BASE apontando para ele:
     *   BASE=http://localhost:3123 npm run test:integracao
     */
    /*
       O guard por token saiu em `auth-e-papeis`. Para exercitar os
       endpoints pelo HTTP é preciso uma sessão de Admin de verdade: entre
       em `/palestras/entrar`, copie o valor do cookie
       `palestras.session_token` e exporte em `SESSAO_ADMIN`.
    */
    const BASE = process.env.BASE;
    const TOKEN = process.env.SESSAO_ADMIN;
    if (BASE && TOKEN && dados) {
      const url =
        `${BASE}/palestras/admin/distribuir/pdf` +
        `?colaborador=${tres[0]!.id}&palestra=${idDaPalestra}`;
      const resposta = await fetch(url, {
        headers: { cookie: `palestras.session_token=${encodeURIComponent(TOKEN)}` },
      });
      checar(resposta.status === 200, 'o endpoint de PDF responde 200', String(resposta.status));
      checar(
        resposta.headers.get('content-type') === 'application/pdf',
        'com Content-Type de PDF',
      );
      checar(
        (resposta.headers.get('content-disposition') ?? '').includes('.pdf'),
        'e nome de arquivo com loja e colaborador',
        resposta.headers.get('content-disposition') ?? '',
      );
      const bruto = Buffer.from(await resposta.arrayBuffer());
      const bytes = bruto.toString('latin1');
      checar(bytes.startsWith('%PDF-'), 'o arquivo é um PDF de verdade');
      checar(bruto.length > 20_000, 'o PDF tem conteúdo', `${bruto.length} bytes`);
      checar(
        bytes.includes('/URI') && bytes.includes('wa.me'),
        'o botão do WhatsApp virou anotação de link clicável',
      );

      // Colaborador sem convite: 409, nunca um PDF vazio.
      const vazioHttp = await fetch(
        `${BASE}/palestras/admin/distribuir/pdf` +
          `?colaborador=${semConvitesId}&palestra=${idDaPalestra}`,
        { headers: { cookie: `palestras.session_token=${encodeURIComponent(TOKEN)}` } },
      );
      checar(
        vazioHttp.status === 409,
        'colaborador sem convites recebe 409, não um PDF em branco',
        String(vazioHttp.status),
      );

      // .zip em lote.
      const zip = await fetch(
        `${BASE}/palestras/admin/distribuir/lote?palestra=${idDaPalestra}` +
          colaboradores.map((c) => `&colaborador=${c.id}`).join(''),
        { headers: { cookie: `palestras.session_token=${encodeURIComponent(TOKEN)}` } },
      );
      const conteudoZip = Buffer.from(await zip.arrayBuffer());
      checar(zip.status === 200, 'o endpoint de lote responde 200');
      checar(
        conteudoZip.subarray(0, 2).toString('latin1') === 'PK',
        'devolve um .zip de verdade',
      );
      checar(
        conteudoZip.toString('latin1').includes('.pdf'),
        'com PDFs dentro',
      );
    } else {
      console.log(
        '       (pulado: defina BASE e SESSAO_ADMIN para testar o PDF pelo endpoint)',
      );
    }

    const vazio = await montarDadosDoPdf(escopoAdminDoPdf, semConvitesId, [
      idDaPalestra,
    ]);
    checar(vazio === null, 'colaborador sem convites não gera PDF vazio');

    /* ---------- 8. expiração ---------- */
    console.log('\n== rotina de expiração ==');
    // Move dois convites para a palestra vencida, para a rotina ter o que fazer.
    const paraExpirar = gerados.slice(0, 2).map((c) => c.codigo);
    await dbTx()
      .update(convite)
      .set({ eventoId: idDaPalestraVencida })
      .where(inArray(convite.codigo, paraExpirar));
    // E um confirmado, que NÃO pode ser tocado.
    await dbTx()
      .update(convite)
      .set({ eventoId: idDaPalestraVencida, estado: 'confirmado' })
      .where(eq(convite.codigo, gerados[2]!.codigo));

    const e1 = await expirarConvitesVencidos();
    checar(e1.atualizados === 2, 'expira os 2 disponíveis vencidos', String(e1.atualizados));

    const [confirmado] = await db()
      .select({ estado: convite.estado })
      .from(convite)
      .where(eq(convite.codigo, gerados[2]!.codigo));
    checar(confirmado?.estado === 'confirmado', 'o confirmado continua confirmado');

    const e2 = await expirarConvitesVencidos();
    checar(e2.atualizados === 0, 'a segunda execução não altera nada (idempotente)');

    /* ---------- 9. controle de acesso ---------- */
    console.log('\n== controle de acesso, escopo e mascaramento ==');

    const [joaoDb] = await db()
      .select({ id: user.id, lojaId: user.lojaId })
      .from(user)
      .where(eq(user.cpf, cpfsLimpos[0]!))
      .limit(1);
    const [pedroDb] = await db()
      .select({ id: user.id, lojaId: user.lojaId })
      .from(user)
      .where(eq(user.cpf, cpfsLimpos[3]!))
      .limit(1);
    const [lojaCentro] = await db()
      .select({ id: loja.id, regionalId: loja.regionalId })
      .from(loja)
      .where(like(loja.nome, `${MARCA} Loja Ji-Paraná%`))
      .limit(1);

    const escopoAdmin = {
      usuarioId: 'admin-de-teste',
      papel: 'admin' as const,
      regionalId: null,
      lojaId: null,
    };
    const escopoColaborador = {
      usuarioId: joaoDb!.id,
      papel: 'colaborador' as const,
      regionalId: null,
      lojaId: joaoDb!.lojaId,
    };
    const escopoGerenteDeLoja = {
      usuarioId: 'gerente-de-teste',
      papel: 'gerente_loja' as const,
      regionalId: null,
      lojaId: lojaCentro!.id,
    };
    const escopoOutraLoja = {
      usuarioId: 'gerente-de-outra-loja',
      papel: 'gerente_loja' as const,
      regionalId: null,
      lojaId: pedroDb!.lojaId,
    };

    const doAdmin = await convitesNoEscopo(escopoAdmin);
    const doColaborador = await convitesNoEscopo(escopoColaborador);
    const daLoja = await convitesNoEscopo(escopoGerenteDeLoja);

    checar(
      doAdmin.length >= doColaborador.length && doColaborador.length > 0,
      'o Admin enxerga ao menos tudo o que o colaborador enxerga',
      `admin=${doAdmin.length} colaborador=${doColaborador.length}`,
    );
    checar(
      doColaborador.every((c) => c.colaboradorId === joaoDb!.id),
      'o colaborador só enxerga convites gerados para ele',
    );
    checar(
      daLoja.length >= doColaborador.length,
      'o gerente de loja enxerga os convites da loja inteira',
      `loja=${daLoja.length}`,
    );
    checar(
      !daLoja.some((c) => c.colaboradorId === pedroDb!.id),
      'o gerente de loja NÃO enxerga convite de colaborador de outra loja',
    );

    /* --- CPF mascarado na camada de dados (D6) --- */
    const CPF_DO_CONVIDADO = '39053344705';
    const conviteParaConfirmar = doColaborador[0]!;
    await db()
      .insert(confirmacao)
      .values({
        conviteId: conviteParaConfirmar.id,
        cpf: CPF_DO_CONVIDADO,
        nome: `${MARCA} Convidado Teste`,
        whatsapp: '(69) 90000-0000',
        cidade: 'Ji-Paraná',
        propriedade: `${MARCA} Fazenda`,
        atividade: 'corte',
        acompanhanteNome: `${MARCA} Acompanhante`,
        aceitePoliticaEm: new Date(),
        aceitePoliticaVersao: '3.0',
        ingressoToken: `teste-${Date.now()}`,
      });

    const comoAdmin = await confirmacoesNoEscopo(escopoAdmin);
    const comoColaborador = await confirmacoesNoEscopo(escopoColaborador);
    const comoGerente = await confirmacoesNoEscopo(escopoGerenteDeLoja);
    const comoOutraLoja = await confirmacoesNoEscopo(escopoOutraLoja);

    const doTesteAdmin = comoAdmin.find((c) => c.cpf === CPF_DO_CONVIDADO);
    checar(
      Boolean(doTesteAdmin) && doTesteAdmin!.cpfCompleto,
      'o Admin recebe o CPF completo do convidado',
    );

    for (const [rotulo, linhas] of [
      ['colaborador', comoColaborador],
      ['gerente de loja', comoGerente],
    ] as const) {
      const serializado = JSON.stringify(linhas);
      checar(
        !serializado.includes(CPF_DO_CONVIDADO),
        `o CPF completo NÃO aparece na resposta para ${rotulo}`,
      );
      const alvo = linhas.find((c) => c.titular.includes('Convidado Teste'));
      // A máscara é montada pelo Postgres; a esperada, pelo TypeScript.
      // As duas precisam coincidir — é a mesma regra escrita duas vezes.
      checar(
        alvo?.cpf === mascararCpfParaRecepcao(CPF_DO_CONVIDADO),
        `o ${rotulo} vê o CPF mascarado no formato do PRD`,
        `${alvo?.cpf ?? '(não encontrado)'} vs ${mascararCpfParaRecepcao(CPF_DO_CONVIDADO)}`,
      );
      checar(alvo?.cpfCompleto === false, `e marcado como incompleto para ${rotulo}`);
    }

    checar(
      !comoOutraLoja.some((c) => c.titular.includes('Convidado Teste')),
      'gerente de outra loja não alcança a confirmação (escopo por consulta)',
    );

    /* --- visão reduzida da recepção --- */
    const paraRecepcao = await confirmadosParaRecepcao(
      { usuarioId: 'r', papel: 'recepcao', regionalId: null, lojaId: null },
      conviteParaConfirmar.eventoId,
    );
    const serializadoRecepcao = JSON.stringify(paraRecepcao);
    checar(
      !serializadoRecepcao.includes(CPF_DO_CONVIDADO),
      'a recepção não recebe o CPF completo',
    );
    checar(
      !serializadoRecepcao.includes('90000-0000') &&
        !serializadoRecepcao.includes('Fazenda'),
      'a recepção não recebe WhatsApp, cidade, propriedade nem atividade',
    );

    /* --- desativação com efeito imediato (D5) --- */
    const tokenDeTeste = `sessao-de-teste-${Date.now()}`;
    await db()
      .insert(session)
      .values({
        userId: joaoDb!.id,
        token: tokenDeTeste,
        expiresAt: new Date(Date.now() + 3600_000),
      });

    const consultaDoMiddleware = async () =>
      db().execute<{ ativo: boolean }>(sql`
        select u.ativo
          from session s
          join "user" u on u.id = s.user_id
         where s.token = ${tokenDeTeste}
         limit 1
      `);

    const antesDaDesativacao = await consultaDoMiddleware();
    checar(
      antesDaDesativacao.rows[0]?.ativo === true,
      'sessão aberta de usuário ativo é aceita',
    );

    await db().update(user).set({ ativo: false }).where(eq(user.id, joaoDb!.id));
    const depoisDaDesativacao = await consultaDoMiddleware();
    checar(
      depoisDaDesativacao.rows[0]?.ativo === false,
      'na requisição seguinte à desativação, a mesma sessão já é recusada',
    );
    await db().update(user).set({ ativo: true }).where(eq(user.id, joaoDb!.id));

    /* --- bloqueio por tentativas --- */
    const chaveDeTeste = `teste:login:${Date.now()}`;
    await limparTentativas(chaveDeTeste);
    for (let i = 0; i < LOGIN_POR_CPF.maximo - 1; i++) {
      await registrarTentativa(chaveDeTeste);
    }
    const quaseLa = await verificarLimite(chaveDeTeste, LOGIN_POR_CPF);
    checar(quaseLa.permitido, 'quatro tentativas erradas ainda permitem a quinta');

    await registrarTentativa(chaveDeTeste);
    const bloqueado = await verificarLimite(chaveDeTeste, LOGIN_POR_CPF);
    checar(!bloqueado.permitido, 'a quinta tentativa errada bloqueia');
    checar(
      bloqueado.liberadoEm !== null &&
        bloqueado.liberadoEm.getTime() - Date.now() > 14 * 60_000,
      'e o bloqueio vale por cerca de 15 minutos',
    );

    await limparTentativas(chaveDeTeste);
    const apos = await verificarLimite(chaveDeTeste, LOGIN_POR_CPF);
    checar(apos.permitido, 'um login bem-sucedido zera o contador daquele identificador');

    /* ---------- 10. geração avulsa (`convites-avulsos`, tarefa 3.4) ---------- */
    console.log('\n== geração avulsa ==');

    const av1 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: 7,
      rotulo: `${MARCA} Imprensa`,
      ator: ATOR_DE_SCRIPT,
    });
    checar(av1.ok, 'gera um lote avulso', av1.ok ? '' : av1.mensagem);

    let loteAvulsoId = '';
    if (av1.ok) {
      loteAvulsoId = av1.resumo.loteId;
      checar(av1.resumo.convites === 7, '7 convites no resumo', String(av1.resumo.convites));
      checar(
        av1.resumo.rotulo === `${MARCA} Imprensa`,
        'o resumo devolve o rótulo informado',
      );

      const criados = await db()
        .select({
          codigo: convite.codigo,
          estado: convite.estado,
          colaboradorId: convite.colaboradorId,
          loteId: convite.loteId,
        })
        .from(convite)
        .where(eq(convite.loteId, loteAvulsoId));

      checar(criados.length === 7, 'nascem exatamente 7 convites', String(criados.length));
      checar(
        criados.every((c) => c.colaboradorId === null),
        'nenhum deles tem colaborador',
      );
      checar(
        criados.every((c) => c.estado === 'disponivel'),
        'todos nascem disponíveis',
      );
      checar(
        new Set(criados.map((c) => c.codigo)).size === 7,
        'nenhum código repetido',
      );

      const [loteGravado] = await db()
        .select({
          colaboradorId: lote.colaboradorId,
          rotulo: lote.rotulo,
          quantidade: lote.quantidade,
        })
        .from(lote)
        .where(eq(lote.id, loteAvulsoId));
      checar(
        loteGravado?.colaboradorId === null,
        'o lote em si também não tem colaborador',
      );
      checar(loteGravado?.rotulo === `${MARCA} Imprensa`, 'o rótulo foi gravado no lote');
    }

    /* --- sem rótulo: "Avulso" é o texto que a TELA mostra na ausência,
       o serviço grava nulo (D4 do design) --- */
    const av2 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: 2,
      ator: ATOR_DE_SCRIPT,
    });
    checar(av2.ok, 'gera um lote avulso sem rótulo', av2.ok ? '' : av2.mensagem);
    let loteSemRotuloId = '';
    if (av2.ok) {
      loteSemRotuloId = av2.resumo.loteId;
      checar(av2.resumo.rotulo === null, 'o resumo devolve rótulo nulo, não "Avulso"');
    }

    /* --- prazo vencido recusa, mesma mensagem da geração por colaborador --- */
    // A seção 8 MOVEU convites para esta palestra, então ela não está
    // vazia. O que importa aqui é que a recusa não acrescente nenhum:
    // por isso a contagem é comparada antes e depois, e não contra zero.
    const [antesDaRecusa] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestraVencida));

    const av3 = await gerarLoteAvulso({
      eventoId: idDaPalestraVencida,
      quantidade: 9,
      ator: ATOR_DE_SCRIPT,
    });
    checar(!av3.ok, 'geração avulsa após o prazo é recusada');
    checar(
      !av3.ok && /prazo/i.test(av3.mensagem),
      'a mensagem explica que o prazo venceu',
      av3.ok ? '' : av3.mensagem,
    );
    const [depoisDaRecusa] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestraVencida));
    checar(
      Number(depoisDaRecusa?.n) === Number(antesDaRecusa?.n),
      'a recusa por prazo não acrescentou nenhum convite à palestra',
      `${antesDaRecusa?.n} antes, ${depoisDaRecusa?.n} depois`,
    );

    /* --- quantidade inválida recusa sem gravar nada --- */
    const antesDaInvalida = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));

    const av4 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: 0,
      ator: ATOR_DE_SCRIPT,
    });
    checar(!av4.ok, 'quantidade zero recusa a operação avulsa');

    const av5 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: -5,
      ator: ATOR_DE_SCRIPT,
    });
    checar(!av5.ok, 'quantidade negativa recusa a operação avulsa');

    const av6 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: 5000,
      ator: ATOR_DE_SCRIPT,
    });
    checar(!av6.ok, 'quantidade acima do teto por operação recusa');
    checar(
      !av6.ok && /500/.test(av6.mensagem),
      'a mensagem cita o limite (o mesmo teto de esquemaDeQuantidade, D5 do design)',
      av6.ok ? '' : av6.mensagem,
    );

    const depoisDaInvalida = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(convite)
      .where(eq(convite.eventoId, idDaPalestra));
    checar(
      Number(antesDaInvalida[0]?.n) === Number(depoisDaInvalida[0]?.n),
      'nenhum convite foi gravado nas tentativas com quantidade inválida',
      `${antesDaInvalida[0]?.n} -> ${depoisDaInvalida[0]?.n}`,
    );

    /* --- rótulo com mais de 80 caracteres recusa (D4 do design) --- */
    const av7 = await gerarLoteAvulso({
      eventoId: idDaPalestra,
      quantidade: 1,
      rotulo: 'x'.repeat(81),
      ator: ATOR_DE_SCRIPT,
    });
    checar(!av7.ok, 'rótulo com mais de 80 caracteres recusa a operação inteira');

    /* --- rastro de auditoria com ação própria (D5 do design, tarefa 3.3) --- */
    if (av1.ok) {
      const [registroDeAuditoria] = await db()
        .select({ acao: auditoria.acao })
        .from(auditoria)
        .where(
          and(
            eq(auditoria.entidade, 'palestra_evento'),
            eq(auditoria.acao, 'lote_avulso.gerado'),
          ),
        )
        .orderBy(desc(auditoria.criadoEm))
        .limit(1);
      checar(
        registroDeAuditoria?.acao === 'lote_avulso.gerado',
        'a geração avulsa grava a ação lote_avulso.gerado, distinta de lote.gerado',
      );
    }

    /* --- limpeza própria: convite e lote avulsos não têm colaborador,
       então o `limpar()` da seção seguinte (que apaga por `colaboradorId`)
       não os alcança, e a palestra tem `onDelete: 'restrict'` contra os
       dois: sem isto, `limpar()` falharia ao tentar apagar `evento`. --- */
    const idsDosLotesAvulsos = [loteAvulsoId, loteSemRotuloId].filter(Boolean);
    if (idsDosLotesAvulsos.length) {
      await db().delete(convite).where(inArray(convite.loteId, idsDosLotesAvulsos));
      await db().delete(lote).where(inArray(lote.id, idsDosLotesAvulsos));
    }

    /* ---------- 11. limpeza ---------- */
    console.log('\n== limpeza ==');
    await limpar();
    const restou = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(like(user.name, `${MARCA}%`));
    checar(Number(restou[0]?.n) === 0, 'dados de teste removidos');
  } catch (erro) {
    falhas++;
    console.error('\nERRO:', erro);
  } finally {
    await fecharConexoes();
  }

  console.log(
    falhas === 0
      ? '\nTODOS OS CHECKS DE INTEGRAÇÃO PASSARAM'
      : `\n${falhas} CHECK(S) FALHARAM`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

async function contar(
  db: () => { select: (c: unknown) => unknown },
  user: unknown,
  regional: unknown,
  loja: unknown,
): Promise<Record<string, number>> {
  const { sql: s } = await import('drizzle-orm');
  const um = async (tabela: unknown) => {
    const linhas = (await (
      db() as unknown as {
        select: (c: unknown) => { from: (t: unknown) => Promise<{ n: number }[]> };
      }
    )
      .select({ n: s<number>`count(*)::int` })
      .from(tabela)) as { n: number }[];
    return Number(linhas[0]?.n ?? 0);
  };
  return {
    usuarios: await um(user),
    regionais: await um(regional),
    lojas: await um(loja),
  };
}

void main();
