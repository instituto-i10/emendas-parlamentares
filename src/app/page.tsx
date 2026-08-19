import { redirect } from "next/navigation";

// A raiz é a porta pública: quem chega vê o portal do cidadão e entra a partir
// dele. O acesso autenticado começa no botão "Entrar" da landing.
export default function Home() {
  redirect("/publica");
}
