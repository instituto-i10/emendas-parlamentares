import type { DefaultSession } from "next-auth";
import type { Perfil } from "@/lib/authz";

// O perfil de acesso viaja no token: gravado no login, vale até o próximo.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      perfil: Perfil | null;
    } & DefaultSession["user"];
  }
  interface User {
    perfil?: Perfil | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    perfil?: Perfil | null;
  }
}
