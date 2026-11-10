/**
 * Data Access Layer da autenticação: o ÚNICO lugar que lê a sessão.
 * Páginas e Server Actions chamam `requireUser()` em vez de mexer em cookies.
 */
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** Usuário logado ou `null`. Consulta o banco (sessão válida e não expirada). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email }; // devolvemos só o necessário
}

/** Usuário logado ou redireciona para /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
