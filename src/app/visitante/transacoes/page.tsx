import type { Metadata } from "next";
import { PageHeader } from "@/components/layout-parts";
import { GuestTransactions } from "./guest-transactions";

export const metadata: Metadata = { title: "Transações (visitante) · InvestIQ" };

export default function VisitanteTransacoesPage() {
  return (
    <>
      <PageHeader
        title="Transações"
        description="Lance compras e vendas. Tudo fica salvo só neste navegador."
      />
      <GuestTransactions />
    </>
  );
}
