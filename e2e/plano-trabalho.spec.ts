import { test, expect, type Page } from "@playwright/test";
import { entrarComo } from "./personas";

// Plano de trabalho — a peça que o jurídico do cliente definiu para a
// apresentação da emenda. O que ele exige depende da categoria do beneficiário
// final, e é isso que estes testes fixam.
//
// Duas mudanças moldam este arquivo. Em setembro/2026 o plano passou a ser o
// PASSO 4 do fluxo de nova emenda, alcançado pelos três anteriores — para onde
// vai, para que serve, de onde sai. E antes disso, no commit dos quatro
// modelos, o formulário do plano deixou de ter "objetivo" e "planilha" e passou
// a ter metas, memória de cálculo e cronograma, que é o que se testa aqui.
//
// A rota /legislativo/emendas/[id]/plano-trabalho continua existindo para
// voltar a uma emenda já salva.

// A máscara de dinheiro entra pelos centavos: "5000000" é R$ 50.000,00.
const VALOR_UNITARIO = "5000000";
const VALOR_EMENDA = "R$ 50.000,00";

// Passo 1: a categoria e o destino. O destino é cadastro livre — decisão do
// jurídico do cliente —, então o roteiro cadastra o nome na hora, que é como o
// vereador de fato usa o campo.
async function escolherDestino(page: Page, categoria: string, destino: string) {
  await page.getByRole("radio", { name: categoria, exact: true }).check();

  const campo = page.getByLabel("Para onde vai");
  await expect(campo).toBeEnabled();
  await campo.fill(destino);

  const existente = page.getByRole("option", { name: destino, exact: true });
  const novo = page.getByRole("option", { name: `Cadastrar "${destino}"` });
  await expect(existente.or(novo).first()).toBeVisible();
  if (await existente.count()) await existente.first().click();
  else await novo.click();

  await expect(page.getByText(`Destino: ${destino}`)).toBeVisible({ timeout: 20_000 });
}

// Percorre os quatro passos e para no plano, com objeto e justificativa
// preenchidos. Uma emenda de R$ 50.000,00 quando a memória é lançada.
async function emendaComCategoria(page: Page, categoria: string, destino: string) {
  await entrarComo(page, "vereador");
  await page.goto("/legislativo/emendas/nova");

  await escolherDestino(page, categoria, destino);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: /Comprar equipamento/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  const linhas = page
    .getByRole("radiogroup", { name: "Dotações compatíveis" })
    .getByRole("radio");
  await expect.poll(async () => linhas.count(), { timeout: 30_000 }).toBeGreaterThan(0);
  await linhas.first().click();
  await page.getByRole("button", { name: /Abrir o plano de trabalho/ }).click();

  await page
    .getByLabel("Objeto")
    .fill("Aquisição de equipamentos — teste do plano de trabalho");
  await page
    .getByLabel("Justificativa da emenda")
    .fill("Emenda criada pela suíte end-to-end.");
}

test.describe("beneficiário em duas perguntas", () => {
  // A lista fechada de destinos foi o apontamento do jurídico do cliente: "os
  // equipamentos públicos não se limitam aos que constam ali… é melhor deixar o
  // vereador cadastrar e o cadastro vai aumentando com o tempo".
  test("o destino é cadastrado na hora e passa a ser sugerido", async ({ page }) => {
    const destino = `Centro Comunitário ${Date.now()}`;
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");
    await escolherDestino(page, "Administração direta", destino);

    // De volta ao campo, o que acabou de ser cadastrado já aparece na sugestão.
    const campo = page.getByLabel("Para onde vai");
    await campo.fill("Centro Comunit");
    await expect(page.getByRole("option", { name: destino, exact: true })).toBeVisible();
  });

  test("sem escolher a categoria não dá para dizer para onde vai", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");
    await expect(page.getByLabel("Para onde vai")).toBeDisabled();

    await page.getByRole("radio", { name: "Entidade do terceiro setor", exact: true }).check();
    await expect(page.getByLabel("Para onde vai")).toBeEnabled();
  });
});

test.describe("o plano dentro do fluxo", () => {
  test("a tela abre no passo 1 e o plano é o passo 4", async ({ page }) => {
    await entrarComo(page, "vereador");
    await page.goto("/legislativo/emendas/nova");

    await expect(page.getByText("1. Para onde vai o dinheiro")).toBeVisible();
    // A trilha mostra os quatro passos desde a abertura: o plano de trabalho
    // faz parte da apresentação da emenda, e não de uma tela posterior — era
    // essa a reclamação do jurídico do cliente.
    for (const passo of ["Para onde vai", "Para que serve", "De onde sai", "Plano"]) {
      await expect(page.getByRole("button", { name: passo }).first()).toBeVisible();
    }
    await expect(page.getByText(/Escolha o tipo de destino/)).toBeVisible();
  });

  // Fora do terceiro setor quem executa é o próprio município: o vereador
  // preenche o plano ali mesmo, e a justificativa da emenda vale como a do
  // plano — o mesmo texto duas vezes seria atrito puro.
  test("órgão público preenche metas, memória e cronograma na própria tela", async ({ page }) => {
    await emendaComCategoria(page, "Administração direta", `UBS Teste ${Date.now()}`);

    await expect(page.getByRole("heading", { name: "Metas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Memória de cálculo" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cronograma de desembolso previsto" })
    ).toBeVisible();

    // Nada de entidade, declaração ou assinatura: isso é rito do Modelo III.
    await expect(page.getByLabel("Razão social", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Gerar link para a entidade/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  });

  test("o plano lista o que falta para a emenda poder ser remetida", async ({ page }) => {
    await emendaComCategoria(page, "Administração direta", `Creche Vazia ${Date.now()}`);

    await expect(page.getByText(/informar ao menos uma meta/)).toBeVisible();
    await expect(page.getByText(/lançar a memória de cálculo/)).toBeVisible();

    await page.getByLabel("Beneficiários da meta 1").fill("Crianças atendidas");
    await page.getByLabel("Unidade da meta 1").fill("criança");
    await page.getByLabel("Meta física da meta 1").fill("40");
    await page.getByLabel("Comprovação da meta 1").fill("Lista de matrícula");
    await expect(page.getByText(/informar ao menos uma meta/)).toHaveCount(0);
  });

  test("terceiro setor não preenche o plano aqui: ele vai por link", async ({ page }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Associação Teste ${Date.now()}`);

    // O plano vive no link; o que o vereador declara é o teto do repasse.
    await expect(page.getByRole("heading", { name: "Memória de cálculo" })).toHaveCount(0);
    await expect(page.getByLabel("Valor do repasse")).toBeVisible();
    await expect(page.getByRole("button", { name: /Gerar link para a entidade/ })).toBeVisible();
  });
});

test.describe("o link da entidade", () => {
  test("abre sem login, grava o plano e o preenchimento fica registrado", async ({
    page,
    context,
  }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Instituto Teste ${Date.now()}`);
    await page.getByLabel("Valor do repasse").fill(VALOR_UNITARIO);

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

    await expect(pagina.getByText("A emenda que originou este pedido")).toBeVisible();
    // O valor é do vereador e chega em leitura — a entidade fecha com ele.
    await expect(pagina.getByText(VALOR_EMENDA).first()).toBeVisible();

    await pagina.getByLabel("Razão social", { exact: true }).fill("Instituto de Teste Automatizado");
    await pagina.getByRole("button", { name: "Salvar sem enviar" }).click();
    await expect(pagina.getByText(/A Câmara só recebe quando você assinar/)).toBeVisible();
    await anonima.close();

    // No gabinete, o preenchimento da entidade fica REGISTRADO — os campos em
    // si continuam sendo dela, e não aparecem aqui: no Modelo III o vereador
    // acompanha, não preenche.
    await abrirPlanoDaEmendaSalva(page);
    await expect(page.getByText(/preenchimento por/i)).toBeVisible();
    await expect(page.getByLabel("Razão social", { exact: true })).toHaveCount(0);
  });

  test("link revogado deixa de funcionar", async ({ page, context }) => {
    await emendaComCategoria(page, "Entidade do terceiro setor", `Lar Teste ${Date.now()}`);
    await page.getByLabel("Valor do repasse").fill(VALOR_UNITARIO);

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
  const linha = page.getByRole("row").filter({ hasText: VALOR_EMENDA }).first();
  await expect(linha).toBeVisible();
  await linha.getByRole("link").first().click();
  await page.getByRole("link", { name: "Plano de trabalho" }).click();
  await page.waitForURL(/\/plano-trabalho$/, { timeout: 20_000 });
}
