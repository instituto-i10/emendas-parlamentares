import { defineConfig, devices } from "@playwright/test";

// ============================================================================
// Testes end-to-end.
//
// Rodam contra um BUILD DE PRODUÇÃO (`next build && next start`), não contra o
// `next dev`. A diferença é essencial: fora de produção o sistema desliga a
// autenticação — `getCurrentUser` cai num fallback por cookie que fabrica um
// SUPER_ADMIN e o callback `authorized` libera todas as rotas. Testar em dev
// validaria uma aplicação que não existe em produção.
//
// Banco: `emendas_test`, separado do banco de desenvolvimento, recriado pelo
// global setup a cada execução. O trabalho de UX no banco de dev nunca é
// afetado.
// ============================================================================

const PORTA = 3210;
export const BASE_URL = `http://localhost:${PORTA}`;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:emendas@localhost:5433/emendas_test";

// AUTH_URL precisa apontar para a porta de teste: o Auth.js monta a URL de
// redirecionamento a partir dela, e um valor errado joga o navegador para
// outra porta no meio do login.
const envServidor = {
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  AUTH_SECRET: "e2e-secret-determinista-nao-usar-em-producao",
  AUTH_URL: BASE_URL,
  AUTH_TRUST_HOST: "true",
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // As specs compartilham um único banco: rodar em paralelo tornaria os
  // resultados dependentes de ordem.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: `npx next build && npx next start -p ${PORTA}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: envServidor,
  },
});
