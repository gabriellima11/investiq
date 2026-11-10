"use client";
import { toast } from "sonner";
import { clearGuestData, useGuestTransactions } from "@/lib/guest/store";

/** Apaga a carteira do visitante deste navegador (com confirmação). */
export function ClearGuestButton() {
  const list = useGuestTransactions();
  if (!list || list.length === 0) return null;
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center rounded-md border px-3 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      onClick={() => {
        if (!window.confirm("Apagar todas as transações salvas neste navegador? Não dá para desfazer.")) return;
        clearGuestData();
        toast.success("Dados do visitante apagados.");
      }}
    >
      Apagar dados
    </button>
  );
}
