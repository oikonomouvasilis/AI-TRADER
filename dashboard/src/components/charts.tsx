import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurvePoint, SectorAlloc } from "../lib/types";
import { usd, pct } from "../lib/format";

const NEON = ["#22d3ee", "#e879f9", "#a3e635", "#fbbf24", "#38bdf8", "#f472b6", "#34d399"];

export function EquityCurve({ data }: { data: CurvePoint[] }) {
  if (data.length === 0)
    return <div className="grid h-64 place-items-center text-slate-600">No equity history</div>;
  const vals = data.map((d) => d.equity);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.15 || max * 0.001 || 1;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          minTickGap={28}
        />
        <YAxis
          domain={[min - pad, max + pad]}
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => usd(v, 0)}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(10,10,15,0.95)",
            border: "1px solid rgba(34,211,238,0.4)",
            borderRadius: 12,
            color: "#e2e8f0",
            fontSize: 12,
          }}
          formatter={(v: number) => [usd(v), "Equity"]}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#eq)"
          dot={false}
          activeDot={{ r: 4, fill: "#22d3ee", stroke: "#0a0a0f" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SectorDonut({ data }: { data: SectorAlloc[] }) {
  if (data.length === 0)
    return <div className="grid h-64 place-items-center text-slate-600">No positions</div>;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={220} className="max-w-[240px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="market_value"
            nameKey="sector"
            innerRadius={58}
            outerRadius={90}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={NEON[i % NEON.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(10,10,15,0.95)",
              border: "1px solid rgba(232,121,249,0.4)",
              borderRadius: 12,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            formatter={(v: number, n: string) => [usd(v), n]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((s, i) => (
          <li key={s.sector} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: NEON[i % NEON.length], boxShadow: `0 0 8px ${NEON[i % NEON.length]}` }}
            />
            <span className="truncate text-slate-300">{s.sector}</span>
            <span className="ml-auto font-mono text-xs text-slate-400">{pct(s.pct, 1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
