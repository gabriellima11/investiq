import { describe, expect, it } from "vitest";
import { toDecimal } from "@/lib/money";
import {
  calculatePosition,
  InsufficientQuantityError,
  type PositionTransaction,
} from "./calculate-position";

// Helper para deixar os testes legíveis: tx("BUY", 100, "10.00", "2025-01-10")
function tx(
  type: "BUY" | "SELL",
  quantity: number,
  price: string,
  date: string,
  fees = "0",
): PositionTransaction {
  return {
    type,
    quantity: toDecimal(quantity),
    price: toDecimal(price),
    fees: toDecimal(fees),
    date: new Date(date),
  };
}

describe("calculatePosition", () => {
  it("retorna posição zerada sem transações", () => {
    const p = calculatePosition([]);
    expect(p.quantity.isZero()).toBe(true);
    expect(p.averagePrice.isZero()).toBe(true);
  });

  it("calcula preço médio de várias compras", () => {
    // 100 × 10 + 100 × 20 = 3000 / 200 cotas = 15
    const p = calculatePosition([
      tx("BUY", 100, "10", "2025-01-10"),
      tx("BUY", 100, "20", "2025-02-10"),
    ]);
    expect(p.quantity.toString()).toBe("200");
    expect(p.totalCost.toString()).toBe("3000");
    expect(p.averagePrice.toString()).toBe("15");
  });

  it("inclui taxas no custo da compra", () => {
    // (10 × 25 + 5 de corretagem) / 10 = 25,50
    const p = calculatePosition([tx("BUY", 10, "25", "2025-01-10", "5")]);
    expect(p.averagePrice.toString()).toBe("25.5");
  });

  it("venda não altera o preço médio e calcula lucro realizado", () => {
    const p = calculatePosition([
      tx("BUY", 100, "10", "2025-01-10"),
      tx("BUY", 100, "20", "2025-02-10"),
      tx("SELL", 50, "18", "2025-03-10"), // lucro = 50 × (18 − 15) = 150
    ]);
    expect(p.quantity.toString()).toBe("150");
    expect(p.averagePrice.toString()).toBe("15");
    expect(p.totalCost.toString()).toBe("2250");
    expect(p.realizedProfit.toString()).toBe("150");
  });

  it("registra prejuízo e desconta taxas da venda", () => {
    const p = calculatePosition([
      tx("BUY", 10, "30", "2025-01-10"),
      tx("SELL", 10, "25", "2025-02-10", "2"), // (250 − 2) − 300 = −52
    ]);
    expect(p.quantity.isZero()).toBe(true);
    expect(p.totalCost.isZero()).toBe(true);
    expect(p.realizedProfit.toString()).toBe("-52");
  });

  it("ordena por data independentemente da ordem recebida", () => {
    const p = calculatePosition([
      tx("SELL", 50, "18", "2025-03-10"),
      tx("BUY", 100, "10", "2025-01-10"),
    ]);
    expect(p.quantity.toString()).toBe("50");
  });

  it("mantém precisão com dízimas", () => {
    // 3 compras de 1 cota: 10 + 10 + 10,01 = 30,01 / 3 = 10,00333...
    const p = calculatePosition([
      tx("BUY", 1, "10", "2025-01-01"),
      tx("BUY", 1, "10", "2025-01-02"),
      tx("BUY", 1, "10.01", "2025-01-03"),
    ]);
    expect(p.averagePrice.times(3).toDecimalPlaces(2).toString()).toBe("30.01");
  });

  it("rejeita venda maior que a posição", () => {
    expect(() =>
      calculatePosition([
        tx("BUY", 10, "10", "2025-01-10"),
        tx("SELL", 11, "10", "2025-02-10"),
      ]),
    ).toThrow(InsufficientQuantityError);
  });

  it("rejeita venda antes da compra (ordem cronológica)", () => {
    expect(() =>
      calculatePosition([
        tx("BUY", 10, "10", "2025-02-10"),
        tx("SELL", 5, "10", "2025-01-10"),
      ]),
    ).toThrow(InsufficientQuantityError);
  });
});
