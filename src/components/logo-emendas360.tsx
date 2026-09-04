import { cn } from "@/lib/utils";

// Marca do Instituto i10 (mantenedor) — texto no padrão da identidade até o
// arquivo oficial do logo ser fornecido (trocar aqui quando existir).
export function LogoI10({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col items-center leading-none", className)}>
      <span className="rounded-[9px] bg-white/10 px-2 py-1 text-[15px] font-extrabold tracking-tight">
        <span className="text-white">i</span>
        <span className="text-brand-mint">10</span>
      </span>
      <span className="mt-0.5 text-[7px] font-semibold uppercase tracking-[1.5px] text-[#9fb4d8]">
        Instituto
      </span>
    </span>
  );
}

// Marca Emendas360: três barras cyan→mint + wordmark. Vive sobre superfície
// navy — o menu lateral no app, o cabeçalho escuro na visão pública e no login.
export function LogoEmendas360({
  tamanho = 30,
  compacta = false,
  className,
  classeTexto,
}: {
  tamanho?: number;
  compacta?: boolean;
  className?: string;
  /**
   * Classes do WORDMARK. Serve para escondê-lo por breakpoint sem transformar
   * isto em duas marcas diferentes: no trilho estreito do menu sobra espaço
   * para o ícone e mais nada, e o texto vazava por cima do conteúdo.
   */
  classeTexto?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {compacta ? null : (
        // Abaixo de 360px a marca do mantenedor sai de cena: numa tela dessas
        // ela custaria ~60px e empurraria a ação do cabeçalho para fora.
        <span className="hidden items-center gap-2.5 min-[360px]:flex">
          <LogoI10 />
          <span className="h-7 w-px bg-white/20" aria-hidden />
        </span>
      )}
      <svg
        viewBox="0 0 48 48"
        className="shrink-0"
        style={{ width: tamanho, height: tamanho }}
        aria-label="Emendas 360"
      >
        <rect width="48" height="48" rx="13" fill="rgba(255,255,255,.08)" />
        <rect x="9.5" y="27" width="8" height="12" rx="2.6" fill="#00B4D8" />
        <rect x="20" y="19.5" width="8" height="19.5" rx="2.6" fill="#00CFC2" />
        <rect x="30.5" y="10" width="8" height="29" rx="2.6" fill="#00E5A0" />
      </svg>
      <span className={cn("flex flex-col gap-0.5 leading-none", classeTexto)}>
        <span className="text-[19px] font-extrabold tracking-[-.02em]">
          <span className="text-brand-cyan">Emendas</span>
          <span className="text-brand-mint">360</span>
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[2px] text-[#9fb4d8]">
          Orçamento impositivo
        </span>
      </span>
    </span>
  );
}
