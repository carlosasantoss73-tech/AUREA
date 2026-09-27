"""Real Playwright MCP executor adapter for the AUREA Specialist Runtime."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .contracts import Evidence, ExpertRequest, ExpertResult

SCRIPT = Path(__file__).with_name("functional_runtime_mcp.py")


def execute_playwright_mcp(request: ExpertRequest) -> ExpertResult:
    if not SCRIPT.exists():
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Playwright MCP runtime script is unavailable.",
            decision="STOP",
            blockers=["playwright_mcp_runtime_script_missing"],
            next_action="Restore the Playwright MCP executor before retrying.",
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
            result="Playwright MCP adapter could not start.",
            decision="STOP",
            blockers=[f"playwright_mcp_process_error:{type(exc).__name__}"],
            next_action="Inspect the Python/MCP runtime and retry.",
        )

    try:
        payload = json.loads(completed.stdout.strip())
    except json.JSONDecodeError:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Playwright MCP returned non-JSON output.",
            decision="STOP",
            blockers=["playwright_mcp_invalid_audit_output"],
            next_action="Inspect Playwright MCP stdout/stderr before retrying.",
            evidence=[
                Evidence(
                    kind="adapter_process",
                    source="playwright-mcp",
                    detail=(completed.stderr.strip() or completed.stdout)[-3000:],
                    authoritative=False,
                )
            ],
        )

    if completed.returncode != 0 or payload.get("status") != "VERIFIED":
        blocker = str(payload.get("blocker") or "playwright_mcp_not_verified")
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Playwright MCP did not produce a verified browser execution.",
            decision="STOP",
            blockers=[blocker],
            next_action="Resolve the Playwright MCP blocker and retry.",
            evidence=[
                Evidence(
                    kind="playwright_mcp_audit",
                    source="playwright-mcp",
                    detail=json.dumps(payload, ensure_ascii=False)[-6000:],
                    authoritative=False,
                )
            ],
        )

    return ExpertResult(
        expert_id=request.expert_id,
        trace_id=request.trace_id,
        status="EXECUTED",
        result="Playwright MCP executed the planned browser work and independently verified the page state.",
        evidence=[
            Evidence(
                kind="playwright_mcp_execution",
                source="playwright-mcp",
                detail=json.dumps(payload, ensure_ascii=False)[-7000:],
                authoritative=False,
            )
        ],
        decision="READY_FOR_AUREA_VERIFICATION",
        learning="A real browser executor can now be invoked through Work Cells and Specialist Runtime.",
        adaptation="Keep final institutional verification separate from tool-reported execution evidence.",
        next_action="Attach Bibliotecario-authoritative evidence before advancing to VERIFIED.",
    )
