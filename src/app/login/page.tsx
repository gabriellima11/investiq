// Server Component: só monta a moldura. Não lê sessão nem dados, então o
// Next pode pré-renderizar esta página (estática) e servi-la instantaneamente.
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { isGoogleEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · InvestIQ" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      {/* O servidor decide e passa só um booleano; os segredos nunca vão ao navegador. */}
      <LoginForm googleEnabled={isGoogleEnabled} />
    </main>
  );
}
