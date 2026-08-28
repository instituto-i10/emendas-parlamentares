import "server-only";
import { redirect } from "next/navigation";
import { Poder } from "@/generated/prisma/enums";
import { auth } from "./auth";
import type { Ator, Perfil } from "./authz";

// ============================================================================
// Sessão autenticada (Auth.js). O PERFIL DE ACESSO — Poder + permissões — é
// gravado no token no login (PROMPT 12): alterações de perfil valem no PRÓXIMO
// login do usuário afetado.
//
// Conta sem perfil NÃO acessa o sistema: volta ao login com aviso. Sessões
// abertas antes da implantação não carregam perfil e caem nesse mesmo caminho,
// uma única vez, sem erro.
// ============================================================================

export type SessionUser = Ator & {
  nome: string;
  email: string;
  // Poder efetivo do usuário — vem do perfil, que é a fonte de verdade.
  poder: Poder | null;
};

// Perfil sintético usado APENAS fora de produção, quando não há sessão: permite
// abrir o sistema em desenvolvimento sem semear banco. Nunca vale em produção.
const PERFIL_DEV: Perfil = {
  id: "dev-perfil",
  nome: "Administrador Geral",
  poder: null,
  adminGeral: true,
  perfilDoSistema: true,
  apresentarEmendas: true,
  gerirTodasEmendas: true,
  tramitarEmendas: true,
  gerirPlanejamento: true,
  gerirExercicios: true,
  administrarConfiguracoes: true,
  analisarViabilidade: true,
  registrarExecucao: true,
};

export async function getCurrentUser(): Promise<SessionUser> {
  try {
    const session = await auth();
    if (session?.user) {
      const perfil = session.user.perfil ?? null;
      // Autenticado, porém sem perfil atribuído (ou sessão anterior à
      // implantação): volta ao login com aviso, não com erro.
      if (!perfil) redirect("/login?erro=sem-perfil");
      return {
        id: session.user.id,
        nome: session.user.name ?? session.user.email ?? "Usuário",
        email: session.user.email ?? "",
        poder: perfil.poder,
        perfil,
      };
    }
  } catch (e) {
    // `redirect` sinaliza por exceção — não pode ser engolido pelo fallback.
    if (e && typeof e === "object" && "digest" in e) throw e;
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      id: "dev-user",
      nome: "Administrador Geral",
      email: "dev@local",
      poder: null,
      perfil: PERFIL_DEV,
    };
  }

  redirect("/login");
}
