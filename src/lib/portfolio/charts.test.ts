import { describe, expect, it } from "vitest";
import { toDecimal } from "@/lib/money";
import { buildAllocation, buildEvolution, monthKey } from "./charts";
import type { PositionTransaction } from "./calculate-position";

const tx = (type: "BUY" | "SELL", q: number, p: string, date: string): PositionTransaction => ({
  type,
  quantity: toDecimal(q),
  price: toDecimal(p),
  fees: toDecimal(0),
  date: new Date(`${date}T12:00:00-03:00`),
});

const NOW = new Date("2026-11-10T12:00:00-03:00");

describe("monthKey", () => {
  it("usa o fuso de São Paulo (31/10 22h em SP já é 01/11 em UTC)", () => {
    expect(monthKey(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10");
  });
});

describe("buildEvolution", () => {
  it("sem transações → vazio", () => {
    expect(buildEvolution([], null, NOW)).toEqual([]);
  });

  it("acumula o custo mês a mês, inclusive meses sem operação", () => {
    const points = buildEvolution(
      [[tx("BUY", 10, "10", "2026-08-05"), tx("BUY", 10, "20", "2026-10-02")]],
      toDecimal("-5"),
      NOW,
    );
    expect(points.map((p) => [p.label, p.invested.toString()])).toEqual([
      ["08/26", "100"],
      ["09/26", "100"], // sem operação: repete o custo
      ["10/26", "300"],
      ["11/26", "300"],
    ]);
    // Ganho de capital só no mês atual (Opção A)
    expect(points.slice(0, 3).every((p) => p.capitalGain === null)).toBe(true);
    expect(points[3]?.capitalGain?.toString()).toBe("-5");
  });

  it("venda reduz o custo pelo preço médio", () => {
    const points = buildEvolution(
      [[tx("BUY", 100, "10", "2026-10-01"), tx("SELL", 40, "12", "2026-11-03")]],
      null,
      NOW,
    );
    expect(points.map((p) => p.invested.toString())).toEqual(["1000", "600"]);
  });

  it("limita aos últimos N meses", () => {
    const points = buildEvolution([[tx("BUY", 1, "10", "2024-01-10")]], null, NOW, 12);
    expect(points).toHaveLength(12);
    expect(points[0]?.label).toBe("12/25");
  });
});

describe("buildAllocation", () => {
  it("agrupa por tipo e calcula a fatia de cada um", () => {
    const slices = buildAllocation([
      { type: "FII", marketValue: toDecimal("600"), cost: toDecimal("500") },
      { type: "STOCK", marketValue: toDecimal("300"), cost: toDecimal("350") },
      { type: "FII", marketValue: null, cost: toDecimal("100") }, // sem cotação: usa custo
    ]);
    expect(slices.map((s) => [s.type, s.value.toString(), s.share.toString()])).toEqual([
      ["FII", "700", "0.7"],
      ["STOCK", "300", "0.3"],
    ]);
  });
});
