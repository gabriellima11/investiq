/**
 * Calcula a posição de UM ativo a partir do histórico de transações.
 *
 * A posição nunca é salva no banco: ela é sempre derivada das transações.
 * Assim não existe risco de "posição" e "histórico" ficarem diferentes.
 *
 * Método de preço médio (o mesmo exigido pela Receita Federal):
 * - COMPRA: o custo total aumenta (quantidade × preço + taxas) e o preço
 *   médio é recalculado = custo total ÷ quantidade.
 * - VENDA: o preço médio NÃO muda. A quantidade diminui e o custo total
 *   diminui proporcionalmente (quantidade vendida × preço médio).
 *   O lucro realizado = (quantidade × preço de venda − taxas) − custo baixado.
 */
import { ZERO, type Decimal } from "@/lib/money";

export type TransactionType = "BUY" | "SELL";

export interface PositionTransaction {
  type: TransactionType;
  quantity: Decimal;
  price: Decimal;
  fees: Decimal;
  date: Date;
}

export interface Position {
  quantity: Decimal;
  averagePrice: Decimal;
  /** Custo das cotas que ainda estão na carteira. */
  totalCost: Decimal;
  /** Lucro (ou prejuízo, se negativo) das vendas já feitas. */
  realizedProfit: Decimal;
}

export class InsufficientQuantityError extends Error {
  constructor(
    public readonly available: Decimal,
    public readonly requested: Decimal,
  ) {
    super(
      `Venda de ${requested.toString()} cotas maior que a posição disponível (${available.toString()}).`,
    );
    this.name = "InsufficientQuantityError";
  }
}

export function calculatePosition(
  transactions: readonly PositionTransaction[],
): Position {
  // A ordem importa: o preço médio depende da sequência das operações.
  // Copiamos antes de ordenar para não alterar o array de quem chamou.
  const ordered = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  let quantity = ZERO;
  let totalCost = ZERO;
  let realizedProfit = ZERO;

  for (const tx of ordered) {
    if (tx.type === "BUY") {
      totalCost = totalCost.plus(tx.quantity.times(tx.price)).plus(tx.fees);
      quantity = quantity.plus(tx.quantity);
      continue;
    }

    if (tx.quantity.greaterThan(quantity)) {
      throw new InsufficientQuantityError(quantity, tx.quantity);
    }

    const averagePrice = totalCost.dividedBy(quantity);
    const costOfSold = averagePrice.times(tx.quantity);
    const proceeds = tx.quantity.times(tx.price).minus(tx.fees);

    realizedProfit = realizedProfit.plus(proceeds.minus(costOfSold));
    quantity = quantity.minus(tx.quantity);
    // Zerou a posição? Zeramos o custo também, para não sobrar resíduo.
    totalCost = quantity.isZero() ? ZERO : totalCost.minus(costOfSold);
  }

  return {
    quantity,
    totalCost,
    averagePrice: quantity.isZero() ? ZERO : totalCost.dividedBy(quantity),
    realizedProfit,
  };
}
