import { test, expect, type Page } from "@playwright/test";
import { entrarComo } from "./personas";

// O fluxo mais importante do produto, agora em QUATRO PASSOS — para onde vai,
// para que serve, de onde sai, plano de trabalho.
//
// O que estes testes fixam não é a ordem das telas: é a inversão que ela
// carrega. Antes o vereador montava a classificação orçamentária numa cascata
// de cinco níveis e só depois dizia para quem ia o dinheiro; se a combinação
// não existisse, a análise devolvia a emenda pronta. Agora as duas primeiras
// respostas eliminam a dotação impossível ANTES de ela aparecer na lista.

const DESTINO_PUBLICO = "Administração direta";

async function abrirFluxo(page: Page) {
  await entrarComo(page, "vereador");
  await page.goto("/legislativo/emendas/nova");
  await expect(page.getByRole("radio", { name: DESTINO_PUBLICO, exact: true })).toBeVisible();
}

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

async function escolherFinalidade(page: Page, nome: RegExp) {
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: nome }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
}

// Passo 3: a lista é uma escolha única, marcada como `radiogroup` na tela — é
// por ele que o roteiro chega às linhas sem esbarrar nos botões de ação.
const linhasDeDotacao = (page: Page) =>
  page.getByRole("radiogroup", { name: "Dotações compatíveis" }).getByRole("radio");

async function escolherPrimeiraDotacao(page: Page) {
  await expect
    .poll(async () => linhasDeDotacao(page).count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await linhasDeDotacao(page).first().click();
}

test.describe("os quatro passos", () => {
  test("cada passo só libera o seguinte depois de respondido", async ({ page }) => {
    await abrirFluxo(page);

    // Sem destino não se avança.
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await escolherDestino(page, DESTINO_PUBLICO, `UBS Fluxo ${Date.now()}`);
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();

    // Passo 2: sem finalidade também não.
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("2. Para que serve o dinheiro")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();

    await page.getByRole("radio", { name: /Comprar equipamento/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 3: sem dotação, o plano de trabalho não abre.
    await expect(page.getByText("3. De onde sai o dinheiro")).toBeVisible();
    await expect(page.getByRole("button", { name: /Abrir o plano de trabalho/ })).toBeDisabled();
  });

  // O coração da mudança: a lista não é a LOA inteira, e a tela sabe dizer por
  // que o resto não está lá.
  test("a lista traz só dotação compatível e explica o que ficou de fora", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Escola Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Fazer uma obra/);

    await expect
      .poll(async () => linhasDeDotacao(page).count(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    // Toda linha visível é investimento em obras e instalações (elemento 51) —
    // a combinação "administração direta + obra" não admite outra coisa.
    const textos = await linhasDeDotacao(page).allInnerTexts();
    for (const t of textos) expect(t).toContain("4.4.90.51");

    // E o que sobrou de fora aparece contado e justificado.
    const fora = page.getByRole("button", { name: /ficaram de fora e por quê/ });
    await expect(fora).toBeVisible();
    await fora.click();
    await expect(
      page.getByText(/Emenda impositiva não entra nesta dotação: ela é folha de pagamento/)
    ).toBeVisible();
  });

  // Emenda impositiva não entra em despesa obrigatória — pedido do cliente.
  // Folha, dívida, sentença e precatório não podem sequer ser escolhidos.
  test("dotação de despesa obrigatória não aparece na lista", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Gabinete Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Manter o serviço/);

    await expect
      .poll(async () => linhasDeDotacao(page).count(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    const textos = await linhasDeDotacao(page).allInnerTexts();
    // 3.1.x é pessoal e encargos; 3.2.x, juros da dívida.
    for (const t of textos) {
      expect(t).not.toMatch(/\b3\.1\./);
      expect(t).not.toMatch(/\b3\.2\./);
    }
  });

  test("trocar a finalidade refaz a lista e limpa a dotação escolhida", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Creche Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Comprar equipamento/);
    await escolherPrimeiraDotacao(page);
    await expect(page.getByRole("button", { name: /Abrir o plano de trabalho/ })).toBeEnabled();

    // Volta ao passo 2 pela trilha e troca a resposta.
    await page.getByRole("button", { name: /Para que serve/ }).first().click();
    await page.getByRole("radio", { name: /Fazer uma obra/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("button", { name: /Abrir o plano de trabalho/ })).toBeDisabled();
  });
});

test.describe("rascunho, pré-checagem e remessa", () => {
  // Regra do jurídico do cliente: "sempre salvar rascunho independente de estar
  // completa a emenda; somente não habilitar a remessa".
  test("rascunho salva incompleto; a remessa é que fica travada", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Posto Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Comprar equipamento/);
    await escolherPrimeiraDotacao(page);

    // Dá para salvar já no passo 3, com só a dotação escolhida.
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Rascunho salvo.")).toBeVisible();

    await page.getByRole("button", { name: /Abrir o plano de trabalho/ }).click();
    await expect(page.getByText(/Falta preencher o objeto, a justificativa, o valor/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submeter" })).toBeDisabled();
  });

  test("o valor da emenda é a soma da memória de cálculo", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Almoxarifado ${Date.now()}`);
    await escolherFinalidade(page, /Comprar equipamento/);
    await escolherPrimeiraDotacao(page);
    await page.getByRole("button", { name: /Abrir o plano de trabalho/ }).click();

    // Não há campo de valor para digitar fora do terceiro setor. `exact` aqui
    // é essencial: "Valor unitário" e "Valor final" existem, e são outra coisa.
    await expect(page.getByLabel("Valor", { exact: true })).toHaveCount(0);

    await page.getByLabel("Beneficiários do item 1").fill("100 pacientes");
    await page.getByLabel("Meta física do item 1").fill("100");
    // A máscara entra pelos centavos: "50000" é R$ 500,00.
    await page.getByLabel("Valor unitário do item 1").fill("50000");

    await expect(page.getByText("R$ 50.000,00").first()).toBeVisible();
  });

  test("passo a passo até a remessa", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Hospital Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Comprar equipamento/);
    await escolherPrimeiraDotacao(page);
    await page.getByRole("button", { name: /Abrir o plano de trabalho/ }).click();

    await page.getByLabel("Objeto").fill("Aquisição de equipamentos — emenda de teste automatizado");
    await page
      .getByLabel("Justificativa da emenda")
      .fill("Emenda criada pela suíte end-to-end para validar o fluxo de apresentação.");

    await page.getByLabel("Beneficiários da meta 1").fill("Pacientes da unidade");
    await page.getByLabel("Unidade da meta 1").fill("equipamento");
    await page.getByLabel("Meta física da meta 1").fill("10");
    await page.getByLabel("Comprovação da meta 1").fill("Termo de recebimento e tombamento");

    await page.getByLabel("Beneficiários do item 1").fill("Pacientes da unidade");
    await page.getByLabel("Meta física do item 1").fill("10");
    await page.getByLabel("Valor unitário do item 1").fill("350000"); // R$ 3.500,00
    await page.getByLabel("Origem do preço do item 1").fill("Banco de preços — média de três atas");

    // Total: 10 × R$ 3.500,00 = R$ 35.000,00. O cronograma tem de fechar com ele.
    await page.getByLabel("Valor final da parcela 1").fill("3500000");

    await page.getByRole("button", { name: "Validar" }).click();
    await expect(page.getByText("Pré-checagem:")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Dotação aceita emenda impositiva")).toBeVisible();
    await expect(page.getByText("Dotação compatível com o destino")).toBeVisible();

    await expect(page.getByRole("button", { name: "Submeter" })).toBeEnabled();
    await page.getByRole("button", { name: "Submeter" }).click();
    await page.waitForURL(/\/legislativo\/emendas\/minhas/, { timeout: 20_000 });

    const linha = page.getByRole("row").filter({ hasText: "R$ 35.000,00" });
    await expect(linha.first()).toBeVisible();
    await expect(linha.first()).toContainText("Submetida");
  });

  test("não há campo livre de classificação orçamentária", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, DESTINO_PUBLICO, `Sede Fluxo ${Date.now()}`);
    await escolherFinalidade(page, /Comprar equipamento/);
    await escolherPrimeiraDotacao(page);

    // A tese do produto: classificação se escolhe, não se digita. No passo 3 o
    // único campo digitável é o de BUSCA, que filtra a lista e não entra na
    // emenda; o órgão é um <select>, e por isso não aparece aqui.
    const editaveis = page.locator(
      'input:not([readonly]):not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea:not([readonly])'
    );
    const rotulos = await editaveis.evaluateAll((nos) =>
      nos.map((n) => {
        const el = n as HTMLInputElement;
        return (el.labels?.[0]?.textContent ?? el.getAttribute("aria-label") ?? "sem-rótulo").trim();
      })
    );
    expect(rotulos.sort()).toEqual(["Buscar"]);
  });
});

test.describe("a lista sob volume realista", () => {
  // Regressão de UX invertida. O baseline antigo media o problema: com a base
  // cheia (~2.290 dotações) o <select> nativo sem busca era inutilizável. Agora
  // o número que importa é o oposto — quantas SOBRAM depois do filtro.
  test("a base cheia é reduzida a uma lista escolhível", async ({ page }) => {
    await abrirFluxo(page);
    await escolherDestino(page, "Entidade do terceiro setor", `Entidade Volume ${Date.now()}`);
    await escolherFinalidade(page, /Manter o serviço/);

    await expect
      .poll(async () => linhasDeDotacao(page).count(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    const mostradas = await linhasDeDotacao(page).count();
    console.log(`  lista filtrada: ${mostradas} linhas na tela`);
    // Doze é o corte da página; o que importa é caber numa tela.
    expect(mostradas).toBeLessThanOrEqual(12);

    // E a conta do que ficou de fora é a prova de que a base inteira está lá.
    const fora = page.getByRole("button", { name: /ficaram de fora e por quê/ });
    const texto = await fora.innerText();
    const excluidas = Number(texto.match(/(\d+)\s+dotações/)?.[1] ?? 0);
    console.log(`  filtradas fora: ${excluidas} dotações`);
    expect(excluidas).toBeGreaterThan(1000);
  });
});
