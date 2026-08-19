"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export type LogLinha = {
  id: string;
  criadoEm: string;
  usuario: string;
  entidade: string;
  entidadeId: string;
  acao: string;
};

export function AuditoriaTab({ logs }: { logs: LogLinha[] }) {
  const [q, setQ] = useState("");
  const termo = q.trim().toLowerCase();
  const filtrados = termo
    ? logs.filter((l) =>
        `${l.entidade} ${l.acao} ${l.usuario}`.toLowerCase().includes(termo)
      )
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Trilha das últimas 200 operações relevantes.
        </p>
        <Input
          placeholder="Filtrar por entidade, ação ou usuário…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState titulo="Sem registros" descricao="Nenhuma entrada de auditoria para o filtro." />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {l.criadoEm}
                  </TableCell>
                  <TableCell>{l.usuario}</TableCell>
                  <TableCell className="text-sm">
                    {l.entidade}
                    <span className="block text-xs text-muted-foreground">{l.entidadeId}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.acao}</Badge>
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
