import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Tramitação: só emendas SUBMETIDAS podem ser decididas, a decisão exige
// parecer e apenas Mesa/Técnico podem tramitar.

test.describe("tramitação", () => {
  test("a fila de situação lista as emendas aguardando parecer", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/legislativo/tramitacao/status");
    // "Situação das emendas" aparece também na trilha de navegação.
    await expect(page.getByRole("heading", { name: "Situação das emendas" })).toBeVisible();
    await expect(page.getByText(/EM \d{3}\/2025/).first()).toBeVisible();
  });

  test("cancelar o parecer não decide a emenda", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/legislativo/tramitacao/status");

    const antes = await page.getByRole("row").count();
    // O parecer é pedido por window.prompt (ver nota de UX no documento 04).
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: /Aprovar/ }).first().click();

    await expect(page.getByText(/Emenda aprovada/)).toHaveCount(0);
    await expect(page.getByRole("row")).toHaveCount(antes);
  });

  test("aprovar com parecer tira a emenda da fila", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/legislativo/tramitacao/status");

    const linhas = page.getByRole("row");
    const antes = await linhas.count();
    expect(antes).toBeGreaterThan(1); // cabeçalho + pelo menos uma emenda

    page.once("dialog", (d) =>
      d.accept("Parecer favorável — emenda compatível com o PPA e a LDO do exercício.")
    );
    await page.getByRole("button", { name: /Aprovar/ }).first().click();

    await expect(page.getByText("Emenda aprovada.")).toBeVisible({ timeout: 20_000 });
    // A fila lista apenas SUBMETIDAS: a decidida sai dali.
    await page.reload();
    await expect(page.getByRole("row")).toHaveCount(antes - 1);
  });

  test("o gabinete não vê os botões de decisão", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/tramitacao/status");
    await expect(page.getByRole("button", { name: /Aprovar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Rejeitar/ })).toHaveCount(0);
  });

  test("a análise técnica separa saneamento de parecer", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/analise");
    await expect(
      page.getByRole("heading", { name: "Conferência & Análise Técnica" })
    ).toBeVisible();
    const eyebrows = page.locator(".eyebrow");
    await expect(eyebrows.filter({ hasText: "Para saneamento" })).toBeVisible();
    await expect(eyebrows.filter({ hasText: "Aguardando parecer" })).toBeVisible();
  });
});
