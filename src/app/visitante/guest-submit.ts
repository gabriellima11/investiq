/**
 * "Salvar" do visitante: mesma validação (Zod) e mesma regra de venda do
 * servidor, mas grava no localStorage. Roda no navegador.
 */
import type { CreateTransactionState, FieldErrors } from "@/app/carteira/transacoes/actions";
import {
  GuestTransactionNotFoundError,
  saveGuestTransaction,
} from "@/lib/guest/store";
import { InsufficientQuantityError } from "@/lib/portfolio/calculate-position";
import { transactionInputSchema } from "@/lib/validation/transaction";
import { guestLookupAssetAction } from "./actions";

export async function guestSubmit(
  _prev: CreateTransactionState,
  formData: FormData,
): Promise<CreateTransactionState> {
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
      fieldErrors[field] ??= issue.message;
    }
    return fail("Corrija os campos destacados.", fieldErrors);
  }
  const input = parsed.data;
  const editingId = raw.id?.trim() || null;

  let asset;
  try {
    asset = await guestLookupAssetAction(input.ticker);
  } catch {
    return fail("Serviço de cotações indisponível. Tente novamente.");
  }
  if (!asset) return fail(`Não encontramos o ativo ${input.ticker}.`, { ticker: "Ativo não encontrado" });

  try {
    saveGuestTransaction(input, asset, editingId);
  } catch (error) {
    if (error instanceof InsufficientQuantityError) {
      return fail(
        editingId
          ? `Essa alteração deixaria uma venda de ${error.requested.toString()} cotas com só ${error.available.toString()} em carteira. Ajuste a venda antes.`
          : `Você só tinha ${error.available.toString()} cotas de ${input.ticker} nessa data.`,
        { quantity: "Quantidade incompatível com o histórico" },
      );
    }
    if (error instanceof GuestTransactionNotFoundError) {
      return fail("Transação não encontrada. Ela pode ter sido removida.");
    }
    return fail("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).");
  }

  const label = input.type === "BUY" ? "Compra" : "Venda";
  return {
    status: "success",
    message: editingId ? `${label} de ${input.ticker} atualizada.` : `${label} de ${input.ticker} registrada.`,
  };
}
