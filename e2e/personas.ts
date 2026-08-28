import { expect, type Page } from "@playwright/test";

// As contas vêm do seed (src/lib/seed-data.ts). Ver docs/contas-demo.md.
export const SENHA = "mudar@123";

// As 5 contas de demonstração — uma por perfil base (PROMPT 12).
export const PERSONAS = {
  super: { email: "super@municipio.gov.br", nome: "Administrador Geral" },
  executivo: { email: "executivo@municipio.gov.br", nome: "Poder Executivo" },
  presidente: { email: "presidente@camara.gov.br", nome: "Presidente da Câmara" },
  comissao: { email: "comissao@camara.gov.br", nome: "Comissão de Finanças" },
  vereador: { email: "vereador@camara.gov.br", nome: "Vereador Exemplo" },
} as const;

export type Persona = keyof typeof PERSONAS;

// Faz login de verdade pelo formulário — é o caminho que o usuário percorre e
// o único que exercita o provider de credenciais do Auth.js.
export async function entrarComo(page: Page, persona: Persona) {
  const { email } = PERSONAS[persona];
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  // O login redireciona para /painel; o gabinete segue para /vereador360.
  await page.waitForURL(/\/(painel|vereador360)/, { timeout: 20_000 });
}

// Abas visíveis na navegação principal, na ordem em que aparecem.
export async function abasVisiveis(page: Page): Promise<string[]> {
  const nav = page.locator("nav").first();
  await expect(nav).toBeVisible();
  return (await nav.locator("a").allTextContents()).map((t) => t.trim()).filter(Boolean);
}
