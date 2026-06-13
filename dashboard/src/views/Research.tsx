import { useState } from "react";
import { Column, DataTable } from "../components/DataTable";
import { Pill, Section } from "../components/ui";
import { inRange, matchSector, matchSymbol, type Filters } from "../lib/filters";
import { pct, usd } from "../lib/format";
import type { Candidate, DashboardData, DayRecord } from "../lib/types";

function momentumCell(v: number) {
  const tone = v > 200 ? "text-neon-amber neon-text" : v > 0 ? "text-neon-green" : "text-neon-red";
  return <span className={`font-mono ${tone}`}>{pct(v, 1)}</span>;
}

function DayCard({ day, filters, defaultOpen }: { day: DayRecord; filters: Filters; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const cands = day.candidates.filter(
    (c) => matchSymbol(c.symbol, filters) && matchSector(c.sector, filters)
  );
  if (cands.length === 0 && filters.search) return null;

  const cols: Column<Candidate>[] = [
    { key: "symbol", label: "Symbol", value: (r) => r.symbol, render: (r) => <span className="font-mono font-semibold text-neon-cyan">{r.symbol}</span> },
    { key: "price", label: "Price", align: "right", value: (r) => r.price, render: (r) => usd(r.price) },
    { key: "mom", label: "Momentum", align: "right", value: (r) => r.momentum_pct, render: (r) => momentumCell(r.momentum_pct) },
    { key: "sector", label: "Sector", value: (r) => r.sector, render: (r) => <span className="text-slate-400">{r.sector}</span> },
    {
      key: "news",
      label: "Headlines",
      value: (r) => r.headlines.length,
      render: (r) =>
        r.headlines.length === 0 ? (
          <span className="text-slate-600">—</span>
        ) : (
          <span className="flex items-center gap-2" title={r.headlines.join("\n")}>
            <Pill tone="cyan">{r.headlines.length}</Pill>
            <span className="max-w-[280px] truncate text-xs text-slate-500">{r.headlines[0]}</span>
          </span>
        ),
    },
  ];

  const accepted = new Set(day.decisions.map((d) => d.symbol));

  return (
    <Section
      title={`${day.day}`}
      right={
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 text-xs text-slate-500 hover:text-neon-cyan">
          <span>{day.candidates.length} examined</span>
          {day.decisions.length > 0 && <Pill tone="green">{day.decisions.length} buys</Pill>}
          {day.note && <Pill tone="amber">skipped</Pill>}
          <span>{open ? "▾" : "▸"}</span>
        </button>
      }
    >
      {open && (
        <div className="space-y-3">
          {day.note && <p className="text-sm text-neon-amber/80">⚠ {day.note}</p>}

          {(day.decisions.length > 0 || day.rejected.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {day.decisions.map((d, i) => (
                <Pill key={`d${i}`} tone="green" >
                  ✓ {d.symbol} · {usd(d.target_dollars, 0)}
                </Pill>
              ))}
              {day.rejected.slice(0, 8).map((r, i) => (
                <Pill key={`r${i}`} tone="red">
                  ✕ {r.symbol}: {r.reason}
                </Pill>
              ))}
            </div>
          )}

          {day.orders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {day.orders.map((o, i) => (
                <Pill key={`o${i}`} tone="cyan">
                  {o.symbol} ×{o.shares} @ {usd(o.entry_price)} · stop {usd(o.stop_price)}
                </Pill>
              ))}
            </div>
          )}

          <DataTable columns={cols} rows={cands} rowKey={(r) => r.symbol} initialSort={{ key: "mom", dir: "desc" }} empty="No candidates" />
        </div>
      )}
    </Section>
  );
}

export function Research({ data, filters }: { data: DashboardData; filters: Filters }) {
  const days = data.decisions.days.filter((d) => inRange(d.day, filters));
  if (days.length === 0)
    return <Section><p className="text-center text-slate-500">No research in range</p></Section>;
  return (
    <div className="space-y-4">
      {days.map((d, i) => (
        <DayCard key={d.day} day={d} filters={filters} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
