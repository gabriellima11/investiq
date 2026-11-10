import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout-parts";
import { PortfolioView, SummarySkeleton } from "@/components/portfolio/portfolio-view";
import { getPortfolio } from "@/lib/portfolio/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Visão geral · InvestIQ" };

export default function CarteiraPage() {
  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Posição consolidada · cotações com atraso de até 30 min (brapi.dev)"
      />
      <Suspense fallback={<SummarySkeleton />}>
        <Portfolio />
      </Suspense>
    </>
  );
}

async function Portfolio() {
  const user = await requireUser();
  const p = await getPortfolio(user.id);
  return <PortfolioView p={p} transactionsHref="/carteira/transacoes" />;
}
