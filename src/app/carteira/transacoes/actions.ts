"use server";
/**
 * Server Actions: funções que rodam NO SERVIDOR mas podem ser chamadas
 * direto de um formulário/Client Component, sem escrever uma API REST.
 *
 * Tudo que chega aqui veio do navegador e pode ter sido forjado. Por isso:
 * 1) conferimos a sessão (requireUser), 2) validamos com Zod.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { brapi, BrapiError, type AssetSearchResult } from "@/lib/market/brapi";
import { InsufficientQuantityError } from "@/lib/portfolio/calculate-position";
import {
  AssetNotFoundError,
  createTransaction,
  TransactionNotFoundError,
  updateTransaction,
} from "@/lib/portfolio/create-transaction";
import { requireUser } from "@/lib/session";
import { transactionInputSchema } from "@/lib/validation/transaction";

export type FieldErrors = Partial<
  Record<"ticker" | "type" | "quantity" | "price" | "fees" | "tradeDate", string>
>;

export type CreateTransactionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: FieldErrors;
      /** O que o usuário digitou, para não apagar o formulário em caso de erro. */
      values?: Record<string, string>;
    };

export async function createTransactionAction(
  _prev: CreateTransactionState,
  formData: FormData,
): Promise<CreateTransactionState> {
  const user = await requireUser();

  const raw = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
  );
  const fail = (message: string, fieldErrors?: FieldErrors): CreateTransactionState => ({
    status: "error",
    message,
    fieldErrors,
    values: raw,
  });

  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof FieldErrors;
      fieldErrors[field] ??= issue.message; // primeira mensagem de cada campo
    }
    return fail("Corrija os campos destacados.", fieldErrors);
  }

  // Com "id" no formulário é uma edição; sem, uma transação nova.
  const editingId = raw.id?.trim() || null;
  if (editingId && !UUID.test(editingId)) return fail("Transação inválida.");

  try {
    if (editingId) {
      await updateTransaction(user.id, editingId, parsed.data, { db, brapi });
    } else {
      await createTransaction(user.id, parsed.data, { db, brapi });
    }
  } catch (error) {
    if (error instanceof InsufficientQuantityError) {
      return fail(
        editingId
          ? `Essa alteração deixaria uma venda de ${error.requested.toString()} cotas com só ${error.available.toString()} em carteira. Ajuste a venda antes.`
          : `Você só tinha ${error.available.toString()} cotas de ${parsed.data.ticker} nessa data.`,
        { quantity: "Quantidade incompatível com o histórico" },
      );
    }
    if (error instanceof TransactionNotFoundError) {
      return fail("Transação não encontrada. Ela pode ter sido removida.");
    }
    if (error instanceof AssetNotFoundError) {
      return fail(`Não encontramos o ativo ${error.ticker}.`, { ticker: "Ativo não encontrado" });
    }
    if (error instanceof BrapiError) {
      return fail("Serviço de cotações indisponível. Tente novamente.");
    }
    throw error; // erro inesperado: deixa o Next mostrar a página de erro
  }

  // As páginas da carteira leem o banco a cada requisição; isto avisa o
  // roteador do navegador para descartar a versão antiga que ele guardou.
  revalidatePath("/carteira", "layout");
  const label = parsed.data.type === "BUY" ? "Compra" : "Venda";
  return {
    status: "success",
    message: editingId
      ? `${label} de ${parsed.data.ticker} atualizada.`
      : `${label} de ${parsed.data.ticker} registrada.`,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Autocomplete do campo de ativo. */
export async function searchAssetsAction(query: string): Promise<AssetSearchResult[]> {
  await requireUser(); // não expõe nossa cota da brapi para quem não está logado
  if (typeof query !== "string" || query.trim().length < 2) return [];
  try {
    return await brapi.searchAssets(query.slice(0, 20));
  } catch {
    return [];
  }
}
