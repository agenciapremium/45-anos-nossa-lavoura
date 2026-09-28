## Why

Nas quatro noites do circuito, tudo o que o sistema construiu se resume à porta de entrada: alguém chega com um QR no celular e a equipe precisa decidir, em segundos, se entra. É a única parte do sistema com pressão de tempo real, fila na frente e nenhuma margem para travar.

Depois da palestra, a cliente precisa saber quem confirmou, quem veio e de qual loja vieram — em lista impressa para a recepção e em planilha para análise.

## What Changes

- Tela de check-in em `/palestras/checkin`, para Recepção e Admin, com escolha da palestra do dia.
- Leitor de QR pela câmera do navegador, sem instalar aplicativo, com três resultados visuais: válido, já utilizado e inválido.
- Busca manual por CPF ou nome como contingência, produzindo exatamente o mesmo registro de check-in do QR.
- Registro de check-in único por convite, aceito apenas no dia da palestra, com transição do convite para `presente`.
- Lista de confirmados para impressão em A4 retrato, ordenada por nome, com caixa para marcação manual.
- Exportação CSV por palestra, abrindo corretamente no Excel em português, com o conteúdo limitado ao escopo de cada papel.
- Números por palestra e por loja no painel: gerados, confirmados, presentes, cancelados, expirados, taxa de confirmação e taxa de comparecimento.

## Capabilities

### New Capabilities

- `checkin`: leitura de QR pela câmera, busca manual por CPF ou nome, registro único por convite, restrição ao dia da palestra e os três resultados da tela.
- `lista-impressao`: página de impressão em A4 retrato com os confirmados de uma palestra, para uso da recepção.
- `exportacao-csv`: exportação por palestra, com colunas definidas, codificação compatível com Excel em pt-BR e conteúdo conforme o papel.
- `indicadores-palestra`: números e taxas por palestra e por loja, respeitando o escopo.

### Modified Capabilities

Nenhuma. Os estados do convite definidos em `fundacao` já preveem `presente`.

## Impact

- **Rotas novas**: `/palestras/checkin` e `/palestras/relatorios`, mais a página de impressão e as rotas de exportação.
- **Escrita**: `palestra_checkin` (criada em `fundacao`) e transição do convite de `confirmado` para `presente`.
- **Novas dependências**: `@zxing/browser` ou `html5-qrcode` para a leitura pela câmera.
- **Requisito de ambiente**: a câmera do navegador exige contexto seguro (HTTPS), já garantido pela Vercel, e permissão concedida pelo usuário no dispositivo.
- **Operação**: a equipe de recepção precisa de usuários criados e testados antes de cada palestra, e de um plano de contingência impresso.
- **Dependências**: `confirmacao-convidado` (ingressos e tokens) e `auth-e-papeis` (papel Recepção e escopo).
