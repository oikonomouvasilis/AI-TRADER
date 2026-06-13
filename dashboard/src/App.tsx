import { useMemo, useState } from "react";
import { FilterBar } from "./components/FilterBar";
import { useData } from "./hooks/useData";
import { emptyFilters, type Filters } from "./lib/filters";
import { datetime, pct, signed, usd, plColor } from "./lib/format";
import { Overview } from "./views/Overview";
import { Trades } from "./views/Trades";
import { Research } from "./views/Research";
import { Positions } from "./views/Positions";

type Tab = "Overview" | "Trades" | "Research" | "Positions";
const TABS: Tab[] = ["Overview", "Trades", "Research", "Positions"];

const SHOW: Record<Tab, ("search" | "sector" | "side" | "outcome" | "dates")[]> = {
  Overview: ["sector", "dates"],
  Trades: ["search", "sector", "side", "outcome", "dates"],
  Research: ["search", "sector", "dates"],
  Positions: ["search", "sector"],
};

export default function App() {
  const { data, error, loading } = useData();
  const [tab, setTab] = useState<Tab>("Overview");
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const sectors = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    data.portfolio.positions.forEach((p) => s.add(p.sector));
    data.trades.closed.forEach((c) => s.add(c.sector));
    data.decisions.days.forEach((d) => d.candidates.forEach((c) => s.add(c.sector)));
    return [...s].filter(Boolean).sort();
  }, [data]);

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="animate-pulse text-sm tracking-widest text-neon-cyan neon-text">
          LOADING…
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-neon-red">Failed to load data</p>
          <p className="mt-2 max-w-md text-xs text-slate-500">{error}</p>
          <p className="mt-4 text-xs text-slate-600">
            Data is generated on each trading run — check back after the next run.
          </p>
        </div>
      </div>
    );

  const k = data.portfolio.kpis;
  const updated = [data.portfolio.updated_at, data.trades.updated_at, data.decisions.updated_at]
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neon-cyan neon-text sm:text-3xl">
            AI&nbsp;TRADER
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            paper · value-driven momentum · updated {datetime(updated)}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Equity</div>
            <div className="font-mono text-lg font-bold text-slate-100">{usd(k.equity)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Total P&L</div>
            <div className={`font-mono text-lg font-bold ${plColor(k.total_pl)}`}>
              {signed(k.total_pl)} <span className="text-xs">({pct(k.total_pl_pct)})</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-neon-cyan/15 text-neon-cyan shadow-glow shadow-neon-cyan/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} sectors={sectors} show={SHOW[tab]} />
      </div>

      {tab === "Overview" && <Overview data={data} filters={filters} />}
      {tab === "Trades" && <Trades data={data} filters={filters} />}
      {tab === "Research" && <Research data={data} filters={filters} />}
      {tab === "Positions" && <Positions data={data} filters={filters} />}

      <footer className="mt-8 border-t border-white/5 pt-4 text-center text-[11px] text-slate-600">
        AI Trader · Alpaca paper · data refreshes each trading run · not financial advice
      </footer>
    </div>
  );
}
