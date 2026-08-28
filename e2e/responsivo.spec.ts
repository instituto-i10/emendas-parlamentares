import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Responsivo é requisito: nenhuma das telas novas pode fazer a PÁGINA rolar na
// horizontal em 375px. Tabela larga rola dentro do seu próprio contêiner — o
// corpo do documento, não.

async function semRolagemHorizontal(page: import("@playwright/test").Page) {
  const estourou = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(estourou).toBe(false);
}

test.describe("telas novas em 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Configurações: abas de perfis e usuários", async ({ page }) => {
    await entrarComo(page, "super");
    await page.goto("/config");

    await page.getByRole("tab", { name: "Perfis" }).click();
    await expect(page.getByRole("button", { name: "Novo perfil" })).toBeVisible();
    await semRolagemHorizontal(page);

    await page.getByRole("tab", { name: "Usuários" }).click();
    await expect(page.getByRole("button", { name: "Novo usuário" })).toBeVisible();
    await semRolagemHorizontal(page);
  });

  test("Executivo: viabilidade e lançamentos", async ({ page }) => {
    await entrarComo(page, "executivo");

    await page.goto("/executivo/acompanhamento/viabilidade");
    await expect(
      page.getByRole("heading", { name: "Viabilidade técnica" })
    ).toBeVisible();
    await semRolagemHorizontal(page);

    await page.goto("/executivo/acompanhamento/lancamentos");
    await expect(
      page.getByRole("heading", { name: "Execução das emendas" })
    ).toBeVisible();
    await semRolagemHorizontal(page);
  });

  test("os diálogos cabem na tela e chegam ao botão de salvar", async ({ page }) => {
    await entrarComo(page, "super");
    await page.goto("/config");
    await page.getByRole("tab", { name: "Perfis" }).click();
    await page.getByRole("button", { name: "Novo perfil" }).click();

    const salvar = page.getByRole("button", { name: "Salvar" });
    await salvar.scrollIntoViewIfNeeded();
    await expect(salvar).toBeVisible();
    await semRolagemHorizontal(page);
  });
});
