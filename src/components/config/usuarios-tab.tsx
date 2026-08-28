import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "./form-dialog";
import { SelectField, TextField } from "./fields";
import { PerfilSelect } from "./perfil-select";
import { criarUsuario } from "@/lib/actions/config";
import { ROTULO_PODER } from "@/lib/rotulos";

type PerfilOpcao = {
  id: string;
  nome: string;
  poder: string | null;
  adminGeral: boolean;
};

type Usuario = {
  id: string;
  name: string | null;
  email: string | null;
  poder: string | null;
  perfil: { id: string; nome: string; poder: string | null } | null;
  autor: { id: string; nome: string } | null;
};

export function UsuariosTab({
  usuarios,
  perfis,
  podeAtribuirAdminGeral,
}: {
  usuarios: Usuario[];
  perfis: PerfilOpcao[];
  // Atribuir o Administrador Geral é ato exclusivo de quem já o possui.
  podeAtribuirAdminGeral: boolean;
}) {
  const atribuiveis = perfis.filter(
    (p) => podeAtribuirAdminGeral || !p.adminGeral
  );
  const opcoesPerfil = atribuiveis.map((p) => ({
    value: p.id,
    label: p.poder
      ? `${p.nome} · ${ROTULO_PODER[p.poder] ?? p.poder}`
      : `${p.nome} · Transversal`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* break-words: os nomes de chave/código são palavras únicas e longas;
            sem isto elas fixam a largura mínima e estouram a tela no celular. */}
        <p className="min-w-0 max-w-2xl break-words text-sm text-muted-foreground">
          Usuários e seus perfis de acesso. O Poder acompanha o perfil. Trocar o
          perfil de alguém vale no próximo login dessa pessoa.
        </p>
        <FormDialog
          triggerLabel="Novo usuário"
          title="Novo usuário"
          description="Todo usuário precisa de um perfil: sem perfil a conta não acessa o sistema."
          action={criarUsuario}
        >
          <TextField name="nome" label="Nome" required />
          <TextField name="email" label="E-mail" required type="email" />
          <SelectField
            name="perfilId"
            label="Perfil de acesso"
            required
            options={opcoesPerfil}
          />
          <TextField
            name="senha"
            label="Senha (mín. 8; opcional)"
            type="password"
            placeholder="deixe em branco para definir depois"
          />
        </FormDialog>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState
          titulo="Nenhum usuário cadastrado"
          descricao="Cadastre os usuários e atribua a cada um o seu perfil de acesso."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Poder</TableHead>
                <TableHead>Perfil de acesso</TableHead>
                <TableHead>Autor vinculado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {u.poder ? (
                      ROTULO_PODER[u.poder]
                    ) : (
                      <span className="text-muted-foreground">Transversal</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Reatribuição na própria linha: trocar o perfil de alguém
                        é rotina de secretaria, não merece um formulário. */}
                    <PerfilSelect
                      usuarioId={u.id}
                      perfilAtualId={u.perfil?.id ?? null}
                      opcoes={opcoesPerfil}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.autor?.nome ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
