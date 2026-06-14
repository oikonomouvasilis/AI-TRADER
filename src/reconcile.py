"""Stop-loss persistence: guarantee every open position carries a live stop.

A bracket's native stop can go missing (cancelled leg, position acquired without
one, broker hiccup). On each run this re-arms a standalone GTC stop for any
position that lacks one, at the price recorded in the journal (fallback: a fresh
-STOP_LOSS_PCT off the current price). Idempotent: positions that already have a
live sell-stop are skipped, so re-running never duplicates stops.
"""
from alpaca.trading.requests import GetOrdersRequest, StopOrderRequest
from alpaca.trading.enums import (QueryOrderStatus, OrderSide, TimeInForce,
                                  OrderType)

from . import config, clients, journal

_STOP_TYPES = {OrderType.STOP, OrderType.STOP_LIMIT, OrderType.TRAILING_STOP}


def _symbols_with_stop(orders) -> set[str]:
    """Symbols that already have a live SELL stop (incl. nested bracket legs)."""
    protected: set[str] = set()

    def visit(o) -> None:
        otype = getattr(o, "type", None) or getattr(o, "order_type", None)
        if otype in _STOP_TYPES and getattr(o, "side", None) == OrderSide.SELL:
            protected.add(o.symbol)
        for leg in (getattr(o, "legs", None) or []):
            visit(leg)

    for o in orders:
        visit(o)
    return protected


def _recorded_stop(symbol: str) -> float | None:
    """Most recent stop_price journalled for this symbol, if any."""
    for day in journal.days():
        for o in journal.load(day).get("orders", []):
            if o.get("symbol") == symbol and o.get("stop_price"):
                return float(o["stop_price"])
    return None


def ensure_stops(snap: dict) -> list[dict]:
    """Re-arm a GTC stop for every open position missing one. Returns actions
    for the journal: {symbol, qty, stop_price, status, ...}."""
    tc = clients.trading()
    open_orders = tc.get_orders(
        GetOrdersRequest(status=QueryOrderStatus.OPEN, nested=True))
    protected = _symbols_with_stop(open_orders)

    actions: list[dict] = []
    for pos in snap["positions"]:
        sym = pos["symbol"]
        qty = int(pos["qty"])
        if qty < 1 or sym in protected:
            continue
        stop = _recorded_stop(sym) or round(
            pos["current_price"] * (1 - config.STOP_LOSS_PCT), 2)
        try:
            resp = tc.submit_order(StopOrderRequest(
                symbol=sym, qty=qty, side=OrderSide.SELL,
                time_in_force=TimeInForce.GTC, stop_price=stop))
            actions.append({"symbol": sym, "qty": qty, "stop_price": stop,
                            "status": "stop_armed", "order_id": str(resp.id)})
        except Exception as e:
            actions.append({"symbol": sym, "qty": qty, "stop_price": stop,
                            "status": "error", "error": str(e)})
    return actions
