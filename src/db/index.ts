/**
 * Conexão única com o banco.
 *
 * Importe `db` de qualquer código de servidor:
 *   import { db } from "@/db";
 *   const lista = await db.select().from(assets);
 */
import "server-only"; // erro de build se algum Client Component importar isto
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida");

// Em desenvolvimento, o hot reload do Next reexecuta este módulo a cada
// alteração. Guardamos o Pool no globalThis para não abrir conexões novas
// a cada save e estourar o limite do banco.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool = globalForDb.pgPool ?? new Pool({ connectionString, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
