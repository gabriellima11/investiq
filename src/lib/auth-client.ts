/**
 * Cliente do Better Auth para o NAVEGADOR (Client Components).
 * Ele faz fetch para /api/auth/* — mesmo domínio, então não precisa de baseURL.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
