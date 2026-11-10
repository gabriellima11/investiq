/**
 * Carteira do VISITANTE: fica só no localStorage do navegador, nunca no banco.
 *
 * localStorage guarda texto, então os valores ficam como string ("10.5") e
 * viram Decimal na leitura — nunca passam por `number`.
 *
 * Para o React "ouvir" o localStorage usamos useSyncExternalStore: ele é
 * feito para ler uma fonte de dados de FORA do React e re-renderizar quando
 * ela muda (inclusive em outra aba, pelo evento "storage").
 */
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { toDecimal } from "@/lib/money";
import { calculatePosition } from "@/lib/portfolio/calculate-position";
import {
  toTransactionRow,
  type AssetTransactions,
  type TransactionRow,
} from "@/lib/portfolio/summarize";
import type { TransactionInput } from "@/lib/validation/transaction";

const STORAGE_KEY = "investiq:visitante:v1";

const guestTransactionSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  assetType: z.enum(["STOCK", "FII", "ETF"]),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.string(),
  price: z.string(),
  fees: z.string(),
  /** ISO 8601 */
  tradeDate: z.string(),
  createdAt: z.number(),
});
export type GuestTransaction = z.infer<typeof guestTransactionSchema>;

export interface GuestAsset {
  ticker: string;
  name: string;
  type: GuestTransaction["assetType"];
}

// ---------- Leitura e escrita ----------

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]"; // modo privado / storage bloqueado
  }
}

/** Texto → transações. Dados corrompidos ou de outro formato viram lista vazia. */
function parse(raw: string): GuestTransaction[] {
  try {
    const result = z.array(guestTransactionSchema).safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function write(list: GuestTransaction[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

export function clearGuestData() {
  window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

// ---------- Hook ----------

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore exige o MESMO objeto enquanto nada mudou; por isso
// guardamos o último texto lido e só re-parseamos quando ele muda.
let lastRaw: string | null = null;
let lastParsed: GuestTransaction[] = [];
function getSnapshot(): GuestTransaction[] {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastParsed = parse(raw);
  }
  return lastParsed;
}

/** No servidor não existe localStorage: devolve null ("ainda carregando"). */
export function useGuestTransactions(): GuestTransaction[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

// ---------- Conversões ----------

export function toRows(list: readonly GuestTransaction[]): TransactionRow[] {
  return [...list]
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate) || b.createdAt - a.createdAt)
    .map((t) =>
      toTransactionRow({
        id: t.id,
        ticker: t.ticker,
        type: t.type,
        quantity: toDecimal(t.quantity),
        price: toDecimal(t.price),
        fees: toDecimal(t.fees),
        tradeDate: new Date(t.tradeDate),
      }),
    );
}

export function groupByAsset(list: readonly GuestTransaction[]): AssetTransactions[] {
  const map = new Map<string, AssetTransactions>();
  for (const t of list) {
    const group = map.get(t.ticker) ?? { ticker: t.ticker, name: t.name, type: t.assetType, txs: [] };
    group.txs.push({
      type: t.type,
      quantity: toDecimal(t.quantity),
      price: toDecimal(t.price),
      fees: toDecimal(t.fees),
      date: new Date(t.tradeDate),
    });
    map.set(t.ticker, group);
  }
  return [...map.values()];
}

// ---------- Regra de negócio (mesma do servidor) ----------

export class GuestTransactionNotFoundError extends Error {}

/**
 * Cria (sem editingId) ou edita uma transação. Antes de gravar, recalcula o
 * histórico do ativo: se alguma venda ficar maior que a posição,
 * calculatePosition lança InsufficientQuantityError e nada é salvo.
 */
export function saveGuestTransaction(
  input: TransactionInput,
  asset: GuestAsset,
  editingId: string | null,
): void {
  const list = parse(readRaw());
  const existing = editingId ? list.find((t) => t.id === editingId) : undefined;
  if (editingId && !existing) throw new GuestTransactionNotFoundError();

  const next: GuestTransaction = {
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? Date.now(),
    ticker: asset.ticker,
    name: asset.name,
    assetType: asset.type,
    type: input.type,
    quantity: input.quantity.toString(),
    price: input.price.toString(),
    fees: input.fees.toString(),
    tradeDate: input.tradeDate.toISOString(),
  };
  const updated = existing ? list.map((t) => (t.id === existing.id ? next : t)) : [...list, next];

  // Valida o ativo novo e, numa edição que trocou o ticker, o antigo também.
  const affected = new Set([next.ticker, existing?.ticker].filter(Boolean));
  for (const group of groupByAsset(updated)) {
    if (affected.has(group.ticker)) calculatePosition(group.txs);
  }
  write(updated);
}
