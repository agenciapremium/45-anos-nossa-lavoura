CREATE TABLE "palestra_configuracao" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palestra_limite" (
	"chave" text PRIMARY KEY NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"janela_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "palestra_limite_atualizado_idx" ON "palestra_limite" USING btree ("atualizado_em");