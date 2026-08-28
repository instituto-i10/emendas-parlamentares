import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const senha = String(creds?.senha ?? "");
        if (!email || !senha) return null;

        // O perfil vem junto: é ele que será gravado no token (PROMPT 12).
        const user = await prisma.user.findUnique({
          where: { email },
          include: { perfil: true },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(senha, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // Sem perfil o login é aceito, mas o guard de sessão devolve ao
          // login com o aviso — assim a pessoa sabe o que falta, em vez de
          // receber "credenciais inválidas" e culpar a senha.
          perfil: user.perfil,
        };
      },
    }),
  ],
});
