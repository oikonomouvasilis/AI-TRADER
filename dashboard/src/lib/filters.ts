export interface Filters {
  search: string; // symbol contains
  sector: string; // "all" | sector
  side: string; // "all" | "buy" | "sell"
  outcome: string; // "all" | "open" | "closed" | "win" | "loss"
  from: string; // yyyy-mm-dd | ""
  to: string; // yyyy-mm-dd | ""
}

export const emptyFilters: Filters = {
  search: "",
  sector: "all",
  side: "all",
  outcome: "all",
  from: "",
  to: "",
};

export const matchSymbol = (sym: string, f: Filters): boolean =>
  !f.search || sym.toLowerCase().includes(f.search.toLowerCase());

export const matchSector = (sector: string, f: Filters): boolean =>
  f.sector === "all" || sector === f.sector;

export const inRange = (iso: string, f: Filters): boolean => {
  const d = (iso || "").slice(0, 10);
  if (!d) return true;
  if (f.from && d < f.from) return false;
  if (f.to && d > f.to) return false;
  return true;
};

export const activeCount = (f: Filters): number =>
  (f.search ? 1 : 0) +
  (f.sector !== "all" ? 1 : 0) +
  (f.side !== "all" ? 1 : 0) +
  (f.outcome !== "all" ? 1 : 0) +
  (f.from ? 1 : 0) +
  (f.to ? 1 : 0);
