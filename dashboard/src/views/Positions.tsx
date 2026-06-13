import { SectorDonut } from "../components/charts";
import { Column, DataTable } from "../components/DataTable";
import { KpiCard, Section } from "../components/ui";
import { matchSector, matchSymbol, type Filters } from "../lib/filters";
import { num, pct, plColor, signed, usd } from "../lib/format";
import type { DashboardData, Position } from "../lib/types";

export function Positions({ data, filters }: { data: DashboardData; filters: Filters }) {
  const rows = data.portfolio.positions.filter(
    (p) => matchSymbol(p.symbol, filters) && matchSector(p.sector, filters)
  );
  const alloc = data.portfolio.sector_allocation.filter((s) => matchSector(s.sector, filters));
  const totalMv = rows.reduce((a, p) => a + p.market_value, 0);
  const totalUpl = rows.reduce((a, p) => a + p.unrealized_pl, 0);

  const plCell = (v: number) => <span className={plColor(v)}>{signed(v)}</span>;
  const cols: Column<Position>[] = [
    { key: "symbol", label: "Symbol", value: (r) => r.symbol, render: (r) => <span className="font-mono font-semibold text-neon-cyan">{r.symbol}</span> },
    { key: "sector", label: "Sector", value: (r) => r.sector, render: (r) => <span className="text-slate-400">{r.sector}</span> },
    { key: "qty", label: "Qty", align: "right", value: (r) => r.qty, render: (r) => num(r.qty, 0) },
    { key: "entry", label: "Entry", align: "right", value: (r) => r.entry_price, render: (r) => usd(r.entry_price) },
    { key: "cur", label: "Current", align: "right", value: (r) => r.current_price, render: (r) => usd(r.current_price) },
    { key: "mv", label: "Mkt Value", align: "right", value: (r) => r.market_value, render: (r) => usd(r.market_value) },
    { key: "upl", label: "Unreal. P&L", align: "right", value: (r) => r.unrealized_pl, render: (r) => plCell(r.unrealized_pl) },
    { key: "uplpc", label: "Unreal. %", align: "right", value: (r) => r.unrealized_plpc, render: (r) => <span className={plColor(r.unrealized_plpc)}>{pct(r.unrealized_plpc)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Open positions" value={String(rows.length)} accent="cyan" />
        <KpiCard label="Market value" value={usd(totalMv)} accent="magenta" />
        <KpiCard label="Unrealized P&L" value={signed(totalUpl)} signed={totalUpl} />
        <KpiCard label="Sectors" value={String(alloc.length)} accent="lime" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Holdings" className="lg:col-span-2">
          <DataTable columns={cols} rows={rows} rowKey={(r) => r.symbol} initialSort={{ key: "mv", dir: "desc" }} empty="No open positions" />
        </Section>
        <Section title="Allocation">
          <SectorDonut data={alloc} />
        </Section>
      </div>
    </div>
  );
}
