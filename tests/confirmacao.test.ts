import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ATIVIDADES,
  formatarWhatsapp,
  mascaraDeWhatsapp,
  MENSAGENS,
  rotuloDaAtividade,
  VALORES_DE_ATIVIDADE,
  whatsappValido,
} from '@/lib/palestras/confirmacao';
import {
  esquemaDeConfirmacao,
  lerFormularioDeConfirmacao,
} from '@/lib/palestras/confirmacao-esquema';
import {
  partirTexto,
  TEXTOS_PADRAO,
  textoPlano,
  VERSAO_DA_POLITICA_PADRAO,
} from '@/lib/palestras/consentimento';
import { errosPorCampo } from '@/lib/palestras/validacao';

const BASE = {
  cpf: '529.982.247-25',
  nome: 'João da Silva',
  whatsapp: '(69) 99999-0000',
  cidade: 'Ji-Paraná',
  propriedade: 'Fazenda Boa Vista',
  atividade: 'corte',
  acompanhanteNome: '',
  aceitePolitica: true,
  aceiteComunicacoes: false,
};

function erros(entrada: Record<string, unknown>) {
  const analise = esquemaDeConfirmacao.safeParse(entrada);
  assert.equal(analise.success, false, 'o esquema deveria ter recusado');
  return errosPorCampo(analise.error!);
}

/* =========================================================
   WhatsApp
   ========================================================= */

describe('WhatsApp do convidado', () => {
  it('aceita celular de 9 dígitos e fixo de 8, com ou sem máscara', () => {
    assert.equal(whatsappValido('(69) 99999-0000'), true);
    assert.equal(whatsappValido('69999990000'), true);
    assert.equal(whatsappValido('(69) 3421-0000'), true);
  });

  it('recusa DDD impossível, tamanho errado e celular sem o 9', () => {
    assert.equal(whatsappValido('(09) 99999-0000'), false);
    assert.equal(whatsappValido('999990000'), false);
    assert.equal(whatsappValido('699999900001'), false);
    assert.equal(whatsappValido('69899990000'), false);
  });

  it('formata na saída e mascara enquanto digita', () => {
    assert.equal(formatarWhatsapp('69999990000'), '(69) 99999-0000');
    assert.equal(formatarWhatsapp('6934210000'), '(69) 3421-0000');
    assert.equal(mascaraDeWhatsapp('6'), '(6');
    assert.equal(mascaraDeWhatsapp('699'), '(69) 9');
    assert.equal(mascaraDeWhatsapp('69999990000'), '(69) 99999-0000');
    // Não inventa dígito quando a pessoa apaga.
    assert.equal(mascaraDeWhatsapp(''), '');
  });
});

/* =========================================================
   Esquema
   ========================================================= */

describe('esquema de confirmação', () => {
  it('aceita os dados completos e grava CPF e WhatsApp só com dígitos', () => {
    const analise = esquemaDeConfirmacao.safeParse(BASE);
    assert.equal(analise.success, true);
    assert.equal(analise.data!.cpf, '52998224725');
    assert.equal(analise.data!.whatsapp, '69999990000');
    assert.equal(analise.data!.acompanhanteNome, null);
  });

  it('aceita o CPF com ou sem máscara, com o mesmo resultado', () => {
    const comMascara = esquemaDeConfirmacao.safeParse(BASE);
    const semMascara = esquemaDeConfirmacao.safeParse({
      ...BASE,
      cpf: '52998224725',
    });
    assert.equal(comMascara.success && semMascara.success, true);
    assert.equal(comMascara.data!.cpf, semMascara.data!.cpf);
  });

  it('recusa CPF com dígito verificador errado', () => {
    const e = erros({ ...BASE, cpf: '123.456.789-00' });
    assert.match(e.cpf!, /CPF inválido/);
  });

  it('recusa CPF de dígitos repetidos', () => {
    assert.ok(erros({ ...BASE, cpf: '111.111.111-11' }).cpf);
  });

  it('aponta cada campo obrigatório que faltou, de uma vez', () => {
    const e = erros({
      ...BASE,
      nome: '',
      whatsapp: '',
      cidade: '',
      propriedade: '',
      atividade: '',
    });
    for (const campo of [
      'nome',
      'whatsapp',
      'cidade',
      'propriedade',
      'atividade',
    ]) {
      assert.ok(e[campo], `faltou apontar o campo ${campo}`);
    }
  });

  it('exige nome completo, não só o primeiro', () => {
    assert.ok(erros({ ...BASE, nome: 'João' }).nome);
    assert.equal(
      esquemaDeConfirmacao.safeParse({ ...BASE, nome: 'Ana Sá' }).success,
      true,
    );
  });

  it('aceita as quatro atividades e recusa qualquer outra', () => {
    for (const atividade of VALORES_DE_ATIVIDADE) {
      assert.equal(
        esquemaDeConfirmacao.safeParse({ ...BASE, atividade }).success,
        true,
        `atividade ${atividade} deveria ser aceita`,
      );
    }
    assert.ok(erros({ ...BASE, atividade: 'soja' }).atividade);
    assert.deepEqual(
      [...VALORES_DE_ATIVIDADE],
      ['corte', 'leite', 'cria', 'outra'],
    );
  });

  it('acompanhante é opcional', () => {
    const analise = esquemaDeConfirmacao.safeParse({
      ...BASE,
      acompanhanteNome: 'Maria Souza',
    });
    assert.equal(analise.success, true);
    assert.equal(analise.data!.acompanhanteNome, 'Maria Souza');
  });

  it('recusa a confirmação sem o aceite da política', () => {
    const e = erros({ ...BASE, aceitePolitica: false });
    assert.match(e.aceitePolitica!, /autorizar o uso dos seus dados/);
  });

  it('o opt-in é independente do aceite e não bloqueia nada', () => {
    const sem = esquemaDeConfirmacao.safeParse(BASE);
    const com = esquemaDeConfirmacao.safeParse({
      ...BASE,
      aceiteComunicacoes: true,
    });
    assert.equal(sem.success && com.success, true);
    assert.equal(sem.data!.aceiteComunicacoes, false);
    assert.equal(com.data!.aceiteComunicacoes, true);
  });
});

describe('leitura do formulário', () => {
  it('trata caixa ausente como não marcada', () => {
    const dados = new FormData();
    dados.set('cpf', '529.982.247-25');
    const lido = lerFormularioDeConfirmacao(dados);
    assert.equal(lido.aceitePolitica, false);
    assert.equal(lido.aceiteComunicacoes, false);
  });

  it('trata caixa marcada como verdadeira, qualquer que seja o valor', () => {
    const dados = new FormData();
    dados.set('aceitePolitica', 'on');
    dados.set('aceiteComunicacoes', 'sim');
    const lido = lerFormularioDeConfirmacao(dados);
    assert.equal(lido.aceitePolitica, true);
    assert.equal(lido.aceiteComunicacoes, true);
  });
});

/* =========================================================
   Consentimento (D9b)
   ========================================================= */

describe('textos de consentimento', () => {
  it('a versão vigente da política é a 3.0', () => {
    assert.equal(VERSAO_DA_POLITICA_PADRAO, '3.0');
    assert.equal(TEXTOS_PADRAO.versaoDaPolitica, '3.0');
  });

  it('o aceite obrigatório traz a redação aprovada, com o link no meio', () => {
    const plano = textoPlano(TEXTOS_PADRAO.aceite, TEXTOS_PADRAO);
    assert.equal(
      plano,
      'Autorizo a Nossa Lavoura (Grupo Axia Agro) a tratar meus dados para ' +
        'confirmar e controlar minha presença no Circuito de Palestras ' +
        'Acelera no Campo 3.0, conforme a Política de Privacidade. Se eu ' +
        'informar um acompanhante, declaro que ele está ciente e de acordo.',
    );
  });

  it('o opt-in diz que é opcional e não condiciona a presença', () => {
    assert.equal(
      TEXTOS_PADRAO.optIn,
      'Quero receber novidades, convites e ofertas da Nossa Lavoura. ' +
        'Opcional — sua presença está confirmada do mesmo jeito.',
    );
  });

  it('o apoio amarra a guarda à finalidade, sem prometer prazo', () => {
    const plano = textoPlano(TEXTOS_PADRAO.apoio, TEXTOS_PADRAO);
    assert.match(plano, /enquanto essa finalidade existir/);
    assert.match(plano, /dpo@axiaagro\.com\.br/);
    assert.doesNotMatch(plano, /\b12 meses\b|\bprazo de\b/);
  });

  it('o marcador da política vira link para nova aba, e o resto é texto', () => {
    const trechos = partirTexto(TEXTOS_PADRAO.aceite, TEXTOS_PADRAO);
    const politica = trechos.find((t) => t.tipo === 'politica');
    assert.ok(politica, 'o trecho da política não foi encontrado');
    assert.equal(politica.rotulo, 'Política de Privacidade');
    assert.equal(politica.href, TEXTOS_PADRAO.urlDaPolitica);
    assert.equal(
      trechos.map((t) => (t.tipo === 'texto' ? t.valor : t.rotulo)).join(''),
      textoPlano(TEXTOS_PADRAO.aceite, TEXTOS_PADRAO),
    );
  });

  it('o marcador do encarregado vira mailto', () => {
    const trechos = partirTexto(TEXTOS_PADRAO.apoio, TEXTOS_PADRAO);
    const dpo = trechos.find((t) => t.tipo === 'dpo');
    assert.ok(dpo);
    assert.equal(dpo.href, 'mailto:dpo@axiaagro.com.br');
  });

  it('texto de configuração nunca vira HTML: só os marcadores conhecidos', () => {
    const trechos = partirTexto('Leia <b>isto</b> e a {politica}.', TEXTOS_PADRAO);
    const texto = trechos.find(
      (t) => t.tipo === 'texto' && t.valor.includes('<b>'),
    );
    assert.ok(texto, 'a marcação deveria continuar sendo texto puro');
    assert.equal(trechos.filter((t) => t.tipo !== 'texto').length, 1);
  });
});

/* =========================================================
   Vocabulário e mensagens
   ========================================================= */

describe('mensagens e rótulos', () => {
  it('a recusa por CPF já confirmado não revela qual palestra', () => {
    assert.match(MENSAGENS.cpfJaConfirmado, /já tem presença confirmada/);
    assert.doesNotMatch(
      MENSAGENS.cpfJaConfirmado,
      /Vilhena|Ji-Paraná|Espigão|Porto Velho/,
    );
  });

  it('a recusa por convite usado não cita nome nem CPF de ninguém', () => {
    assert.doesNotMatch(MENSAGENS.conviteJaUtilizado, /\d{3}\.\d{3}/);
  });

  it('as quatro atividades têm rótulo legível', () => {
    assert.equal(ATIVIDADES.length, 4);
    assert.equal(rotuloDaAtividade('leite'), 'Gado de leite');
    assert.equal(rotuloDaAtividade('inexistente'), '—');
    assert.equal(rotuloDaAtividade(null), '—');
  });
});
