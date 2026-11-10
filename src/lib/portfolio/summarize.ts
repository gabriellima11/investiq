/**
 * Monta o resumo da carteira a partir das transações + cotações.
 *
 * Lógica PURA (sem banco, sem API): é usada pelo servidor (usuário logado,
 * dados do Postgres) e pelo navegador (visitante, dados do localStorage).
 * Assim as duas versões calculam exatamente igual.
 */
import { sum, ZERO, type Decimal } from "@/lib/money";
import { calculatePosition, type PositionTransaction } from "./calculate-position";
import {
  buildAllocation,
  buildEvolution,
  type AllocationSlice,
  type EvolutionPoint,
} from "./charts";

export type AssetType = "STOCK" | "FII" | "ETF";

export interface AssetTransactions {
  ticker: string;
  name: string;
  type: AssetType;
  txs: PositionTransaction[];
}

export interface PositionRow {
  ticker: string;
  name: string;
  type: AssetType;
  quantity: Decimal;
  averagePrice: Decimal;
  cost: Decimal;
  /** null quando não foi possível obter cotação. */
  currentPrice: Decimal | null;
  marketValue: Decimal | null;
  result: Decimal | null;
  resultPercent: Decimal | null;
  stale: boolean;
}

export interface PortfolioSummary {
  positions: PositionRow[];
  totalCost: Decimal;
  /** Soma do valor de mercado das posições COM cotação. */
  totalValue: Decimal;
  /** Resultado não realizado (valor atual − custo), só das posições cotadas. */
  result: Decimal;
  resultPercent: Decimal | null;
  /** Há posições sem cotação — os totais não as incluem no valor. */
  missingQuotes: boolean;
  evolution: EvolutionPoint[];
  allocation: AllocationSlice[];
}

export interface QuoteLike {
  price: Decimal;
  stale: boolean;
}

/** Tickers com posição aberta (quantidade > 0) — os que precisam de cotação. */
export function openTickers(assets: readonly AssetTransactions[]): string[] {
  return assets
    .filter((a) => calculatePosition(a.txs).quantity.greaterThan(0))
    .map((a) => a.ticker);
}

export function summarizePortfolio(
  assets: readonly AssetTransactions[],
  quotes: ReadonlyMap<string, QuoteLike>,
  now: Date,
): PortfolioSummary {
  const open = assets
    .map((info) => ({ info, position: calculatePosition(info.txs) }))
    .filter(({ position }) => position.quantity.greaterThan(0)); // posições zeradas somem

  const positions: PositionRow[] = open
    .map(({ info, position }) => {
      const quote = quotes.get(info.ticker);
      const marketValue = quote ? quote.price.times(position.quantity) : null;
      const result = marketValue ? marketValue.minus(position.totalCost) : null;
      return {
        ticker: info.ticker,
        name: info.name,
        type: info.type,
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        cost: position.totalCost,
        currentPrice: quote?.price ?? null,
        marketValue,
        result,
        resultPercent: result ? result.dividedBy(position.totalCost) : null,
        stale: quote?.stale ?? false,
      };
    })
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  const priced = positions.filter((p) => p.marketValue !== null);
  const pricedCost = sum(priced.map((p) => p.cost));
  const totalValue = sum(priced.map((p) => p.marketValue ?? ZERO));
  const result = totalValue.minus(pricedCost);

  return {
    positions,
    totalCost: sum(positions.map((p) => p.cost)),
    totalValue,
    result,
    resultPercent: pricedCost.isZero() ? null : result.dividedBy(pricedCost),
    missingQuotes: priced.length < positions.length,
    evolution: buildEvolution(
      assets.map((a) => a.txs),
      priced.length > 0 ? result : null,
      now,
    ),
    allocation: buildAllocation(positions),
  };
}

export interface TransactionRow {
  id: string;
  ticker: string;
  type: "BUY" | "SELL";
  quantity: Decimal;
  price: Decimal;
  fees: Decimal;
  total: Decimal;
  tradeDate: Date;
}

/** Calcula o total: compra = qtd × preço + taxas; venda = qtd × preço − taxas. */
export function toTransactionRow(r: Omit<TransactionRow, "total">): TransactionRow {
  const gross = r.quantity.times(r.price);
  return { ...r, total: r.type === "BUY" ? gross.plus(r.fees) : gross.minus(r.fees) };
}

