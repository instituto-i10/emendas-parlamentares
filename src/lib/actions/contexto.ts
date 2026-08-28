"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_EXERCICIO } from "@/lib/exercicio";

const UM_ANO = 60 * 60 * 24 * 365;

// Define o Exercício ativo (cookie), refletindo em toda a UI.
export async function setExercicioAtivo(ano: number): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_EXERCICIO, String(ano), { path: "/", maxAge: UM_ANO });
  revalidatePath("/", "layout");
}
