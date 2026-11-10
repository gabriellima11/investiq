// Catch-all: /api/auth/sign-in/email, /api/auth/callback/google, etc.
// O Better Auth decide o que fazer com cada caminho.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
