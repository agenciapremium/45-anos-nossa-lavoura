/**
 * Teste de integração da change `painel-colaborador`, contra o banco real.
 *
 *   npm run test:integracao:painel
 *
 * Cobre o que os testes puros não alcançam: escopo aplicado NA CONSULTA
 * (D2 do design) — por URL/identificador em requisição, nos quatro papéis
 * —, o cancelamento operacional (invalidação do ingresso e liberação do
 * CPF), a equivalência do PDF gerado pelo painel e pelo Admin para o mesmo
 * colaborador, e o tempo da agregação da visão do Admin (D5) com volume
 * realista.
 *
 * Tudo que ele cria leva o prefixo `[TESTE-PAINEL]` e é removido no fim —
 * menos os registros de auditoria, imutáveis por contrato.
 *
 * NÃO aponte `DATABASE_URL` para produção.
 */
import { config } from 'dotenv';
import { eq, inArray, like } from 'drizzle-orm';

import type { Escopo } from '@/lib/palestras/escopo';

config({ path: '.env', quiet: true });

const MARCA = '[TESTE-PAINEL]';
/**
 * Sufixo único desta execução, só para os nomes com restrição de
 * unicidade (`regional.nome`, `loja.codigo`). Um colaborador ou Admin que
 * vira ator de um cancelamento auditado nunca pode ser apagado depois — a
 * auditoria é imutável por contrato (ver `limpar`) — então a regional e a
 * loja dele também ficam. Sem o sufixo, a PRÓXIMA execução colidiria com
 * esse resíduo ao tentar criar "a mesma" regional de novo.
 */
const EXECUCAO = Date.now().toString(36);

let falhas = 0;
function checar(condicao: boolean, texto: string, detalhe = '') {
  if (!condicao) falhas++;
  console.log(`${condicao ? 'OK   ' : 'FALHA'} ${texto}${detalhe ? ` — ${detalhe}` : ''}`);
}

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

/**
 * Gerador de CPFs únicos DESTA execução (`user.cpf` tem índice único).
 *
 * Mesma razão de `EXECUCAO`: um colaborador ou Admin que vira ator de um
 * cancelamento auditado nunca é apagado (auditoria imutável), então uma
 * execução seguinte não pode reusar o CPF de uma pessoa que ficou presa —
 * coincidiria com um CPF já cadastrado. A base combina os 5 dígitos do
 * relógio no momento da execução com um contador de 4 dígitos — 9 dígitos
 * no total, dez mil pessoas possíveis por execução, mais que suficiente
 * para o volume gerado aqui.
 */
const SEMENTE_DA_EXECUCAO = String(Date.now() % 100_000).padStart(5, '0');
let proximoContadorDeCpf = 0;
function proximoCpf(): string {
  const contador = String(proximoContadorDeCpf++).padStart(4, '0');
  return cpfDe(`${SEMENTE_DA_EXECUCAO}${contador}`);
}

async function main() {
  const { db, fecharConexoes } = await import('@/lib/db');
  const { checkin, confirmacao, convite, evento, loja, regional, user } =
    await import('@/lib/db/schema');
  const {
    confirmacoesNoEscopo,
    conviteNoEscopo,
    convitesNoEscopo,
    definirEnviadoPara,
    resumoPorColaborador,
    resumoPorLoja,
    resumoPorRegional,
  } = await import('@/lib/palestras/dados');
  const { SemAcesso, exigir } = await import('@/lib/palestras/escopo');
  const { cancelarPeloPainel } = await import(
    '@/lib/palestras/servicos/confirmacao'
  );
  const { montarDadosDoPdf } = await import('@/lib/palestras/pdf/montar');
  const { gerarCodigo } = await import('@/lib/palestras/codigo');
  const { gerarIngressoToken } = await import('@/lib/palestras/ingresso');
  const { slugDisponivel } = await import('@/lib/palestras/slug');

  const limpar = async () => {
    const eventos = await db()
      .select({ id: evento.id })
      .from(evento)
      .where(like(evento.cidade, `${MARCA}%`));
    const eventoIds = eventos.map((e) => e.id);
    if (eventoIds.length) {
      const convites = await db()
        .select({ id: convite.id })
        .from(convite)
        .where(inArray(convite.eventoId, eventoIds));
      const conviteIds = convites.map((c) => c.id);
      if (conviteIds.length) {
        await db().delete(checkin).where(inArray(checkin.conviteId, conviteIds));
        await db().delete(confirmacao).where(inArray(confirmacao.conviteId, conviteIds));
        await db().delete(convite).where(inArray(convite.id, conviteIds));
      }
    }
    await db().delete(evento).where(like(evento.cidade, `${MARCA}%`));

    /*
       `palestra_auditoria.ator_id` referencia `user.id` com
       `ON DELETE SET NULL` — mas a auditoria é imutável por contrato
       (`drizzle/0001_auditoria_imutavel.sql` recusa UPDATE na tabela,
       inclusive o UPDATE que o próprio cascade tentaria). Um colaborador ou
       Admin de teste que cancelou algo pelo painel vira ator de uma linha
       de auditoria e, por isso, nunca pode ser apagado depois — igual à
       auditoria em si. Apagar um por um, em vez de um DELETE só, evita que
       essa MEIA DÚZIA de linhas travadas derrube a limpeza das outras
       centenas (os colaboradores de volume, que nunca viraram ator).
    */
    const usuarios = await db()
      .select({ id: user.id })
      .from(user)
      .where(like(user.name, `${MARCA}%`));
    let usuariosResiduais = 0;
    for (const u of usuarios) {
      try {
        await db().delete(user).where(eq(user.id, u.id));
      } catch {
        usuariosResiduais++;
      }
    }
    if (usuariosResiduais > 0) {
      console.log(
        `     (${usuariosResiduais} usuário(s) de teste ficaram no banco — foram ator de um cancelamento auditado, e a auditoria é imutável por contrato)`,
      );
    }

    const lojas = await db().select({ id: loja.id }).from(loja).where(like(loja.nome, `${MARCA}%`));
    let lojasResiduais = 0;
    for (const l of lojas) {
      try {
        await db().delete(loja).where(eq(loja.id, l.id));
      } catch {
        lojasResiduais++;
      }
    }
    if (lojasResiduais > 0) {
      console.log(`     (${lojasResiduais} loja(s) de teste ficaram, por causa dos usuários acima)`);
    }

    const regionais = await db().select({ id: regional.id }).from(regional).where(like(regional.nome, `${MARCA}%`));
    let regionaisResiduais = 0;
    for (const r of regionais) {
      try {
        await db().delete(regional).where(eq(regional.id, r.id));
      } catch {
        regionaisResiduais++;
      }
    }
    if (regionaisResiduais > 0) {
      console.log(`     (${regionaisResiduais} regional(is) de teste ficaram, pela mesma razão)`);
    }
  };

  /**
   * Usuário fixo, reaproveitado entre execuções, para os dois papéis que
   * REALMENTE cancelam pelo painel (`canceladoPor`/`ator_id` exigem uma
   * linha de verdade — ver comentário abaixo). Sem isso, cada execução
   * criaria mais um usuário travado pela imutabilidade da auditoria, e o
   * resíduo cresceria sem limite a cada rodada. Com um nome fixo (sem
   * `EXECUCAO`) e busca-antes-de-criar, o resíduo fica sempre no mesmo par
   * de linhas — igual à auditoria, que também é resíduo aceito, mas
   * **limitado**.
   */
  async function usuarioFixo(
    nome: string,
    valores: { papel: string; lojaId?: string; regionalId?: string },
  ) {
    const [existente] = await db().select({ id: user.id }).from(user).where(eq(user.name, nome)).limit(1);
    if (existente) {
      // Reaponta para a estrutura desta execução (a loja/regional de
      // execuções passadas já não existe — foi limpa por não ter mais
      // nada a travar a exclusão).
      await db().update(user).set({ lojaId: valores.lojaId ?? null, regionalId: valores.regionalId ?? null }).where(eq(user.id, existente.id));
      return existente.id;
    }
    const [novo] = await db()
      .insert(user)
      .values({ name: nome, cpf: proximoCpf(), dataNascimento: '1985-01-01', ...valores })
      .returning({ id: user.id });
    return novo!.id;
  }

  try {
    console.log('== preparação ==');
    await limpar();

    /* =====================================================
       Estrutura: 2 regionais, 2 lojas cada, colaboradores e gerentes
       ===================================================== */
    const [regA] = await db().insert(regional).values({ nome: `${MARCA} Regional A ${EXECUCAO}` }).returning({ id: regional.id });
    const [regB] = await db().insert(regional).values({ nome: `${MARCA} Regional B ${EXECUCAO}` }).returning({ id: regional.id });

    const [lojaA1] = await db().insert(loja).values({ regionalId: regA!.id, codigo: `${MARCA}-A1-${EXECUCAO}`, nome: `${MARCA} Loja A1`, cidade: 'Ji-Paraná' }).returning({ id: loja.id });
    const [lojaA2] = await db().insert(loja).values({ regionalId: regA!.id, codigo: `${MARCA}-A2-${EXECUCAO}`, nome: `${MARCA} Loja A2`, cidade: 'Ji-Paraná' }).returning({ id: loja.id });
    const [lojaB1] = await db().insert(loja).values({ regionalId: regB!.id, codigo: `${MARCA}-B1-${EXECUCAO}`, nome: `${MARCA} Loja B1`, cidade: 'Vilhena' }).returning({ id: loja.id });

    // Fixos (reaproveitados): vão cancelar pelo painel, então viram ator de
    // uma linha de auditoria e nunca podem ser apagados depois.
    const colabA1Id = await usuarioFixo(`${MARCA} Colaborador A1 (fixo)`, { papel: 'colaborador', lojaId: lojaA1!.id });
    const adminDeTesteId = await usuarioFixo(`${MARCA} Admin (fixo)`, { papel: 'admin' });

    // Descartáveis (nunca viram ator de nada auditado): sempre limpam.
    const [colabA2] = await db().insert(user).values({ name: `${MARCA} Colaborador A2`, cpf: proximoCpf(), dataNascimento: '1985-01-01', papel: 'colaborador', lojaId: lojaA2!.id }).returning({ id: user.id });
    const [colabB1] = await db().insert(user).values({ name: `${MARCA} Colaborador B1`, cpf: proximoCpf(), dataNascimento: '1985-01-01', papel: 'colaborador', lojaId: lojaB1!.id }).returning({ id: user.id });
    const [gerLojaA1] = await db().insert(user).values({ name: `${MARCA} Gerente Loja A1`, cpf: proximoCpf(), dataNascimento: '1985-01-01', papel: 'gerente_loja', lojaId: lojaA1!.id }).returning({ id: user.id });
    const [gerRegA] = await db().insert(user).values({ name: `${MARCA} Gerente Regional A`, cpf: proximoCpf(), dataNascimento: '1985-01-01', papel: 'gerente_regional', regionalId: regA!.id }).returning({ id: user.id });

    const slugsExistentes = (await db().select({ slug: evento.slug }).from(evento)).map((e) => e.slug);
    const [palestra] = await db()
      .insert(evento)
      .values({
        slug: slugDisponivel('teste-painel', slugsExistentes),
        cidade: `${MARCA} Cidade`,
        dataHora: new Date(Date.now() + 5 * 86_400_000),
        localNome: 'Local de teste',
        localEndereco: 'Rua de teste, 1',
        prazoConfirmacao: new Date(Date.now() + 4 * 86_400_000),
        mensagemWhatsapp: 'Olá! {cidade} · {data} às {horario}. {local}. Até {prazo}: {link}',
      })
      .returning({ id: evento.id });
    const eventoId = palestra!.id;

    checar(true, 'estrutura e palestra de teste criadas');

    const escopoAdmin: Escopo = { usuarioId: adminDeTesteId, papel: 'admin', regionalId: null, lojaId: null };
    const escopoColabA1: Escopo = { usuarioId: colabA1Id, papel: 'colaborador', regionalId: null, lojaId: lojaA1!.id };
    const escopoColabB1: Escopo = { usuarioId: colabB1!.id, papel: 'colaborador', regionalId: null, lojaId: lojaB1!.id };
    const escopoGerLojaA1: Escopo = { usuarioId: gerLojaA1!.id, papel: 'gerente_loja', regionalId: null, lojaId: lojaA1!.id };
    const escopoGerRegA: Escopo = { usuarioId: gerRegA!.id, papel: 'gerente_regional', regionalId: regA!.id, lojaId: null };

    /* =====================================================
       1. Convites: alguns disponíveis, um confirmado (para cancelar depois)
       ===================================================== */
    console.log('\n== 1. convites de teste ==');

    async function novoConvite(colaboradorId: string) {
      const [c] = await db().insert(convite).values({ codigo: gerarCodigo(), eventoId, colaboradorId, estado: 'disponivel' }).returning({ id: convite.id, codigo: convite.codigo });
      return c!;
    }

    const cA1_disp = await novoConvite(colabA1Id);
    const cA1_confirmado = await novoConvite(colabA1Id);
    const cB1_disp = await novoConvite(colabB1!.id);
    // Só para a loja A2 ter atividade — usada na checagem de visão de
    // equipe do gerente regional, logo abaixo.
    await novoConvite(colabA2!.id);

    const CPF_CONFIRMADO = proximoCpf();
    await db().insert(confirmacao).values({
      conviteId: cA1_confirmado.id,
      cpf: CPF_CONFIRMADO,
      nome: `${MARCA} Titular Confirmado`,
      whatsapp: '69999990000',
      ativa: true,
      aceitePoliticaEm: new Date(),
      aceitePoliticaVersao: '3.0',
      ingressoToken: gerarIngressoToken(),
    });
    await db().update(convite).set({ estado: 'confirmado' }).where(eq(convite.id, cA1_confirmado.id));

    checar(true, 'um confirmado (CPF ocupando vaga) e dois disponíveis criados');

    /* =====================================================
       2. Escopo não vaza — por identificador em requisição
       ===================================================== */
    console.log('\n== 2. escopo não vaza (identificador em requisição) ==');

    checar(
      (await conviteNoEscopo(escopoColabA1, { codigo: cA1_disp.codigo })) !== null,
      'colaborador enxerga o próprio convite',
    );
    checar(
      (await conviteNoEscopo(escopoColabB1, { codigo: cA1_disp.codigo })) === null,
      'colaborador B NÃO enxerga convite do colaborador A, mesmo sabendo o código',
    );
    checar(
      (await conviteNoEscopo(escopoGerLojaA1, { codigo: cB1_disp.codigo })) === null,
      'gerente da loja A1 NÃO enxerga convite da loja B1',
    );
    checar(
      (await conviteNoEscopo(escopoGerLojaA1, { codigo: cA1_disp.codigo })) !== null,
      'gerente da loja A1 enxerga convite da própria loja (leitura)',
    );
    checar(
      (await conviteNoEscopo(escopoAdmin, { codigo: cB1_disp.codigo })) !== null,
      'Admin enxerga qualquer convite',
    );

    // A ação de CANCELAR tem alcance próprio, mais restrito que a leitura:
    // o gerente lê o convite da própria loja mas não pode cancelá-lo.
    let gerenteTentouCancelar = false;
    try {
      exigir(escopoGerLojaA1, 'cancelarConvite', { colaboradorId: colabA1Id });
      gerenteTentouCancelar = true;
    } catch (erro) {
      checar(erro instanceof SemAcesso, 'gerente de loja recusado ao tentar cancelar (403) — mesmo lendo o convite');
    }
    checar(!gerenteTentouCancelar, 'a ação de cancelar não foi liberada para o gerente');

    let colaboradorForaDoEscopoCancelou = false;
    try {
      exigir(escopoColabB1, 'cancelarConvite', { colaboradorId: colabA1Id });
      colaboradorForaDoEscopoCancelou = true;
    } catch (erro) {
      checar(erro instanceof SemAcesso, 'colaborador B recusado ao tentar cancelar convite do colaborador A');
    }
    checar(!colaboradorForaDoEscopoCancelou, 'colaborador fora do escopo não conseguiu autorização de cancelamento');

    /* =====================================================
       3. Escopo não vaza — por URL (parâmetro de drill-down da equipe)
       ===================================================== */
    console.log('\n== 3. escopo não vaza (parâmetro de URL na visão de equipe) ==');

    let gerenteRegionalViuOutraRegional = false;
    try {
      // `resumoPorLoja` não lança para um `regionalId` indevido na URL — a
      // restrição do escopo já filtra a consulta; o que prova que não vazou
      // é o resultado vir VAZIO, não uma exceção.
      const resultado = await resumoPorLoja(escopoGerRegA, { regionalId: regB!.id });
      gerenteRegionalViuOutraRegional = resultado.length > 0;
    } catch {
      // lançar também conta como "não vazou"
    }
    checar(!gerenteRegionalViuOutraRegional, 'gerente regional da regional A não vê lojas da regional B por URL');

    const lojasDaPropriaRegional = await resumoPorLoja(escopoGerRegA, {});
    checar(
      lojasDaPropriaRegional.some((l) => l.lojaId === lojaA1!.id) &&
        lojasDaPropriaRegional.some((l) => l.lojaId === lojaA2!.id),
      'gerente regional vê as DUAS lojas da própria regional (A1 e A2)',
    );
    checar(
      !lojasDaPropriaRegional.some((l) => l.lojaId === lojaB1!.id),
      'gerente regional NÃO vê a loja da outra regional (B1) na mesma consulta',
    );

    let gerenteLojaViuOutraLoja = false;
    try {
      await resumoPorColaborador(escopoGerLojaA1, lojaB1!.id);
      gerenteLojaViuOutraLoja = true;
    } catch (erro) {
      checar(erro instanceof SemAcesso, 'gerente de loja recusado (403) ao pedir por URL os colaboradores de outra loja');
    }
    checar(!gerenteLojaViuOutraLoja, 'gerente de loja não obteve dados de outra loja por URL');

    let colaboradorTentouLojaAlheia = false;
    try {
      // Um colaborador não tem alcance nenhum em `resumoPorLoja` (só gerentes
      // e Admin) — a própria checagem de papel já recusa.
      await resumoPorLoja(escopoColabA1, {});
      colaboradorTentouLojaAlheia = true;
    } catch (erro) {
      checar(erro instanceof SemAcesso, 'colaborador recusado (403) ao pedir a visão de equipe');
    }
    checar(!colaboradorTentouLojaAlheia, 'colaborador não acessou a visão de equipe');

    checar(
      (await resumoPorColaborador(escopoGerRegA, lojaA1!.id)).length >= 0,
      'gerente regional acessa loja da PRÓPRIA regional sem erro',
    );

    /* =====================================================
       4. CPF mascarado fora do Admin
       ===================================================== */
    console.log('\n== 4. CPF mascarado ==');
    const [confColab] = await confirmacoesNoEscopo(escopoColabA1, { eventoId });
    const [confAdmin] = await confirmacoesNoEscopo(escopoAdmin, { eventoId });
    checar(confColab?.cpf.includes('*') === true, 'colaborador vê o CPF mascarado', confColab?.cpf);
    checar(confColab?.cpf.replace(/\D/g, '').length !== 11, 'o CPF completo não está no valor devolvido ao colaborador');
    checar(confAdmin?.cpf === CPF_CONFIRMADO, 'Admin vê o CPF completo');

    /* =====================================================
       5. enviado_para: só o colaborador dono escreve
       ===================================================== */
    console.log('\n== 5. enviado_para ==');
    const escreveuProprio = await definirEnviadoPara(escopoColabA1, cA1_disp.id, 'João da padaria', { id: colabA1Id, nome: 'teste' });
    checar(escreveuProprio, 'colaborador anota o próprio convite');
    const escreveuAlheio = await definirEnviadoPara(escopoColabB1, cA1_disp.id, 'tentativa', { id: colabB1!.id, nome: 'teste' });
    checar(!escreveuAlheio, 'colaborador B NÃO consegue anotar convite do colaborador A (zero linhas afetadas)');

    /* =====================================================
       6. Cancelamento operacional: confirmado invalida o ingresso e libera o CPF
       ===================================================== */
    console.log('\n== 6. cancelamento operacional ==');

    const antesDoCancelamento = await db().select().from(confirmacao).where(eq(confirmacao.conviteId, cA1_confirmado.id)).limit(1);
    checar(antesDoCancelamento[0]?.ativa === true, 'confirmação começa ativa');

    const resultadoCancelamento = await cancelarPeloPainel({
      codigo: cA1_confirmado.codigo,
      autor: { tipo: 'colaborador', usuarioId: colabA1Id, nome: `${MARCA} Colaborador A1` },
      motivo: 'Enviado para a pessoa errada',
    });
    checar(resultadoCancelamento.ok === true, 'colaborador cancela o próprio convite confirmado');

    const [conviteAposCancelar] = await db().select().from(convite).where(eq(convite.id, cA1_confirmado.id)).limit(1);
    checar(conviteAposCancelar?.estado === 'cancelado', 'o convite passa a cancelado');
    checar(conviteAposCancelar?.canceladoPor === colabA1Id, 'o autor do cancelamento fica registrado');
    checar((conviteAposCancelar?.motivoCancelamento ?? '').includes('pessoa errada'), 'o motivo fica gravado');

    const [confAposCancelar] = await db().select().from(confirmacao).where(eq(confirmacao.conviteId, cA1_confirmado.id)).limit(1);
    checar(confAposCancelar?.ativa === false, 'a confirmação deixa de estar ativa — o ingresso não vale mais');

    // O CPF livre: outra confirmação ativa com o MESMO CPF agora é aceita
    // (o índice único é parcial: só barra CPF com `ativa = true`).
    const cA1_novoParaCpf = await novoConvite(colabA1Id);
    await db().insert(confirmacao).values({
      conviteId: cA1_novoParaCpf.id,
      cpf: CPF_CONFIRMADO,
      nome: `${MARCA} Titular Reconfirmado`,
      whatsapp: '69999990000',
      ativa: true,
      aceitePoliticaEm: new Date(),
      aceitePoliticaVersao: '3.0',
      ingressoToken: gerarIngressoToken(),
    });
    checar(true, 'CPF liberado: uma nova confirmação ativa com o mesmo CPF foi aceita pelo banco (índice parcial)');

    // Cancelar de novo (já cancelado) é recusado, não idempotente — ao
    // contrário do cancelamento do convidado.
    const segundaTentativa = await cancelarPeloPainel({
      codigo: cA1_confirmado.codigo,
      autor: { tipo: 'colaborador', usuarioId: colabA1Id, nome: `${MARCA} Colaborador A1` },
    });
    checar(segundaTentativa.ok === false && segundaTentativa.motivo === 'estado-invalido', 'cancelar de novo um convite já cancelado é RECUSADO, informando o estado atual');

    // Admin cancela convite de QUALQUER colaborador — inclusive um convite
    // `disponivel` (que o convidado nunca poderia cancelar).
    const resultadoAdmin = await cancelarPeloPainel({
      codigo: cB1_disp.codigo,
      autor: { tipo: 'admin', usuarioId: adminDeTesteId, nome: `${MARCA} Admin` },
      motivo: null,
    });
    checar(resultadoAdmin.ok === true, 'Admin cancela um convite disponível de outra loja, sem motivo');

    // Spec `cancelamento-operacional`, cenário "Convites de colaborador
    // desativado": o Admin continua conseguindo cancelar, mesmo que o
    // colaborador de origem tenha perdido o acesso.
    await db().update(user).set({ ativo: false }).where(eq(user.id, colabB1!.id));
    const cB1_desativado = await novoConvite(colabB1!.id);
    const resultadoDesativado = await cancelarPeloPainel({
      codigo: cB1_desativado.codigo,
      autor: { tipo: 'admin', usuarioId: adminDeTesteId, nome: `${MARCA} Admin` },
    });
    checar(
      resultadoDesativado.ok === true,
      'Admin cancela convite de colaborador DESATIVADO',
    );

    /* =====================================================
       7. Check-in aparece na leitura do painel (estado presente)
       ===================================================== */
    console.log('\n== 7. presença registrada aparece no painel ==');
    const cA1_presente = await novoConvite(colabA1Id);
    await db().insert(confirmacao).values({
      conviteId: cA1_presente.id,
      cpf: proximoCpf(),
      nome: `${MARCA} Titular Presente`,
      whatsapp: '69999990000',
      ativa: true,
      aceitePoliticaEm: new Date(),
      aceitePoliticaVersao: '3.0',
      ingressoToken: gerarIngressoToken(),
    });
    await db().update(convite).set({ estado: 'presente' }).where(eq(convite.id, cA1_presente.id));
    const horarioDoCheckin = new Date();
    await db().insert(checkin).values({ conviteId: cA1_presente.id, feitoEm: horarioDoCheckin, metodo: 'manual' });

    const [linhaPresente] = (await convitesNoEscopo(escopoColabA1, { eventoId })).filter((c) => c.id === cA1_presente.id);
    checar(linhaPresente?.estado === 'presente', 'o painel mostra o convite como presente');
    checar(Boolean(linhaPresente?.checkinEm), 'o painel traz a data e hora do check-in');

    /* =====================================================
       8. PDF: painel do colaborador === Admin, para o mesmo colaborador
       ===================================================== */
    console.log('\n== 8. equivalência do PDF ==');
    const pdfAdmin = await montarDadosDoPdf(escopoAdmin, colabA1Id, [eventoId]);
    const pdfPainel = await montarDadosDoPdf(escopoColabA1, null, [eventoId]);
    // O painel IGNORA um id de outro colaborador — D1: não valida, ignora.
    const pdfPainelComIdAlheio = await montarDadosDoPdf(
      { ...escopoColabA1 },
      colabB1!.id, // ignorado: quem pede não é admin
      [eventoId],
    );

    checar(pdfAdmin !== null && pdfPainel !== null, 'os dois geram documento');
    if (pdfAdmin && pdfPainel) {
      const codigosAdmin = pdfAdmin.blocos.flatMap((b) => b.convites.map((c) => c.codigo)).sort();
      const codigosPainel = pdfPainel.blocos.flatMap((b) => b.convites.map((c) => c.codigo)).sort();
      checar(JSON.stringify(codigosAdmin) === JSON.stringify(codigosPainel), 'mesmos códigos de convite nos dois PDFs', `admin=${codigosAdmin.join(',')} painel=${codigosPainel.join(',')}`);
      checar(pdfAdmin.blocos[0]?.cidade === pdfPainel.blocos[0]?.cidade, 'mesmo cabeçalho de palestra');
      checar(
        JSON.stringify(pdfAdmin.blocos.map((b) => b.convites.map((c) => c.linkWhatsapp)).sort()) ===
          JSON.stringify(pdfPainel.blocos.map((b) => b.convites.map((c) => c.linkWhatsapp)).sort()),
        'mesma mensagem de WhatsApp (mesmo montador) nos dois PDFs',
      );
    }
    checar(
      JSON.stringify(pdfPainelComIdAlheio?.blocos.map((b) => b.convites.map((c) => c.codigo))) ===
        JSON.stringify(pdfPainel?.blocos.map((b) => b.convites.map((c) => c.codigo))),
      'identificador de outro colaborador na requisição do painel é IGNORADO — o PDF continua sendo o do próprio colaborador',
    );

    /* =====================================================
       9. Tempo da agregação do Admin, com volume realista
       ===================================================== */
    console.log('\n== 9. tempo da agregação (visão do Admin) ==');
    const LOJAS_DE_VOLUME = 8;
    const COLABORADORES_POR_LOJA = 8;
    const CONVITES_POR_COLABORADOR = 40; // ~2560 convites, além dos já criados
    const lojasDeVolume: string[] = [];
    for (let i = 0; i < LOJAS_DE_VOLUME; i++) {
      const [l] = await db()
        .insert(loja)
        .values({ regionalId: i % 2 === 0 ? regA!.id : regB!.id, codigo: `${MARCA}-VOL-${EXECUCAO}-${i}`, nome: `${MARCA} Loja Volume ${i}`, cidade: 'Ji-Paraná' })
        .returning({ id: loja.id });
      lojasDeVolume.push(l!.id);
    }
    const colaboradoresDeVolume: string[] = [];
    for (const lId of lojasDeVolume) {
      for (let j = 0; j < COLABORADORES_POR_LOJA; j++) {
        const [u] = await db()
          .insert(user)
          .values({
            name: `${MARCA} Volume ${lId}-${j}`,
            cpf: proximoCpf(),
            dataNascimento: '1985-01-01',
            papel: 'colaborador',
            lojaId: lId,
          })
          .returning({ id: user.id });
        colaboradoresDeVolume.push(u!.id);
      }
    }

    function estadoDeVolume(i: number): 'confirmado' | 'cancelado' | 'disponivel' {
      if (i % 5 === 0) return 'confirmado';
      if (i % 7 === 0) return 'cancelado';
      return 'disponivel';
    }

    const linhasDeVolume = colaboradoresDeVolume.flatMap((colaboradorId) =>
      Array.from({ length: CONVITES_POR_COLABORADOR }, (_, i) => ({
        codigo: gerarCodigo(),
        eventoId,
        colaboradorId,
        estado: estadoDeVolume(i),
      })),
    );
    const BLOCO = 500;
    for (let i = 0; i < linhasDeVolume.length; i += BLOCO) {
      await db().insert(convite).values(linhasDeVolume.slice(i, i + BLOCO));
    }
    checar(true, `${linhasDeVolume.length} convites de volume gerados em ${colaboradoresDeVolume.length} colaboradores / ${lojasDeVolume.length} lojas`);

    const inicioRegional = Date.now();
    const porRegional = await resumoPorRegional(escopoAdmin, {});
    const duracaoRegional = Date.now() - inicioRegional;
    console.log(`     resumoPorRegional (Admin, todas as regionais): ${duracaoRegional} ms, ${porRegional.length} regional(is)`);

    const inicioLoja = Date.now();
    const porLoja = await resumoPorLoja(escopoAdmin, {});
    const duracaoLoja = Date.now() - inicioLoja;
    console.log(`     resumoPorLoja (Admin, todas as lojas): ${duracaoLoja} ms, ${porLoja.length} loja(s)`);

    checar(porRegional.length >= 2, 'a agregação por regional inclui as regionais de teste');
    checar(porLoja.length >= LOJAS_DE_VOLUME, 'a agregação por loja inclui as lojas de volume');
    checar(
      duracaoRegional < 1000 && duracaoLoja < 1000,
      'a agregação do Admin fica abaixo de 1s (gatilho de D5 para cache)',
      `regional=${duracaoRegional}ms loja=${duracaoLoja}ms`,
    );

    console.log(`\n${falhas === 0 ? 'TUDO OK' : `${falhas} FALHA(S)`}`);
  } finally {
    console.log('\n== limpeza ==');
    await limpar();
    await fecharConexoes();
  }

  if (falhas > 0) process.exitCode = 1;
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
