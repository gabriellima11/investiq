/**
 * Tabela do histórico de transações — só apresentação (servidor ou cliente).
 * O botão de editar vem por renderEdit, porque logado e visitante salvam em
 * lugares diferentes (banco × navegador).
 */
import { Badge } from "@/components/layout-parts";
import { formatBRL, formatQuantity, type Decimal } from "@/lib/money";
import type { TransactionRow } from "@/lib/portfolio/summarize";
import { cn } from "@/lib/utils";
import { todayInSaoPaulo } from "@/lib/validation/transaction";
import type { EditingTransaction } from "@/app/carteira/transacoes/transaction-form";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Decimal → texto como o usuário digitaria ("9.5" → "9,5"). */
const toInput = (d: Decimal) => d.toString().replace(".", ",");

export function TransactionTable({ rows, renderEdit }: {
  rows: TransactionRow[];
  renderEdit: (transaction: EditingTransaction, label: string) => React.ReactNode;
}) {
  return (
    <>
      {rows.length === 0 ? (
        <p className="border-t px-5 py-10 text-center text-muted-foreground">
          Nenhuma operação ainda. Registre sua primeira compra ao lado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-y text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Ativo</th>
                <th className="p-3 text-right font-medium">Qtd</th>
                <th className="p-3 text-right font-medium">Preço</th>
                <th className="p-3 text-right font-medium">Taxas</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-5 py-3 text-muted-foreground">{dateFormat.format(r.tradeDate)}</td>
                  <td className="p-3">
                    {/* Compra = badge clara; venda = badge escura com borda (do design). */}
                    <Badge
                      className={cn(
                        r.type === "BUY"
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "bg-transparent text-foreground",
                      )}
                    >
                      {r.type === "BUY" ? "Compra" : "Venda"}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold">{r.ticker}</td>
                  <td className="p-3 text-right font-mono text-[13px] tabular-nums">{formatQuantity(r.quantity)}</td>
                  <td className="p-3 text-right font-mono text-[13px] tabular-nums">{formatBRL(r.price)}</td>
                  <td className="p-3 text-right font-mono text-[13px] tabular-nums">{formatBRL(r.fees)}</td>
                  <td className="p-3 text-right font-mono text-[13px] tabular-nums">{formatBRL(r.total)}</td>
                  <td className="px-5 py-3 text-right">
                    {renderEdit({id: r.id,
                        type: r.type,
                        ticker: r.ticker,
                        quantity: toInput(r.quantity),
                        price: toInput(r.price),
                        fees: toInput(r.fees),
                        tradeDate: todayInSaoPaulo(r.tradeDate)}, `Editar ${r.type === "BUY" ? "compra" : "venda"} de ${r.ticker} em ${dateFormat.format(r.tradeDate)}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
