export const usd = (n: number | null | undefined, dp = 2): string =>
  n == null || isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      });

export const pct = (n: number | null | undefined, dp = 2): string =>
  n == null || isNaN(n) ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(dp)}%`;

export const num = (n: number | null | undefined, dp = 2): string =>
  n == null || isNaN(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: dp });

export const signed = (n: number | null | undefined, dp = 2): string =>
  n == null || isNaN(n) ? "—" : `${n > 0 ? "+" : ""}${usd(n, dp).replace("$", "")}`;

export const date = (s: string | null | undefined): string => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const datetime = (s: string | null | undefined): string => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/** Tailwind text color for a signed value. */
export const plColor = (n: number | null | undefined): string =>
  n == null || n === 0 ? "text-slate-300" : n > 0 ? "text-neon-green" : "text-neon-red";

export const dayOf = (iso: string): string => (iso || "").slice(0, 10);
