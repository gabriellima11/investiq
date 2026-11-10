"use client";
/**
 * Gráfico de barras empilhadas: valor aplicado + ganho de capital por mês.
 *
 * Client Component porque o Recharts mede o tamanho da tela e reage ao mouse
 * (tooltip). Ele recebe os dados JÁ CALCULADOS no servidor (com Decimal);
 * aqui só convertemos para `number` porque o SVG precisa de números para
 * desenhar a altura das barras — nenhuma conta financeira acontece aqui.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EvolutionChartPoint {
  label: string;
  invested: number;
  /** null nos meses sem cotação histórica (Opção A). */
  capitalGain: number | null;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Cores do tema (zinc + verde/vermelho do tema escuro).
const COLOR_INVESTED = "#71717a"; // zinc-500
const COLOR_GAIN = "#4ade80";
const COLOR_LOSS = "#f87171";

export function EvolutionChart({ data }: { data: EvolutionChartPoint[] }) {
  const gain = data.at(-1)?.capitalGain ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-[13px] text-muted-foreground">
        <LegendItem color={COLOR_INVESTED} label="Valor aplicado" />
        <LegendItem color={gain < 0 ? COLOR_LOSS : COLOR_GAIN} label="Ganho de capital (mês atual)" />
      </div>
      {/* Texto alternativo: leitores de tela não "veem" o SVG. */}
      <div
        role="img"
        aria-label={`Valor aplicado por mês, de ${data[0]?.label} a ${data.at(-1)?.label}. Último mês: ${brl.format(data.at(-1)?.invested ?? 0)} aplicados.`}
        className="h-[280px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%">
            <CartesianGrid vertical={false} stroke="#27272a" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={72}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickFormatter={(v: number) => brlShort.format(v)}
            />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
              labelStyle={{ color: "#fafafa", fontWeight: 600 }}
              formatter={(value, name) => [
                brl.format(Number(value)),
                name === "invested" ? "Valor aplicado" : "Ganho de capital",
              ]}
            />
            {/* stackId igual → as duas barras ficam empilhadas */}
            <Bar dataKey="invested" stackId="total" fill={COLOR_INVESTED} radius={[0, 0, 0, 0]} />
            <Bar
              dataKey="capitalGain"
              stackId="total"
              fill={gain < 0 ? COLOR_LOSS : COLOR_GAIN}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
