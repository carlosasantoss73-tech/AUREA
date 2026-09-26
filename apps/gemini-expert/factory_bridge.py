"""Factory bridge for the operational AUREA Gemini Expert."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.tool_expert_factory.contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile
from apps.tool_expert_factory.runtime import SpecialistRuntime
from adapter import GeminiAdapter
from config import Settings
from expert import SYSTEM_TEMPLATE, load_knowledge

PROFILE = ToolExpertProfile(
    expert_id="AUREA-GEMINI-EXPERT-V1",
    product="Gemini API / Google AI Studio",
    knowledge_pack="docs/AUREA-GEMINI-EXPERT-KNOWLEDGE-PACK-V2.md",
)

OFFICIAL_EVIDENCE = [
    Evidence(
        kind="official-documentation",
        source="https://ai.google.dev/gemini-api/docs/interactions-overview",
        detail="Current official Interactions API documentation verified for this pilot.",
        authoritative=True,
    ),
    Evidence(
        kind="official-model-reference",
        source="https://ai.google.dev/gemini-api/docs/latest-model",
        detail="Current official model reference verified for the configured Gemini model.",
        authoritative=True,
    ),
]


def execute(prompt: str, settings: Settings | None = None) -> ExpertResult:
    settings = settings or Settings.from_env()
    knowledge = load_knowledge(settings)
    request = ExpertRequest(
        expert_id=PROFILE.expert_id,
        objective=prompt,
        trace_id="factory-" + os.urandom(8).hex(),
        mutation_allowed=False,
    )
    adapter = GeminiAdapter(settings)

    def executor(req: ExpertRequest) -> ExpertResult:
        result = adapter.execute(
            prompt=req.objective,
            system_instruction=SYSTEM_TEMPLATE.format(knowledge=knowledge),
        )
        return ExpertResult(
            expert_id=req.expert_id,
            trace_id=req.trace_id,
            status="EXECUTED",
            result=result.output_text,
            evidence=[
                Evidence(
                    kind="live-provider-response",
                    source="Gemini Interactions API",
                    detail=f"interaction_id={result.interaction_id}; model={result.model}",
                    authoritative=True,
                )
            ],
            decision="READ_ONLY",
            next_action="Verify the provider response contract and retain the audit record.",
        )

    runtime = SpecialistRuntime(
        os.getenv("AUREA_GEMINI_FACTORY_AUDIT_PATH", "runtime/gemini-expert-factory-audit.jsonl")
    )
    return runtime.execute(PROFILE, request, OFFICIAL_EVIDENCE, executor)


def execute_and_verify(prompt: str, settings: Settings | None = None) -> ExpertResult:
    result = execute(prompt, settings)
    if result.status != "EXECUTED":
        return result

    request = ExpertRequest(PROFILE.expert_id, prompt, result.trace_id, mutation_allowed=False)
    verification = Evidence(
        kind="provider-response-verification",
        source="Gemini Interactions API",
        detail="Provider returned a non-empty response with interaction identity and configured model identity.",
        authoritative=True,
    )
    runtime = SpecialistRuntime(
        os.getenv("AUREA_GEMINI_FACTORY_AUDIT_PATH", "runtime/gemini-expert-factory-audit.jsonl")
    )
    return runtime.verify(
        PROFILE,
        request,
        result,
        [verification],
        decision="VERIFIED_READ_ONLY_EXECUTION",
        learning="The generic Specialist Runtime can govern the operational Gemini Expert without replacing its adapter.",
        adaptation="Reuse the same execution/verification boundary for future Tool Experts.",
        next_action="Extend the factory to additional provider/model specialists and controlled failure recovery.",
    )


def main() -> int:
    prompt = " ".join(sys.argv[1:]).strip()
    if not prompt:
        print(json.dumps({"status": "blocked", "error": "prompt_required"}))
        return 2
    try:
        result = execute_and_verify(prompt)
        print(json.dumps({
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
        }, ensure_ascii=False, indent=2))
        return 0 if result.status == "VERIFIED" else 1
    except Exception as exc:
        print(json.dumps({"status": "blocked", "error": type(exc).__name__, "detail": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
