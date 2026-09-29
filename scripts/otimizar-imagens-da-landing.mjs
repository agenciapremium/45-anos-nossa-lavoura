/* =========================================================
   Imagens da landing do circuito (`landing-do-circuito`, D4 do design)

   Os originais ficam em `docs/` (PNGs de 14 a 18 MB, já recortados com
   transparência). Este script apara a transparência em volta, reduz e
   converte para WebP com alfa em `public/assets/img/`, onde o cache de um
   ano de `/assets/` já vale. Rodar de novo só quando um original mudar:

     node scripts/otimizar-imagens-da-landing.mjs
   ========================================================= */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IMAGENS = [
  { de: 'docs/Ricardo Arantes.png', para: 'public/assets/img/palestrantes/ricardo-arantes.webp', altura: 1400 },
  { de: 'docs/Giovani Pastre.png', para: 'public/assets/img/palestrantes/giovani-pastre.webp', altura: 1400 },
  { de: 'docs/Trator.png', para: 'public/assets/img/trator-5080e.webp', altura: 614 },
];

for (const { de, para, altura } of IMAGENS) {
  const info = await sharp(path.join(RAIZ, de))
    .trim({ threshold: 1 })
    .resize({ height: altura, withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(path.join(RAIZ, para));
  console.log(`${para}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}
