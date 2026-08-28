-- PROMPT 12 — Perfis de acesso dinâmicos.
-- Substitui o enum fixo Role por PerfilAcesso em banco, converte as contas
-- existentes e cria as tabelas de viabilidade técnica e execução orçamentária.
-- Idempotente: pode ser reaplicada sem duplicar perfil nem perder vínculo.

-- ---------------------------------------------------------------- enums novos
DO $$ BEGIN
  CREATE TYPE "ResultadoViabilidade" AS ENUM ('VIAVEL', 'VIAVEL_COM_RESSALVA', 'INVIAVEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EtapaExecucao" AS ENUM ('EMPENHO', 'LIQUIDACAO', 'PAGAMENTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------- PerfilAcesso
CREATE TABLE IF NOT EXISTS "PerfilAcesso" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "poder" "Poder",
  "apresentarEmendas" BOOLEAN NOT NULL DEFAULT false,
  "gerirTodasEmendas" BOOLEAN NOT NULL DEFAULT false,
  "tramitarEmendas" BOOLEAN NOT NULL DEFAULT false,
  "gerirPlanejamento" BOOLEAN NOT NULL DEFAULT false,
  "gerirExercicios" BOOLEAN NOT NULL DEFAULT false,
  "administrarConfiguracoes" BOOLEAN NOT NULL DEFAULT false,
  "analisarViabilidade" BOOLEAN NOT NULL DEFAULT false,
  "registrarExecucao" BOOLEAN NOT NULL DEFAULT false,
  "perfilDoSistema" BOOLEAN NOT NULL DEFAULT false,
  "adminGeral" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerfilAcesso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerfilAcesso_nome_key" ON "PerfilAcesso"("nome");
CREATE INDEX IF NOT EXISTS "PerfilAcesso_poder_idx" ON "PerfilAcesso"("poder");

-- Os 5 perfis base. ON CONFLICT preserva o id de uma aplicação anterior (os
-- vínculos de usuário continuam válidos) e apenas realinha as permissões.
INSERT INTO "PerfilAcesso" (
  "id", "nome", "descricao", "poder",
  "apresentarEmendas", "gerirTodasEmendas", "tramitarEmendas",
  "gerirPlanejamento", "gerirExercicios", "administrarConfiguracoes",
  "analisarViabilidade", "registrarExecucao",
  "perfilDoSistema", "adminGeral", "updatedAt"
) VALUES
  ('perfil_admin_geral', 'Administrador Geral',
   'Acesso total ao sistema. Único perfil que compõe novos perfis de acesso.',
   NULL, true, true, true, true, true, true, true, true, true, true, CURRENT_TIMESTAMP),
  ('perfil_vereador', 'Vereador',
   'Gabinete parlamentar: apresenta e gere as emendas de própria autoria, dentro da sua cota.',
   'LEGISLATIVO', true, false, false, false, false, false, false, false, true, false, CURRENT_TIMESTAMP),
  ('perfil_comissao', 'Comissão de Finanças e Orçamento',
   'Conduz a análise técnica: gere qualquer emenda do exercício e aprova ou rejeita com parecer.',
   'LEGISLATIVO', false, true, true, false, false, false, false, false, true, false, CURRENT_TIMESTAMP),
  ('perfil_presidente', 'Presidente da Câmara',
   'Soma as capacidades do vereador e da comissão, mais a administração do Legislativo.',
   'LEGISLATIVO', true, true, true, false, true, true, false, false, true, false, CURRENT_TIMESTAMP),
  ('perfil_executivo', 'Poder Executivo',
   'Instrumentos de planejamento, base de dotações e lei aprovada; analisa a viabilidade técnica e lança a execução orçamentária das emendas.',
   'EXECUTIVO', false, false, false, true, true, true, true, true, true, false, CURRENT_TIMESTAMP)
ON CONFLICT ("nome") DO UPDATE SET
  "descricao" = EXCLUDED."descricao",
  "poder" = EXCLUDED."poder",
  "apresentarEmendas" = EXCLUDED."apresentarEmendas",
  "gerirTodasEmendas" = EXCLUDED."gerirTodasEmendas",
  "tramitarEmendas" = EXCLUDED."tramitarEmendas",
  "gerirPlanejamento" = EXCLUDED."gerirPlanejamento",
  "gerirExercicios" = EXCLUDED."gerirExercicios",
  "administrarConfiguracoes" = EXCLUDED."administrarConfiguracoes",
  "analisarViabilidade" = EXCLUDED."analisarViabilidade",
  "registrarExecucao" = EXCLUDED."registrarExecucao",
  "perfilDoSistema" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------ User.perfilId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "perfilId" TEXT;

CREATE INDEX IF NOT EXISTS "User_perfilId_idx" ON "User"("perfilId");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_perfilId_fkey"
    FOREIGN KEY ("perfilId") REFERENCES "PerfilAcesso"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Conversão das contas existentes. Só preenche quem ainda está sem perfil, de
-- modo que reaplicar não desfaz reatribuição feita depois em Configurações.
-- EXEC_CONSULTA e LEG_CONSULTA ficam SEM perfil de propósito: eram contas de
-- leitura e herdariam poder de escrita se recebessem o perfil do seu Poder.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'role'
  ) THEN
    UPDATE "User" SET "perfilId" = CASE "role"::text
      WHEN 'SUPER_ADMIN'       THEN 'perfil_admin_geral'
      WHEN 'EXEC_ADMIN'        THEN 'perfil_executivo'
      WHEN 'EXEC_PLANEJAMENTO' THEN 'perfil_executivo'
      WHEN 'LEG_ADMIN'         THEN 'perfil_presidente'
      WHEN 'LEG_TECNICO'       THEN 'perfil_comissao'
      WHEN 'LEG_AUTOR'         THEN 'perfil_vereador'
      ELSE NULL
    END
    WHERE "perfilId" IS NULL;
  END IF;
END $$;

-- Contas de demonstração antigas. Autor e AuditLog são ON DELETE SET NULL:
-- nenhuma emenda ou trilha se perde, apenas o vínculo com a conta.
DELETE FROM "User" WHERE "email" IN (
  'exec.admin@municipio.gov.br',
  'planejamento@municipio.gov.br',
  'exec.consulta@municipio.gov.br',
  'mesa@camara.gov.br',
  'analista@camara.gov.br',
  'leg.consulta@camara.gov.br'
);

-- Só agora o papel fixo sai de cena.
DROP INDEX IF EXISTS "User_role_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "Role";

-- --------------------------------------------------- ParecerViabilidade
CREATE TABLE IF NOT EXISTS "ParecerViabilidade" (
  "id" TEXT NOT NULL,
  "emendaId" TEXT NOT NULL,
  "resultado" "ResultadoViabilidade" NOT NULL,
  "justificativa" TEXT NOT NULL,
  "usuarioId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParecerViabilidade_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ParecerViabilidade_emendaId_idx" ON "ParecerViabilidade"("emendaId");
CREATE INDEX IF NOT EXISTS "ParecerViabilidade_criadoEm_idx" ON "ParecerViabilidade"("criadoEm");

DO $$ BEGIN
  ALTER TABLE "ParecerViabilidade" ADD CONSTRAINT "ParecerViabilidade_emendaId_fkey"
    FOREIGN KEY ("emendaId") REFERENCES "Emenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParecerViabilidade" ADD CONSTRAINT "ParecerViabilidade_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------- AndamentoExecucao
CREATE TABLE IF NOT EXISTS "AndamentoExecucao" (
  "id" TEXT NOT NULL,
  "emendaId" TEXT NOT NULL,
  "etapa" "EtapaExecucao" NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  "valor" DECIMAL(18,2) NOT NULL,
  "numeroDocumento" TEXT,
  "observacao" TEXT,
  "usuarioId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AndamentoExecucao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AndamentoExecucao_emendaId_idx" ON "AndamentoExecucao"("emendaId");
CREATE INDEX IF NOT EXISTS "AndamentoExecucao_etapa_idx" ON "AndamentoExecucao"("etapa");
CREATE INDEX IF NOT EXISTS "AndamentoExecucao_data_idx" ON "AndamentoExecucao"("data");

DO $$ BEGIN
  ALTER TABLE "AndamentoExecucao" ADD CONSTRAINT "AndamentoExecucao_emendaId_fkey"
    FOREIGN KEY ("emendaId") REFERENCES "Emenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AndamentoExecucao" ADD CONSTRAINT "AndamentoExecucao_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
