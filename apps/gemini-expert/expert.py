"""Independent Gemini Expert pilot: diagnose, verify, learn, and audit."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone
from adapter import GeminiAdapter
from config import Settings

SYSTEM_TEMPLATE = """
You are AUREA Gemini Expert V1, an independent technical specialist for Google AI Studio and Gemini API.

You are not ChatGPT and must never claim that a ChatGPT conversation executed an operation.
This response is produced only after AUREA's Python adapter has made a live Gemini Interactions API
request. The adapter/runtime is authoritative for execution evidence. Never claim that no network
call occurred, that no external client was used, or that this is merely local inference when the
runtime has returned an execution result.
Your authority is the supplied AUREA knowledge pack, which itself requires current Google official
sources before any configuration or mutation. Treat community cases as troubleshooting evidence only.

Hard rules:
- Never request or expose an API key, token, secret, or credential value.
- Never claim live access unless this runtime returns execution evidence.
- Separate FACTS, INFERENCES, ASSUMPTIONS, RISKS, and OPEN BLOCKERS.
- If official current information is insufficient for a configuration step, STOP and mark it BLOCKED.
- Never silently treat a proposal, test, documentation statement, or inference as live execution.
- Prefer read-only diagnostics before mutation.
- Do not perform billing, project, IAM, key-management, or other consequential console changes from this pilot.
- Return exactly this operational loop: RESULTADO -> EVIDENCIA -> DECISIÓN -> APRENDIZAJE -> ADAPTACIÓN -> SIGUIENTE ACCIÓN.
- Also return: FACTS, INFERENCES, ASSUMPTIONS, RISKS, OPEN_BLOCKERS, CONFIDENCE.
- If a live API call is performed, include its interaction_id and model, but never secrets.

CURRENT KNOWLEDGE PACK:
{knowledge}
"""

def load_knowledge(settings: Settings) -> str:
    path = Path(settings.knowledge_path)
    if not path.is_file():
        raise RuntimeError(f"knowledge_pack_missing:{path}")
    content = path.read_text(encoding="utf-8").strip()
    if not content:
        raise RuntimeError("knowledge_pack_empty")
    return content

def _audit(settings: Settings, record: dict) -> None:
    path = Path(settings.audit_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")

def diagnose(prompt: str, settings: Settings | None = None) -> dict:
    settings = settings or Settings.from_env()
    knowledge = load_knowledge(settings)
    adapter = GeminiAdapter(settings)
    result = adapter.execute(prompt=prompt, system_instruction=SYSTEM_TEMPLATE.format(knowledge=knowledge))
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": "AUREA-GEMINI-EXPERT-V1",
        "trace_id": result.interaction_id,
        "model": result.model,
        "status": "executed",
    }
    _audit(settings, record)
    return {
        "agent_id": record["agent_id"],
        "trace_id": result.interaction_id,
        "model": result.model,
        "status": "executed",
        "output": result.output_text[: settings.max_output_chars],
        "evidence": record,
    }
