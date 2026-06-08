"""Single daily decision call to Gemini Flash (free tier, value-driven momentum PM)."""
import json
import time

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

from . import config

_RETRY_STATUS = {503, 429, 500}
_MAX_TRIES = 3

_SYSTEM = (
    "You are an institutional Quant Portfolio Manager running a $1000 paper "
    "account with a short-term, value-driven momentum strategy. Absolute "
    "priority: capital preservation. Hard limits: max $50 per ticker, $250 per "
    "sector, $100 deployed per day. Only BUY names with a credible momentum + "
    "news catalyst; skip anything ambiguous (low-float pumps, no real news). "
    "Be selective — zero trades is a valid outcome. Respond with JSON only."
)

_INSTRUCTION = (
    "From the candidates below, choose the best BUY ideas for today. "
    "Return JSON: {\"decisions\": [{\"symbol\": str, \"target_dollars\": number "
    "(<=50), \"rationale\": str (<=20 words)}]}. Empty list if none qualify. "
    "Weigh momentum_pct against headlines sentiment; distrust extreme momentum "
    "with no supporting news. No prose outside JSON."
)


def decide(candidates: list[dict], snap: dict) -> list[dict]:
    if not candidates:
        return []
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    payload = {
        "account": {"equity": snap["equity"], "buying_power": snap["buying_power"],
                    "open_positions": snap["positions"]},
        "candidates": candidates,
    }
    cfg = types.GenerateContentConfig(
        system_instruction=_SYSTEM,
        response_mime_type="application/json",
        max_output_tokens=1024,
        temperature=0.3,
    )
    contents = f"{_INSTRUCTION}\n\nDATA:\n{json.dumps(payload)}"
    for attempt in range(1, _MAX_TRIES + 1):
        try:
            resp = client.models.generate_content(
                model=config.GEMINI_MODEL, contents=contents, config=cfg)
            return _parse(resp.text or "")
        except genai_errors.APIError as e:
            transient = getattr(e, "code", None) in _RETRY_STATUS
            if transient and attempt < _MAX_TRIES:
                time.sleep(2 ** attempt)   # 2s, 4s backoff
                continue
            raise


def _parse(text: str) -> list[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[-1]
        if text.endswith("```"):
            text = text[:-3]
    try:
        data = json.loads(text)
        return data.get("decisions", []) if isinstance(data, dict) else []
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1]).get("decisions", [])
            except json.JSONDecodeError:
                pass
        return []
