import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  // Tira a "/" final: com "https://site.app/" o Better Auth entende o "/"
  // como caminho base e as rotas /api/auth/* passam a dar 404.
  baseURL: process.env.BETTER_AUTH_URL?.replace(/\/+$/, ""),
  basePath: "/api/auth",
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},

  // Permite que Server Actions gravem o cookie de sessão. Deve ser o ÚLTIMO plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
