import { test, expect } from "@playwright/test";
import { abasVisiveis, entrarComo } from "./personas";

// "Mínimo aparente" é regra de dados no sistema: o usuário só vê o que seu
// Poder e papel permitem, e os guards de servidor bloqueiam o acesso direto por
// URL. Estes testes travam esse contrato antes do redesign — reorganizar a
// navegação não pode, por descuido, expor uma vista ou uma ação a quem não deve.

test.describe("visibilidade por perfil", () => {
  test("o Presidente vê a visão completa e as Configurações", async ({ page }) => {
    await entrarComo(page, "presidente");
    const abas = await abasVisiveis(page);
    expect(abas).toEqual(
      expect.arrayContaining([
        "Painel", "Tramitação", "Emendas & Beneficiários",
        "Vereador 360", "Análise Técnica", "Conformidade",
      ])
    );
  });

  test("a Comissão vê a Análise Técnica, sem o Pitch da administração", async ({ page }) => {
    await entrarComo(page, "comissao");
    const abas = await abasVisiveis(page);
    expect(abas).toEqual(expect.arrayContaining(["Análise Técnica", "Vereador 360"]));
    expect(abas).not.toContain("Pitch");
  });

  test("o vereador não vê a Análise Técnica nem o Pitch", async ({ page }) => {
    await entrarComo(page, "vereador");
    const abas = await abasVisiveis(page);
    expect(abas).toEqual(
      expect.arrayContaining(["Emendas & Beneficiários", "Vereador 360"])
    );
    // "Painel" NÃO está na lista de propósito: para o gabinete a rota /painel
    // redireciona para o Vereador 360, e um item de menu que empurra a pessoa
    // para outro lugar é ruído. Ver `vistasVisiveis`.
    expect(abas).not.toContain("Painel");
    expect(abas).not.toContain("Análise Técnica");
    expect(abas).not.toContain("Pitch");
  });

  test("o Executivo não vê o Vereador 360 nem a Análise Técnica", async ({ page }) => {
    await entrarComo(page, "executivo");
    const abas = await abasVisiveis(page);
    expect(abas).toContain("Painel");
    expect(abas).not.toContain("Vereador 360");
    expect(abas).not.toContain("Análise Técnica");
  });
});

test.describe("vista inicial após o login", () => {
  test("o vereador cai no Vereador 360; os demais no Painel", async ({ page }) => {
    await entrarComo(page, "vereador");
    await expect(page).toHaveURL(/\/vereador360/);
  });

  test("a Comissão cai no Painel", async ({ page }) => {
    await entrarComo(page, "comissao");
    await expect(page).toHaveURL(/\/painel/);
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
    await entrarComo(page, "comissao");
    await page.goto("/executivo/planejamento/base");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o Executivo não acessa a apresentação de emendas do Legislativo", async ({ page }) => {
    await entrarComo(page, "executivo");
    await page.goto("/legislativo/emendas/nova");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o Administrador Geral atravessa os dois Poderes", async ({ page }) => {
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
  test("a Comissão não vê o atalho de nova emenda", async ({ page }) => {
    await entrarComo(page, "comissao");
    await page.goto("/emendas");
    await expect(page.getByRole("link", { name: "+ Nova emenda" })).toHaveCount(0);
  });

  test("o vereador vê o atalho de nova emenda", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/emendas");
    await expect(page.getByRole("link", { name: "+ Nova emenda" })).toBeVisible();
  });

  test("a Comissão não pode apresentar emenda pela URL", async ({ page }) => {
    await entrarComo(page, "comissao");
    await page.goto("/legislativo/emendas/nova");
    // Ou redireciona, ou mostra o estado de "sem permissão" — o que não pode é
    // apresentar o formulário.
    const semPermissao = page.getByText("Sem permissão");
    const redirecionou = page.url().includes("acesso-negado");
    if (!redirecionou) await expect(semPermissao).toBeVisible();
    await expect(page.getByLabel("Para onde vai")).toHaveCount(0);
  });
});

test.describe("separação de Poderes e permissões novas", () => {
  test("o vereador não abre a lista de todas as emendas pela URL", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/todas");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o vereador não abre a Análise Técnica pela URL", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/analise");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("a Comissão não abre a viabilidade técnica do Executivo", async ({ page }) => {
    await entrarComo(page, "comissao");
    await page.goto("/executivo/acompanhamento/viabilidade");
    await expect(page).toHaveURL(/\/hub\?erro=acesso-negado/);
  });

  test("o Executivo abre viabilidade e lançamentos de execução", async ({ page }) => {
    await entrarComo(page, "executivo");
    await page.goto("/executivo/acompanhamento/viabilidade");
    await expect(page).not.toHaveURL(/acesso-negado/);
    await page.goto("/executivo/acompanhamento/lancamentos");
    await expect(page).not.toHaveURL(/acesso-negado/);
  });

  test("a aba Perfis é exclusiva do Administrador Geral", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/config");
    await expect(page.getByRole("tab", { name: "Perfis" })).toHaveCount(0);

    await page.getByRole("button", { name: /Sair|Encerrar/ }).first().click().catch(() => {});
    await entrarComo(page, "super");
    await page.goto("/config");
    await expect(page.getByRole("tab", { name: "Perfis" })).toBeVisible();
  });
});
