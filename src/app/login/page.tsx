import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { LogoEmendas360 } from "@/components/logo-emendas360";
import { IlustracaoConferencia } from "@/components/e360/ilustracoes";

// O acesso rápido é ferramenta de demonstração. Fica ligado por padrão (o
// projeto é um protótipo com contas públicas em docs/contas-demo.md) e sai do
// ar com DEMO_LOGIN=false.
const DEMO = process.env.DEMO_LOGIN !== "false";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* painel da marca — só a partir de lg, para o formulário mandar no mobile */}
      <aside className="grad-dark relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-cyan/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-brand-mint/10 blur-3xl"
          aria-hidden
        />

        <LogoEmendas360 className="relative" />

        {/* Centralizado para acompanhar a ilustração, que já é centrada.
            Largura maior que a da ilustração: o título tem de caber numa linha
            só, e a coluna de 440px o quebrava em duas. */}
        <div className="relative mx-auto my-8 w-full max-w-[600px] text-center">
          <IlustracaoConferencia className="mx-auto mb-10 w-full max-w-[330px]" />
          {/* Título curto + a segunda frase do jurídico do cliente como
              subtítulo. "Pré-checagem" já está no título, então a frase dele
              entra sem o "fazendo uma pré-checagem" do fim, que repetiria. */}
          {/* `whitespace-nowrap` + corpo que cresce com a tela: o painel só
              existe a partir de lg, e no lg mais estreito o título a 26px não
              cabe numa linha. */}
          <h2 className="whitespace-nowrap text-[21px] font-extrabold leading-tight tracking-[-.03em] xl:text-[24px] 2xl:text-[26px]">
            A pré-checagem antes de a emenda seguir
          </h2>
          <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed text-white/70">
            A ferramenta auxilia na análise da documentação fazendo uma
            pré-checagem.
          </p>
        </div>

        <div className="relative flex gap-8">
          {[
            ["Pré-checagem", "condições de validade"],
            ["Documentação", "análise assistida"],
            ["Portal", "consulta sem login"],
          ].map(([t, s]) => (
            <div key={t}>
              <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-brand-mint">
                {t}
              </div>
              <div className="text-[13px] font-semibold text-white/80">{s}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[400px]">
          <Link
            href="/publica"
            className="mb-8 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar ao portal público
          </Link>

          <h1 className="text-[26px] font-extrabold tracking-[-.03em]">
            Entrar na plataforma
          </h1>
          <p className="mb-7 mt-1.5 text-[13px] font-medium text-muted-foreground">
            Gestão de emendas parlamentares ao orçamento municipal.
          </p>

          <LoginForm demo={DEMO} avisoSemPerfil={erro === "sem-perfil"} />
        </div>
      </main>
    </div>
  );
}
