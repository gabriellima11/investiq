/**
 * Leituras da carteira (Data Access Layer). Sempre recebem o userId de quem
 * chamou `requireUser()` — nunca de um parâmetro vindo do navegador.
 */
import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, transactions } from "@/db/schema";
import { brapi } from "@/lib/market/brapi";
import { toDecimal } from "@/lib/money";
import {
  openTickers,
  toTransactionRow,
  type TransactionRow,
  summarizePortfolio,
  type AssetTransactions,
  type PortfolioSummary,
} from "./summarize";

export type { PortfolioSummary, PositionRow, TransactionRow } from "./summarize";

export async function getTransactions(userId: string): Promise<TransactionRow[]> {
  const rows = await db
    .select({
      id: transactions.id,
      ticker: assets.ticker,
      type: transactions.type,
      quantity: transactions.quantity,
      price: transactions.price,
      fees: transactions.fees,
      tradeDate: transactions.tradeDate,
    })
    .from(transactions)
    .innerJoin(assets, eq(assets.id, transactions.assetId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.tradeDate), desc(transactions.createdAt));

  return rows.map((r) => toTransactionRow({
    ...r,
    quantity: toDecimal(r.quantity),
    price: toDecimal(r.price),
    fees: toDecimal(r.fees),
  }));
}

export async function getPortfolio(userId: string): Promise<PortfolioSummary> {
  const rows = await db
    .select({
      assetId: assets.id,
      ticker: assets.ticker,
      name: assets.name,
      assetType: assets.type,
      type: transactions.type,
      quantity: transactions.quantity,
      price: transactions.price,
      fees: transactions.fees,
      tradeDate: transactions.tradeDate,
    })
    .from(transactions)
    .innerJoin(assets, eq(assets.id, transactions.assetId))
    .where(eq(transactions.userId, userId));

  // Agrupa as transações por ativo.
  const byAsset = new Map<string, AssetTransactions>();
  for (const r of rows) {
    const group = byAsset.get(r.assetId) ?? { ticker: r.ticker, name: r.name, type: r.assetType, txs: [] };
    group.txs.push({
      type: r.type,
      quantity: toDecimal(r.quantity),
      price: toDecimal(r.price),
      fees: toDecimal(r.fees),
      date: r.tradeDate,
    });
    byAsset.set(r.assetId, group);
  }

  const groups = [...byAsset.values()];
  const quotes = await brapi.getQuotes(openTickers(groups));
  return summarizePortfolio(groups, quotes, new Date());
}
