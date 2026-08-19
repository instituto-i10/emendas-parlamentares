"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioValidacao } from "./relatorio-validacao";
import { ROTULO_TIPO_EMENDA, ROTULO_TIPO_INSTRUMENTO, opcoes } from "@/lib/rotulos";
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
        className={controle}
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
  beneficiarios?: { id: string; nome: string }[];
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
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const podeSalvar =
    !!dotacaoId && objeto.trim() && justificativa.trim() && valor.trim() &&
    (tipo !== "REMANEJAMENTO" || (origemId && destinoId && origemId !== destinoId));

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
          res.resultado.resultado === "VALIDA" ? "Emenda válida." : "Emenda inválida — veja o relatório."
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
                options={dotacoes.map((d) => ({ id: d.id, codigo: d.naturezaCodigo, nome: `Fonte ${d.fonteCodigo} · saldo ${brl(d.valorAtual)}` }))}
                disabled={!acaoId}
              />
            </div>
            {/* Natureza e Fonte — SOMENTE LEITURA a partir da dotação */}
            <div className="space-y-1.5">
              <Label htmlFor="natureza-leitura">Natureza da despesa (leitura)</Label>
              <Input id="natureza-leitura" readOnly value={dotacaoSel ? `${dotacaoSel.naturezaCodigo} — ${dotacaoSel.naturezaNome}` : ""} placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fonte-leitura">Fonte de recurso (leitura)</Label>
              <Input id="fonte-leitura" readOnly value={dotacaoSel ? `${dotacaoSel.fonteCodigo} — ${dotacaoSel.fonteNome}` : ""} placeholder="—" />
            </div>
          </CardContent>
        </Card>

        {/* Campos livres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emenda</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" className={controle} value={tipo} onChange={(e) => { setTipo(e.target.value); sujar(); }}>
                {opcoes(ROTULO_TIPO_EMENDA).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {tipo === "REMANEJAMENTO" ? (
              <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="objeto">Objeto</Label>
              <textarea id="objeto" className={`${controle} min-h-20 py-2`} value={objeto} onChange={(e) => { setObjeto(e.target.value); sujar(); }} placeholder="Descrição narrativa do objeto da emenda" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="beneficiario">Beneficiário final</Label>
              <select
                id="beneficiario"
                className={controle}
                value={beneficiarioId}
                onChange={(e) => { setBeneficiarioId(e.target.value); sujar(); }}
              >
                <option value="">— (cadastre em Configurações → Beneficiários)</option>
                {beneficiarios.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="justificativa">Justificativa</Label>
              <textarea id="justificativa" className={`${controle} min-h-20 py-2`} value={justificativa} onChange={(e) => { setJustificativa(e.target.value); sujar(); }} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={salvar} disabled={pending || !podeSalvar}>
            {emendaId ? "Salvar alterações" : "Salvar rascunho"}
          </Button>
          <Button variant="outline" onClick={validar} disabled={pending || !emendaId}>
            Validar
          </Button>
          <Button variant="secondary" onClick={submeter} disabled={pending || !podeSubmeter} title={!podeSubmeter ? "Valide a emenda (VÁLIDA) antes de submeter" : undefined}>
            Submeter
          </Button>
        </div>
      </div>

      {/* Coluna do relatório */}
      <div>
        {relatorio ? (
          <RelatorioValidacao relatorio={relatorio} />
        ) : (
          <div className="rounded-xl bg-secondary p-6 text-center text-[12.5px] font-medium text-muted-foreground">
            Salve o rascunho e clique em <b>Validar</b> para ver o relatório de
            compatibilidade. A submissão só é liberada quando a emenda está{" "}
            <b>válida</b>.
          </div>
        )}
      </div>
    </div>
  );
}
