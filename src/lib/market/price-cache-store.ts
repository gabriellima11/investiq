/**
 * Onde as cotações ficam guardadas (tabela price_cache).
 *
 * É uma interface para o cliente da brapi não depender do banco diretamente:
 * nos testes usamos uma versão em memória; no app, a versão com Drizzle.
 */
import type { Decimal } from "@/lib/money";
import { toDecimal } from "@/lib/money";

export interface CachedPrice {
  ticker: string;
  price: Decimal;
  fetchedAt: Date;
}

export interface PriceCacheStore {
  get(tickers: readonly string[]): Promise<CachedPrice[]>;
  set(entry: CachedPrice): Promise<void>;
}

/** Versão com Postgres. O import do banco é feito sob demanda (lazy). */
export function createDbPriceCacheStore(): PriceCacheStore {
  return {
    async get(tickers) {
      if (tickers.length === 0) return [];
      const { db } = await import("@/db");
      const { priceCache } = await import("@/db/schema");
      const { inArray } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(priceCache)
        .where(inArray(priceCache.ticker, [...tickers]));
      return rows.map((r) => ({
        ticker: r.ticker,
        price: toDecimal(r.price),
        fetchedAt: r.fetchedAt,
      }));
    },

    async set({ ticker, price, fetchedAt }) {
      const { db } = await import("@/db");
      const { priceCache } = await import("@/db/schema");
      // UPSERT: insere ou, se o ticker já existir, atualiza.
      await db
        .insert(priceCache)
        .values({ ticker, price: price.toString(), fetchedAt })
        .onConflictDoUpdate({
          target: priceCache.ticker,
          set: { price: price.toString(), fetchedAt },
        });
    },
  };
}

/** Versão em memória, para testes. */
export function createMemoryPriceCacheStore(
  initial: CachedPrice[] = [],
): PriceCacheStore & { entries: Map<string, CachedPrice> } {
  const entries = new Map(initial.map((e) => [e.ticker, e]));
  return {
    entries,
    async get(tickers) {
      return tickers.flatMap((t) => {
        const e = entries.get(t);
        return e ? [e] : [];
      });
    },
    async set(entry) {
      entries.set(entry.ticker, entry);
    },
  };
}
