/* =========================================================
   ESQUEMA · Circuito de Palestras Acelera no Campo 3.0

   O esquema INTEIRO entra nesta change, inclusive as tabelas que só serão
   escritas pelas changes seguintes (`palestra_confirmacao`,
   `palestra_checkin`). Motivo em D2 do design: fragmentar a criação por
   change espalharia migrações que dependem de índices e chaves estrangeiras
   cruzadas — em especial o índice único parcial de CPF, que só faz sentido
   junto com a tabela de convites.

   Convenções:
   - Tabelas de domínio com prefixo `palestra_`; as do Better Auth seguem o
     esquema nativo (`user`, `session`, `account`, `verification`).
   - Todo instante é `timestamptz` em UTC. Conversão para America/Porto_Velho
     só na borda (D8), por `lib/tempo.ts`.
   - CPF só com dígitos.
   ========================================================= */

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/* ---------------------------------------------------------
   Domínios de valor
   --------------------------------------------------------- */

export const PAPEIS = [
  'admin',
  'gerente_regional',
  'gerente_loja',
  'colaborador',
  'recepcao',
] as const;
export type Papel = (typeof PAPEIS)[number];

export const ESTADOS_DE_CONVITE = [
  'disponivel',
  'confirmado',
  'presente',
  'expirado',
  'cancelado',
] as const;
export type EstadoDeConvite = (typeof ESTADOS_DE_CONVITE)[number];

export const METODOS_DE_CHECKIN = ['qr', 'manual'] as const;
export type MetodoDeCheckin = (typeof METODOS_DE_CHECKIN)[number];

/** Papéis cujo escopo é uma loja; os demais não exigem `loja_id`. */
export const PAPEIS_QUE_EXIGEM_LOJA: Papel[] = ['colaborador', 'gerente_loja'];
/** Papéis cujo escopo é uma regional. */
export const PAPEIS_QUE_EXIGEM_REGIONAL: Papel[] = ['gerente_regional'];

const listaSql = (valores: readonly string[]) =>
  sql.raw(valores.map((v) => `'${v}'`).join(', '));

/**
 * Identificador gerado **pelo banco**, não pela aplicação.
 *
 * Importa para a auditoria: um `insert` vindo de um script de manutenção ou
 * de um cliente `psql` também precisa receber id. Se o default existisse só
 * do lado do Drizzle, esses caminhos falhariam — ou, pior, alguém passaria
 * um id à mão.
 */
const id = () =>
  text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);

const criadoEm = () =>
  timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();

/* ---------------------------------------------------------
   Estrutura organizacional
   --------------------------------------------------------- */

export const regional = pgTable(
  'palestra_regional',
  {
    id: id(),
    nome: text('nome').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Nome único — e a importação do CSV reaproveita a regional pelo nome.
    uniqueIndex('palestra_regional_nome_idx').on(t.nome),
  ],
);

export const loja = pgTable(
  'palestra_loja',
  {
    id: id(),
    regionalId: text('regional_id')
      .notNull()
      .references(() => regional.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nome: text('nome').notNull(),
    cidade: text('cidade'),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('palestra_loja_codigo_idx').on(t.codigo),
    index('palestra_loja_regional_idx').on(t.regionalId),
  ],
);

/* ---------------------------------------------------------
   Better Auth · `user` estendida

   As colunas de autenticação (`email_verified`, `image`) já entram aqui
   para que `auth-e-papeis` não precise de outra migração na mesma tabela.
   O papel e os vínculos de escopo são preenchidos desde já pela importação
   de CSV (D9 do design); a APLICAÇÃO das permissões é da change seguinte.
   --------------------------------------------------------- */

export const user = pgTable(
  'user',
  {
    id: id(),
    name: text('name').notNull(),
    email: text('email'),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),

    // --- extensão do domínio ---
    cpf: text('cpf').notNull(),
    dataNascimento: text('data_nascimento').notNull(), // AAAA-MM-DD
    whatsapp: text('whatsapp'),
    papel: text('papel').notNull().default('colaborador'),
    regionalId: text('regional_id').references(() => regional.id, {
      onDelete: 'restrict',
    }),
    lojaId: text('loja_id').references(() => loja.id, {
      onDelete: 'restrict',
    }),
    ativo: boolean('ativo').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_cpf_idx').on(t.cpf),
    // E-mail é opcional; único quando informado (NULLs não colidem).
    uniqueIndex('user_email_idx').on(t.email),
    index('user_loja_idx').on(t.lojaId),
    index('user_regional_idx').on(t.regionalId),
    index('user_papel_idx').on(t.papel),
    check('user_papel_dominio', sql`${t.papel} in (${listaSql(PAPEIS)})`),
    check('user_cpf_digitos', sql`${t.cpf} ~ '^[0-9]{11}$'`),
  ],
);

export const session = pgTable(
  'session',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('session_token_idx').on(t.token),
    index('session_user_idx').on(t.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('account_user_idx').on(t.userId),
    uniqueIndex('account_provider_idx').on(t.providerId, t.accountId),
  ],
);

export const verification = pgTable(
  'verification',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

/* ---------------------------------------------------------
   Palestras, lotes e convites
   --------------------------------------------------------- */

export const evento = pgTable(
  'palestra_evento',
  {
    id: id(),
    slug: text('slug').notNull(),
    cidade: text('cidade').notNull(),
    dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
    localNome: text('local_nome').notNull(),
    localEndereco: text('local_endereco').notNull(),
    prazoConfirmacao: timestamp('prazo_confirmacao', {
      withTimezone: true,
    }).notNull(),
    /**
     * Marca se o Admin mexeu no prazo à mão. Enquanto for falso, mudar a
     * data da palestra recalcula o prazo para a véspera às 23h59.
     */
    prazoAjustadoManualmente: boolean('prazo_ajustado_manualmente')
      .notNull()
      .default(false),
    mensagemWhatsapp: text('mensagem_whatsapp').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('palestra_evento_slug_idx').on(t.slug),
    index('palestra_evento_data_idx').on(t.dataHora),
    // O prazo tem de ser anterior à palestra — regra de negócio que o banco
    // também guarda, para nenhum caminho de escrita escapar dela.
    check(
      'palestra_evento_prazo_antes',
      sql`${t.prazoConfirmacao} < ${t.dataHora}`,
    ),
  ],
);

export const lote = pgTable(
  'palestra_lote',
  {
    id: id(),
    eventoId: text('evento_id')
      .notNull()
      .references(() => evento.id, { onDelete: 'restrict' }),
    colaboradorId: text('colaborador_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    quantidade: integer('quantidade').notNull(),
    criadoPor: text('criado_por').references(() => user.id, {
      onDelete: 'set null',
    }),
    criadoEm: criadoEm(),
  },
  (t) => [
    index('palestra_lote_evento_idx').on(t.eventoId),
    index('palestra_lote_colaborador_idx').on(t.colaboradorId),
    check('palestra_lote_quantidade_positiva', sql`${t.quantidade} > 0`),
  ],
);

export const convite = pgTable(
  'palestra_convite',
  {
    id: id(),
    codigo: text('codigo').notNull(),
    eventoId: text('evento_id')
      .notNull()
      .references(() => evento.id, { onDelete: 'restrict' }),
    colaboradorId: text('colaborador_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    loteId: text('lote_id').references(() => lote.id, { onDelete: 'set null' }),
    estado: text('estado').notNull().default('disponivel'),
    enviadoPara: text('enviado_para'),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiradoEm: timestamp('expirado_em', { withTimezone: true }),
    canceladoEm: timestamp('cancelado_em', { withTimezone: true }),
    canceladoPor: text('cancelado_por').references(() => user.id, {
      onDelete: 'set null',
    }),
    motivoCancelamento: text('motivo_cancelamento'),
  },
  (t) => [
    uniqueIndex('palestra_convite_codigo_idx').on(t.codigo),
    index('palestra_convite_evento_idx').on(t.eventoId),
    index('palestra_convite_colaborador_idx').on(t.colaboradorId),
    index('palestra_convite_estado_idx').on(t.estado),
    // A consulta mais quente da operação: "o que este colaborador tem
    // disponível nesta palestra".
    index('palestra_convite_evento_colaborador_estado_idx').on(
      t.eventoId,
      t.colaboradorId,
      t.estado,
    ),
    index('palestra_convite_lote_idx').on(t.loteId),
    check(
      'palestra_convite_estado_dominio',
      sql`${t.estado} in (${listaSql(ESTADOS_DE_CONVITE)})`,
    ),
  ],
);

/* ---------------------------------------------------------
   Confirmação e check-in
   Criadas aqui, escritas pelas changes `confirmacao-convidado` e
   `operacao-evento`.
   --------------------------------------------------------- */

export const confirmacao = pgTable(
  'palestra_confirmacao',
  {
    id: id(),
    conviteId: text('convite_id')
      .notNull()
      .references(() => convite.id, { onDelete: 'restrict' }),
    cpf: text('cpf').notNull(),
    nome: text('nome').notNull(),
    whatsapp: text('whatsapp').notNull(),
    cidade: text('cidade'),
    propriedade: text('propriedade'),
    atividade: text('atividade'),
    acompanhanteNome: text('acompanhante_nome'),
    /**
     * Passa a falso quando o convite é cancelado, liberando o CPF para uma
     * nova confirmação no circuito.
     */
    ativa: boolean('ativa').notNull().default(true),
    aceitePoliticaEm: timestamp('aceite_politica_em', {
      withTimezone: true,
    }).notNull(),
    aceitePoliticaVersao: text('aceite_politica_versao').notNull(),
    /**
     * O texto exatamente como a pessoa leu, com os marcadores já
     * resolvidos. A versão diz *qual* política foi aceita; isto diz o que
     * estava escrito na tela — é o que responde a um pedido de titular
     * depois de uma revisão jurídica ter mudado a redação.
     */
    aceitePoliticaTexto: text('aceite_politica_texto'),
    /**
     * Opt-in de comunicações, independente do aceite obrigatório. Só com
     * ele verdadeiro os dados podem alimentar campanhas.
     */
    aceiteComunicacoes: boolean('aceite_comunicacoes').notNull().default(false),
    ip: text('ip'),
    userAgent: text('user_agent'),
    /** Aleatório de 32 bytes. É o conteúdo do QR e nunca expõe CPF. */
    ingressoToken: text('ingresso_token').notNull(),
    confirmadoEm: timestamp('confirmado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Uma confirmação por convite.
    uniqueIndex('palestra_confirmacao_convite_idx').on(t.conviteId),
    uniqueIndex('palestra_confirmacao_ingresso_idx').on(t.ingressoToken),
    // Um CPF, uma confirmação ATIVA no circuito inteiro.
    uniqueIndex('palestra_confirmacao_cpf_ativa_idx')
      .on(t.cpf)
      .where(sql`${t.ativa}`),
    index('palestra_confirmacao_cpf_idx').on(t.cpf),
    check('palestra_confirmacao_cpf_digitos', sql`${t.cpf} ~ '^[0-9]{11}$'`),
  ],
);

export const checkin = pgTable(
  'palestra_checkin',
  {
    id: id(),
    conviteId: text('convite_id')
      .notNull()
      .references(() => convite.id, { onDelete: 'restrict' }),
    feitoPor: text('feito_por').references(() => user.id, {
      onDelete: 'set null',
    }),
    feitoEm: timestamp('feito_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    metodo: text('metodo').notNull(),
  },
  (t) => [
    uniqueIndex('palestra_checkin_convite_idx').on(t.conviteId),
    check(
      'palestra_checkin_metodo_dominio',
      sql`${t.metodo} in (${listaSql(METODOS_DE_CHECKIN)})`,
    ),
  ],
);

/* ---------------------------------------------------------
   Importações e auditoria
   --------------------------------------------------------- */

export const importacao = pgTable(
  'palestra_importacao',
  {
    id: id(),
    arquivoNome: text('arquivo_nome').notNull(),
    total: integer('total').notNull().default(0),
    criados: integer('criados').notNull().default(0),
    atualizados: integer('atualizados').notNull().default(0),
    errosJson: jsonb('erros_json'),
    feitoPor: text('feito_por').references(() => user.id, {
      onDelete: 'set null',
    }),
    feitoEm: timestamp('feito_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('palestra_importacao_feito_em_idx').on(t.feitoEm)],
);

export const auditoria = pgTable(
  'palestra_auditoria',
  {
    id: id(),
    /** Nulo quando a ação é de rotina automática (cron). */
    atorId: text('ator_id').references(() => user.id, { onDelete: 'set null' }),
    /** Rótulo legível do ator, preservado mesmo se o usuário for removido. */
    atorNome: text('ator_nome'),
    acao: text('acao').notNull(),
    entidade: text('entidade').notNull(),
    entidadeId: text('entidade_id'),
    dadosJson: jsonb('dados_json'),
    criadoEm: criadoEm(),
  },
  (t) => [
    index('palestra_auditoria_criado_em_idx').on(t.criadoEm),
    index('palestra_auditoria_acao_idx').on(t.acao),
    index('palestra_auditoria_entidade_idx').on(t.entidade, t.entidadeId),
    index('palestra_auditoria_ator_idx').on(t.atorId),
  ],
);

export type Regional = typeof regional.$inferSelect;
export type Loja = typeof loja.$inferSelect;
export type Usuario = typeof user.$inferSelect;
export type Evento = typeof evento.$inferSelect;
export type Lote = typeof lote.$inferSelect;
export type Convite = typeof convite.$inferSelect;
export type Confirmacao = typeof confirmacao.$inferSelect;
export type Checkin = typeof checkin.$inferSelect;
export type Importacao = typeof importacao.$inferSelect;
export type Auditoria = typeof auditoria.$inferSelect;

/* ---------------------------------------------------------
   Limite de requisições e configuração

   Entram com `confirmacao-convidado`, que publica as primeiras rotas
   públicas com escrita. `palestra_limite` é o lastro da implementação
   inicial de `lib/palestras/limite.ts` (D8 do design): `auth-e-papeis`
   pode trocar o mecanismo atrás da mesma interface.
   --------------------------------------------------------- */

export const limite = pgTable(
  'palestra_limite',
  {
    /** `confirmacao:<ip>`, `ingresso:<ip>`, `codigo-inexistente:<ip>`… */
    chave: text('chave').primaryKey(),
    tentativas: integer('tentativas').notNull().default(0),
    /** Início da janela corrente; expirada, a contagem recomeça. */
    janelaInicio: timestamp('janela_inicio', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * Instante da última tentativa consumida. É a âncora do bloqueio
     * (`auth-e-papeis`): a spec pede 15 minutos DEPOIS das 5 tentativas,
     * não 15 minutos depois da primeira. Anulável porque uma linha
     * recém-aberta ainda não teve tentativa — e zero é diferente de
     * "não houve".
     */
    ultimaTentativaEm: timestamp('ultima_tentativa_em', {
      withTimezone: true,
    }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('palestra_limite_atualizado_idx').on(t.atualizadoEm)],
);

/**
 * Configuração editável sem deploy.
 *
 * Guarda os textos de consentimento e a versão vigente da política (D9 e
 * D9b do design). O código traz o valor aprovado como padrão: uma linha
 * aqui só é necessária quando a revisão jurídica mudar o texto.
 */
export const configuracao = pgTable('palestra_configuracao', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Limite = typeof limite.$inferSelect;
export type Configuracao = typeof configuracao.$inferSelect;
