"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Building2, HeartHandshake, Landmark, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cadastrarDestino } from "@/lib/actions/beneficiarios";
import { AJUDA_TIPO_BENEFICIARIO, ROTULO_TIPO_BENEFICIARIO } from "@/lib/rotulos";

// ---------------------------------------------------------------------------
// Beneficiário final em DUAS PERGUNTAS — categoria e destino.
//
// A anotação do jurídico do cliente ("administração direta, indireta ou
// entidades do terceiro setor") já foi lida uma vez como "classifique o
// cadastro em três categorias", e virou uma lista fechada. Não era isso:
//
//   1. a ESCOLHA é a categoria — é ela que define o rito do plano de trabalho;
//   2. o DESTINO é cadastro livre, que cresce com o uso. "Os equipamentos
//      públicos não se limitam aos que constam ali… é melhor deixar o vereador
//      cadastrar e o cadastro vai aumentando com o tempo."
//
// A sugestão enquanto digita não limita a escolha: serve para o mesmo destino
// não virar três ("Santa Casa", "Santa casa", "STA CASA") e a rastreabilidade
// que o TCE cobra não se perder no meio das variantes.
// ---------------------------------------------------------------------------

export type BeneficiarioOpcao = { id: string; nome: string; tipo: string };

const CATEGORIAS = [
  { valor: "ADMINISTRACAO_DIRETA", Icone: Landmark },
  { valor: "ADMINISTRACAO_INDIRETA", Icone: Building2 },
  { valor: "TERCEIRO_SETOR", Icone: HeartHandshake },
] as const;

const MAX_SUGESTOES = 8;

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function CampoBeneficiario({
  categoria,
  onCategoria,
  beneficiarios,
  selecionado,
  onSelecionar,
  onCadastrado,
}: {
  categoria: string;
  onCategoria: (categoria: string) => void;
  beneficiarios: BeneficiarioOpcao[];
  selecionado: BeneficiarioOpcao | null;
  onSelecionar: (b: BeneficiarioOpcao | null) => void;
  /** Destino recém-criado, para o pai incorporar à lista de sugestões. */
  onCadastrado: (b: BeneficiarioOpcao) => void;
}) {
  const [pending, start] = useTransition();
  const [texto, setTexto] = useState(selecionado?.nome ?? "");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const idBase = useId();
  const idLista = `${idBase}-lista`;

  // Fecha ao clicar fora — o `blur` do input sozinho fecharia antes do clique
  // na sugestão chegar.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const busca = normalizar(texto);

  // Sugere o cadastro inteiro, não só a categoria escolhida: o nome é único no
  // sistema, e esconder "Santa Casa" porque ela está gravada noutra categoria é
  // o caminho mais curto para criar a segunda "Santa Casa".
  const sugestoes = useMemo(() => {
    const lista = busca
      ? beneficiarios.filter((b) => normalizar(b.nome).includes(busca))
      : beneficiarios;
    return [...lista]
      .sort((a, b) => {
        if (busca) {
          const pa = normalizar(a.nome).startsWith(busca) ? 0 : 1;
          const pb = normalizar(b.nome).startsWith(busca) ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, MAX_SUGESTOES);
  }, [beneficiarios, busca]);

  const exato = beneficiarios.find((b) => normalizar(b.nome) === busca) ?? null;
  const podeCadastrar = !!categoria && texto.trim().length >= 2 && !exato;
  // O item de cadastro é a última linha da lista — por isso entra na contagem
  // que o teclado percorre.
  const totalItens = sugestoes.length + (podeCadastrar ? 1 : 0);

  function escolher(b: BeneficiarioOpcao) {
    setTexto(b.nome);
    setAberto(false);
    onSelecionar(b);
    // O cadastro é a verdade sobre a categoria: se o destino já existe noutra,
    // a pergunta 1 se ajusta ao que está gravado em vez de criar divergência.
    if (b.tipo !== categoria) onCategoria(b.tipo);
  }

  function cadastrar() {
    const nome = texto.trim();
    if (!nome || !categoria) return;
    start(async () => {
      const r = await cadastrarDestino(nome, categoria);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const novo = { id: r.id, nome: r.nome, tipo: r.tipo };
      onCadastrado(novo);
      escolher(novo);
      toast.success(
        r.jaExistia
          ? `"${r.nome}" já estava cadastrado — usei o cadastro existente.`
          : `"${r.nome}" cadastrado. Da próxima vez ele aparece na sugestão.`
      );
    });
  }

  function digitar(v: string) {
    setTexto(v);
    setAberto(true);
    setDestaque(0);
    if (selecionado) onSelecionar(null);
  }

  function limpar() {
    setTexto("");
    onSelecionar(null);
    setAberto(false);
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        return;
      }
      if (totalItens === 0) return;
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setDestaque((i) => (i + passo + totalItens) % totalItens);
    } else if (e.key === "Enter") {
      if (!aberto || totalItens === 0) return;
      e.preventDefault();
      if (destaque < sugestoes.length) escolher(sugestoes[destaque]);
      else cadastrar();
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* ---------------------------------------------------- 1ª pergunta */}
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-sm font-medium">
          Beneficiário final — que tipo de destino?
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CATEGORIAS.map(({ valor, Icone }) => (
            <label
              key={valor}
              className="relative flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-input bg-card p-3 transition-colors hover:bg-accent/40 has-[:checked]:border-ring has-[:checked]:bg-accent/60 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
            >
              {/* O rádio cobre o cartão inteiro, transparente: o alvo de
                  clique é o cartão, e o controle continua sendo um <input>
                  de verdade — alcançável por teclado e por leitor de tela.
                  Nome acessível = só o rótulo da categoria; a explicação entra
                  por `aria-describedby` para não virar um nome longo. */}
              <input
                type="radio"
                name={`${idBase}-categoria`}
                className="absolute inset-0 cursor-pointer appearance-none rounded-[10px] opacity-0"
                value={valor}
                aria-label={ROTULO_TIPO_BENEFICIARIO[valor]}
                aria-describedby={`${idBase}-ajuda-${valor}`}
                checked={categoria === valor}
                onChange={() => onCategoria(valor)}
              />
              <Icone
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">
                  {ROTULO_TIPO_BENEFICIARIO[valor]}
                </span>
                <span
                  id={`${idBase}-ajuda-${valor}`}
                  className="mt-1 block text-[11.5px] leading-snug text-muted-foreground"
                >
                  {AJUDA_TIPO_BENEFICIARIO[valor]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---------------------------------------------------- 2ª pergunta */}
      <div className="min-w-0 space-y-1.5" ref={caixa}>
        <Label htmlFor={`${idBase}-destino`}>Para onde vai</Label>
        <div className="relative">
          <input
            id={`${idBase}-destino`}
            role="combobox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={!categoria}
            className="flex h-9 w-full rounded-[10px] border border-input bg-card px-3 py-1 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={
              categoria
                ? "Digite o nome do órgão, equipamento ou entidade"
                : "Escolha antes o tipo de destino"
            }
            value={texto}
            onChange={(e) => digitar(e.target.value)}
            onFocus={() => setAberto(true)}
            onKeyDown={teclado}
          />
          {texto ? (
            <button
              type="button"
              aria-label="Limpar destino"
              onClick={limpar}
              className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}

          {aberto && categoria && totalItens > 0 ? (
            <ul
              id={idLista}
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-[10px] border bg-card p-1 shadow-lg"
            >
              {sugestoes.map((b, i) => (
                <li key={b.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === destaque}
                    onMouseEnter={() => setDestaque(i)}
                    onClick={() => escolher(b)}
                    className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                      i === destaque ? "bg-accent" : ""
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium">{b.nome}</span>
                    {b.tipo !== categoria ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {ROTULO_TIPO_BENEFICIARIO[b.tipo]}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {podeCadastrar ? (
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={destaque === sugestoes.length}
                    onMouseEnter={() => setDestaque(sugestoes.length)}
                    onClick={cadastrar}
                    disabled={pending}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                      destaque === sugestoes.length ? "bg-accent" : ""
                    }`}
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">
                      {pending ? "Cadastrando…" : `Cadastrar "${texto.trim()}"`}
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {!categoria ? (
            "Escolha o tipo de destino para cadastrar ou buscar para onde o recurso vai."
          ) : selecionado ? (
            <>
              Destino: <b>{selecionado.nome}</b> ·{" "}
              {ROTULO_TIPO_BENEFICIARIO[selecionado.tipo]}.{" "}
              {selecionado.tipo === "TERCEIRO_SETOR"
                ? "O plano de trabalho vai pedir justificativa, objetivo, declaração e planilha."
                : "O plano de trabalho vai pedir apenas a justificativa."}
            </>
          ) : texto.trim() ? (
            "Escolha uma sugestão ou cadastre este nome — enquanto nada estiver selecionado, a emenda fica sem beneficiário."
          ) : (
            "Digite o nome. Se ainda não existir, cadastre aqui mesmo — a lista cresce com o uso."
          )}
        </p>
      </div>
    </div>
  );
}
