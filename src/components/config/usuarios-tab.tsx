import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "./form-dialog";
import { SelectField, TextField } from "./fields";
import { criarUsuario } from "@/lib/actions/config";
import { ROTULO_PODER, ROTULO_ROLE, opcoes } from "@/lib/rotulos";

type Usuario = {
  id: string;
  name: string | null;
  email: string | null;
  poder: string | null;
  role: string;
  autor: { id: string; nome: string } | null;
};

export function UsuariosTab({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Usuários, Poder e papel. As credenciais (senha) são definidas no fluxo
          de autenticação (PROMPT 9).
        </p>
        <FormDialog
          triggerLabel="Novo usuário"
          title="Novo usuário"
          description="Atribua Poder e papel. O papel controla o acesso aos módulos."
          action={criarUsuario}
        >
          <TextField name="nome" label="Nome" required />
          <TextField name="email" label="E-mail" required type="email" />
          <SelectField
            name="poder"
            label="Poder"
            options={opcoes(ROTULO_PODER)}
            placeholder="— (transversal)"
          />
          <SelectField
            name="role"
            label="Papel"
            required
            options={opcoes(ROTULO_ROLE)}
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
          descricao="Cadastre os usuários de cada Poder e seus papéis."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Poder</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Autor vinculado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {u.poder ? ROTULO_PODER[u.poder] : (
                      <span className="text-muted-foreground">Transversal</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROTULO_ROLE[u.role] ?? u.role}</Badge>
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
