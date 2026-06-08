"""Central config: risk limits (CLAUDE.md compliance) + env loading."""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Capital & risk limits (strict compliance, CLAUDE.md §2) ---
BASE_EQUITY = 1000.0          # simulation base
MAX_POSITION_PCT = 0.05       # 5% -> $50 max per ticker
MAX_SECTOR_PCT = 0.25         # 25% -> $250 max per sector
MAX_DAILY_PCT = 0.10          # 10% -> $100 max buying power per day

# --- Stop-loss / take-profit (hard bracket) ---
STOP_LOSS_PCT = 0.03          # -3% hard stop
TAKE_PROFIT_PCT = 0.10        # +10% target

# --- Screening ---
CANDIDATE_LIMIT = 15          # pre-screened candidates handed to the model
NEWS_PER_SYMBOL = 5           # headlines per symbol
# Whole-share constraint: native broker stop-loss requires non-fractional qty,
# so we only consider names where >=1 share fits the $50 cap.
MAX_PRICE = BASE_EQUITY * MAX_POSITION_PCT   # $50

# --- Credentials ---
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY", "")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "")
ALPACA_PAPER = os.getenv("ALPACA_PAPER", "true").lower() == "true"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")


def position_dollar_caps(equity: float) -> dict:
    """Dollar caps locked to the $1000 simulation base (CLAUDE.md §2).
    The live paper account may hold $100k; caps must stay $50/$250/$100.
    Only shrink below base if live equity drops under it."""
    base = min(equity, BASE_EQUITY) if equity > 0 else BASE_EQUITY
    return {
        "per_position": base * MAX_POSITION_PCT,
        "per_sector": base * MAX_SECTOR_PCT,
        "per_day": base * MAX_DAILY_PCT,
    }


def require_keys() -> None:
    missing = [k for k, v in {
        "ALPACA_API_KEY": ALPACA_API_KEY,
        "ALPACA_SECRET_KEY": ALPACA_SECRET_KEY,
        "ANTHROPIC_API_KEY": ANTHROPIC_API_KEY,
        "FINNHUB_API_KEY": FINNHUB_API_KEY,
    }.items() if not v]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)}")
