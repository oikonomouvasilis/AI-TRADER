"""Candidate universe: most-active movers + momentum/value pre-screen."""
from datetime import datetime, timedelta, timezone

from alpaca.data.requests import StockBarsRequest, MostActivesRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed

from . import config, clients


def _universe(limit: int = 40) -> list[str]:
    """Most active stocks by volume (liquid, news-driven names)."""
    try:
        actives = clients.screener().get_most_actives(
            MostActivesRequest(by="volume", top=limit))
        return [a.symbol for a in actives.most_actives]
    except Exception:
        return []


def _momentum(symbols: list[str]) -> dict[str, dict]:
    """5-day momentum + latest price from daily bars."""
    if not symbols:
        return {}
    # free plan = IEX feed; SIP within 15 min is forbidden, so buffer end back.
    end = datetime.now(timezone.utc) - timedelta(minutes=20)
    start = end - timedelta(days=10)
    req = StockBarsRequest(symbol_or_symbols=symbols, timeframe=TimeFrame.Day,
                           start=start, end=end, feed=DataFeed.IEX)
    out: dict[str, dict] = {}
    try:
        bars = clients.stock_data().get_stock_bars(req).data
    except Exception:
        return out
    for sym, series in bars.items():
        if len(series) < 2:
            continue
        first, last = series[0].close, series[-1].close
        if first <= 0:
            continue
        out[sym] = {
            "price": round(last, 2),
            "momentum_pct": round((last - first) / first * 100, 2),
        }
    return out


def candidates() -> list[dict]:
    """Top pre-screened candidates: priced <= MAX_PRICE (whole-share + stop),
    ranked by momentum. Returns list of {symbol, price, momentum_pct}."""
    syms = _universe()
    mom = _momentum(syms)
    rows = [
        {"symbol": s, **d}
        for s, d in mom.items()
        if 1.0 <= d["price"] <= config.MAX_PRICE and d["momentum_pct"] > 0
    ]
    rows.sort(key=lambda r: r["momentum_pct"], reverse=True)
    return rows[: config.CANDIDATE_LIMIT]
