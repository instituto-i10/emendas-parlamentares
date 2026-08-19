import { test, expect, type Page } from "@playwright/test";
import { entrarComo } from "./personas";

// O fluxo mais importante do produto: apresentar uma emenda sem digitar
// classificação orçamentária. Cobre a cascata de cinco níveis, a validação pelo
// motor e a submissão condicionada.

async function abrirFormulario(page: Page) {
  await entrarComo(page, "vereador");
  await page.goto("/legislativo/emendas/nova");
  await expect(page.getByLabel("Órgão", { exact: true })).toBeVisible();
}

// Percorre a cascata escolhendo sempre a primeira opção real de cada nível.
async function percorrerCascata(page: Page) {
  const escolherPrimeira = async (rotulo: string) => {
    const campo = page.getByLabel(rotulo, { exact: true });
    await expect(campo).toBeEnabled();
    // Espera a opção chegar do servidor antes de escolher.
    await expect
      .poll(async () => campo.locator("option").count(), { timeout: 15_000 })
      .toBeGreaterThan(1);
    const valor = await campo.locator("option").nth(1).getAttribute("value");
    await campo.selectOption(valor!);
    return valor!;
  };

  await escolherPrimeira("Órgão");
  await escolherPrimeira("Unidade orçamentária");
  await escolherPrimeira("Programa");
  await escolherPrimeira("Ação");
  await escolherPrimeira("Dotação");
}

test.describe("apresentação de emenda", () => {
  test("a cascata é dependente: cada nível só habilita depois do anterior", async ({ page }) => {
    await abrirFormulario(page);

    await expect(page.getByLabel("Unidade orçamentária", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Programa", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Ação", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Dotação", { exact: true })).toBeDisabled();

    const orgao = page.getByLabel("Órgão", { exact: true });
    const valor = await orgao.locator("option").nth(1).getAttribute("value");
    await orgao.selectOption(valor!);

    await expect(page.getByLabel("Unidade orçamentária", { exact: true })).toBeEnabled();
    // Os níveis seguintes continuam travados.
    await expect(page.getByLabel("Programa", { exact: true })).toBeDisabled();
  });

  test("trocar um nível superior limpa os inferiores", async ({ page }) => {
    await abrirFormulario(page);
    await percorrerCascata(page);
    await expect(page.getByLabel("Dotação", { exact: true })).not.toHaveValue("");

    // Volta ao topo e escolhe outro órgão.
    const orgao = page.getByLabel("Órgão", { exact: true });
    const outro = await orgao.locator("option").nth(2).getAttribute("value");
    await orgao.selectOption(outro!);

    await expect(page.getByLabel("Unidade orçamentária", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Dotação", { exact: true })).toBeDisabled();
  });

  test("natureza e fonte são preenchidas a partir da dotação, em somente leitura", async ({ page }) => {
    await abrirFormulario(page);
    await percorrerCascata(page);

    const natureza = page.getByLabel("Natureza da despesa (leitura)", { exact: true });
    const fonte = page.getByLabel("Fonte de recurso (leitura)", { exact: true });
    await expect(natureza).toHaveAttribute("readonly", "");
    await expect(fonte).toHaveAttribute("readonly", "");
    await expect(natureza).not.toHaveValue("");
    await expect(fonte).not.toHaveValue("");
  });

  test("rascunho → validar → submeter", async ({ page }) => {
    await abrirFormulario(page);
    await percorrerCascata(page);

    await page.getByLabel("Tipo", { exact: true }).selectOption("IMPOSITIVA");
    await page.getByLabel("Valor", { exact: true }).fill("35000");
    await page.getByLabel("Objeto", { exact: true }).fill("Aquisição de equipamentos — emenda de teste automatizado");
    await page
      .getByLabel("Justificativa", { exact: true })
      .fill("Emenda criada pela suíte end-to-end para validar o fluxo de apresentação.");

    // Submeter só libera depois de validar.
    await expect(page.getByRole("button", { name: "Submeter" })).toBeDisabled();

    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();

    await page.getByRole("button", { name: "Validar" }).click();
    // O relatório item a item substitui o placeholder.
    await expect(page.getByText("Resultado da validação:")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Exercício está aberto")).toBeVisible();
    await expect(page.getByText("Dotação existe e pertence à base")).toBeVisible();

    await expect(page.getByRole("button", { name: "Submeter" })).toBeEnabled();
    await page.getByRole("button", { name: "Submeter" }).click();
    await page.waitForURL(/\/legislativo\/emendas\/minhas/, { timeout: 20_000 });

    // A listagem não mostra o objeto — só nº, programa, ação, valor, tipo e
    // situação. Por isso a emenda é identificada aqui pelo valor (único no
    // dataset). Que o autor não consiga reconhecer a própria emenda pelo que
    // ela faz é um achado de UX, registrado no documento 04.
    const linha = page.getByRole("row").filter({ hasText: "R$ 35.000,00" });
    await expect(linha).toBeVisible();
    await expect(linha).toContainText("Submetida");
  });

  test("sem dotação escolhida não é possível salvar", async ({ page }) => {
    await abrirFormulario(page);
    await page.getByLabel("Valor", { exact: true }).fill("10000");
    await page.getByLabel("Objeto", { exact: true }).fill("Objeto sem classificação");
    await page.getByLabel("Justificativa", { exact: true }).fill("Justificativa sem classificação");
    await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  });

  test("não há campo livre de classificação orçamentária", async ({ page }) => {
    await abrirFormulario(page);
    // A tese do produto: classificação se escolhe, não se digita. Os únicos
    // campos de texto editáveis são valor, objeto e justificativa.
    const editaveis = page.locator(
      'input:not([readonly]):not([type="hidden"]), textarea:not([readonly])'
    );
    const rotulos = await editaveis.evaluateAll((nós) =>
      nós.map((n) => (n as HTMLElement).id || (n as HTMLInputElement).name || "sem-id")
    );
    expect(rotulos.sort()).toEqual(["justificativa", "objeto", "valor"]);
  });
});

test.describe("cascata sob volume realista", () => {
  // Regressão de UX. Com a base cheia (~2.290 dotações) o <select> nativo sem
  // busca deixa de ser utilizável. Estes números são o baseline: quando o
  // redesign trocar o controle por um combobox com busca, eles mudam de
  // propósito — o teste passa a documentar a melhoria.

  test("a base de teste tem volume de LOA real", async ({ page }) => {
    await entrarComo(page, "execPlanejamento");
    await page.goto("/executivo/planejamento/base");
    // A linha do PL base traz a contagem de dotações numa célula da tabela.
    const linha = page.getByRole("row").filter({ hasText: "PL 45/2024" });
    await expect(linha).toBeVisible();
    const celulas = await linha.getByRole("cell").allTextContents();
    const dotacoes = Number(celulas[3]);
    console.log(`  base do PL 45/2024: ${dotacoes} dotações`);
    expect(dotacoes).toBeGreaterThan(2000);
  });

  test("o seletor de remanejamento carrega a base inteira num select nativo", async ({ page }) => {
    await abrirFormulario(page);
    await page.getByLabel("Tipo", { exact: true }).selectOption("REMANEJAMENTO");

    const origem = page.getByLabel("Dotação de origem", { exact: true });
    await expect(origem).toBeVisible();
    await expect
      .poll(async () => origem.locator("option").count(), { timeout: 30_000 })
      .toBeGreaterThan(1000);

    const total = await origem.locator("option").count();
    console.log(`  ⚠️  Dotação de origem: ${total} <option> num select nativo sem busca`);

    // O rótulo mostra só natureza, fonte e saldo — nada de órgão, programa ou
    // ação. Sem isso o usuário não tem como saber o que está escolhendo.
    const amostra = await origem.locator("option").nth(1).textContent();
    expect(amostra).not.toMatch(/Secretaria|Departamento|Fundo/);

    // Quantos rótulos são visualmente indistinguíveis entre si.
    const textos = await origem.locator("option").allTextContents();
    const distintos = new Set(textos.map((t) => t.trim()));
    console.log(`  ⚠️  ${textos.length} opções para ${distintos.size} rótulos distintos`);
    expect(distintos.size).toBeLessThan(textos.length);
  });
});
