// Título de seção: h2 forte + nota. Sem barrinha decorativa — o peso da fonte
// já separa a seção do que vem antes.
export function SecTitle({
  titulo,
  nota,
  className,
}: {
  titulo: string;
  nota?: string;
  className?: string;
}) {
  return (
    <div className={`mb-3.5 mt-7 flex flex-wrap items-baseline gap-3 ${className ?? ""}`}>
      <h2 className="text-[19px] font-extrabold tracking-[-.02em]">{titulo}</h2>
      {nota ? (
        <small className="text-[12.5px] font-medium text-muted-foreground">
          {nota}
        </small>
      ) : null}
    </div>
  );
}
