"use client";
/**
 * Client Component: tem estado (campos, sugestões, compra/venda), reage à
 * digitação e mostra o total da operação na hora. A GRAVAÇÃO acontece no
 * servidor, pela Server Action `createTransactionAction`.
 *
 * O total exibido aqui é só uma prévia: quem calcula e valida de verdade é
 * o servidor. Mesmo assim usamos Decimal, para a prévia bater com o servidor.
 */
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AssetSearchResult } from "@/lib/market/brapi";
import { formatBRL, toDecimal, ZERO, type Decimal } from "@/lib/money";
import { cn } from "@/lib/utils";
import { normalizeDecimal, todayInSaoPaulo } from "@/lib/validation/transaction";
import {
  createTransactionAction,
  searchAssetsAction,
  type CreateTransactionState,
  type FieldErrors,
} from "./actions";

const TYPE_LABEL: Record<AssetSearchResult["type"], string> = {
  STOCK: "Ação",
  FII: "FII",
  ETF: "ETF",
};

type OperationType = "BUY" | "SELL";

/** Valores de uma transação existente (modo edição), já como texto do formulário. */
export interface EditingTransaction {
  id: string;
  type: OperationType;
  ticker: string;
  quantity: string;
  price: string;
  fees: string;
  tradeDate: string;
}

/** Quem grava: a Server Action (logado) ou o localStorage (visitante). */
export type SubmitTransaction = (prev: CreateTransactionState, formData: FormData) => Promise<CreateTransactionState>;
export type SearchAssets = (query: string) => Promise<AssetSearchResult[]>;

export function TransactionForm({
  editing = null,
  onSuccess,
  submit = createTransactionAction,
  search = searchAssetsAction,
}: {
  editing?: EditingTransaction | null;
  submit?: SubmitTransaction;
  search?: SearchAssets;
  /** Chamado após salvar com sucesso (o modal de edição usa para fechar). */
  onSuccess?: () => void;
}) {
  // A cada envio (ou "Limpar") trocamos a key → os campos remontam com os
  // valores certos: vazios após sucesso, os digitados após erro.
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState<OperationType>(editing?.type ?? "BUY");

  const [state, formAction, pending] = useActionState(
    async (prev: CreateTransactionState, formData: FormData) => {
      const result = await submit(prev, formData);
      setFormKey((k) => k + 1);
      if (result.status === "success") {
        toast.success(result.message);
        onSuccess?.();
      }
      else if (result.status === "error") toast.error(result.message);
      return result;
    },
    { status: "idle" },
  );

  const isError = state.status === "error";
  // Valores iniciais: os digitados (após erro) > os da transação editada > vazio.
  const initial: Record<string, string> = isError
    ? (state.values ?? {})
    : editing
      ? { ...editing }
      : {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Abas segmentadas Compra / Venda (do design) */}
      <div role="radiogroup" aria-label="Tipo de operação" className="grid grid-cols-2 gap-0.5 rounded-lg bg-secondary p-1">
        {(["BUY", "SELL"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "h-9 rounded-md font-medium text-muted-foreground transition-colors hover:text-foreground",
              type === t && "bg-background text-foreground shadow-sm",
            )}
          >
            {t === "BUY" ? "Compra" : "Venda"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <FormFields
        key={formKey}
        type={type}
        initial={initial}
        isEditing={Boolean(editing)}
        search={search}
        errors={isError ? (state.fieldErrors ?? {}) : {}}
        pending={pending}
        onClear={() => setFormKey((k) => k + 1)}
      />
    </form>
  );
}

function FormFields({ type, initial, isEditing, search, errors, pending, onClear }: {
  search: SearchAssets;
  type: OperationType;
  isEditing: boolean;
  initial: Record<string, string>;
  errors: FieldErrors;
  pending: boolean;
  onClear: () => void;
}) {
  const [ticker, setTicker] = useState(initial.ticker ?? "");
  const [quantity, setQuantity] = useState(initial.quantity ?? "");
  const [price, setPrice] = useState(initial.price ?? "");
  const [fees, setFees] = useState(initial.fees ?? "");
  const [suggestions, setSuggestions] = useState<AssetSearchResult[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca com "debounce": espera 300 ms sem digitar antes de chamar a brapi.
  function handleTickerChange(value: string) {
    const upper = value.toUpperCase();
    setTicker(upper);
    if (debounce.current) clearTimeout(debounce.current);
    if (upper.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSuggestions(await search(upper));
    }, 300);
  }

  // Prévia do total, recalculada a cada render (sem useEffect: é só uma conta
  // derivada do estado atual).
  const q = parseInput(quantity);
  const p = parseInput(price);
  const f = parseInput(fees);
  const subtotal = q.times(p);
  const total = type === "BUY" ? subtotal.plus(f) : subtotal.minus(f);

  return (
    <>
      <Field data-invalid={Boolean(errors.ticker)} className="relative">
        <FieldLabel htmlFor="ticker">Ativo</FieldLabel>
        <Input
          id="ticker"
          name="ticker"
          placeholder="PETR4, MXRF11, BOVA11..."
          autoComplete="off"
          className="h-10 uppercase"
          value={ticker}
          onChange={(e) => handleTickerChange(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          aria-invalid={Boolean(errors.ticker)}
          required
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
            {suggestions.map((s) => (
              <li key={s.ticker}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary"
                  onMouseDown={(e) => e.preventDefault()} // não perde o foco antes do clique
                  onClick={() => {
                    if (debounce.current) clearTimeout(debounce.current);
                    setTicker(s.ticker);
                    setSuggestions([]);
                  }}
                >
                  <span className="min-w-0 truncate">
                    <strong>{s.ticker}</strong>{" "}
                    <span className="text-muted-foreground">{s.name}</span>
                  </span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs">{TYPE_LABEL[s.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <FieldError>{errors.ticker}</FieldError>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={Boolean(errors.tradeDate)}>
          <FieldLabel htmlFor="tradeDate">Data</FieldLabel>
          <Input
            id="tradeDate"
            name="tradeDate"
            type="date"
            className="h-10 [color-scheme:dark]"
            max={todayInSaoPaulo()}
            defaultValue={initial.tradeDate ?? todayInSaoPaulo()}
            required
            aria-invalid={Boolean(errors.tradeDate)}
          />
          <FieldError>{errors.tradeDate}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.quantity)}>
          <FieldLabel htmlFor="quantity">Quantidade</FieldLabel>
          <Input id="quantity" name="quantity" inputMode="decimal" className="h-10" value={quantity} onChange={(e) => setQuantity(e.target.value)} required aria-invalid={Boolean(errors.quantity)} />
          <FieldError>{errors.quantity}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.price)}>
          <FieldLabel htmlFor="price">Preço unitário (R$)</FieldLabel>
          <Input id="price" name="price" inputMode="decimal" placeholder="0,00" className="h-10" value={price} onChange={(e) => setPrice(e.target.value)} required aria-invalid={Boolean(errors.price)} />
          <FieldError>{errors.price}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.fees)}>
          <FieldLabel htmlFor="fees">Taxas (R$)</FieldLabel>
          <Input id="fees" name="fees" inputMode="decimal" placeholder="0,00" className="h-10" value={fees} onChange={(e) => setFees(e.target.value)} aria-invalid={Boolean(errors.fees)} />
          <FieldError>{errors.fees}</FieldError>
        </Field>
      </div>

      {/* Resumo da operação (do design) */}
      <div className="flex flex-col gap-2 rounded-lg bg-secondary px-4 py-3.5">
        <SummaryLine label="Subtotal" value={subtotal} />
        <SummaryLine label={type === "BUY" ? "Taxas (+)" : "Taxas (−)"} value={f} />
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>{type === "BUY" ? "Total pago" : "Total recebido"}</span>
          <span className="font-mono tabular-nums">{formatBRL(total)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-10 flex-1" onClick={onClear} disabled={pending}>
          {isEditing ? "Desfazer" : "Limpar"}
        </Button>
        <Button type="submit" className="h-10 flex-[2]" disabled={pending}>
          {pending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : type === "BUY"
                ? "Registrar compra"
                : "Registrar venda"}
        </Button>
      </div>
    </>
  );
}

function SummaryLine({ label, value }: { label: string; value: Decimal }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{formatBRL(value)}</span>
    </div>
  );
}

/** Texto digitado → Decimal; vazio ou inválido conta como zero na prévia. */
function parseInput(value: string): Decimal {
  const normalized = normalizeDecimal(value);
  return /^\d+(\.\d+)?$/.test(normalized) ? toDecimal(normalized) : ZERO;
}
