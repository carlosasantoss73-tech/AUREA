"""Fail-closed gates shared by all Tool Experts."""
from __future__ import annotations
from .contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile


def preflight(profile: ToolExpertProfile, request: ExpertRequest, evidence: list[Evidence]) -> ExpertResult | None:
    if not profile.official_source_required:
        raise ValueError("official_source_gate_cannot_be_disabled")
    if not evidence or not any(e.authoritative for e in evidence):
        return ExpertResult(
            expert_id=profile.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Current authoritative product information is not sufficiently verified.",
            evidence=evidence,
            decision="STOP",
            blockers=["official_source_evidence_required_before_configuration_or_execution"],
            next_action="Obtain current official product documentation/terms and re-run preflight.",
        )
    if request.mutation_allowed and profile.mutation_requires_approval:
        return ExpertResult(
            expert_id=profile.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="Mutation requested but explicit approval evidence is not part of the request contract.",
            evidence=evidence,
            decision="STOP",
            blockers=["explicit_mutation_approval_required"],
            next_action="Record the required approval before executing a consequential mutation.",
        )
    return None
