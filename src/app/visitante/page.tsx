import type { Metadata } from "next";
import { PageHeader } from "@/components/layout-parts";
import { GuestOverview } from "./guest-overview";

export const metadata: Metadata = { title: "Visão geral (visitante) · InvestIQ" };

export default function VisitantePage() {
  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Posição consolidada · cotações com atraso de até 30 min (brapi.dev)"
      />
      <GuestOverview />
    </>
  );
}
