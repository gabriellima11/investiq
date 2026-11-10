/**
 * Dados dos gráficos — lógica pura (sem banco, sem API), fácil de testar.
 *
 * Evolução (Opção A): o VALOR APLICADO de cada mês sai exato das transações.
 * O GANHO DE CAPITAL só existe no mês atual, com a cotação de hoje, porque o
 * plano gratuito da brapi não dá histórico de 12 meses. Ver README › Decisões.
 */
import { sum, ZERO, type Decimal } from "@/lib/money";
import { calculatePosition, type PositionTransaction } from "./calculate-position";

const TIME_ZONE = "America/Sao_Paulo";

export interface EvolutionPoint {
  /** "2026-10" */
  month: string;
  /** "10/26" */
  label: string;
  /** Custo das posições abertas no fim do mês. */
  invested: Decimal;
  /** Valor de mercado − custo. Só no mês atual; nos outros, null. */
  capitalGain: Decimal | null;
}

/** "AAAA-MM" de um instante, no fuso de São Paulo. */
export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/** Próximo mês: "2026-12" → "2027-01". */
function nextMonth(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * @param byAsset transações agrupadas por ativo
 * @param currentGain ganho de capital de hoje (valor de mercado − custo das posições cotadas)
 * @param maxMonths quantos meses mostrar, contando o atual
 */
export function buildEvolution(
  byAsset: readonly (readonly PositionTransaction[])[],
  currentGain: Decimal | null,
  now: Date,
  maxMonths = 12,
): EvolutionPoint[] {
  const all = byAsset.flat();
  if (all.length === 0) return [];

  const first = all.reduce((min, t) => (t.date < min ? t.date : min), all[0]!.date);
  const current = monthKey(now);

  const months: string[] = [];
  for (let k = monthKey(first); k <= current; k = nextMonth(k)) months.push(k);
  const visible = months.slice(-maxMonths);

  return visible.map((month) => {
    // Custo no FIM do mês = posição calculada só com as transações até ele.
    const invested = sum(
      byAsset.map((txs) => calculatePosition(txs.filter((t) => monthKey(t.date) <= month)).totalCost),
    );
    const [y, m] = month.split("-");
    return {
      month,
      label: `${m}/${y?.slice(2)}`,
      invested,
      capitalGain: month === current ? currentGain : null,
    };
  });
}

export interface AllocationSlice {
  type: "STOCK" | "FII" | "ETF";
  value: Decimal;
  /** Fração do total (0.6346 = 63,46%). */
  share: Decimal;
}

/** Alocação por tipo de ativo, pelo valor de mercado (sem cotação: pelo custo). */
export function buildAllocation(
  positions: readonly { type: AllocationSlice["type"]; marketValue: Decimal | null; cost: Decimal }[],
): AllocationSlice[] {
  const totals = new Map<AllocationSlice["type"], Decimal>();
  for (const p of positions) {
    const value = p.marketValue ?? p.cost;
    totals.set(p.type, (totals.get(p.type) ?? ZERO).plus(value));
  }
  const total = sum([...totals.values()]);
  if (total.isZero()) return [];
  return [...totals.entries()]
    .map(([type, value]) => ({ type, value, share: value.dividedBy(total) }))
    .sort((a, b) => b.value.comparedTo(a.value));
}
