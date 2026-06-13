import { EquityCurve, SectorDonut } from "../components/charts";
import { KpiCard, Section } from "../components/ui";
import { inRange, matchSector, type Filters } from "../lib/filters";
import { usd, pct, signed, plColor } from "../lib/format";
import type { DashboardData } from "../lib/types";

export function Overview({ data, filters }: { data: DashboardData; filters: Filters }) {
  const { portfolio, decisions } = data;
  const k = portfolio.kpis;
  const curve = portfolio.curve.filter((p) => inRange(p.t, filters));
  const alloc = portfolio.sector_allocation.filter((s) => matchSector(s.sector, filters));
  const latest = decisions.days[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Equity" value={usd(k.equity)} accent="cyan" sub={`base ${usd(portfolio.base_value, 0)}`} />
        <KpiCard label="Total P&L" value={signed(k.total_pl)} signed={k.total_pl} sub={pct(k.total_pl_pct)} />
        <KpiCard label="Realized" value={signed(k.realized_pl)} signed={k.realized_pl} sub={`${k.num_closed_trades} closed`} />
        <KpiCard label="Unrealized" value={signed(k.unrealized_pl)} signed={k.unrealized_pl} sub={`${k.open_positions} open`} />
        <KpiCard label="Win rate" value={k.num_closed_trades ? pct(k.win_rate, 0) : "—"} accent="lime" sub={`${k.num_closed_trades} trades`} />
        <KpiCard label="Cash" value={usd(portfolio.account.cash, 0)} accent="amber" sub={`BP ${usd(portfolio.account.buying_power, 0)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Portfolio equity" className="lg:col-span-2">
          <EquityCurve data={curve} />
        </Section>
        <Section title="Sector allocation">
          <SectorDonut data={alloc} />
        </Section>
      </div>

      {latest && (
        <Section
          title={`Latest run · ${latest.day}`}
          right={
            <span className="text-xs text-slate-500">
              {latest.candidates.length} examined · {latest.orders.length} orders
            </span>
          }
        >
          {latest.note && (
            <p className="mb-2 text-sm text-neon-amber/80">⚠ {latest.note}</p>
          )}
          {latest.decisions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No trades — capital preservation (no qualifying setup).
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {latest.decisions.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono font-semibold text-neon-cyan">{d.symbol}</span>
                  <span className="text-slate-400">{usd(d.target_dollars, 0)}</span>
                  <span className="truncate text-slate-500">— {d.rationale}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
