"""Reusable Specialist Runtime for AUREA Tool Experts."""
from __future__ import annotations
from collections.abc import Callable, Sequence
from dataclasses import replace
from .audit import record
from .contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile
from .gate import preflight

Executor = Callable[[ExpertRequest], ExpertResult]

class SpecialistRuntime:
    def __init__(self, audit_path: str):
        self.audit_path = audit_path

    def execute(self, profile: ToolExpertProfile, request: ExpertRequest,
                authoritative_evidence: Sequence[Evidence], executor: Executor) -> ExpertResult:
        gate_result = preflight(profile, request, list(authoritative_evidence))
        if gate_result is not None:
            record(self.audit_path, gate_result)
            return gate_result
        try:
            result = executor(request)
        except Exception as exc:
            blocked = ExpertResult(
                expert_id=profile.expert_id, trace_id=request.trace_id, status="BLOCKED",
                result="Specialist execution failed before an auditable execution result was produced.",
                decision="STOP", blockers=[f"executor_error:{type(exc).__name__}"],
                next_action="Inspect the adapter/runtime error and retry only after the failure is understood.",
            )
            record(self.audit_path, blocked)
            return blocked
        self._validate_identity(profile, request, result)
        result.validate()
        record(self.audit_path, result)
        return result

    def verify(self, profile: ToolExpertProfile, request: ExpertRequest,
                result: ExpertResult, verification_evidence: Sequence[Evidence], *,
                decision: str = "VERIFY", learning: str = "", adaptation: str = "",
                next_action: str = "") -> ExpertResult:
        if result.expert_id != profile.expert_id or result.trace_id != request.trace_id:
            raise ValueError("verification_identity_mismatch")
        if result.status != "EXECUTED":
            raise ValueError("only_executed_results_can_be_verified")
        verified = replace(
            result, status="VERIFIED",
            evidence=list(result.evidence) + list(verification_evidence),
            decision=decision, learning=learning or result.learning,
            adaptation=adaptation or result.adaptation, next_action=next_action or result.next_action,
        )
        verified.validate()
        record(self.audit_path, verified)
        return verified

    @staticmethod
    def _validate_identity(profile: ToolExpertProfile, request: ExpertRequest, result: ExpertResult) -> None:
        if result.expert_id != profile.expert_id:
            raise ValueError("executor_expert_identity_mismatch")
        if result.trace_id != request.trace_id:
            raise ValueError("executor_trace_identity_mismatch")
