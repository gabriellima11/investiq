import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Panel, PanelHeader } from "@/components/layout-parts";
import { TransactionTable } from "@/components/portfolio/transaction-table";
import { getTransactions } from "@/lib/portfolio/queries";
import { requireUser } from "@/lib/session";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { TransactionForm } from "./transaction-form";

export const metadata: Metadata = { title: "Transações · InvestIQ" };

// Server Component: a moldura vai na "casca" estática; o formulário (usa a
// data de hoje) e o histórico (depende do usuário) ficam atrás de Suspense.
export default function TransacoesPage() {
  return (
    <>
      <PageHeader
        title="Transações"
        description="Lance compras e vendas. O preço médio é recalculado a cada lançamento."
      />
      <div className="flex flex-wrap items-start gap-4">
        <Panel className="flex-[1_1_380px] gap-5 p-6">
          <div>
            <h2 className="text-base font-semibold">Nova transação</h2>
            <p className="mt-0.5 text-muted-foreground">Preencha conforme a nota de corretagem</p>
          </div>
          {/* "Hoje" não pode ser pré-renderizado no build (ficaria congelado
              na data do deploy), por isso o formulário fica no Suspense. */}
          <Suspense fallback={<div className="h-[460px] animate-pulse rounded-lg bg-muted/40" />}>
            <TransactionForm />
          </Suspense>
        </Panel>

        <Panel className="min-w-0 flex-[999_1_560px]">
          <Suspense fallback={<PanelHeader title="Histórico" description="Carregando..." />}>
            <TransactionHistory />
          </Suspense>
        </Panel>
      </div>
    </>
  );
}

async function TransactionHistory() {
  const user = await requireUser();
  const rows = await getTransactions(user.id);

  return (
    <>
      <PanelHeader
        title="Histórico"
        description={`${rows.length} ${rows.length === 1 ? "lançamento" : "lançamentos"}`}
      />
      <TransactionTable
        rows={rows}
        renderEdit={(transaction, label) => <EditTransactionDialog transaction={transaction} label={label} />}
      />
    </>
  );
}
