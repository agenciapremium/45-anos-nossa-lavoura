## ADDED Requirements

### Requirement: Reconstrução da landing em Next.js com paridade pública
A landing dos 45 anos e a página da foto comemorativa SHALL ser reconstruídas como páginas React do App Router, substituindo o HTML estático, sem alterar as URLs, o conteúdo visível, o comportamento ou os headers de resposta percebidos pelo visitante.

#### Scenario: Landing dos 45 anos continua na mesma URL
- **WHEN** um visitante acessa `https://45anosnossalavoura.agpremium.com.br/`
- **THEN** recebe HTTP 200 com a landing dos 45 anos, visualmente equivalente à versão estática anterior em desktop e em celular

#### Scenario: Seções e interações da landing preservadas
- **WHEN** o visitante percorre a landing reconstruída
- **THEN** encontra as mesmas seções, textos, imagens, vídeos, âncoras e comportamentos interativos da versão anterior

#### Scenario: Foto comemorativa preservada na mesma URL
- **WHEN** um visitante acessa `/foto-comemorativa`
- **THEN** recebe HTTP 200 e consegue gerar a foto com as molduras de perfil e de story, como na versão anterior

#### Scenario: Redirects mantidos
- **WHEN** um visitante acessa `/figurinhas` ou `/figurinhas/qualquer-coisa`
- **THEN** é redirecionado com 301 para o caminho correspondente em `/foto-comemorativa`

#### Scenario: SEO preservado
- **WHEN** um rastreador acessa a landing
- **THEN** encontra o mesmo título, a mesma descrição e as mesmas imagens de compartilhamento da versão anterior, e `robots.txt` e `sitemap.xml` continuam respondendo nas mesmas URLs

#### Scenario: Cache de assets preservado
- **WHEN** o navegador requisita um arquivo sob `/assets/`
- **THEN** a resposta traz `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Headers de segurança preservados
- **WHEN** qualquer página é servida
- **THEN** a resposta traz `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options` com os mesmos valores da configuração anterior

#### Scenario: HTML estático removido do repositório
- **WHEN** a migração está concluída
- **THEN** `index.html`, `styles.css`, `main.js` e a pasta `foto-comemorativa/` não existem mais na raiz do repositório, e nenhuma rota depende deles

### Requirement: Espaço de rotas do módulo
Todas as telas e endpoints do sistema de confirmação SHALL viver sob o prefixo `/palestras`.

#### Scenario: Rota inexistente sob o módulo
- **WHEN** um visitante acessa uma rota sob `/palestras` que não existe
- **THEN** o sistema responde 404 com a identidade visual do Acelera no Campo 3.0

### Requirement: Página pública de apresentação do circuito
O sistema SHALL publicar em `/palestras` uma página aberta que apresenta o circuito e lista as palestras ativas, sem qualquer formulário de confirmação.

#### Scenario: Visitante vê as palestras ativas
- **WHEN** um visitante acessa `/palestras`
- **THEN** vê, para cada palestra ativa, cidade, data, horário, local e endereço, ordenadas por data

#### Scenario: Página não permite confirmar
- **WHEN** um visitante acessa `/palestras`
- **THEN** não encontra campo de CPF nem botão de confirmação, apenas a orientação de que a confirmação é feita pelo link recebido do colaborador

#### Scenario: Palestra desativada não aparece
- **WHEN** o Admin desativa uma palestra
- **THEN** ela deixa de aparecer em `/palestras`

### Requirement: Configuração por variáveis de ambiente
O sistema SHALL ler toda configuração sensível de variáveis de ambiente e MUST falhar de forma explícita quando uma variável obrigatória estiver ausente.

#### Scenario: Variável obrigatória ausente
- **WHEN** a aplicação inicia sem `DATABASE_URL` ou `APP_BASE_URL`
- **THEN** a inicialização falha com mensagem nomeando a variável faltante, sem expor valores de outras variáveis

#### Scenario: Segredos nunca chegam ao cliente
- **WHEN** o bundle do navegador é inspecionado
- **THEN** nenhuma variável de ambiente de servidor (`DATABASE_URL`, `CRON_SECRET`) aparece nele

### Requirement: Fuso horário do circuito
O sistema SHALL tratar datas e prazos no fuso `America/Porto_Velho` (UTC-4) na exibição e na comparação de prazos, independentemente do fuso do servidor ou do dispositivo.

#### Scenario: Prazo avaliado no fuso do evento
- **WHEN** o servidor roda em UTC e são 02h00 UTC do dia 13/10/2026
- **THEN** o sistema considera que ainda são 22h00 do dia 12/10/2026 em Porto Velho, e o prazo das 23h59 de 12/10 ainda não venceu
