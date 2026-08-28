import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Fluxo ponta a ponta das duas capacidades novas do Executivo: registrar o
// parecer de viabilidade (e vê-lo chegar à Análise Técnica da Comissão) e
// lançar um andamento de execução numa emenda aprovada.

test("o Executivo registra parecer e a Comissão o vê na Análise Técnica", async ({
  page,
}) => {
  // Parte-se da fila da Comissão para escolher a emenda: só o que está nela é
  // que a Comissão ainda vai decidir, e é aí que o parecer precisa aparecer.
  await entrarComo(page, "comissao");
  await page.goto("/analise");
  const primeira = await page
    .getByRole("link", { name: /^Emenda / })
    .first()
    .textContent();
  const numero = primeira!.replace(/^Emenda /, "").split(" —")[0].trim();

  await entrarComo(page, "executivo");
  await page.goto("/executivo/acompanhamento/viabilidade");
  await expect(
    page.getByRole("heading", { name: "Viabilidade técnica" })
  ).toBeVisible();

  await page.getByPlaceholder(/Buscar por número/).fill(numero);
  await page.getByRole("button", { name: /Manifestar-se|Novo parecer/ }).first().click();
  await expect(page.getByText(`Emenda ${numero}`).first()).toBeVisible();

  await page.getByLabel("Resultado *").selectOption("VIAVEL_COM_RESSALVA");
  await page
    .getByLabel("Justificativa *")
    .fill("Dotação existe, mas exige remanejamento interno na unidade executora.");
  await page.getByRole("button", { name: "Registrar parecer" }).click();
  await expect(page.getByText("Parecer registrado.")).toBeVisible({ timeout: 20_000 });

  // O ponto do recurso: a manifestação chega à mesa de quem decide. E chega
  // como informação — a emenda continua na fila, com o status intacto.
  await entrarComo(page, "comissao");
  await page.goto("/analise");
  await page.getByPlaceholder(/Buscar por nº/).fill(numero);
  await expect(page.getByText(/Executivo: Viável com ressalva/).first()).toBeVisible();
  await expect(
    page.getByText(/Dotação existe, mas exige remanejamento/).first()
  ).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Emenda ${numero}`) })).toBeVisible();
});

test("o Executivo lança empenho numa emenda aprovada", async ({ page }) => {
  await entrarComo(page, "executivo");
  await page.goto("/executivo/acompanhamento/lancamentos");
  await expect(
    page.getByRole("heading", { name: "Execução das emendas" })
  ).toBeVisible();

  const temEmenda = await page.getByRole("button", { name: "Lançar" }).count();
  test.skip(temEmenda === 0, "nenhuma emenda aprovada no dataset de demonstração");

  await page.getByRole("button", { name: "Lançar" }).first().click();
  await page.getByLabel("Etapa *").selectOption("EMPENHO");
  await page.getByLabel("Data *").fill("2027-03-15");
  await page.getByLabel("Valor (R$) *").fill("15000");
  await page.getByLabel("Número do documento").fill("2027NE000123");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  await expect(page.getByText("Lançamento registrado.")).toBeVisible({
    timeout: 20_000,
  });

  await page.reload();
  await expect(page.getByText("2027NE000123")).toBeVisible();
});
