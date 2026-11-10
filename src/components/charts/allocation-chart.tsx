"use client";
/**
 * Donut de alocação por tipo de ativo. Client Component pelo mesmo motivo do
 * gráfico de evolução: o Recharts precisa do navegador.
 * A legenda é HTML comum (fora do SVG), então leitores de tela a leem.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface AllocationChartSlice {
  label: string;
  value: number;
  /** Já formatado no servidor: "63,46%". */
  shareText: string;
}

// Cores distinguíveis também pela luminosidade (não só pelo matiz).
const COLORS = ["#fafafa", "#a1a1aa", "#52525b"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AllocationChart({ data }: { data: AllocationChartSlice[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="size-[200px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={96}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
            >
              {data.map((slice, i) => (
                <Cell key={slice.label} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
              itemStyle={{ color: "#fafafa" }}
              formatter={(value, name) => [brl.format(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-44 flex-col gap-2.5">
        {data.map((slice, i) => (
          <li key={slice.label} className="flex items-center gap-3">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
            <span className="flex-1 font-medium">{slice.label}</span>
            <span className="font-mono text-[13px] tabular-nums">{slice.shareText}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
