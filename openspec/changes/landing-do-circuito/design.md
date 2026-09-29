## Context

`app/palestras/page.tsx` hoje tem três partes: cabeçalho terra com o selo, grade de cartões brancos com as palestras ativas (`listarPalestrasAtivas`) e um aviso sobre o link pessoal. É uma página de serviço, correta mas sem campanha.

A referência visual é o carrossel de Instagram em `docs/CARROSSEL CONTEÚDO/` (1080 × 1350, 7 slides):

| Slide | Conteúdo | Vira, na página |
|---|---|---|
| 01 | Pasto em curva com borda lima, selo, "Conheça os palestrantes", pílula "Arraste para o lado" | Abertura |
| 02–03 | Ricardo: foto recortada sobre lima, rosto ampliado esmaecido, nome negrito + light, tópicos, etiqueta "Palestra:" creme | Laje do Ricardo |
| 04–05 | Giovani, mesmo padrão | Laje do Giovani |
| 06 | Fundo terra, "Onde e quando", cartões com contorno lima e cidade numa aba, trator espiando na borda | Agenda |
| 07 | Creme, "Garanta sua presença:", trator, regra de cupons, bordão, texto legal | Presença + Promoção |

As fotos dos palestrantes estão em `docs/` já recortadas, com transparência (`Ricardo Arantes.png` 2898 × 3441, 18 MB; `Giovani Pastre.png` 3461 × 3461, 14 MB). O trator só existe dentro do slide 07, sobre fundo creme.

O mockup aprovado fica em `mockup/index.html` (abrir direto no navegador; `mockup/celular.html` mostra em 390 px). Ele usa as fontes e imagens de `public/assets/` e cópias leves das fotos em `mockup/img/`.

## Goals / Non-Goals

**Goals:**
- Reproduzir a sequência e a linguagem do carrossel com os tokens do design system.
- Manter o que a spec da `fundacao` já exige: palestras ativas do banco, ordenadas, sem formulário nem CPF.
- Página leve no celular com internet ruim: fotos de 14–18 MB viram WebP de ~150–200 KB.

**Non-Goals:**
- Cadastro de palestrantes no Admin ou no banco.
- Página por cidade, contagem regressiva, formulário de interesse.
- Alterar a confirmação, o ingresso ou o rodapé público.

## Decisions

### D1 · Palestrantes e promoção em código, agenda no banco
O conteúdo que não muda durante o circuito (dois palestrantes, temas, credenciais, regra da promoção, texto legal) fica em `lib/palestras/conteudo-da-landing.ts`, tipado. Cidades, datas e locais continuam vindo de `listarPalestrasAtivas()`.

*Alternativa considerada:* tabela `palestra_palestrante` com cadastro no Admin. Rejeitada: são duas pessoas fixas para um circuito de cinco dias, e criar tabela, migração e tela de cadastro custa mais do que editar um arquivo e publicar. Se o circuito 4.0 tiver outros nomes, a migração para o banco é direta a partir do mesmo tipo.

### D2 · Cores: tokens do design system, não as do carrossel
O carrossel usa lima `#a9db1f`, terra `#441b14` e creme `#f3edd9`; os tokens são `lima-500 #b8db3d`, `terra-700 #3d201b` e `creme-500 #fffadc`. A página usa **os tokens**, como exige a spec `sistema-visual` (nenhum valor literal de cor). A diferença é pequena e o mockup mostra o resultado real.

*Alternativa considerada:* criar tokens `lima-campanha` etc. Rejeitada por padrão; fica como pergunta aberta (Q1).

### D3 · Efeito do rosto esmaecido com a mesma imagem
A cópia ampliada ao fundo é a mesma WebP da foto principal, com `mix-blend-mode: luminosity`, opacidade baixa e máscara em gradiente, dentro de um bloco com `isolation: isolate`. Nenhum arquivo extra, e o navegador reaproveita o download. É marcada `aria-hidden` e `alt=""`.

*Alternativa considerada:* exportar o rosto esmaecido do Photoshop como imagem própria. Rejeitada: dobra o peso e precisa ser refeita a cada troca de foto.

### D4 · Assets otimizados no build do repositório, não em tempo de requisição
As fotos são aparadas (trim da transparência), reduzidas para 1400 px de altura e convertidas para WebP com alfa por um script em `scripts/` (usa `sharp`, que já está no `node_modules`). O resultado vai versionado em `public/assets/img/palestrantes/`, com cache imutável já configurado para `/assets/`. Os PNGs originais continuam em `docs/`.

*Alternativa considerada:* `next/image` com otimização na Vercel. Rejeitada para manter o mesmo padrão do resto de `public/assets` (imagens estáticas com cache de um ano) e não depender de cota de otimização.

### D5 · Trator
A cliente enviou o PNG original com transparência (`docs/Trator.png`, 741 × 614), que substitui o recorte feito do slide 07 no mockup. Ele aparece só no bloco da promoção: o trator decorativo que espiava na borda da agenda saiu na aprovação, porque não encaixava.

### D5b · Abertura centralizada, sem fotos
Na aprovação do mockup (29/09/2026) a cliente pediu a abertura sem a dupla de palestrantes e com selo, títulos, fatos e ações centralizados. As fotos aparecem só no bloco 2.

### D6 · Horário e data no formato do carrossel
`lib/tempo.ts` ganha `formatarHorarioCurto` (`19h`, `10h30`) e `formatarDiaDaSemana` (`Terça-feira`), ambos no fuso `America/Porto_Velho`. A data do cartão usa "13 de Outubro" com o mês capitalizado, como no slide 06. O prefixo é sempre "Às". No banco, Ji-Paraná já tem local e horário próprios (Espaço Imagem Eventos, 19h), então o "A partir das 8h" do slide não se aplica.

### D7 · Link de mapa sem API
"Abrir no mapa" aponta para `https://www.google.com/maps/search/?api=1&query=<local, endereço, cidade - RO>`. Abre o app de mapas no celular, não exige chave nem coordenadas no banco.

### D8 · Componentes
Blocos em `components/palestras/landing/` (`abertura.tsx`, `palestrantes.tsx`, `agenda.tsx`, `presenca.tsx`, que inclui a promoção) e a pílula de ação (`pilula.tsx`). O visual fica em `landing.module.css`, que usa só variáveis de `tokens.css`: curva com borda, máscara, mistura de camadas e tipografia de campanha não cabem nas classes do tema do Tailwind. Todos são Server Components; a página não envia JavaScript de cliente. A página continua `force-dynamic`.

## Risks / Trade-offs

- [Fotos de pessoas reais na página pública] → Uso já autorizado para o carrossel da mesma campanha; confirmar com a cliente que vale também para o site (Q4).
- [Texto legal da promoção desatualizado] → O texto fica num único lugar (`conteudo-da-landing.ts`) e é o mesmo do slide 07; qualquer mudança do regulamento é uma edição.
- [Página mais pesada que a atual] → Fotos abaixo da dobra com `loading="lazy"` e dimensões declaradas; orçamento de ~700 KB de imagem no total.
- [Depois de 17/10 a página segue mostrando palestras passadas] → Comportamento igual ao de hoje; tratar numa change própria se a cliente quiser marcar "Realizada".

## Migration Plan

Troca de uma página, sem migração de banco. Publicar no preview da Vercel, validar com a cliente em celular e desktop, promover. Reverter é voltar o commit.

## Open Questions

Resolvidas na aprovação do mockup (29/09/2026):

- **Q1:** mantidas as cores dos tokens da marca.
- **Q2:** PNG do trator enviado (`docs/Trator.png`).
- **Q3:** Ji-Paraná vem do banco com local e horário próprios.
- **Q4 e Q5:** mockup aprovado com as fotos e os textos como estão.
