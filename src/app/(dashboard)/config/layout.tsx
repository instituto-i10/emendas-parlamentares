import type { ReactNode } from "react";
import { requirePermissao } from "@/lib/access";

// Guard: Configurações exige a permissão de administrar configurações.
export default async function ConfigLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermissao("administrarConfiguracoes");
  return <>{children}</>;
}
