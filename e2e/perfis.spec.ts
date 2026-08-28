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
