"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  temPermissao,
  podeAtribuirPerfil,
  podeGerirPerfis,
  type Permissao,
} from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";
import {
  instrumentoPLSchema,
  leiAprovadaSchema,
  normaSchema,
  parametroSchema,
  usuarioSchema,
  perfilSchema,
  reatribuirPerfilSchema,
  PERMISSOES_PERFIL,
  ESPECIE_BASE,
} from "@/lib/validation/schemas";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

// Gate de permissão para ações de configuração (não redireciona — retorna erro
// para a interface exibir). Toda action passa por aqui: esconder o botão não é
// controle de acesso, a chamada direta à action tem de ser negada no servidor.
async function exigirPermissao(...permissoes: Permissao[]) {
  const user = await getCurrentUser();
  if (!temPermissao(user, ...permissoes)) {
    return { erro: "Você não tem permissão para esta ação." as const, user: null };
  }
  return { erro: null, user };
}

function primeiraMensagem(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos.";
}

// Violação de unicidade. O código P2002 é o caminho normal; o adaptador de
// driver do Prisma 7 às vezes só o traz na mensagem, e sem esta segunda leitura
// quem apenas repetiu um nome receberia "não foi possível", que não ajuda.
function ehNomeDuplicado(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  if ((e as { code?: string }).code === "P2002") return true;
  const msg = (e as { message?: string }).message ?? "";
  return msg.includes("UniqueConstraint");
}

function audUser(id: string): string | null {
  // Sessão de dev não é um User real; evita ruído de FK na auditoria (PROMPT 9
  // liga a auditoria ao usuário autenticado de verdade).
  return id === "dev-user" ? null : id;
}

// ============================================================ PARÂMETROS
export async function criarParametro(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = parametroSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  try {
    const criado = await prisma.parametroValidacao.create({
      data: {
        escopo: d.escopo as never,
        exercicioId: d.escopo === "EXERCICIO" ? d.exercicioId : null,
        chave: d.chave,
        valor: d.valor,
        modo: (d.modo ?? null) as never,
        fundamentoNormaId: d.fundamentoNormaId,
        fundamentoDescricao: d.fundamentoDescricao,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "ParametroValidacao",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: criado,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível salvar o parâmetro." };
  }
}

export async function excluirParametro(id: string): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };
  try {
    await prisma.parametroValidacao.delete({ where: { id } });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "ParametroValidacao",
      entidadeId: id,
      acao: "EXCLUIR",
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir o parâmetro." };
  }
}

// ================================================================ NORMAS
export async function criarNorma(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = normaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  try {
    const criado = await prisma.documentoNormativo.create({
      data: {
        tipo: d.tipo as never,
        titulo: d.titulo,
        numero: d.numero,
        arquivoUrl: d.arquivoUrl,
        dataVigencia: d.dataVigencia ? new Date(d.dataVigencia) : null,
        ativo: d.ativo,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "DocumentoNormativo",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: criado,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar o documento." };
  }
}

export async function alternarNormaAtiva(id: string): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };
  try {
    const atual = await prisma.documentoNormativo.findUnique({ where: { id } });
    if (!atual) return { ok: false, error: "Documento não encontrado." };
    await prisma.documentoNormativo.update({
      where: { id },
      data: { ativo: !atual.ativo },
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o documento." };
  }
}

// ========================================================== INSTRUMENTOS
export async function criarInstrumentoPL(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("gerirPlanejamento");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = instrumentoPLSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  try {
    const criado = await prisma.instrumentoPlanejamento.create({
      data: {
        tipo: d.tipo as never,
        especie: ESPECIE_BASE as never,
        numero: d.numero,
        ementa: d.ementa,
        exercicioId: d.exercicioId,
        status: "EM_TRAMITACAO" as never,
        arquivoUrl: d.arquivoUrl,
        dataEnvio: d.dataEnvio ? new Date(d.dataEnvio) : null,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "InstrumentoPlanejamento",
      entidadeId: criado.id,
      acao: "CRIAR_PL",
      dadosDepois: criado,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível criar o projeto de lei." };
  }
}

export async function subirLeiAprovada(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("gerirPlanejamento");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = leiAprovadaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  try {
    const origem = await prisma.instrumentoPlanejamento.findUnique({
      where: { id: d.instrumentoOrigemId },
    });
    if (!origem) return { ok: false, error: "Projeto de lei de origem não encontrado." };

    const criado = await prisma.instrumentoPlanejamento.create({
      data: {
        tipo: origem.tipo,
        especie: "LEI_APROVADA" as never,
        numero: d.numero,
        ementa: d.ementa,
        exercicioId: origem.exercicioId,
        status: d.status as never,
        arquivoUrl: d.arquivoUrl,
        dataAprovacao: d.dataAprovacao ? new Date(d.dataAprovacao) : null,
        dataVigencia: d.dataVigencia ? new Date(d.dataVigencia) : null,
        instrumentoOrigemId: origem.id,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "InstrumentoPlanejamento",
      entidadeId: criado.id,
      acao: "SUBIR_LEI_APROVADA",
      dadosDepois: criado,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível subir a lei aprovada." };
  }
}

// ============================================================== USUÁRIOS
//
// Cadastrar usuário exige atribuir um perfil: conta sem perfil não acessa o
// sistema, e criar uma assim só produziria um chamado de suporte.
export async function criarUsuario(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = usuarioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  const perfil = await prisma.perfilAcesso.findUnique({ where: { id: d.perfilId } });
  if (!perfil) return { ok: false, error: "Perfil de acesso não encontrado." };
  // Quem não é Administrador Geral só atribui perfis do próprio Poder. Sem esta
  // trava, quem administra o Executivo criaria uma conta de Presidente da Câmara.
  if (!podeAtribuirPerfil(gate.user, perfil)) {
    return { ok: false, error: "Você não pode atribuir este perfil de acesso." };
  }

  try {
    const passwordHash = d.senha ? await bcrypt.hash(d.senha, 10) : null;
    const criado = await prisma.user.create({
      data: {
        name: d.nome,
        email: d.email.toLowerCase(),
        // O Poder do usuário acompanha o do perfil — uma fonte de verdade só.
        poder: perfil.poder,
        perfilId: perfil.id,
        passwordHash,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "User",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: { id: criado.id, email: criado.email, perfil: perfil.nome },
    });
    revalidatePath("/config");
    return { ok: true };
  } catch (e) {
    const msg =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002"
        ? "Já existe um usuário com este e-mail."
        : "Não foi possível criar o usuário.";
    return { ok: false, error: msg };
  }
}

// Reatribuição de perfil pelo seletor na própria linha da tabela.
export async function reatribuirPerfil(input: unknown): Promise<ActionResult> {
  const gate = await exigirPermissao("administrarConfiguracoes");
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = reatribuirPerfilSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const { usuarioId, perfilId } = parsed.data;

  const [alvo, perfil] = await Promise.all([
    prisma.user.findUnique({
      where: { id: usuarioId },
      include: { perfil: true },
    }),
    prisma.perfilAcesso.findUnique({ where: { id: perfilId } }),
  ]);
  if (!alvo) return { ok: false, error: "Usuário não encontrado." };
  if (!perfil) return { ok: false, error: "Perfil de acesso não encontrado." };

  // Duas checagens, não uma: é preciso poder conceder o perfil NOVO e também
  // poder mexer em quem tem o perfil ATUAL — do contrário, quem administra o
  // Executivo rebaixaria o Presidente da Câmara para um perfil do Executivo.
  if (!podeAtribuirPerfil(gate.user, perfil)) {
    return { ok: false, error: "Você não pode atribuir este perfil de acesso." };
  }
  if (alvo.perfil && !podeAtribuirPerfil(gate.user, alvo.perfil)) {
    return { ok: false, error: "Você não pode alterar o perfil deste usuário." };
  }

  try {
    await prisma.user.update({
      where: { id: usuarioId },
      data: { perfilId: perfil.id, poder: perfil.poder },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "User",
      entidadeId: usuarioId,
      acao: "REATRIBUIR_PERFIL",
      dadosAntes: { perfil: alvo.perfil?.nome ?? null },
      dadosDepois: { perfil: perfil.nome },
    });
    revalidatePath("/config");
    return {
      ok: true,
      message: `Perfil alterado para ${perfil.nome}. Vale no próximo login.`,
    };
  } catch {
    return { ok: false, error: "Não foi possível reatribuir o perfil." };
  }
}

// ======================================================= PERFIS DE ACESSO
//
// Compor e excluir perfis é ato EXCLUSIVO do Administrador Geral: a aba fica
// oculta aos demais e a action é bloqueada aqui, no servidor.
async function exigirAdminGeral() {
  const user = await getCurrentUser();
  if (!podeGerirPerfis(user)) {
    return {
      erro: "Apenas o Administrador Geral gere perfis de acesso." as const,
      user: null,
    };
  }
  return { erro: null, user };
}

export async function criarPerfil(input: unknown): Promise<ActionResult> {
  const gate = await exigirAdminGeral();
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = perfilSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  try {
    const criado = await prisma.perfilAcesso.create({
      data: {
        nome: d.nome,
        descricao: d.descricao ?? null,
        poder: (d.poder ?? null) as never,
        apresentarEmendas: d.apresentarEmendas,
        gerirTodasEmendas: d.gerirTodasEmendas,
        tramitarEmendas: d.tramitarEmendas,
        gerirPlanejamento: d.gerirPlanejamento,
        gerirExercicios: d.gerirExercicios,
        administrarConfiguracoes: d.administrarConfiguracoes,
        analisarViabilidade: d.analisarViabilidade,
        registrarExecucao: d.registrarExecucao,
        // Perfil composto pela interface nunca é de sistema nem admin geral.
        perfilDoSistema: false,
        adminGeral: false,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "PerfilAcesso",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: {
        nome: criado.nome,
        poder: criado.poder,
        permissoes: PERMISSOES_PERFIL.filter((k) => criado[k]),
      },
    });
    revalidatePath("/config");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: ehNomeDuplicado(e)
        ? "Já existe um perfil com este nome."
        : "Não foi possível criar o perfil.",
    };
  }
}

export async function excluirPerfil(perfilId: string): Promise<ActionResult> {
  const gate = await exigirAdminGeral();
  if (gate.erro) return { ok: false, error: gate.erro };

  const perfil = await prisma.perfilAcesso.findUnique({
    where: { id: perfilId },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!perfil) return { ok: false, error: "Perfil não encontrado." };

  // Salvaguardas: perfil de fábrica não sai, e perfil com gente vinculada exige
  // reatribuição antes — senão a exclusão trancaria essas pessoas para fora.
  if (perfil.perfilDoSistema) {
    return { ok: false, error: "Perfis do sistema não podem ser excluídos." };
  }
  if (perfil._count.usuarios > 0) {
    return {
      ok: false,
      error: `Há ${perfil._count.usuarios} usuário(s) com este perfil. Reatribua antes de excluir.`,
    };
  }

  try {
    await prisma.perfilAcesso.delete({ where: { id: perfilId } });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "PerfilAcesso",
      entidadeId: perfilId,
      acao: "EXCLUIR",
      dadosAntes: { nome: perfil.nome, poder: perfil.poder },
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir o perfil." };
  }
}
