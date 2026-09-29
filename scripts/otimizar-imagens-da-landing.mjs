/* =========================================================
   Imagens da landing do circuito (`landing-do-circuito`, D4 do design)

   Os originais ficam em `docs/` (PNGs de 14 a 18 MB, já recortados com
   transparência). Este script apara a transparência em volta, gera duas
   alturas de cada foto (a pequena para o celular e para o rosto
   esmaecido, a grande para o desktop) e converte para WebP com alfa em
   `public/assets/img/`, onde o cache de um ano de `/assets/` já vale.
   Rodar de novo só quando um original mudar:

     node scripts/otimizar-imagens-da-landing.mjs
   ========================================================= */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IMAGENS = [
  ...['ricardo-arantes', 'giovani-pastre'].flatMap((id) => {
    const de = `docs/${id === 'ricardo-arantes' ? 'Ricardo Arantes' : 'Giovani Pastre'}.png`;
    return [
      { de, para: `public/assets/img/palestrantes/${id}-500.webp`, altura: 500, qualidade: 70 },
      { de, para: `public/assets/img/palestrantes/${id}-900.webp`, altura: 900, qualidade: 72 },
    ];
  }),
  { de: 'docs/Trator.png', para: 'public/assets/img/trator-5080e.webp', largura: 640, qualidade: 72 },
  // O pasto da abertura: versões próprias, mais leves que as da landing dos
  // 45 anos (que continuam intactas), a partir da maior delas.
  { de: 'public/assets/img/pasto-2400.webp', para: 'public/assets/img/pasto-circuito-800.webp', largura: 800, qualidade: 65, semAparar: true },
  { de: 'public/assets/img/pasto-2400.webp', para: 'public/assets/img/pasto-circuito-1400.webp', largura: 1400, qualidade: 65, semAparar: true },
];

for (const { de, para, altura, largura, qualidade, semAparar } of IMAGENS) {
  let imagem = sharp(path.join(RAIZ, de));
  if (!semAparar) imagem = imagem.trim({ threshold: 1 });
  const info = await imagem
    .resize({ height: altura, width: largura, withoutEnlargement: true })
    .webp({ quality: qualidade, alphaQuality: 80, effort: 6 })
    .toFile(path.join(RAIZ, para));
  console.log(`${para}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}
