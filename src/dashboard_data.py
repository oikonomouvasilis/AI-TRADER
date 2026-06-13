"""Emit dashboard-ready JSON to docs/data/ from Alpaca + journal.

Additive & isolated: wrapped in try/except by the caller so it never breaks
trading. Runnable standalone to backfill: ``python -m src.dashboard_data``.
"""
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

from alpaca.trading.requests import GetOrdersRequest, GetPortfolioHistoryRequest
from alpaca.trading.enums import QueryOrderStatus

from . import clients, news

_ROOT = Path(__file__).resolve().parent.parent
_DATA = _ROOT / "docs" / "data"
_JOURNAL = _ROOT / "journal"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def _f(v, default=0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


# ---- sector map (journal first, Finnhub fallback, cached per run) ----
def _sector_map() -> dict[str, str]:
    smap: dict[str, str] = {}
    for p in sorted(_JOURNAL.glob("*.json")):
        try:
            rec = json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        for c in rec.get("candidates", []):
            if c.get("symbol") and c.get("sector"):
                smap[c["symbol"]] = c["sector"]
    return smap


def _sector_of(symbol: str, smap: dict[str, str]) -> str:
    if symbol not in smap:
        smap[symbol] = news._sector(symbol)   # Finnhub lookup, cached into map
    return smap.get(symbol) or "Unknown"


# ---- closed orders -> fills + FIFO round-trips ----
def _filled_orders():
    tc = clients.trading()
    orders = tc.get_orders(GetOrdersRequest(
        status=QueryOrderStatus.ALL, limit=500, nested=True, direction="asc"))
    filled = []
    for o in orders:
        if o.filled_at and _f(o.filled_qty) > 0:
            filled.append(o)
        for leg in (o.legs or []):
            if leg.filled_at and _f(leg.filled_qty) > 0:
                filled.append(leg)
    filled.sort(key=lambda x: x.filled_at)
    return filled


def build_trades(smap: dict[str, str]) -> dict:
    filled = _filled_orders()
    fills, closed = [], []
    lots: dict[str, deque] = defaultdict(deque)   # symbol -> buy lots FIFO

    for o in filled:
        sym = o.symbol
        side = o.side.value
        qty = _f(o.filled_qty)
        price = _f(o.filled_avg_price)
        fills.append({
            "t": _iso(o.filled_at), "symbol": sym, "side": side,
            "qty": qty, "price": round(price, 4), "value": round(qty * price, 2),
            "order_id": str(o.id),
        })
        if side == "buy":
            lots[sym].append([qty, price, o.filled_at])
        else:  # sell -> match FIFO against buy lots
            remaining = qty
            while remaining > 1e-9 and lots[sym]:
                lot = lots[sym][0]
                take = min(remaining, lot[0])
                pl = round((price - lot[1]) * take, 2)
                cost = lot[1] * take
                closed.append({
                    "symbol": sym, "qty": round(take, 4),
                    "entry_time": _iso(lot[2]), "entry_price": round(lot[1], 4),
                    "exit_time": _iso(o.filled_at), "exit_price": round(price, 4),
                    "pl": pl,
                    "pl_pct": round(pl / cost * 100, 2) if cost else 0.0,
                    "sector": _sector_of(sym, smap),
                })
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-9:
                    lots[sym].popleft()

    # open positions (live, with current unrealized P&L)
    open_pos = []
    for p in clients.trading().get_all_positions():
        open_pos.append({
            "symbol": p.symbol, "qty": _f(p.qty),
            "entry_price": round(_f(p.avg_entry_price), 4),
            "current_price": round(_f(p.current_price), 4),
            "market_value": round(_f(p.market_value), 2),
            "unrealized_pl": round(_f(p.unrealized_pl), 2),
            "unrealized_plpc": round(_f(p.unrealized_plpc) * 100, 2),
            "sector": _sector_of(p.symbol, smap),
        })

    return {"updated_at": _now(), "fills": fills, "closed": closed, "open": open_pos}


# ---- portfolio history + account snapshot ----
def build_portfolio(trades: dict, smap: dict[str, str]) -> dict:
    tc = clients.trading()
    acct = tc.get_account()
    ph = tc.get_portfolio_history(GetPortfolioHistoryRequest(period="1M", timeframe="1D"))

    ts = ph.timestamp or []
    eq = ph.equity or []
    pl = getattr(ph, "profit_loss", None) or [None] * len(ts)
    plpc = getattr(ph, "profit_loss_pct", None) or [None] * len(ts)
    curve_all = [
        {"t": datetime.fromtimestamp(t, timezone.utc).date().isoformat(),
         "equity": _f(eq[i]),
         "pl": _f(pl[i]) if i < len(pl) and pl[i] is not None else None,
         "pl_pct": round(_f(plpc[i]) * 100, 2) if i < len(plpc) and plpc[i] is not None else None}
        for i, t in enumerate(ts) if i < len(eq)
    ]
    # Drop pre-funding points (0 -> 100k ramp) that would dwarf real P&L.
    nonzero = [c for c in curve_all if c["equity"] > 1.0]
    curve = nonzero if len(nonzero) >= 2 else curve_all

    open_pos = trades["open"]
    unreal = round(sum(p["unrealized_pl"] for p in open_pos), 2)
    realized = round(sum(c["pl"] for c in trades["closed"]), 2)
    wins = sum(1 for c in trades["closed"] if c["pl"] > 0)
    n_closed = len(trades["closed"])

    sector_alloc: dict[str, float] = defaultdict(float)
    for p in open_pos:
        sector_alloc[p["sector"]] += p["market_value"]
    total_mv = sum(sector_alloc.values()) or 1.0
    allocation = sorted(
        ({"sector": s, "market_value": round(v, 2), "pct": round(v / total_mv * 100, 1)}
         for s, v in sector_alloc.items()),
        key=lambda x: x["market_value"], reverse=True)

    equity = _f(acct.equity)
    base = curve[0]["equity"] if curve else equity
    return {
        "updated_at": _now(),
        "account": {
            "equity": equity, "cash": _f(acct.cash),
            "buying_power": _f(acct.buying_power),
            "long_market_value": _f(acct.long_market_value),
            "last_equity": _f(acct.last_equity),
        },
        "curve": curve,
        "base_value": round(base, 2),
        "positions": open_pos,
        "sector_allocation": allocation,
        "kpis": {
            "equity": round(equity, 2),
            "total_pl": round(realized + unreal, 2),
            "total_pl_pct": round((equity - base) / base * 100, 2) if base else 0.0,
            "realized_pl": realized,
            "unrealized_pl": unreal,
            "open_positions": len(open_pos),
            "num_closed_trades": n_closed,
            "win_rate": round(wins / n_closed * 100, 1) if n_closed else 0.0,
        },
    }


# ---- decisions / research (aggregate journal, newest first) ----
def build_decisions() -> dict:
    days = []
    for p in sorted(_JOURNAL.glob("*.json"), reverse=True):
        try:
            rec = json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        days.append({
            "day": rec.get("day", p.stem),
            "equity": rec.get("equity"),
            "note": rec.get("note"),
            "candidates": rec.get("candidates", []),
            "decisions": rec.get("decisions", []),
            "rejected": rec.get("rejected", []),
            "orders": rec.get("orders", []),
        })
    return {"updated_at": _now(), "days": days}


def write_all() -> None:
    _DATA.mkdir(parents=True, exist_ok=True)
    smap = _sector_map()
    trades = build_trades(smap)
    portfolio = build_portfolio(trades, smap)
    decisions = build_decisions()
    for name, obj in (("trades", trades), ("portfolio", portfolio),
                      ("decisions", decisions)):
        (_DATA / f"{name}.json").write_text(json.dumps(obj, indent=2))
    print(f"dashboard data written: {len(trades['fills'])} fills, "
          f"{len(trades['closed'])} closed, {len(portfolio['positions'])} open, "
          f"{len(decisions['days'])} days")


if __name__ == "__main__":
    write_all()
