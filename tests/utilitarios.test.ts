import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALFABETO_DO_CODIGO,
  gerarCodigo,
  gerarCodigosDistintos,
  normalizarCodigo,
  pareceCodigo,
  TAMANHO_DO_CODIGO,
} from '@/lib/palestras/codigo';
import {
  cpfValido,
  formatarCpf,
  mascaraProgressiva,
  mascararCpfParaExibicao,
  normalizarCpf,
  somenteDigitos,
} from '@/lib/palestras/cpf';
import {
  explicarProblemas,
  linkDoWhatsapp,
  MARCADORES,
  marcadoresUsados,
  MENSAGEM_PADRAO_WHATSAPP,
  montarMensagemDoConvite,
  preencherMensagem,
  urlDoConvite,
  validarMensagem,
} from '@/lib/palestras/mensagem';
import { slugDePalestra, slugDisponivel, slugificar } from '@/lib/palestras/slug';

/* =========================================================
   CPF
   ========================================================= */
describe('CPF', () => {
  it('aceita CPF válido com e sem máscara', () => {
    assert.equal(cpfValido('123.456.789-09'), true);
    assert.equal(cpfValido('12345678909'), true);
    assert.equal(normalizarCpf('123.456.789-09'), '12345678909');
  });

  it('recusa dígito verificador errado', () => {
    assert.equal(cpfValido('123.456.789-00'), false);
    assert.equal(cpfValido('12345678901'), false);
    assert.throws(() => normalizarCpf('12345678901'), /CPF inválido/);
  });

  it('recusa as onze repetições', () => {
    for (let d = 0; d <= 9; d++) {
      assert.equal(cpfValido(String(d).repeat(11)), false, `${d} repetido`);
    }
  });

  it('recusa comprimento errado', () => {
    assert.equal(cpfValido('1234567890'), false);
    assert.equal(cpfValido('123456789090'), false);
    assert.equal(cpfValido(''), false);
  });

  it('valida uma amostra de CPFs corretos', () => {
    for (const cpf of [
      '52998224725',
      '11144477735',
      '87748248800',
      '03118014040',
    ]) {
      assert.equal(cpfValido(cpf), true, cpf);
    }
  });

  it('normaliza e exibe', () => {
    assert.equal(somenteDigitos('529.982.247-25'), '52998224725');
    assert.equal(formatarCpf('52998224725'), '529.982.247-25');
    assert.equal(mascararCpfParaExibicao('52998224725'), '529.***.***-25');
    assert.equal(mascaraProgressiva('5299'), '529.9');
    assert.equal(mascaraProgressiva('52998224725'), '529.982.247-25');
  });
});

/* =========================================================
   Código do convite
   ========================================================= */
describe('código curto do convite', () => {
  it('tem 6 caracteres do alfabeto sem ambiguidade', () => {
    for (let i = 0; i < 500; i++) {
      const c = gerarCodigo();
      assert.equal(c.length, TAMANHO_DO_CODIGO);
      for (const letra of c) {
        assert.ok(ALFABETO_DO_CODIGO.includes(letra), `caractere ${letra}`);
      }
    }
  });

  it('nunca contém 0, O, 1, I nem L', () => {
    const proibidos = ['0', 'O', '1', 'I', 'L'];
    for (const p of proibidos) {
      assert.equal(ALFABETO_DO_CODIGO.includes(p), false, p);
    }
    const amostra = gerarCodigosDistintos(2000).join('');
    for (const p of proibidos) {
      assert.equal(amostra.includes(p), false, `saiu ${p}`);
    }
  });

  it('não é sequencial: dois códigos seguidos não se parecem', () => {
    let iguaisNaPrimeira = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const [a, b] = [gerarCodigo(), gerarCodigo()];
      if (a[0] === b[0]) iguaisNaPrimeira++;
    }
    // Com 31 símbolos, ~3,2% de coincidência esperada. Um gerador
    // sequencial daria ~100%.
    assert.ok(
      iguaisNaPrimeira < n * 0.1,
      `primeiro caractere repetiu ${iguaisNaPrimeira}/${n} vezes`,
    );
  });

  it('usa o alfabeto todo, sem viés grosseiro', () => {
    const contagem = new Map<string, number>();
    const total = 31 * 400;
    for (let i = 0; i < total / TAMANHO_DO_CODIGO; i++) {
      for (const c of gerarCodigo()) {
        contagem.set(c, (contagem.get(c) ?? 0) + 1);
      }
    }
    assert.equal(contagem.size, ALFABETO_DO_CODIGO.length);
    const esperado = total / ALFABETO_DO_CODIGO.length;
    for (const [letra, n] of contagem) {
      assert.ok(
        n > esperado * 0.5 && n < esperado * 1.5,
        `${letra}: ${n} (esperado ~${esperado})`,
      );
    }
  });

  it('gera lotes sem repetição', () => {
    const lote = gerarCodigosDistintos(5000);
    assert.equal(new Set(lote).size, 5000);
  });

  it('reconhece e normaliza o que a pessoa digita', () => {
    assert.equal(pareceCodigo('A2B3C4'), true);
    assert.equal(pareceCodigo('A2B3C'), false);
    assert.equal(pareceCodigo('A2B3C0'), false); // zero não existe
    assert.equal(normalizarCodigo(' a2b3-c4 '), 'A2B3C4');
  });
});

/* =========================================================
   Mensagem de WhatsApp
   ========================================================= */
describe('mensagem padrão de WhatsApp', () => {
  const valores = {
    cidade: 'Vilhena',
    data: '13/10/2026',
    horario: '19h00',
    local: 'Espaço Nobre',
    prazo: '12/10/2026 às 23h59',
    link: 'https://45anosnossalavoura.agpremium.com.br/palestras/c/A2B3C4',
  };

  it('traz exatamente os marcadores aprovados em D2b', () => {
    assert.deepEqual(
      [...new Set(marcadoresUsados(MENSAGEM_PADRAO_WHATSAPP))].sort(),
      [...MARCADORES].sort(),
    );
  });

  it('mantém os emojis e o ponto medial da copy aprovada', () => {
    assert.ok(MENSAGEM_PADRAO_WHATSAPP.includes('📍 {cidade} · {local}'));
    assert.ok(MENSAGEM_PADRAO_WHATSAPP.includes('🗓 {data}, às {horario}'));
    assert.ok(
      MENSAGEM_PADRAO_WHATSAPP.includes(
        'Acelere conhecimento. Acelere resultados. Acelere no Campo.',
      ),
    );
  });

  it('deixa o link sozinho na última linha útil', () => {
    const linhas = MENSAGEM_PADRAO_WHATSAPP.split('\n');
    const i = linhas.findIndex((l) => l.includes('{link}'));
    assert.equal(linhas[i], '{link}', 'o link divide linha com outra coisa');
  });

  it('substitui todos os marcadores', () => {
    const texto = preencherMensagem(MENSAGEM_PADRAO_WHATSAPP, valores);
    assert.equal(texto.includes('{'), false, `sobrou marcador: ${texto}`);
    assert.ok(texto.includes('Vilhena · Espaço Nobre'));
    assert.ok(texto.includes('13/10/2026, às 19h00'));
    assert.ok(texto.includes(valores.link));
  });

  it('recusa mensagem sem {link}', () => {
    const problemas = validarMensagem('Olá, vem para a palestra em {cidade}!');
    assert.deepEqual(problemas, [{ tipo: 'faltando', marcador: 'link' }]);
    assert.ok(explicarProblemas(problemas).includes('{link}'));
  });

  it('recusa marcador desconhecido', () => {
    const problemas = validarMensagem('{link} {horário}');
    assert.deepEqual(problemas, [
      { tipo: 'desconhecido', marcador: 'horário' },
    ]);
    const explicacao = explicarProblemas(problemas);
    assert.ok(explicacao.includes('{horário}'));
    assert.ok(explicacao.includes('{cidade}'), 'lista os válidos');
  });

  it('aceita a mensagem padrão sem reclamar', () => {
    assert.deepEqual(validarMensagem(MENSAGEM_PADRAO_WHATSAPP), []);
  });
});

describe('link wa.me', () => {
  it('codifica acentos, quebras de linha e &', () => {
    const texto = 'Ação & reação\nsegunda linha · com ponto';
    const url = linkDoWhatsapp(texto);
    assert.ok(url.startsWith('https://wa.me/?text='));
    assert.equal(url.includes('&reação'), false);
    assert.ok(url.includes('%26'), 'o & precisa virar %26');
    assert.ok(url.includes('%0A'), 'a quebra de linha precisa virar %0A');
    assert.ok(url.includes('%C3%A7'), 'ç precisa ser codificado');
    // E volta íntegro.
    assert.equal(
      decodeURIComponent(url.slice('https://wa.me/?text='.length)),
      texto,
    );
  });

  it('a mensagem inteira, com emojis, volta intacta', () => {
    const texto = preencherMensagem(MENSAGEM_PADRAO_WHATSAPP, {
      cidade: "Espigão d'Oeste",
      data: '14/10/2026',
      horario: '19h00',
      local: 'Centro de Eventos',
      prazo: '13/10/2026 às 23h59',
      link: 'https://exemplo.test/palestras/c/A2B3C4?x=1&y=2',
    });
    const url = linkDoWhatsapp(texto);
    assert.equal(
      decodeURIComponent(url.slice('https://wa.me/?text='.length)),
      texto,
    );
    // Só um `?` e nenhum `&` fora do que foi codificado: a URL não quebra.
    assert.equal(url.split('?').length, 2);
    assert.equal(url.includes('&y=2'), false);
  });

  it('monta a URL do convite sem barra dupla', () => {
    assert.equal(
      urlDoConvite('https://exemplo.test/', 'A2B3C4'),
      'https://exemplo.test/palestras/c/A2B3C4',
    );
    assert.equal(
      urlDoConvite('https://exemplo.test', 'A2B3C4'),
      'https://exemplo.test/palestras/c/A2B3C4',
    );
  });
});

/* =========================================================
   Mensagem de um convite — o mesmo montador do PDF e do painel

   `painel-colaborador` exige que a mensagem enviada pelo painel seja
   IDÊNTICA à do PDF para o mesmo convite (spec `painel-convites`,
   requisito "Envio pelo WhatsApp a partir do painel"). A garantia real está
   em `montarDadosDoPdf` (fundacao) e a lista do painel chamarem a MESMA
   função — este teste apenas confere que, para a mesma entrada, a função
   sempre produz a mesma saída (é pura), o que é a base dessa garantia.
   ========================================================= */
describe('montarMensagemDoConvite · mesma mensagem em qualquer lugar que a chame', () => {
  const entrada = {
    origem: 'https://exemplo.test',
    codigo: 'K7Q2MX',
    mensagemTemplate: MENSAGEM_PADRAO_WHATSAPP,
    cidade: 'Ji-Paraná',
    data: '15/10/2026',
    horario: '19h00',
    local: 'Espaço Imagem Eventos',
    prazo: '14/10/2026 às 23h59',
  };

  it('duas chamadas com os mesmos dados produzem o mesmo texto e o mesmo link', () => {
    const pdf = montarMensagemDoConvite(entrada);
    const painel = montarMensagemDoConvite({ ...entrada });
    assert.equal(pdf.texto, painel.texto);
    assert.equal(pdf.url, painel.url);
    assert.equal(pdf.linkWhatsapp, painel.linkWhatsapp);
  });

  it('a URL do convite está embutida no texto e no link do WhatsApp', () => {
    const { url, texto, linkWhatsapp } = montarMensagemDoConvite(entrada);
    assert.equal(url, 'https://exemplo.test/palestras/c/K7Q2MX');
    assert.ok(texto.includes(url));
    assert.equal(linkWhatsapp, linkDoWhatsapp(texto));
  });

  it('equivale a montar a mensagem "na mão" com preencherMensagem + linkDoWhatsapp', () => {
    const url = urlDoConvite(entrada.origem, entrada.codigo);
    const textoEsperado = preencherMensagem(entrada.mensagemTemplate, {
      cidade: entrada.cidade,
      data: entrada.data,
      horario: entrada.horario,
      local: entrada.local,
      prazo: entrada.prazo,
      link: url,
    });
    const resultado = montarMensagemDoConvite(entrada);
    assert.equal(resultado.texto, textoEsperado);
    assert.equal(resultado.linkWhatsapp, linkDoWhatsapp(textoEsperado));
  });
});

/* =========================================================
   Slug
   ========================================================= */
describe('slug de palestra', () => {
  it('tira acentos e apóstrofos', () => {
    assert.equal(slugificar('Espigão d’Oeste'), 'espigao-doeste');
    assert.equal(slugificar("Espigão d'Oeste"), 'espigao-doeste');
    assert.equal(slugificar('Ji-Paraná'), 'ji-parana');
    assert.equal(slugificar('Porto Velho'), 'porto-velho');
  });

  it('junta cidade e data', () => {
    assert.equal(slugDePalestra('Vilhena', '13/10/2026'), 'vilhena-13-10-2026');
    assert.equal(
      slugDePalestra("Espigão d'Oeste", '14/10/2026'),
      'espigao-doeste-14-10-2026',
    );
  });

  it('desempata quando já existe', () => {
    assert.equal(slugDisponivel('vilhena-13-10-2026', []), 'vilhena-13-10-2026');
    assert.equal(
      slugDisponivel('vilhena-13-10-2026', ['vilhena-13-10-2026']),
      'vilhena-13-10-2026-2',
    );
    assert.equal(
      slugDisponivel('vilhena-13-10-2026', [
        'vilhena-13-10-2026',
        'vilhena-13-10-2026-2',
      ]),
      'vilhena-13-10-2026-3',
    );
  });
});
