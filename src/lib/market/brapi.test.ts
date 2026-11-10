import { describe, expect, it, vi } from "vitest";
import { toDecimal } from "@/lib/money";
import { BrapiError, createBrapiClient } from "./brapi";
import { createMemoryPriceCacheStore } from "./price-cache-store";

const NOW = new Date("2026-11-10T11:00:00-03:00"); // terça, pregão aberto

/** Cria um fetch falso que responde com o JSON/status informado. */
function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

const quoteBody = (symbol: string, price: number) => ({
  results: [{ symbol, data: { shortName: symbol, regularMarketPrice: price } }],
});

function setup(fetchFn: ReturnType<typeof fakeFetch>, store = createMemoryPriceCacheStore()) {
  const client = createBrapiClient({
    token: "token-de-teste",
    store,
    fetch: fetchFn as unknown as typeof fetch,
    now: () => NOW,
  });
  return { client, store };
}

describe("brapi.getQuote", () => {
  it("busca na API, envia o token no header e salva no cache", async () => {
    const fetchFn = fakeFetch(quoteBody("PETR4", 38.47));
    const { client, store } = setup(fetchFn);

    const quote = await client.getQuote("petr4");

    expect(quote?.price.toString()).toBe("38.47");
    expect(store.entries.get("PETR4")?.price.toString()).toBe("38.47");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v2/stocks/quote?symbols=PETR4");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-de-teste");
  });

  it("usa o cache fresco sem chamar a API", async () => {
    const fetchFn = fakeFetch(quoteBody("PETR4", 99));
    const store = createMemoryPriceCacheStore([
      { ticker: "PETR4", price: toDecimal("38"), fetchedAt: new Date(NOW.getTime() - 5 * 60_000) },
    ]);
    const { client } = setup(fetchFn, store);

    const quote = await client.getQuote("PETR4");

    expect(quote?.price.toString()).toBe("38");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("cache vencido + API fora do ar → devolve o antigo marcado como stale", async () => {
    const fetchFn = fakeFetch({ error: true }, 500);
    const store = createMemoryPriceCacheStore([
      { ticker: "PETR4", price: toDecimal("38"), fetchedAt: new Date(NOW.getTime() - 60 * 60_000) },
    ]);
    const { client } = setup(fetchFn, store);

    const quote = await client.getQuote("PETR4");

    expect(quote?.stale).toBe(true);
    expect(quote?.price.toString()).toBe("38");
  });

  it("sem cache e API com formato inesperado → null (validação Zod)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = fakeFetch({ results: [{ symbol: "PETR4", data: { regularMarketPrice: "abc" } }] });
    const { client } = setup(fetchFn);

    expect(await client.getQuote("PETR4")).toBeNull();
  });
});

describe("brapi.searchAssets", () => {
  it("mapeia subType para STOCK/FII/ETF e ignora os demais", async () => {
    const fetchFn = fakeFetch({
      results: [
        { symbol: "MXRF11", name: "Maxi Renda", subType: "fii" },
        { symbol: "BOVA11", name: "iShares Ibovespa", subType: "etf" },
        { symbol: "PETR4", name: "Petrobras", subType: "stock" },
        { symbol: "PETR4F", name: "Petrobras", subType: "stock" }, // fracionário
        { symbol: "TAEE11", name: "Taesa", subType: "unit" },
        { symbol: "AAPL34", name: "Apple", subType: "bdr" },
      ],
    });
    const { client } = setup(fetchFn);

    const results = await client.searchAssets("a");
    expect(results).toEqual([]); // menos de 2 caracteres nem chama a API

    const found = await client.searchAssets("11");
    expect(found.map((r) => [r.ticker, r.type])).toEqual([
      ["MXRF11", "FII"],
      ["BOVA11", "ETF"],
      ["PETR4", "STOCK"],
      ["TAEE11", "STOCK"],
    ]);
  });

  it("erro 401 vira BrapiError com mensagem em português", async () => {
    const { client } = setup(fakeFetch({ error: true }, 401));
    await expect(client.searchAssets("PETR")).rejects.toThrow(BrapiError);
  });
});
