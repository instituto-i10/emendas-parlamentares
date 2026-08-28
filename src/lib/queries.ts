import "server-only";
import { prisma } from "./prisma";

// Executa uma leitura degradando para um fallback quando o banco está
// indisponível/não migrado (mantém a UI utilizável — ver PROMPT 2).
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------------ Parâmetros
export async function listarParametros() {
  return safe(
    () =>
      prisma.parametroValidacao.findMany({
        include: {
          exercicio: { select: { ano: true } },
          fundamentoNorma: { select: { titulo: true } },
        },
        orderBy: [{ escopo: "asc" }, { chave: "asc" }],
      }),
    []
  );
}

// --------------------------------------------------------------------- Normas
export async function listarNormas() {
  return safe(
    () =>
      prisma.documentoNormativo.findMany({
        orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
      }),
    []
  );
}

export async function listarNormasAtivas() {
  return safe(
    () =>
      prisma.documentoNormativo.findMany({
        where: { ativo: true },
        select: { id: true, titulo: true, tipo: true },
        orderBy: { titulo: "asc" },
      }),
    [] as { id: string; titulo: string; tipo: string }[]
  );
}

// ---------------------------------------------------------------- Instrumentos
export async function listarInstrumentos() {
  return safe(
    () =>
      prisma.instrumentoPlanejamento.findMany({
        include: {
          exercicio: { select: { ano: true } },
          instrumentoOrigem: { select: { numero: true, tipo: true } },
          _count: { select: { dotacoes: true, emendas: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
    []
  );
}

// Projetos de lei disponíveis como origem de uma lei aprovada.
export async function listarProjetosDeLei() {
  return safe(
    () =>
      prisma.instrumentoPlanejamento.findMany({
        where: { especie: "PROJETO_LEI" },
        include: { exercicio: { select: { ano: true } } },
        orderBy: [{ createdAt: "desc" }],
      }),
    []
  );
}

// ------------------------------------------------------------------ Auditoria
export async function listarAuditoria(filtros: { entidade?: string } = {}) {
  return safe(
    () =>
      prisma.auditLog.findMany({
        where: { entidade: filtros.entidade || undefined },
        include: { usuario: { select: { name: true, email: true } } },
        orderBy: { criadoEm: "desc" },
        take: 200,
      }),
    []
  );
}

// -------------------------------------------------------------- Beneficiários
export async function listarBeneficiarios() {
  return safe(
    () =>
      prisma.beneficiario.findMany({
        include: { _count: { select: { emendas: true } } },
        orderBy: { nome: "asc" },
      }),
    []
  );
}

// Grupos de beneficiários possivelmente duplicados (variantes de grafia).
export async function sugerirDuplicadosBeneficiarios() {
  const itens = await safe(
    () =>
      prisma.beneficiario.findMany({
        select: { id: true, nome: true, _count: { select: { emendas: true } } },
        orderBy: { nome: "asc" },
      }),
    [] as { id: string; nome: string; _count: { emendas: number } }[]
  );
  const { agruparDuplicados } = await import("./beneficiarios-dedup");
  return agruparDuplicados(
    itens.map((b) => ({ id: b.id, nome: b.nome, emendas: b._count.emendas }))
  );
}

export async function listarBeneficiariosOpcoes() {
  return safe(
    () =>
      prisma.beneficiario.findMany({
        select: { id: true, nome: true, tipo: true },
        orderBy: { nome: "asc" },
      }),
    [] as { id: string; nome: string; tipo: string }[]
  );
}

// --------------------------------------------------------- Perfis de acesso
export async function listarPerfis() {
  return safe(
    () =>
      prisma.perfilAcesso.findMany({
        include: { _count: { select: { usuarios: true } } },
        // Os de fábrica primeiro: são a referência de quem compõe um perfil novo.
        orderBy: [{ perfilDoSistema: "desc" }, { nome: "asc" }],
      }),
    []
  );
}

// ------------------------------------------------------------------- Usuários
export async function listarUsuarios() {
  return safe(
    () =>
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          poder: true,
          perfilId: true,
          perfil: { select: { id: true, nome: true, poder: true, adminGeral: true } },
          autor: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    []
  );
}
