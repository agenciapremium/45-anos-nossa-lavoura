import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BYTES_DO_TOKEN,
  gerarIngressoToken,
  impressaoConfere,
  impressaoDoDispositivo,
  nomeDoCookieDeDispositivo,
  caminhoDoCookieDeDispositivo,
  qrComoDataUri,
} from '@/lib/palestras/ingresso';
import {
  HORAS_DE_DURACAO,
  montarIcs,
  nomeDoArquivoIcs,
} from '@/lib/palestras/ingresso-agenda';
import { deHoraLocal } from '@/lib/tempo';

/* =========================================================
   Token e QR
   ========================================================= */

describe('token do ingresso', () => {
  it('tem 32 bytes de aleatoriedade', () => {
    const token = gerarIngressoToken();
    assert.equal(Buffer.from(token, 'base64url').length, BYTES_DO_TOKEN);
  });

  it('é URL-safe: nada de +, / ou = para o QR errar', () => {
    for (let i = 0; i < 50; i++) {
      assert.match(gerarIngressoToken(), /^[A-Za-z0-9_-]+$/);
    }
  });

  it('dois tokens são diferentes e sem relação previsível', () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => gerarIngressoToken()),
    );
    assert.equal(tokens.size, 500);
  });
});

describe('QR Code', () => {
  it('sai como data: URI, para funcionar sem rede', async () => {
    const dataUri = await qrComoDataUri('TOKEN-DE-TESTE');
    assert.match(dataUri, /^data:image\/png;base64,/);
  });

  it('carrega o token e nada mais — sem URL, CPF ou nome', async () => {
    // O conteúdo do QR é exatamente o argumento: a função não concatena
    // origem nem identificador. Este teste falha se alguém "melhorar" isso
    // transformando o QR numa URL.
    const token = gerarIngressoToken();
    const comToken = await qrComoDataUri(token);
    const comOutro = await qrComoDataUri(`https://exemplo.test/${token}`);
    assert.notEqual(comToken, comOutro);

    // Mesmo token, mesmo desenho: não há sal nem dado extra embutido.
    assert.equal(comToken, await qrComoDataUri(token));
  });
});

/* =========================================================
   Dispositivo do titular
   ========================================================= */

describe('impressão do dispositivo', () => {
  const confirmacao = '3f1b6b2e-0d1a-4d3b-9a6f-2f9b3f0a11cc';
  const token = gerarIngressoToken();

  it('é estável para o mesmo par', () => {
    assert.equal(
      impressaoDoDispositivo(confirmacao, token),
      impressaoDoDispositivo(confirmacao, token),
    );
  });

  it('não é o id da confirmação nem o token do ingresso', () => {
    const impressao = impressaoDoDispositivo(confirmacao, token);
    assert.notEqual(impressao, confirmacao);
    assert.notEqual(impressao, token);
    assert.equal(impressao.includes(confirmacao), false);
    assert.equal(impressao.includes(token), false);
  });

  it('muda quando qualquer um dos dois muda', () => {
    const outra = impressaoDoDispositivo(confirmacao, gerarIngressoToken());
    assert.notEqual(impressaoDoDispositivo(confirmacao, token), outra);
  });

  it('confere só o valor exato, e nunca um ausente', () => {
    const esperada = impressaoDoDispositivo(confirmacao, token);
    assert.equal(impressaoConfere(esperada, esperada), true);
    assert.equal(impressaoConfere(undefined, esperada), false);
    assert.equal(impressaoConfere('', esperada), false);
    assert.equal(impressaoConfere(esperada.slice(0, -1), esperada), false);
    assert.equal(impressaoConfere(`${esperada}x`, esperada), false);
  });

  it('o cookie tem escopo do convite, não do site', () => {
    assert.equal(nomeDoCookieDeDispositivo('K7Q2MX'), 'ingresso_K7Q2MX');
    assert.equal(
      caminhoDoCookieDeDispositivo('K7Q2MX'),
      '/palestras/c/K7Q2MX',
    );
  });
});

/* =========================================================
   Arquivo .ics
   ========================================================= */

describe('arquivo de agenda', () => {
  const dados = {
    inicio: deHoraLocal('2026-10-15T19:00'),
    cidade: 'Ji-Paraná',
    localNome: 'Espaço Imagem Eventos',
    localEndereco: 'Av. JK, 1711, Casa Preta',
    uid: 'evento-1.K7Q2MX@acelera-no-campo.nossalavoura',
    agora: new Date('2026-10-01T12:00:00.000Z'),
  };

  const ics = montarIcs(dados);
  const linhas = ics.split('\r\n');

  it('é um VCALENDAR válido, com CRLF', () => {
    assert.equal(linhas[0], 'BEGIN:VCALENDAR');
    assert.equal(ics.trimEnd().endsWith('END:VCALENDAR'), true);
    assert.ok(ics.includes('\r\n'));
  });

  it('marca o horário no fuso do evento, com o VTIMEZONE junto', () => {
    assert.ok(ics.includes('TZID:America/Porto_Velho'));
    assert.ok(ics.includes('TZOFFSETTO:-0400'));
    assert.ok(
      ics.includes('DTSTART;TZID=America/Porto_Velho:20261015T190000'),
      'a palestra das 19h precisa aparecer como 19h locais',
    );
  });

  it('o fim respeita a duração adotada', () => {
    const fim = 19 + HORAS_DE_DURACAO;
    assert.ok(
      ics.includes(`DTEND;TZID=America/Porto_Velho:20261015T${fim}0000`),
    );
  });

  it('escapa a vírgula do endereço, que senão cortaria o local', () => {
    assert.ok(
      ics.includes('LOCATION:Espaço Imagem Eventos\\, Av. JK\\, 1711\\, Casa'),
      'o endereço deveria vir com as vírgulas escapadas',
    );
  });

  it('traz cidade e título no assunto', () => {
    assert.match(ics, /SUMMARY:Circuito de Palestras Acelera no Campo 3\.0/);
    assert.ok(ics.includes('Ji-Paraná'));
  });

  it('não carrega dado pessoal nenhum', () => {
    for (const proibido of [
      'ATTENDEE',
      'ORGANIZER',
      'CPF',
      'cpf',
      'X-INGRESSO',
    ]) {
      assert.equal(
        ics.includes(proibido),
        false,
        `o .ics não pode conter ${proibido}`,
      );
    }
  });

  it('dobra as linhas em 75 octetos, sem partir caractere acentuado', () => {
    for (const linha of linhas) {
      assert.ok(
        Buffer.from(linha, 'utf8').length <= 76,
        `linha longa demais: ${linha}`,
      );
      // Uma dobra no meio de um caractere de dois bytes deixaria U+FFFD.
      assert.equal(linha.includes('�'), false);
    }
  });

  it('nomeia o arquivo sem acento e sem espaço', () => {
    assert.equal(
      nomeDoArquivoIcs('Ji-Paraná'),
      'acelera-no-campo-ji-parana.ics',
    );
    assert.equal(
      nomeDoArquivoIcs("Espigão d'Oeste"),
      'acelera-no-campo-espigao-d-oeste.ics',
    );
  });
});
