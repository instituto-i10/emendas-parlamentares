import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Lista longa nunca aparece inteira: busca, filtros e paginação. Sem isso, achar
// uma emenda específica vira rolagem — e achar é o que a pessoa veio fazer.

test.describe("lista de emendas", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "mesa");
    await page.goto("/legislativo/emendas/todas");
  });

  test("pagina em vez de despejar tudo na tela", async ({ page }) => {
    const linhas = page.getByRole("row");
    // 15 por página + a linha de cabeçalho.
    await expect(linhas).toHaveCount(16);

    await expect(page.getByText(/^1–15 de \d+$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.getByText(/^16–\d+ de \d+$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });

  test("a busca por texto recorta a lista", async ({ page }) => {
    const primeiroAutor = await page
      .getByRole("row")
      .nth(1)
      .getByRole("cell")
      .nth(1)
      .textContent();

    await page.getByLabel(/Buscar por nº/).fill(primeiroAutor!.trim());
    await expect(page.getByText(/de \d+$/).first()).toBeVisible();

    // Toda linha visível pertence ao autor buscado.
    const celulas = await page.getByRole("row").nth(1).getByRole("cell").nth(1).textContent();
    expect(celulas?.trim()).toBe(primeiroAutor?.trim());
  });

  test("o filtro por situação recorta a lista", async ({ page }) => {
    await page.getByLabel("Filtrar por situação").selectOption({ label: "Aprovada" });
    const linhas = page.getByRole("row");
    const total = await linhas.count();
    for (let i = 1; i < total; i++) {
      await expect(linhas.nth(i)).toContainText("Aprovada");
    }
  });

  test("busca sem resultado mostra o estado vazio", async ({ page }) => {
    await page.getByLabel(/Buscar por nº/).fill("zzzzzzzz-nao-existe");
    await expect(page.getByText("Nenhuma emenda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Próxima" })).toHaveCount(0);
  });
});
