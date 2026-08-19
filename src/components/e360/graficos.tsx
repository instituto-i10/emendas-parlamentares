import { cn } from "@/lib/utils";

// ============================================================================
// Gráficos no padrão da referência `ui-test/hrmate-reference`: SVG puro, sem
// biblioteca. Rosca e gauge têm proporção fixa e ficam centrados; as barras
// são CSS (grid de colunas + segmentos em %) e por isso acompanham a largura
// do card sem deformar os cantos arredondados.
// ============================================================================

const TRILHO = "#e3e9f2";

export type Fatia = { rotulo: string; valor: number; cor: string };

// ---------------------------------------------------------------- rosca ----

export function Donut({
  fatias,
  centroValor,
  centroRotulo,
  tamanho = 168,
}: {
  fatias: Fatia[];
  centroValor: string;
  centroRotulo?: string;
  tamanho?: number;
}) {
  const r = 56;
  const C = 2 * Math.PI * r; // 351.86
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const folga = fatias.length > 1 ? 3 : 0;

  const arcos: { cor: string; dash: string; offset: string }[] = [];
  for (let i = 0, acumulado = 0; i < fatias.length; i++) {
    const fracao = total > 0 ? fatias[i].valor / total : 0;
    const comprimento = Math.max(0, fracao * C - folga);
    arcos.push({
      cor: fatias[i].cor,
      dash: `${comprimento.toFixed(1)} ${(C - comprimento).toFixed(1)}`,
      offset: (-acumulado).toFixed(1),
    });
    acumulado += fracao * C;
  }

  return (
    <div className="grid place-items-center py-1.5">
      <svg
        width={tamanho}
        height={tamanho}
        viewBox="0 0 140 140"
        role="img"
        aria-label={`${centroRotulo ?? "Distribuição"}: ${centroValor}`}
      >
        <g transform="rotate(-90 70 70)" fill="none" strokeWidth="12">
          <circle cx="70" cy="70" r={r} stroke={TRILHO} />
          {arcos.map((a, i) => (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              stroke={a.cor}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
            />
          ))}
        </g>
        <text
          x="70"
          y="70"
          textAnchor="middle"
          fill="currentColor"
          fontSize="19"
          fontWeight="800"
          letterSpacing="-0.5"
        >
          {centroValor}
        </text>
        {centroRotulo ? (
          <text
            x="70"
            y="85"
            textAnchor="middle"
            fill="#5a6b8c"
            fontSize="9"
            fontWeight="500"
          >
            {centroRotulo}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

// Legenda da rosca: quadradinho + nome + (%) + valor à direita.
export function DonutLegenda({
  fatias,
  formatar,
}: {
  fatias: Fatia[];
  formatar: (v: number) => string;
}) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return (
    <ul className="mt-3 list-none p-0">
      {fatias.map((f) => (
        <li
          key={f.rotulo}
          className="flex items-center gap-2.5 py-1.5 text-[12.5px]"
        >
          <i
            className="size-2.5 shrink-0 rounded-[2.5px]"
            style={{ background: f.cor }}
            aria-hidden
          />
          <b className="font-bold tracking-[-.01em]">{f.rotulo}</b>
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            ({total > 0 ? Math.round((f.valor / total) * 100) : 0}%)
          </span>
          <span className="ml-auto font-semibold tabular-nums">
            {formatar(f.valor)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- gauge ----

// Semicírculo 0–100 com o valor no centro, no padrão do gauge da referência.
export function Gauge({
  pct,
  valor,
  rotulo,
  sub,
  alerta,
}: {
  pct: number;
  valor: string;
  rotulo?: string;
  sub?: string;
  alerta?: boolean;
}) {
  const limitado = Math.min(100, Math.max(0, pct));
  const arco = 251.3; // comprimento do caminho abaixo
  return (
    <div className="grid place-items-center py-1">
      <svg
        width="216"
        height="124"
        viewBox="0 0 230 132"
        role="img"
        aria-label={`${rotulo ?? "Indicador"}: ${valor}`}
      >
        <g textAnchor="middle" fill="#a9b6cf" fontSize="8" fontWeight="600">
          <text x="16" y="118">0</text>
          <text x="27" y="60">20</text>
          <text x="85" y="22">40</text>
          <text x="145" y="22">60</text>
          <text x="203" y="60">80</text>
          <text x="216" y="118">100</text>
        </g>
        <path
          d="M35 114a80 80 0 0 1 160 0"
          fill="none"
          stroke={TRILHO}
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M35 114a80 80 0 0 1 160 0"
          fill="none"
          stroke={alerta ? "#f5a524" : "#00b4d8"}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${((limitado / 100) * arco).toFixed(1)} 300`}
        />
        <text
          x="115"
          y="88"
          textAnchor="middle"
          fill="currentColor"
          fontSize="26"
          fontWeight="800"
          letterSpacing="-0.8"
        >
          {valor}
        </text>
        {rotulo ? (
          <text
            x="115"
            y="103"
            textAnchor="middle"
            fill="#5a6b8c"
            fontSize="10"
            fontWeight="600"
          >
            {rotulo}
          </text>
        ) : null}
        {sub ? (
          <text
            x="115"
            y="115"
            textAnchor="middle"
            fill="#a9b6cf"
            fontSize="8"
            fontWeight="500"
          >
            {sub}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------- anel ----

// Anelzinho de progresso das linhas de lista (padrão `.ring` da referência).
export function Ring({
  pct,
  tom = "cyan",
  tamanho = 34,
}: {
  pct: number;
  tom?: "cyan" | "amber" | "bad";
  tamanho?: number;
}) {
  const limitado = Math.min(100, Math.max(0, pct));
  const r = 16;
  const C = 2 * Math.PI * r; // 100.5
  const cor = tom === "bad" ? "#e5484d" : tom === "amber" ? "#f5a524" : "#00b4d8";
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`${Math.round(limitado)}%`}
    >
      <circle cx="20" cy="20" r={r} fill="none" stroke={TRILHO} strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={cor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${((limitado / 100) * C).toFixed(1)} ${C.toFixed(1)}`}
        transform="rotate(-90 20 20)"
      />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill={cor}
      >
        {Math.round(limitado)}%
      </text>
    </svg>
  );
}

// --------------------------------------------------------------- barras ----

export type Coluna = {
  rotulo: string;
  segmentos: { valor: number; cor: string }[];
};

// Barras empilhadas em CSS puro (grid de N colunas, segmentos em %): a altura
// da área é fixa e a largura é livre, então o gráfico ocupa o card inteiro.
export function Barras({
  colunas,
  altura = 168,
  className,
}: {
  colunas: Coluna[];
  altura?: number;
  className?: string;
}) {
  const maior = Math.max(
    1,
    ...colunas.map((c) => c.segmentos.reduce((s, g) => s + g.valor, 0))
  );

  return (
    <div className={cn("mt-3", className)}>
      <div
        className="relative grid items-end gap-2"
        style={{
          height: altura,
          gridTemplateColumns: `repeat(${colunas.length}, minmax(0,1fr))`,
        }}
      >
        {[0, 25, 50, 75].map((g) => (
          <span
            key={g}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
            style={{ bottom: `${g}%` }}
            aria-hidden
          />
        ))}
        {colunas.map((c) => {
          const total = c.segmentos.reduce((s, g) => s + g.valor, 0);
          return (
            <div
              key={c.rotulo}
              className="relative flex h-full flex-col justify-end"
              title={c.rotulo}
            >
              <div
                className="mx-auto flex w-full max-w-[30px] flex-col-reverse overflow-hidden rounded-[7px]"
                style={{ height: `${(total / maior) * 100}%` }}
              >
                {c.segmentos.map((g, i) => (
                  <span
                    key={i}
                    style={{
                      background: g.cor,
                      height: `${total > 0 ? (g.valor / total) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-2.5 grid gap-2 text-center text-[9.5px] font-semibold text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(0,1fr))` }}
      >
        {colunas.map((c) => (
          <span key={c.rotulo} className="truncate" title={c.rotulo}>
            {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

// Legenda horizontal simples (padrão `.legend` da referência).
export function Legenda({ itens }: { itens: { rotulo: string; cor: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {itens.map((i) => (
        <span
          key={i.rotulo}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground"
        >
          <i
            className="size-[7px] rounded-full"
            style={{ background: i.cor }}
            aria-hidden
          />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}
