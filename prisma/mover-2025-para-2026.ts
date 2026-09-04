import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
// MOVE O EXERCÍCIO HERDADO DO PROTÓTIPO DE 2025 PARA 2026.
//
// Por que: o seletor da topbar rotula o exercício pelo CICLO — os dois anos que
// ele envolve (ver src/lib/ciclo.ts). O exercício 2025 aparecia como
// "2024/2025", e 2024 é um ano que ninguém nesta Câmara está olhando em 2026.
//
// O ciclo certo para esta base é o que o próprio protótipo original demonstrava
// — "as apresentadas em 2025 para 2026" —, isto é, exercício 2026, rótulo
// "2025/2026". Nada nos dados muda de natureza: a mesma base fictícia, as
// mesmas emendas, só um ano à frente. Fica ao lado do 2026/2027 real de Mogi
// Guaçu, que é onde as emendas de verdade serão apresentadas.
//
// Tudo pende do exercício por `exercicioId`, então trocar o `ano` da linha do
// Exercicio leva junto dotações, emendas, programas, ações e tramitação. O que
// NÃO acompanha são os anos escritos dentro de texto — número e ementa do PL da
// LOA e do PPA —, que este script reescreve.
//
// Idempotente: rodar duas vezes não faz nada na segunda.
//
//   npx tsx prisma/mover-2025-para-2026.ts
//
// Não é migração de schema: é correção de dado. Bancos novos já nascem em 2026,
// porque os seeds foram ajustados junto (src/lib/seed-data.ts, seed-demo.ts,
// seed-volume.ts).
// ============================================================================

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.Emendas_POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Defina DATABASE_URL/DIRECT_URL no .env antes de rodar.");
  process.exit(1);
}

// Mesmo guard dos outros scripts: recusa banco remoto sem consentimento
// explícito, para ninguém mexer na demonstração hospedada sem querer.
if (/neon\.tech|vercel/.test(url) && process.env.PERMITIR_BANCO_REMOTO !== "1") {
  console.error(
    "Recusando rodar: a connection string parece ser de um banco remoto.\n" +
      "Se a intenção é corrigir a demonstração hospedada, repita com " +
      "PERMITIR_BANCO_REMOTO=1.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const [origem, destino] = await Promise.all([
    prisma.exercicio.findUnique({ where: { ano: 2025 }, select: { id: true } }),
    prisma.exercicio.findUnique({ where: { ano: 2026 }, select: { id: true } }),
  ]);

  // `ano` é único: com os dois presentes não dá para decidir sozinho qual base
  // fica, e adivinhar apagaria dado de alguém.
  if (origem && destino) {
    console.error(
      "Existem os exercícios 2025 E 2026. Este script não sabe qual manter — " +
        "resolva à mão antes de rodar.",
    );
    process.exitCode = 1;
    return;
  }
  if (!origem && !destino) {
    console.log("Não há exercício 2025 nem 2026. Nada a fazer.");
    return;
  }

  const exercicioId = (origem ?? destino)!.id;

  const [emendas, dotacoes] = await Promise.all([
    prisma.emenda.count({ where: { exercicioId } }),
    prisma.dotacao.count({ where: { exercicioId } }),
  ]);

  if (origem) {
    await prisma.exercicio.update({ where: { id: exercicioId }, data: { ano: 2026 } });
    console.log(
      `Exercício 2025 → 2026 (ciclo 2025/2026): ${emendas} emendas e ${dotacoes} ` +
        "dotações acompanharam.",
    );
  } else {
    console.log("Exercício já está em 2026 — conferindo só os anos escritos em texto.");
  }

  // Os anos escritos em texto não acompanham a FK, e por isso esta parte roda
  // mesmo quando o exercício já está em 2026: é o que sobra quando o script é
  // interrompido no meio, ou quando o banco veio de um seed antigo.
  const loa = await prisma.instrumentoPlanejamento.updateMany({
    where: { exercicioId, tipo: "LOA", especie: "PROJETO_LEI", numero: "PL 45/2024" },
    data: {
      numero: "PL 45/2025",
      ementa: "Estima a receita e fixa a despesa do Município para o exercício de 2026.",
    },
  });
  const ppa = await prisma.instrumentoPlanejamento.updateMany({
    where: { exercicioId, tipo: "PPA", numero: "PL 12/2021" },
    data: {
      numero: "PL 12/2025",
      ementa: "Institui o Plano Plurianual do Município para o quadriênio 2026-2029.",
    },
  });

  // O número da emenda também carrega o ano do exercício ("EM 001/2026"), e é
  // texto: renumerar uma a uma é o preço de não ter o ano normalizado.
  const antigas = await prisma.emenda.findMany({
    where: { exercicioId, numero: { endsWith: "/2025" } },
    select: { id: true, numero: true },
  });
  for (const e of antigas) {
    await prisma.emenda.update({
      where: { id: e.id },
      data: { numero: e.numero.replace(/\/2025$/, "/2026") },
    });
  }

  console.log(
    `Textos reescritos: ${loa.count} LOA · ${ppa.count} PPA · ${antigas.length} números de emenda.`,
  );

  const restantes = await prisma.exercicio.findMany({
    orderBy: { ano: "asc" },
    select: { ano: true, status: true },
  });
  console.log(
    "Exercícios agora: " +
      restantes.map((e) => `${e.ano - 1}/${e.ano} (${e.status})`).join(" · "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
