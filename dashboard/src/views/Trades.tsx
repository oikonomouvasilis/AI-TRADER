import { Column, DataTable } from "../components/DataTable";
import { Pill, Section } from "../components/ui";
import { inRange, matchSector, matchSymbol, type Filters } from "../lib/filters";
import { datetime, date, plColor, pct, signed, usd, num } from "../lib/format";
import type { ClosedTrade, Fill, Position, DashboardData } from "../lib/types";

export function Trades({ data, filters }: { data: DashboardData; filters: Filters }) {
  const f = filters;
  const base = (sym: string, sector: string, t: string) =>
    matchSymbol(sym, f) && matchSector(sector, f) && inRange(t, f);

  const showOpen = ["all", "open"].includes(f.outcome);
  const showClosed = ["all", "closed", "win", "loss"].includes(f.outcome);

  const closed = data.trades.closed.filter(
    (c) =>
      base(c.symbol, c.sector, c.exit_time) &&
      (f.outcome === "win" ? c.pl > 0 : f.outcome === "loss" ? c.pl < 0 : true)
  );
  const open = data.trades.open.filter((p) => base(p.symbol, p.sector, "") );
  const fills = data.trades.fills.filter(
    (x) => base(x.symbol, "", x.t) && (f.side === "all" || x.side === f.side)
  );

  const plCell = (v: number) => <span className={plColor(v)}>{signed(v)}</span>;
  const pctCell = (v: number) => <span className={plColor(v)}>{pct(v)}</span>;
  const symCell = (s: string) => <span className="font-mono font-semibold text-neon-cyan">{s}</span>;

  const closedCols: Column<ClosedTrade>[] = [
    { key: "symbol", label: "Symbol", value: (r) => r.symbol, render: (r) => symCell(r.symbol) },
    { key: "sector", label: "Sector", value: (r) => r.sector, render: (r) => <span className="text-slate-400">{r.sector}</span> },
    { key: "qty", label: "Qty", align: "right", value: (r) => r.qty, render: (r) => num(r.qty, 0) },
    { key: "entry", label: "Entry", align: "right", value: (r) => r.entry_price, render: (r) => usd(r.entry_price) },
    { key: "exit", label: "Exit", align: "right", value: (r) => r.exit_price, render: (r) => usd(r.exit_price) },
    { key: "pl", label: "P&L", align: "right", value: (r) => r.pl, render: (r) => plCell(r.pl) },
    { key: "plpct", label: "P&L %", align: "right", value: (r) => r.pl_pct, render: (r) => pctCell(r.pl_pct) },
    { key: "date", label: "Closed", align: "right", value: (r) => r.exit_time, render: (r) => <span className="text-slate-400">{date(r.exit_time)}</span> },
  ];

  const openCols: Column<Position>[] = [
    { key: "symbol", label: "Symbol", value: (r) => r.symbol, render: (r) => symCell(r.symbol) },
    { key: "sector", label: "Sector", value: (r) => r.sector, render: (r) => <span className="text-slate-400">{r.sector}</span> },
    { key: "qty", label: "Qty", align: "right", value: (r) => r.qty, render: (r) => num(r.qty, 0) },
    { key: "entry", label: "Entry", align: "right", value: (r) => r.entry_price, render: (r) => usd(r.entry_price) },
    { key: "cur", label: "Current", align: "right", value: (r) => r.current_price, render: (r) => usd(r.current_price) },
    { key: "mv", label: "Value", align: "right", value: (r) => r.market_value, render: (r) => usd(r.market_value) },
    { key: "upl", label: "Unreal. P&L", align: "right", value: (r) => r.unrealized_pl, render: (r) => plCell(r.unrealized_pl) },
    { key: "uplpc", label: "Unreal. %", align: "right", value: (r) => r.unrealized_plpc, render: (r) => pctCell(r.unrealized_plpc) },
  ];

  const fillCols: Column<Fill>[] = [
    { key: "t", label: "Time", value: (r) => r.t, render: (r) => <span className="text-slate-400">{datetime(r.t)}</span> },
    { key: "symbol", label: "Symbol", value: (r) => r.symbol, render: (r) => symCell(r.symbol) },
    { key: "side", label: "Side", value: (r) => r.side, render: (r) => <Pill tone={r.side === "buy" ? "green" : "red"}>{r.side.toUpperCase()}</Pill> },
    { key: "qty", label: "Qty", align: "right", value: (r) => r.qty, render: (r) => num(r.qty, 0) },
    { key: "price", label: "Price", align: "right", value: (r) => r.price, render: (r) => usd(r.price) },
    { key: "value", label: "Value", align: "right", value: (r) => r.value, render: (r) => usd(r.value) },
  ];

  return (
    <div className="space-y-4">
      {showClosed && (
        <Section title="Closed trades" right={<span className="text-xs text-slate-500">{closed.length}</span>}>
          <DataTable columns={closedCols} rows={closed} rowKey={(_, i) => `c${i}`} initialSort={{ key: "date", dir: "desc" }} empty="No closed trades yet" />
        </Section>
      )}
      {showOpen && (
        <Section title="Open positions" right={<span className="text-xs text-slate-500">{open.length}</span>}>
          <DataTable columns={openCols} rows={open} rowKey={(r) => r.symbol} initialSort={{ key: "mv", dir: "desc" }} empty="No open positions" />
        </Section>
      )}
      <Section title="Fills (activity log)" right={<span className="text-xs text-slate-500">{fills.length}</span>}>
        <DataTable columns={fillCols} rows={fills} rowKey={(r, i) => r.order_id + i} initialSort={{ key: "t", dir: "desc" }} empty="No fills" />
      </Section>
    </div>
  );
}
