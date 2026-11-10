/**
 * Cliente ÚNICO da brapi.dev. Nenhum outro arquivo faz fetch para a brapi.
 *
 * Endpoints usados (documentação: https://brapi.dev/docs):
 * - GET /api/v2/stocks/quote?symbols=PETR4  → cotação
 * - GET /api/v2/tickers?search=PETR&limit=10 → busca de ativos
 * Autenticação: header `Authorization: Bearer <BRAPI_TOKEN>` (a doc recomenda
 * o header em vez de ?token=, que vaza a chave em logs).
 *
 * Plano gratuito: 1 ticker por chamada e 1 requisição simultânea. Por isso as
 * cotações de vários tickers são buscadas em sequência, e o cache evita
 * gastar a cota de 15 mil requisições/mês.
 */
import { z } from "zod";
import { toDecimal, type Decimal } from "@/lib/money";
import { isQuoteFresh } from "./trading-hours";
import {
  createDbPriceCacheStore,
  type PriceCacheStore,
} from "./price-cache-store";

const BASE_URL = "https://brapi.dev/api";
const TIMEOUT_MS = 10_000;

// ---------- Schemas Zod: o que esperamos receber da API ----------
// Validamos só os campos que usamos. Se a brapi mudar o formato, o erro
// aparece aqui, com mensagem clara, e não como `undefined` no meio da tela.

const quoteResponseSchema = z.object({
  results: z.array(
    z.object({
      symbol: z.string(),
      data: z.object({
        shortName: z.string().nullish(),
        longName: z.string().nullish(),
        currency: z.string().nullish(),
        regularMarketPrice: z.number().positive(),
        regularMarketTime: z.string().nullish(),
      }),
    }),
  ),
});

const tickersResponseSchema = z.object({
  results: z.array(
    z.object({
      symbol: z.string(),
      name: z.string().nullish(),
      longName: z.string().nullish(),
      subType: z.string().nullish(),
    }),
  ),
});

// ---------- Tipos públicos ----------

export type AssetType = "STOCK" | "FII" | "ETF";

export interface Quote {
  ticker: string;
  price: Decimal;
  fetchedAt: Date;
  /** true quando a brapi falhou e devolvemos a última cotação salva. */
  stale: boolean;
}

export interface AssetSearchResult {
  ticker: string;
  name: string;
  type: AssetType;
}

export class BrapiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BrapiError";
  }
}

// subType da brapi → nosso tipo. Outros (fip, fidc, bdr...) ficam fora do escopo.
const SUBTYPE_MAP: Record<string, AssetType> = {
  stock: "STOCK",
  unit: "STOCK",
  fii: "FII",
  etf: "ETF",
};

const FRACTIONAL_TICKER = /^[A-Z]{4}\d{1,2}F$/;

export const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

// ---------- O cliente ----------

export interface BrapiDeps {
  token: string | undefined;
  store: PriceCacheStore;
  fetch?: typeof fetch;
  now?: () => Date;
}

export function createBrapiClient(deps: BrapiDeps) {
  const fetchFn = deps.fetch ?? fetch;
  const now = deps.now ?? (() => new Date());

  async function request(path: string, params: Record<string, string>) {
    if (!deps.token) throw new BrapiError("BRAPI_TOKEN não configurado");

    const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`;
    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: { Authorization: `Bearer ${deps.token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store", // quem cacheia é a tabela price_cache, não o Next
      });
    } catch (cause) {
      throw new BrapiError(`Falha de rede ao chamar a brapi: ${String(cause)}`);
    }

    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "Token da brapi inválido ou ausente",
        403: "O plano da brapi não permite este recurso",
        404: "Ativo não encontrado na brapi",
        429: "Limite de requisições da brapi atingido",
      };
      throw new BrapiError(
        messages[response.status] ?? `Erro ${response.status} da brapi`,
        response.status,
      );
    }
    return response.json() as Promise<unknown>;
  }

  /** Busca a cotação na API (sem cache) e já salva no cache. */
  async function fetchAndCache(ticker: string): Promise<Quote> {
    const json = await request("/v2/stocks/quote", { symbols: ticker });
    const parsed = quoteResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new BrapiError(`Resposta inesperada da brapi: ${parsed.error.message}`);
    }
    const result = parsed.data.results[0];
    if (!result) throw new BrapiError(`Ativo ${ticker} não encontrado`, 404);

    // A API devolve número (JSON). Convertemos via string para o Decimal
    // guardar exatamente o que foi enviado (ex.: 38.47), sem aritmética em float.
    const quote: Quote = {
      ticker,
      price: toDecimal(result.data.regularMarketPrice.toString()),
      fetchedAt: now(),
      stale: false,
    };
    await deps.store.set(quote);
    return quote;
  }

  /**
   * Cotações de vários tickers, usando o cache sempre que possível.
   * Se a brapi falhar e houver uma cotação antiga, devolve a antiga
   * marcada como `stale` (melhor mostrar o último preço do que nada).
   */
  async function getQuotes(tickers: readonly string[]): Promise<Map<string, Quote>> {
    const unique = [...new Set(tickers.map(normalizeTicker))];
    const cached = new Map(
      (await deps.store.get(unique)).map((c) => [c.ticker, c] as const),
    );
    const result = new Map<string, Quote>();

    // Sequencial de propósito: o plano gratuito permite 1 requisição por vez.
    for (const ticker of unique) {
      const hit = cached.get(ticker);
      if (hit && isQuoteFresh(hit.fetchedAt, now())) {
        result.set(ticker, { ...hit, stale: false });
        continue;
      }
      try {
        result.set(ticker, await fetchAndCache(ticker));
      } catch (error) {
        if (hit) {
          result.set(ticker, { ...hit, stale: true });
        } else {
          console.error(`[brapi] sem cotação para ${ticker}:`, error);
        }
      }
    }
    return result;
  }

  async function getQuote(ticker: string): Promise<Quote | null> {
    const quotes = await getQuotes([ticker]);
    return quotes.get(normalizeTicker(ticker)) ?? null;
  }

  /** Busca ativos por ticker ou nome. Só retorna ações, FIIs e ETFs. */
  async function searchAssets(query: string): Promise<AssetSearchResult[]> {
    const search = query.trim();
    if (search.length < 2) return [];

    const json = await request("/v2/tickers", { search, limit: "10" });
    const parsed = tickersResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new BrapiError(`Resposta inesperada da brapi: ${parsed.error.message}`);
    }
    return parsed.data.results.flatMap((item) => {
      // "PETR4F" é o mercado fracionário de PETR4: mesmo ativo, não duplicamos.
      if (FRACTIONAL_TICKER.test(item.symbol)) return [];
      const type = item.subType ? SUBTYPE_MAP[item.subType.toLowerCase()] : undefined;
      if (!type) return [];
      return [
        {
          ticker: normalizeTicker(item.symbol),
          name: item.longName ?? item.name ?? item.symbol,
          type,
        },
      ];
    });
  }

  return { getQuote, getQuotes, searchAssets };
}

export type BrapiClient = ReturnType<typeof createBrapiClient>;

/** Instância usada pelo app (cache no Postgres). */
export const brapi: BrapiClient = createBrapiClient({
  token: process.env.BRAPI_TOKEN,
  store: createDbPriceCacheStore(),
});
