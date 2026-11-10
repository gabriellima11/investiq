/**
 * Peças visuais reaproveitadas pelas telas (do design: cards com borda fina,
 * cantos de 12px, títulos 16px e subtítulos em cinza).
 */
import { cn } from "@/lib/utils";
import type { Decimal } from "@/lib/money";

export function PageHeader({ title, description, children }: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card text-card-foreground", className)}
      {...props}
    />
  );
}

export function PanelHeader({ title, description, children }: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

/** Classe de cor para lucro (verde) / prejuízo (vermelho). */
export function resultClass(value: Decimal | null | undefined) {
  if (!value || value.isZero()) return undefined;
  return value.isPositive() ? "text-gain" : "text-loss";
}

/** Prefixa "+" em valores positivos ("+R$ 10,00"). */
export function signed(text: string, value: Decimal) {
  return value.isPositive() && !value.isZero() ? `+${text}` : text;
}
