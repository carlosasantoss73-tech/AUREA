"""Minimal append-only audit record for Tool Expert actions."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone
from .contracts import ExpertResult


def record(path: str, result: ExpertResult) -> None:
    result.validate()
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "expert_id": result.expert_id,
        "trace_id": result.trace_id,
        "status": result.status,
        "result": result.result,
        "evidence": [e.__dict__ for e in result.evidence],
        "decision": result.decision,
        "learning": result.learning,
        "adaptation": result.adaptation,
        "next_action": result.next_action,
        "blockers": result.blockers,
    }
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
