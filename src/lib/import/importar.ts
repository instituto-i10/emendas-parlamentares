import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { planilhaParaLinhas } from "./parse";
import { validarDotacoes, validarPrioridades } from "./validar";
import { derivarComponentes, chaveAcao, chaveSubfuncao, chaveUnidade } from "./derivar";
import { checarIntegridade } from "./integridade";
import type { ErroLinha } from "./tipos";
import { TipoAcao } from "@/generated/prisma/enums";
import { nomeNatureza } from "@/lib/naturezas-nomes";

export type ResultadoImportacao = {
  ok: boolean;
  erros: ErroLinha[];
  resumo: {
    orgaos: number;
    unidades: number;
    funcoes: number;
    subfuncoes: number;
    programas: number;
    acoes: number;
    naturezas: number;
    fontes: number;
    dotacoes: number;
    prioridades: number;
  };
};

const zero = {
  orgaos: 0, unidades: 0, funcoes: 0, subfuncoes: 0, programas: 0,
  acoes: 0, naturezas: 0, fontes: 0, dotacoes: 0, prioridades: 0,
};

// Importa a base estruturada de um arquivo (CSV/XLSX) para um instrumento.
// Faz upsert idempotente e vincula as dotações ao instrumento + exercício.
export async function importarBaseDeArquivo(
  instrumentoId: string,
  dados: Buffer | Uint8Array
): Promise<ResultadoImportacao> {
  const instrumento = await prisma.instrumentoPlanejamento.findUnique({
    where: { id: instrumentoId },
    select: { id: true, exercicioId: true },
  });
  if (!instrumento) {
    return { ok: false, erros: [{ linha: 0, motivo: "Instrumento não encontrado." }], resumo: { ...zero } };
  }

  const { dotacoes: linhasDot, prioridades: linhasPri } = planilhaParaLinhas(dados);
  const dot = validarDotacoes(linhasDot);
  const pri = validarPrioridades(linhasPri);
  const erros = [...dot.erros, ...pri.erros];

  const componentes = derivarComponentes(dot.validas);
  erros.push(...checarIntegridade(dot.validas, componentes));

  // Qualquer erro rejeita a importação inteira (transação não é aberta).
  if (erros.length > 0 || dot.validas.length === 0) {
    if (dot.validas.length === 0 && erros.length === 0) {
      erros.push({ linha: 0, motivo: "Nenhuma linha de dotação válida encontrada." });
    }
    return { ok: false, erros, resumo: { ...zero } };
  }

  const exercicioId = instrumento.exercicioId;
  const resumo = { ...zero };

  await prisma.$transaction(
    async (tx) => {
      const orgaoId = new Map<string, string>();
      for (const o of componentes.orgaos.values()) {
        const r = await tx.orgao.upsert({
          where: { exercicioId_codigo: { exercicioId, codigo: o.codigo } },
          create: { codigo: o.codigo, nome: o.nome, exercicioId },
          update: { nome: o.nome },
        });
        orgaoId.set(o.codigo, r.id);
        resumo.orgaos++;
      }

      const funcaoId = new Map<string, string>();
      for (const f of componentes.funcoes.values()) {
        const r = await tx.funcao.upsert({
          where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
          create: { codigo: f.codigo, nome: f.nome, exercicioId },
          update: { nome: f.nome },
        });
        funcaoId.set(f.codigo, r.id);
        resumo.funcoes++;
      }

      const programaId = new Map<string, string>();
      for (const p of componentes.programas.values()) {
        const r = await tx.programa.upsert({
          where: { exercicioId_codigo: { exercicioId, codigo: p.codigo } },
          create: { codigo: p.codigo, nome: p.nome, exercicioId },
          update: { nome: p.nome },
        });
        programaId.set(p.codigo, r.id);
        resumo.programas++;
      }

      const naturezaId = new Map<string, string>();
      for (const n of componentes.naturezas.values()) {
        const r = await tx.naturezaDespesa.upsert({
          where: { exercicioId_codigo: { exercicioId, codigo: n.codigo } },
          create: {
            codigo: n.codigo,
            categoriaEconomica: n.categoriaEconomica,
            grupo: n.grupo,
            modalidadeAplicacao: n.modalidadeAplicacao,
            elemento: n.elemento,
            // O projeto de lei só traz o código; o nome vem da tabela da
            // Portaria 163/2001, para o vereador não escolher às cegas.
            nome: nomeNatureza(n.codigo),
            exercicioId,
          },
          update: {
            categoriaEconomica: n.categoriaEconomica,
            grupo: n.grupo,
            modalidadeAplicacao: n.modalidadeAplicacao,
            elemento: n.elemento,
            nome: nomeNatureza(n.codigo),
          },
        });
        naturezaId.set(n.codigo, r.id);
        resumo.naturezas++;
      }

      const fonteId = new Map<string, string>();
      for (const f of componentes.fontes.values()) {
        const r = await tx.fonteRecurso.upsert({
          where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
          create: { codigo: f.codigo, nome: f.nome, exercicioId },
          update: { nome: f.nome },
        });
        fonteId.set(f.codigo, r.id);
        resumo.fontes++;
      }

      const unidadeId = new Map<string, string>();
      for (const u of componentes.unidades.values()) {
        const oId = orgaoId.get(u.orgaoCodigo)!;
        const r = await tx.unidadeOrcamentaria.upsert({
          where: {
            exercicioId_orgaoId_codigo: { exercicioId, orgaoId: oId, codigo: u.codigo },
          },
          create: { codigo: u.codigo, nome: u.nome, orgaoId: oId, exercicioId },
          update: { nome: u.nome },
        });
        unidadeId.set(chaveUnidade(u.orgaoCodigo, u.codigo), r.id);
        resumo.unidades++;
      }

      const subfuncaoId = new Map<string, string>();
      for (const s of componentes.subfuncoes.values()) {
        const fId = funcaoId.get(s.funcaoCodigo)!;
        const r = await tx.subfuncao.upsert({
          where: {
            exercicioId_funcaoId_codigo: { exercicioId, funcaoId: fId, codigo: s.codigo },
          },
          create: { codigo: s.codigo, nome: s.nome, funcaoId: fId, exercicioId },
          update: { nome: s.nome },
        });
        subfuncaoId.set(chaveSubfuncao(s.funcaoCodigo, s.codigo), r.id);
        resumo.subfuncoes++;
      }

      const acaoId = new Map<string, string>();
      for (const a of componentes.acoes.values()) {
        const pId = programaId.get(a.programaCodigo)!;
        const r = await tx.acao.upsert({
          where: {
            exercicioId_programaId_codigo: { exercicioId, programaId: pId, codigo: a.codigo },
          },
          create: {
            codigo: a.codigo,
            nome: a.nome,
            tipo: a.tipo as TipoAcao,
            programaId: pId,
            exercicioId,
          },
          update: { nome: a.nome, tipo: a.tipo as TipoAcao },
        });
        acaoId.set(chaveAcao(a.programaCodigo, a.codigo), r.id);
        resumo.acoes++;
      }

      // Dotações — upsert pela classificação completa por instrumento.
      for (const d of dot.validas) {
        const oId = orgaoId.get(d.orgaoCodigo)!;
        const uId = unidadeId.get(chaveUnidade(d.orgaoCodigo, d.unidadeCodigo))!;
        const fId = funcaoId.get(d.funcaoCodigo)!;
        const sfId = subfuncaoId.get(chaveSubfuncao(d.funcaoCodigo, d.subfuncaoCodigo))!;
        const pId = programaId.get(d.programaCodigo)!;
        const aId = acaoId.get(chaveAcao(d.programaCodigo, d.acaoCodigo))!;
        const ndId = naturezaId.get(d.naturezaCodigo)!;
        const frId = fonteId.get(d.fonteCodigo)!;
        const valor = new Prisma.Decimal(d.valorInicial);

        await tx.dotacao.upsert({
          where: {
            instrumentoId_orgaoId_unidadeOrcamentariaId_funcaoId_subfuncaoId_programaId_acaoId_naturezaDespesaId_fonteRecursoId:
              {
                instrumentoId,
                orgaoId: oId,
                unidadeOrcamentariaId: uId,
                funcaoId: fId,
                subfuncaoId: sfId,
                programaId: pId,
                acaoId: aId,
                naturezaDespesaId: ndId,
                fonteRecursoId: frId,
              },
          },
          create: {
            instrumentoId,
            exercicioId,
            orgaoId: oId,
            unidadeOrcamentariaId: uId,
            funcaoId: fId,
            subfuncaoId: sfId,
            programaId: pId,
            acaoId: aId,
            naturezaDespesaId: ndId,
            fonteRecursoId: frId,
            valorInicial: valor,
            valorAtual: valor,
          },
          update: { valorInicial: valor, valorAtual: valor },
        });
        resumo.dotacoes++;
      }

      // Prioridades LDO — idempotente por exercício (recria).
      await tx.prioridadeLDO.deleteMany({ where: { exercicioId } });
      for (const p of pri.validas) {
        const pId = programaId.get(p.programaCodigo);
        if (!pId) continue; // programa da prioridade precisa existir na base
        const aId = p.acaoCodigo
          ? acaoId.get(chaveAcao(p.programaCodigo, p.acaoCodigo)) ?? null
          : null;
        await tx.prioridadeLDO.create({
          data: { descricao: p.descricao, programaId: pId, acaoId: aId, exercicioId },
        });
        resumo.prioridades++;
      }
    },
    { timeout: 30000 }
  );

  return { ok: true, erros: [], resumo };
}
