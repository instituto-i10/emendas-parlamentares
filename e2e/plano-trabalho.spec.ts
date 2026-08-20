import { test, expect, type Page } from "@playwright/test";
import { entrarComo } from "./personas";

// Plano de trabalho SIMPLIFICADO — a peça que o jurídico do cliente definiu
// para a apresentação da emenda. O que ele exige depende da categoria do
// beneficiário final, e é isso que estes testes fixam.

// Cria uma emenda em rascunho e devolve a URL do plano de trabalho dela.
async function rascunhoComBeneficiario(page: Page, rotuloGrupo: string) {
  await entrarComo(page, "vereador");
  await page.goto("/legislativo/emendas/nova");

  const escolherPrimeira = async (rotulo: string) => {
    const campo = page.getByLabel(rotulo, { exact: true });
    await expect(campo).toBeEnabled();
    await expect
      .poll(async () => campo.locator("option").count(), { timeout: 15_000 })
      .toBeGreaterThan(1);
    const valor = await campo.locator("option").nth(1).getAttribute("value");
    await campo.selectOption(valor!);
  };
  await escolherPrimeira("Órgão");
  await escolherPrimeira("Unidade orçamentária");
  await escolherPrimeira("Programa");
  await escolherPrimeira("Ação");
  await escolherPrimeira("Dotação");

  await page.getByLabel("Valor", { exact: true }).fill("50000");
  await page.getByLabel("Objeto", { exact: true }).fill("Aquisição de equipamentos — teste do plano de trabalho");
  await page.getByLabel("Justificativa", { exact: true }).fill("Emenda criada pela suíte end-to-end.");

  // Escolhe o primeiro beneficiário do grupo pedido.
  const benef = page.getByLabel("Beneficiário final", { exact: true });
  const opcao = benef.locator(`optgroup[label="${rotuloGrupo}"] option`).first();
  await expect(opcao).toHaveCount(1);
  await benef.selectOption(await opcao.getAttribute("value") ?? "");

  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();

  await page.getByRole("link", { name: "Plano de trabalho" }).click();
  await page.waitForURL(/\/plano-trabalho$/, { timeout: 20_000 });
}

test.describe("plano de trabalho simplificado", () => {
  test("administração direta pede só a justificativa", async ({ page }) => {
    await rascunhoComBeneficiario(page, "Administração direta");

    await expect(page.getByLabel("Justificativa", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Objetivo", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Planilha orçamentária", { exact: true })).toHaveCount(0);

    await page
      .getByLabel("Justificativa", { exact: true })
      .fill("Os recursos custeiam a manutenção da unidade.");
    await page.getByRole("button", { name: "Salvar plano de trabalho" }).click();
    await expect(page.getByText("Plano de trabalho salvo.")).toBeVisible();
    await expect(page.getByText(/Plano completo para esta categoria/)).toBeVisible();
  });

  test("terceiro setor pede objetivo, declaração e planilha que fecha", async ({ page }) => {
    await rascunhoComBeneficiario(page, "Entidade do terceiro setor");

    await expect(page.getByLabel("Objetivo", { exact: true })).toBeVisible();
    await expect(page.getByText("Planilha orçamentária", { exact: true })).toBeVisible();

    await page.getByLabel("Justificativa", { exact: true }).fill("A entidade atende gratuitamente a população.");
    await page.getByLabel("Objetivo", { exact: true }).fill("Ampliar a capacidade de atendimento.");
    await page.getByRole("checkbox").first().check();

    // A planilha ainda não fecha com os R$ 50.000,00 da emenda.
    await page.getByLabel("Descrição do item 1").fill("Equipamento");
    await page.getByLabel("Quantidade do item 1").fill("1");
    await page.getByLabel("Valor unitário do item 1").fill("30000");
    // \s em vez de espaço literal: o Intl separa "R$" do número com espaço
    // não-quebrável (U+00A0), que não casa com um espaço comum no regex.
    await expect(page.getByText(/faltam\s+R\$\s*20\.000,00\s+para fechar/)).toBeVisible();

    await page.getByLabel("Valor unitário do item 1").fill("50000");
    await expect(page.getByText(/Fecha com o valor da emenda/)).toBeVisible();

    await page.getByRole("button", { name: "Salvar plano de trabalho" }).click();
    await expect(page.getByText("Plano de trabalho salvo.")).toBeVisible();
    await expect(page.getByText(/Plano completo para esta categoria/)).toBeVisible();
  });

  test("o link para a entidade abre sem login e grava o plano", async ({ page, context }) => {
    await rascunhoComBeneficiario(page, "Entidade do terceiro setor");

    await page.getByRole("button", { name: "Gerar link para a entidade" }).click();
    const codigo = page.locator("code");
    await expect(codigo).toBeVisible({ timeout: 20_000 });
    const url = (await codigo.textContent())!.trim();
    expect(url).toContain("/plano-trabalho/");

    // Sessão limpa: é assim que a entidade chega, sem conta no sistema.
    const anonima = await context.browser()!.newContext();
    const pagina = await anonima.newPage();
    await pagina.goto(url);

    await expect(pagina.getByRole("heading", { name: "Plano de trabalho" })).toBeVisible();
    await expect(pagina.getByText("A emenda", { exact: true })).toBeVisible();

    await pagina.getByLabel("Justificativa", { exact: true }).fill("Preenchido pela entidade beneficiária.");
    await pagina.getByLabel("Nome do responsável", { exact: true }).fill("Maria da Silva");
    await pagina.getByRole("button", { name: "Salvar plano de trabalho" }).click();
    await expect(pagina.getByText("Plano de trabalho salvo.")).toBeVisible();

    // De volta no gabinete: o preenchimento da entidade fica registrado.
    await page.reload();
    await expect(page.getByText(/Último preenchimento por/)).toContainText("Maria da Silva");
    await anonima.close();
  });

  test("link revogado deixa de funcionar", async ({ page, context }) => {
    await rascunhoComBeneficiario(page, "Entidade do terceiro setor");

    await page.getByRole("button", { name: "Gerar link para a entidade" }).click();
    const url = (await page.locator("code").textContent({ timeout: 20_000 }))!.trim();
    await page.getByRole("button", { name: "Revogar" }).click();
    await expect(page.getByText("Link revogado.")).toBeVisible();

    const anonima = await context.browser()!.newContext();
    const pagina = await anonima.newPage();
    await pagina.goto(url);
    await expect(pagina.getByText("Link inválido ou expirado")).toBeVisible();
    await anonima.close();
  });
});
