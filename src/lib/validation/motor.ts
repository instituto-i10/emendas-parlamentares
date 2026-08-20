// Motor de validação de compatibilidade de emendas — NÚCLEO PURO.
// Sem I/O: recebe todo o contexto já carregado e decide. Testável isoladamente.
// A camada com banco (validarEmenda) vive em motorEmenda.ts.

export type StatusItem = "OK" | "FALHA" | "ALERTA";

export type ItemValidacao = {
  codigo: string;
  descricao: string;
  status: StatusItem;
  detalhe: string;
};

export type ResultadoMotor = {
  resultado: "VALIDA" | "INVALIDA";
  itens: ItemValidacao[];
};

// Dados mínimos de uma dotação para as checagens.
export type DotacaoCtx = {
  id: string;
  instrumentoId: string;
  exercicioId: string;
  orgaoId: string;
  unidadeOrcamentariaId: string;
  funcaoId: string;
  subfuncaoId: string;
  programaId: string;
  acaoId: string;
  naturezaDespesaId: string;
  fonteRecursoId: string;
  valorAtual: number;
  acaoProgramaId: string; // programaId ao qual a ação pertence
  // Grupo da natureza da despesa: "1" = Pessoal e Encargos Sociais.
  naturezaGrupo: string;
};

export type ContextoEmenda = {
  emenda: {
    tipo: string;
    valor: number;
    exercicioId: string;
    instrumentoBaseId: string;
    autorId: string;
    // Rascunho pode estar incompleto; a checagem CAMPOS_PREENCHIDOS é que
    // impede a remessa enquanto faltar alguma coisa.
    objeto: string;
    justificativa: string;
  };
  exercicioStatus: string;
  instrumentoBaseStatus: string;
  dotacao: DotacaoCtx | null;
  dotacaoOrigem: DotacaoCtx | null;
  dotacaoDestino: DotacaoCtx | null;
  ppaCadastrado: boolean;
  programasNoPPA: Set<string>;
  prioridadesPrograma: Set<string>;
  prioridadesAcao: Set<string>;
  modoAderenciaLDO: "BLOQUEANTE" | "ALERTA" | null;
  tetoValorAutor: number | null;
  somaAutorExistente: number;
  // Reserva da saúde (RESERVA_SAUDE_PERCENTUAL): parcela da cota que só pode
  // ir para a saúde. A regra é LIMITE, não obrigação — apresentar emenda é
  // faculdade do autor; as demais áreas não podem ultrapassar
  // teto × (1 − pct/100).
  reservaSaudePct: number | null;
  modoReservaSaude: "BLOQUEANTE" | "ALERTA" | null;
  emendaEhSaude: boolean;
  somaAutorDemaisExistente: number;
  // Plano de trabalho simplificado. `null` na categoria = beneficiário final
  // ainda não informado; as pendências vêm apuradas de lib/plano-trabalho.
  beneficiarioCategoria: string | null;
  pendenciasPlanoTrabalho: string[];
};

const STATUS_BASE_ABERTO = new Set(["EM_TRAMITACAO"]);

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Avalia uma emenda e retorna o relatório item a item.
// Regra: VÁLIDA se nenhum item estiver em FALHA; ALERTAS não impedem.
export function avaliarEmenda(ctx: ContextoEmenda): ResultadoMotor {
  const itens: ItemValidacao[] = [];
  const add = (
    codigo: string,
    descricao: string,
    status: StatusItem,
    detalhe: string
  ) => itens.push({ codigo, descricao, status, detalhe });

  const d = ctx.dotacao;

  // 0) CAMPOS_PREENCHIDOS
  // O rascunho pode ser salvo pela metade — o que não pode é seguir assim.
  // Esta checagem é o que troca a trava de lugar: sai do salvar, entra no
  // validar/remeter.
  {
    const faltando = [
      !ctx.emenda.objeto.trim() && "objeto",
      !ctx.emenda.justificativa.trim() && "justificativa",
      !(ctx.emenda.valor > 0) && "valor",
    ].filter((x): x is string => !!x);
    const ok = faltando.length === 0;
    add(
      "CAMPOS_PREENCHIDOS",
      "Emenda preenchida",
      ok ? "OK" : "FALHA",
      ok
        ? "Objeto, justificativa e valor preenchidos."
        : `Falta preencher: ${faltando.join(", ")}.`
    );
  }

  // 1) EXERCICIO_ABERTO
  {
    const ok = ctx.exercicioStatus === "ABERTO";
    add(
      "EXERCICIO_ABERTO",
      "Exercício está aberto",
      ok ? "OK" : "FALHA",
      ok ? "Exercício aberto." : `Exercício ${ctx.exercicioStatus}.`
    );
  }

  // 2) INSTRUMENTO_BASE_ABERTO
  {
    const ok = STATUS_BASE_ABERTO.has(ctx.instrumentoBaseStatus);
    add(
      "INSTRUMENTO_BASE_ABERTO",
      "Instrumento base permite emendas",
      ok ? "OK" : "FALHA",
      ok
        ? "Projeto de lei aberto para emendas."
        : `Status ${ctx.instrumentoBaseStatus} não permite emendas.`
    );
  }

  // 3) DOTACAO_EXISTE (existe e pertence ao mesmo instrumento base e exercício)
  {
    if (!d) {
      add("DOTACAO_EXISTE", "Dotação existe e pertence à base", "FALHA", "Dotação não encontrada.");
    } else {
      const pertence =
        d.instrumentoId === ctx.emenda.instrumentoBaseId &&
        d.exercicioId === ctx.emenda.exercicioId;
      add(
        "DOTACAO_EXISTE",
        "Dotação existe e pertence à base",
        pertence ? "OK" : "FALHA",
        pertence
          ? "Dotação pertence ao instrumento base e exercício."
          : "Dotação pertence a outro instrumento/exercício."
      );
    }
  }

  // 4) PROGRAMA_NO_PPA
  // Exigência real e municipal: LOM art. 140 §1º, I ("as emendas serão admitidas
  // desde que sejam compatíveis com o Plano Plurianual"), repetida na LDO 2027
  // art. 23 §1º, I.
  //
  // O que NÃO é real é a premissa da implementação: `programasNoPPA` é derivado
  // das DOTAÇÕES ligadas ao instrumento PPA — e PPA não tem dotação. Ele tem
  // programas, ações e metas plurianuais; dotação é peça da LOA. Enquanto os
  // programas do PPA não forem carregados, o conjunto chega vazio.
  //
  // Vazio não é "nenhum programa consta": é "não dá para conferir". Reprovar
  // todas as emendas por isso não confere nada — só produz um falso negativo
  // uniforme, que foi exatamente o que aconteceu quando a base de Mogi Guaçu
  // passou a criar o instrumento PPA sem dados (commit 173eb53).
  {
    if (!d) {
      add("PROGRAMA_NO_PPA", "Programa consta no PPA", "FALHA", "Sem dotação.");
    } else if (!ctx.ppaCadastrado) {
      add("PROGRAMA_NO_PPA", "Programa consta no PPA", "ALERTA", "PPA do exercício não cadastrado.");
    } else if (ctx.programasNoPPA.size === 0) {
      add(
        "PROGRAMA_NO_PPA",
        "Programa consta no PPA",
        "ALERTA",
        "PPA cadastrado, mas sem programas carregados — a compatibilidade com o PPA não pôde ser conferida."
      );
    } else {
      const ok = ctx.programasNoPPA.has(d.programaId);
      add(
        "PROGRAMA_NO_PPA",
        "Programa consta no PPA",
        ok ? "OK" : "FALHA",
        ok ? "Programa presente no PPA." : "Programa não consta no PPA do exercício."
      );
    }
  }

  // 5) ACAO_VINCULADA (ação pertence ao programa da dotação)
  {
    if (!d) {
      add("ACAO_VINCULADA", "Ação pertence ao programa", "FALHA", "Sem dotação.");
    } else {
      const ok = d.acaoProgramaId === d.programaId;
      add(
        "ACAO_VINCULADA",
        "Ação pertence ao programa",
        ok ? "OK" : "FALHA",
        ok ? "Ação vinculada ao programa da dotação." : "Ação de programa diferente da dotação."
      );
    }
  }

  // 6) CLASSIFICACAO_COMPLETA (todos os componentes por FK)
  {
    if (!d) {
      add("CLASSIFICACAO_COMPLETA", "Classificação completa", "FALHA", "Sem dotação.");
    } else {
      const faltando = (
        [
          ["órgão", d.orgaoId],
          ["unidade", d.unidadeOrcamentariaId],
          ["função", d.funcaoId],
          ["subfunção", d.subfuncaoId],
          ["programa", d.programaId],
          ["ação", d.acaoId],
          ["natureza", d.naturezaDespesaId],
          ["fonte", d.fonteRecursoId],
        ] as const
      )
        .filter(([, v]) => !v)
        .map(([nome]) => nome);
      const ok = faltando.length === 0;
      add(
        "CLASSIFICACAO_COMPLETA",
        "Classificação completa",
        ok ? "OK" : "FALHA",
        ok ? "Todos os componentes presentes." : `Faltando: ${faltando.join(", ")}.`
      );
    }
  }

  // 7) ADERENCIA_LDO (modo configurável)
  {
    if (!d) {
      add("ADERENCIA_LDO", "Aderência à LDO", "ALERTA", "Sem dotação.");
    } else {
      const consta =
        ctx.prioridadesPrograma.has(d.programaId) ||
        ctx.prioridadesAcao.has(d.acaoId);
      if (consta) {
        add("ADERENCIA_LDO", "Aderência à LDO", "OK", "Programa/ação consta nas prioridades da LDO.");
      } else {
        const modo = ctx.modoAderenciaLDO ?? "ALERTA";
        add(
          "ADERENCIA_LDO",
          "Aderência à LDO",
          modo === "BLOQUEANTE" ? "FALHA" : "ALERTA",
          "Programa/ação não consta nas prioridades da LDO."
        );
      }
    }
  }

  // 8) LIMITE_VALOR_AUTOR
  {
    if (ctx.tetoValorAutor == null) {
      add("LIMITE_VALOR_AUTOR", "Teto de valor por autor", "OK", "Sem teto configurado.");
    } else {
      const soma = ctx.somaAutorExistente + ctx.emenda.valor;
      const ok = soma <= ctx.tetoValorAutor;
      add(
        "LIMITE_VALOR_AUTOR",
        "Teto de valor por autor",
        ok ? "OK" : "FALHA",
        `Acumulado ${brl(soma)} — teto ${brl(ctx.tetoValorAutor)}.`
      );
    }
  }

  // 9) TIPO_COERENTE
  {
    if (ctx.emenda.tipo === "REMANEJAMENTO") {
      const o = ctx.dotacaoOrigem;
      const dest = ctx.dotacaoDestino;
      const ok = !!o && !!dest && o.id !== dest.id;
      add(
        "TIPO_COERENTE",
        "Coerência do tipo (remanejamento)",
        ok ? "OK" : "FALHA",
        ok
          ? "Origem e destino válidos e distintos."
          : "Remanejamento exige origem e destino válidos e distintos."
      );
    } else if (ctx.emenda.tipo === "ANULACAO") {
      const ok = !!d && ctx.emenda.valor <= d.valorAtual;
      add(
        "TIPO_COERENTE",
        "Coerência do tipo (anulação)",
        ok ? "OK" : "FALHA",
        ok
          ? "Valor dentro do saldo da dotação."
          : "Anulação não pode exceder o valor atual da dotação."
      );
    } else {
      add("TIPO_COERENTE", "Coerência do tipo", "OK", "Tipo sem exigências adicionais.");
    }
  }

  // 10) RESERVA_SAUDE (limite das demais áreas — modo configurável).
  // Emendas de saúde nunca falham aqui; as demais consomem o limite
  // (cota − reserva) do autor.
  {
    if (ctx.reservaSaudePct == null || ctx.tetoValorAutor == null) {
      add(
        "RESERVA_SAUDE",
        "Reserva da saúde (limite das demais áreas)",
        "OK",
        "Sem reserva de saúde configurada."
      );
    } else if (ctx.emendaEhSaude) {
      add(
        "RESERVA_SAUDE",
        "Reserva da saúde (limite das demais áreas)",
        "OK",
        "Emenda destinada à saúde — não consome o limite das demais áreas."
      );
    } else {
      const limiteDemais =
        ctx.tetoValorAutor * (1 - ctx.reservaSaudePct / 100);
      const soma = ctx.somaAutorDemaisExistente + ctx.emenda.valor;
      const ok = soma <= limiteDemais + 0.005;
      const modo = ctx.modoReservaSaude ?? "ALERTA";
      add(
        "RESERVA_SAUDE",
        "Reserva da saúde (limite das demais áreas)",
        ok ? "OK" : modo === "BLOQUEANTE" ? "FALHA" : "ALERTA",
        ok
          ? `Demais áreas acumulam ${brl(soma)} — dentro do limite de ${brl(limiteDemais)}.`
          : `Demais áreas acumulam ${brl(soma)} — acima do limite de ${brl(limiteDemais)} (${ctx.reservaSaudePct}% da cota são reservados à saúde).`
      );
    }
  }

  // 11) SAUDE_NAO_PESSOAL — art. 140, § 7º, da Lei Orgânica de Mogi Guaçu:
  // a execução do montante destinado a ações e serviços públicos de saúde é
  // "vedada a destinação para pagamento de pessoal ou encargos sociais".
  // É proibição legal, não parâmetro de política: sempre bloqueia.
  {
    if (!ctx.emendaEhSaude) {
      add(
        "SAUDE_NAO_PESSOAL",
        "Saúde não custeia pessoal (LOM art. 140 §7º)",
        "OK",
        "Emenda fora da parcela da saúde — a vedação não se aplica."
      );
    } else if (!d) {
      add(
        "SAUDE_NAO_PESSOAL",
        "Saúde não custeia pessoal (LOM art. 140 §7º)",
        "FALHA",
        "Sem dotação."
      );
    } else {
      const ehPessoal = d.naturezaGrupo.trim() === "1";
      add(
        "SAUDE_NAO_PESSOAL",
        "Saúde não custeia pessoal (LOM art. 140 §7º)",
        ehPessoal ? "FALHA" : "OK",
        ehPessoal
          ? "A dotação é do grupo 1 (Pessoal e Encargos Sociais). O art. 140, § 7º, da Lei Orgânica veda destinar a parcela da saúde a pessoal ou encargos sociais."
          : "Dotação de saúde fora do grupo de pessoal e encargos."
      );
    }
  }

  // 12) PLANO_TRABALHO
  // O plano é requisito da REMESSA, não do rascunho. O que ele pede depende da
  // categoria do beneficiário: terceiro setor leva justificativa, objetivo,
  // declaração e planilha; administração direta e indireta, só a justificativa.
  {
    if (!ctx.beneficiarioCategoria) {
      add(
        "PLANO_TRABALHO",
        "Plano de trabalho",
        "ALERTA",
        "Beneficiário final não informado — sem ele não dá para saber o que o plano de trabalho precisa conter."
      );
    } else if (ctx.pendenciasPlanoTrabalho.length > 0) {
      add(
        "PLANO_TRABALHO",
        "Plano de trabalho",
        "FALHA",
        `Falta ${ctx.pendenciasPlanoTrabalho.join("; ")}.`
      );
    } else {
      add(
        "PLANO_TRABALHO",
        "Plano de trabalho",
        "OK",
        "Plano de trabalho preenchido conforme a categoria do beneficiário."
      );
    }
  }

  const resultado = itens.some((i) => i.status === "FALHA") ? "INVALIDA" : "VALIDA";
  return { resultado, itens };
}
