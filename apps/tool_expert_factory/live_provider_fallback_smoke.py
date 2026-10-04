"""Controlled live-provider fallback smoke.

The primary OpenAI model is intentionally invalid so the first real external
request fails and the real Gemini provider is then exercised. This proves the
fallback path with real network calls, but is NOT evidence of spontaneous
provider-A failure.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GEMINI_DIR = ROOT / "apps" / "gemini-expert"
for path in (ROOT, GEMINI_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from apps.tool_expert_factory.contracts import ExpertRequest
from apps.tool_expert_factory.openai_adapter import execute_openai
from apps.tool_expert_factory.provider_execution import (
    ProviderCandidate,
    ProviderHealthEvidence,
    execute_with_fallback,
)
from adapter import GeminiAdapter
from config import Settings

PROMPT = "Return exactly one concise sentence confirming that this is a read-only AUREA provider fallback smoke. Do not mutate anything."


def main() -> int:
    request = ExpertRequest(
        expert_id="AUREA-LIVE-PROVIDER-FALLBACK-V1",
        objective=PROMPT,
        trace_id="live-provider-fallback",
        mutation_allowed=False,
    )
    gemini_settings = Settings.from_env()
    gemini = GeminiAdapter(gemini_settings)
    candidates = [
        ProviderCandidate(
            provider_id="openai-api",
            model=os.environ["OPENAI_PRIMARY_MODEL"],
            executable=True,
            health_evidence=(ProviderHealthEvidence(
                "openai-api",
                os.environ["OPENAI_PRIMARY_MODEL"],
                "controlled-live-smoke",
                "Primary provider deliberately configured with an invalid model to exercise fallback.",
            ),),
        ),
        ProviderCandidate(
            provider_id="gemini-interactions",
            model=gemini_settings.model,
            executable=True,
            health_evidence=(ProviderHealthEvidence(
                "gemini-interactions",
                gemini_settings.model,
                "live-provider-credential-and-request",
                "Gemini API is invoked as the real fallback provider.",
            ),),
        ),
    ]

    def openai_executor(candidate: ProviderCandidate) -> str:
        result = execute_openai(request, model=candidate.model)
        if result.status != "EXECUTED":
            raise RuntimeError("openai_primary_failed_as_controlled")
        return result.result

    def gemini_executor(candidate: ProviderCandidate) -> str:
        result = gemini.execute(
            prompt=request.objective,
            system_instruction="Read-only provider fallback smoke.",
        )
        return result.output_text

    execution = execute_with_fallback(
        candidates,
        {"openai-api": openai_executor, "gemini-interactions": gemini_executor},
    )
    statuses = [attempt.status for attempt in execution.attempts]
    if statuses != ["FAILED", "EXECUTED"]:
        raise RuntimeError(f"unexpected_fallback_trace:{statuses}")
    if execution.provider_id != "gemini-interactions":
        raise RuntimeError(f"unexpected_fallback_provider:{execution.provider_id}")

    print("LIVE_PROVIDER_FALLBACK_RESULT=PASS")
    print(f"PRIMARY_STATUS={statuses[0]}")
    print(f"FALLBACK_STATUS={statuses[1]}")
    print(f"SELECTED_PROVIDER={execution.provider_id}")
    print(f"MODEL={execution.model}")
    print("EVIDENCE=real OpenAI request failed under controlled invalid-model condition; real Gemini request returned non-empty output")
    print("DECISION=controlled live fallback path executed successfully")
    print("LEARNING=provider-neutral fallback preserves the failed primary attempt and selects the executable fallback")
    print("ADAPTATION=no architecture change")
    print("NEXT_ACTION=replace controlled failure with an observed spontaneous provider failure before claiming natural failover resilience")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
