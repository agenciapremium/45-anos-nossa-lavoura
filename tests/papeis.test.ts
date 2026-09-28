import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAPEIS, type Papel } from '@/lib/db/schema';
import {
  DOZE_HORAS_EM_SEGUNDOS,
  SETE_DIAS_EM_SEGUNDOS,
  alcanceDe,
  duracaoDaSessao,
  ePapelDeGestao,
  metodoPermitido,
  painelInicial,
  pode,
  type AcaoProtegida,
  type Alcance,
} from '@/lib/palestras/papeis';

/* =========================================================
   Matriz de permissões · linha por linha do PRD

   Cada `it` abaixo é uma LINHA da tabela "Papéis e permissões" do PRD,
   transcrita na mesma ordem e com as mesmas palavras da célula. O objetivo
   é que a conferência com o documento seja visual: quem abrir o PRD ao
   lado deste arquivo consegue ler as duas colunas em paralelo.

   Ordem dos papéis nas linhas, sempre:
   Admin · Gerente Regional · Gerente de Loja · Colaborador · Recepção
   ========================================================= */

/** Confere a linha inteira de uma vez. */
function linha(
  acao: AcaoProtegida,
  esperado: [Alcance, Alcance, Alcance, Alcance, Alcance],
) {
  const ordem: Papel[] = [
    'admin',
    'gerente_regional',
    'gerente_loja',
    'colaborador',
    'recepcao',
  ];
  ordem.forEach((papel, i) => {
    assert.equal(
      alcanceDe(papel, acao),
      esperado[i],
      `${acao} / ${papel}: esperado ${esperado[i]}, veio ${alcanceDe(papel, acao)}`,
    );
  });
}

describe('matriz de permissões do PRD', () => {
  it('Cadastrar palestras | Sim | Não | Não | Não | Não', () => {
    linha('cadastrarPalestras', [
      'todos',
      'nenhum',
      'nenhum',
      'nenhum',
      'nenhum',
    ]);
  });

  it('Cadastrar e importar usuários, regionais e lojas | Sim | Não | Não | Não | Não', () => {
    linha('cadastrarEImportarEstrutura', [
      'todos',
      'nenhum',
      'nenhum',
      'nenhum',
      'nenhum',
    ]);
  });

  it('Atribuir papéis | Sim | Não | Não | Não | Não', () => {
    linha('atribuirPapeis', ['todos', 'nenhum', 'nenhum', 'nenhum', 'nenhum']);
  });

  it('Gerar lotes de links | Sim | Não | Não | Não | Não', () => {
    linha('gerarLotes', ['todos', 'nenhum', 'nenhum', 'nenhum', 'nenhum']);
  });

  it('Baixar PDF de links de um colaborador | Sim | Não | Não | Só os próprios | Não', () => {
    linha('baixarPdfDeColaborador', [
      'todos',
      'nenhum',
      'nenhum',
      'proprios',
      'nenhum',
    ]);
  });

  it('Ver links e confirmações | Todos | Da regional | Da loja | Só os próprios | Não', () => {
    linha('verConvitesEConfirmacoes', [
      'todos',
      'regional',
      'loja',
      'proprios',
      'nenhum',
    ]);
  });

  it('Enviar convite pelo WhatsApp | Sim | Não | Não | Só os próprios | Não', () => {
    linha('enviarConvitePorWhatsapp', [
      'todos',
      'nenhum',
      'nenhum',
      'proprios',
      'nenhum',
    ]);
  });

  it('Cancelar convite | Todos | Não | Não | Só os próprios | Não', () => {
    linha('cancelarConvite', [
      'todos',
      'nenhum',
      'nenhum',
      'proprios',
      'nenhum',
    ]);
  });

  it('Fazer check-in | Sim | Não | Não | Não | Sim', () => {
    linha('fazerCheckin', [
      'todos',
      'nenhum',
      'nenhum',
      'nenhum',
      'palestra',
    ]);
  });

  it('Lista de impressão e CSV | Todos | Da regional | Da loja | Não | Por palestra', () => {
    linha('listaImpressaECsv', [
      'todos',
      'regional',
      'loja',
      'nenhum',
      'palestra',
    ]);
  });

  it('CPF completo do convidado: só o Admin (regra de LGPD do PRD)', () => {
    linha('verCpfCompleto', [
      'todos',
      'nenhum',
      'nenhum',
      'nenhum',
      'nenhum',
    ]);
  });

  /*
     Não é uma linha do PRD: é o refinamento de `operacao-evento`
     (spec `exportacao-csv`, "papéis sem permissão") sobre a linha acima.
     A recepção gera a lista impressa (alcance `palestra` em
     `listaImpressaECsv`), mas NÃO exporta CSV — o destino é controlado e
     fica fora do que a recepção precisa para operar a porta.
  */
  it('Exportar CSV (refinamento de `operacao-evento`): Todos | Da regional | Da loja | Não | Não', () => {
    linha('exportarCsv', ['todos', 'regional', 'loja', 'nenhum', 'nenhum']);
  });
});

describe('consequências da matriz', () => {
  it('só o Admin gera links — os gerentes enxergam, não produzem', () => {
    assert.equal(pode('admin', 'gerarLotes'), true);
    for (const papel of PAPEIS.filter((p) => p !== 'admin')) {
      assert.equal(pode(papel, 'gerarLotes'), false, papel);
    }
  });

  it('gerentes não enviam nem cancelam convites', () => {
    for (const papel of ['gerente_regional', 'gerente_loja'] as Papel[]) {
      assert.equal(pode(papel, 'enviarConvitePorWhatsapp'), false, papel);
      assert.equal(pode(papel, 'cancelarConvite'), false, papel);
    }
  });

  it('check-in é de Admin e Recepção, de mais ninguém', () => {
    const permitidos = PAPEIS.filter((p) => pode(p, 'fazerCheckin'));
    assert.deepEqual([...permitidos].sort(), ['admin', 'recepcao']);
  });

  it('a recepção não enxerga a lista de convites e confirmações', () => {
    assert.equal(pode('recepcao', 'verConvitesEConfirmacoes'), false);
  });

  it('a recepção gera lista impressa mas não exporta CSV', () => {
    assert.equal(pode('recepcao', 'listaImpressaECsv'), true);
    assert.equal(pode('recepcao', 'exportarCsv'), false);
  });

  it('colaborador não gera lista nem exporta CSV', () => {
    assert.equal(pode('colaborador', 'listaImpressaECsv'), false);
    assert.equal(pode('colaborador', 'exportarCsv'), false);
  });

  it('toda ação tem uma célula definida para todo papel', () => {
    const acoes: AcaoProtegida[] = [
      'cadastrarPalestras',
      'cadastrarEImportarEstrutura',
      'atribuirPapeis',
      'gerarLotes',
      'baixarPdfDeColaborador',
      'verConvitesEConfirmacoes',
      'enviarConvitePorWhatsapp',
      'cancelarConvite',
      'fazerCheckin',
      'listaImpressaECsv',
      'exportarCsv',
      'verCpfCompleto',
    ];
    for (const acao of acoes) {
      for (const papel of PAPEIS) {
        assert.ok(
          typeof alcanceDe(papel, acao) === 'string',
          `${acao}/${papel} sem célula`,
        );
      }
    }
  });
});

/* =========================================================
   Métodos de acesso por papel
   ========================================================= */
describe('restrição de método por papel', () => {
  it('CPF e nascimento vale só para colaborador e recepção', () => {
    assert.equal(metodoPermitido('colaborador', 'cpf-e-nascimento'), true);
    assert.equal(metodoPermitido('recepcao', 'cpf-e-nascimento'), true);
    assert.equal(metodoPermitido('admin', 'cpf-e-nascimento'), false);
    assert.equal(metodoPermitido('gerente_regional', 'cpf-e-nascimento'), false);
    assert.equal(metodoPermitido('gerente_loja', 'cpf-e-nascimento'), false);
  });

  it('os métodos por e-mail valem para todos os papéis', () => {
    for (const papel of PAPEIS) {
      assert.equal(metodoPermitido(papel, 'senha'), true, papel);
      assert.equal(metodoPermitido(papel, 'link-magico'), true, papel);
      assert.equal(metodoPermitido(papel, 'otp-por-cpf'), true, papel);
    }
  });

  it('promover um colaborador a gerente de loja fecha o método fraco', () => {
    // O mesmo CPF, antes e depois da promoção: o que muda é o papel, e o
    // método deixa de valer no login seguinte.
    assert.equal(metodoPermitido('colaborador', 'cpf-e-nascimento'), true);
    assert.equal(metodoPermitido('gerente_loja', 'cpf-e-nascimento'), false);
  });

  it('papel de gestão é admin e os dois gerentes', () => {
    assert.equal(ePapelDeGestao('admin'), true);
    assert.equal(ePapelDeGestao('gerente_regional'), true);
    assert.equal(ePapelDeGestao('gerente_loja'), true);
    assert.equal(ePapelDeGestao('colaborador'), false);
    assert.equal(ePapelDeGestao('recepcao'), false);
  });
});

/* =========================================================
   Duração de sessão
   ========================================================= */
describe('duração da sessão por papel', () => {
  it('12 horas para colaborador e recepção', () => {
    assert.equal(duracaoDaSessao('colaborador'), DOZE_HORAS_EM_SEGUNDOS);
    assert.equal(duracaoDaSessao('recepcao'), DOZE_HORAS_EM_SEGUNDOS);
    assert.equal(DOZE_HORAS_EM_SEGUNDOS, 43_200);
  });

  it('7 dias para admin e gerentes', () => {
    assert.equal(duracaoDaSessao('admin'), SETE_DIAS_EM_SEGUNDOS);
    assert.equal(duracaoDaSessao('gerente_regional'), SETE_DIAS_EM_SEGUNDOS);
    assert.equal(duracaoDaSessao('gerente_loja'), SETE_DIAS_EM_SEGUNDOS);
    assert.equal(SETE_DIAS_EM_SEGUNDOS, 604_800);
  });

  it('o método de entrada não muda a duração — o papel muda', () => {
    // "Sessão criada por CPF e nascimento não é estendida": ela dura o
    // mesmo que qualquer outra daquele papel, nem mais nem menos.
    assert.equal(
      duracaoDaSessao('colaborador'),
      DOZE_HORAS_EM_SEGUNDOS,
      'o colaborador tem 12 horas por qualquer método',
    );
  });

  it('um gerente no terceiro dia ainda está dentro do prazo', () => {
    const tresDias = 3 * 24 * 60 * 60;
    assert.ok(duracaoDaSessao('gerente_loja') > tresDias);
  });

  it('um colaborador depois de 12 horas e um minuto está fora', () => {
    assert.ok(duracaoDaSessao('colaborador') < 12 * 60 * 60 + 60);
  });
});

describe('painel inicial', () => {
  it('o Admin cai na administração', () => {
    assert.equal(painelInicial('admin'), '/palestras/admin');
  });

  it('os demais caem no painel', () => {
    for (const papel of PAPEIS.filter((p) => p !== 'admin')) {
      assert.equal(painelInicial(papel), '/palestras/painel', papel);
    }
  });
});
