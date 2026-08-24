import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
// ESVAZIA O CADASTRO DE BENEFICIÁRIOS.
//
// Os nomes que estavam na demonstração — UBS Jardim Itamaraty, Creche Municipal
// Vila Esperança, EMEB Professora Marta Ribeiro… — são FICTÍCIOS, do seed do
// protótipo original. Não são equipamentos de Mogi Guaçu, e o jurídico do
// cliente pediu que saíssem: "não vale a pena fixar, é melhor deixar o vereador
// cadastrar e o cadastro vai aumentando com o tempo".
//
// A tela passa a abrir vazia e o cadastro cresce pelo uso — o campo "para onde
// vai", no formulário da emenda, cadastra sem sair da tela.
//
// As emendas NÃO são apagadas: elas apenas ficam sem beneficiário vinculado
// (`beneficiarioId = null`), que é o estado de qualquer emenda antes de o autor
// dizer para onde o recurso vai.
//
// Uso:  npm run db:limpar-beneficiarios
// ============================================================================

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.Emendas_POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Defina DATABASE_URL/DIRECT_URL no .env antes de rodar.");
  process.exit(1);
}

// Mesmo guarda dos seeds: recusa banco remoto sem consentimento explícito.
if (/neon\.tech|vercel/.test(url) && process.env.PERMITIR_BANCO_REMOTO !== "1") {
  console.error(
    "Recusando rodar: a connection string parece ser de um banco remoto.\n" +
    "Se a intenção é limpar a demonstração hospedada, repita com " +
    "PERMITIR_BANCO_REMOTO=1.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const antes = await prisma.beneficiario.findMany({
    select: { nome: true, _count: { select: { emendas: true } } },
    orderBy: { nome: "asc" },
  });
  if (antes.length === 0) {
    console.log("O cadastro de beneficiários já está vazio.");
    return;
  }

  console.log(`Apagando ${antes.length} beneficiário(s):`);
  for (const b of antes) {
    console.log(`  - ${b.nome}${b._count.emendas ? ` (${b._count.emendas} emenda(s))` : ""}`);
  }

  const [desvinculadas] = await prisma.$transaction([
    prisma.emenda.updateMany({
      where: { beneficiarioId: { not: null } },
      data: { beneficiarioId: null },
    }),
    prisma.beneficiario.deleteMany({}),
  ]);

  console.log(
    `\nPronto: ${antes.length} apagado(s), ${desvinculadas.count} emenda(s) ficaram sem ` +
    "beneficiário. A tela abre vazia e o cadastro volta a crescer pelo uso.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
