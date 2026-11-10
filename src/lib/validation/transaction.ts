/**
 * Validação do formulário de compra/venda.
 *
 * Usada no SERVIDOR (Server Action), que é a validação que realmente vale:
 * o navegador pode ser manipulado, o servidor não.
 */
import { z } from "zod";
import { toDecimal, type Decimal } from "@/lib/money";

/**
 * Número decimal digitado pelo usuário. Aceita "1.234,56" ou "1234.56".
 * Vira Decimal direto da string — nunca passa por `number`.
 */
const decimalString = (label: string) =>
  z
    .string({ error: `Informe ${label}` })
    .trim()
    .min(1, `Informe ${label}`)
    .transform((value) => normalizeDecimal(value))
    .refine((value) => /^\d+(\.\d+)?$/.test(value), `${label} inválido`)
    .transform((value): Decimal => toDecimal(value));

/** "1.234,56" → "1234.56"; "10,5" → "10.5"; "10.5" → "10.5" */
export function normalizeDecimal(value: string): string {
  const v = value.replace(/\s/g, "");
  if (v.includes(",")) return v.replace(/\./g, "").replace(",", ".");
  return v;
}

export const transactionInputSchema = z.object({
  ticker: z
    .string({ error: "Informe o ativo" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}\d{1,2}$/, "Ticker inválido (ex.: PETR4, MXRF11)"),
  type: z.enum(["BUY", "SELL"], { error: "Escolha compra ou venda" }),
  quantity: decimalString("a quantidade").refine(
    (d) => d.greaterThan(0),
    "A quantidade deve ser maior que zero",
  ),
  price: decimalString("o preço").refine(
    (d) => d.greaterThan(0),
    "O preço deve ser maior que zero",
  ),
  fees: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : "0"))
    .pipe(decimalString("as taxas")),
  tradeDate: z
    .string({ error: "Informe a data" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    // "AAAA-MM-DD" compara certo como texto: "2026-11-09" < "2026-11-10".
    .refine((v) => v <= todayInSaoPaulo(), "A data não pode estar no futuro")
    // Meio-dia em São Paulo: evita que o fuso "empurre" a data para o dia anterior.
    .transform((v) => new Date(`${v}T12:00:00-03:00`))
    .refine((d) => !Number.isNaN(d.getTime()), "Data inválida"),
});

/** Data de hoje em São Paulo no formato "AAAA-MM-DD" (o locale en-CA usa esse formato). */
export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export type TransactionInput = z.output<typeof transactionInputSchema>;
