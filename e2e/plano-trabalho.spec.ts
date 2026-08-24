import { test, expect, type Page } from "@playwright/test";
import { entrarComo } from "./personas";

// Plano de trabalho SIMPLIFICADO — a peça que o jurídico do cliente definiu
// para a apresentação da emenda. O que ele exige depende da categoria do
// beneficiário final, e é isso que estes testes fixam.
//
// Desde a revisão de agosto/2026 o plano é o BLOCO 3 do próprio formulário da
// emenda: visível desde que a tela abre, sem depender de salvar. A rota
// /legislativo/emendas/[id]/plano-trabalho continua existindo para voltar a uma
// emenda já salva.

const VALOR = "50000";

// Preenche a emenda até o bloco 3, escolhendo a categoria pedida e cadastrando
// um destino novo na hora — que é como o vereador usa o campo.
async function emendaComCategoria(page: Page, categoria: string, destino: string) {
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

  await page.getByLabel("Valor", { exact: true }).fill(VALOR);
  await page.getByLabel("Objeto", { exact: true }).fill("Aquisição de equipamentos — teste do plano de trabalho");
  await page
    .getByLabel("Justificativa da emenda", { exact: true })
    .fill("Emenda criada pela suíte end-to-end.");

  await escolherDestino(page, categoria, destino);
}

// As duas perguntas do beneficiário: a categoria, e para onde vai — com
// cadastro na hora, sem sair da tela.
async function escolherDestino(page: Page, categoria: string, destino: string) {
  await page.getByRole("radio", { name: categoria, exact: true }).check();

  const campo = page.getByLabel("Para onde vai", { exact: true });
  await expect(campo).toBeEnabled();
  await campo.fill(destino);

  // Sugestão existente quando já foi cadastrado; senão, cadastra este nome.
  const existente = page.getByRole("option", { name: destino, exact: true });
  const novo = page.getByRole("option", { name: `Cadastrar "${destino}"` });
  await expect(existente.or(novo).first()).toBeVisible();
  if (await existente.count()) await existente.first().click();
  else await novo.click();

  await expect(page.getByText(`Destino: ${destino}`)).toBeVisible({ timeout: 20_000 });
}

test.describe("beneficiário em duas perguntas", () => {
  // A lista fechada de destinos foi o apontamento do jurídico do cliente: "os
  // equipamentos públicos não se limitam aos que constam ali… é melhor deixar o
  // vereador cadastrar e o cadastro vai aumentando com o tempo".
  test("o destino é cadastrado na hora e passa a ser sugerido", async ({ page }) => {
    const destino = `Centro Comunitário ${Date.now()}`;
    await emendaComCategoria(page, "Administração direta", destino);

    // De volta ao campo, o que acabou de ser cadastrado já aparece na sugestão.
    const campo = page.getByLabel("Para onde vai", { exact: true });
    await campo.fill("Centro Comunit");
    await expect(page.getByRole("option", { name: destino, exact: true })).toBeVisible();
  });

  test("sem escolher a categoria não dá para dizer para onde vai", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");
    await expect(page.getByLabel("Para onde vai", { exact: true })).toBeDisabled();

    await page.getByRole("radio", { name: "Entidade do terceiro setor", exact: true }).check();
    await expect(page.getByLabel("Para onde vai", { exact: true })).toBeEnabled();
  });
});

test.describe("plano de trabalho simplificado", () => {
  // O bloco 3 está na tela desde o começo — a reclamação do jurídico do cliente
  // era não encontrar por onde elaborar o plano.
  test("o plano é o bloco 3 do formulário, sem depender de salvar", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");

    await expect(page.getByText("Onde o dinheiro entra")).toBeVisible();
    await expect(page.getByText("A emenda", { exact: true })).toBeVisible();
    await expect(page.getByText("Plano de trabalho", { exact: true })).toBeVisible();
    await expect(page.getByText(/Escolha o tipo de destino do beneficiário/)).toBeVisible();
  });

  // "Só a justificativa", na administração pública, é a justificativa DA EMENDA.
  // Não há segundo campo: o mesmo vereador escrevendo o mesmo texto duas vezes é
  // atrito puro, e a diretriz do jurídico do cliente é "o mais simples possível".
  test("administração direta não pede a justificativa duas vezes", async ({ page }) => {
    await emendaComCategoria(page, "Administração direta", `UBS Teste ${Date.now()}`);

    await expect(page.getByLabel("Justificativa do plano", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Objetivo", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Planilha orçamentária", { exact: true })).toHaveCount(0);

    // O mesmo texto aparece duas vezes na tela: o campo do bloco 2 e o eco, de
    // leitura, no bloco 3. É essa a regra — um texto só, mostrado onde vale.
    await expect(page.getByText("Emenda criada pela suíte end-to-end.")).toHaveCount(2);
    await expect(page.getByText(/Para órgão público ela vale como a do plano/)).toBeVisible();
    // …e por isso o plano já está completo, sem nada a preencher aqui.
    await expect(page.getByText("Completo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  });

  test("sem a justificativa da emenda, o plano do órgão público fica pendente", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");
    await escolherDestino(page, "Administração direta", `Creche Vazia ${Date.now()}`);

    await expect(page.getByText("Falta 1 item")).toBeVisible();
    await expect(page.getByText(/falta justificativa da emenda/)).toBeVisible();

    await page
      .getByLabel("Justificativa da emenda", { exact: true })
      .fill("Manutenção da unidade, conforme demanda do bairro.");
    await expect(page.getByText("Completo", { exact: true })).toBeVisible();
  });

  test("terceiro setor pede objetivo, declaração e planilha que fecha", async ({ page }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Associação Teste ${Date.now()}`);

    await expect(page.getByLabel("Objetivo", { exact: true })).toBeVisible();
    await expect(page.getByText("Planilha orçamentária", { exact: true })).toBeVisible();

    await page.getByLabel("Justificativa do plano", { exact: true }).fill("A entidade atende gratuitamente a população.");
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
    await expect(page.getByText("Completo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  });

  test("o plano salvo no bloco 3 é o que a página da emenda mostra", async ({ page }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Instituto Ida ${Date.now()}`);
    await page
      .getByLabel("Justificativa do plano", { exact: true })
      .fill("Justificativa gravada junto com o rascunho.");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();

    await abrirPlanoDaEmendaSalva(page);
    await expect(page.getByLabel("Justificativa do plano", { exact: true })).toHaveValue(
      "Justificativa gravada junto com o rascunho."
    );
  });

  test("o link para a entidade abre sem login e grava o plano", async ({ page, context }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Instituto Teste ${Date.now()}`);

    // O link exige uma emenda gravada: o botão salva o rascunho antes de gerar.
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

    await pagina.getByLabel("Justificativa do plano", { exact: true }).fill("Preenchido pela entidade beneficiária.");
    await pagina.getByLabel("Nome do responsável", { exact: true }).fill("Maria da Silva");
    await pagina.getByRole("button", { name: "Salvar plano de trabalho" }).click();
    await expect(pagina.getByText("Plano de trabalho salvo.")).toBeVisible();
    await anonima.close();

    // No gabinete, o preenchimento da entidade fica registrado na página da
    // emenda — o formulário de criação já foi deixado para trás.
    await abrirPlanoDaEmendaSalva(page);
    await expect(page.getByText(/Último preenchimento por/)).toContainText("Maria da Silva");
  });

  test("link revogado deixa de funcionar", async ({ page, context }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Lar Teste ${Date.now()}`);

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

// Abre o plano da emenda recém-salva pela listagem — o caminho de quem volta a
// uma emenda depois, que continua passando pela rota própria.
async function abrirPlanoDaEmendaSalva(page: Page) {
  await page.goto("/legislativo/emendas/minhas");
  const linha = page.getByRole("row").filter({ hasText: "R$ 50.000,00" }).first();
  await expect(linha).toBeVisible();
  await linha.getByRole("link").first().click();
  await page.getByRole("link", { name: "Plano de trabalho" }).click();
  await page.waitForURL(/\/plano-trabalho$/, { timeout: 20_000 });
}
