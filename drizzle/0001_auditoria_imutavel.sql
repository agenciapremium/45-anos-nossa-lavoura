-- Trilha de auditoria imutável.
--
-- A spec `auditoria` exige que qualquer tentativa de alterar ou apagar um
-- registro existente seja recusada. Uma regra só na aplicação não basta:
-- bastaria um `update` esquecido, um script de manutenção ou uma futura
-- change para furar a trilha. A garantia fica no banco.
--
-- `TRUNCATE` também é bloqueado, porque apagaria a tabela inteira sem
-- disparar o gatilho de linha.

CREATE OR REPLACE FUNCTION palestra_auditoria_somente_insercao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'palestra_auditoria e imutavel: % nao e permitido', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS palestra_auditoria_sem_update ON "palestra_auditoria";
--> statement-breakpoint
CREATE TRIGGER palestra_auditoria_sem_update
BEFORE UPDATE ON "palestra_auditoria"
FOR EACH ROW EXECUTE FUNCTION palestra_auditoria_somente_insercao();
--> statement-breakpoint
DROP TRIGGER IF EXISTS palestra_auditoria_sem_delete ON "palestra_auditoria";
--> statement-breakpoint
CREATE TRIGGER palestra_auditoria_sem_delete
BEFORE DELETE ON "palestra_auditoria"
FOR EACH ROW EXECUTE FUNCTION palestra_auditoria_somente_insercao();
--> statement-breakpoint
DROP TRIGGER IF EXISTS palestra_auditoria_sem_truncate ON "palestra_auditoria";
--> statement-breakpoint
CREATE TRIGGER palestra_auditoria_sem_truncate
BEFORE TRUNCATE ON "palestra_auditoria"
FOR EACH STATEMENT EXECUTE FUNCTION palestra_auditoria_somente_insercao();
