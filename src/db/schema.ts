/**
 * Schema do banco, escrito em TypeScript.
 *
 * Este arquivo é a FONTE DA VERDADE das tabelas. O fluxo é:
 *   1. editar este arquivo
 *   2. `npm run db:generate` → drizzle-kit compara com a última migração e
 *      gera um arquivo .sql em /drizzle com as diferenças
 *   3. `npm run db:migrate`  → aplica os .sql pendentes no banco
 *
 * As tabelas de autenticação (user, session, account, verification) ficam
 * em ./auth-schema.ts, gerado pelo CLI do Better Auth (`npx auth generate`).
 */
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

export * from "./auth-schema";
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ENUM do Postgres: o banco só aceita estes valores.
export const assetTypeEnum = pgEnum("asset_type", ["STOCK", "FII", "ETF"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["BUY", "SELL"]);

// Colunas de dinheiro/quantidade usam NUMERIC (decimal exato do Postgres).
// O driver devolve NUMERIC como string ("10.50") — convertemos para Decimal.
// Nunca usamos real/double precision, que são ponto flutuante.
const money = (name: string) => numeric(name, { precision: 20, scale: 8 });

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Catálogo de ativos (compartilhado entre todos os usuários). */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: text("ticker").notNull(), // sempre MAIÚSCULO: "PETR4"
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("assets_ticker_unique").on(t.ticker)],
);

/** Compras e vendas de cada usuário. A posição é derivada daqui. */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // apagou a conta → apaga as transações
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    type: transactionTypeEnum("type").notNull(),
    quantity: money("quantity").notNull(),
    price: money("price").notNull(),
    fees: money("fees").notNull().default("0"),
    tradeDate: timestamp("trade_date", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Acelera "todas as transações do usuário X para o ativo Y".
    index("transactions_user_asset_idx").on(t.userId, t.assetId),
    // Última linha de defesa: mesmo com bug no código, o banco recusa.
    check("transactions_quantity_positive", sql`${t.quantity} > 0`),
    check("transactions_price_positive", sql`${t.price} > 0`),
    check("transactions_fees_non_negative", sql`${t.fees} >= 0`),
  ],
);

/** Cache das cotações da brapi (uma linha por ticker). */
export const priceCache = pgTable("price_cache", {
  ticker: text("ticker").primaryKey(),
  price: money("price").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

// Tipos inferidos do schema — sem escrever interfaces na mão.
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
