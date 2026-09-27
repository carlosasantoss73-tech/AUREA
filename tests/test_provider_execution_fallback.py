from apps.tool_expert_factory.provider_execution import (
    ProviderCandidate,
    ProviderHealthEvidence,
    execute_with_fallback,
)


def test_provider_fallback_preserves_failed_attempt_and_selects_next():
    candidates = (
        ProviderCandidate(
            "provider-a",
            "model-a",
            True,
            (ProviderHealthEvidence("provider-a", "model-a", "test", "healthy"),),
        ),
        ProviderCandidate(
            "provider-b",
            "model-b",
            True,
            (ProviderHealthEvidence("provider-b", "model-b", "test", "healthy"),),
        ),
    )

    def failed(_candidate):
        raise RuntimeError("real_executor_failure")


    def succeeded(_candidate):
        return "provider-b-result"


    execution = execute_with_fallback(
        candidates,
        {"provider-a": failed, "provider-b": succeeded},
    )

    assert execution.provider_id == "provider-b"
    assert [attempt.status for attempt in execution.attempts] == ["FAILED", "EXECUTED"]
    assert execution.output == "provider-b-result"
