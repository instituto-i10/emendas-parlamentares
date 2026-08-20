import type { NextAuthConfig } from "next-auth";
import type { Poder, Role } from "@/generated/prisma/enums";

// Configuração EDGE-SAFE (sem Prisma/adapter) — usada pelo middleware e
// estendida em auth.ts com o provedor de credenciais.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      // Fora de produção não bloqueia (dev usa a sessão-cookie temporária).
      if (process.env.NODE_ENV !== "production") return true;
      const { pathname } = request.nextUrl;
      // /publica/* é o portal do cidadão: consulta sem login (transparência
      // ativa — STF/TCE), incluindo a lista de emendas e o manual. A raiz
      // também é pública — é ela que leva o visitante ao portal.
      // /plano-trabalho/<token> é a porta da entidade beneficiária, que não tem
      // conta no sistema: o token no endereço é a credencial, conferido (e com
      // validade) na própria ação. Sem esta exceção, o link enviado à entidade
      // cairia na tela de login.
      if (
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/publica" ||
        pathname.startsWith("/publica/") ||
        pathname.startsWith("/plano-trabalho/") ||
        pathname.startsWith("/api/auth")
      )
        return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.poder = user.poder ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        if (token.role) session.user.role = token.role as Role;
        session.user.poder = (token.poder as Poder | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
