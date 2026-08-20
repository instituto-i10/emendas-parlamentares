import { PageHeader } from "@/components/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { listarExercicios } from "@/lib/exercicio";
import {
  listarAuditoria,
  listarBeneficiarios,
  listarInstrumentos,
  listarNormas,
  listarNormasAtivas,
  listarParametros,
  listarProjetosDeLei,
  listarUsuarios,
  sugerirDuplicadosBeneficiarios,
} from "@/lib/queries";
import { ParametrosTab } from "@/components/config/parametros-tab";
import { NormasTab } from "@/components/config/normas-tab";
import { InstrumentosTab } from "@/components/config/instrumentos-tab";
import { UsuariosTab } from "@/components/config/usuarios-tab";
import { AuditoriaTab } from "@/components/config/auditoria-tab";
import { BeneficiariosTab } from "@/components/config/beneficiarios-tab";

export default async function ConfigPage() {
  const [
    parametros,
    normas,
    normasAtivas,
    instrumentos,
    projetosDeLei,
    usuarios,
    exercicios,
    auditoria,
    beneficiarios,
    duplicados,
  ] = await Promise.all([
    listarParametros(),
    listarNormas(),
    listarNormasAtivas(),
    listarInstrumentos(),
    listarProjetosDeLei(),
    listarUsuarios(),
    listarExercicios(),
    listarAuditoria(),
    listarBeneficiarios(),
    sugerirDuplicadosBeneficiarios(),
  ]);

  const exOpc = exercicios.map((e) => ({ id: e.id, ano: e.ano }));
  const logs = auditoria.map((l) => ({
    id: l.id,
    criadoEm: new Date(l.criadoEm).toLocaleString("pt-BR"),
    usuario: l.usuario?.name ?? l.usuario?.email ?? "—",
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    acao: l.acao,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Configurações"
        crumbs={[{ titulo: "Hub", href: "/hub" }, { titulo: "Configurações" }]}
      />

      <Tabs defaultValue="parametros">
        {/* seis abas não cabem em 375px: a faixa rola na horizontal, como as
            Subtabs do resto do sistema, em vez de estourar a tela. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
            <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
            <TabsTrigger value="normas">Normas</TabsTrigger>
            <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="parametros" className="mt-4">
          <ParametrosTab
            parametros={parametros}
            exercicios={exOpc}
            normasAtivas={normasAtivas}
          />
        </TabsContent>
        <TabsContent value="beneficiarios" className="mt-4">
          <BeneficiariosTab beneficiarios={beneficiarios} duplicados={duplicados} />
        </TabsContent>
        <TabsContent value="normas" className="mt-4">
          <NormasTab normas={normas} />
        </TabsContent>
        <TabsContent value="instrumentos" className="mt-4">
          <InstrumentosTab
            instrumentos={instrumentos}
            exercicios={exOpc}
            projetosDeLei={projetosDeLei}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab usuarios={usuarios} />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-4">
          <AuditoriaTab logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
