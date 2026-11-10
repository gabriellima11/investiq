"use client";
import { EditTransactionDialog } from "@/app/carteira/transacoes/edit-transaction-dialog";
import { TransactionForm } from "@/app/carteira/transacoes/transaction-form";
import { Panel, PanelHeader } from "@/components/layout-parts";
import { TransactionTable } from "@/components/portfolio/transaction-table";
import { toRows, useGuestTransactions } from "@/lib/guest/store";
import { guestSearchAssetsAction } from "../actions";
import { guestSubmit } from "../guest-submit";

// Mesmo formulário e mesma tabela da versão logada; só muda QUEM grava
// (guestSubmit → localStorage) e quem busca ativos (action sem login).
export function GuestTransactions() {
  const list = useGuestTransactions();
  const rows = list ? toRows(list) : null;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Panel className="flex-[1_1_380px] gap-5 p-6">
        <div>
          <h2 className="text-base font-semibold">Nova transação</h2>
          <p className="mt-0.5 text-muted-foreground">Preencha conforme a nota de corretagem</p>
        </div>
        {/* Só monta no navegador: o campo de data usa "hoje". */}
        {rows ? (
          <TransactionForm submit={guestSubmit} search={guestSearchAssetsAction} />
        ) : (
          <div className="h-[460px] animate-pulse rounded-lg bg-muted/40" />
        )}
      </Panel>

      <Panel className="min-w-0 flex-[999_1_560px]">
        {rows ? (
          <>
            <PanelHeader
              title="Histórico"
              description={`${rows.length} ${rows.length === 1 ? "lançamento" : "lançamentos"}`}
            />
            <TransactionTable
              rows={rows}
              renderEdit={(transaction, label) => (
                <EditTransactionDialog
                  transaction={transaction}
                  label={label}
                  submit={guestSubmit}
                  search={guestSearchAssetsAction}
                />
              )}
            />
          </>
        ) : (
          <PanelHeader title="Histórico" description="Carregando..." />
        )}
      </Panel>
    </div>
  );
}
