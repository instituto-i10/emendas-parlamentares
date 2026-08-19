"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { perguntarAoAssistente } from "@/lib/actions/assistente";

const SUGESTOES = [
  "Qual o teto e como está dividido?",
  "A reserva da saúde está sendo respeitada?",
  "Quais os maiores destinos?",
  "Quem está acima da cota?",
];

type Msg = { de: "user" | "bot"; texto: string; local?: boolean };

const ABERTURA: Msg = {
  de: "bot",
  texto:
    "Respondo sobre os dados do exercício ativo — teto, cota, reserva da saúde, destinos e situação das emendas. Não decido mérito: isso é do relator.",
};

// Assistente flutuante, presente em todo o sistema. O painel é um diálogo
// modal-less no canto inferior direito: não bloqueia a tela por trás, que é
// justamente o que se quer consultar enquanto pergunta.
export function AssistenteWidget() {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([ABERTURA]);
  const [texto, setTexto] = useState("");
  const [pendente, iniciar] = useTransition();
  const log = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pendente]);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  function perguntar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || pendente) return;
    const historico = msgs.slice(1).map((m) => ({ de: m.de, texto: m.texto }));
    setMsgs((m) => [...m, { de: "user", texto: p }]);
    setTexto("");
    iniciar(async () => {
      const r = await perguntarAoAssistente(p, historico);
      setMsgs((m) => [
        ...m,
        {
          de: "bot",
          texto: r.erro ? `${r.erro}\n\n${r.texto}` : r.texto,
          local: !r.modelo,
        },
      ]);
    });
  }

  return (
    <>
      {/* botão flutuante */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente"}
        className={cn(
          "fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full text-white shadow-[0_10px_30px_-8px_rgba(6,24,64,.55)] transition-transform hover:-translate-y-0.5",
          aberto ? "bg-primary" : "grad-main"
        )}
      >
        {aberto ? (
          <X className="size-6" aria-hidden />
        ) : (
          <Sparkles className="size-6" aria-hidden />
        )}
      </button>

      {/* painel */}
      {aberto ? (
        <div
          role="dialog"
          aria-label="Assistente Emendas360"
          className="fixed bottom-24 right-5 z-50 flex h-[min(560px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_-20px_rgba(6,24,64,.5)] ring-1 ring-foreground/10"
        >
          <div className="grad-dark flex items-center gap-2.5 px-4 py-3.5 text-white">
            <span className="grid size-8 place-items-center rounded-[10px] bg-white/10">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold">Assistente</div>
              <div className="text-[10.5px] font-medium text-white/60">
                responde sobre o exercício ativo
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="ml-auto grid size-7 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div
            ref={log}
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed",
                  m.de === "user"
                    ? "self-end rounded-br-md bg-primary text-primary-foreground"
                    : "self-start rounded-bl-md bg-secondary"
                )}
              >
                {m.texto}
              </div>
            ))}
            {pendente ? (
              <div className="flex gap-1 self-start rounded-2xl rounded-bl-md bg-secondary px-4 py-3.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {msgs.length <= 1 ? (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => perguntar(s)}
                  className="rounded-[10px] bg-secondary px-2.5 py-1.5 text-left text-[11.5px] font-semibold text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t p-3">
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") perguntar(texto);
              }}
              placeholder="Pergunte sobre o exercício…"
              aria-label="Sua pergunta"
              className="h-9 flex-1 rounded-[10px] bg-secondary px-3 text-[12.5px] font-medium outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              onClick={() => perguntar(texto)}
              disabled={pendente || !texto.trim()}
              className="h-9 shrink-0 rounded-[10px] bg-primary px-3.5 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-[var(--primary-600)] disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
