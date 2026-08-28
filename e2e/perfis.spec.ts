import { test, expect } from "@playwright/test";
import { entrarComo } from "./personas";

// Ciclo completo da ferramenta de perfis, do critério de aceite: o
// Administrador Geral cria um perfil, atribui a um usuário, confere o acesso
// resultante, reatribui e exclui — com as salvaguardas no caminho.

test("o Administrador Geral compõe, atribui, reatribui e exclui um perfil", async ({
  page,
}) => {
  await entrarComo(page, "super");
  await page.goto("/config");
  await page.getByRole("tab", { name: "Perfis" }).click();

  // O banco de teste sobrevive entre execuções: um perfil deixado por uma
  // corrida anterior faria a criação colidir no nome único.
  await removerSeExistir(page);

  // --- criar ---------------------------------------------------------------
  await page.getByRole("button", { name: "Novo perfil" }).click();
  await page.getByLabel("Nome do perfil *").fill("Assessoria de Teste");
  await page.getByLabel("Descrição").fill("Perfil temporário de verificação.");
  await page.getByLabel("Poder de atuação").selectOption("LEGISLATIVO");
  await page.getByLabel(/Apresentar emendas/).check();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Salvo com sucesso.")).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await page.getByRole("tab", { name: "Perfis" }).click();
  const linha = page.getByRole("row", { name: /Assessoria de Teste/ });
  await expect(linha).toBeVisible();
  await expect(linha.getByText("Apresentar emendas")).toBeVisible();

  // --- atribuir a um usuário ----------------------------------------------
  await page.getByRole("tab", { name: "Usuários" }).click();
  const linhaUsuario = page.getByRole("row", { name: /comissao@camara\.gov\.br/ });
  await linhaUsuario
    .getByLabel("Perfil de acesso")
    .selectOption({ label: "Assessoria de Teste · Legislativo" });
  await expect(page.getByText(/Perfil alterado para Assessoria de Teste/)).toBeVisible({
    timeout: 20_000,
  });

  // --- com usuário vinculado, a exclusão é barrada -------------------------
  await page.reload();
  await page.getByRole("tab", { name: "Perfis" }).click();
  await expect(
    page.getByRole("row", { name: /Assessoria de Teste/ }).getByText("1")
  ).toBeVisible();

  // --- reatribuir de volta e excluir ---------------------------------------
  await page.getByRole("tab", { name: "Usuários" }).click();
  await page
    .getByRole("row", { name: /comissao@camara\.gov\.br/ })
    .getByLabel("Perfil de acesso")
    .selectOption({ label: "Comissão de Finanças e Orçamento · Legislativo" });
  await expect(page.getByText(/Perfil alterado para Comissão/)).toBeVisible({
    timeout: 20_000,
  });

  await page.reload();
  await page.getByRole("tab", { name: "Perfis" }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("row", { name: /Assessoria de Teste/ })
    .getByRole("button", { name: "Excluir perfil" })
    .click();
  await expect(page.getByText("Perfil excluído.")).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await page.getByRole("tab", { name: "Perfis" }).click();
  await expect(page.getByRole("row", { name: /Assessoria de Teste/ })).toHaveCount(0);
});

// Remove o perfil de teste, se tiver sobrado de uma execução anterior.
async function removerSeExistir(page: import("@playwright/test").Page) {
  const linha = page.getByRole("row", { name: /Assessoria de Teste/ });
  if ((await linha.count()) === 0) return;
  const botao = linha.getByRole("button", { name: "Excluir perfil" });
  if ((await botao.count()) === 0) {
    // Ainda tem usuário vinculado: devolve a Comissão ao seu perfil primeiro.
    await page.getByRole("tab", { name: "Usuários" }).click();
    await page
      .getByRole("row", { name: /comissao@camara\.gov\.br/ })
      .getByLabel("Perfil de acesso")
      .selectOption({ label: "Comissão de Finanças e Orçamento · Legislativo" });
    await page.waitForTimeout(1000);
    await page.reload();
    await page.getByRole("tab", { name: "Perfis" }).click();
  }
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("row", { name: /Assessoria de Teste/ })
    .getByRole("button", { name: "Excluir perfil" })
    .click();
  await expect(page.getByText("Perfil excluído.")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page.getByRole("tab", { name: "Perfis" }).click();
}

test("perfis do sistema não podem ser excluídos", async ({ page }) => {
  await entrarComo(page, "super");
  await page.goto("/config");
  await page.getByRole("tab", { name: "Perfis" }).click();
  // Sem botão de exclusão: o ícone fica inerte, com o motivo no title.
  await expect(
    page.getByRole("row", { name: /Administrador Geral/ }).getByRole("button", {
      name: "Excluir perfil",
    })
  ).toHaveCount(0);
});

test("os atos de perfil vão para a trilha de auditoria", async ({ page }) => {
  await entrarComo(page, "super");
  await page.goto("/config");
  await page.getByRole("tab", { name: "Auditoria" }).click();
  await expect(page.getByText("PerfilAcesso").first()).toBeVisible();
});

test.describe("atalhos de configuração no menu lateral", () => {
  test("o Administrador Geral tem Usuários, Perfis e Configurações no trilho", async ({
    page,
  }) => {
    await entrarComo(page, "super");
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Usuários" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis de acesso" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Configurações" })).toBeVisible();

    // Um clique, e a aba certa já vem aberta — sem passar por Ferramentas.
    await nav.getByRole("link", { name: "Perfis de acesso" }).click();
    await expect(page).toHaveURL(/\/config\?aba=perfis/);
    await expect(page.getByRole("button", { name: "Novo perfil" })).toBeVisible();

    await nav.getByRole("link", { name: "Usuários" }).click();
    await expect(page.getByRole("button", { name: "Novo usuário" })).toBeVisible();
  });

  test("quem administra configurações tem Usuários, mas não Perfis", async ({
    page,
  }) => {
    await entrarComo(page, "presidente");
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Usuários" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis de acesso" })).toHaveCount(0);
  });

  test("o vereador não tem nenhum dos atalhos", async ({ page }) => {
    await entrarComo(page, "vereador");
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Perfis de acesso" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Configurações" })).toHaveCount(0);
  });

  test("aba pedida na URL que a pessoa não enxerga cai em Parâmetros", async ({
    page,
  }) => {
    await entrarComo(page, "presidente");
    await page.goto("/config?aba=perfis");
    await expect(page.getByRole("tab", { name: "Perfis" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Parâmetros" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("o perfil que a pessoa não pode conceder aparece como texto, não vazio", async ({
    page,
  }) => {
    // O seletor filtrava os perfis inatribuíveis e caía na opção vazia: o
    // Presidente via o Administrador Geral rotulado como "Sem perfil".
    await entrarComo(page, "presidente");
    await page.goto("/config?aba=usuarios");
    const linha = page.getByRole("row", { name: /super@municipio\.gov\.br/ });
    await expect(linha).toContainText("Administrador Geral");
    await expect(linha.getByLabel("Perfil de acesso")).toHaveCount(0);

    // A própria linha do Legislativo continua editável.
    await expect(
      page
        .getByRole("row", { name: /vereador@camara\.gov\.br/ })
        .getByLabel("Perfil de acesso")
    ).toBeVisible();
  });
});
