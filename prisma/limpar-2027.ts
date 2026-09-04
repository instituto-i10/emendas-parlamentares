import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
// ZERA AS EMENDAS DO EXERCÍCIO-ALVO — mantendo a base orçamentária.
//
// O 2026/2027 é o ciclo que o cliente vai usar de verdade, e demonstrá-lo com
// emendas fictícias já apresentadas confunde: dá a impressão de que o sistema
// vem com dados dentro. O que se quer é a tela como ela estará no primeiro dia
// — vazia, esperando a primeira emenda.
//
// O que SAI: emendas do exercício e tudo que pende delas (plano de trabalho,
// metas, memória de cálculo, cronograma, tramitação, pareceres) — as FKs são
// `onDelete: Cascade`, então apagar a emenda basta.
//
// O que FICA: exercício, instrumentos (PPA/LDO/LOA), dotações, órgãos,
// programas, ações e beneficiários. Sem eles não há como apresentar emenda
// nenhuma, e a tela vazia viraria uma tela quebrada.
//
//   npx tsx prisma/limpar-2027.ts          → apaga as emendas de 2027
//   ANO=2025 npx tsx prisma/limpar-2027.ts → apaga as de outro exercício
// ============================================================================

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const ano = Number(process.env.ANO ?? 2027);

  const exercicio = await prisma.exercicio.findFirst({
    where: { ano },
    select: { id: true, ano: true },
  });
  if (!exercicio) {
    console.log(`Exercício ${ano} não existe. Nada a fazer.`);
    return;
  }

  const antes = await prisma.emenda.count({ where: { exercicioId: exercicio.id } });
  if (antes === 0) {
    console.log(`Exercício ${ano} já está sem emendas.`);
  } else {
    const { count } = await prisma.emenda.deleteMany({
      where: { exercicioId: exercicio.id },
    });
    console.log(`Exercício ${ano}: ${count} emendas apagadas (com planos e tramitação).`);
  }

  // Confere que a base para apresentar emenda continua de pé: é ela que separa
  // "tela vazia" de "tela quebrada".
  const [dotacoes, instrumentos, beneficiarios] = await Promise.all([
    prisma.dotacao.count({ where: { exercicioId: exercicio.id } }),
    prisma.instrumentoPlanejamento.count({ where: { exercicioId: exercicio.id } }),
    prisma.beneficiario.count(),
  ]);
  console.log(
    `Base preservada: ${dotacoes} dotações · ${instrumentos} instrumentos · ${beneficiarios} beneficiários.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
