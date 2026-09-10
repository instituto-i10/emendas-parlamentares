-- Quem responde pelo destino e assina o plano de trabalho.
-- Fica no cadastro do beneficiário porque o representante legal é o mesmo em
-- toda emenda destinada àquela entidade.
ALTER TABLE "Beneficiario" ADD COLUMN     "responsavelNome" TEXT;
ALTER TABLE "Beneficiario" ADD COLUMN     "responsavelCargo" TEXT;
ALTER TABLE "Beneficiario" ADD COLUMN     "responsavelEmail" TEXT;
