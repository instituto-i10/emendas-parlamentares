"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanoTrabalhoCampos } from "./campos";
import {
  AssinaturaDaEntidade,
  DadosDaEntidade,
  DeclaracoesDaEntidade,
} from "./terceiro-setor";
import {
  assinarPlanoPorToken,
  salvarPlanoPorToken,
  type PlanoPorToken,
} from "@/lib/actions/plano-trabalho";
import { pendenciasDoPlano, type DadosPlano } from "@/lib/plano-trabalho";
import { cpfValido } from "@/lib/assinatura";

// ---------------------------------------------------------------------------
// A tela que a ENTIDADE abre pelo link.
//
// Deliberadamente enxuta: número da emenda, objeto, valor e autor — o bastante
// para ela saber do que se trata e conferir que o pedido é legítimo, sem abrir
// o resto do processo legislativo. Daí para baixo é o que só ela sabe: metas,
// preço praticado, forma de comprovação, regularidade e ficha dos dirigentes.
//
// O valor da emenda é do vereador e aparece em leitura. A entidade fecha a
// memória de cálculo COM ele; não o define.
// ---------------------------------------------------------------------------

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {descricao ? (
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{descricao}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

export function PlanoEntidade({
  token,
  plano,
}: {
  token: string;
  plano: PlanoPorToken;
}) {
  const [valores, setValores] = useState<DadosPlano>(plano.dados);
  const [assinadoEm, setAssinadoEm] = useState(plano.assinadoEm);
  const [pending, start] = useTransition();

  // A entidade responde pelo conteúdo do plano. Teto por autor, reserva da
  // saúde e aderência à LDO são conferências da Câmara e não aparecem aqui.
  const pendencias = useMemo(
    () => pendenciasDoPlano({ ...valores, assinatura: null }, "TERCEIRO_SETOR", plano.valor),
    [valores, plano.valor]
  );
  // A assinatura entra separada: ela é o último passo, e listá-la junto faria
  // a tela dizer "falta assinar" antes de haver o que assinar.
  const faltaConteudo = pendencias.filter(
    (p) => !p.includes("assinatura do representante")
  );

  const a = valores.assinatura;
  const assinaturaCompleta =
    !!a && a.nome.trim().length >= 3 && cpfValido(a.cpf) && a.cargo.trim() && a.email.trim();
  const podeAssinar = faltaConteudo.length === 0 && assinaturaCompleta && !assinadoEm;

  function salvar() {
    start(async () => {
      const r = await salvarPlanoPorToken(token, a?.nome || "Entidade", valores);
      toast[r.ok ? "success" : "error"](
        r.ok ? "Salvo. A Câmara só recebe quando você assinar e enviar." : r.error
      );
    });
  }

  function assinarEEnviar() {
    if (!a) return;
    start(async () => {
      // Grava o conteúdo antes de assinar: o hash é calculado sobre o que está
      // no banco, e assinar sem salvar assinaria a versão anterior.
      const salvo = await salvarPlanoPorToken(token, a.nome, valores);
      if (!salvo.ok) {
        toast.error(salvo.error);
        return;
      }
      const r = await assinarPlanoPorToken(token, a);
      if (r.ok) {
        setAssinadoEm(new Date().toISOString());
        toast.success("Plano assinado e enviado à Câmara.");
      } else {
        toast.error(r.error);
      }
    });
  }

  if (assinadoEm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-base">
            <CheckCircle2 className="size-5 text-[var(--on-ok)]" aria-hidden />
            Plano assinado e enviado à Câmara
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
            Pronto. O plano de trabalho já aparece na emenda do vereador autor, e
            a Câmara vai conferir se a memória de cálculo e o cronograma fecham
            com o valor da emenda. Se algo precisar de ajuste, ela devolve por
            este mesmo link.
          </p>
          <div className="rounded-xl bg-secondary p-4 text-[12.5px] leading-relaxed">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Comprovante
            </p>
            <p>
              Assinado por <b>{a?.nome}</b>
              {a?.cargo ? `, ${a.cargo},` : ""} em{" "}
              <b>{new Date(assinadoEm).toLocaleString("pt-BR")}</b>.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Assinatura eletrônica simples — Lei 14.063/2020, art. 4º, I.
              Ficaram registrados o endereço de origem, a data e um resumo do
              conteúdo assinado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-.03em]">
          Plano de trabalho
        </h1>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-muted-foreground">
          O gabinete de <b>{plano.autor}</b> apresentou a emenda{" "}
          <b>{plano.numero}</b> ao orçamento municipal, destinada a{" "}
          <b>{plano.beneficiario ?? "sua entidade"}</b>, e precisa que você
          preencha o plano de trabalho. Não é preciso ter conta no sistema.
        </p>
      </div>

      <Secao titulo="A emenda que originou este pedido">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold text-muted-foreground">
              Valor da emenda
            </dt>
            <dd className="text-base font-extrabold tabular-nums">{brl(plano.valor)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-muted-foreground">Objeto</dt>
            <dd className="text-[13px] leading-relaxed">{plano.objeto}</dd>
          </div>
        </dl>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          O valor é definido pelo vereador autor e não pode ser alterado aqui. A
          memória de cálculo e o cronograma precisam fechar com ele.
        </p>
      </Secao>

      <Secao titulo="A entidade">
        <DadosDaEntidade valores={valores} onChange={setValores} desabilitado={pending} />
      </Secao>

      <Secao
        titulo="O plano"
        descricao="Meta física, preço praticado e forma de comprovação são informação que só a sua entidade tem — por isso a Câmara envia este formulário em vez de preencher por você."
      >
        <PlanoTrabalhoCampos
          valores={valores}
          onChange={setValores}
          valorEmenda={plano.valor}
          desabilitado={pending}
        />
      </Secao>

      <Secao
        titulo="Declarações da entidade"
        descricao="Itens obrigatórios da declaração da OSC. Marque o que a entidade pode afirmar; eles seguem com o plano e ficam registrados junto da emenda."
      >
        <DeclaracoesDaEntidade
          valores={valores}
          onChange={setValores}
          desabilitado={pending}
        />
      </Secao>

      <Secao titulo="Assinatura do representante legal">
        <AssinaturaDaEntidade
          valores={valores}
          onChange={setValores}
          desabilitado={pending}
        />
      </Secao>

      {faltaConteudo.length > 0 ? (
        <div className="rounded-xl bg-[var(--surf-warn)] p-4 text-[12.5px] leading-relaxed text-[var(--on-warn)]">
          <p className="mb-1.5 font-bold">Antes de enviar, falta:</p>
          <ul className="list-inside list-disc space-y-1">
            {faltaConteudo.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={assinarEEnviar} disabled={pending || !podeAssinar}>
          <ShieldCheck className="size-4" aria-hidden /> Assinar e enviar à Câmara
        </Button>
        <Button variant="outline" onClick={salvar} disabled={pending}>
          Salvar sem enviar
        </Button>
        <span className="text-[12px] font-medium text-muted-foreground">
          {faltaConteudo.length > 0
            ? "Complete os itens acima para poder assinar."
            : assinaturaCompleta
              ? "Tudo o que a Câmara precisa está preenchido."
              : "Preencha a identificação de quem assina."}
        </span>
      </div>
    </div>
  );
}
