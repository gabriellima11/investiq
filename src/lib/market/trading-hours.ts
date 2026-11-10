/**
 * Horário de pregão da B3 (mercado à vista), no fuso de São Paulo.
 *
 * Simplificação consciente: segunda a sexta, das 10h às 18h, SEM considerar
 * feriados. Num feriado o app apenas consulta a brapi um pouco mais vezes do
 * que o necessário — não mostra dado errado. Fica registrado no README.
 */
const TIME_ZONE = "America/Sao_Paulo";
export const MARKET_OPEN_HOUR = 10;
export const MARKET_CLOSE_HOUR = 18;

interface SaoPauloParts {
  year: number;
  month: number;
  day: number;
  weekday: number; // 0 = domingo ... 6 = sábado
  hour: number;
  minute: number;
}

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Quebra um instante (UTC) em data/hora "de parede" de São Paulo. */
function toSaoPaulo(date: Date): SaoPauloParts {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ""),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const isWeekday = (weekday: number) => weekday >= 1 && weekday <= 5;

export function isMarketOpen(now: Date): boolean {
  const sp = toSaoPaulo(now);
  return (
    isWeekday(sp.weekday) &&
    sp.hour >= MARKET_OPEN_HOUR &&
    sp.hour < MARKET_CLOSE_HOUR
  );
}

/**
 * O fechamento de pregão mais recente que já aconteceu (≤ now).
 * Ex.: sábado 12h → sexta 18h. Terça 11h → segunda 18h.
 */
export function lastMarketClose(now: Date): Date {
  // Recuamos dia a dia (em passos de 24h sobre o instante) até achar um dia
  // útil cujo fechamento já passou. São Paulo não tem horário de verão desde
  // 2019, então o offset é fixo em -03:00.
  for (let daysBack = 0; daysBack < 8; daysBack++) {
    const candidate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const sp = toSaoPaulo(candidate);
    if (!isWeekday(sp.weekday)) continue;
    const close = new Date(
      `${sp.year}-${pad(sp.month)}-${pad(sp.day)}T${pad(MARKET_CLOSE_HOUR)}:00:00-03:00`,
    );
    if (close.getTime() <= now.getTime()) return close;
  }
  throw new Error("Não foi possível calcular o último fechamento");
}

const pad = (n: number) => String(n).padStart(2, "0");

export const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * A cotação em cache ainda serve?
 * - Pregão aberto: vale por 15 minutos.
 * - Pregão fechado: vale se foi buscada DEPOIS do último fechamento
 *   (o preço não muda até a próxima abertura).
 */
export function isQuoteFresh(fetchedAt: Date, now: Date): boolean {
  if (isMarketOpen(now)) {
    return now.getTime() - fetchedAt.getTime() < CACHE_TTL_MS;
  }
  return fetchedAt.getTime() >= lastMarketClose(now).getTime();
}
