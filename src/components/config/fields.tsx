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
        className={controle}
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
