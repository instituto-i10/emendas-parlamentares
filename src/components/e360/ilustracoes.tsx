import { cn } from "@/lib/utils";

// ============================================================================
// Ilustrações do produto — SVG inline, sem imagem raster e sem dependência.
// Mesma decisão da referência `ui-test/hrmate-reference`: a arte é vetorial,
// escala sem perder nitidez e usa as variáveis da identidade, então acompanha
// qualquer mudança de paleta.
// ============================================================================

// Ondas abstratas em coluna (padrão `.promo-art` da referência): faixa
// decorativa lateral de cards promocionais e painéis.
export function ArteOndas({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 84 250"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="e360-ondas" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a2463" />
          <stop offset="55%" stopColor="#12459b" />
          <stop offset="100%" stopColor="#00b4d8" />
        </linearGradient>
      </defs>
      <rect width="84" height="250" fill="url(#e360-ondas)" />
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity=".28"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M-6 -10C10 40 -2 92 6 132 14 172 2 214 -6 260" />
        <path d="M12 -10C30 42 16 94 24 134 32 174 20 216 12 260" />
        <path d="M30 -10C48 44 34 96 42 136 50 176 38 218 30 260" />
        <path d="M48 -10C66 46 52 98 60 138 68 178 56 220 48 260" />
        <path d="M66 -10C84 48 70 100 78 140 86 180 74 222 66 260" />
      </g>
    </svg>
  );
}

// Cena da abertura pública: a cidade (o que o orçamento constrói), as barras do
// recurso e o selo de conferência. É a única ilustração "narrativa" do produto.
export function IlustracaoOrcamento({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="Recursos do orçamento distribuídos entre equipamentos públicos"
    >
      <defs>
        <linearGradient id="e360-ilu-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#00b4d8" />
          <stop offset="100%" stopColor="#00e5a0" />
        </linearGradient>
        <linearGradient id="e360-ilu-céu" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e4f7fc" />
          <stop offset="100%" stopColor="#f4f7fb" />
        </linearGradient>
      </defs>

      {/* fundo */}
      <circle cx="210" cy="150" r="140" fill="url(#e360-ilu-céu)" />

      {/* skyline: escola, hospital, creche */}
      <g>
        <rect x="66" y="150" width="74" height="96" rx="8" fill="#0a2463" />
        <rect x="80" y="166" width="16" height="16" rx="3" fill="#8fe8ff" />
        <rect x="110" y="166" width="16" height="16" rx="3" fill="#8fe8ff" />
        <rect x="80" y="194" width="16" height="16" rx="3" fill="#8fe8ff" />
        <rect x="110" y="194" width="16" height="16" rx="3" fill="#8fe8ff" />
        <rect x="92" y="220" width="22" height="26" rx="4" fill="#00b4d8" />

        <rect x="152" y="120" width="86" height="126" rx="8" fill="#12459b" />
        <rect x="168" y="138" width="18" height="18" rx="3" fill="#c9f4ff" />
        <rect x="204" y="138" width="18" height="18" rx="3" fill="#c9f4ff" />
        <rect x="168" y="170" width="18" height="18" rx="3" fill="#c9f4ff" />
        <rect x="204" y="170" width="18" height="18" rx="3" fill="#c9f4ff" />
        {/* cruz da saúde */}
        <rect x="186" y="200" width="18" height="46" rx="3" fill="#00e5a0" />
        <rect x="172" y="214" width="46" height="18" rx="3" fill="#00e5a0" />

        <rect x="250" y="166" width="62" height="80" rx="8" fill="#0a2463" />
        <rect x="264" y="182" width="14" height="14" rx="3" fill="#8fe8ff" />
        <rect x="288" y="182" width="14" height="14" rx="3" fill="#8fe8ff" />
        <rect x="270" y="212" width="22" height="34" rx="4" fill="#00b4d8" />
      </g>

      {/* barras do recurso, subindo à direita */}
      <g>
        <rect x="326" y="206" width="18" height="40" rx="5" fill="#c3cee4" />
        <rect x="350" y="180" width="18" height="66" rx="5" fill="#7fd7ea" />
        <rect x="374" y="146" width="18" height="100" rx="5" fill="url(#e360-ilu-bar)" />
      </g>

      {/* chão */}
      <rect x="40" y="246" width="352" height="6" rx="3" fill="#c3cee4" />

      {/* selo de conferência */}
      <g transform="translate(268 54)">
        <circle cx="34" cy="34" r="34" fill="#ffffff" />
        <circle cx="34" cy="34" r="27" fill="#00e5a0" fillOpacity=".16" />
        <path
          d="M22 34.5 30.5 43 47 26.5"
          fill="none"
          stroke="#00b278"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

// Cena do login: documento conferido + trilha de aprovação.
export function IlustracaoConferencia({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 260"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="Emenda conferida e encaminhada ao parecer"
    >
      <defs>
        <linearGradient id="e360-lg-doc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcecff" />
        </linearGradient>
      </defs>

      {/* documento de trás */}
      <rect
        x="66"
        y="34"
        width="150"
        height="192"
        rx="14"
        fill="#ffffff"
        fillOpacity=".18"
        transform="rotate(-7 141 130)"
      />
      {/* documento da frente */}
      <rect x="86" y="30" width="152" height="196" rx="14" fill="url(#e360-lg-doc)" />
      <g fill="#0a2463" fillOpacity=".18">
        <rect x="106" y="58" width="76" height="9" rx="4.5" />
        <rect x="106" y="82" width="112" height="7" rx="3.5" />
        <rect x="106" y="100" width="98" height="7" rx="3.5" />
        <rect x="106" y="118" width="112" height="7" rx="3.5" />
        <rect x="106" y="136" width="66" height="7" rx="3.5" />
      </g>
      {/* linha de valor destacada */}
      <rect x="106" y="160" width="86" height="14" rx="7" fill="#00b4d8" />
      <rect x="198" y="160" width="20" height="14" rx="7" fill="#00e5a0" />

      {/* selo de conferido */}
      <g transform="translate(190 158)">
        <circle cx="40" cy="40" r="34" fill="#00e5a0" />
        <path
          d="M27 40.5 36 49.5 54 31"
          fill="none"
          stroke="#061840"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* pontos da trilha */}
      <g fill="#ffffff" fillOpacity=".5">
        <circle cx="52" cy="70" r="6" />
        <circle cx="40" cy="126" r="4.5" />
        <circle cx="58" cy="182" r="5.5" />
      </g>
    </svg>
  );
}

// Marca d'água discreta para estados vazios.
export function IlustracaoVazio({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn("h-auto w-40", className)}
      aria-hidden
    >
      <rect x="34" y="18" width="92" height="84" rx="12" fill="#e3e9f2" />
      <rect x="50" y="40" width="44" height="8" rx="4" fill="#c3cee4" />
      <rect x="50" y="58" width="60" height="6" rx="3" fill="#d6deec" />
      <rect x="50" y="74" width="38" height="6" rx="3" fill="#d6deec" />
      <circle cx="118" cy="86" r="20" fill="#ffffff" />
      <circle cx="118" cy="86" r="14" fill="#e4f7fc" />
      <path
        d="M112 86h12M118 80v12"
        stroke="#00b4d8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
