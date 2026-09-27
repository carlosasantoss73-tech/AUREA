"""Institutional authority port for AUREA verification.

This module defines the contract only. It does not implement a second knowledge
store, seed local facts, or promote provider/tool evidence to institutional truth.
The concrete implementation must be the existing Bibliotecario / Knowledge OS.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from .contracts import Evidence


@dataclass(frozen=True)
class InstitutionalEvidenceRequest:
    expert_id: str
    trace_id: str
    objective: str


class InstitutionalEvidenceProvider(Protocol):
    """Read-only port to the existing institutional Bibliotecario."""

    def get_authoritative_evidence(
        self, request: InstitutionalEvidenceRequest
    ) -> Sequence[Evidence]:
        """Return only evidence already authorized by the institutional source."""
        ...


def require_authoritative_evidence(
    provider: InstitutionalEvidenceProvider,
    request: InstitutionalEvidenceRequest,
) -> list[Evidence]:
    """Fail closed unless the existing authority returns explicitly authoritative evidence."""
    evidence = list(provider.get_authoritative_evidence(request))
    if not evidence:
        raise RuntimeError("BIBLIOTECARIO_AUTHORITATIVE_EVIDENCE_NOT_FOUND")
    if not all(item.authoritative for item in evidence):
        raise RuntimeError("BIBLIOTECARIO_RETURNED_NON_AUTHORITATIVE_EVIDENCE")
    return evidence
