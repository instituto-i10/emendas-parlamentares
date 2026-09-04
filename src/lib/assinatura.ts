// ---------------------------------------------------------------------------
// Assinatura eletrônica SIMPLES — Lei 14.063/2020, art. 4º, I.
//
// A lei pede duas coisas, e só duas: identificar o signatário e associar a
// assinatura ao documento. A identificação são os campos que a entidade
// preenche (nome, CPF, cargo, e-mail). A associação é o HASH desta função.
//
// O hash é o que separa assinatura de teatro. Sem ele, "a entidade assinou" não
// diz o quê: bastaria editar a memória de cálculo depois e a assinatura
// continuaria lá, aparentemente válida. Com ele, qualquer alteração no plano
// muda o resumo e a assinatura deixa de conferir — que é exatamente o
// comportamento que se espera de uma assinatura.
//
// Não confundir com assinatura AVANÇADA (gov.br) nem QUALIFICADA (ICP-Brasil),
// que exigem certificado. A simples é admitida nas interações de menor impacto
// com ente público (art. 5º, § 1º); se o jurídico do cliente entender que a
// apresentação da emenda exige mais, o caminho é o gov.br, e este módulo passa
// a conviver com ele em vez de ser substituído.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import type { DadosPlano } from "./plano-trabalho";
import { DECLARACOES } from "./plano-trabalho";

/** Trilha de auditoria: o que o servidor sabe, não o que o navegador informa. */
export type TrilhaAssinatura = {
  ip: string | null;
  agente: string | null;
  /** Sempre do servidor. Hora de navegador é hora que o usuário escolheu. */
  em: Date;
  /** O token do link pelo qual se chegou até o formulário. */
  token: string;
};

// Números viram string com casas fixas: 1, "1", 1.0 e 1.00 são o mesmo valor, e
// se qualquer um deles produzisse um hash diferente a assinatura cairia sozinha
// na primeira releitura do banco.
const n4 = (v: number) => v.toFixed(4);
const n2 = (v: number) => v.toFixed(2);
const txt = (v: string) => v.trim();

/**
 * Forma canônica do que está sendo assinado.
 *
 * Só entra aqui o que a entidade preencheu e pelo que ela responde. O valor da
 * emenda entra junto porque assinar uma memória de cálculo sem dizer com que
 * valor ela fechava tornaria a conferência posterior impossível.
 */
function conteudoCanonico(plano: DadosPlano, valorEmenda: number) {
  return {
    v: 1, // versão do formato — se ele mudar, hashes antigos continuam legíveis
    valorEmenda: n2(valorEmenda),
    entidade: {
      razaoSocial: txt(plano.entidadeRazaoSocial),
      cnpj: plano.entidadeCnpj.replace(/\D/g, ""),
      anos: plano.entidadeAnos,
      orgaoRepassador: txt(plano.orgaoRepassador),
    },
    metas: plano.metas
      .filter((m) => m.beneficiarios.trim())
      .map((m) => ({
        beneficiarios: txt(m.beneficiarios),
        unidade: txt(m.unidade),
        metaFisica: n4(m.metaFisica),
        comprovacao: txt(m.comprovacao),
      })),
    memoria: plano.itens
      .filter((i) => i.beneficiarios.trim())
      .map((i) => ({
        beneficiarios: txt(i.beneficiarios),
        metaFisica: n4(i.metaFisica),
        valorUnitario: n2(i.valorUnitario),
        origemPreco: txt(i.origemPreco),
      })),
    cronograma: plano.parcelas.filter((p) => p.valor > 0).map((p) => n2(p.valor)),
    // Ordem fixa, vinda da constante: iterar o objeto deixaria o hash à mercê
    // da ordem de inserção das chaves.
    declaracoes: DECLARACOES.map((d) => (plano.declaracoes[d] ? 1 : 0)),
  };
}

/** SHA-256, em hexadecimal, do conteúdo canônico do plano. */
export function hashDoPlano(plano: DadosPlano, valorEmenda: number): string {
  return createHash("sha256")
    .update(JSON.stringify(conteudoCanonico(plano, valorEmenda)))
    .digest("hex");
}

/**
 * A assinatura gravada ainda corresponde ao que está no plano?
 *
 * `false` significa que o plano foi editado depois de assinado — não que
 * alguém agiu de má-fé. A tela deve dizer isso e pedir nova assinatura, não
 * acusar ninguém.
 */
export function assinaturaConfere(
  hashGravado: string | null,
  plano: DadosPlano,
  valorEmenda: number
): boolean {
  return !!hashGravado && hashGravado === hashDoPlano(plano, valorEmenda);
}

/** Só os 4 primeiros e os 2 últimos dígitos, como se faz em comprovante. */
export function cpfMascarado(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Dígito verificador do CPF. Impede o "111.111.111-11" digitado com pressa. */
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
