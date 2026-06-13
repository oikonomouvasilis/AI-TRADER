export interface CurvePoint {
  t: string;
  equity: number;
  pl: number | null;
  pl_pct: number | null;
}

export interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  sector: string;
}

export interface SectorAlloc {
  sector: string;
  market_value: number;
  pct: number;
}

export interface Kpis {
  equity: number;
  total_pl: number;
  total_pl_pct: number;
  realized_pl: number;
  unrealized_pl: number;
  open_positions: number;
  num_closed_trades: number;
  win_rate: number;
}

export interface Portfolio {
  updated_at: string;
  account: {
    equity: number;
    cash: number;
    buying_power: number;
    long_market_value: number;
    last_equity: number;
  };
  curve: CurvePoint[];
  base_value: number;
  positions: Position[];
  sector_allocation: SectorAlloc[];
  kpis: Kpis;
}

export interface Fill {
  t: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  value: number;
  order_id: string;
}

export interface ClosedTrade {
  symbol: string;
  qty: number;
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  pl: number;
  pl_pct: number;
  sector: string;
}

export interface Trades {
  updated_at: string;
  fills: Fill[];
  closed: ClosedTrade[];
  open: Position[];
}

export interface Candidate {
  symbol: string;
  price: number;
  momentum_pct: number;
  sector: string;
  headlines: string[];
}

export interface Decision {
  symbol: string;
  target_dollars: number;
  rationale: string;
}

export interface Order {
  symbol: string;
  shares: number;
  entry_price: number;
  stop_price: number;
  take_profit_price: number;
  notional: number;
  sector: string;
  rationale: string;
  status: string;
  order_id?: string;
}

export interface DayRecord {
  day: string;
  equity: number | null;
  note: string | null;
  candidates: Candidate[];
  decisions: Decision[];
  rejected: (Decision & { reason: string })[];
  orders: Order[];
}

export interface Decisions {
  updated_at: string;
  days: DayRecord[];
}

export interface DashboardData {
  portfolio: Portfolio;
  trades: Trades;
  decisions: Decisions;
}
