import { defineConfig } from "drizzle-kit";

// O Next.js carrega o .env.local sozinho, mas o drizzle-kit não.
// process.loadEnvFile é nativo do Node 20.12+ (sem precisar do pacote dotenv).
try {
  process.loadEnvFile(".env.local");
} catch {
  // Na Vercel/CI não existe .env.local: as variáveis já estão no ambiente.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle", // onde ficam os arquivos .sql de migração
  dbCredentials: { url },
  strict: true, // pede confirmação antes de comandos destrutivos
});
