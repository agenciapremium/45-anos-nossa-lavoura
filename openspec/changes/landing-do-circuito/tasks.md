## 1. Mockup

- [x] 1.1 Montar o mockup estático em `mockup/index.html` a partir do carrossel, com tokens, fontes e fotos reais
- [x] 1.2 Criar `mockup/celular.html` para revisar em 390 px
- [x] 1.3 Aprovação do mockup pela cliente (29/09/2026), com abertura centralizada sem fotos e sem o trator da agenda

## 2. Assets

- [x] 2.1 Criar `scripts/otimizar-imagens-da-landing.mjs` (sharp: trim, 1400 px de altura, WebP com alfa) e gerar `public/assets/img/palestrantes/ricardo-arantes.webp` e `giovani-pastre.webp`
- [x] 2.2 Gerar `public/assets/img/trator-5080e.webp` a partir do PNG original (`docs/Trator.png`)
- [x] 2.3 Conferir que os arquivos em `/assets/img/` saem com `Cache-Control` imutável

## 3. Conteúdo e formatação

- [x] 3.1 Criar `lib/palestras/conteudo-da-landing.ts` com palestrantes (nome, sobrenome, credenciais, tema, foto, alt), promoção, bordão e texto legal
- [x] 3.2 Adicionar `formatarHorarioCurto` e `formatarDiaDaSemana` em `lib/tempo.ts`, com testes para 19h, 10h30 e virada de fuso
- [x] 3.3 Função que monta a URL de "Abrir no mapa" a partir de local, endereço e cidade, com teste

## 4. Componentes da landing

- [x] 4.1 `components/palestras/landing/pilula.tsx`: CTA em pílula com círculo e seta (para o lado ou para baixo), 56 px de altura
- [x] 4.2 `abertura.tsx`: pasto em curva com borda lima, selo 1:1, título, subtítulo, fatos (cidades contadas das palestras ativas) e ações, tudo centralizado
- [x] 4.3 `palestrantes.tsx`: laje lima com foto, rosto esmaecido decorativo, nome negrito + light, credenciais, etiqueta "Palestra:" e tema; variante com a foto do outro lado
- [x] 4.4 `agenda.tsx`: fundo terra, cartões com aba da cidade, ícones, data, local, endereço, horário e link de mapa; estado vazio
- [x] 4.5 `presenca.tsx`: três passos, aviso para quem não recebeu e botão para `/palestras/ingresso`, sem formulário
- [x] 4.6 Promoção (dentro de `presenca.tsx`): trator, regra de cupons, bordão e texto legal

## 5. Página

- [x] 5.1 Reescrever `app/palestras/page.tsx` compondo os blocos na ordem da spec, mantendo `force-dynamic` e `RodapePublico`
- [x] 5.2 Atualizar `metadata` (descrição e Open Graph com os nomes e temas)
- [x] 5.3 Imagens abaixo da dobra com `loading="lazy"` e `width`/`height` declarados

## 6. Verificação

- [x] 6.1 Testes: conteúdo, imagens existentes, URL do mapa e ausência de formulário (`tests/landing-do-circuito.test.ts`); lista das ativas coberta pela consulta existente
- [x] 6.2 Conferir em 360 px, 390 px e 1440 px: sem rolagem horizontal, alvos de 48 px, foco visível em lima
- [ ] 6.3 Leitor de tela: fotos anunciadas uma vez, imagens decorativas ignoradas, títulos em ordem
- [x] 6.4 `npm run typecheck` e `npm test` passando
- [ ] 6.5 Validação da cliente no preview da Vercel, no celular
