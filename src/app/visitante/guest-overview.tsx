"use client";
/**
 * Visão geral do visitante. Client Component porque os dados estão no
 * localStorage, que só existe no navegador.
 *
 * As cotações vêm do servidor (a brapi exige nosso token, que não pode ir
 * ao navegador). Buscá-las num useEffect é o uso certo do hook: sincronizar
 * o componente com um sistema externo (a API) quando os tickers mudam.
 */
import { useEffect, useMemo, useState } from "react";
import { PortfolioView, SummarySkeleton } from "@/components/portfolio/portfolio-view";
import { groupByAsset, useGuestTransactions } from "@/lib/guest/store";
import { toDecimal } from "@/lib/money";
import { openTickers, summarizePortfolio, type QuoteLike } from "@/lib/portfolio/summarize";
import { guestQuotesAction } from "./actions";

export function GuestOverview() {
  const list = useGuestTransactions();
  const groups = useMemo(() => (list ? groupByAsset(list) : null), [list]);
  const tickersKey = groups ? openTickers(groups).sort().join(",") : null;

  const [quotes, setQuotes] = useState<{ key: string; map: Map<string, QuoteLike> } | null>(null);

  useEffect(() => {
    if (tickersKey === null) return;
    let cancelled = false; // evita gravar a resposta de uma busca antiga
    const tickers = tickersKey ? tickersKey.split(",") : [];
    guestQuotesAction(tickers)
      .catch(() => [])
      .then((result) => {
        if (cancelled) return;
        const map = new Map(result.map((q) => [q.ticker, { price: toDecimal(q.price), stale: q.stale }]));
        setQuotes({ key: tickersKey, map });
      });
    return () => {
      cancelled = true;
    };
  }, [tickersKey]);

  // Enquanto lê o localStorage ou as cotações dos tickers atuais não chegam.
  if (!groups || (tickersKey && quotes?.key !== tickersKey)) return <SummarySkeleton />;

  const p = summarizePortfolio(groups, quotes?.map ?? new Map(), new Date());
  return <PortfolioView p={p} transactionsHref="/visitante/transacoes" />;
}
