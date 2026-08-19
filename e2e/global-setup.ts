import { execFileSync } from "node:child_process";
import { TEST_DATABASE_URL } from "../playwright.config";

// Recria o banco de teste do zero antes da suíte. Determinismo importa mais
// que velocidade aqui: os testes afirmam números concretos (41 emendas,
// 13 autores, 2.290 dotações) e mutam dados ao apresentar e tramitar emendas.

const env = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
};

function rodar(comando: string, args: string[], titulo: string) {
  process.stdout.write(`  ${titulo}… `);
  const t0 = Date.now();
  try {
    execFileSync(comando, args, { env, stdio: "pipe", cwd: process.cwd() });
    process.stdout.write(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  } catch (e) {
    process.stdout.write("FALHOU\n");
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.error(err.stderr?.toString() || err.stdout?.toString() || e);
    throw new Error(`Falha ao preparar o banco de teste: ${titulo}`);
  }
}

export default function globalSetup() {
  if (/neon\.tech|vercel/.test(TEST_DATABASE_URL)) {
    throw new Error("TEST_DATABASE_URL aponta para produção — abortando.");
  }
  if (!/emendas_test/.test(TEST_DATABASE_URL)) {
    throw new Error(
      "TEST_DATABASE_URL precisa apontar para um banco de teste (nome contendo 'emendas_test')."
    );
  }

  console.log("\nPreparando o banco de teste…");
  // `migrate deploy` é ADITIVO — cria o schema na primeira execução e não faz
  // nada nas seguintes. Não usamos `migrate reset` de propósito: é destrutivo,
  // e não é necessário. Os três seeds abaixo já convergem para o mesmo estado
  // a cada execução (o seed oficial faz upsert; o de demonstração apaga e
  // recria as emendas do exercício — inclusive as que os testes criaram; o de
  // volume regenera as dotações sem emenda vinculada).
  //
  // Se algum dia for preciso um reset de verdade (mudança de migration
  // incompatível), rode você mesmo, conscientemente:
  //   DIRECT_URL=<url-de-teste> npx prisma migrate reset --force
  rodar("npx", ["prisma", "migrate", "deploy"], "migrations");
  rodar("npx", ["tsx", "prisma/seed.ts"], "seed oficial (base + usuários)");
  rodar("npx", ["tsx", "prisma/seed-demo.ts"], "dataset de demonstração (41 emendas)");
  rodar("npx", ["tsx", "prisma/seed-volume.ts"], "base com volume realista (~2.290 dotações)");
  console.log("Banco de teste pronto.\n");
}
