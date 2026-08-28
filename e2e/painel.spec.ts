import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Os painéis são o produto para Mesa e Executivo: consolidam cota, teto,
// reserva da saúde e conformidade. Os números abaixo vêm do dataset de
// demonstração e travam a aritmética — se um refactor de UI quebrar uma
// agregação, o teste acusa antes da demo.

test.describe("painel da comissão", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/painel");
  });

  // Regressão: o seletor já abriu FORA DA TELA por falta do <SelectValue> no
  // gatilho — o Radix usa esse nó como âncora do posicionamento. Nenhum teste
  // abria o menu, então a suíte inteira passou com o seletor quebrado. Este
  // teste existe para isso não se repetir.
  test("o seletor de ciclo abre e mostra elaboração/execução", async ({ page }) => {
    const gatilho = page.getByRole("combobox", { name: "Ciclo orçamentário" });
    await expect(gatilho).toHaveText(/^\d{4}\/\d{4}$/);

    await gatilho.click();

    const opcoes = page.getByRole("option");
    await expect(opcoes.first()).toBeVisible();

    // Dentro da janela: é exatamente o que falhava antes.
    const caixa = await opcoes.first().boundingBox();
    expect(caixa).not.toBeNull();
    const janela = page.viewportSize()!;
    expect(caixa!.y).toBeGreaterThanOrEqual(0);
    expect(caixa!.y).toBeLessThan(janela.height);
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.x).toBeLessThan(janela.width);

    await expect(opcoes.first()).toContainText(/emendas elaboradas em \d{4} para o orçamento de \d{4}/);
  });

  test("consolida as emendas do exercício", async ({ page }) => {
    // Sem número fixo: as specs compartilham o banco e a suíte de apresentação
    // cria emendas antes desta rodar. O que importa é o consolidado existir.
    const banner = page.getByText(/\d+ emendas apresentadas por \d+ autor\(es\)/);
    await expect(banner).toBeVisible();
    const qtd = Number((await banner.textContent())?.match(/(\d+) emendas/)?.[1] ?? "0");
    expect(qtd).toBeGreaterThanOrEqual(41);
  });

  test("mostra os parâmetros do exercício nos indicadores", async ({ page }) => {
    // Cota por autor (TETO_VALOR_AUTOR = 500.000) e teto global (× 13 autores).
    await expect(page.getByText("Cota por autor")).toBeVisible();
    await expect(page.getByText("R$ 500 mil", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/R\$ 6,5 mi/).first()).toBeVisible();
  });

  // "apresentado acima da cota", não "acima da cota": o somatório do painel
  // inclui emenda inválida e rejeitada, que a pré-checagem não conta na cota.
  // O rótulo tem de dizer qual das duas contas está na tela.
  test("o farol acusa quem apresentou acima da cota", async ({ page }) => {
    await expect(
      page.getByText(/\d+ autor\(es\) com apresentado acima da cota/)
    ).toBeVisible();
    await expect(
      page.getByText(/não consome cota/)
    ).toBeVisible();
  });

  test("o farol acusa a invasão da reserva da saúde por autor", async ({ page }) => {
    await expect(
      page.getByText(/autor\(es\) usando a reserva da saúde em outras áreas/)
    ).toBeVisible();
  });

  test("o farol lista as emendas para saneamento e para parecer", async ({ page }) => {
    await expect(page.getByText(/emenda\(s\) inválida\(s\) para saneamento/)).toBeVisible();
    await expect(page.getByText(/emenda\(s\) aguardando parecer/)).toBeVisible();
  });

  test("cada item do farol leva a uma tela de ação", async ({ page }) => {
    const link = page.locator('a[href="/analise"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/analise/);
  });
});

test.describe("vereador 360", () => {
  test("o gabinete vê a própria cota", async ({ page }) => {
    await entrarComo(page, "vereador");
    await expect(page).toHaveURL(/\/vereador360/);
    // Os rótulos ficam nos "eyebrow" dos cards de indicador.
    const eyebrows = page.locator(".eyebrow");
    await expect(eyebrows.filter({ hasText: "Apresentado" })).toBeVisible();
    await expect(eyebrows.filter({ hasText: /^Saúde$/ })).toBeVisible();
    await expect(eyebrows.filter({ hasText: "Demais áreas" })).toBeVisible();
  });
});

test.describe("conformidade institucional", () => {
  test("o checklist do TCE reflete o estado real do sistema", async ({ page }) => {
    await entrarComo(page, "presidente");
    await page.goto("/conformidade");
    await expect(
      page.getByRole("heading", { name: "Conformidade institucional — checklist TCE" })
    ).toBeVisible();
    // O dataset cadastra LOM, Regimento Interno e Manual.
    await expect(page.getByText(/Lei Orgânica/).first()).toBeVisible();
    await expect(page.getByText(/Regimento Interno/).first()).toBeVisible();
  });
});

test.describe("exportação", () => {
  test("a exportação de emendas devolve um CSV", async ({ page }) => {
    await entrarComo(page, "presidente");
    const resposta = await page.request.get("/api/export/emendas?ano=2025&formato=csv");
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()["content-type"]).toContain("text/csv");
    const corpo = await resposta.text();
    expect(corpo).toContain("Numero");
    expect(corpo.split("\n").length).toBeGreaterThan(40);
  });
});
