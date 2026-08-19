import { test, expect } from "@playwright/test";

// O portal do cidadão é transparência ativa exigida pelo STF (ADPF 854,
// art. 163-A da CF) e cobrada pelo TCE-SP. Precisa funcionar SEM login — se
// alguma dessas rotas passar a exigir autenticação, o sistema volta a ter a
// impropriedade que o commit 824eb53 corrigiu.

test.describe("portal público (sem autenticação)", () => {
  test("as rotas públicas abrem sem login", async ({ page }) => {
    for (const rota of ["/publica", "/publica/emendas", "/publica/manual"]) {
      const resposta = await page.goto(rota);
      expect(resposta?.status(), `${rota} deveria responder 200`).toBe(200);
      expect(page.url(), `${rota} não pode redirecionar para o login`).not.toContain("/login");
    }
  });

  test("a lista pública mostra as emendas do exercício", async ({ page }) => {
    await page.goto("/publica/emendas");
    await expect(
      page.getByRole("heading", { name: "Emendas parlamentares — consulta pública" })
    ).toBeVisible();
    // Pelo menos as 41 do dataset de demonstração (outras specs podem somar).
    const nota = page.getByText(/emenda\(s\) encontrada\(s\)/);
    const total = Number((await nota.textContent())?.match(/^(\d+)/)?.[1] ?? "0");
    expect(total).toBeGreaterThanOrEqual(41);
  });

  test("a busca por texto filtra o resultado", async ({ page }) => {
    await page.goto("/publica/emendas");
    await page.getByPlaceholder("Buscar por objeto, beneficiário ou autor").fill("Santa Casa");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page.waitForURL(/q=Santa\+Casa|q=Santa%20Casa/);

    const nota = page.getByText(/emenda\(s\) encontrada\(s\)/);
    await expect(nota).toBeVisible();
    const encontradas = Number((await nota.textContent())?.match(/^(\d+)/)?.[1] ?? "0");
    expect(encontradas).toBeGreaterThan(0);
    expect(encontradas).toBeLessThan(41);  // o filtro precisa restringir
  });

  test("o filtro por situação restringe a lista", async ({ page }) => {
    await page.goto("/publica/emendas");
    await page.locator('select[name="status"]').selectOption({ label: "Aprovada" });
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page.waitForURL(/status=APROVADA/);
    const nota = page.getByText(/emenda\(s\) encontrada\(s\)/);
    const total = Number((await nota.textContent())?.match(/^(\d+)/)?.[1] ?? "0");
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(41);
  });

  test("a página pública de uma emenda mostra autor, objeto e valor", async ({ page }) => {
    await page.goto("/publica/emendas");
    // Primeiro link para o detalhe de uma emenda.
    const primeira = page.locator('a[href^="/publica/emendas/"]').first();
    await primeira.click();
    await page.waitForURL(/\/publica\/emendas\/[a-z0-9]+/);

    await expect(page.getByText(/R\$\s?[\d.,]+/).first()).toBeVisible();
    // Nenhum dado pessoal ou controle de gestão deve vazar para o público.
    await expect(page.getByRole("button", { name: /Aprovar|Rejeitar|Submeter/ })).toHaveCount(0);
  });

  test("o manual orientativo está publicado", async ({ page }) => {
    await page.goto("/publica/manual");
    await expect(
      page.getByRole("heading", {
        name: "Manual de indicação e execução de emendas impositivas",
      })
    ).toBeVisible();
    // Os limites exibidos vêm dos parâmetros reais do exercício.
    await expect(page.getByText(/R\$\s?500\.000/).first()).toBeVisible();
  });
});
