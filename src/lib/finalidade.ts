// ---------------------------------------------------------------------------
// PARA QUE SERVE O DINHEIRO — e quais dotações aceitam essa combinação.
//
// Regra pura, sem I/O. É o avesso de `derivarModeloPlano`: lá a dotação já
// escolhida diz qual formulário abrir; aqui quem recebe e para que serve dizem
// quais dotações podem sequer aparecer na lista.
//
// A ordem importa e foi decidida com o cliente: primeiro QUEM RECEBE, porque é
// o beneficiário que define a modalidade de aplicação; depois PARA QUE SERVE,
// que define o grupo e o elemento da despesa. Com as duas respostas na mão a
// lista de dotações deixa de ser a LOA inteira e passa a ser só o que é
// possível — o erro some da tela em vez de ser apontado depois, na análise.
//
// A natureza da despesa é lida por PARTES ("3.3.50.43" é
// categoria(3).grupo(3).modalidade(50).elemento(43)), pelo mesmo motivo de
// plano-modelo.ts: base de prefeitura escreve "33504300" e "3.3.50.43.00".
// ---------------------------------------------------------------------------

export type Finalidade = "CUSTEIO" | "EQUIPAMENTO" | "OBRA";

export const FINALIDADES: {
  valor: Finalidade;
  titulo: string;
  ajuda: string;
  exemplos: string;
}[] = [
  {
    valor: "CUSTEIO",
    titulo: "Manter o serviço funcionando",
    ajuda:
      "O dinheiro paga o dia a dia: material de consumo, insumos, serviços contratados.",
    exemplos: "Medicamentos, material escolar, exames, oficinas, manutenção predial.",
  },
  {
    valor: "EQUIPAMENTO",
    titulo: "Comprar equipamento ou veículo",
    ajuda:
      "Bem que entra no patrimônio e continua servindo depois do exercício.",
    exemplos: "Ambulância, monitor, cadeira de rodas, mobiliário, computadores.",
  },
  {
    valor: "OBRA",
    titulo: "Fazer uma obra ou reforma",
    ajuda:
      "Construção, ampliação ou reforma de imóvel, com projeto e responsável técnico.",
    exemplos: "Reforma de telhado, ampliação de ala, quadra, acessibilidade.",
  },
];

export const ROTULO_FINALIDADE: Record<Finalidade, string> = {
  CUSTEIO: "Manter o serviço funcionando",
  EQUIPAMENTO: "Comprar equipamento ou veículo",
  OBRA: "Fazer uma obra ou reforma",
};

/** O que a regra precisa saber da dotação. Tudo em partes, como o banco guarda. */
export type NaturezaParaFiltro = {
  /** "3" despesas correntes · "4" investimentos · "1" pessoal · "2"/"6" dívida. */
  grupo: string;
  /** "90" aplicação direta · "91" entre órgãos do orçamento · "50" entidade privada. */
  modalidadeAplicacao: string;
  /** "51" obras · "52" equipamentos · "43" subvenções · "30" material… */
  elemento: string;
  /** Feitio da ação na LOA. Operação especial não é despesa discricionária. */
  tipoAcao?: string | null;
};

const parte = (v: string | null | undefined) =>
  (v ?? "").trim().replace(/^0+(?=\d)/, "");

// ---------------------------------------------------------------------------
// 1. Emenda impositiva só entra em despesa DISCRICIONÁRIA.
//
// Pedido do cliente: "separar e não permitir a inserção de emendas impositivas
// em dotação orçamentária que não seja discricionária". Discricionária é a
// despesa que o município decide fazer — a que ele é OBRIGADO a pagar não sobra
// para a emenda escolher, e emendá-la só produziria uma emenda impossível de
// executar.
//
// A lista está aqui, em um lugar só, com o motivo em linguagem corrente ao lado
// de cada item: é ela que a tela mostra quando explica por que uma dotação
// ficou de fora.
// ---------------------------------------------------------------------------

/** Grupos da natureza que são obrigação, não escolha. */
const GRUPO_OBRIGATORIO: Record<string, string> = {
  "1": "é folha de pagamento e encargos sociais",
  "2": "são juros e encargos da dívida",
  "6": "é amortização da dívida",
};

/** Elementos que são obrigação mesmo dentro de um grupo discricionário. */
const ELEMENTO_OBRIGATORIO: Record<string, string> = {
  "01": "são aposentadorias e reformas",
  "03": "são pensões",
  "08": "é benefício assistencial ao servidor",
  "47": "são obrigações tributárias e contributivas",
  "91": "é sentença judicial",
  "92": "é despesa de exercício anterior",
  "93": "são indenizações e restituições",
};

export type MotivoNaoDiscricionaria = string | null;

/**
 * `null` quando a dotação é discricionária — ou seja, quando a emenda pode
 * entrar. Quando não pode, devolve o motivo pronto para a tela.
 */
export function motivoNaoDiscricionaria(
  n: NaturezaParaFiltro
): MotivoNaoDiscricionaria {
  const grupo = parte(n.grupo);
  const elemento = parte(n.elemento).padStart(2, "0");

  if (GRUPO_OBRIGATORIO[grupo]) return GRUPO_OBRIGATORIO[grupo];
  if (ELEMENTO_OBRIGATORIO[elemento]) return ELEMENTO_OBRIGATORIO[elemento];
  // Operação especial é a despesa que não gera bem nem serviço — dívida,
  // precatório, transferência obrigatória. Não há o que a emenda acrescente.
  if (n.tipoAcao === "OPERACAO_ESPECIAL")
    return "é uma operação especial (dívida, precatório, transferência obrigatória)";
  return null;
}

export const ehDiscricionaria = (n: NaturezaParaFiltro) =>
  motivoNaoDiscricionaria(n) === null;

// ---------------------------------------------------------------------------
// 2. Quem recebe define a modalidade de aplicação.
//
// A separação que importa, e que o cliente descreveu em uma frase: dinheiro de
// entidade sem fins lucrativos sai por transferência (modalidade 50); dinheiro
// que o próprio município executa sai por aplicação direta (90, ou 91 quando é
// entre órgãos do mesmo orçamento). Trocar os dois é o erro clássico que hoje
// só aparece na análise, depois da emenda inteira preenchida.
// ---------------------------------------------------------------------------

const MODALIDADE_TERCEIRO_SETOR = ["50"];
// 91 é operação entre entes do próprio orçamento — o caso da autarquia e da
// fundação. A administração direta também o aceita porque muita LOA municipal
// classifica repasse a fundo próprio assim.
const MODALIDADE_PODER_PUBLICO = ["90", "91"];

function modalidadesAceitas(tipoBeneficiario: string | null | undefined) {
  return tipoBeneficiario === "TERCEIRO_SETOR"
    ? MODALIDADE_TERCEIRO_SETOR
    : MODALIDADE_PODER_PUBLICO;
}

// ---------------------------------------------------------------------------
// 3. Para que serve define grupo e elemento.
//
// No terceiro setor não dá para separar obra de equipamento pelo elemento: os
// dois saem como auxílio (4.4.50.42). Lá a finalidade separa apenas despesa
// corrente de investimento — e o que distingue obra de equipamento passa a ser
// o plano de trabalho, não a dotação.
// ---------------------------------------------------------------------------

const ELEMENTO_OBRA = ["51"];
// 52 é equipamento e material permanente; 61 é aquisição de imóvel — não é
// obra, e o rito de bem permanente é o que mais se aproxima (mesma decisão de
// plano-modelo.ts).
const ELEMENTO_EQUIPAMENTO = ["52", "61"];

export type Compatibilidade = { ok: true } | { ok: false; motivo: string };

/**
 * A dotação aceita esta combinação de beneficiário e finalidade?
 *
 * Trata APENAS da combinação. Se a dotação é discricionária é outra pergunta,
 * respondida por `motivoNaoDiscricionaria` — separadas porque o relatório de
 * validação as apresenta como dois itens, cada um com o seu motivo.
 *
 * Devolve o motivo quando não aceita, porque a tela precisa poder responder
 * "por que esta dotação não está na lista" — sem isso a lista filtrada vira
 * uma caixa-preta.
 */
export function compatibilidade(
  n: NaturezaParaFiltro,
  tipoBeneficiario: string | null | undefined,
  finalidade: Finalidade | null | undefined
): Compatibilidade {
  const modalidade = parte(n.modalidadeAplicacao).padStart(2, "0");
  const aceitas = modalidadesAceitas(tipoBeneficiario);
  if (!aceitas.includes(modalidade)) {
    return {
      ok: false,
      motivo:
        tipoBeneficiario === "TERCEIRO_SETOR"
          ? "Entidade sem fins lucrativos recebe por transferência; esta dotação é de aplicação direta do município."
          : "Esta dotação é de transferência a entidade privada; o destino escolhido é do poder público.",
    };
  }

  if (!finalidade) return { ok: true };

  const grupo = parte(n.grupo);
  const elemento = parte(n.elemento).padStart(2, "0");
  const terceiroSetor = modalidade === "50";

  // Capital é o que vira patrimônio ou paga dívida (grupos 4, 5 e 6); o resto
  // é despesa corrente — mesmo corte de plano-modelo.ts, onde pessoal (grupo 1)
  // também é custeio e quem o barra é outra regra, não o formulário.
  const capital = ["4", "5", "6"].includes(grupo);

  if (finalidade === "CUSTEIO") {
    return capital
      ? { ok: false, motivo: "É dotação de investimento, e a finalidade é manter o serviço." }
      : { ok: true };
  }

  if (grupo !== "4")
    return {
      ok: false,
      motivo: "É dotação de custeio, e a finalidade é comprar bem ou fazer obra.",
    };

  // No terceiro setor o investimento é um só código; a distinção vive no plano.
  if (terceiroSetor) return { ok: true };

  if (finalidade === "OBRA") {
    return ELEMENTO_OBRA.includes(elemento)
      ? { ok: true }
      : { ok: false, motivo: "É dotação de bem permanente, não de obra." };
  }

  return ELEMENTO_EQUIPAMENTO.includes(elemento)
    ? { ok: true }
    : { ok: false, motivo: "É dotação de obra, não de bem permanente." };
}

export const compativel = (
  n: NaturezaParaFiltro,
  tipoBeneficiario: string | null | undefined,
  finalidade: Finalidade | null | undefined
) => compatibilidade(n, tipoBeneficiario, finalidade).ok;

/**
 * A pergunta que a lista de dotações da nova emenda faz de cada linha: esta
 * dotação pode receber ESTA emenda? É a soma das duas regras — despesa
 * discricionária e combinação de destino com finalidade.
 */
export function elegivel(
  n: NaturezaParaFiltro,
  tipoBeneficiario: string | null | undefined,
  finalidade: Finalidade | null | undefined
): Compatibilidade {
  const impedimento = motivoNaoDiscricionaria(n);
  if (impedimento)
    return {
      ok: false,
      motivo: `Emenda impositiva não entra nesta dotação: ela ${impedimento}.`,
    };
  return compatibilidade(n, tipoBeneficiario, finalidade);
}
