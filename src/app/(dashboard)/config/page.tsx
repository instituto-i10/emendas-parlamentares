import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import { podeAtribuirPerfil, podeGerirPerfis } from "@/lib/authz";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  listarPerfis,
  sugerirDuplicadosBeneficiarios,
} from "@/lib/queries";
import { ParametrosTab } from "@/components/config/parametros-tab";
import { NormasTab } from "@/components/config/normas-tab";
import { InstrumentosTab } from "@/components/config/instrumentos-tab";
import { UsuariosTab } from "@/components/config/usuarios-tab";
import { PerfisTab } from "@/components/config/perfis-tab";
import { AuditoriaTab } from "@/components/config/auditoria-tab";
import { ConfigTabs } from "@/components/config/config-tabs";
import { BeneficiariosTab } from "@/components/config/beneficiarios-tab";

// Abas endereçáveis por URL (?aba=), lidas no cliente por ConfigTabs: é o que
// permite ao menu lateral apontar direto para Usuários e Perfis, em vez de
// sempre cair em Parâmetros.
const ABAS = [
  "parametros",
  "beneficiarios",
  "normas",
  "instrumentos",
  "usuarios",
  "perfis",
  "auditoria",
] as const;

export default async function ConfigPage() {
  const user = await getCurrentUser();
  // A aba Perfis é exclusiva do Administrador Geral: oculta aqui E bloqueada
  // no servidor pelas actions — esconder a aba, sozinho, não é controle.
  const gerePerfis = podeGerirPerfis(user);

  // "Perfis" só existe para quem a compõe; aba inválida (ou proibida) cai em
  // Parâmetros — link torto não pode render tela em branco.
  const abasValidas = ABAS.filter((a) => a !== "perfis" || gerePerfis);

  const [
    parametros,
    normas,
    normasAtivas,
    instrumentos,
    projetosDeLei,
    usuarios,
    perfis,
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
    listarPerfis(),
    listarExercicios(),
    listarAuditoria(),
    listarBeneficiarios(),
    sugerirDuplicadosBeneficiarios(),
  ]);

  const usuariosComPermissao = usuarios.map((u) => ({
    ...u,
    editavel: !u.perfil || podeAtribuirPerfil(user, u.perfil),
  }));

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

      <ConfigTabs padrao="parametros" abasValidas={[...abasValidas]}>
        {/* sete abas não cabem em 375px: a faixa rola na horizontal, como as
            Subtabs do resto do sistema, em vez de estourar a tela. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
            <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
            <TabsTrigger value="normas">Normas</TabsTrigger>
            <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            {gerePerfis ? <TabsTrigger value="perfis">Perfis</TabsTrigger> : null}
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
          <UsuariosTab
            usuarios={usuariosComPermissao}
            perfis={perfis}
            podeAtribuirAdminGeral={gerePerfis}
          />
        </TabsContent>
        {gerePerfis ? (
          <TabsContent value="perfis" className="mt-4">
            <PerfisTab
              perfis={perfis.map((p) => ({ ...p, usuarios: p._count.usuarios }))}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="auditoria" className="mt-4">
          <AuditoriaTab logs={logs} />
        </TabsContent>
      </ConfigTabs>
    </div>
  );
}
