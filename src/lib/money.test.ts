import { describe, expect, it } from "vitest";
import { formatBRL, formatPercent, formatQuantity, sum, toDecimal } from "./money";

// Intl usa espaço não separável (U+00A0) entre "R$" e o número.
const normalize = (s: string) => s.replace(/\s/g, " ");

describe("money", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // o problema do number
    expect(toDecimal("0.1").plus("0.2").equals("0.3")).toBe(true);
  });

  it("soma uma lista de valores", () => {
    expect(sum([toDecimal("10.10"), toDecimal("0.05")]).toString()).toBe("10.15");
    expect(sum([]).toString()).toBe("0");
  });

  it("formata em reais arredondando só na exibição", () => {
    expect(normalize(formatBRL(toDecimal("1234.5")))).toBe("R$ 1.234,50");
    expect(normalize(formatBRL(toDecimal("2.345")))).toBe("R$ 2,35");
    expect(normalize(formatBRL(toDecimal("-10")))).toBe("-R$ 10,00");
  });

  it("formata percentual a partir de fração", () => {
    expect(formatPercent(toDecimal("0.1234"))).toMatch(/^12,34\s?%$/);
  });

  it("formata quantidade", () => {
    expect(formatQuantity(toDecimal("1000"))).toBe("1.000");
    expect(formatQuantity(toDecimal("0.5"))).toBe("0,5");
  });
});
