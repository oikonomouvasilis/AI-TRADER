"""Per-day trade journal (committed to repo => persists across Actions runs)."""
import json
from datetime import datetime, timezone
from pathlib import Path

_DIR = Path(__file__).resolve().parent.parent / "journal"


def _path(day: str) -> Path:
    return _DIR / f"{day}.json"


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def exists(day: str | None = None) -> bool:
    return _path(day or today()).exists()


def load(day: str | None = None) -> dict:
    p = _path(day or today())
    return json.loads(p.read_text()) if p.exists() else {}


def days() -> list[str]:
    """All journalled days, most recent first."""
    return sorted((p.stem for p in _DIR.glob("*.json")), reverse=True)


def write(record: dict, day: str | None = None) -> Path:
    _DIR.mkdir(exist_ok=True)
    p = _path(day or today())
    record["written_at"] = datetime.now(timezone.utc).isoformat()
    p.write_text(json.dumps(record, indent=2))
    return p
