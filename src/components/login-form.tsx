"use client";

import { useActionState, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar360 } from "@/components/e360/avatar";
import { entrar, type LoginState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

// Contas de demonstração do seed (`src/lib/seed-data.ts`, docs/contas-demo.md).
// O painel de acesso rápido só aparece quando `demo` é verdadeiro — a página
// decide isso a partir de DEMO_LOGIN.
type Conta = {
  nome: string;
  papel: string;
  email: string;
  /** Marca a conta que consegue apresentar emenda (precisa de Autor vinculado). */
  apresenta?: boolean;
};

const PERFIS: { grupo: string; contas: Conta[] }[] = [
  {
    grupo: "Acesso master",
    contas: [
      {
        nome: "Administrador Geral",
        papel: "acesso total; compõe os perfis",
        email: "super@municipio.gov.br",
      },
    ],
  },
  {
    grupo: "Câmara",
    contas: [
      {
        nome: "Presidente da Câmara",
        papel: "apresenta, tramita e administra",
        email: "presidente@camara.gov.br",
        apresenta: true,
      },
      {
        nome: "Comissão de Finanças",
        papel: "gere e tramita; não apresenta",
        email: "comissao@camara.gov.br",
      },
      {
        nome: "Vereador Exemplo",
        papel: "gabinete: a própria cota",
        email: "vereador@camara.gov.br",
        apresenta: true,
      },
    ],
  },
  {
    grupo: "Prefeitura",
    contas: [
      {
        nome: "Poder Executivo",
        papel: "planejamento, viabilidade e execução",
        email: "executivo@municipio.gov.br",
      },
    ],
  },
];

const SENHA_DEMO = "mudar@123";

export function LoginForm({
  demo = false,
  avisoSemPerfil = false,
}: {
  demo?: boolean;
  // A conta autenticou, mas não tem perfil de acesso — ou a sessão é anterior
  // à implantação dos perfis. Aviso, não erro: não há nada a corrigir aqui.
  avisoSemPerfil?: boolean;
}) {
  const [erro, action, pending] = useActionState<LoginState, FormData>(
    entrar,
    null
  );
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aberto, setAberto] = useState(false);

  // O acesso rápido preenche o formulário e envia — é o mesmo caminho do
  // usuário, pelo provider de credenciais, sem atalho de autenticação.
  //
  // O `flushSync` não é decoração: sem ele o `requestSubmit` dispara antes do
  // React escrever os valores no DOM, os campos ainda estão vazios, o
  // `required` do HTML barra o envio em silêncio e o clique não faz nada.
  function entrarComo(emailDaConta: string) {
    flushSync(() => {
      setEmail(emailDaConta);
      setSenha(SENHA_DEMO);
    });
    form.current?.requestSubmit();
  }

  return (
    <div className="space-y-5">
      {avisoSemPerfil && !erro ? (
        <p
          role="status"
          className="rounded-lg bg-[var(--surf-warn)] px-3 py-2.5 text-[12.5px] font-semibold text-[var(--on-warn)]"
        >
          Sua conta ainda não tem um perfil de acesso. Procure o administrador
          do sistema para receber o seu.
        </p>
      ) : null}
      <form ref={form} action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@camara.gov.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        {erro ? (
          <p
            role="alert"
            className="rounded-lg bg-[var(--surf-bad)] px-3 py-2.5 text-[12.5px] font-semibold text-[var(--on-bad)]"
          >
            {erro}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      {demo ? (
        <div className="rounded-xl bg-secondary p-1.5">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-[12.5px] font-bold">
                Acesso rápido de demonstração
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                escolha um perfil para testar
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                aberto && "rotate-180"
              )}
              aria-hidden
            />
          </button>

          {aberto ? (
            <div className="max-h-[290px] space-y-3 overflow-y-auto px-1.5 pb-1.5 pt-1">
              {PERFIS.map((g) => (
                <div key={g.grupo}>
                  <div className="eyebrow px-1.5 pb-1 pt-1.5">{g.grupo}</div>
                  <div className="space-y-1">
                    {g.contas.map((c) => (
                      <button
                        key={c.email}
                        type="button"
                        disabled={pending}
                        onClick={() => entrarComo(c.email)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] bg-card px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <Avatar360 nome={c.nome} tamanho="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold">
                            {c.nome}
                          </span>
                          <span className="block truncate text-[11px] font-medium text-muted-foreground">
                            {c.papel}
                          </span>
                        </span>
                        {c.apresenta ? (
                          <span className="shrink-0 rounded-full bg-[var(--surf-ok)] px-2 py-0.5 text-[9.5px] font-bold text-[var(--on-ok)]">
                            apresenta emenda
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
