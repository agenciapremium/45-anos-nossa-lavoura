ALTER TABLE "palestra_convite" ALTER COLUMN "colaborador_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "palestra_lote" ALTER COLUMN "colaborador_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "palestra_lote" ADD COLUMN "rotulo" text;