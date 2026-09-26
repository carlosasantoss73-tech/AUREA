from apps.tool_expert_factory.contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile
from apps.tool_expert_factory.gate import preflight

def profile():
    return ToolExpertProfile("TEST-EXPERT", "test", "docs/test.md")

def test_blocks_without_authoritative_evidence():
    result = preflight(profile(), ExpertRequest("TEST-EXPERT", "diagnose", "t-1"), [])
    assert result is not None
    assert result.status == "BLOCKED"
    result.validate()

def test_allows_read_only_with_authoritative_evidence():
    evidence = [Evidence("official-doc", "official", "current", authoritative=True)]
    result = preflight(profile(), ExpertRequest("TEST-EXPERT", "diagnose", "t-2"), evidence)
    assert result is None

def test_blocks_mutation_without_approval_contract():
    evidence = [Evidence("official-doc", "official", "current", authoritative=True)]
    result = preflight(profile(), ExpertRequest("TEST-EXPERT", "configure", "t-3", mutation_allowed=True), evidence)
    assert result is not None
    assert result.status == "BLOCKED"
    result.validate()

def test_executed_requires_evidence():
    result = ExpertResult("TEST-EXPERT", "t-4", "EXECUTED", "done")
    try:
        result.validate()
    except ValueError as exc:
        assert str(exc) == "executed_requires_evidence"
    else:
        raise AssertionError("missing evidence must block execution claims")
