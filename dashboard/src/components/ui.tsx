import type { ReactNode } from "react";
import { plColor } from "../lib/format";

export function Section({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card animate-fade-in p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              {title}
            </h2>
          )}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent = "cyan",
  signed,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "cyan" | "magenta" | "lime" | "amber";
  signed?: number;
}) {
  const ring = {
    cyan: "text-neon-cyan shadow-neon-cyan/20",
    magenta: "text-neon-magenta shadow-neon-magenta/20",
    lime: "text-neon-lime shadow-neon-lime/20",
    amber: "text-neon-amber shadow-neon-amber/20",
  }[accent];
  const valueCls = signed !== undefined ? plColor(signed) : ring;
  return (
    <div className="card group relative overflow-hidden p-4">
      <div className={`absolute -right-6 -top-6 h-16 w-16 rounded-full blur-2xl ${ring} bg-current opacity-10`} />
      <div className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${valueCls}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "red" | "cyan" | "amber" | "magenta";
}) {
  const tones = {
    slate: "border-white/10 text-slate-300",
    green: "border-neon-green/30 text-neon-green bg-neon-green/10",
    red: "border-neon-red/30 text-neon-red bg-neon-red/10",
    cyan: "border-neon-cyan/30 text-neon-cyan bg-neon-cyan/10",
    amber: "border-neon-amber/30 text-neon-amber bg-neon-amber/10",
    magenta: "border-neon-magenta/30 text-neon-magenta bg-neon-magenta/10",
  }[tone];
  return <span className={`pill ${tones}`}>{children}</span>;
}
