"use client";
/**
 * Botão "Editar" + modal com o formulário preenchido.
 *
 * Client Component porque o modal tem estado (aberto/fechado). Os dados da
 * transação já vêm prontos do servidor (a linha da tabela), então abrir o
 * modal não faz nenhuma requisição. Ao salvar, a Server Action grava, chama
 * revalidatePath e o modal fecha — a tabela por trás já aparece atualizada.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TransactionForm,
  type EditingTransaction,
  type SearchAssets,
  type SubmitTransaction,
} from "./transaction-form";

export function EditTransactionDialog({
  transaction,
  label,
  submit,
  search,
}: {
  submit?: SubmitTransaction;
  search?: SearchAssets;
  transaction: EditingTransaction;
  /** Texto para leitores de tela: "Editar compra de MXRF11 em 10/11/2026". */
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          />
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Editar
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
          <DialogDescription>
            O histórico de {transaction.ticker} será recalculado com a alteração.
          </DialogDescription>
        </DialogHeader>
        {/* Monta o formulário só com o modal aberto: ao reabrir, volta aos valores salvos. */}
        {open && <TransactionForm editing={transaction} submit={submit} search={search} onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
