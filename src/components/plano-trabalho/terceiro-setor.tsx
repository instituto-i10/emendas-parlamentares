"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AJUDA_DECLARACAO,
  DECLARACOES,
  ROTULO_DECLARACAO,
  type Assinatura,
  type DadosPlano,
} from "@/lib/plano-trabalho";
import { cpfValido } from "@/lib/assinatura";

// ---------------------------------------------------------------------------
// O que só o MODELO III pede: a entidade, as sete declarações e a assinatura.
//
// Tudo aqui é preenchido pela própria entidade, pelo link — nada disto aparece
// na tela do vereador. Meta física, preço praticado, regularidade e ficha dos
// dirigentes são informação que só ela tem, e assinar em nome de outro o que o
// outro é que sabe seria declaração sem valor.
// ---------------------------------------------------------------------------

const ASSINATURA_VAZIA: Assinatura = { nome: "", cpf: "", cargo: "", email: "" };

// Máscara só para leitura — o que vai ao banco são os dígitos.
const mascararCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const mascararCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export function DadosDaEntidade({
  valores,
  onChange,
  desabilitado = false,
}: {
  valores: DadosPlano;
  onChange: (v: DadosPlano) => void;
  desabilitado?: boolean;
}) {
  const alterar = (parcial: Partial<DadosPlano>) => onChange({ ...valores, ...parcial });
  const anos = valores.entidadeAnos;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ent-razao">Razão social</Label>
          <Input
            id="ent-razao"
            disabled={desabilitado}
            value={valores.entidadeRazaoSocial}
            onChange={(e) => alterar({ entidadeRazaoSocial: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-cnpj">CNPJ</Label>
          <Input
            id="ent-cnpj"
            inputMode="numeric"
            className="font-mono"
            disabled={desabilitado}
            value={mascararCnpj(valores.entidadeCnpj)}
            onChange={(e) => alterar({ entidadeCnpj: e.target.value.replace(/\D/g, "") })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-anos">
            Tempo de existência
            <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
              Em anos completos
            </span>
          </Label>
          <Input
            id="ent-anos"
            inputMode="numeric"
            className="tabular-nums"
            disabled={desabilitado}
            value={anos == null ? "" : String(anos)}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              alterar({ entidadeAnos: d === "" ? null : Number(d) });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-repassador">Órgão repassador</Label>
          <Input
            id="ent-repassador"
            disabled={desabilitado}
            value={valores.orgaoRepassador}
            onChange={(e) => alterar({ orgaoRepassador: e.target.value })}
          />
        </div>
      </div>

      <p className="rounded-[10px] bg-[var(--surf-info)] px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-[var(--on-info)]">
        A entidade precisa de <b>no mínimo 1 ano</b> de existência para receber
        repasse — art. 33, V, “a”, da Lei 13.019/2014. A pré-checagem confere.
      </p>
      {anos != null && anos < 1 ? (
        <p className="text-[12.5px] font-semibold text-destructive">
          Com menos de 1 ano a entidade não pode receber repasse.
        </p>
      ) : null}
    </div>
  );
}

export function DeclaracoesDaEntidade({
  valores,
  onChange,
  desabilitado = false,
}: {
  valores: DadosPlano;
  onChange: (v: DadosPlano) => void;
  desabilitado?: boolean;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {DECLARACOES.map((chave) => (
        <label
          key={chave}
          className="flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors has-[:checked]:border-[color-mix(in_srgb,var(--on-ok)_45%,transparent)] has-[:checked]:bg-[var(--surf-ok)]"
        >
          <input
            type="checkbox"
            className="size-4 shrink-0"
            disabled={desabilitado}
            checked={valores.declaracoes[chave]}
            onChange={(e) =>
              onChange({
                ...valores,
                declaracoes: { ...valores.declaracoes, [chave]: e.target.checked },
              })
            }
          />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold leading-tight">
              {ROTULO_DECLARACAO[chave]}
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
              {AJUDA_DECLARACAO[chave]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function AssinaturaDaEntidade({
  valores,
  onChange,
  desabilitado = false,
}: {
  valores: DadosPlano;
  onChange: (v: DadosPlano) => void;
  desabilitado?: boolean;
}) {
  const a = valores.assinatura ?? ASSINATURA_VAZIA;
  const alterar = (parcial: Partial<Assinatura>) =>
    onChange({ ...valores, assinatura: { ...a, ...parcial } });

  // Só reclama depois de o CPF estar completo: apontar erro a cada tecla é
  // ruído, não ajuda.
  const cpfCompleto = a.cpf.replace(/\D/g, "").length === 11;
  const cpfRuim = cpfCompleto && !cpfValido(a.cpf);

  return (
    <div className="grid gap-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Quem assina responde pelo que está neste plano. É <b>assinatura
        eletrônica simples</b> (Lei 14.063/2020, art. 4º, I): identificamos você
        e registramos data, endereço de origem e um resumo do conteúdo assinado.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ass-nome">Nome completo</Label>
          <Input
            id="ass-nome"
            disabled={desabilitado}
            value={a.nome}
            onChange={(e) => alterar({ nome: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ass-cpf">CPF</Label>
          <Input
            id="ass-cpf"
            inputMode="numeric"
            className="font-mono"
            aria-invalid={cpfRuim}
            disabled={desabilitado}
            value={mascararCpf(a.cpf)}
            onChange={(e) => alterar({ cpf: e.target.value.replace(/\D/g, "") })}
          />
          {cpfRuim ? (
            <p className="text-[12px] font-semibold text-destructive">
              Este CPF não confere. Verifique os dígitos.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ass-cargo">Cargo na entidade</Label>
          <Input
            id="ass-cargo"
            placeholder="Presidente, diretor, procurador…"
            disabled={desabilitado}
            value={a.cargo}
            onChange={(e) => alterar({ cargo: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ass-email">E-mail</Label>
          <Input
            id="ass-email"
            type="email"
            disabled={desabilitado}
            value={a.email}
            onChange={(e) => alterar({ email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
