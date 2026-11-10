import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/app/carteira/nav-links";
import { ClearGuestButton } from "./clear-guest-button";

// Mesmo cabeçalho da carteira, mas sem sessão: no lugar do avatar há um
// aviso de modo visitante e um atalho para criar conta.
export default function VisitanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div role="note" className="border-b bg-secondary px-4 py-2 text-center text-[13px] text-muted-foreground">
        Modo visitante: suas transações ficam salvas só neste navegador e não vão para nenhum servidor.{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Criar conta
        </Link>{" "}
        para guardar de verdade.
      </div>
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 w-full max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/visitante" aria-label="InvestIQ — visão geral (visitante)">
            <Logo />
          </Link>
          <NavLinks base="/visitante" />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/visitante/transacoes"
              aria-label="Nova transação"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Nova transação</span>
            </Link>
            <ClearGuestButton />
            <Link
              href="/login"
              aria-label="Sair do modo visitante"
              title="Sair do modo visitante"
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-6">
        {children}
      </main>
    </div>
  );
}
