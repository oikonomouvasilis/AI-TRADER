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
        if len(series) < config.MIN_BARS:
            continue
        closes = [b.close for b in series]
        first, last = closes[0], closes[-1]
        if first <= 0:
            continue
        avg_dollar_vol = sum(b.close * b.volume for b in series) / len(series)
        max_day_jump = max(
            (closes[i] - closes[i - 1]) / closes[i - 1]
            for i in range(1, len(closes)) if closes[i - 1] > 0
        )
        out[sym] = {
            "price": round(last, 2),
            "momentum_pct": round((last - first) / first * 100, 2),
            "avg_dollar_vol": round(avg_dollar_vol),
            "max_day_jump_pct": round(max_day_jump * 100, 2),
        }
    return out


def candidates() -> list[dict]:
    """Top pre-screened candidates, ranked by momentum. Quality gates:
    price in [1, MAX_PRICE] (whole-share + stop fits $50 cap), momentum above
    MIN_MOMENTUM_PCT, liquidity above MIN_AVG_DOLLAR_VOL, and no single-day
    jump above MAX_DAILY_SPIKE_PCT (anti-pump). Returns list of
    {symbol, price, momentum_pct, avg_dollar_vol, max_day_jump_pct}."""
    syms = _universe()
    mom = _momentum(syms)
    rows = [
        {"symbol": s, **d}
        for s, d in mom.items()
        if 1.0 <= d["price"] <= config.MAX_PRICE
        and d["momentum_pct"] >= config.MIN_MOMENTUM_PCT
        and d["avg_dollar_vol"] >= config.MIN_AVG_DOLLAR_VOL
        and d["max_day_jump_pct"] <= config.MAX_DAILY_SPIKE_PCT
    ]
    rows.sort(key=lambda r: r["momentum_pct"], reverse=True)
    return rows[: config.CANDIDATE_LIMIT]
