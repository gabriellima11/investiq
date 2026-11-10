/**
 * Visão geral da carteira — só apresentação. Recebe o resumo já calculado.
 *
 * Sem "use client" e sem acesso a banco: funciona tanto renderizado no
 * servidor (/carteira) quanto dentro de um Client Component (/visitante).
 */
import Link from "next/link";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { EvolutionChart } from "@/components/charts/evolution-chart";
import { InfoHint } from "@/components/info-hint";
import { Badge, Panel, PanelHeader, resultClass, signed } from "@/components/layout-parts";
import { formatBRL, formatPercent, formatQuantity } from "@/lib/money";
import type { PortfolioSummary } from "@/lib/portfolio/summarize";
import { cn } from "@/lib/utils";

const TYPE_LABEL = { STOCK: "Ação", FII: "FII", ETF: "ETF" } as const;
const TYPE_LABEL_PLURAL = { STOCK: "Ações", FII: "FIIs", ETF: "ETFs" } as const;

export function PortfolioView({ p, transactionsHref }: { p: PortfolioSummary; transactionsHref: string }) {
  if (p.positions.length === 0) {
    return (
      <Panel className="items-center gap-3 px-6 py-14 text-center">
        <p className="text-base font-semibold">Sua carteira está vazia</p>
        <p className="text-muted-foreground">Registre a primeira compra para acompanhar o patrimônio.</p>
        <Link
          href={transactionsHref}
          className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Registrar compra
        </Link>
      </Panel>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          label="Patrimônio"
          value={formatBRL(p.totalValue)}
          hint="Valor de mercado das posições"
          info="Quanto sua carteira vale hoje: quantidade de cada ativo × cotação atual (com atraso de até 30 min). Ativos sem cotação não entram nesta soma."
        />
        <StatCard
          label="Valor aplicado"
          value={formatBRL(p.totalCost)}
          hint="Custo médio somado"
          info="Quanto você pagou pelas cotas que ainda tem: quantidade × preço médio, já incluindo as taxas das compras. Vendas reduzem este valor pelo preço médio."
        />
        <StatCard
          info="Patrimônio − valor aplicado: quanto você ganharia ou perderia se vendesse tudo agora. Não inclui o lucro de vendas já feitas nem proventos. A porcentagem é sobre o valor aplicado."
          label="Lucro / prejuízo"
          value={signed(formatBRL(p.result), p.result)}
          valueClass={resultClass(p.result)}
          hint={p.resultPercent ? `${signed(formatPercent(p.resultPercent), p.resultPercent)} sobre o custo` : undefined}
          hintClass={resultClass(p.result)}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Panel className="min-w-0 flex-[999_1_560px]">
          <PanelHeader
            title="Evolução do patrimônio"
            description="Valor aplicado no fim de cada mês · ganho de capital com a cotação de hoje"
          />
          <div className="px-5 pb-5">
            <EvolutionChart
              data={p.evolution.map((pt) => ({
                label: pt.label,
                // Decimal → number SÓ aqui, para o SVG desenhar (arredondado a centavos).
                invested: pt.invested.toDecimalPlaces(2).toNumber(),
                capitalGain: pt.capitalGain?.toDecimalPlaces(2).toNumber() ?? null,
              }))}
            />
          </div>
        </Panel>
        <Panel className="flex-[1_1_340px]">
          <PanelHeader title="Ativos na carteira" description="Alocação por tipo, pelo valor de mercado" />
          <div className="px-5 pb-6">
            <AllocationChart
              data={p.allocation.map((s) => ({
                label: TYPE_LABEL_PLURAL[s.type],
                value: s.value.toDecimalPlaces(2).toNumber(),
                shareText: formatPercent(s.share),
              }))}
            />
          </div>
        </Panel>
      </div>

      {p.missingQuotes && (
        <p role="status" className="text-warning">
          Alguns ativos estão sem cotação no momento e não entram no patrimônio.
        </p>
      )}

      <Panel>
        <PanelHeader title="Ativos" description="Posição por ativo, preço médio e rentabilidade" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-y text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Ativo</th>
                <th className="p-3 font-medium">Classe</th>
                <th className="p-3 text-right font-medium">Cotas</th>
                <th className="p-3 text-right font-medium">Preço médio</th>
                <th className="p-3 text-right font-medium">Cotação</th>
                <th className="p-3 text-right font-medium">Saldo</th>
                <th className="px-5 py-3 text-right font-medium">Rentab.</th>
              </tr>
            </thead>
            <tbody>
              {p.positions.map((pos) => (
                <tr key={pos.ticker} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold">
                        {pos.ticker.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold">{pos.ticker}</div>
                        <div className="max-w-56 truncate text-xs text-muted-foreground">{pos.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge>{TYPE_LABEL[pos.type]}</Badge>
                  </td>
                  <Num>{formatQuantity(pos.quantity)}</Num>
                  <Num>{formatBRL(pos.averagePrice)}</Num>
                  <Num>
                    {pos.currentPrice ? formatBRL(pos.currentPrice) : "—"}
                    {pos.stale && <span className="block font-sans text-xs text-warning">cotação antiga</span>}
                  </Num>
                  <Num>{pos.marketValue ? formatBRL(pos.marketValue) : "—"}</Num>
                  <td className={cn("px-5 py-3 text-right font-semibold", resultClass(pos.result))}>
                    {pos.result && pos.resultPercent ? (
                      <>
                        {signed(formatPercent(pos.resultPercent), pos.resultPercent)}
                        <span className="block font-mono text-xs font-medium">
                          {signed(formatBRL(pos.result), pos.result)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/** Célula numérica: fonte mono alinhada à direita (do design). */
function Num({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-right font-mono text-[13px] tabular-nums">{children}</td>;
}

function StatCard({ label, value, hint, info, valueClass, hintClass }: {
  label: string;
  /** Explicação do indicador, mostrada no ícone ⓘ. */
  info?: string;
  value: string;
  hint?: string;
  valueClass?: string;
  hintClass?: string;
}) {
  return (
    <Panel className="gap-1.5 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-muted-foreground">{label}</span>
        {info && <InfoHint label={label}>{info}</InfoHint>}
      </div>
      <span className={cn("text-[26px] font-bold tracking-tight tabular-nums", valueClass)}>{value}</span>
      {hint && <span className={cn("text-muted-foreground", hintClass)}>{hint}</span>}
    </Panel>
  );
}

export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4" aria-label="Carregando cotações">
      {[0, 1, 2].map((i) => (
        <Panel key={i} className="h-[110px] animate-pulse bg-muted/40" />
      ))}
    </div>
  );
}
