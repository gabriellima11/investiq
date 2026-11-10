import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/session";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

// Layout compartilhado por /carteira e /carteira/transacoes.
// O cabeçalho é estático; só o avatar depende da sessão.
export default function CarteiraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 w-full max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/carteira" aria-label="InvestIQ — visão geral">
            <Logo />
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/carteira/transacoes"
              aria-label="Nova transação"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Nova transação</span>
            </Link>
            <Suspense fallback={<span className="size-9 rounded-full bg-secondary" />}>
              <Avatar />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-6">
        {children}
      </main>
    </div>
  );
}

/** Círculo com as iniciais do usuário ("Gabriel Lima" → "GL"). */
async function Avatar() {
  const user = await requireUser();
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      title={user.name}
      aria-label={user.name}
      className="flex size-9 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold"
    >
      {initials || "?"}
    </span>
  );
}
