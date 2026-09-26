"""Provider-neutral execution and deterministic fallback contract for Tool Experts."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Sequence


@dataclass(frozen=True)
class ProviderHealthEvidence:
    provider_id: str
    model: str
    source: str
    detail: str
    authoritative: bool = False


@dataclass(frozen=True)
class ProviderCandidate:
    provider_id: str
    model: str
    executable: bool
    health_evidence: tuple[ProviderHealthEvidence, ...] = ()


@dataclass(frozen=True)
class ProviderAttempt:
    provider_id: str
    model: str
    status: str
    detail: str


@dataclass(frozen=True)
class ProviderExecution:
    provider_id: str
    model: str
    output: str
    attempts: tuple[ProviderAttempt, ...]


Executor = Callable[[ProviderCandidate], str]


def eligible(candidate: ProviderCandidate) -> bool:
    return candidate.executable and bool(candidate.health_evidence)


def execute_with_fallback(
    candidates: Sequence[ProviderCandidate],
    executors: dict[str, Executor],
) -> ProviderExecution:
    attempts: list[ProviderAttempt] = []
    for candidate in candidates:
        if not eligible(candidate):
            attempts.append(
                ProviderAttempt(
                    candidate.provider_id,
                    candidate.model,
                    "BLOCKED",
                    "candidate_requires_executable_status_and_health_evidence",
                )
            )
            continue

        executor = executors.get(candidate.provider_id)
        if executor is None:
            attempts.append(
                ProviderAttempt(candidate.provider_id, candidate.model, "BLOCKED", "executor_missing")
            )
            continue

        try:
            output = executor(candidate)
        except Exception as exc:
            attempts.append(
                ProviderAttempt(
                    candidate.provider_id,
                    candidate.model,
                    "FAILED",
                    f"{type(exc).__name__}:{exc}",
                )
            )
            continue

        if not isinstance(output, str) or not output.strip():
            attempts.append(
                ProviderAttempt(candidate.provider_id, candidate.model, "FAILED", "empty_output")
            )
            continue

        attempts.append(ProviderAttempt(candidate.provider_id, candidate.model, "EXECUTED", "non_empty_output"))
        return ProviderExecution(candidate.provider_id, candidate.model, output, tuple(attempts))

    raise RuntimeError("no_eligible_provider_execution_succeeded")
