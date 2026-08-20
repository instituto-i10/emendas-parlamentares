-- Categorias de beneficiário exigidas pelo jurídico do cliente: administração
-- direta, administração indireta e terceiro setor. Escrita à mão porque a
-- recriação de um enum com remapeamento de dados não é gerada pelo Prisma.
--
-- Mapeamento dos valores antigos:
--   ORGAO_PUBLICO           -> ADMINISTRACAO_DIRETA
--   ENTIDADE_TERCEIRO_SETOR -> TERCEIRO_SETOR
--   OUTRO                   -> ADMINISTRACAO_DIRETA
-- OUTRO some: no acervo atual ele guarda equipamento público (posto do Corpo
-- de Bombeiros), que é administração direta. Quem for de fato indireta passa a
-- ser marcado explicitamente.

-- AlterEnum
ALTER TYPE "TipoBeneficiario" RENAME TO "TipoBeneficiario_old";

CREATE TYPE "TipoBeneficiario" AS ENUM ('ADMINISTRACAO_DIRETA', 'ADMINISTRACAO_INDIRETA', 'TERCEIRO_SETOR');

ALTER TABLE "Beneficiario" ALTER COLUMN "tipo" DROP DEFAULT;

ALTER TABLE "Beneficiario"
  ALTER COLUMN "tipo" TYPE "TipoBeneficiario"
  USING (
    CASE "tipo"::text
      WHEN 'ENTIDADE_TERCEIRO_SETOR' THEN 'TERCEIRO_SETOR'
      ELSE 'ADMINISTRACAO_DIRETA'
    END
  )::"TipoBeneficiario";

ALTER TABLE "Beneficiario" ALTER COLUMN "tipo" SET DEFAULT 'ADMINISTRACAO_DIRETA';

DROP TYPE "TipoBeneficiario_old";

-- CreateTable
CREATE TABLE "PlanoTrabalho" (
    "id" TEXT NOT NULL,
    "emendaId" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL DEFAULT '',
    "objetivo" TEXT NOT NULL DEFAULT '',
    "declaracaoAceita" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,
    "tokenExpiraEm" TIMESTAMP(3),
    "preenchidoPor" TEXT,
    "preenchidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPlanoTrabalho" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "valorUnitario" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPlanoTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanoTrabalho_emendaId_key" ON "PlanoTrabalho"("emendaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoTrabalho_token_key" ON "PlanoTrabalho"("token");

-- CreateIndex
CREATE INDEX "PlanoTrabalho_token_idx" ON "PlanoTrabalho"("token");

-- CreateIndex
CREATE INDEX "ItemPlanoTrabalho_planoId_idx" ON "ItemPlanoTrabalho"("planoId");

-- AddForeignKey
ALTER TABLE "PlanoTrabalho" ADD CONSTRAINT "PlanoTrabalho_emendaId_fkey" FOREIGN KEY ("emendaId") REFERENCES "Emenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPlanoTrabalho" ADD CONSTRAINT "ItemPlanoTrabalho_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoTrabalho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
