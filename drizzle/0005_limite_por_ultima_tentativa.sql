-- =========================================================
-- Limite de requisições: âncora do bloqueio na ÚLTIMA tentativa
--
-- A implementação inicial (change `confirmacao-convidado`) ancorava a
-- janela na PRIMEIRA tentativa. Com isso, quem errasse uma vez no minuto 0
-- e mais quatro no minuto 14 sairia do bloqueio 60 segundos depois — e a
-- spec pede 15 minutos DEPOIS das 5 tentativas.
--
-- A coluna é anulável de propósito: uma linha recém-aberta por
-- `verificarLimite` ainda não teve tentativa nenhuma, e zero é diferente
-- de "não houve".
-- =========================================================

ALTER TABLE "palestra_limite"
  ADD COLUMN IF NOT EXISTS "ultima_tentativa_em" timestamp with time zone;
--> statement-breakpoint
-- Linhas que já existiam: a melhor aproximação da última tentativa é o
-- instante da última escrita.
UPDATE "palestra_limite"
   SET "ultima_tentativa_em" = "atualizado_em"
 WHERE "ultima_tentativa_em" IS NULL
   AND "tentativas" > 0;
