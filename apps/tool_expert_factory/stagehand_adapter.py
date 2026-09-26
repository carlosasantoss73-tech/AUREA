"""Stagehand adapter for the AUREA Specialist Runtime.

Runs the verified Stagehand work executor as an external browser adapter and
maps its auditable JSON result into the platform-neutral ExpertResult contract.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .contracts import Evidence, ExpertRequest, ExpertResult


SCRIPT = Path(__file__).with_name("functional_runtime_stagehand.mjs")


def execute_stagehand(request: ExpertRequest) -> ExpertResult:
    """Execute the Stagehand adapter and return an auditable result.

    The adapter is intentionally provider-neutral: the Stagehand script may use
    a configured model for its internal SDK, but AUREA only accepts the result
    after Stagehand reports its own independent final-state verification.
    """
    if not SCRIPT.exists():
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Stagehand adapter script is unavailable.",
            decision="STOP",
            blockers=["stagehand_adapter_script_missing"],
            next_action="Restore the Stagehand executor before retrying.",
        )

    try:
        completed = subprocess.run(
            ["node", str(SCRIPT)],
            text=True,
            capture_output=True,
            timeout=180,
            check=False,
        )
    except Exception as exc:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Stagehand adapter could not start.",
            decision="STOP",
            blockers=[f"stagehand_process_error:{type(exc).__name__}"],
            next_action="Inspect the Node/Stagehand runtime and retry.",
        )

    raw = completed.stdout.strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Stagehand returned non-JSON output.",
            decision="STOP",
            blockers=["stagehand_invalid_audit_output"],
            next_action="Inspect Stagehand stdout/stderr before retrying.",
            evidence=[
                Evidence(
                    kind="adapter_process",
                    source="stagehand",
                    detail=(completed.stderr.strip() or raw)[-2000:],
                    authoritative=False,
                )
            ],
        )

    if completed.returncode != 0 or payload.get("status") != "VERIFIED":
        blocker = str(payload.get("blocker") or payload.get("error_class") or "stagehand_not_verified")
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Stagehand did not produce a verified work result.",
            decision="STOP",
            blockers=[blocker],
            next_action="Classify the Stagehand failure and retry only after the blocker is understood.",
            evidence=[
                Evidence(
                    kind="stagehand_audit",
                    source="stagehand",
                    detail=json.dumps(payload, ensure_ascii=False)[-5000:],
                    authoritative=False,
                )
            ],
        )

    return ExpertResult(
        expert_id=request.expert_id,
        trace_id=request.trace_id,
        status="EXECUTED",
        result=str(payload.get("result") or "Stagehand work executed and reported VERIFIED."),
        evidence=[
            Evidence(
                kind="stagehand_execution",
                source="stagehand",
                detail=json.dumps(payload.get("steps", []), ensure_ascii=False)[-6000:],
                authoritative=False,
            )
        ],
        decision="READY_FOR_AUREA_VERIFICATION",
        learning="Stagehand can execute deterministic browser actions independently of the provider-selection contract.",
        adaptation="Keep Stagehand behind this adapter and let SpecialistRuntime own identity, audit, and verification state.",
        next_action="Verify the final browser state using the authoritative execution evidence.",
    )
