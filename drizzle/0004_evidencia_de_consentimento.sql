ALTER TABLE "palestra_confirmacao" ADD COLUMN "aceite_politica_texto" text;--> statement-breakpoint
ALTER TABLE "palestra_confirmacao" ADD COLUMN "aceite_comunicacoes" boolean DEFAULT false NOT NULL;