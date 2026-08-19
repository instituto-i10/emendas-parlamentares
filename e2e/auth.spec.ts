import { test, expect } from "@playwright/test";
import { entrarComo, PERSONAS, SENHA } from "./personas";

test.describe("autenticação", () => {
  test("rota protegida sem sessão vai para o login", async ({ page }) => {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("credenciais inválidas não autenticam", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(PERSONAS.mesa.email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Não usar getByRole("alert"): o route announcer do Next também tem role=alert.
    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a Mesa entra e cai no painel da comissão", async ({ page }) => {
    await entrarComo(page, "mesa");
    await expect(page).toHaveURL(/\/painel/);
    await expect(page.getByText("Painel da Comissão")).toBeVisible();
  });

  test("o Executivo entra e vê o painel do Executivo", async ({ page }) => {
    await entrarComo(page, "execAdmin");
    await expect(page.getByText("Painel do Executivo")).toBeVisible();
  });

  test("o gabinete do vereador cai direto no Vereador 360", async ({ page }) => {
    await entrarComo(page, "vereador");
    await expect(page).toHaveURL(/\/vereador360/);
    // Mesmo indo ao /painel de propósito, é redirecionado de volta.
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/vereador360/);
  });

  test("a sessão persiste entre navegações", async ({ page }) => {
    await entrarComo(page, "mesa");
    await page.goto("/emendas");
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/placar");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("todas as contas do seed autenticam", async ({ page }) => {
    for (const [chave, persona] of Object.entries(PERSONAS)) {
      await page.goto("/login");
      await page.getByLabel("E-mail").fill(persona.email);
      await page.getByLabel("Senha").fill(SENHA);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(/\/(painel|vereador360)/, { timeout: 20_000 });
      expect(page.url(), `${chave} deveria autenticar`).not.toContain("/login");
      await page.context().clearCookies();
    }
  });
});
