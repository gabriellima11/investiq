/**
 * Regra de negócio de "registrar uma compra/venda".
 *
 * Fica fora da Server Action de propósito: a action só cuida de HTTP
 * (sessão, FormData, mensagens). Esta função cuida das regras e recebe suas
 * dependências por parâmetro (db e brapi), o que permite testá-la com um
 * banco de teste e uma brapi falsa.
 */
import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { assets, transactions, type Asset } from "@/db/schema";
import type { BrapiClient } from "@/lib/market/brapi";
import { toDecimal } from "@/lib/money";
import type { TransactionInput } from "@/lib/validation/transaction";
import { calculatePosition, type PositionTransaction } from "./calculate-position";

export class AssetNotFoundError extends Error {
  constructor(public readonly ticker: string) {
    super(`Ativo ${ticker} não encontrado`);
    this.name = "AssetNotFoundError";
  }
}

export interface CreateTransactionDeps {
  db: Db;
  brapi: Pick<BrapiClient, "searchAssets">;
}

/** Procura o ativo no banco; se não existir, busca na brapi e cadastra. */
export async function findOrCreateAsset(
  ticker: string,
  { db, brapi }: CreateTransactionDeps,
): Promise<Asset> {
  const existing = await db.query.assets.findFirst({
    where: eq(assets.ticker, ticker),
  });
  if (existing) return existing;

  const found = (await brapi.searchAssets(ticker)).find((a) => a.ticker === ticker);
  if (!found) throw new AssetNotFoundError(ticker);

  // onConflictDoNothing: se duas requisições cadastrarem o mesmo ativo ao
  // mesmo tempo, a segunda não quebra pelo índice único — só relemos.
  await db
    .insert(assets)
    .values({ ticker: found.ticker, name: found.name, type: found.type })
    .onConflictDoNothing({ target: assets.ticker });

  const created = await db.query.assets.findFirst({ where: eq(assets.ticker, ticker) });
  if (!created) throw new AssetNotFoundError(ticker);
  return created;
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  deps: CreateTransactionDeps,
) {
  const asset = await findOrCreateAsset(input.ticker, deps);

  // Transação do banco: tudo abaixo acontece "de uma vez" ou nada acontece.
  return deps.db.transaction(async (tx) => {
    // Trava por usuário+ativo até o fim da transação. Sem isso, duas vendas
    // simultâneas de 100 cotas (tendo só 100) poderiam passar as duas,
    // porque cada uma leria a posição antes da outra gravar.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${asset.id}`}))`,
    );

    const history = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.assetId, asset.id)))
      .orderBy(asc(transactions.tradeDate), asc(transactions.createdAt));

    const toPosition = (t: typeof transactions.$inferSelect): PositionTransaction => ({
      type: t.type,
      quantity: toDecimal(t.quantity),
      price: toDecimal(t.price),
      fees: toDecimal(t.fees),
      date: t.tradeDate,
    });

    // Simula a posição COM a nova operação. Se for uma venda maior que a
    // posição naquela data, calculatePosition lança InsufficientQuantityError
    // e a transação do banco é desfeita (nada é gravado).
    calculatePosition([
      ...history.map(toPosition),
      { type: input.type, quantity: input.quantity, price: input.price, fees: input.fees, date: input.tradeDate },
    ]);

    const [created] = await tx
      .insert(transactions)
      .values({
        userId,
        assetId: asset.id,
        type: input.type,
        quantity: input.quantity.toString(),
        price: input.price.toString(),
        fees: input.fees.toString(),
        tradeDate: input.tradeDate,
      })
      .returning();

    return created;
  });
}

export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transação não encontrada");
    this.name = "TransactionNotFoundError";
  }
}

const toPositionTx = (t: typeof transactions.$inferSelect): PositionTransaction => ({
  type: t.type,
  quantity: toDecimal(t.quantity),
  price: toDecimal(t.price),
  fees: toDecimal(t.fees),
  date: t.tradeDate,
});

/**
 * Edita uma transação existente.
 *
 * Editar o passado pode quebrar o futuro: diminuir uma compra de março pode
 * tornar inválida uma venda de junho. Por isso recalculamos o histórico
 * INTEIRO de cada ativo afetado com a versão editada; se alguma venda ficar
 * maior que a posição, nada é gravado (InsufficientQuantityError).
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput,
  deps: CreateTransactionDeps,
) {
  const newAsset = await findOrCreateAsset(input.ticker, deps);

  return deps.db.transaction(async (tx) => {
    // Só encontra se a transação for DESTE usuário (ninguém edita a de outro).
    const [current] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
    if (!current) throw new TransactionNotFoundError();

    // Se o ativo mudou (ex.: digitou PETR3 em vez de PETR4), os dois
    // históricos mudam. Travamos sempre na mesma ordem para evitar deadlock.
    const assetIds = [...new Set([current.assetId, newAsset.id])].sort();
    for (const assetId of assetIds) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${assetId}`}))`);
    }

    const edited: PositionTransaction = {
      type: input.type,
      quantity: input.quantity,
      price: input.price,
      fees: input.fees,
      date: input.tradeDate,
    };

    for (const assetId of assetIds) {
      const history = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.assetId, assetId)))
        .orderBy(asc(transactions.tradeDate), asc(transactions.createdAt));

      // Histórico sem a versão antiga + a versão nova (se for deste ativo).
      const simulated = history.filter((t) => t.id !== transactionId).map(toPositionTx);
      if (assetId === newAsset.id) simulated.push(edited);
      calculatePosition(simulated); // lança se alguma venda ficar inválida
    }

    const [updated] = await tx
      .update(transactions)
      .set({
        assetId: newAsset.id,
        type: input.type,
        quantity: input.quantity.toString(),
        price: input.price.toString(),
        fees: input.fees.toString(),
        tradeDate: input.tradeDate,
      })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning();

    return updated;
  });
}
