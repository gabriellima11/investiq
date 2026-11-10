import { describe, expect, it } from "vitest";
import { isMarketOpen, isQuoteFresh, lastMarketClose } from "./trading-hours";

// Datas sempre com offset de São Paulo (-03:00) para o teste ser legível.
const sp = (iso: string) => new Date(`${iso}-03:00`);

describe("isMarketOpen", () => {
  it("aberto numa terça às 11h", () => {
    expect(isMarketOpen(sp("2026-11-10T11:00:00"))).toBe(true);
  });
  it("fechado antes das 10h e a partir das 18h", () => {
    expect(isMarketOpen(sp("2026-11-10T09:59:00"))).toBe(false);
    expect(isMarketOpen(sp("2026-11-10T18:00:00"))).toBe(false);
  });
  it("fechado no fim de semana", () => {
    expect(isMarketOpen(sp("2026-11-14T12:00:00"))).toBe(false); // sábado
  });
  it("independe do fuso do servidor (instante em UTC)", () => {
    // 13:30 UTC = 10:30 em São Paulo
    expect(isMarketOpen(new Date("2026-11-10T13:30:00Z"))).toBe(true);
  });
});

describe("lastMarketClose", () => {
  it("sábado → sexta 18h", () => {
    expect(lastMarketClose(sp("2026-11-14T12:00:00"))).toEqual(sp("2026-11-13T18:00:00"));
  });
  it("terça 11h → segunda 18h", () => {
    expect(lastMarketClose(sp("2026-11-10T11:00:00"))).toEqual(sp("2026-11-09T18:00:00"));
  });
  it("terça 19h → terça 18h", () => {
    expect(lastMarketClose(sp("2026-11-10T19:00:00"))).toEqual(sp("2026-11-10T18:00:00"));
  });
});

describe("isQuoteFresh", () => {
  it("pregão aberto: vale por 15 minutos", () => {
    const now = sp("2026-11-10T11:00:00");
    expect(isQuoteFresh(sp("2026-11-10T10:50:00"), now)).toBe(true);
    expect(isQuoteFresh(sp("2026-11-10T10:44:00"), now)).toBe(false);
  });
  it("pregão fechado: vale se buscada após o último fechamento", () => {
    const sabado = sp("2026-11-14T12:00:00");
    expect(isQuoteFresh(sp("2026-11-13T18:05:00"), sabado)).toBe(true);
    expect(isQuoteFresh(sp("2026-11-13T17:50:00"), sabado)).toBe(false);
  });
});
