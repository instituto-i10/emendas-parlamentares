// ---------------------------------------------------------------------------
// Marca de campo obrigatório.
//
// O asterisco é `aria-hidden` de propósito: sozinho ele é decoração, e um leitor
// de tela anunciando "asterisco" não diz nada a ninguém. Quem carrega a
// informação para a tecnologia assistiva é o `aria-required` no PRÓPRIO campo —
// por isso todo uso deste componente vem acompanhado dele.
//
// E "obrigatório" aqui quer dizer obrigatório para REMETER, não para salvar: o
// rascunho é gravado com o que houver, e essa é uma decisão de produto que a
// legenda precisa dizer em voz alta, senão o asterisco assusta quem só queria
// guardar o trabalho pela metade.
// ---------------------------------------------------------------------------
export function Obrigatorio() {
  return (
    <span aria-hidden className="ml-0.5 font-bold text-destructive">
      *
    </span>
  );
}

export function LegendaObrigatorios({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-[12px] leading-relaxed text-muted-foreground"}>
      <span aria-hidden className="font-bold text-destructive">
        *
      </span>{" "}
      Campos obrigatórios <b>para remeter</b> a emenda. O rascunho pode ser salvo
      a qualquer momento, mesmo pela metade.
    </p>
  );
}
