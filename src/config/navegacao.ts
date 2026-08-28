import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CircleCheck,
  Database,
  FileCheck2,
  FileEdit,
  FilePlus2,
  FileStack,
  FileText,
  GitBranch,
  GitCompareArrows,
  Landmark,
  LineChart,
  ListChecks,
  ScrollText,
  Settings,
  BarChart3,
  ClipboardCheck,
  Banknote,
} from "lucide-react";
import { Poder } from "@/generated/prisma/enums";
import { podeAcessar, type Ator, type Permissao } from "@/lib/authz";

// ============================================================================
// Mapa de navegação central. É a ÚNICA fonte de verdade da casca: hub e sidebar
// renderizam a partir daqui, filtrando pela sessão. "Mínimo aparente" é regra de
// dados — o usuário só vê o que seu perfil permite.
//
// PROMPT 12: um item aparece quando o Poder do perfil alcança o Poder do item
// (ou o item é transversal) E o perfil tem ao menos uma das permissões exigidas.
// Item SEM `permissoes` é item de consulta: basta pertencer ao Poder.
// ============================================================================

export type EscopoPoder = Poder | "TRANSVERSAL";

export type Ferramenta = {
  id: string;
  titulo: string;
  descricao?: string;
  href: string;
  icon: LucideIcon;
  // Se ausente, herda as permissões do macro-módulo (que também podem ser
  // nenhuma — nesse caso é ferramenta de consulta).
  permissoes?: Permissao[];
};

export type MacroModulo = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  poder: EscopoPoder;
  // Ausente/vazio = macro-módulo de consulta do seu Poder.
  permissoes?: Permissao[];
  ferramentas: Ferramenta[];
};

// A navegação decide com o mesmo ator das regras de autorização.
export type UsuarioNav = Ator;

// Ver a lista completa de emendas do exercício não é consulta livre: quem só
// apresenta acompanha os agregados (painéis, relatórios), não a lista alheia.
const VER_TODAS_EMENDAS: Permissao[] = ["gerirTodasEmendas", "tramitarEmendas"];

export const NAVEGACAO: MacroModulo[] = [
  // ---------------------------------------------------------------- LEGISLATIVO
  {
    id: "leg-emendas",
    titulo: "Emendas",
    descricao:
      "Apresentar, validar e submeter emendas sobre a base do projeto de lei.",
    href: "/legislativo/emendas",
    icon: FileEdit,
    poder: Poder.LEGISLATIVO,
    ferramentas: [
      {
        id: "leg-emendas-nova",
        titulo: "Nova emenda",
        descricao: "Apresentar uma emenda com seleção assistida da dotação.",
        href: "/legislativo/emendas/nova",
        icon: FilePlus2,
        permissoes: ["apresentarEmendas"],
      },
      {
        id: "leg-emendas-minhas",
        titulo: "Minhas emendas",
        descricao: "Emendas de sua autoria e seus status.",
        href: "/legislativo/emendas/minhas",
        icon: FileText,
        permissoes: ["apresentarEmendas"],
      },
      {
        id: "leg-emendas-todas",
        titulo: "Todas as emendas",
        descricao: "Todas as emendas do exercício, com filtros.",
        href: "/legislativo/emendas/todas",
        icon: FileStack,
        permissoes: VER_TODAS_EMENDAS,
      },
    ],
  },
  {
    id: "leg-tramitacao",
    titulo: "Tramitação & Acompanhamento",
    descricao:
      "Situação das emendas, emendas acatadas na lei aprovada e relatórios.",
    href: "/legislativo/tramitacao",
    icon: GitBranch,
    poder: Poder.LEGISLATIVO,
    ferramentas: [
      {
        id: "leg-tram-status",
        titulo: "Situação das emendas",
        href: "/legislativo/tramitacao/status",
        icon: ListChecks,
      },
      {
        id: "leg-tram-acatadas",
        titulo: "Acatadas na lei",
        href: "/legislativo/tramitacao/acatadas",
        icon: CircleCheck,
      },
      {
        id: "leg-tram-relatorios",
        titulo: "Relatórios",
        href: "/legislativo/tramitacao/relatorios",
        icon: BarChart3,
      },
    ],
  },
  // ------------------------------------------------------------------ EXECUTIVO
  {
    id: "exec-planejamento",
    titulo: "Planejamento & Orçamento",
    descricao:
      "Instrumentos PPA/LDO/LOA, base de dotações e leis aprovadas.",
    href: "/executivo/planejamento",
    icon: Landmark,
    poder: Poder.EXECUTIVO,
    ferramentas: [
      {
        id: "exec-plan-instrumentos",
        titulo: "Instrumentos",
        descricao: "Projetos de lei e leis aprovadas do exercício.",
        href: "/executivo/planejamento/instrumentos",
        icon: ScrollText,
      },
      {
        id: "exec-plan-base",
        titulo: "Base de dotações",
        descricao: "Gerar e gerir a base estruturada a partir do PL.",
        href: "/executivo/planejamento/base",
        icon: Database,
        permissoes: ["gerirPlanejamento"],
      },
      {
        id: "exec-plan-lei",
        titulo: "Lei aprovada",
        descricao: "Subir a lei aprovada e conduzir o ciclo de vida.",
        href: "/executivo/planejamento/lei-aprovada",
        icon: FileCheck2,
        permissoes: ["gerirPlanejamento"],
      },
    ],
  },
  {
    id: "exec-acompanhamento",
    titulo: "Acompanhamento",
    descricao:
      "Comparação PL × lei aprovada, execução e emendas incorporadas.",
    href: "/executivo/acompanhamento",
    icon: LineChart,
    poder: Poder.EXECUTIVO,
    ferramentas: [
      {
        id: "exec-acomp-comparacao",
        titulo: "PL × Lei aprovada",
        href: "/executivo/acompanhamento/comparacao",
        icon: GitCompareArrows,
      },
      {
        id: "exec-acomp-execucao",
        titulo: "Execução",
        href: "/executivo/acompanhamento/execucao",
        icon: Activity,
      },
      {
        id: "exec-acomp-viabilidade",
        titulo: "Viabilidade técnica",
        descricao:
          "Manifestar-se sobre a viabilidade das emendas. Parecer informativo: não trava a tramitação.",
        href: "/executivo/acompanhamento/viabilidade",
        icon: ClipboardCheck,
        permissoes: ["analisarViabilidade"],
      },
      {
        id: "exec-acomp-lancamentos",
        titulo: "Execução das emendas",
        descricao:
          "Lançar empenho, liquidação e pagamento de cada emenda aprovada.",
        href: "/executivo/acompanhamento/lancamentos",
        icon: Banknote,
        permissoes: ["registrarExecucao"],
      },
    ],
  },
  // ----------------------------------------------------------------- TRANSVERSAL
  {
    id: "config",
    titulo: "Configurações",
    descricao:
      "Parâmetros de validação, normas (LOM/RI), instrumentos e usuários.",
    href: "/config",
    icon: Settings,
    poder: "TRANSVERSAL",
    permissoes: ["administrarConfiguracoes"],
    // Ferramentas de config são abas dentro de /config (PROMPT 3).
    ferramentas: [],
  },
];

// ---------------------------------------------------------------------------
// Regras de visibilidade (puras — usadas no servidor e no cliente).
// ---------------------------------------------------------------------------

export function podeVerModulo(u: UsuarioNav, m: MacroModulo): boolean {
  return podeAcessar(u, { poder: m.poder, permissoes: m.permissoes });
}

export function podeVerFerramenta(
  u: UsuarioNav,
  m: MacroModulo,
  f: Ferramenta
): boolean {
  if (!podeVerModulo(u, m)) return false;
  return podeAcessar(u, {
    poder: m.poder,
    permissoes: f.permissoes ?? m.permissoes,
  });
}

export function modulosVisiveis(u: UsuarioNav): MacroModulo[] {
  return NAVEGACAO.filter((m) => podeVerModulo(u, m));
}

export function moduloPorId(id: string): MacroModulo | undefined {
  return NAVEGACAO.find((m) => m.id === id);
}

// Encontra o macro-módulo cujo href casa com o caminho atual (para o 2º nível).
export function moduloPorPathname(pathname: string): MacroModulo | undefined {
  return NAVEGACAO.find(
    (m) => pathname === m.href || pathname.startsWith(m.href + "/")
  );
}
