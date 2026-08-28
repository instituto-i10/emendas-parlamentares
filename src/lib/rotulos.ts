import {
  EscopoParametro,
  EspecieInstrumento,
  ModoValidacao,
  Poder,
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

// Rótulos das permissões atômicas de um perfil de acesso (PROMPT 12).
export const ROTULO_PERMISSAO: Record<string, string> = {
  apresentarEmendas: "Apresentar emendas",
  gerirTodasEmendas: "Gerir todas as emendas",
  tramitarEmendas: "Tramitar emendas",
  gerirPlanejamento: "Gerir planejamento",
  gerirExercicios: "Abrir/encerrar exercícios",
  administrarConfiguracoes: "Administrar configurações",
  analisarViabilidade: "Analisar viabilidade técnica",
  registrarExecucao: "Registrar execução",
};

// O que cada permissão de fato autoriza — texto de apoio do formulário.
export const AJUDA_PERMISSAO: Record<string, string> = {
  apresentarEmendas: "Criar emendas e gerir as de própria autoria.",
  gerirTodasEmendas: "Editar, validar e submeter qualquer emenda do exercício.",
  tramitarEmendas: "Aprovar ou rejeitar emendas submetidas, com parecer.",
  gerirPlanejamento: "Instrumentos PPA/LDO/LOA, base de dotações e lei aprovada.",
  gerirExercicios: "Abrir e encerrar exercícios orçamentários.",
  administrarConfiguracoes: "Parâmetros, normas, beneficiários e usuários.",
  analisarViabilidade: "Registrar parecer de viabilidade técnica nas emendas.",
  registrarExecucao: "Lançar empenho, liquidação e pagamento das emendas.",
};

export const ROTULO_RESULTADO_VIABILIDADE: Record<string, string> = {
  VIAVEL: "Viável",
  VIAVEL_COM_RESSALVA: "Viável com ressalva",
  INVIAVEL: "Inviável",
};

export const ROTULO_ETAPA_EXECUCAO: Record<string, string> = {
  EMPENHO: "Empenho",
  LIQUIDACAO: "Liquidação",
  PAGAMENTO: "Pagamento",
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
