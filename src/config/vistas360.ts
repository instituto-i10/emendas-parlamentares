import { Role } from "@/generated/prisma/enums";

// ============================================================================
// Vistas do front-end "Emendas 360": itens do menu lateral, filtrados pelo
// papel do usuário. O assistente saiu daqui — virou widget flutuante,
// disponível em todas as telas. Cada persona do mockup vira um
// conjunto de vistas: Comissão (LEG_ADMIN/TECNICO), Gabinete (LEG_AUTOR),
// Executivo (EXEC_*), Cidadão (/publica) e Pitch (apresentação).
// ============================================================================

export type Vista360 = {
  id: string;
  titulo: string;
  href: string;
  roles: Role[];
};

const LEG_COMISSAO: Role[] = [Role.LEG_ADMIN, Role.LEG_TECNICO, Role.LEG_CONSULTA];
const EXEC: Role[] = [Role.EXEC_ADMIN, Role.EXEC_PLANEJAMENTO, Role.EXEC_CONSULTA];
const TODOS: Role[] = [
  ...LEG_COMISSAO,
  Role.LEG_AUTOR,
  ...EXEC,
  Role.SUPER_ADMIN,
];

export const VISTAS360: Vista360[] = [
  {
    id: "painel",
    titulo: "Painel",
    href: "/painel",
    roles: [...LEG_COMISSAO, ...EXEC, Role.SUPER_ADMIN],
  },
  {
    id: "tramitacao360",
    titulo: "Tramitação",
    href: "/tramitacao",
    roles: [...LEG_COMISSAO, ...EXEC, Role.SUPER_ADMIN],
  },
  {
    id: "emendas360",
    titulo: "Emendas & Beneficiários",
    href: "/emendas",
    roles: TODOS,
  },
  {
    id: "vereador360",
    titulo: "Vereador 360",
    href: "/vereador360",
    roles: [...LEG_COMISSAO, Role.LEG_AUTOR, Role.SUPER_ADMIN],
  },
  {
    id: "analise",
    titulo: "Análise Técnica",
    href: "/analise",
    roles: [Role.LEG_ADMIN, Role.LEG_TECNICO, Role.LEG_AUTOR, Role.SUPER_ADMIN],
  },
  {
    id: "placar",
    titulo: "Resumo Consolidado",
    href: "/placar",
    roles: [...LEG_COMISSAO, ...EXEC, Role.SUPER_ADMIN],
  },
  {
    id: "conformidade",
    titulo: "Conformidade",
    href: "/conformidade",
    roles: [Role.LEG_ADMIN, Role.LEG_TECNICO, Role.EXEC_ADMIN, Role.SUPER_ADMIN],
  },
  {
    id: "ferramentas",
    titulo: "Ferramentas",
    href: "/hub",
    roles: TODOS,
  },
  {
    id: "pitch",
    titulo: "Pitch",
    href: "/pitch",
    roles: [Role.SUPER_ADMIN, Role.LEG_ADMIN, Role.EXEC_ADMIN],
  },
];

export function vistasVisiveis(role: Role): Vista360[] {
  if (role === Role.SUPER_ADMIN) return VISTAS360;
  return VISTAS360.filter((v) => v.roles.includes(role));
}

// Vista inicial após o login, por papel (o gabinete cai direto no Vereador 360).
export function vistaInicial(role: Role): string {
  if (role === Role.LEG_AUTOR) return "/vereador360";
  return "/painel";
}
