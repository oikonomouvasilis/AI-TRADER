import { activeCount, emptyFilters, type Filters } from "../lib/filters";

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  sectors: string[];
  show?: ("search" | "sector" | "side" | "outcome" | "dates")[];
}

const SEL =
  "input cursor-pointer appearance-none bg-[length:0] pr-7 " +
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[right_0.5rem_center] bg-no-repeat";

export function FilterBar({
  filters,
  setFilters,
  sectors,
  show = ["search", "sector", "side", "outcome", "dates"],
}: Props) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const has = (k: string) => show.includes(k as any);
  const n = activeCount(filters);

  return (
    <div className="card sticky top-2 z-20 flex flex-wrap items-center gap-2 p-3">
      {has("search") && (
        <input
          className="input w-36 sm:w-44"
          placeholder="🔍 Symbol…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value.toUpperCase() })}
        />
      )}
      {has("sector") && (
        <select className={`${SEL} w-40`} value={filters.sector} onChange={(e) => set({ sector: e.target.value })}>
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      {has("side") && (
        <select className={`${SEL} w-28`} value={filters.side} onChange={(e) => set({ side: e.target.value })}>
          <option value="all">Side</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      )}
      {has("outcome") && (
        <select className={`${SEL} w-32`} value={filters.outcome} onChange={(e) => set({ outcome: e.target.value })}>
          <option value="all">Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
        </select>
      )}
      {has("dates") && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="date"
            className="input"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
          />
          <span>→</span>
          <input
            type="date"
            className="input"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
          />
        </div>
      )}
      <button
        onClick={() => setFilters(emptyFilters)}
        disabled={n === 0}
        className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-neon-magenta/50 hover:text-neon-magenta disabled:opacity-30"
      >
        Reset{n > 0 ? ` (${n})` : ""}
      </button>
    </div>
  );
}
