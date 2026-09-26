"""Platform-neutral contracts for AUREA Tool Experts."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

Status = Literal["READY", "BLOCKED", "EXECUTED", "VERIFIED"]

@dataclass(frozen=True)
class Evidence:
    kind: str
    source: str
    detail: str
    authoritative: bool = False

@dataclass(frozen=True)
class ExpertRequest:
    expert_id: str
    objective: str
    trace_id: str
    mutation_allowed: bool = False

@dataclass
class ExpertResult:
    expert_id: str
    trace_id: str
    status: Status
    result: str
    evidence: list[Evidence] = field(default_factory=list)
    decision: str = ""
    learning: str = ""
    adaptation: str = ""
    next_action: str = ""
    blockers: list[str] = field(default_factory=list)

    def validate(self) -> None:
        if not self.expert_id or not self.trace_id:
            raise ValueError("expert_identity_required")
        if self.status == "EXECUTED" and not self.evidence:
            raise ValueError("executed_requires_evidence")
        if self.status == "VERIFIED" and not any(e.authoritative for e in self.evidence):
            raise ValueError("verified_requires_authoritative_evidence")
        if self.status == "BLOCKED" and not self.blockers:
            raise ValueError("blocked_requires_blocker")

@dataclass(frozen=True)
class ToolExpertProfile:
    expert_id: str
    product: str
    knowledge_pack: str
    official_source_required: bool = True
    mutation_requires_approval: bool = True
    secret_values_forbidden_in_output: bool = True
