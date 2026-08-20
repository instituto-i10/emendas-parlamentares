"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioValidacao } from "./relatorio-validacao";
import {
  AJUDA_TIPO_BENEFICIARIO,
  ROTULO_TIPO_BENEFICIARIO,
  ROTULO_TIPO_EMENDA,
  ROTULO_TIPO_INSTRUMENTO,
  opcoes,
} from "@/lib/rotulos";
import {
  fetchAcoes,
  fetchDotacoes,
  fetchOrgaos,
  fetchProgramas,
  fetchTodasDotacoes,
  fetchUnidades,
} from "@/lib/actions/cascata";
import {
  atualizarEmenda,
  criarRascunhoEmenda,
  submeterEmenda,
  validarEmendaAction,
} from "@/lib/actions/emendas";
import type { DotacaoOpcao } from "@/lib/queries-orcamento";
import type { ResultadoMotor } from "@/lib/validation/motor";

type Opt = { id: string; codigo: string; nome: string };
type Base = { id: string; numero: string; tipo: string; ano: number };

const controle =
  "flex h-9 w-full rounded-[10px] border border-input bg-card px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

// Deriva um id estável do rótulo, para associar <label> e <select>. Sem isso o
// campo não é anunciado por leitor de tela nem alcançável por `getByLabel`.
const idDoRotulo = (label: string) =>
  "campo-" +
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// A dotação é a linha do orçamento onde o dinheiro entra. O vereador não a
// reconhece pelo código — apontamento do jurídico do cliente —, então o cartão
// abre a classificação inteira por extenso e fecha com uma frase em linguagem
// corrente.
function CartaoDotacao({ d }: { d: DotacaoOpcao }) {
  const linhas: [string, string][] = [
    ["Órgão", `${d.orgaoCodigo} — ${d.orgaoNome}`],
    ["Unidade orçamentária", `${d.unidadeCodigo} — ${d.unidadeNome}`],
    ["Função / Subfunção", `${d.funcaoCodigo} ${d.funcaoNome} · ${d.subfuncaoCodigo} ${d.subfuncaoNome}`],
    ["Programa", `${d.programaCodigo} — ${d.programaNome}`],
    ["Ação", `${d.acaoCodigo} — ${d.acaoNome}`],
    ["Despesa", `${d.naturezaCodigo} — ${d.naturezaNome}`],
    ["Fonte de recurso", `${d.fonteCodigo} — ${d.fonteNome}`],
    [
      "Saldo disponível",
      d.valorAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ],
  ];
  return (
    <div className="rounded-xl border bg-secondary/40 p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        O que é esta dotação
      </div>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,150px)_1fr]">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-[12px] font-semibold text-muted-foreground">
              {rotulo}
            </dt>
            <dd className="text-[13px] font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Em outras palavras: recurso da <b>{d.unidadeNome}</b> para{" "}
        <b>{d.naturezaNome.toLowerCase()}</b> na ação <b>{d.acaoNome}</b>.
      </p>
      {d.naturezaGrupo.trim() === "1" && d.funcaoCodigo === "10" ? (
        <p className="mt-2.5 rounded-lg bg-destructive/10 px-3 py-2 text-[12.5px] font-medium text-destructive">
          Esta é uma dotação de pessoal e encargos na função Saúde. O art. 140,
          § 7º, da Lei Orgânica veda destinar a parcela da saúde a pessoal ou
          encargos sociais — a pré-checagem vai apontar isso.
        </p>
      ) : null}
    </div>
  );
}

function Selecao({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder = "Selecione…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = idDoRotulo(label);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={`${controle} campo-select pl-3 pr-9`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.codigo} — {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NovaEmendaForm({
  base,
  beneficiarios = [],
}: {
  base: Base;
  beneficiarios?: { id: string; nome: string; tipo: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Cascata
  const [orgaos, setOrgaos] = useState<Opt[]>([]);
  const [unidades, setUnidades] = useState<Opt[]>([]);
  const [programas, setProgramas] = useState<Opt[]>([]);
  const [acoes, setAcoes] = useState<Opt[]>([]);
  const [dotacoes, setDotacoes] = useState<DotacaoOpcao[]>([]);

  const [orgaoId, setOrgaoId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [programaId, setProgramaId] = useState("");
  const [acaoId, setAcaoId] = useState("");
  const [dotacaoId, setDotacaoId] = useState("");

  // Campos livres
  const [tipo, setTipo] = useState("ACRESCIMO");
  const [objeto, setObjeto] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [valor, setValor] = useState("");
  // Beneficiário final (rastreabilidade — STF/TCE). Cadastro em /config.
  const [beneficiarioId, setBeneficiarioId] = useState("");

  // Remanejamento
  const [todasDotacoes, setTodasDotacoes] = useState<DotacaoOpcao[]>([]);
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");

  const [emendaId, setEmendaId] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<ResultadoMotor | null>(null);

  useEffect(() => {
    fetchOrgaos(base.id).then(setOrgaos);
  }, [base.id]);

  useEffect(() => {
    if (tipo === "REMANEJAMENTO" && todasDotacoes.length === 0) {
      fetchTodasDotacoes(base.id).then(setTodasDotacoes);
    }
  }, [tipo, base.id, todasDotacoes.length]);

  // Qualquer mudança invalida o relatório anterior (força revalidar).
  const sujar = () => setRelatorio(null);

  function trocaOrgao(v: string) {
    setOrgaoId(v);
    setUnidadeId(""); setProgramaId(""); setAcaoId(""); setDotacaoId("");
    setUnidades([]); setProgramas([]); setAcoes([]); setDotacoes([]);
    sujar();
    if (v) fetchUnidades(base.id, v).then(setUnidades);
  }
  function trocaUnidade(v: string) {
    setUnidadeId(v);
    setProgramaId(""); setAcaoId(""); setDotacaoId("");
    setProgramas([]); setAcoes([]); setDotacoes([]);
    sujar();
    if (v) fetchProgramas(base.id, orgaoId, v).then(setProgramas);
  }
  function trocaPrograma(v: string) {
    setProgramaId(v);
    setAcaoId(""); setDotacaoId("");
    setAcoes([]); setDotacoes([]);
    sujar();
    if (v) fetchAcoes(base.id, v, orgaoId, unidadeId).then(setAcoes);
  }
  function trocaAcao(v: string) {
    setAcaoId(v);
    setDotacaoId("");
    setDotacoes([]);
    sujar();
    if (v)
      fetchDotacoes({ instrumentoId: base.id, orgaoId, unidadeId, programaId, acaoId: v }).then(
        setDotacoes
      );
  }

  const dotacaoSel = dotacoes.find((d) => d.id === dotacaoId);
  const benefSel = beneficiarios.find((b) => b.id === beneficiarioId);
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Rascunho salva com o que houver: só a dotação é exigida, porque é ela que
  // ancora a emenda a uma linha do orçamento (e vem da cascata, não é digitada).
  // Objeto, justificativa e valor são cobrados pela pré-checagem antes da
  // remessa — não na hora de guardar o trabalho.
  const podeSalvar =
    !!dotacaoId &&
    (tipo !== "REMANEJAMENTO" || (origemId && destinoId && origemId !== destinoId));

  const faltando = [
    !objeto.trim() && "objeto",
    !justificativa.trim() && "justificativa",
    !valor.trim() && "valor",
  ].filter((x): x is string => !!x);

  function montarInput() {
    return {
      instrumentoBaseId: base.id,
      dotacaoId,
      tipo,
      objeto,
      justificativa,
      valor,
      beneficiarioId,
      dotacaoOrigemId: tipo === "REMANEJAMENTO" ? origemId : "",
      dotacaoDestinoId: tipo === "REMANEJAMENTO" ? destinoId : "",
    };
  }

  function salvar() {
    start(async () => {
      const input = montarInput();
      const res = emendaId
        ? await atualizarEmenda(emendaId, input)
        : await criarRascunhoEmenda(input);
      if (res.ok) {
        if (res.id) setEmendaId(res.id);
        setRelatorio(null);
        toast.success("Rascunho salvo.");
      } else {
        toast.error(res.error);
      }
    });
  }

  function validar() {
    if (!emendaId) {
      toast.error("Salve o rascunho antes de validar.");
      return;
    }
    start(async () => {
      const res = await validarEmendaAction(emendaId);
      if (res.ok && res.resultado) {
        setRelatorio(res.resultado);
        toast[res.resultado.resultado === "VALIDA" ? "success" : "warning"](
          res.resultado.resultado === "VALIDA"
            ? "Pré-checagem sem pendências."
            : "Pré-checagem apontou pendências — veja o relatório."
        );
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function submeter() {
    if (!emendaId) return;
    start(async () => {
      const res = await submeterEmenda(emendaId);
      if (res.ok) {
        toast.success("Emenda submetida.");
        router.push("/legislativo/emendas/minhas");
      } else {
        if (res.resultado) setRelatorio(res.resultado);
        toast.error(res.error);
      }
    });
  }

  const podeSubmeter = !!emendaId && relatorio?.resultado === "VALIDA";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Contexto travado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">Exercício {base.ano}</Badge>
            <Badge variant="outline">
              Base: {ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} {base.numero}
            </Badge>
          </CardContent>
        </Card>

        {/* Cascata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classificação da dotação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Selecao label="Órgão" value={orgaoId} onChange={trocaOrgao} options={orgaos} />
            <Selecao label="Unidade orçamentária" value={unidadeId} onChange={trocaUnidade} options={unidades} disabled={!orgaoId} />
            <Selecao label="Programa" value={programaId} onChange={trocaPrograma} options={programas} disabled={!unidadeId} />
            <Selecao label="Ação" value={acaoId} onChange={trocaAcao} options={acoes} disabled={!programaId} />
            <div className="sm:col-span-2">
              <Selecao
                label="Dotação"
                value={dotacaoId}
                onChange={(v) => { setDotacaoId(v); sujar(); }}
                options={dotacoes.map((d) => ({
                  id: d.id,
                  codigo: d.naturezaCodigo,
                  nome: `${d.naturezaNome} · fonte ${d.fonteNome} · saldo ${brl(d.valorAtual)}`,
                }))}
                disabled={!acaoId}
              />
            </div>
            {/* A classificação por extenso substitui os antigos campos de
                leitura de natureza e fonte, que repetiam o código. */}
            {dotacaoSel ? (
              <div className="sm:col-span-2">
                <CartaoDotacao d={dotacaoSel} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Campos livres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emenda</CardTitle>
          </CardHeader>
          {/* Duas colunas a partir de sm: tipo, valor e beneficiário são
              campos curtos e empilhá-los deixava o formulário alto à toa.
              Objeto e justificativa ficam em largura cheia — são textos. */}
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" className={`${controle} campo-select pl-3 pr-9`} value={tipo} onChange={(e) => { setTipo(e.target.value); sujar(); }}>
                {opcoes(ROTULO_TIPO_EMENDA).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {tipo === "REMANEJAMENTO" ? (
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Selecao
                  label="Dotação de origem"
                  value={origemId}
                  onChange={(v) => { setOrigemId(v); sujar(); }}
                  options={todasDotacoes.map((d) => ({ id: d.id, codigo: d.naturezaCodigo, nome: `Fonte ${d.fonteCodigo} · ${brl(d.valorAtual)}` }))}
                />
                <Selecao
                  label="Dotação de destino"
                  value={destinoId}
                  onChange={(v) => { setDestinoId(v); sujar(); }}
                  options={todasDotacoes.map((d) => ({ id: d.id, codigo: d.naturezaCodigo, nome: `Fonte ${d.fonteCodigo} · ${brl(d.valorAtual)}` }))}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor</Label>
              <Input id="valor" inputMode="decimal" placeholder="150000,00" value={valor} onChange={(e) => { setValor(e.target.value); sujar(); }} />
            </div>
            {/* Agrupado por categoria porque a categoria decide o rito: quem
                for do terceiro setor leva plano de trabalho completo; a
                administração pública, só a justificativa. */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="beneficiario">Beneficiário final</Label>
              <select
                id="beneficiario"
                className={`${controle} campo-select pl-3 pr-9`}
                value={beneficiarioId}
                onChange={(e) => { setBeneficiarioId(e.target.value); sujar(); }}
              >
                <option value="">— (cadastre em Configurações → Beneficiários)</option>
                {(["ADMINISTRACAO_DIRETA", "ADMINISTRACAO_INDIRETA", "TERCEIRO_SETOR"] as const)
                  .map((cat) => {
                    const doGrupo = beneficiarios.filter((b) => b.tipo === cat);
                    if (doGrupo.length === 0) return null;
                    return (
                      <optgroup key={cat} label={ROTULO_TIPO_BENEFICIARIO[cat]}>
                        {doGrupo.map((b) => (
                          <option key={b.id} value={b.id}>{b.nome}</option>
                        ))}
                      </optgroup>
                    );
                  })}
              </select>
              {benefSel ? (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {AJUDA_TIPO_BENEFICIARIO[benefSel.tipo]}{" "}
                  {benefSel.tipo === "TERCEIRO_SETOR"
                    ? "O plano de trabalho vai pedir justificativa, objetivo, declaração e planilha orçamentária."
                    : "O plano de trabalho vai pedir apenas a justificativa."}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="objeto">Objeto</Label>
              <textarea id="objeto" className={`${controle} min-h-20 py-2`} value={objeto} onChange={(e) => { setObjeto(e.target.value); sujar(); }} placeholder="Descrição narrativa do objeto da emenda" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="justificativa">Justificativa</Label>
              <textarea id="justificativa" className={`${controle} min-h-20 py-2`} value={justificativa} onChange={(e) => { setJustificativa(e.target.value); sujar(); }} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={salvar} disabled={pending || !podeSalvar}>
            {emendaId ? "Salvar alterações" : "Salvar rascunho"}
          </Button>
          <Button variant="outline" onClick={validar} disabled={pending || !emendaId}>
            Validar
          </Button>
          <Button variant="secondary" onClick={submeter} disabled={pending || !podeSubmeter} title={!podeSubmeter ? "Faça a pré-checagem e resolva as pendências antes de remeter" : undefined}>
            Submeter
          </Button>
          {emendaId ? (
            <Link
              href={`/legislativo/emendas/${emendaId}/plano-trabalho`}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-secondary px-3 py-2 text-[12.5px] font-semibold transition-colors hover:bg-accent"
            >
              <ClipboardList className="size-4" aria-hidden />
              Plano de trabalho
            </Link>
          ) : null}
          {faltando.length > 0 ? (
            <span className="text-[12px] font-medium text-muted-foreground">
              Rascunho salva assim mesmo. Falta preencher {faltando.join(", ")}{" "}
              para poder remeter.
            </span>
          ) : null}
        </div>
      </div>

      {/* Coluna do relatório.
          `sticky` com `top` abaixo da topbar (h-16 = 64px) e altura máxima
          própria: o formulário é alto, e sem isso o relatório sumia da tela
          justamente quando a pessoa desce para corrigir o que ele apontou.
          `self-start` é obrigatório — em grid o item estica por padrão, e um
          item esticado nunca gruda. */}
      <div className="lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-104px)] lg:self-start lg:overflow-y-auto">
        {relatorio ? (
          <RelatorioValidacao relatorio={relatorio} />
        ) : (
          <div className="rounded-xl bg-secondary p-6 text-center text-[12.5px] font-medium leading-relaxed text-muted-foreground">
            Salve o rascunho quando quiser — mesmo incompleto — e clique em{" "}
            <b>Validar</b> para a pré-checagem das condições de validade. A
            remessa só é liberada quando nenhuma pendência resta.
          </div>
        )}
      </div>
    </div>
  );
}
