-- Plano de trabalho nos QUATRO MODELOS OFICIAIS.
--
-- Até aqui o plano era um só, decidido pela categoria do beneficiário, e pedia
-- justificativa, objetivo, declaração e planilha. Os modelos I a IV do cliente
-- decidem pela NATUREZA DA DESPESA e pedem outra coisa: metas físicas, memória
-- de cálculo com origem do preço e cronograma de desembolso previsto. No
-- Modelo III entram ainda a entidade, sete declarações e a assinatura
-- eletrônica simples do representante legal.
--
-- Os planos existentes são DESCARTADOS, por decisão do cliente: são dados de
-- demonstração (43 planos, 28 itens de planilha), e convertê-los produziria
-- planos incompletos — metas e cronograma nasceriam vazios de qualquer forma, e
-- a origem do preço não existe no acervo antigo. O seed recria tudo no formato
-- novo. Apagar primeiro também é o que permite criar as colunas obrigatórias
-- sem inventar valor de preenchimento.

DELETE FROM "PlanoTrabalho";

-- CreateEnum
CREATE TYPE "ModeloPlanoTrabalho" AS ENUM ('CUSTEIO', 'OBRAS', 'TERCEIRO_SETOR', 'EQUIPAMENTOS');

-- AlterTable: PlanoTrabalho
ALTER TABLE "PlanoTrabalho" DROP COLUMN "justificativa";
ALTER TABLE "PlanoTrabalho" DROP COLUMN "objetivo";
ALTER TABLE "PlanoTrabalho" DROP COLUMN "declaracaoAceita";

ALTER TABLE "PlanoTrabalho" ADD COLUMN "modelo" "ModeloPlanoTrabalho";

ALTER TABLE "PlanoTrabalho" ADD COLUMN "entidadeRazaoSocial" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "entidadeCnpj" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "entidadeAnos" INTEGER;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "orgaoRepassador" TEXT;

ALTER TABLE "PlanoTrabalho" ADD COLUMN "declIdentificacao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declConstituicao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declAdimplencia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declParentesco" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declSancoes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declFichaLimpa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "declResponsabilidade" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinanteNome" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinanteCpf" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinanteCargo" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinanteEmail" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinadoEm" TIMESTAMP(3);
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinaturaIp" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinaturaAgente" TEXT;
ALTER TABLE "PlanoTrabalho" ADD COLUMN "assinaturaHash" TEXT;

-- AlterTable: ItemPlanoTrabalho vira a memória de cálculo e passa a falar o
-- mesmo vocabulário das metas.
ALTER TABLE "ItemPlanoTrabalho" DROP COLUMN "descricao";
ALTER TABLE "ItemPlanoTrabalho" DROP COLUMN "quantidade";
ALTER TABLE "ItemPlanoTrabalho" ADD COLUMN "beneficiarios" TEXT NOT NULL;
ALTER TABLE "ItemPlanoTrabalho" ADD COLUMN "metaFisica" DECIMAL(18,4) NOT NULL;
ALTER TABLE "ItemPlanoTrabalho" ADD COLUMN "origemPreco" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MetaPlanoTrabalho" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "beneficiarios" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "metaFisica" DECIMAL(18,4) NOT NULL,
    "comprovacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaPlanoTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelaPlanoTrabalho" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "valor" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelaPlanoTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaPlanoTrabalho_planoId_idx" ON "MetaPlanoTrabalho"("planoId");
CREATE INDEX "ParcelaPlanoTrabalho_planoId_idx" ON "ParcelaPlanoTrabalho"("planoId");

-- AddForeignKey
ALTER TABLE "MetaPlanoTrabalho" ADD CONSTRAINT "MetaPlanoTrabalho_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoTrabalho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelaPlanoTrabalho" ADD CONSTRAINT "ParcelaPlanoTrabalho_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoTrabalho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
