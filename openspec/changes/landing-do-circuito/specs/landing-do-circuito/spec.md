## ADDED Requirements

### Requirement: Estrutura da página segue o carrossel da campanha
A página `/palestras` SHALL apresentar, nesta ordem, os blocos Abertura, Palestrantes, Onde e quando, Garanta sua presença e Promoção, seguidos do rodapé público. A linguagem visual SHALL reproduzir a do carrossel `docs/CARROSSEL CONTEÚDO/` (laje lima por palestrante, fundo terra na agenda, fundo creme na abertura e na presença), usando apenas os tokens do design system.

#### Scenario: Visitante percorre a página
- **WHEN** um visitante acessa `/palestras` e rola até o fim
- **THEN** encontra os cinco blocos na ordem Abertura, Palestrantes, Onde e quando, Garanta sua presença e Promoção, e depois o rodapé com a Política de Privacidade e o canal do encarregado de dados

#### Scenario: Selo do circuito preservado
- **WHEN** a abertura é renderizada em qualquer largura
- **THEN** o selo do circuito aparece inteiro, em proporção 1:1, sem recorte nem distorção, centralizado com o título, os fatos e as ações

### Requirement: Apresentação dos palestrantes
A página SHALL apresentar cada palestrante com foto recortada, nome, credenciais e o tema da palestra, com os textos do carrossel. O nome SHALL ser um título de seção e a foto SHALL ter texto alternativo descritivo; a cópia ampliada e esmaecida ao fundo MUST ser decorativa e ignorada por leitores de tela.

#### Scenario: Ricardo Arantes
- **WHEN** o visitante chega ao bloco de palestrantes
- **THEN** vê "Ricardo Arantes", as credenciais "Zootecnista" e "TRI Comunicação" e o tema "Desafios do Agro Moderno: você está preparado?"

#### Scenario: Giovani Pastre
- **WHEN** o visitante chega ao bloco de palestrantes
- **THEN** vê "Giovani Pastre", as credenciais "Gerente Técnico da Virbac", "Doutorando em Reprodução Animal pela USP" e "Mestre em Ciência Animal e especialista em Reprodução de Bovinos e Produção de Leite", e o tema "Controle sanitário na reprodução: estratégias para otimizar a rentabilidade na cria"

#### Scenario: Leitor de tela
- **WHEN** a página é percorrida com um leitor de tela
- **THEN** cada foto de palestrante é anunciada uma única vez, com o nome da pessoa, e a imagem de fundo esmaecida não é anunciada

### Requirement: Agenda derivada das palestras ativas
O bloco Onde e quando SHALL listar as palestras ativas do banco, ordenadas por data, com cidade, dia da semana, data por extenso, nome do local, endereço e horário no fuso `America/Porto_Velho`. Cada palestra SHALL ter um link que abre o endereço num aplicativo de mapas.

#### Scenario: Cartão de uma palestra
- **WHEN** existe uma palestra ativa em Vilhena, terça-feira, 13/10/2026 às 19h00 (UTC-4), no Degustare Restaurante
- **THEN** o cartão mostra a aba "Vilhena", "Terça-feira", "13 de Outubro", "Degustare Restaurante", o endereço cadastrado e "Às 19h"

#### Scenario: Horário com minutos
- **WHEN** a palestra começa às 10h30
- **THEN** o horário aparece como "10h30"; quando começa na hora cheia, sem minutos ("19h")

#### Scenario: Abrir no mapa
- **WHEN** o visitante toca em "Abrir no mapa" de uma palestra
- **THEN** abre, em nova aba, uma busca de mapa com o nome do local, o endereço e a cidade da palestra

#### Scenario: Palestra desativada
- **WHEN** o Admin desativa uma palestra
- **THEN** ela deixa de aparecer no bloco Onde e quando, e o fato "N cidades" da abertura passa a contar só as ativas

#### Scenario: Nenhuma palestra ativa
- **WHEN** não há palestra ativa
- **THEN** o bloco Onde e quando mostra que as datas ainda vão ser anunciadas, e os demais blocos continuam visíveis

### Requirement: Orientação de confirmação sem formulário
O bloco Garanta sua presença SHALL explicar que a confirmação é feita pelo link pessoal recebido de um colaborador pelo WhatsApp, que cada link vale para uma pessoa e um acompanhante, e que o ingresso é apresentado na entrada. A página MUST NOT conter formulário, campo de CPF ou botão de confirmação.

#### Scenario: Visitante sem convite
- **WHEN** o visitante lê o bloco Garanta sua presença
- **THEN** encontra a orientação de procurar o consultor da loja Nossa Lavoura mais próxima e o botão "Já confirmei · ver meu ingresso", que leva a `/palestras/ingresso`

#### Scenario: Nada de formulário
- **WHEN** o HTML de `/palestras` é inspecionado
- **THEN** não há elemento `form`, `input` nem campo de CPF

### Requirement: Promoção com texto legal
O bloco Promoção SHALL apresentar a regra de cupons (R$ 500 em produtos Virbac ou R$ 2.000 em produtos Supremax por cupom), o prêmio Trator John Deere 5080E, o bordão "Acelere conhecimento. Acelere resultados. Acelere no Campo." e o texto legal integral com o Certificado de Autorização SPA/ME nº 06.049607/2026.

#### Scenario: Texto legal presente
- **WHEN** o visitante chega ao fim do bloco Promoção
- **THEN** lê o texto legal completo, com o número do certificado, o período da promoção e a indicação do regulamento em nossalavoura.com.br

### Requirement: Desempenho e leitura no celular
A página SHALL ser legível e operável a partir de 360 px de largura, sem rolagem horizontal, com alvos de toque de no mínimo 48 px. As imagens SHALL ser servidas em WebP com dimensões declaradas, e apenas as imagens da abertura MAY carregar de imediato; as demais MUST carregar sob demanda.

#### Scenario: Celular estreito
- **WHEN** a página é aberta num celular de 360 px
- **THEN** nenhum bloco causa rolagem horizontal e todos os botões e links de mapa têm ao menos 48 px de altura

#### Scenario: Peso das imagens
- **WHEN** a página é carregada num celular sem rolar
- **THEN** as fotos dos palestrantes do bloco 2 e o trator não são baixadas até se aproximarem da área visível

### Requirement: Compartilhamento
Os metadados de `/palestras` SHALL descrever o circuito com os nomes dos dois palestrantes e os temas das palestras, e manter o endereço canônico atual.

#### Scenario: Link colado no WhatsApp
- **WHEN** o link de `/palestras` é colado no WhatsApp
- **THEN** a prévia mostra o título do circuito e uma descrição que cita Ricardo Arantes e Giovani Pastre
