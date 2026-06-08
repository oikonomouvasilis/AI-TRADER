"""Account snapshot + strict compliance gating (5% / 25% / 10%)."""
from . import config, clients


def snapshot() -> dict:
    """Equity, buying power, open positions with market value + sector unknown."""
    acct = clients.trading().get_account()
    positions = clients.trading().get_all_positions()
    return {
        "equity": float(acct.equity),
        "buying_power": float(acct.buying_power),
        "cash": float(acct.cash),
        "positions": [
            {"symbol": p.symbol, "qty": float(p.qty),
             "market_value": float(p.market_value),
             "current_price": float(p.current_price)}
            for p in positions
        ],
    }


def position_value(snap: dict, symbol: str) -> float:
    return sum(p["market_value"] for p in snap["positions"] if p["symbol"] == symbol)


def sector_value(snap: dict, sector_map: dict[str, str], sector: str) -> float:
    return sum(p["market_value"] for p in snap["positions"]
               if sector_map.get(p["symbol"]) == sector)


def vet(decisions: list[dict], snap: dict, candidates: list[dict],
        spent_today: float) -> tuple[list[dict], list[dict]]:
    """Filter model decisions against limits. Returns (approved, rejected).

    Each approved item gains: shares (whole), entry_price, stop_price,
    take_profit_price, notional.
    """
    caps = config.position_dollar_caps(snap["equity"])
    by_symbol = {c["symbol"]: c for c in candidates}
    sector_map = {c["symbol"]: c.get("sector", "Unknown") for c in candidates}

    approved, rejected = [], []
    sector_spend: dict[str, float] = {}
    day_spend = spent_today

    for d in decisions:
        sym = d.get("symbol")
        cand = by_symbol.get(sym)
        if not cand:
            rejected.append({**d, "reason": "not in candidate set"})
            continue

        price = cand["price"]
        sector = cand.get("sector", "Unknown")
        target = float(d.get("target_dollars", 0))

        # cap per-position incl. existing exposure (pyramiding allowed up to $50)
        held = position_value(snap, sym)
        room = caps["per_position"] - held
        budget = min(target, room)

        # sector cap
        sec_held = sector_value(snap, sector_map, sector) + sector_spend.get(sector, 0)
        budget = min(budget, caps["per_sector"] - sec_held)

        # daily cap
        budget = min(budget, caps["per_day"] - day_spend)

        shares = int(budget // price)
        if shares < 1:
            rejected.append({**d, "reason": "no room within limits", "price": price})
            continue

        notional = round(shares * price, 2)
        approved.append({
            "symbol": sym,
            "shares": shares,
            "entry_price": price,
            "stop_price": round(price * (1 - config.STOP_LOSS_PCT), 2),
            "take_profit_price": round(price * (1 + config.TAKE_PROFIT_PCT), 2),
            "notional": notional,
            "sector": sector,
            "rationale": d.get("rationale", ""),
        })
        day_spend += notional
        sector_spend[sector] = sector_spend.get(sector, 0) + notional

    return approved, rejected
