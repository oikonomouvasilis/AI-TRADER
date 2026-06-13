import type { DashboardData, Decisions, Portfolio, Trades } from "./types";

const BASE = import.meta.env.BASE_URL || "./";

async function getJSON<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}data/${name}.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`${name}.json: ${res.status}`);
  return (await res.json()) as T;
}

export async function loadAll(): Promise<DashboardData> {
  const [portfolio, trades, decisions] = await Promise.all([
    getJSON<Portfolio>("portfolio"),
    getJSON<Trades>("trades"),
    getJSON<Decisions>("decisions"),
  ]);
  return { portfolio, trades, decisions };
}
