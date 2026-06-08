"""Daily pipeline: research -> receptivity check -> execute (once per day)."""
import sys

from . import config, clients, screener, news, risk, agent, execute, journal


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

    # --- 1. Research ---
    cands = news.enrich(screener.candidates())
    print(f"[{day}] candidates: {len(cands)}")
    if not cands:
        journal.write({"day": day, "decisions": [], "orders": [],
                       "note": "no candidates"})
        return 0

    # --- 2. Receptivity check (account snapshot + model decision) ---
    snap = risk.snapshot()
    try:
        decisions = agent.decide(cands, snap)
    except Exception as e:
        # e.g. Anthropic credits exhausted -> stop trading, no crash, resume
        # automatically on the next run once credits are topped up.
        print(f"[{day}] agent unavailable -> no trades ({e})")
        journal.write({"day": day, "equity": snap["equity"], "candidates": cands,
                       "decisions": [], "orders": [], "note": f"agent_unavailable: {e}"})
        return 0
    approved, rejected = risk.vet(decisions, snap, cands, _spent_today(snap))
    print(f"[{day}] decisions={len(decisions)} approved={len(approved)} "
          f"rejected={len(rejected)}")

    # --- 3. Execute ---
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
    })
    return 0


if __name__ == "__main__":
    sys.exit(run(force="--force" in sys.argv))
