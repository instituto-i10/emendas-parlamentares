import { cn } from "@/lib/utils";

// Paleta de discos: derivada da identidade, determinística pelo nome — a mesma
// pessoa recebe sempre a mesma cor em qualquer tela.
const DISCOS = [
  "bg-brand-cyan text-white",
  "bg-brand-navy text-white",
  "bg-brand-mint text-brand-deep",
  "bg-brand-purple text-white",
  "bg-brand-amber text-brand-deep",
  "bg-[#0779a8] text-white",
] as const;

function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p));
  const primeira = partes[0]?.[0] ?? nome[0] ?? "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function indiceDoNome(nome: string): number {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return soma % DISCOS.length;
}

const TAMANHO = {
  sm: "size-7 text-[10.5px]",
  md: "size-9 text-[12px]",
  lg: "size-11 text-[14px]",
} as const;

// Avatar de iniciais no padrão `.av-initials` da referência: disco colorido com
// as iniciais. Substitui foto — o sistema não guarda imagem de pessoa e nomes
// de parlamentares são dado público.
export function Avatar360({
  nome,
  tamanho = "md",
  className,
}: {
  nome: string;
  tamanho?: keyof typeof TAMANHO;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold tracking-[-.02em] select-none",
        DISCOS[indiceDoNome(nome)],
        TAMANHO[tamanho],
        className
      )}
      title={nome}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
