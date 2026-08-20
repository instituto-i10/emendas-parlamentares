import Link from "next/link";
import { LogoEmendas360 } from "@/components/logo-emendas360";
import { SecTitle } from "@/components/e360/sec-title";
import { Card360 } from "@/components/e360/card360";
import { Tag360, tomDoStatus } from "@/components/e360/tag360";
import { Banner } from "@/components/e360/banner";
import {
  listarEmendasPublicas,
  opcoesFiltrosPublicos,
} from "@/lib/queries-publicas";
import { ROTULO_STATUS_EMENDA } from "@/lib/rotulos";
import { brl } from "@/lib/queries-360";
import { Search } from "lucide-react";

// Portal público de emendas: busca e filtros em meio eletrônico — a
// "transparência ativa" exigida pelo STF (ADPF 854) e cobrada pelo TCE-SP.
export default async function PortalEmendasPage({
  searchParams,
}: {
  searchParams: Promise<{
    ano?: string;
    autor?: string;
    status?: string;
    q?: string;
    pagina?: string;
  }>;
}) {
  const sp = await searchParams;
  const filtros = {
    ano: sp.ano ? Number(sp.ano) : null,
    autorId: sp.autor,
    status: sp.status,
    q: sp.q?.trim() || undefined,
    pagina: sp.pagina ? Number(sp.pagina) : 1,
  };
  const [{ total, pagina, paginas, emendas }, opcoes] = await Promise.all([
    listarEmendasPublicas(filtros),
    opcoesFiltrosPublicos(),
  ]);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ano: sp.ano, autor: sp.autor, status: sp.status, q: sp.q, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v != null && String(v).length > 0) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const controle =
    "h-9 rounded-[10px] bg-secondary px-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grad-dark text-white">
        <div className="flex h-14 min-w-0 items-center gap-3 px-4 sm:px-5 lg:px-7">
          <Link href="/publica" className="min-w-0 shrink">
            <LogoEmendas360 />
          </Link>
          <Link
            href="/login"
            className="ml-auto shrink-0 whitespace-nowrap rounded-[10px] bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 sm:px-4"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="w-full flex-1 px-5 pb-14 pt-6 lg:px-7">
        <Banner tom="ok" icone={Search}>
          <b>Consulta pública de emendas</b> — todas as emendas parlamentares,
          com autor, valor, beneficiário e situação. Busque e filtre à vontade.
        </Banner>

        <SecTitle
          titulo="Emendas parlamentares — consulta pública"
          nota={`${total} emenda(s) encontrada(s)`}
        />

        {/* Filtros — GET simples: funciona sem JavaScript */}
        <form className="mb-4 flex flex-wrap items-center gap-2" method="GET">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por objeto, beneficiário ou autor…"
            className={`${controle} min-w-60 flex-1`}
          />
          <select name="ano" defaultValue={sp.ano ?? ""} className={`${controle} campo-select pl-3 pr-9`}>
            <option value="">Todos os exercícios</option>
            {opcoes.exercicios.map((e) => (
              <option key={e.ano} value={e.ano}>{e.ano}</option>
            ))}
          </select>
          <select name="autor" defaultValue={sp.autor ?? ""} className={`${controle} campo-select pl-3 pr-9`}>
            <option value="">Todos os autores</option>
            {opcoes.autores.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={`${controle} campo-select pl-3 pr-9`}>
            <option value="">Todas as situações</option>
            {opcoes.statusPublicos.map((s) => (
              <option key={s} value={s}>{ROTULO_STATUS_EMENDA[s] ?? s}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-[10px] bg-primary px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-[var(--primary-600)]"
          >
            Filtrar
          </button>
          {sp.q || sp.ano || sp.autor || sp.status ? (
            <Link href="/publica/emendas" className="text-xs font-bold text-brand-cyan hover:underline">
              limpar
            </Link>
          ) : null}
        </form>

        <Card360>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Nº/Ano", "Autor", "Objeto", "Beneficiário", "Valor", "Situação"].map((h) => (
                    <th
                      key={h}
                      className="border-b-2 border-border px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emendas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2.5 py-8 text-center text-muted-foreground">
                      Nenhuma emenda encontrada com esses filtros.
                    </td>
                  </tr>
                ) : (
                  emendas.map((e) => (
                    <tr key={e.id}>
                      <td className="border-b border-border px-2.5 py-2 whitespace-nowrap font-bold">
                        <Link
                          href={`/publica/emendas/${e.id}`}
                          className="hover:text-brand-cyan hover:underline"
                        >
                          {e.numero}/{e.ano} ›
                        </Link>
                      </td>
                      <td className="border-b border-border px-2.5 py-2 whitespace-nowrap">{e.autor}</td>
                      <td className="max-w-80 border-b border-border px-2.5 py-2">
                        <span className="line-clamp-2">{e.objeto}</span>
                      </td>
                      <td className="border-b border-border px-2.5 py-2">
                        {e.beneficiario ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="border-b border-border px-2.5 py-2 whitespace-nowrap font-semibold tabular-nums">
                        {brl(e.valor)}
                      </td>
                      <td className="border-b border-border px-2.5 py-2">
                        <Tag360 tom={tomDoStatus(e.status)}>
                          {ROTULO_STATUS_EMENDA[e.status] ?? e.status}
                        </Tag360>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paginas > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-3 text-[11.5px] font-semibold text-muted-foreground">
              {pagina > 1 ? (
                <Link
                  className="text-accent-foreground hover:underline"
                  href={qs({ pagina: pagina - 1 })}
                >
                  ← anterior
                </Link>
              ) : null}
              <span>
                página {pagina} de {paginas}
              </span>
              {pagina < paginas ? (
                <Link
                  className="text-accent-foreground hover:underline"
                  href={qs({ pagina: pagina + 1 })}
                >
                  próxima →
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card360>

        <p className="mt-4 text-[13px] text-muted-foreground">
          Veja também: <Link href="/publica" className="font-bold text-brand-cyan hover:underline">panorama geral</Link>
          {" · "}
          <Link href="/publica/manual" className="font-bold text-brand-cyan hover:underline">manual das emendas impositivas</Link>
        </p>
      </main>
    </div>
  );
}
