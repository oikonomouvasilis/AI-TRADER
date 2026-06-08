"""Alpaca client factories (single source of truth)."""
from functools import lru_cache

from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.historical.screener import ScreenerClient
from alpaca.data.historical.news import NewsClient

from . import config


@lru_cache(maxsize=1)
def trading() -> TradingClient:
    return TradingClient(config.ALPACA_API_KEY, config.ALPACA_SECRET_KEY,
                         paper=config.ALPACA_PAPER)


@lru_cache(maxsize=1)
def stock_data() -> StockHistoricalDataClient:
    return StockHistoricalDataClient(config.ALPACA_API_KEY, config.ALPACA_SECRET_KEY)


@lru_cache(maxsize=1)
def screener() -> ScreenerClient:
    return ScreenerClient(config.ALPACA_API_KEY, config.ALPACA_SECRET_KEY)


@lru_cache(maxsize=1)
def news() -> NewsClient:
    return NewsClient(config.ALPACA_API_KEY, config.ALPACA_SECRET_KEY)
