CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palestra_auditoria" (
	"id" text PRIMARY KEY NOT NULL,
	"ator_id" text,
	"ator_nome" text,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" text,
	"dados_json" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palestra_checkin" (
	"id" text PRIMARY KEY NOT NULL,
	"convite_id" text NOT NULL,
	"feito_por" text,
	"feito_em" timestamp with time zone DEFAULT now() NOT NULL,
	"metodo" text NOT NULL,
	CONSTRAINT "palestra_checkin_metodo_dominio" CHECK ("palestra_checkin"."metodo" in ('qr', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "palestra_confirmacao" (
	"id" text PRIMARY KEY NOT NULL,
	"convite_id" text NOT NULL,
	"cpf" text NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"cidade" text,
	"propriedade" text,
	"atividade" text,
	"acompanhante_nome" text,
	"ativa" boolean DEFAULT true NOT NULL,
	"aceite_politica_em" timestamp with time zone NOT NULL,
	"aceite_politica_versao" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"ingresso_token" text NOT NULL,
	"confirmado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "palestra_confirmacao_cpf_digitos" CHECK ("palestra_confirmacao"."cpf" ~ '^[0-9]{11}$')
);
--> statement-breakpoint
CREATE TABLE "palestra_convite" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"evento_id" text NOT NULL,
	"colaborador_id" text NOT NULL,
	"lote_id" text,
	"estado" text DEFAULT 'disponivel' NOT NULL,
	"enviado_para" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expirado_em" timestamp with time zone,
	"cancelado_em" timestamp with time zone,
	"cancelado_por" text,
	"motivo_cancelamento" text,
	CONSTRAINT "palestra_convite_estado_dominio" CHECK ("palestra_convite"."estado" in ('disponivel', 'confirmado', 'presente', 'expirado', 'cancelado'))
);
--> statement-breakpoint
CREATE TABLE "palestra_evento" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"cidade" text NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"local_nome" text NOT NULL,
	"local_endereco" text NOT NULL,
	"prazo_confirmacao" timestamp with time zone NOT NULL,
	"prazo_ajustado_manualmente" boolean DEFAULT false NOT NULL,
	"mensagem_whatsapp" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "palestra_evento_prazo_antes" CHECK ("palestra_evento"."prazo_confirmacao" < "palestra_evento"."data_hora")
);
--> statement-breakpoint
CREATE TABLE "palestra_importacao" (
	"id" text PRIMARY KEY NOT NULL,
	"arquivo_nome" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"criados" integer DEFAULT 0 NOT NULL,
	"atualizados" integer DEFAULT 0 NOT NULL,
	"erros_json" jsonb,
	"feito_por" text,
	"feito_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palestra_loja" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_id" text NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"cidade" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palestra_lote" (
	"id" text PRIMARY KEY NOT NULL,
	"evento_id" text NOT NULL,
	"colaborador_id" text NOT NULL,
	"quantidade" integer NOT NULL,
	"criado_por" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "palestra_lote_quantidade_positiva" CHECK ("palestra_lote"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "palestra_regional" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"cpf" text NOT NULL,
	"data_nascimento" text NOT NULL,
	"whatsapp" text,
	"papel" text DEFAULT 'colaborador' NOT NULL,
	"regional_id" text,
	"loja_id" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_papel_dominio" CHECK ("user"."papel" in ('admin', 'gerente_regional', 'gerente_loja', 'colaborador', 'recepcao')),
	CONSTRAINT "user_cpf_digitos" CHECK ("user"."cpf" ~ '^[0-9]{11}$')
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_auditoria" ADD CONSTRAINT "palestra_auditoria_ator_id_user_id_fk" FOREIGN KEY ("ator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_checkin" ADD CONSTRAINT "palestra_checkin_convite_id_palestra_convite_id_fk" FOREIGN KEY ("convite_id") REFERENCES "public"."palestra_convite"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_checkin" ADD CONSTRAINT "palestra_checkin_feito_por_user_id_fk" FOREIGN KEY ("feito_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_confirmacao" ADD CONSTRAINT "palestra_confirmacao_convite_id_palestra_convite_id_fk" FOREIGN KEY ("convite_id") REFERENCES "public"."palestra_convite"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_convite" ADD CONSTRAINT "palestra_convite_evento_id_palestra_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."palestra_evento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_convite" ADD CONSTRAINT "palestra_convite_colaborador_id_user_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_convite" ADD CONSTRAINT "palestra_convite_lote_id_palestra_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."palestra_lote"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_convite" ADD CONSTRAINT "palestra_convite_cancelado_por_user_id_fk" FOREIGN KEY ("cancelado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_importacao" ADD CONSTRAINT "palestra_importacao_feito_por_user_id_fk" FOREIGN KEY ("feito_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_loja" ADD CONSTRAINT "palestra_loja_regional_id_palestra_regional_id_fk" FOREIGN KEY ("regional_id") REFERENCES "public"."palestra_regional"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_lote" ADD CONSTRAINT "palestra_lote_evento_id_palestra_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."palestra_evento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_lote" ADD CONSTRAINT "palestra_lote_colaborador_id_user_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palestra_lote" ADD CONSTRAINT "palestra_lote_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_regional_id_palestra_regional_id_fk" FOREIGN KEY ("regional_id") REFERENCES "public"."palestra_regional"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_loja_id_palestra_loja_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."palestra_loja"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "palestra_auditoria_criado_em_idx" ON "palestra_auditoria" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "palestra_auditoria_acao_idx" ON "palestra_auditoria" USING btree ("acao");--> statement-breakpoint
CREATE INDEX "palestra_auditoria_entidade_idx" ON "palestra_auditoria" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE INDEX "palestra_auditoria_ator_idx" ON "palestra_auditoria" USING btree ("ator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_checkin_convite_idx" ON "palestra_checkin" USING btree ("convite_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_confirmacao_convite_idx" ON "palestra_confirmacao" USING btree ("convite_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_confirmacao_ingresso_idx" ON "palestra_confirmacao" USING btree ("ingresso_token");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_confirmacao_cpf_ativa_idx" ON "palestra_confirmacao" USING btree ("cpf") WHERE "palestra_confirmacao"."ativa";--> statement-breakpoint
CREATE INDEX "palestra_confirmacao_cpf_idx" ON "palestra_confirmacao" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_convite_codigo_idx" ON "palestra_convite" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "palestra_convite_evento_idx" ON "palestra_convite" USING btree ("evento_id");--> statement-breakpoint
CREATE INDEX "palestra_convite_colaborador_idx" ON "palestra_convite" USING btree ("colaborador_id");--> statement-breakpoint
CREATE INDEX "palestra_convite_estado_idx" ON "palestra_convite" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "palestra_convite_evento_colaborador_estado_idx" ON "palestra_convite" USING btree ("evento_id","colaborador_id","estado");--> statement-breakpoint
CREATE INDEX "palestra_convite_lote_idx" ON "palestra_convite" USING btree ("lote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_evento_slug_idx" ON "palestra_evento" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "palestra_evento_data_idx" ON "palestra_evento" USING btree ("data_hora");--> statement-breakpoint
CREATE INDEX "palestra_importacao_feito_em_idx" ON "palestra_importacao" USING btree ("feito_em");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_loja_codigo_idx" ON "palestra_loja" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "palestra_loja_regional_idx" ON "palestra_loja" USING btree ("regional_id");--> statement-breakpoint
CREATE INDEX "palestra_lote_evento_idx" ON "palestra_lote" USING btree ("evento_id");--> statement-breakpoint
CREATE INDEX "palestra_lote_colaborador_idx" ON "palestra_lote" USING btree ("colaborador_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palestra_regional_nome_idx" ON "palestra_regional" USING btree ("nome");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_cpf_idx" ON "user" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_loja_idx" ON "user" USING btree ("loja_id");--> statement-breakpoint
CREATE INDEX "user_regional_idx" ON "user" USING btree ("regional_id");--> statement-breakpoint
CREATE INDEX "user_papel_idx" ON "user" USING btree ("papel");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");