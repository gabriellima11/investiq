/**
 * Teste "de fumaça" contra a brapi REAL + cache no Postgres (branch hm).
 * Não roda no `npm test` normal: só com `npm run test:smoke`.
 */
import { describe, expect, it } from "vitest";

const enabled = import.meta.env.MODE === "smoke";
if (enabled) process.loadEnvFile(".env.local");

describe.runIf(enabled)("brapi real", () => {
  it("cotação de ação, FII e ETF, e a 2ª chamada vem do cache", async () => {
    const { brapi } = await import("@/lib/market/brapi");
    const first = await brapi.getQuotes(["PETR4", "MXRF11", "BOVA11"]);
    expect(first.size).toBe(3);
    for (const q of first.values()) expect(q.price.greaterThan(0)).toBe(true);

    const again = await brapi.getQuote("PETR4");
    expect(again?.fetchedAt).toEqual(first.get("PETR4")?.fetchedAt); // cache hit

    const search = await brapi.searchAssets("BOVA11");
    expect(search[0]).toMatchObject({ ticker: "BOVA11", type: "ETF" });
  }, 30_000);
});
