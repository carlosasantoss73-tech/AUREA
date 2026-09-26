import pytest

from apps.tool_expert_factory.provider_execution import (
    ProviderCandidate,
    ProviderHealthEvidence,
    execute_with_fallback,
    eligible,
)


def health(provider_id):
    return ProviderHealthEvidence(
        provider_id=provider_id,
        model="test-model",
        source="test-health",
        detail="current health evidence",
        authoritative=True,
    )


def test_candidate_without_health_evidence_is_not_eligible():
    candidate = ProviderCandidate("gemini", "gemini-3.8-flash", True)
    assert not eligible(candidate)


def test_first_provider_executes_when_healthy():
    candidate = ProviderCandidate("gemini", "gemini-3.8-flash", True, (health("gemini"),))
    result = execute_with_fallback([candidate], {"gemini": lambda _: "ok"})
    assert result.provider_id == "gemini"
    assert result.attempts[-1].status == "EXECUTED"


def test_fallback_occurs_only_after_real_first_failure():
    first = ProviderCandidate("gemini", "gemini-3.8-flash", True, (health("gemini"),))
    second = ProviderCandidate("claude", "claude-model", True, (health("claude"),))
    calls = []
    def fail(_):
        calls.append("gemini")
        raise RuntimeError("provider_down")
    def succeed(_):
        calls.append("claude")
        return "ok"
    result = execute_with_fallback([first, second], {"gemini": fail, "claude": succeed})
    assert calls == ["gemini", "claude"]
    assert result.provider_id == "claude"
    assert [a.status for a in result.attempts] == ["FAILED", "EXECUTED"]


def test_unhealthy_provider_is_skipped_without_execution():
    first = ProviderCandidate("gemini", "gemini-3.8-flash", True)
    second = ProviderCandidate("claude", "claude-model", True, (health("claude"),))
    calls = []
    def should_not_run(_):
        calls.append("gemini")
        return "wrong"
    result = execute_with_fallback([first, second], {"gemini": should_not_run, "claude": lambda _: "ok"})
    assert calls == []
    assert result.provider_id == "claude"


def test_all_failures_are_fail_closed():
    candidate = ProviderCandidate("gemini", "gemini-3.8-flash", True, (health("gemini"),))
    with pytest.raises(RuntimeError, match="no_eligible_provider_execution_succeeded"):
        execute_with_fallback([candidate], {"gemini": lambda _: (_ for _ in ()).throw(RuntimeError("down"))})
