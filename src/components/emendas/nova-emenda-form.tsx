"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegendaObrigatorios, Obrigatorio } from "@/components/ui/obrigatorio";
import { CampoMoeda } from "@/components/ui/campo-moeda";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RelatorioValidacao } from "./relatorio-validacao";
import {
  CampoBeneficiario,
  type BeneficiarioOpcao,
} from "./campo-beneficiario";
import { PlanoTrabalhoCampos } from "@/components/plano-trabalho/campos";
import { LinkEntidade } from "@/components/plano-trabalho/link-entidade";
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
import { salvarPlanoTrabalho } from "@/lib/actions/plano-trabalho";
import {
  PLANO_VAZIO,
  pendenciasDoPlano,
  type DadosPlano,
} from "@/lib/plano-trabalho";
import { derivarModeloPlano } from "@/lib/plano-modelo";
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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  obrigatorio,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  disabled?: boolean;
  placeholder?: string;
  obrigatorio?: boolean;
}) {
  const id = idDoRotulo(label);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        <span>
          {label}
          {obrigatorio ? <Obrigatorio /> : null}
        </span>
      </Label>
      <select
        id={id}
        className={`${controle} campo-select pl-3 pr-9`}
        value={value}
        disabled={disabled}
        aria-required={obrigatorio}
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

// Os três blocos numerados do formulário. A numeração é o que torna visível,
// desde que a tela abre, que o plano de trabalho faz parte da apresentação da
// emenda — antes ele era uma rota separada, alcançável só depois de salvar, e o
// jurídico do cliente reclamou justamente de não achá-lo.
function Bloco({
  numero,
  titulo,
  estado,
  children,
}: {
  numero: number;
  titulo: string;
  estado?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[12px] font-extrabold tabular-nums"
          >
            {numero}
          </span>
          <span>{titulo}</span>
        </CardTitle>
        {estado ? <CardAction>{estado}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NovaEmendaForm({
  base,
  beneficiarios = [],
}: {
  base: Base;
  beneficiarios?: BeneficiarioOpcao[];
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
  const [valor, setValor] = useState(0);

  // Beneficiário final em duas perguntas (rastreabilidade — STF/TCE). O cadastro
  // cresce com o uso: o que for criado aqui entra na lista sem recarregar.
  const [categoria, setCategoria] = useState("");
  const [beneficiario, setBeneficiario] = useState<BeneficiarioOpcao | null>(null);
  const [cadastro, setCadastro] = useState<BeneficiarioOpcao[]>(beneficiarios);

  // Plano de trabalho — bloco 3. Vive aqui porque é salvo junto com o rascunho.
  const [plano, setPlano] = useState<DadosPlano>(PLANO_VAZIO);
  const [planoSujo, setPlanoSujo] = useState(false);

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
  const valorEmenda = valor;

  // É a DOTAÇÃO que escolhe o modelo do plano, não o autor: trocar a dotação no
  // bloco 1 troca o formulário do bloco 3. A categoria do beneficiário entra
  // porque terceiro setor vence a natureza da despesa — nele, quem preenche é a
  // entidade, e isso muda mais do que o formulário.
  const modeloPlano = useMemo(
    () =>
      derivarModeloPlano(
        dotacaoSel
          ? {
              grupo: dotacaoSel.naturezaGrupo,
              modalidadeAplicacao: dotacaoSel.naturezaModalidade,
              elemento: dotacaoSel.naturezaElemento,
            }
          : null,
        categoria || null
      ),
    [dotacaoSel, categoria]
  );
  const planoParaGravar = plano;
  const pendenciasPlano = useMemo(
    () => pendenciasDoPlano(plano, modeloPlano, valorEmenda),
    [plano, modeloPlano, valorEmenda]
  );

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
    !(valor > 0) && "valor",
  ].filter((x): x is string => !!x);

  function montarInput() {
    return {
      instrumentoBaseId: base.id,
      dotacaoId,
      tipo,
      objeto,
      justificativa,
      valor,
      beneficiarioId: beneficiario?.id ?? "",
      dotacaoOrigemId: tipo === "REMANEJAMENTO" ? origemId : "",
      dotacaoDestinoId: tipo === "REMANEJAMENTO" ? destinoId : "",
    };
  }

  // Salva emenda e plano de trabalho no mesmo gesto: para quem preenche, os três
  // blocos são um formulário só. Devolve o id da emenda, que o link da entidade
  // também precisa.
  async function salvarTudo(): Promise<string | null> {
    const input = montarInput();
    const res = emendaId
      ? await atualizarEmenda(emendaId, input)
      : await criarRascunhoEmenda(input);
    if (!res.ok) {
      toast.error(res.error);
      return null;
    }
    const id = res.id ?? emendaId;
    if (id) setEmendaId(id);
    setRelatorio(null);

    // Só grava o plano se ele foi tocado: um rascunho salvo sem passar pelo
    // bloco 3 não deve criar um plano vazio com carimbo de preenchimento. Na
    // administração pública não há o que gravar mesmo — a justificativa da
    // emenda já está na emenda, e é dela que o motor lê.
    if (id && planoSujo) {
      const rp = await salvarPlanoTrabalho(id, planoParaGravar);
      if (!rp.ok) {
        toast.error(`Emenda salva, mas o plano não: ${rp.error}`);
        return id;
      }
    }
    return id;
  }

  function salvar() {
    start(async () => {
      const id = await salvarTudo();
      if (id) toast.success("Rascunho salvo.");
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
        {/* Contexto travado — não é um dos blocos: nada se preenche aqui. */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">Exercício {base.ano}</Badge>
          <Badge variant="outline">
            Base: {ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} {base.numero}
          </Badge>
        </div>

        {/* ------------------------------------------------------ bloco 1 */}
        <Bloco numero={1} titulo="Onde o dinheiro entra">
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao obrigatorio label="Órgão" value={orgaoId} onChange={trocaOrgao} options={orgaos} />
            <Selecao obrigatorio label="Unidade orçamentária" value={unidadeId} onChange={trocaUnidade} options={unidades} disabled={!orgaoId} />
            <Selecao obrigatorio label="Programa" value={programaId} onChange={trocaPrograma} options={programas} disabled={!unidadeId} />
            <Selecao obrigatorio label="Ação" value={acaoId} onChange={trocaAcao} options={acoes} disabled={!programaId} />
            <div className="sm:col-span-2">
              <Selecao
                obrigatorio
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
          </div>
        </Bloco>

        {/* ------------------------------------------------------ bloco 2 */}
        {/* Duas colunas a partir de sm: tipo e valor são campos curtos e
            empilhá-los deixava o formulário alto à toa. Beneficiário, objeto e
            justificativa ficam em largura cheia. */}
        <Bloco numero={2} titulo="A emenda">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" className={`${controle} campo-select pl-3 pr-9`} value={tipo} onChange={(e) => { setTipo(e.target.value); sujar(); }}>
                {opcoes(ROTULO_TIPO_EMENDA).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor">
                <span>
                  Valor
                  <Obrigatorio />
                </span>
              </Label>
              <CampoMoeda
                id="valor"
                value={valor}
                onChange={(v) => {
                  setValor(v);
                  sujar();
                }}
              />
            </div>

            {tipo === "REMANEJAMENTO" ? (
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Selecao
                  obrigatorio
                  label="Dotação de origem"
                  value={origemId}
                  onChange={(v) => { setOrigemId(v); sujar(); }}
                  options={todasDotacoes.map((d) => ({ id: d.id, codigo: d.naturezaCodigo, nome: `Fonte ${d.fonteCodigo} · ${brl(d.valorAtual)}` }))}
                />
                <Selecao
                  obrigatorio
                  label="Dotação de destino"
                  value={destinoId}
                  onChange={(v) => { setDestinoId(v); sujar(); }}
                  options={todasDotacoes.map((d) => ({ id: d.id, codigo: d.naturezaCodigo, nome: `Fonte ${d.fonteCodigo} · ${brl(d.valorAtual)}` }))}
                />
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <CampoBeneficiario
                categoria={categoria}
                onCategoria={(c) => { setCategoria(c); sujar(); }}
                beneficiarios={cadastro}
                selecionado={beneficiario}
                onSelecionar={(b) => { setBeneficiario(b); sujar(); }}
                onCadastrado={(b) =>
                  setCadastro((xs) => (xs.some((x) => x.id === b.id) ? xs : [...xs, b]))
                }
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="objeto">
                <span>
                  Objeto
                  <Obrigatorio />
                </span>
              </Label>
              <textarea id="objeto" aria-required className={`${controle} min-h-20 py-2`} value={objeto} onChange={(e) => { setObjeto(e.target.value); sujar(); }} placeholder="Descrição narrativa do objeto da emenda" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="justificativa">
                <span>
                  Justificativa da emenda
                  <Obrigatorio />
                </span>
              </Label>
              <textarea id="justificativa" aria-required className={`${controle} min-h-20 py-2`} value={justificativa} onChange={(e) => { setJustificativa(e.target.value); sujar(); }} />
            </div>
          </div>
        </Bloco>

        {/* ------------------------------------------------------ bloco 3 */}
        {/* O formulário do plano MUDA conforme a dotação escolhida no bloco 1 —
            são quatro modelos oficiais, e o autor não escolhe entre eles. No
            terceiro setor ele não preenche nada: o plano vive no link enviado à
            entidade, que é quem tem meta física e preço praticado. */}
        <Bloco
          numero={3}
          titulo="Plano de trabalho"
          estado={
            !modeloPlano ? null : pendenciasPlano.length === 0 ? (
              <span className="text-[12px] font-semibold text-[var(--on-ok)]">
                Completo
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-muted-foreground">
                {pendenciasPlano.length === 1
                  ? "Falta 1 item"
                  : `Faltam ${pendenciasPlano.length} itens`}
              </span>
            )
          }
        >
          <div className="grid gap-5">
            {!modeloPlano ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Escolha a dotação no bloco 1. É ela que define o que o plano de
                trabalho precisa conter.
              </p>
            ) : modeloPlano === "TERCEIRO_SETOR" ? (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  O recurso é repassado a uma <b>entidade do terceiro setor</b>.
                  Meta física, preço praticado e forma de comprovação são
                  informação que só ela tem — por isso estes campos <b>não ficam
                  nesta tela</b>: eles vivem no link que você envia.
                </p>
                {podeSalvar || emendaId ? (
                  <LinkEntidade
                    tokenAtual={null}
                    linkExpiraEm={null}
                    preenchidoPor={null}
                    garantirEmenda={salvarTudo}
                  />
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Escolha a dotação no bloco 1 para poder gerar o link.
                  </p>
                )}
                <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">
                  A emenda só pode ser remetida depois de a entidade preencher e
                  assinar. Você acompanha o que voltar na página da emenda.
                </p>
              </>
            ) : (
              <>
                <PlanoTrabalhoCampos
                  valorEmenda={valorEmenda}
                  engenharia={modeloPlano === "OBRAS"}
                  valores={plano}
                  onChange={(v) => {
                    setPlano(v);
                    setPlanoSujo(true);
                    sujar();
                  }}
                />
                {pendenciasPlano.length > 0 ? (
                  <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">
                    O plano é salvo junto com o rascunho, mesmo pela metade. Para
                    a emenda poder ser remetida, falta {pendenciasPlano.join("; ")}.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </Bloco>

        <LegendaObrigatorios />

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
