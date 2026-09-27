"""Browser Use adapter for the AUREA Specialist Runtime."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .contracts import Evidence, ExpertRequest, ExpertResult


SCRIPT = Path(__file__).with_name("functional_runtime_browser_use.py")


def execute_browser_use(request: ExpertRequest) -> ExpertResult:
    if not SCRIPT.exists():
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Browser Use runtime script is unavailable.",
            decision="STOP",
            blockers=["browser_use_runtime_script_missing"],
            next_action="Restore the Browser Use executor before retrying.",
        )

    try:
        completed = subprocess.run(
            ["python", str(SCRIPT)],
            text=True,
            capture_output=True,
            timeout=240,
            check=False,
        )
    except Exception as exc:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Browser Use adapter could not start.",
            decision="STOP",
            blockers=[f"browser_use_process_error:{type(exc).__name__}"],
            next_action="Inspect the Python/Browser Use runtime and retry.",
        )

    try:
        payload = json.loads(completed.stdout.strip())
    except json.JSONDecodeError:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Browser Use returned non-JSON output.",
            decision="STOP",
            blockers=["browser_use_invalid_audit_output"],
            next_action="Inspect Browser Use stdout/stderr before retrying.",
            evidence=[
                Evidence(
                    kind="adapter_process",
                    source="browser-use",
                    detail=(completed.stderr.strip() or completed.stdout)[-3000:],
                    authoritative=False,
                )
            ],
        )

    if completed.returncode != 0 or payload.get("status") != "VERIFIED":
        blocker = str(payload.get("blocker") or "browser_use_not_verified")
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Browser Use did not produce a verified work result.",
            decision="STOP",
            blockers=[blocker],
            next_action="Resolve the Browser Use blocker and retry.",
            evidence=[
                Evidence(
                    kind="browser_use_audit",
                    source="browser-use",
                    detail=json.dumps(payload, ensure_ascii=False)[-6000:],
                    authoritative=False,
                )
            ],
        )

    return ExpertResult(
        expert_id=request.expert_id,
        trace_id=request.trace_id,
        status="EXECUTED",
        result="Browser Use executed the task and reported a successful run.",
        evidence=[
            Evidence(
                kind="browser_use_execution",
                source="browser-use",
                detail=json.dumps(payload.get("evidence", {}), ensure_ascii=False)[-6000:],
                authoritative=False,
            )
        ],
        decision="READY_FOR_AUREA_VERIFICATION",
        learning="Browser Use Cloud isolates browser infrastructure from the previously observed Gemini free-tier quota failure.",
        adaptation="Keep Browser Use behind a provider-neutral adapter and let SpecialistRuntime own final verification.",
        next_action="Verify the final browser state with authoritative evidence.",
    )
