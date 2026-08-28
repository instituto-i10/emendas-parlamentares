import { Poder } from "@/generated/prisma/enums";
import {
  ehAdminGeral,
  podeAcessar,
  temPermissao,
  type Ator,
  type Permissao,
} from "@/lib/authz";

// ============================================================================
// Vistas do front-end "Emendas 360": itens do menu lateral, filtrados pelo
// perfil de acesso. O assistente saiu daqui — virou widget flutuante,
// disponível em todas as telas.
//
// Mesma regra da navegação (PROMPT 12): o Poder do perfil precisa alcançar o
// Poder da vista, e a vista só exige permissão quando NÃO é item de consulta.
// Painéis, resumos e relatórios são consulta — qualquer perfil do Poder vê.
// ============================================================================

export type EscopoVista = Poder | "TRANSVERSAL";

export type Vista360 = {
  id: string;
  titulo: string;
  href: string;
  poder: EscopoVista;
  // Ausente = vista de consulta.
  permissoes?: Permissao[];
  // Restringe ao Administrador Geral, para além da permissão. Usado pela vista
  // de Perfis: administrar configurações não dá o direito de compor perfis.
  adminGeralApenas?: boolean;
};

// Listar as emendas de todos, uma a uma, não é consulta livre: é a mesa de
// trabalho de quem gere ou tramita. O gabinete acompanha pelos agregados.
const VER_TODAS_EMENDAS: Permissao[] = ["gerirTodasEmendas", "tramitarEmendas"];

export const VISTAS360: Vista360[] = [
  { id: "painel", titulo: "Painel", href: "/painel", poder: "TRANSVERSAL" },
  {
    id: "tramitacao360",
    titulo: "Tramitação",
    href: "/tramitacao",
    poder: "TRANSVERSAL",
  },
  {
    id: "emendas360",
    titulo: "Emendas & Beneficiários",
    href: "/emendas",
    poder: "TRANSVERSAL",
  },
  {
    id: "vereador360",
    titulo: "Vereador 360",
    href: "/vereador360",
    poder: Poder.LEGISLATIVO,
  },
  {
    id: "analise",
    titulo: "Análise Técnica",
    href: "/analise",
    poder: Poder.LEGISLATIVO,
    permissoes: VER_TODAS_EMENDAS,
  },
  {
    id: "placar",
    titulo: "Resumo Consolidado",
    href: "/placar",
    poder: "TRANSVERSAL",
  },
  {
    id: "conformidade",
    titulo: "Conformidade",
    href: "/conformidade",
    poder: "TRANSVERSAL",
  },
  // Configurações no trilho lateral: cadastrar gente e compor perfis é rotina
  // de quem administra, e estava a dois cliques, escondida atrás de Ferramentas.
  {
    id: "usuarios",
    titulo: "Usuários",
    href: "/config?aba=usuarios",
    poder: "TRANSVERSAL",
    permissoes: ["administrarConfiguracoes"],
  },
  {
    id: "perfis",
    titulo: "Perfis de acesso",
    href: "/config?aba=perfis",
    poder: "TRANSVERSAL",
    permissoes: ["administrarConfiguracoes"],
    adminGeralApenas: true,
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    href: "/config",
    poder: "TRANSVERSAL",
    permissoes: ["administrarConfiguracoes"],
  },
  { id: "ferramentas", titulo: "Ferramentas", href: "/hub", poder: "TRANSVERSAL" },
  {
    id: "pitch",
    titulo: "Pitch",
    href: "/pitch",
    poder: "TRANSVERSAL",
    permissoes: ["administrarConfiguracoes"],
  },
];

export function vistasVisiveis(u: Ator): Vista360[] {
  return VISTAS360.filter((v) => {
    if (v.adminGeralApenas && !ehAdminGeral(u)) return false;
    return podeAcessar(u, { poder: v.poder, permissoes: v.permissoes });
  });
}

// Vista inicial após o login. O perfil de gabinete — apresenta as próprias
// emendas e não gere as dos outros — cai direto na sua cota; os demais no
// Painel. É comportamento derivado das permissões, não de um nome de perfil.
export function vistaInicial(u: Ator): string {
  const soGabinete =
    temPermissao(u, "apresentarEmendas") &&
    !temPermissao(u, "gerirTodasEmendas", "tramitarEmendas");
  return soGabinete ? "/vereador360" : "/painel";
}
