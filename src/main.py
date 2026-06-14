"""Daily pipeline: research -> receptivity check -> execute (once per day)."""
import sys

from . import (config, clients, screener, news, risk, agent, execute, journal,
               reconcile, dashboard_data)


def _emit_dashboard() -> None:
    """Refresh docs/data/*.json. Isolated: never breaks the trading run."""
    try:
        dashboard_data.write_all()
    except Exception as e:
        print(f"dashboard data emit failed (non-fatal): {e}")


def _spent_today(snap: dict) -> float:
    """Today's already-deployed buying power, from journal (idempotent runs)."""
    rec = journal.load()
    return sum(o.get("notional", 0) for o in rec.get("orders", [])
              if o.get("status") == "submitted")


def run(force: bool = False) -> int:
    config.require_keys()
    day = journal.today()

    # --- Gate: market open + not already traded today ---
    clock = clients.trading().get_clock()
    if not force:
        if not clock.is_open:
            print(f"[{day}] market closed -> skip"); return 0
        if journal.exists(day):
            print(f"[{day}] already traded today -> skip"); return 0

    # --- 1. Account snapshot + stop-loss persistence (every run) ---
    snap = risk.snapshot()
    stops = reconcile.ensure_stops(snap)
    for s in stops:
        print(f"  stop {s['status']}: {s['symbol']} x{s.get('qty')} "
              f"@ {s.get('stop_price')}")

    # --- 2. Research ---
    cands = news.enrich(screener.candidates())
    print(f"[{day}] candidates: {len(cands)}")
    if not cands:
        journal.write({"day": day, "equity": snap["equity"], "decisions": [],
                       "orders": [], "stops": stops, "note": "no candidates"})
        _emit_dashboard()
        return 0

    # --- 3. Receptivity check (model decision) ---
    try:
        decisions = agent.decide(cands, snap)
    except Exception as e:
        # e.g. Anthropic credits exhausted -> stop trading, no crash, resume
        # automatically on the next run once credits are topped up.
        print(f"[{day}] agent unavailable -> no trades ({e})")
        journal.write({"day": day, "equity": snap["equity"], "candidates": cands,
                       "decisions": [], "orders": [], "stops": stops,
                       "note": f"agent_unavailable: {e}"})
        _emit_dashboard()
        return 0
    approved, rejected = risk.vet(decisions, snap, cands, _spent_today(snap))
    print(f"[{day}] decisions={len(decisions)} approved={len(approved)} "
          f"rejected={len(rejected)}")

    # --- 4. Execute ---
    orders = execute.submit(approved) if approved else []
    for o in orders:
        print(f"  {o['status']}: {o['symbol']} x{o.get('shares')} "
              f"@~{o.get('entry_price')} stop {o.get('stop_price')}")

    journal.write({
        "day": day,
        "equity": snap["equity"],
        "candidates": cands,
        "decisions": decisions,
        "rejected": rejected,
        "orders": orders,
        "stops": stops,
    })
    _emit_dashboard()
    return 0


if __name__ == "__main__":
    sys.exit(run(force="--force" in sys.argv))
