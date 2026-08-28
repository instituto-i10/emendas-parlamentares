import "server-only";
import { redirect } from "next/navigation";
import { Poder } from "@/generated/prisma/enums";
import { getCurrentUser, type SessionUser } from "./session";
import { moduloPorId, podeVerModulo } from "@/config/navegacao";
import {
  alcancaPoder,
  temPermissao,
  type Permissao,
} from "./authz";

// ============================================================================
// Guards de rota NO SERVIDOR. Ocultar o item do menu não é controle de acesso:
// toda rota e toda server action passa por aqui. Acesso negado → volta ao hub
// com marcador de erro. Quem tem `adminGeral` passa por tudo.
// ============================================================================

// Exige acesso a um macro-módulo específico (por id do mapa de navegação).
export async function requireModuloAcesso(
  moduloId: string
): Promise<SessionUser> {
  const user = await getCurrentUser();
  const modulo = moduloPorId(moduloId);
  if (!modulo || !podeVerModulo(user, modulo)) {
    redirect("/hub?erro=acesso-negado");
  }
  return user;
}

// Exige que o perfil alcance um Poder. Separação de Poderes é estrutural.
export async function requirePoderAcesso(poder: Poder): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!alcancaPoder(user, poder)) redirect("/hub?erro=acesso-negado");
  return user;
}

// Exige ao menos uma das permissões informadas.
export async function requirePermissao(
  ...permissoes: Permissao[]
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!temPermissao(user, ...permissoes)) redirect("/hub?erro=acesso-negado");
  return user;
}

// Guard unificado: Poder e/ou permissões. As duas condições são conjuntivas —
// ter a permissão não abre o módulo do outro Poder.
export async function requireAccess(opts: {
  poder?: Poder;
  permissoes?: Permissao[];
}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (opts.poder && !alcancaPoder(user, opts.poder)) {
    redirect("/hub?erro=acesso-negado");
  }
  if (opts.permissoes?.length && !temPermissao(user, ...opts.permissoes)) {
    redirect("/hub?erro=acesso-negado");
  }
  return user;
}
