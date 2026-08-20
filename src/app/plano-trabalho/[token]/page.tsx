import { LogoEmendas360 } from "@/components/logo-emendas360";
import { PlanoEntidade } from "@/components/plano-trabalho/entidade";
import { buscarPlanoPorToken } from "@/lib/actions/plano-trabalho";

// Página SEM login: a entidade beneficiária chega por um link que o gabinete
// enviou. O token é a única credencial, e por isso a rota não expõe nada além
// do necessário para preencher — nem lista de emendas, nem outros dados do
// processo.
export const dynamic = "force-dynamic";

export default async function PlanoPorTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const plano = await buscarPlanoPorToken(token);

  return (
    <div className="min-h-screen bg-background">
      {/* A marca é desenhada para superfície navy — daí o cabeçalho escuro. */}
      <header className="grad-dark">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <LogoEmendas360 />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {!plano ? (
          <div className="rounded-xl border p-8 text-center">
            <h1 className="text-lg font-extrabold tracking-[-.02em]">
              Link inválido ou expirado
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
              Este endereço não está mais válido. Pode ter expirado, ter sido
              revogado, ou a emenda já ter seguido para tramitação. Peça um novo
              link ao gabinete que entrou em contato com você.
            </p>
          </div>
        ) : (
          <PlanoEntidade token={token} plano={plano} />
        )}
      </main>
    </div>
  );
}
