# AI Trading — daily quant pipeline

Short-term **value-driven momentum** on an Alpaca **paper** account ($1000 sim).
Runs once per trading day at US market open via GitHub Actions.

## Flow
`research → receptivity check → execute`

1. **Research** (`screener` + `news`) — most-active movers, 5-day momentum, priced ≤ $50
   (whole-share so a native broker stop-loss is possible), enriched with Alpaca + Finnhub
   headlines and sector.
2. **Receptivity check** (`risk` + `agent`) — account snapshot, one Gemini decision call (free tier)
   (value-driven momentum PM), then strict gating: **$50/ticker · $250/sector · $100/day**.
3. **Execute** (`execute`) — whole-share market entry as a **bracket** order: hard stop-loss
   −3%, take-profit +10%. Results appended to `journal/YYYY-MM-DD.json`.

A per-day journal file acts as the "traded-today" lock (idempotent runs).

## Local run
```bash
pip install -r requirements.txt
cp .env.example .env   # fill in keys
python -m src.main --force   # --force ignores market-open / once-a-day gates
```

## Secrets (GitHub → Settings → Secrets and variables → Actions)
`ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `GEMINI_API_KEY`, `FINNHUB_API_KEY`.
Optional var `GEMINI_MODEL` (default `gemini-2.0-flash`).

## Limits (CLAUDE.md compliance)
Defined in `src/config.py`. Paper account → no real-capital risk.

## Notes
- Fractional shares can't carry a native broker stop-loss, so the universe is capped to
  names priced ≤ $50 (≥1 whole share within the per-ticker cap).
- Trading at the open = higher volatility / wider spreads (by design choice).
