"use client";
// Client Component: precisa de estado (aba ativa, carregando, erro) e de
// eventos do navegador (onSubmit, onClick) — coisas que só existem no browser.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "signIn" | "signUp";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setPending(true);
    const { error } =
      mode === "signUp"
        ? await signUp.email({ name: String(form.get("name")), email, password })
        : await signIn.email({ email, password });
    setPending(false);

    if (error) {
      toast.error(translateError(error.code));
      return;
    }
    router.push("/carteira");
    router.refresh(); // faz os Server Components lerem o novo cookie de sessão
  }

  async function handleGoogle() {
    setPending(true);
    // Redireciona o navegador para o Google; volta em /api/auth/callback/google
    const { error } = await signIn.social({ provider: "google", callbackURL: "/carteira" });
    // Em caso de sucesso o navegador já saiu da página; só chegamos aqui com erro.
    if (error) {
      setPending(false);
      toast.error("Não foi possível entrar com o Google.");
    }
  }

  const isSignUp = mode === "signUp";

  return (
    <Card className="w-full max-w-sm rounded-xl border bg-card">
      <CardHeader>
        <CardTitle>{isSignUp ? "Criar conta" : "Entrar"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Comece a acompanhar sua carteira."
            : "Acesse sua carteira de investimentos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {isSignUp && (
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" name="name" required autoComplete="name" />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </FieldGroup>
        </form>

        {googleEnabled && (
          <Button
            variant="outline"
            onClick={handleGoogle}
            disabled={pending}
            aria-label="Entrar com Google"
            title="Entrar com Google"
            className="mx-auto size-10 p-0"
          >
            {/* Logo oficial do Google (4 cores) */}
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
          </Button>
        )}

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(isSignUp ? "signIn" : "signUp")}
        >
          {isSignUp ? "Já tenho conta — entrar" : "Não tem conta? Criar agora"}
        </button>

        {/* Modo visitante: tudo fica no localStorage, nada vai para o banco. */}
        <div className="flex flex-col gap-2 border-t pt-4">
          <Link
            href="/visitante"
            className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 font-medium hover:bg-secondary/80"
          >
            Entrar como visitante
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Teste sem criar conta. Seus dados ficam só neste navegador.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function translateError(code: string | undefined): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou senha inválidos.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Já existe uma conta com este e-mail.";
    case "PASSWORD_TOO_SHORT":
      return "A senha precisa ter pelo menos 8 caracteres.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}
