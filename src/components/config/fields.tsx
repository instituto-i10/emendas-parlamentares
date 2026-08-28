import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const controle =
  "flex h-9 w-full rounded-[10px] border border-input bg-card px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function TextField({
  name,
  label,
  required,
  type = "text",
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <textarea
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className={`${controle} min-h-20 py-2`}
      />
    </div>
  );
}

export type Opcao = { value: string; label: string };

export function SelectField({
  name,
  label,
  required,
  options,
  defaultValue,
  placeholder = "Selecione…",
}: {
  name: string;
  label: string;
  required?: boolean;
  options: Opcao[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={`${controle} campo-select pl-3 pr-9`}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Caixa de verificação para compor permissões de um perfil de acesso. O rótulo
// carrega uma linha de apoio: quem monta o perfil precisa saber o que a
// permissão abre, não só o nome dela.
export function CheckboxField({
  name,
  label,
  ajuda,
  defaultChecked,
}: {
  name: string;
  label: string;
  ajuda?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-input p-3 transition-colors hover:bg-muted/40"
    >
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        {ajuda ? (
          <span className="block text-xs leading-snug text-muted-foreground">
            {ajuda}
          </span>
        ) : null}
      </span>
    </label>
  );
}
