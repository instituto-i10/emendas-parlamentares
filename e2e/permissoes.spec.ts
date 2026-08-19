import { test, expect } from "@playwright/test";
import { abasVisiveis, entrarComo } from "./personas";

// "Mínimo aparente" é regra de dados no sistema: o usuário só vê o que seu
// Poder e papel permitem, e os guards de servidor bloqueiam o acesso direto por
// URL. Estes testes travam esse contrato antes do redesign — reorganizar a
// navegação não pode, por descuido, expor uma vista ou uma ação a quem não deve.

test.describe("visibilidade por papel", () => {
  test("a Mesa vê a visão completa da comissão e as Configurações", async ({ page }) => {
    await entrarComo(page, "mesa");
    const abas = await abasVisiveis(page);
    expect(abas).toEqual(
      expect.arrayContaining([
        "Painel", "Tramitação", "Emendas & Beneficiários",
        "Vereador 360", "Análise Técnica", "Conformidade",
      ])
    );
  });

  test("o vereador não vê Tramitação, Conformidade nem Pitch", async ({ page }) => {
    await entrarComo(page, "vereador");
    const abas = await abasVisiveis(page);
    expect(abas).toEqual(
      expect.arrayContaining(["Emendas & Beneficiários", "Vereador 360", "Análise Técnica"])
    );
    expect(abas).not.toContain("Tramitação");
    expect(abas).not.toContain("Conformidade");
    expect(abas).not.toContain("Pitch");
  });

  test("o Executivo não vê o Vereador 360", async ({ page }) => {
    await entrarComo(page, "execPlanejamento");
    const abas = await abasVisiveis(page);
    expect(abas).toContain("Painel");
    expect(abas).not.toContain("Vereador 360");
  });
});

test.describe("guards de rota no servidor", () => {
  test("o vereador não acessa as Configurações pela URL", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/config");
    // requireAccess redireciona ao hub com marcador de erro.
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o Legislativo não acessa o planejamento do Executivo", async ({ page }) => {
    await entrarComo(page, "tecnico");
    await page.goto("/executivo/planejamento/base");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o Executivo não acessa a apresentação de emendas do Legislativo", async ({ page }) => {
    await entrarComo(page, "execPlanejamento");
    await page.goto("/legislativo/emendas/nova");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o SUPER_ADMIN atravessa os dois Poderes", async ({ page }) => {
    await entrarComo(page, "super");
    await page.goto("/executivo/planejamento/instrumentos");
    await expect(page).not.toHaveURL(/acesso-negado/);
    await page.goto("/legislativo/emendas/todas");
    await expect(page).not.toHaveURL(/acesso-negado/);
    await page.goto("/config");
    await expect(page).not.toHaveURL(/acesso-negado/);
  });
});

test.describe("ações restritas", () => {
  test("o perfil de consulta não vê o atalho de nova emenda", async ({ page }) => {
    await entrarComo(page, "legConsulta");
    await page.goto("/emendas");
    await expect(page.getByRole("link", { name: "+ Nova emenda" })).toHaveCount(0);
  });

  test("o vereador vê o atalho de nova emenda", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/emendas");
    await expect(page.getByRole("link", { name: "+ Nova emenda" })).toBeVisible();
  });

  test("o perfil de consulta não pode apresentar emenda pela URL", async ({ page }) => {
    await entrarComo(page, "legConsulta");
    await page.goto("/legislativo/emendas/nova");
    // Ou redireciona, ou mostra o estado de "sem permissão" — o que não pode é
    // apresentar o formulário.
    const semPermissao = page.getByText("Sem permissão");
    const redirecionou = page.url().includes("acesso-negado");
    if (!redirecionou) await expect(semPermissao).toBeVisible();
    await expect(page.getByLabel("Órgão")).toHaveCount(0);
  });
});
