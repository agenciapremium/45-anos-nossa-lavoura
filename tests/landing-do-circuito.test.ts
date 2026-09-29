import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PALESTRANTES, PROMOCAO, urlDoMapa } from '@/lib/palestras/conteudo-da-landing';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('landing do circuito', () => {
  it('monta a busca de mapa com local, endereço e cidade', () => {
    const url = urlDoMapa({
      localNome: 'Degustare Restaurante',
      localEndereco: 'Avenida Major Amarante, 4360',
      cidade: 'Vilhena',
    });
    assert.ok(url.startsWith('https://www.google.com/maps/search/?api=1&query='));
    assert.equal(
      decodeURIComponent(url.split('query=')[1] as string),
      'Degustare Restaurante, Avenida Major Amarante, 4360, Vilhena - RO',
    );
  });

  it('as imagens citadas no conteúdo existem em public/', () => {
    const imagens = [
      ...PALESTRANTES.flatMap((p) => [p.foto.pequena.src, p.foto.grande.src]),
      PROMOCAO.trator.src,
    ];
    for (const src of imagens) {
      assert.ok(fs.existsSync(path.join(RAIZ, 'public', src)), `falta ${src}`);
    }
  });

  it('o texto legal traz o certificado de autorização', () => {
    assert.match(PROMOCAO.textoLegal, /SPA\/ME nº 06\.049607\/2026/);
  });

  it('a página pública não tem formulário nem campo de CPF', () => {
    const fontes = [
      'app/palestras/page.tsx',
      ...fs
        .readdirSync(path.join(RAIZ, 'components/palestras/landing'))
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => `components/palestras/landing/${f}`),
    ].map((f) => fs.readFileSync(path.join(RAIZ, f), 'utf8'));
    for (const fonte of fontes) {
      assert.doesNotMatch(fonte, /<form|<input|\bcpf\b/i);
    }
  });
});
