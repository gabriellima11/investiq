"use server";
/**
 * Server Actions do modo visitante. Só LEEM dados de mercado da brapi —
 * nada do visitante é gravado no banco (a única escrita é o cache de
 * cotações, price_cache, que é compartilhado e não guarda dado de ninguém).
 *
 * Não exigem login, então limitamos o tamanho das entradas para não
 * deixar alguém gastar nossa cota da brapi à vontade.
 */
import { brapi, normalizeTicker, type AssetSearchResult } from "@/lib/market/brapi";

const TICKER = /^[A-Z]{4}\d{1,2}$/;
const MAX_TICKERS = 30;

export async function guestSearchAssetsAction(query: string): Promise<AssetSearchResult[]> {
  if (typeof query !== "string" || query.trim().length < 2) return [];
  try {
    return await brapi.searchAssets(query.slice(0, 20));
  } catch {
    return [];
  }
}

/** Confere se o ticker existe e devolve nome e tipo (o visitante salva junto). */
export async function guestLookupAssetAction(ticker: string): Promise<AssetSearchResult | null> {
  const t = normalizeTicker(String(ticker));
  if (!TICKER.test(t)) return null;
  const found = await brapi.searchAssets(t); // erro da brapi sobe para quem chamou
  return found.find((a) => a.ticker === t) ?? null;
}

export interface GuestQuote {
  ticker: string;
  /** Decimal como texto: Server Actions só enviam dados serializáveis. */
  price: string;
  stale: boolean;
}

export async function guestQuotesAction(tickers: string[]): Promise<GuestQuote[]> {
  if (!Array.isArray(tickers)) return [];
  const valid = [...new Set(tickers.map((t) => normalizeTicker(String(t))))]
    .filter((t) => TICKER.test(t))
    .slice(0, MAX_TICKERS);
  const quotes = await brapi.getQuotes(valid);
  return [...quotes.values()].map((q) => ({ ticker: q.ticker, price: q.price.toString(), stale: q.stale }));
}
