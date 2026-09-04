// ---------------------------------------------------------------------------
// Ponte entre o PlanoTrabalho do banco e o `DadosPlano` das regras puras.
//
// Existe para que a conversão seja UMA só: o motor, as actions e a tela leem o
// plano do mesmo jeito. Sem isto, cada ponto faria seu próprio `Number(...)` em
// cima de Decimal e os três acabariam discordando em algum arredondamento.
// ---------------------------------------------------------------------------

import {
  DECLARACOES,
  type DadosPlano,
  type DeclaracaoChave,
} from "./plano-trabalho";

/** O formato mínimo que a conversão precisa — compatível com o que o Prisma devolve. */
export type PlanoDb = {
  entidadeRazaoSocial: string | null;
  entidadeCnpj: string | null;
  entidadeAnos: number | null;
  orgaoRepassador: string | null;
  assinanteNome: string | null;
  assinanteCpf: string | null;
  assinanteCargo: string | null;
  assinanteEmail: string | null;
  metas: {
    beneficiarios: string;
    unidade: string;
    metaFisica: unknown;
    comprovacao: string;
  }[];
  itens: {
    beneficiarios: string;
    metaFisica: unknown;
    valorUnitario: unknown;
    origemPreco: string;
  }[];
  parcelas: { valor: unknown }[];
} & Record<DeclaracaoChave, boolean>;

// Decimal do Prisma não é number: `Number(d)` funciona porque Decimal tem
// toString, mas passar por String() antes deixa explícito que a conversão é
// deliberada e não um acidente de coerção.
const dec = (v: unknown): number => {
  const n = Number(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

export function planoDoBanco(plano: PlanoDb | null): DadosPlano | null {
  if (!plano) return null;
  return {
    metas: plano.metas.map((m) => ({
      beneficiarios: m.beneficiarios,
      unidade: m.unidade,
      metaFisica: dec(m.metaFisica),
      comprovacao: m.comprovacao,
    })),
    itens: plano.itens.map((i) => ({
      beneficiarios: i.beneficiarios,
      metaFisica: dec(i.metaFisica),
      valorUnitario: dec(i.valorUnitario),
      origemPreco: i.origemPreco,
    })),
    parcelas: plano.parcelas.map((p) => ({ valor: dec(p.valor) })),
    entidadeRazaoSocial: plano.entidadeRazaoSocial ?? "",
    entidadeCnpj: plano.entidadeCnpj ?? "",
    entidadeAnos: plano.entidadeAnos,
    orgaoRepassador: plano.orgaoRepassador ?? "",
    declaracoes: Object.fromEntries(
      DECLARACOES.map((d) => [d, plano[d]])
    ) as Record<DeclaracaoChave, boolean>,
    // A assinatura só existe quando há nome E CPF: meia identificação não
    // identifica ninguém, e tratá-la como assinatura válida seria pior do que
    // não ter nenhuma.
    assinatura:
      plano.assinanteNome && plano.assinanteCpf
        ? {
            nome: plano.assinanteNome,
            cpf: plano.assinanteCpf,
            cargo: plano.assinanteCargo ?? "",
            email: plano.assinanteEmail ?? "",
          }
        : null,
  };
}
