"""Daily news + sector enrichment (Alpaca news API + Finnhub free tier)."""
from datetime import datetime, timedelta, timezone

import requests

from alpaca.data.requests import NewsRequest

from . import config, clients

_FINNHUB = "https://finnhub.io/api/v1"
_TIMEOUT = 10


def _alpaca_headlines(symbols: list[str]) -> dict[str, list[str]]:
    if not symbols:
        return {}
    start = datetime.now(timezone.utc) - timedelta(days=2)
    out: dict[str, list[str]] = {s: [] for s in symbols}
    try:
        res = clients.news().get_news(NewsRequest(
            symbols=symbols, start=start, limit=50, include_content=False))
        for item in res.news:
            for s in getattr(item, "symbols", []):
                if s in out and len(out[s]) < config.NEWS_PER_SYMBOL:
                    out[s].append(item.headline)
    except Exception:
        pass
    return out


def _finnhub_news(symbol: str) -> list[str]:
    today = datetime.now(timezone.utc).date()
    frm = (today - timedelta(days=2)).isoformat()
    try:
        r = requests.get(f"{_FINNHUB}/company-news", timeout=_TIMEOUT, params={
            "symbol": symbol, "from": frm, "to": today.isoformat(),
            "token": config.FINNHUB_API_KEY})
        r.raise_for_status()
        return [n["headline"] for n in r.json()[: config.NEWS_PER_SYMBOL]]
    except Exception:
        return []


def _sector(symbol: str) -> str:
    try:
        r = requests.get(f"{_FINNHUB}/stock/profile2", timeout=_TIMEOUT,
                         params={"symbol": symbol, "token": config.FINNHUB_API_KEY})
        r.raise_for_status()
        return r.json().get("finnhubIndustry") or "Unknown"
    except Exception:
        return "Unknown"


def enrich(candidates: list[dict]) -> list[dict]:
    """Attach headlines (Alpaca + Finnhub, deduped) and sector to each candidate."""
    symbols = [c["symbol"] for c in candidates]
    alpaca = _alpaca_headlines(symbols)
    enriched = []
    for c in candidates:
        sym = c["symbol"]
        heads = list(dict.fromkeys(alpaca.get(sym, []) + _finnhub_news(sym)))
        enriched.append({
            **c,
            "sector": _sector(sym),
            "headlines": heads[: config.NEWS_PER_SYMBOL],
        })
    return enriched
