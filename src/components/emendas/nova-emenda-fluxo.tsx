"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegendaObrigatorios, Obrigatorio } from "@/components/ui/obrigatorio";
import { CampoMoeda } from "@/components/ui/campo-moeda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioValidacao } from "./relatorio-validacao";
import { CampoBeneficiario, type BeneficiarioOpcao } from "./campo-beneficiario";
import { QuemAssina } from "./quem-assina";
import { PlanoTrabalhoCampos } from "@/components/plano-trabalho/campos";
import { LinkEntidade } from "@/components/plano-trabalho/link-entidade";
import { ROTULO_TIPO_INSTRUMENTO, ROTULO_TIPO_BENEFICIARIO } from "@/lib/rotulos";
import { fetchDotacoesElegiveis } from "@/lib/actions/cascata";
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
  totalMemoria,
  type DadosPlano,
} from "@/lib/plano-trabalho";
import { derivarModeloPlano } from "@/lib/plano-modelo";
import { FINALIDADES, ROTULO_FINALIDADE, type Finalidade } from "@/lib/finalidade";
import type { DotacaoOpcao, ResultadoElegiveis } from "@/lib/queries-orcamento";
import type { ResultadoMotor } from "@/lib/validation/motor";

// ---------------------------------------------------------------------------
// NOVA EMENDA EM QUATRO PASSOS — a ordem que o cliente pediu na reunião.
//
//   1. para onde vai o dinheiro   → define a modalidade de aplicação
//   2. para que serve             → define o grupo e o elemento da despesa
//   3. de onde sai o dinheiro     → só as dotações que aceitam as duas escolhas
//   4. plano de trabalho          → o modelo correspondente, já preenchível
//
// O que mudou, no fundo, não foi a ordem das perguntas: foi quem responde. O
// formulário antigo pedia ao vereador que montasse a classificação orçamentária
// numa cascata de cinco níveis e só depois dissesse para quem ia o dinheiro —
// se a combinação não existisse, ele descobria na análise, com a emenda inteira
// preenchida. Aqui as duas primeiras respostas eliminam a dotação impossível
// ANTES de ela aparecer na tela: o erro deixa de existir em vez de ser apontado.
//
// Uma emenda criada por esta tela é sempre IMPOSITIVA. Anulação e remanejamento
// mexem no orçamento por outro caminho e saíram daqui — decisão de "separar",
// da mesma reunião. As actions do servidor continuam aceitando os outros tipos.
// ---------------------------------------------------------------------------

type Base = { id: string; numero: string; tipo: string; ano: number };

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PASSOS = [
  { n: 1, nome: "Para onde vai" },
  { n: 2, nome: "Para que serve" },
  { n: 3, nome: "De onde sai" },
  { n: 4, nome: "Plano" },
] as const;

// ---------------------------------------------------------------------------
// A trilha. Mostra em que passo se está, o que já foi decidido em cada um e
// deixa voltar — nunca pular adiante, porque o passo seguinte depende do
// anterior para existir.
// ---------------------------------------------------------------------------
function Trilha({
  passo,
  maxPasso,
  valores,
  onIr,
}: {
  passo: number;
  maxPasso: number;
  valores: (string | null)[];
  onIr: (n: number) => void;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {PASSOS.map((p, i) => {
        const feito = p.n < passo;
        const atual = p.n === passo;
        const alcancavel = p.n <= maxPasso;
        return (
          <li key={p.n} className="min-w-0">
            <button
              type="button"
              disabled={!alcancavel}
              aria-current={atual ? "step" : undefined}
              onClick={() => onIr(p.n)}
              className={`flex w-full min-w-0 flex-col gap-1 rounded-[10px] border-t-[3px] bg-card px-3.5 py-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-55 ${
                atual
                  ? "border-t-brand-cyan shadow-card"
                  : feito
                    ? "border-t-brand-mint"
                    : "border-t-border"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-extrabold tabular-nums ${
                    atual
                      ? "bg-brand-cyan text-white"
                      : feito
                        ? "bg-[var(--ok-bg,theme(colors.secondary))] text-[var(--on-ok)]"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {feito ? <Check className="size-3" /> : p.n}
                </span>
                <span className="truncate text-[12.5px] font-semibold">{p.nome}</span>
              </span>
              <span className="truncate text-[12px] text-muted-foreground">
                {valores[i] ?? "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// A dotação apresentada por extenso. O vereador não a reconhece pelo código —
// apontamento do jurídico do cliente —, então a classificação inteira aparece
// escrita, e a frase final repete tudo em linguagem corrente.
function CartaoDotacao({ d }: { d: DotacaoOpcao }) {
  const linhas: [string, string][] = [
    ["Órgão", `${d.orgaoCodigo} — ${d.orgaoNome}`],
    ["Unidade orçamentária", `${d.unidadeCodigo} — ${d.unidadeNome}`],
    ["Função / Subfunção", `${d.funcaoCodigo} ${d.funcaoNome} · ${d.subfuncaoCodigo} ${d.subfuncaoNome}`],
    ["Programa", `${d.programaCodigo} — ${d.programaNome}`],
    ["Ação", `${d.acaoCodigo} — ${d.acaoNome}`],
    ["Despesa", `${d.naturezaCodigo} — ${d.naturezaNome}`],
    ["Fonte de recurso", `${d.fonteCodigo} — ${d.fonteNome}`],
    ["Saldo disponível", brl(d.valorAtual)],
  ];
  return (
    <div className="rounded-xl border bg-secondary/40 p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        O que é esta dotação
      </div>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,150px)_1fr]">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-[12px] font-semibold text-muted-foreground">{rotulo}</dt>
            <dd className="text-[13px] font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Em outras palavras: recurso da <b>{d.unidadeNome}</b> para{" "}
        <b>{d.naturezaNome.toLowerCase()}</b> na ação <b>{d.acaoNome}</b>.
      </p>
    </div>
  );
}

// Um passo. O título numerado é o mesmo da trilha, para a pessoa não ter de
// mapear dois vocabulários entre o topo e o conteúdo.
function Passo({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {numero}. {titulo}
        </CardTitle>
        <p className="mt-1 max-w-[68ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NovaEmendaFluxo({
  base,
  beneficiarios = [],
}: {
  base: Base;
  beneficiarios?: BeneficiarioOpcao[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [passo, setPasso] = useState(1);
  const [maxPasso, setMaxPasso] = useState(1);

  // ---------------------------------------------------------------- passo 1
  const [categoria, setCategoria] = useState("");
  const [beneficiario, setBeneficiario] = useState<BeneficiarioOpcao | null>(null);
  const [cadastro, setCadastro] = useState<BeneficiarioOpcao[]>(beneficiarios);

  // ---------------------------------------------------------------- passo 2
  const [finalidade, setFinalidade] = useState<Finalidade | null>(null);

  // ---------------------------------------------------------------- passo 3
  const [lista, setLista] = useState<ResultadoElegiveis | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [orgaoId, setOrgaoId] = useState("");
  const [verExcluidas, setVerExcluidas] = useState(false);
  const [dotacao, setDotacao] = useState<DotacaoOpcao | null>(null);

  // ---------------------------------------------------------------- passo 4
  const [objeto, setObjeto] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [valorDigitado, setValorDigitado] = useState(0);
  const [plano, setPlano] = useState<DadosPlano>(PLANO_VAZIO);
  const [planoSujo, setPlanoSujo] = useState(false);

  const [emendaId, setEmendaId] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<ResultadoMotor | null>(null);

  // Qualquer mudança invalida a pré-checagem anterior.
  const sujar = () => setRelatorio(null);

  const modeloPlano = useMemo(
    () =>
      derivarModeloPlano(
        dotacao
          ? {
              grupo: dotacao.naturezaGrupo,
              modalidadeAplicacao: dotacao.naturezaModalidade,
              elemento: dotacao.naturezaElemento,
            }
          : null,
        categoria || null
      ),
    [dotacao, categoria]
  );

  const terceiroSetor = modeloPlano === "TERCEIRO_SETOR";

  // O VALOR DA EMENDA É A SOMA DOS ITENS — pedido do cliente. Antes havia dois
  // números para a mesma coisa: um valor digitado e uma memória de cálculo que
  // precisava fechar com ele. Agora há um só, e ele nasce da memória.
  //
  // A exceção é o terceiro setor, e ela é honesta: ali a memória de cálculo é
  // preenchida pela ENTIDADE, pelo link, e o vereador não a tem na mão quando
  // apresenta a emenda. O que ele declara é o teto do repasse; a entidade
  // detalha depois, e a pré-checagem confere se fecha.
  const valorEmenda = terceiroSetor
    ? valorDigitado
    : totalMemoria(plano.itens.filter((i) => i.beneficiarios.trim()));

  const pendenciasPlano = useMemo(
    () => pendenciasDoPlano(plano, modeloPlano, valorEmenda),
    [plano, modeloPlano, valorEmenda]
  );

  // -------------------------------------------------------------------------
  // A lista do passo 3. Recarrega quando muda qualquer coisa de que ela
  // depende. O atraso de 250ms existe só para a busca: sem ele cada tecla
  // digitada vira uma ida ao servidor.
  // -------------------------------------------------------------------------
  const carregar = useCallback(async () => {
    if (!categoria) return;
    setCarregando(true);
    try {
      const r = await fetchDotacoesElegiveis({
        instrumentoId: base.id,
        tipoBeneficiario: categoria,
        finalidade,
        orgaoId: orgaoId || undefined,
        busca: busca || undefined,
      });
      setLista(r);
    } finally {
      setCarregando(false);
    }
  }, [base.id, categoria, finalidade, orgaoId, busca]);

  useEffect(() => {
    if (passo !== 3) return;
    const t = setTimeout(carregar, busca ? 250 : 0);
    return () => clearTimeout(t);
  }, [passo, carregar, busca]);

  // -------------------------------------------------------------------------
  // Cada escolha invalida as seguintes. Trocar o destino muda a modalidade de
  // aplicação; trocar a finalidade muda o elemento — em ambos os casos a
  // dotação escolhida pode ter deixado de ser possível, e mantê-la em silêncio
  // seria guardar exatamente o erro que esta tela existe para evitar.
  // -------------------------------------------------------------------------
  function trocarCategoria(c: string) {
    if (c === categoria) return;
    setCategoria(c);
    setFinalidade(null);
    setDotacao(null);
    setLista(null);
    setMaxPasso(1);
    sujar();
  }

  function trocarBeneficiario(b: BeneficiarioOpcao | null) {
    setBeneficiario(b);
    if (b && b.tipo !== categoria) trocarCategoria(b.tipo);
    sujar();
  }

  function trocarFinalidade(f: Finalidade) {
    if (f === finalidade) return;
    setFinalidade(f);
    setDotacao(null);
    setLista(null);
    setMaxPasso(2);
    sujar();
  }

  function irPara(n: number) {
    setPasso(n);
    setMaxPasso((m) => Math.max(m, n));
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -------------------------------------------------------------------------
  // Gravação. Rascunho salva com o que houver — regra do jurídico do cliente:
  // "sempre salvar rascunho independente de estar completa a emenda; somente
  // não habilitar a remessa". Só a dotação é exigida, porque é ela que ancora a
  // emenda a uma linha do orçamento.
  // -------------------------------------------------------------------------
  const podeSalvar = !!dotacao;

  function montarInput() {
    return {
      instrumentoBaseId: base.id,
      dotacaoId: dotacao?.id ?? "",
      tipo: "IMPOSITIVA",
      objeto,
      justificativa,
      valor: valorEmenda,
      beneficiarioId: beneficiario?.id ?? "",
      dotacaoOrigemId: "",
      dotacaoDestinoId: "",
    };
  }

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
    // passo 4 não deve criar um plano vazio com carimbo de preenchimento.
    if (id && planoSujo) {
      const rp = await salvarPlanoTrabalho(id, plano);
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
    start(async () => {
      const id = await salvarTudo();
      if (!id) return;
      const res = await validarEmendaAction(id);
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

  const faltando = [
    !objeto.trim() && "o objeto",
    !justificativa.trim() && "a justificativa",
    !(valorEmenda > 0) && "o valor",
  ].filter((x): x is string => !!x);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <Trilha
          passo={passo}
          maxPasso={maxPasso}
          valores={[
            beneficiario?.nome ?? null,
            finalidade ? ROTULO_FINALIDADE[finalidade] : null,
            dotacao ? `${dotacao.acaoCodigo} — ${dotacao.acaoNome}` : null,
            valorEmenda > 0 ? brl(valorEmenda) : null,
          ]}
          onIr={irPara}
        />

        {/* ------------------------------------------------------- passo 1 */}
        {passo === 1 ? (
          <Passo
            numero={1}
            titulo="Para onde vai o dinheiro"
            descricao="A primeira decisão é quem recebe, porque é ela que define por qual modalidade a despesa pode sair — e, com isso, quais dotações a emenda vai poder usar."
          >
            <div className="grid gap-5">
              <CampoBeneficiario
                categoria={categoria}
                onCategoria={trocarCategoria}
                beneficiarios={cadastro}
                selecionado={beneficiario}
                onSelecionar={trocarBeneficiario}
                onCadastrado={(b) =>
                  setCadastro((xs) => (xs.some((x) => x.id === b.id) ? xs : [...xs, b]))
                }
              />

              {/* Quem assina só é pedido no terceiro setor: nos demais quem
                  executa é o próprio município, e o plano é preenchido aqui. */}
              {beneficiario && beneficiario.tipo === "TERCEIRO_SETOR" ? (
                <QuemAssina
                  key={beneficiario.id}
                  destino={beneficiario}
                  onSalvo={(b) => {
                    setBeneficiario(b);
                    setCadastro((xs) => xs.map((x) => (x.id === b.id ? b : x)));
                  }}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={!beneficiario} onClick={() => irPara(2)}>
                  Continuar <ChevronRight className="size-4" aria-hidden />
                </Button>
                <span className="text-[12px] text-muted-foreground">
                  {beneficiario
                    ? "Dá para voltar e trocar o destino — as escolhas seguintes são refeitas."
                    : "Escolha o destino para continuar."}
                </span>
              </div>
            </div>
          </Passo>
        ) : null}

        {/* ------------------------------------------------------- passo 2 */}
        {passo === 2 ? (
          <Passo
            numero={2}
            titulo="Para que serve o dinheiro"
            descricao={`O que a ${beneficiario?.nome ?? "unidade"} vai fazer com o recurso. É esta resposta que define o tipo de despesa — e qual modelo de plano de trabalho a emenda vai pedir no passo 4.`}
          >
            <div className="grid gap-5">
              {/* Escolha única: `radiogroup` + `radio` em vez de botões soltos.
                  É o que a tecnologia assistiva precisa ouvir — "opção 2 de 3,
                  marcada" — e o que descreve o comportamento real da tela. */}
              <div
                role="radiogroup"
                aria-label="Para que serve o dinheiro"
                className="grid gap-3 sm:grid-cols-3"
              >
                {FINALIDADES.map((f) => {
                  const on = finalidade === f.valor;
                  return (
                    <button
                      key={f.valor}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => trocarFinalidade(f.valor)}
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors ${
                        on
                          ? "border-ring bg-accent/60"
                          : "border-input bg-card hover:bg-accent/30"
                      }`}
                    >
                      <b className="text-[13.5px] leading-tight">{f.titulo}</b>
                      <span className="text-[12px] leading-relaxed text-muted-foreground">
                        {f.ajuda}
                      </span>
                      <span className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                        Ex.: {f.exemplos}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={!finalidade} onClick={() => irPara(3)}>
                  Continuar <ChevronRight className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" type="button" onClick={() => irPara(1)}>
                  Voltar
                </Button>
                <span className="text-[12px] text-muted-foreground">
                  {finalidade
                    ? "Trocar depois refaz a lista de dotações."
                    : "Escolha para que serve para continuar."}
                </span>
              </div>
            </div>
          </Passo>
        ) : null}

        {/* ------------------------------------------------------- passo 3 */}
        {passo === 3 ? (
          <Passo
            numero={3}
            titulo="De onde sai o dinheiro"
            descricao="A lista já vem filtrada pelas duas respostas anteriores: só aparece dotação que aceita este destino, esta finalidade e emenda impositiva. Não há classificação para montar — ela vem pronta da própria dotação."
          >
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
                <div className="space-y-1.5">
                  <Label htmlFor="busca-dotacao">Buscar</Label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="busca-dotacao"
                      className="pl-9"
                      placeholder="Programa, ação, unidade…"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filtro-orgao">Órgão</Label>
                  <select
                    id="filtro-orgao"
                    className="campo-select flex h-9 w-full rounded-[10px] border border-input bg-card py-1 pl-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={orgaoId}
                    onChange={(e) => setOrgaoId(e.target.value)}
                  >
                    <option value="">Todos os órgãos</option>
                    {(lista?.orgaos ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} — {o.nome} ({o.qtd})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {carregando && !lista ? (
                <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                  Procurando as dotações possíveis…
                </p>
              ) : lista && lista.dotacoes.length > 0 ? (
                <>
                  <div
                    role="radiogroup"
                    aria-label="Dotações compatíveis"
                    className="grid gap-2"
                  >
                    {lista.dotacoes.map((d) => {
                      const on = dotacao?.id === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            setDotacao(d);
                            sujar();
                          }}
                          className={`grid w-full min-w-0 grid-cols-[1fr_auto] items-start gap-3 rounded-[10px] border p-3.5 text-left transition-colors ${
                            on ? "border-ring bg-accent/60" : "border-input bg-card hover:bg-accent/30"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-semibold">
                              {d.acaoCodigo} — {d.acaoNome}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                              {d.unidadeNome} · {d.programaNome}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                              {d.naturezaCodigo} {d.naturezaNome} · fonte {d.fonteNome}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                              saldo
                            </span>
                            <b className="block text-[13px] tabular-nums">{brl(d.valorAtual)}</b>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {lista.total > lista.dotacoes.length ? (
                    <p className="text-[12px] text-muted-foreground">
                      {lista.total} dotações atendem a esta combinação — acima
                      estão as {lista.dotacoes.length} de maior saldo. Use a busca
                      ou o filtro de órgão para chegar à que procura.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="rounded-[10px] bg-secondary px-4 py-6 text-center text-[12.5px] leading-relaxed text-muted-foreground">
                  Nenhuma dotação da base atende a esta combinação
                  {orgaoId || busca ? " com os filtros aplicados" : ""}.{" "}
                  {orgaoId || busca
                    ? "Limpe a busca e o filtro de órgão."
                    : "Volte e revise o destino ou a finalidade, ou peça ao Executivo a inclusão de dotação compatível."}
                </p>
              )}

              {/* Por que a lista é curta. Sem esta explicação a filtragem vira
                  caixa-preta: o vereador conhece a dotação que usou no ano
                  passado e não a encontra mais. */}
              {lista && lista.excluidas > 0 ? (
                <div className="rounded-[10px] border bg-secondary/40 p-3.5">
                  <button
                    type="button"
                    className="text-left text-[12.5px] font-semibold underline-offset-4 hover:underline"
                    onClick={() => setVerExcluidas((v) => !v)}
                  >
                    {verExcluidas ? "Ocultar" : "Ver"} as {lista.excluidas} dotações
                    que ficaram de fora e por quê
                  </button>
                  {verExcluidas ? (
                    <ul className="mt-2.5 grid gap-1.5">
                      {lista.motivos.map((m) => (
                        <li
                          key={m.motivo}
                          className="flex gap-2.5 text-[12px] leading-relaxed text-muted-foreground"
                        >
                          <b className="shrink-0 tabular-nums text-foreground">{m.qtd}</b>
                          <span>{m.motivo}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {dotacao ? <CartaoDotacao d={dotacao} /> : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={!dotacao} onClick={() => irPara(4)}>
                  Abrir o plano de trabalho <ChevronRight className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" type="button" onClick={() => irPara(2)}>
                  Voltar
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={pending || !podeSalvar}
                  onClick={salvar}
                >
                  Salvar rascunho
                </Button>
              </div>
            </div>
          </Passo>
        ) : null}

        {/* ------------------------------------------------------- passo 4 */}
        {passo === 4 && dotacao ? (
          <Passo
            numero={4}
            titulo="Plano de trabalho"
            descricao={
              terceiroSetor
                ? "O recurso vai para uma entidade sem fins lucrativos: é ela quem preenche e assina o plano, pelo link. Aqui você declara o objeto, a justificativa e o teto do repasse."
                : "O modelo abaixo foi escolhido pela dotação e pela finalidade — não há o que selecionar. O valor da emenda é a soma da memória de cálculo."
            }
          >
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="objeto">
                    <span>
                      Objeto
                      <Obrigatorio />
                    </span>
                  </Label>
                  <textarea
                    id="objeto"
                    aria-required
                    className="flex min-h-20 w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="O que a emenda faz, em uma frase"
                    value={objeto}
                    onChange={(e) => {
                      setObjeto(e.target.value);
                      sujar();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="justificativa">
                    <span>
                      Justificativa da emenda
                      <Obrigatorio />
                    </span>
                  </Label>
                  <textarea
                    id="justificativa"
                    aria-required
                    className="flex min-h-20 w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="Por que ela é necessária"
                    value={justificativa}
                    onChange={(e) => {
                      setJustificativa(e.target.value);
                      sujar();
                    }}
                  />
                </div>
              </div>

              {terceiroSetor ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="valor">
                        <span>
                          Valor do repasse
                          <Obrigatorio />
                        </span>
                      </Label>
                      <CampoMoeda
                        id="valor"
                        value={valorDigitado}
                        onChange={(v) => {
                          setValorDigitado(v);
                          sujar();
                        }}
                      />
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        Aqui o valor é digitado: a memória de cálculo é da
                        entidade, e ela a preenche pelo link.
                      </p>
                    </div>
                  </div>
                  <LinkEntidade
                    tokenAtual={null}
                    linkExpiraEm={null}
                    preenchidoPor={null}
                    garantirEmenda={salvarTudo}
                  />
                  {beneficiario?.responsavelEmail ? (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Envie para <b>{beneficiario.responsavelNome}</b> ·{" "}
                      {beneficiario.responsavelEmail}.
                    </p>
                  ) : (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Volte ao passo 1 para registrar quem assina pela entidade —
                      é para essa pessoa que o link vai.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <PlanoTrabalhoCampos
                    valorEmenda={valorEmenda}
                    valorDaMemoria
                    engenharia={modeloPlano === "OBRAS"}
                    valores={plano}
                    onChange={(v) => {
                      setPlano(v);
                      setPlanoSujo(true);
                      sujar();
                    }}
                  />
                </>
              )}

              {pendenciasPlano.length > 0 ? (
                <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">
                  O plano é salvo junto com o rascunho, mesmo pela metade. Para a
                  emenda poder ser remetida, falta {pendenciasPlano.join("; ")}.
                </p>
              ) : null}

              <LegendaObrigatorios />

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={salvar} disabled={pending || !podeSalvar}>
                  {emendaId ? "Salvar alterações" : "Salvar rascunho"}
                </Button>
                <Button variant="outline" onClick={validar} disabled={pending || !podeSalvar}>
                  Validar
                </Button>
                <Button
                  variant="secondary"
                  onClick={submeter}
                  disabled={pending || !podeSubmeter}
                  title={
                    !podeSubmeter
                      ? "Faça a pré-checagem e resolva as pendências antes de remeter"
                      : undefined
                  }
                >
                  Submeter
                </Button>
                <Button variant="ghost" type="button" onClick={() => irPara(3)}>
                  Voltar
                </Button>
              </div>
              {faltando.length > 0 ? (
                <p className="text-[12px] font-medium text-muted-foreground">
                  Rascunho salva assim mesmo. Falta preencher {faltando.join(", ")}{" "}
                  para poder remeter.
                </p>
              ) : null}
            </div>
          </Passo>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ resumo */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-104px)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
            Resumo da emenda
          </p>
          <dl className="grid gap-2.5">
            {[
              ["Destino", beneficiario?.nome],
              ["Tipo de destino", categoria ? ROTULO_TIPO_BENEFICIARIO[categoria] : null],
              ["Serve para", finalidade ? ROTULO_FINALIDADE[finalidade] : null],
              ["Dotação", dotacao ? `${dotacao.naturezaCodigo} · ${dotacao.acaoNome}` : null],
              ["Valor", valorEmenda > 0 ? brl(valorEmenda) : null],
            ].map(([k, v]) => (
              <div key={k as string} className="grid grid-cols-[86px_minmax(0,1fr)] gap-2">
                <dt className="text-[11.5px] text-muted-foreground">{k}</dt>
                <dd
                  className={`min-w-0 text-[12.5px] ${
                    v ? "font-semibold" : "text-muted-foreground opacity-70"
                  }`}
                >
                  {v ?? "a definir"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            <Badge variant="secondary">Exercício {base.ano}</Badge>
            <Badge variant="outline">
              {ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} {base.numero}
            </Badge>
            <Badge variant="outline">Impositiva</Badge>
          </div>
        </div>

        {relatorio ? (
          <RelatorioValidacao relatorio={relatorio} />
        ) : (
          <p className="rounded-xl bg-secondary p-4 text-[12px] leading-relaxed text-muted-foreground">
            No passo 4, <b>Validar</b> faz a pré-checagem das condições de
            validade. A remessa só é liberada quando nenhuma pendência resta.
          </p>
        )}
      </aside>
    </div>
  );
}
