import {
  EscopoParametro,
  EspecieInstrumento,
  ModoValidacao,
  Poder,
  Role,
  StatusEmenda,
  StatusInstrumento,
  TipoAcao,
  TipoEmenda,
  TipoInstrumento,
  TipoNorma,
} from "@/generated/prisma/enums";
import type { Opcao } from "@/components/config/fields";

// Rótulos em português dos enums do domínio (fonte única de exibição).

export const ROTULO_TIPO_NORMA: Record<string, string> = {
  [TipoNorma.LOM]: "Lei Orgânica Municipal (LOM)",
  [TipoNorma.REGIMENTO_INTERNO]: "Regimento Interno",
  [TipoNorma.OUTRO]: "Outro",
};

export const ROTULO_MODO: Record<string, string> = {
  [ModoValidacao.BLOQUEANTE]: "Bloqueante",
  [ModoValidacao.ALERTA]: "Alerta",
};

export const ROTULO_ESCOPO: Record<string, string> = {
  [EscopoParametro.GERAL]: "Geral",
  [EscopoParametro.EXERCICIO]: "Por exercício",
};

export const ROTULO_TIPO_INSTRUMENTO: Record<string, string> = {
  [TipoInstrumento.PPA]: "PPA",
  [TipoInstrumento.LDO]: "LDO",
  [TipoInstrumento.LOA]: "LOA",
};

export const ROTULO_ESPECIE: Record<string, string> = {
  [EspecieInstrumento.PROJETO_LEI]: "Projeto de lei",
  [EspecieInstrumento.LEI_APROVADA]: "Lei aprovada",
};

export const ROTULO_STATUS_INSTRUMENTO: Record<string, string> = {
  [StatusInstrumento.EM_ELABORACAO]: "Em elaboração",
  [StatusInstrumento.ENVIADO]: "Enviado",
  [StatusInstrumento.EM_TRAMITACAO]: "Em tramitação",
  [StatusInstrumento.APROVADO]: "Aprovado",
  [StatusInstrumento.SANCIONADO]: "Sancionado",
  [StatusInstrumento.VIGENTE]: "Vigente",
  [StatusInstrumento.ENCERRADO]: "Encerrado",
};

export const ROTULO_PODER: Record<string, string> = {
  [Poder.LEGISLATIVO]: "Legislativo",
  [Poder.EXECUTIVO]: "Executivo",
};

export const ROTULO_ROLE: Record<string, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.EXEC_ADMIN]: "Executivo · Admin",
  [Role.EXEC_PLANEJAMENTO]: "Executivo · Planejamento",
  [Role.EXEC_CONSULTA]: "Executivo · Consulta",
  [Role.LEG_ADMIN]: "Legislativo · Mesa",
  [Role.LEG_TECNICO]: "Legislativo · Técnico",
  [Role.LEG_AUTOR]: "Legislativo · Vereador(a)",
  [Role.LEG_CONSULTA]: "Legislativo · Consulta",
};

export const ROTULO_TIPO_BENEFICIARIO: Record<string, string> = {
  ADMINISTRACAO_DIRETA: "Administração direta",
  ADMINISTRACAO_INDIRETA: "Administração indireta",
  TERCEIRO_SETOR: "Entidade do terceiro setor",
};

// Explicação curta de cada categoria, para o vereador escolher sem consultar
// ninguém. A escolha muda o que o plano de trabalho vai pedir.
export const AJUDA_TIPO_BENEFICIARIO: Record<string, string> = {
  ADMINISTRACAO_DIRETA:
    "Secretarias, fundos e equipamentos do próprio município (UBS, escola, creche).",
  ADMINISTRACAO_INDIRETA:
    "Autarquias, fundações e empresas públicas municipais — pessoa jurídica própria.",
  TERCEIRO_SETOR:
    "Entidades sem fins lucrativos: Santa Casa, APAE, associações, institutos.",
};

export const ROTULO_TIPO_EMENDA: Record<string, string> = {
  [TipoEmenda.ACRESCIMO]: "Acréscimo",
  [TipoEmenda.ANULACAO]: "Anulação",
  [TipoEmenda.REMANEJAMENTO]: "Remanejamento",
  [TipoEmenda.IMPOSITIVA]: "Impositiva",
};

export const ROTULO_STATUS_EMENDA: Record<string, string> = {
  [StatusEmenda.RASCUNHO]: "Rascunho",
  [StatusEmenda.EM_VALIDACAO]: "Em validação",
  [StatusEmenda.VALIDA]: "Válida",
  [StatusEmenda.INVALIDA]: "Inválida",
  [StatusEmenda.SUBMETIDA]: "Submetida",
  [StatusEmenda.EM_TRAMITACAO]: "Em tramitação",
  [StatusEmenda.APROVADA]: "Aprovada",
  [StatusEmenda.REJEITADA]: "Rejeitada",
};

export const ROTULO_TIPO_ACAO: Record<string, string> = {
  [TipoAcao.PROJETO]: "Projeto",
  [TipoAcao.ATIVIDADE]: "Atividade",
  [TipoAcao.OPERACAO_ESPECIAL]: "Operação especial",
};

// Constrói opções {value,label} a partir de um mapa de rótulos.
export function opcoes(mapa: Record<string, string>): Opcao[] {
  return Object.entries(mapa).map(([value, label]) => ({ value, label }));
}
