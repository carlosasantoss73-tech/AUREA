"""Provider fallback adapter for real AUREA browser executors."""
from __future__ import annotations

from .browser_use_adapter import execute_browser_use
from .contracts import Evidence, ExpertRequest, ExpertResult
from .playwright_mcp_adapter import execute_playwright_mcp
from .provider_execution import ProviderCandidate, ProviderHealthEvidence, execute_with_fallback


def _run_browser_use(request: ExpertRequest) -> str:
    result = execute_browser_use(request)
    if result.status != "EXECUTED":
        raise RuntimeError(result.blockers[0] if result.blockers else "browser_use_failed")
    return result.result


def _run_playwright(request: ExpertRequest) -> str:
    result = execute_playwright_mcp(request)
    if result.status != "EXECUTED":
        raise RuntimeError(result.blockers[0] if result.blockers else "playwright_mcp_failed")
    return result.result


def execute_real_browser_provider_fallback(request: ExpertRequest) -> ExpertResult:
    """Try Browser Use first, then Playwright MCP, preserving every real attempt."""
    candidates = (
        ProviderCandidate(
            provider_id="browser-use",
            model="bu-2-0",
            executable=True,
            health_evidence=(ProviderHealthEvidence(
                "browser-use", "bu-2-0", "official-runtime",
                "Browser Use executor configured; authority must be established separately.",
                False,
            ),),
        ),
        ProviderCandidate(
            provider_id="playwright-mcp",
            model="mcp-browser",
            executable=True,
            health_evidence=(ProviderHealthEvidence(
                "playwright-mcp", "mcp-browser", "official-runtime",
                "Playwright MCP executor configured; authority must be established separately.",
                False,
            ),),
        ),
    )
    try:
        execution = execute_with_fallback(
            candidates,
            {
                "browser-use": lambda _candidate: _run_browser_use(request),
                "playwright-mcp": lambda _candidate: _run_playwright(request),
            },
        )
    except RuntimeError as exc:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="No real browser provider completed the work.",
            decision="STOP",
            blockers=[f"provider_fallback_exhausted:{exc}"],
            next_action="Resolve the failed provider prerequisites and retry.",
            evidence=[Evidence(
                "provider_fallback",
                "provider-execution",
                "All real provider attempts failed.",
                False,
            )],
        )

    attempts = [
        {
            "provider_id": a.provider_id,
            "model": a.model,
            "status": a.status,
            "detail": a.detail,
        }
        for a in execution.attempts
    ]
    return ExpertResult(
        expert_id=request.expert_id,
        trace_id=request.trace_id,
        status="EXECUTED",
        result=execution.output,
        evidence=[Evidence(
            "provider_fallback",
            "provider-execution",
            str({"selected": execution.provider_id, "attempts": attempts}),
            False,
        )],
        decision="READY_FOR_AUREA_VERIFICATION",
        learning="Fallback selected the first real browser executor that completed successfully and preserved prior attempts.",
        adaptation="Keep provider selection separate from Specialist Runtime and final institutional verification.",
        next_action="Attach Bibliotecario-authoritative evidence before VERIFIED.",
    )
