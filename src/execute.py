"""Order execution: whole-share market entry + native bracket stop-loss."""
from alpaca.trading.requests import (MarketOrderRequest, TakeProfitRequest,
                                     StopLossRequest)
from alpaca.trading.enums import OrderSide, TimeInForce, OrderClass

from . import clients


def submit(approved: list[dict]) -> list[dict]:
    """Place each approved order as a BRACKET (entry + take-profit + hard stop).
    GTC so the protective stop persists past the entry day (a DAY bracket would
    cancel the stop at the close). Returns execution results for the journal."""
    tc = clients.trading()
    results = []
    for a in approved:
        order = MarketOrderRequest(
            symbol=a["symbol"],
            qty=a["shares"],
            side=OrderSide.BUY,
            time_in_force=TimeInForce.GTC,
            order_class=OrderClass.BRACKET,
            take_profit=TakeProfitRequest(limit_price=a["take_profit_price"]),
            stop_loss=StopLossRequest(stop_price=a["stop_price"]),
        )
        try:
            resp = tc.submit_order(order)
            results.append({**a, "status": "submitted", "order_id": str(resp.id)})
        except Exception as e:
            results.append({**a, "status": "error", "error": str(e)})
    return results
