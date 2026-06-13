import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** sortable value extractor; if omitted, column is not sortable */
  value?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: string;
}

export function DataTable<T>({ columns, rows, rowKey, initialSort, empty }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.value!(a);
      const vb = col.value!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );

  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  onClick={() => c.value && toggle(c.key)}
                  className={`whitespace-nowrap px-3 py-2.5 font-semibold ${alignCls(
                    c.align
                  )} ${c.value ? "cursor-pointer select-none hover:text-neon-cyan" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.value && (
                      <span className={active ? "text-neon-cyan" : "text-slate-600"}>
                        {active ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-slate-500"
              >
                {empty ?? "No data"}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className="border-t border-white/5 transition hover:bg-white/[0.04]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-3 py-2.5 ${alignCls(c.align)}`}
                  >
                    {c.render ? c.render(row) : String(c.value ? c.value(row) : "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
